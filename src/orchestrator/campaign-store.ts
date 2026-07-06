/**
 * Campaign State Store
 * JSON file persistence for campaign posts so the runner
 * survives restarts without losing queue/publish/analytics state.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { createLogger } from '../core/logger';
import type { SocialPost } from '../campaigns/types';

const logger = createLogger('campaign-store');

export interface StoredPost extends SocialPost {
  tweetId?: string;
  tweetUrl?: string;
  publishedAt?: string;        // ISO timestamp of actual publish
  lastAnalyticsAt?: string;    // ISO timestamp of last analytics pull
  failReason?: string;
}

export interface CampaignState {
  campaignId: string;
  campaignName: string;
  posts: StoredPost[];
  updatedAt: string;
}

export class CampaignStore {
  private readonly path: string;
  private state: CampaignState;

  constructor(path: string, initial?: { campaignId: string; campaignName: string; posts: SocialPost[] }) {
    this.path = path;

    if (existsSync(path)) {
      this.state = this.load();
      logger.info('Campaign state loaded', {
        path,
        posts: this.state.posts.length,
      });
    } else if (initial) {
      this.state = {
        campaignId: initial.campaignId,
        campaignName: initial.campaignName,
        posts: initial.posts as StoredPost[],
        updatedAt: new Date().toISOString(),
      };
      this.save();
      logger.info('Campaign state initialized', { path, posts: initial.posts.length });
    } else {
      throw new Error(`No campaign state at ${path} and no initial campaign provided`);
    }
  }

  private load(): CampaignState {
    const raw = JSON.parse(readFileSync(this.path, 'utf-8')) as CampaignState;
    // Revive dates on schedules
    for (const post of raw.posts) {
      post.schedule.publishAt = new Date(post.schedule.publishAt);
    }
    return raw;
  }

  save(): void {
    this.state.updatedAt = new Date().toISOString();
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.state, null, 2));
  }

  getState(): CampaignState {
    return this.state;
  }

  getPosts(): StoredPost[] {
    return this.state.posts;
  }

  /** Posts scheduled and due at or before `now` */
  getDuePosts(now: Date = new Date()): StoredPost[] {
    return this.state.posts.filter(
      (p) => p.status === 'scheduled' && p.schedule.publishAt <= now
    );
  }

  /** Published posts whose analytics are stale (or never pulled) */
  getPostsNeedingAnalytics(minAgeMs: number, now: Date = new Date()): StoredPost[] {
    return this.state.posts.filter((p) => {
      if (p.status !== 'published' || !p.tweetUrl) return false;
      const last = p.lastAnalyticsAt ? new Date(p.lastAnalyticsAt).getTime() : 0;
      return now.getTime() - last >= minAgeMs;
    });
  }

  markPublished(postId: string, result: { tweetId?: string; tweetUrl?: string }): void {
    const post = this.find(postId);
    post.status = 'published';
    post.tweetId = result.tweetId;
    post.tweetUrl = result.tweetUrl;
    post.publishedAt = new Date().toISOString();
    this.save();
  }

  markFailed(postId: string, reason: string): void {
    const post = this.find(postId);
    post.status = 'failed';
    post.failReason = reason;
    this.save();
  }

  updateAnalytics(postId: string, analytics: StoredPost['analytics']): void {
    const post = this.find(postId);
    post.analytics = analytics;
    post.lastAnalyticsAt = new Date().toISOString();
    this.save();
  }

  private find(postId: string): StoredPost {
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) throw new Error(`Post not found: ${postId}`);
    return post;
  }
}
