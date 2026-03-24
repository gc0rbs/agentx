/**
 * Social Media Campaign Analytics
 * Track and analyze performance across X and TikTok
 */

import type { SocialPlatform, SocialPost, PostAnalytics, SocialCampaign } from './types';

export interface PlatformReport {
  platform: SocialPlatform;
  period: { start: Date; end: Date };
  totalPosts: number;
  totalImpressions: number;
  totalReach: number;
  totalEngagements: number;
  avgEngagementRate: number;
  totalFollowersGained: number;
  topPosts: SocialPost[];
  bestTimeSlot: string;
  bestDayOfWeek: number;
  bestFormat: string;
}

export interface CampaignReport {
  campaignId: string;
  campaignName: string;
  platforms: PlatformReport[];
  crossPlatform: {
    totalImpressions: number;
    totalEngagements: number;
    avgEngagementRate: number;
    totalFollowersGained: number;
    bestPerformingPlatform: SocialPlatform;
  };
  kpiProgress: {
    impressions: { target: number; actual: number; pct: number };
    engagementRate: { target: number; actual: number; pct: number };
    followerGrowth: { target: number; actual: number; pct: number };
    clicks: { target: number; actual: number; pct: number };
  };
}

/**
 * Calculate engagement rate from raw analytics
 */
export function calcEngagementRate(analytics: PostAnalytics): number {
  if (analytics.impressions === 0) return 0;
  const engagements = analytics.likes + analytics.comments + analytics.shares + analytics.saves;
  return engagements / analytics.impressions;
}

/**
 * Analyze a set of posts for a single platform
 */
export function analyzePlatform(
  posts: SocialPost[],
  platform: SocialPlatform,
  period: { start: Date; end: Date }
): PlatformReport {
  const platformPosts = posts.filter(
    p => p.platform === platform && p.analytics
  );

  const analytics = platformPosts.map(p => p.analytics!);

  const totalImpressions = sum(analytics, a => a.impressions);
  const totalReach = sum(analytics, a => a.reach);
  const totalEngagements = sum(analytics, a => a.likes + a.comments + a.shares + a.saves);
  const totalFollowersGained = sum(analytics, a => a.followers);

  const avgEngagementRate = totalImpressions > 0
    ? totalEngagements / totalImpressions
    : 0;

  // Find best time slot
  const slotMap = groupBy(platformPosts, p => p.schedule.timeSlot);
  const bestTimeSlot = findBestGroup(slotMap);

  // Find best day
  const dayMap = groupBy(platformPosts, p => String(p.schedule.dayOfWeek));
  const bestDayOfWeek = Number(findBestGroup(dayMap)) || 0;

  // Find best format
  const formatMap = groupBy(platformPosts, p => p.format);
  const bestFormat = findBestGroup(formatMap);

  // Top posts by engagement rate
  const topPosts = [...platformPosts]
    .sort((a, b) => (b.analytics!.engagementRate) - (a.analytics!.engagementRate))
    .slice(0, 5);

  return {
    platform,
    period,
    totalPosts: platformPosts.length,
    totalImpressions,
    totalReach,
    totalEngagements,
    avgEngagementRate,
    totalFollowersGained,
    topPosts,
    bestTimeSlot,
    bestDayOfWeek,
    bestFormat,
  };
}

/**
 * Generate a full campaign report across all platforms
 */
export function generateCampaignReport(campaign: SocialCampaign): CampaignReport {
  const period = { start: campaign.startDate, end: campaign.endDate };

  const platforms = campaign.platforms.map(p =>
    analyzePlatform(campaign.posts, p, period)
  );

  const totalImpressions = sum(platforms, p => p.totalImpressions);
  const totalEngagements = sum(platforms, p => p.totalEngagements);
  const totalFollowersGained = sum(platforms, p => p.totalFollowersGained);
  const avgEngagementRate = totalImpressions > 0
    ? totalEngagements / totalImpressions
    : 0;

  const bestPerformingPlatform = platforms.reduce(
    (best, p) => p.avgEngagementRate > best.avgEngagementRate ? p : best,
    platforms[0]
  ).platform;

  const totalClicks = sum(
    campaign.posts.filter(p => p.analytics),
    p => p.analytics!.clicks
  );

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    platforms,
    crossPlatform: {
      totalImpressions,
      totalEngagements,
      avgEngagementRate,
      totalFollowersGained,
      bestPerformingPlatform,
    },
    kpiProgress: {
      impressions: kpiProgress(campaign.kpis.targetImpressions, totalImpressions),
      engagementRate: kpiProgress(campaign.kpis.targetEngagementRate, avgEngagementRate),
      followerGrowth: kpiProgress(campaign.kpis.targetFollowerGrowth, totalFollowersGained),
      clicks: kpiProgress(campaign.kpis.targetClicks, totalClicks),
    },
  };
}

/**
 * Compare performance between two platforms
 */
export function comparePlatforms(
  posts: SocialPost[],
  period: { start: Date; end: Date }
): { x: PlatformReport; tiktok: PlatformReport; winner: SocialPlatform; insights: string[] } {
  const x = analyzePlatform(posts, 'x', period);
  const tiktok = analyzePlatform(posts, 'tiktok', period);

  const insights: string[] = [];

  if (x.avgEngagementRate > tiktok.avgEngagementRate) {
    insights.push(`X has ${((x.avgEngagementRate / (tiktok.avgEngagementRate || 0.001)) * 100 - 100).toFixed(0)}% higher engagement rate`);
  } else {
    insights.push(`TikTok has ${((tiktok.avgEngagementRate / (x.avgEngagementRate || 0.001)) * 100 - 100).toFixed(0)}% higher engagement rate`);
  }

  if (x.totalReach > tiktok.totalReach) {
    insights.push(`X reached ${x.totalReach - tiktok.totalReach} more people`);
  } else {
    insights.push(`TikTok reached ${tiktok.totalReach - x.totalReach} more people`);
  }

  insights.push(`Best time on X: ${x.bestTimeSlot}, Best time on TikTok: ${tiktok.bestTimeSlot}`);

  const winner = x.avgEngagementRate > tiktok.avgEngagementRate ? 'x' : 'tiktok';

  return { x, tiktok, winner, insights };
}

// --- helpers ---

function sum<T>(items: T[], fn: (item: T) => number): number {
  return items.reduce((acc, item) => acc + fn(item), 0);
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k) ?? [];
    arr.push(item);
    map.set(k, arr);
  }
  return map;
}

function findBestGroup(map: Map<string, SocialPost[]>): string {
  let bestKey = '';
  let bestRate = -1;

  for (const [key, posts] of map) {
    const withAnalytics = posts.filter(p => p.analytics);
    if (withAnalytics.length === 0) continue;

    const avgRate = withAnalytics.reduce(
      (sum, p) => sum + p.analytics!.engagementRate, 0
    ) / withAnalytics.length;

    if (avgRate > bestRate) {
      bestRate = avgRate;
      bestKey = key;
    }
  }

  return bestKey;
}

function kpiProgress(target: number, actual: number): { target: number; actual: number; pct: number } {
  return {
    target,
    actual,
    pct: target > 0 ? Math.round((actual / target) * 100) : 0,
  };
}
