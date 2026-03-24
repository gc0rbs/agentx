import { describe, it, expect, beforeEach } from 'vitest';
import { PostScheduler } from '../../src/campaigns/scheduler';
import type { SocialPost } from '../../src/campaigns/types';

function makePost(overrides: Partial<SocialPost> = {}): SocialPost {
  return {
    id: 'test-' + Math.random().toString(36).slice(2),
    platform: 'x',
    format: 'text',
    content: { text: 'Test post' },
    hashtags: [],
    schedule: {
      publishAt: new Date('2026-04-07T09:00:00Z'),
      timezone: 'UTC',
      phase: 'launch',
      dayOfWeek: 1,
      timeSlot: 'morning',
    },
    status: 'draft',
    ...overrides,
  };
}

describe('PostScheduler', () => {
  let scheduler: PostScheduler;

  beforeEach(() => {
    scheduler = new PostScheduler({ minGapMinutes: 120 });
  });

  describe('getNextOptimalTime', () => {
    it('should return a future date', () => {
      const now = new Date('2026-04-07T06:00:00Z');
      const next = scheduler.getNextOptimalTime('x', now);
      expect(next.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should respect platform-specific times', () => {
      const xTime = scheduler.getNextOptimalTime('x', new Date('2026-04-07T06:00:00Z'));
      const ttTime = scheduler.getNextOptimalTime('tiktok', new Date('2026-04-07T06:00:00Z'));

      // TikTok starts earlier (7 AM) vs X (8 AM)
      expect(ttTime.getHours()).toBeLessThanOrEqual(xTime.getHours());
    });
  });

  describe('schedulePost', () => {
    it('should mark post as scheduled', () => {
      const post = makePost();
      const scheduled = scheduler.schedulePost(post);
      expect(scheduled.status).toBe('scheduled');
    });

    it('should add post to queue', () => {
      scheduler.schedulePost(makePost());
      scheduler.schedulePost(makePost({ platform: 'tiktok' }));
      expect(scheduler.getQueue().length).toBe(2);
    });

    it('should sort queue by publish time', () => {
      const post1 = makePost();
      const post2 = makePost();
      post2.schedule.publishAt = new Date('2026-04-06T09:00:00Z');

      scheduler.schedulePost(post1);
      scheduler.schedulePost(post2);

      const queue = scheduler.getQueue();
      expect(queue[0].schedule.publishAt.getTime())
        .toBeLessThanOrEqual(queue[1].schedule.publishAt.getTime());
    });
  });

  describe('getQueue', () => {
    it('should filter by platform', () => {
      scheduler.schedulePost(makePost({ platform: 'x' }));
      scheduler.schedulePost(makePost({ platform: 'tiktok' }));
      scheduler.schedulePost(makePost({ platform: 'x' }));

      expect(scheduler.getQueue('x').length).toBe(2);
      expect(scheduler.getQueue('tiktok').length).toBe(1);
    });
  });

  describe('getDuePosts', () => {
    it('should return posts that are due', () => {
      const post = makePost();
      post.schedule.publishAt = new Date('2026-04-07T09:00:00Z');
      scheduler.schedulePost(post);

      const due = scheduler.getDuePosts(new Date('2026-04-07T10:00:00Z'));
      expect(due.length).toBe(1);
    });

    it('should not return future posts', () => {
      const post = makePost();
      post.schedule.publishAt = new Date('2026-04-10T09:00:00Z');
      scheduler.schedulePost(post);

      const due = scheduler.getDuePosts(new Date('2026-04-07T10:00:00Z'));
      expect(due.length).toBe(0);
    });
  });

  describe('markPublished', () => {
    it('should update post status', () => {
      const post = makePost();
      const scheduled = scheduler.schedulePost(post);
      scheduler.markPublished(scheduled.id);

      const queue = scheduler.getQueue();
      const found = queue.find(p => p.id === scheduled.id);
      expect(found?.status).toBe('published');
    });
  });

  describe('canPost', () => {
    it('should allow posting under rate limits', () => {
      expect(scheduler.canPost('x')).toBe(true);
      expect(scheduler.canPost('tiktok')).toBe(true);
    });

    it('should block when rate limiting is enforced and limit hit', () => {
      const limited = new PostScheduler({
        maxPostsPerDay: { x: 1, tiktok: 1 },
        respectRateLimits: true,
        minGapMinutes: 0,
        timezone: 'UTC',
      });

      const post = makePost();
      post.schedule.publishAt = new Date('2026-04-07T09:00:00Z');
      const scheduled = limited.schedulePost(post);
      limited.markPublished(scheduled.id);

      expect(limited.canPost('x', new Date('2026-04-07T12:00:00Z'))).toBe(false);
    });
  });

  describe('scheduleCampaign', () => {
    it('should distribute posts across phases', () => {
      const posts = [
        makePost({ schedule: { ...makePost().schedule, phase: 'teaser' } }),
        makePost({ schedule: { ...makePost().schedule, phase: 'teaser' } }),
        makePost({ schedule: { ...makePost().schedule, phase: 'launch' } }),
        makePost({ schedule: { ...makePost().schedule, phase: 'launch' } }),
        makePost({ schedule: { ...makePost().schedule, phase: 'launch' } }),
      ];

      const scheduled = scheduler.scheduleCampaign(
        posts,
        new Date('2026-04-07'),
        [
          { phase: 'teaser', days: 7 },
          { phase: 'launch', days: 7 },
        ]
      );

      expect(scheduled.length).toBe(5);
      expect(scheduled.every(p => p.status === 'scheduled')).toBe(true);
    });
  });
});
