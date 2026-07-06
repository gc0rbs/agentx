/**
 * Campaign Runner
 * Orchestrates the full loop: due posts → publish via browser → collect analytics.
 *
 * Run continuously with run(), or call tick() once from a cron job.
 */

import { createLogger } from '../core/logger';
import { calcEngagementRate } from '../campaigns/analytics';
import type { PostAnalytics } from '../campaigns/types';
import type { XBrowserClient } from '../integrations/x/browser';
import type { UIAnalytics } from '../integrations/x/browser';
import { CampaignStore, StoredPost } from './campaign-store';

const logger = createLogger('campaign-runner');

export interface RunnerConfig {
  /** How often the loop wakes up (ms). Default 5 min. */
  pollIntervalMs: number;
  /** Wait this long after publishing before first analytics pull (ms). Default 1h. */
  analyticsMinAgeMs: number;
  /** Random extra delay before each publish to avoid robotic timing (ms). Default 0-3 min. */
  maxJitterMs: number;
  /** Stop publishing after this many consecutive failures. Default 3. */
  maxConsecutiveFailures: number;
}

const DEFAULT_CONFIG: RunnerConfig = {
  pollIntervalMs: 5 * 60 * 1000,
  analyticsMinAgeMs: 60 * 60 * 1000,
  maxJitterMs: 3 * 60 * 1000,
  maxConsecutiveFailures: 3,
};

export interface TickResult {
  published: string[];
  failed: string[];
  analyticsUpdated: string[];
}

export class CampaignRunner {
  private readonly store: CampaignStore;
  private readonly x: XBrowserClient;
  private readonly config: RunnerConfig;
  private running = false;
  private consecutiveFailures = 0;

  constructor(store: CampaignStore, xClient: XBrowserClient, config: Partial<RunnerConfig> = {}) {
    this.store = store;
    this.x = xClient;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * One pass: publish everything due, refresh stale analytics.
   * Safe to call from cron; state persists between calls.
   */
  async tick(now: Date = new Date()): Promise<TickResult> {
    const result: TickResult = { published: [], failed: [], analyticsUpdated: [] };

    // 1. Publish due posts (X only — TikTok posts are skipped until that client exists)
    const due = this.store.getDuePosts(now).filter((p) => p.platform === 'x');

    for (const post of due) {
      if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
        logger.error('Too many consecutive failures — halting publishing this tick');
        break;
      }

      await this.jitter();
      const ok = await this.publishPost(post);
      if (ok) {
        result.published.push(post.id);
        this.consecutiveFailures = 0;
      } else {
        result.failed.push(post.id);
        this.consecutiveFailures++;
      }
    }

    // 2. Collect analytics for published posts that are stale
    const needAnalytics = this.store.getPostsNeedingAnalytics(this.config.analyticsMinAgeMs, now);

    for (const post of needAnalytics) {
      const updated = await this.collectAnalytics(post);
      if (updated) result.analyticsUpdated.push(post.id);
    }

    logger.info('Tick complete', {
      published: result.published.length,
      failed: result.failed.length,
      analyticsUpdated: result.analyticsUpdated.length,
    });

    return result;
  }

  /**
   * Continuous loop. Ctrl+C (or stop()) to end.
   */
  async run(): Promise<void> {
    this.running = true;
    logger.info('Campaign runner started', {
      pollIntervalMs: this.config.pollIntervalMs,
    });

    while (this.running) {
      try {
        await this.tick();
      } catch (error) {
        logger.error('Tick failed', error instanceof Error ? error : undefined);
      }
      await sleep(this.config.pollIntervalMs);
    }

    logger.info('Campaign runner stopped');
  }

  stop(): void {
    this.running = false;
  }

  // --- internals ---

  private async publishPost(post: StoredPost): Promise<boolean> {
    logger.info('Publishing post', { postId: post.id, format: post.format });

    try {
      // Threads use the multi-tweet composer
      if (post.format === 'thread' && post.content.threadParts?.length) {
        const result = await this.x.postThread(
          post.content.threadParts.map((text) => ({ text }))
        );

        if (result.success) {
          this.store.markPublished(post.id, { tweetUrl: result.threadUrl });
          return true;
        }
        this.store.markFailed(post.id, result.error ?? 'unknown');
        return false;
      }

      // Single tweet (with optional first media attachment)
      const mediaPath = post.content.mediaUrls?.[0];
      const result = await this.x.postTweet(post.content.text, mediaPath);

      if (result.success) {
        this.store.markPublished(post.id, {
          tweetId: result.tweetId,
          tweetUrl: result.tweetUrl,
        });
        return true;
      }

      this.store.markFailed(post.id, result.error ?? 'unknown');
      return false;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown';
      logger.error('Publish threw', error instanceof Error ? error : undefined, { postId: post.id });
      this.store.markFailed(post.id, reason);
      return false;
    }
  }

  private async collectAnalytics(post: StoredPost): Promise<boolean> {
    if (!post.tweetUrl) return false;

    try {
      const ui = await this.x.getTweetAnalytics(post.tweetUrl);
      if (!ui) return false;

      const analytics = mapUIAnalytics(ui);
      this.store.updateAnalytics(post.id, analytics);
      logger.info('Analytics updated', {
        postId: post.id,
        views: ui.views,
        engagementRate: analytics.engagementRate.toFixed(4),
      });
      return true;
    } catch (error) {
      logger.warn('Analytics collection failed', { postId: post.id, error });
      return false;
    }
  }

  private async jitter(): Promise<void> {
    if (this.config.maxJitterMs <= 0) return;
    const delay = Math.floor(Math.random() * this.config.maxJitterMs);
    logger.debug('Jitter delay before publish', { delayMs: delay });
    await sleep(delay);
  }
}

/**
 * Map scraped UI metrics onto the campaign PostAnalytics shape.
 * Fields the UI doesn't expose (reach, clicks, etc.) stay 0 —
 * engagementRate is computed from what we have.
 */
export function mapUIAnalytics(ui: UIAnalytics): PostAnalytics {
  const analytics: PostAnalytics = {
    impressions: ui.views,
    reach: 0,
    likes: ui.likes,
    comments: ui.replies,
    shares: ui.retweets,
    saves: ui.bookmarks,
    clicks: 0,
    profileVisits: 0,
    followers: 0,
    engagementRate: 0,
  };
  analytics.engagementRate = calcEngagementRate(analytics);
  return analytics;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
