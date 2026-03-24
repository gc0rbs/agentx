/**
 * Social Media Posting Scheduler
 * Manages optimal posting times and queue for X and TikTok
 */

import type { SocialPlatform, SocialPost, PostSchedule, CampaignPhase } from './types';

/**
 * Optimal posting windows by platform
 * Based on engagement data — times in UTC offset hours (0-23)
 */
const OPTIMAL_TIMES: Record<SocialPlatform, Record<PostSchedule['timeSlot'], number[]>> = {
  x: {
    morning: [8, 9, 10],        // 8-10 AM — commute + morning scroll
    midday: [12, 13],            // 12-1 PM — lunch break
    afternoon: [15, 16],         // 3-4 PM — afternoon slump
    evening: [18, 19, 20],       // 6-8 PM — post-work
    night: [21, 22],             // 9-10 PM — evening wind-down
  },
  tiktok: {
    morning: [7, 8, 9],          // 7-9 AM — early scroll
    midday: [11, 12, 13],        // 11 AM-1 PM — lunch
    afternoon: [15, 16],         // 3-4 PM — school/work break
    evening: [19, 20, 21],       // 7-9 PM — prime time
    night: [22, 23],             // 10-11 PM — late night
  },
};

/**
 * Best days by platform (0=Sun, 6=Sat)
 * Ranked by typical engagement
 */
const BEST_DAYS: Record<SocialPlatform, number[]> = {
  x: [1, 2, 3, 4],              // Mon-Thu
  tiktok: [2, 3, 4, 5, 6],      // Tue-Sat
};

export interface SchedulerConfig {
  timezone: string;
  maxPostsPerDay: Record<SocialPlatform, number>;
  minGapMinutes: number;         // Minimum gap between posts on same platform
  respectRateLimits: boolean;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  timezone: 'America/New_York',
  maxPostsPerDay: { x: 5, tiktok: 3 },
  minGapMinutes: 120,            // 2 hours
  respectRateLimits: true,
};

/**
 * Rate limits by platform (posts per window)
 */
const RATE_LIMITS: Record<SocialPlatform, { posts: number; windowMinutes: number }> = {
  x: { posts: 50, windowMinutes: 1440 },      // 50 tweets/day
  tiktok: { posts: 10, windowMinutes: 1440 },  // ~10 videos/day
};

export class PostScheduler {
  private config: SchedulerConfig;
  private queue: SocialPost[] = [];
  private publishedCounts: Map<string, number> = new Map(); // "platform:YYYY-MM-DD" -> count

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the next optimal posting time for a platform
   */
  getNextOptimalTime(platform: SocialPlatform, after: Date = new Date()): Date {
    const times = OPTIMAL_TIMES[platform];
    const bestDays = BEST_DAYS[platform];
    const now = new Date(after);

    // Try today first, then next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + dayOffset);
      const dayOfWeek = candidate.getDay();

      if (!bestDays.includes(dayOfWeek) && dayOffset < 6) continue;

      // Try each time slot
      for (const slot of ['morning', 'midday', 'afternoon', 'evening', 'night'] as const) {
        for (const hour of times[slot]) {
          const target = new Date(candidate);
          target.setHours(hour, 0, 0, 0);

          if (target > now && this.isSlotAvailable(platform, target)) {
            return target;
          }
        }
      }
    }

    // Fallback: next day at first optimal time
    const fallback = new Date(now);
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(times.morning[0], 0, 0, 0);
    return fallback;
  }

  /**
   * Schedule a post at the optimal time
   */
  schedulePost(post: SocialPost): SocialPost {
    const publishAt = this.getNextOptimalTime(post.platform, post.schedule.publishAt);
    const dayOfWeek = publishAt.getDay();
    const hour = publishAt.getHours();

    const timeSlot = this.hourToTimeSlot(hour);

    const scheduled: SocialPost = {
      ...post,
      status: 'scheduled',
      schedule: {
        ...post.schedule,
        publishAt,
        dayOfWeek,
        timeSlot,
      },
    };

    this.queue.push(scheduled);
    this.queue.sort((a, b) => a.schedule.publishAt.getTime() - b.schedule.publishAt.getTime());

    return scheduled;
  }

  /**
   * Schedule an entire campaign's worth of posts
   */
  scheduleCampaign(
    posts: SocialPost[],
    startDate: Date,
    phases: { phase: CampaignPhase; days: number }[]
  ): SocialPost[] {
    const scheduled: SocialPost[] = [];
    let currentDate = new Date(startDate);

    for (const phaseConfig of phases) {
      const phasePosts = posts.filter(p => p.schedule.phase === phaseConfig.phase);
      const daysInPhase = phaseConfig.days;

      // Distribute posts across phase days
      const postsPerDay = Math.max(1, Math.ceil(phasePosts.length / daysInPhase));

      let postIndex = 0;
      for (let day = 0; day < daysInPhase && postIndex < phasePosts.length; day++) {
        const dayDate = new Date(currentDate);
        dayDate.setDate(dayDate.getDate() + day);

        for (let p = 0; p < postsPerDay && postIndex < phasePosts.length; p++) {
          const post = phasePosts[postIndex];
          post.schedule.publishAt = dayDate;
          const result = this.schedulePost(post);
          scheduled.push(result);
          postIndex++;
        }
      }

      currentDate.setDate(currentDate.getDate() + daysInPhase);
    }

    return scheduled;
  }

  /**
   * Get all queued posts, optionally filtered
   */
  getQueue(platform?: SocialPlatform): SocialPost[] {
    if (platform) {
      return this.queue.filter(p => p.platform === platform);
    }
    return [...this.queue];
  }

  /**
   * Get posts due for publishing
   */
  getDuePosts(now: Date = new Date()): SocialPost[] {
    return this.queue.filter(
      p => p.status === 'scheduled' && p.schedule.publishAt <= now
    );
  }

  /**
   * Mark a post as published and track count
   */
  markPublished(postId: string): void {
    const post = this.queue.find(p => p.id === postId);
    if (!post) return;

    post.status = 'published';
    const key = `${post.platform}:${post.schedule.publishAt.toISOString().split('T')[0]}`;
    this.publishedCounts.set(key, (this.publishedCounts.get(key) ?? 0) + 1);
  }

  /**
   * Check if we can post at a given time without hitting rate limits
   */
  canPost(platform: SocialPlatform, at: Date = new Date()): boolean {
    if (!this.config.respectRateLimits) return true;

    const dateKey = `${platform}:${at.toISOString().split('T')[0]}`;
    const count = this.publishedCounts.get(dateKey) ?? 0;
    const limit = RATE_LIMITS[platform];

    return count < limit.posts && count < this.config.maxPostsPerDay[platform];
  }

  /**
   * Check minimum gap between posts
   */
  private isSlotAvailable(platform: SocialPlatform, time: Date): boolean {
    const minGapMs = this.config.minGapMinutes * 60 * 1000;

    const conflict = this.queue.find(p =>
      p.platform === platform &&
      Math.abs(p.schedule.publishAt.getTime() - time.getTime()) < minGapMs
    );

    return !conflict && this.canPost(platform, time);
  }

  private hourToTimeSlot(hour: number): PostSchedule['timeSlot'] {
    if (hour < 11) return 'morning';
    if (hour < 14) return 'midday';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }
}
