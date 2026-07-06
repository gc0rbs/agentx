/**
 * Campaign Runner + Store Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CampaignRunner, CampaignStore, mapUIAnalytics } from '../../src/orchestrator';
import type { SocialPost } from '../../src/campaigns/types';
import type { XBrowserClient } from '../../src/integrations/x/browser';

function makePost(overrides: Partial<SocialPost> = {}): SocialPost {
  return {
    id: `post-${Math.random().toString(36).slice(2)}`,
    platform: 'x',
    format: 'text',
    content: { text: 'Hello world' },
    hashtags: [],
    schedule: {
      publishAt: new Date(Date.now() - 60000), // due 1 min ago
      timezone: 'UTC',
      phase: 'launch',
      dayOfWeek: 1,
      timeSlot: 'morning',
    },
    status: 'scheduled',
    ...overrides,
  };
}

function mockXClient(overrides: Partial<XBrowserClient> = {}): XBrowserClient {
  return {
    postTweet: vi.fn().mockResolvedValue({
      success: true,
      tweetId: '123',
      tweetUrl: 'https://x.com/user/status/123',
    }),
    postThread: vi.fn().mockResolvedValue({
      success: true,
      tweets: [{ success: true }],
      threadUrl: 'https://x.com/user/status/456',
    }),
    getTweetAnalytics: vi.fn().mockResolvedValue({
      likes: 10,
      retweets: 2,
      replies: 3,
      views: 1000,
      bookmarks: 5,
    }),
    ...overrides,
  } as unknown as XBrowserClient;
}

describe('CampaignStore', () => {
  let dir: string;
  let statePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'campaign-test-'));
    statePath = join(dir, 'state.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('initializes and persists state', () => {
    const post = makePost();
    const store = new CampaignStore(statePath, {
      campaignId: 'c1',
      campaignName: 'Test',
      posts: [post],
    });

    expect(store.getPosts()).toHaveLength(1);

    // Reload from disk
    const reloaded = new CampaignStore(statePath);
    expect(reloaded.getPosts()).toHaveLength(1);
    expect(reloaded.getPosts()[0].id).toBe(post.id);
    expect(reloaded.getPosts()[0].schedule.publishAt).toBeInstanceOf(Date);
  });

  it('throws when no state and no initial campaign', () => {
    expect(() => new CampaignStore(statePath)).toThrow();
  });

  it('returns due posts only', () => {
    const due = makePost();
    const future = makePost({
      schedule: { ...makePost().schedule, publishAt: new Date(Date.now() + 3600000) },
    });
    const store = new CampaignStore(statePath, {
      campaignId: 'c1',
      campaignName: 'Test',
      posts: [due, future],
    });

    const duePosts = store.getDuePosts();
    expect(duePosts).toHaveLength(1);
    expect(duePosts[0].id).toBe(due.id);
  });

  it('tracks publish and analytics lifecycle', () => {
    const post = makePost();
    const store = new CampaignStore(statePath, {
      campaignId: 'c1',
      campaignName: 'Test',
      posts: [post],
    });

    store.markPublished(post.id, { tweetId: '1', tweetUrl: 'https://x.com/u/status/1' });
    expect(store.getDuePosts()).toHaveLength(0);
    expect(store.getPostsNeedingAnalytics(0)).toHaveLength(1);

    store.updateAnalytics(post.id, mapUIAnalytics({
      likes: 1, retweets: 1, replies: 1, views: 100, bookmarks: 1,
    }));
    // Fresh analytics — not stale for an hour
    expect(store.getPostsNeedingAnalytics(3600000)).toHaveLength(0);
  });

  it('marks failed posts', () => {
    const post = makePost();
    const store = new CampaignStore(statePath, {
      campaignId: 'c1',
      campaignName: 'Test',
      posts: [post],
    });

    store.markFailed(post.id, 'boom');
    expect(store.getPosts()[0].status).toBe('failed');
    expect(store.getPosts()[0].failReason).toBe('boom');
    expect(store.getDuePosts()).toHaveLength(0);
  });
});

describe('CampaignRunner', () => {
  let dir: string;
  let statePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-test-'));
    statePath = join(dir, 'state.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function makeStore(posts: SocialPost[]): CampaignStore {
    return new CampaignStore(statePath, {
      campaignId: 'c1',
      campaignName: 'Test',
      posts,
    });
  }

  it('publishes due text posts', async () => {
    const post = makePost();
    const store = makeStore([post]);
    const x = mockXClient();
    const runner = new CampaignRunner(store, x, { maxJitterMs: 0 });

    const result = await runner.tick();

    expect(result.published).toEqual([post.id]);
    expect(x.postTweet).toHaveBeenCalledWith('Hello world', undefined);
    expect(store.getPosts()[0].status).toBe('published');
    expect(store.getPosts()[0].tweetUrl).toBe('https://x.com/user/status/123');
  });

  it('publishes threads via postThread', async () => {
    const post = makePost({
      format: 'thread',
      content: { text: 'intro', threadParts: ['one', 'two', 'three'] },
    });
    const store = makeStore([post]);
    const x = mockXClient();
    const runner = new CampaignRunner(store, x, { maxJitterMs: 0 });

    const result = await runner.tick();

    expect(result.published).toEqual([post.id]);
    expect(x.postThread).toHaveBeenCalledWith([
      { text: 'one' },
      { text: 'two' },
      { text: 'three' },
    ]);
  });

  it('skips tiktok posts', async () => {
    const post = makePost({ platform: 'tiktok' });
    const store = makeStore([post]);
    const x = mockXClient();
    const runner = new CampaignRunner(store, x, { maxJitterMs: 0 });

    const result = await runner.tick();

    expect(result.published).toHaveLength(0);
    expect(x.postTweet).not.toHaveBeenCalled();
    expect(store.getPosts()[0].status).toBe('scheduled');
  });

  it('marks failures and halts after consecutive failures', async () => {
    const posts = [makePost(), makePost(), makePost(), makePost()];
    const store = makeStore(posts);
    const x = mockXClient({
      postTweet: vi.fn().mockResolvedValue({ success: false, error: 'rate limited' }),
    } as Partial<XBrowserClient>);
    const runner = new CampaignRunner(store, x, {
      maxJitterMs: 0,
      maxConsecutiveFailures: 2,
    });

    const result = await runner.tick();

    // Halts after 2 failures, leaving the rest scheduled
    expect(result.failed).toHaveLength(2);
    expect(store.getPosts().filter((p) => p.status === 'failed')).toHaveLength(2);
    expect(store.getPosts().filter((p) => p.status === 'scheduled')).toHaveLength(2);
  });

  it('collects analytics for published posts', async () => {
    const post = makePost();
    const store = makeStore([post]);
    store.markPublished(post.id, { tweetUrl: 'https://x.com/u/status/9' });

    const x = mockXClient();
    const runner = new CampaignRunner(store, x, {
      maxJitterMs: 0,
      analyticsMinAgeMs: 0,
    });

    const result = await runner.tick();

    expect(result.analyticsUpdated).toEqual([post.id]);
    const stored = store.getPosts()[0];
    expect(stored.analytics?.impressions).toBe(1000);
    expect(stored.analytics?.likes).toBe(10);
    expect(stored.analytics?.engagementRate).toBeCloseTo(20 / 1000);
  });
});

describe('mapUIAnalytics', () => {
  it('maps UI metrics to PostAnalytics with engagement rate', () => {
    const analytics = mapUIAnalytics({
      likes: 10, retweets: 5, replies: 3, views: 900, bookmarks: 2,
    });

    expect(analytics.impressions).toBe(900);
    expect(analytics.shares).toBe(5);
    expect(analytics.comments).toBe(3);
    expect(analytics.saves).toBe(2);
    expect(analytics.engagementRate).toBeCloseTo(20 / 900);
  });

  it('handles zero views without dividing by zero', () => {
    const analytics = mapUIAnalytics({
      likes: 0, retweets: 0, replies: 0, views: 0, bookmarks: 0,
    });
    expect(analytics.engagementRate).toBe(0);
  });
});
