/**
 * Hashtag Analyzer
 * Score, recommend, and track hashtag performance for X and TikTok
 */

import type { SocialPlatform, HashtagScore, HashtagSet, SocialPost } from './types';

/**
 * Known hashtag data (in production, this would come from API calls)
 * Serves as a baseline / seed data
 */
const HASHTAG_DB: Record<string, Partial<HashtagScore>> = {
  // TikTok general
  fyp: { volume: 50_000_000_000, competition: 1.0, relevance: 0.3 },
  foryou: { volume: 30_000_000_000, competition: 1.0, relevance: 0.3 },
  foryoupage: { volume: 20_000_000_000, competition: 1.0, relevance: 0.3 },
  viral: { volume: 5_000_000_000, competition: 0.95, relevance: 0.4 },
  trending: { volume: 3_000_000_000, competition: 0.9, relevance: 0.4 },

  // Tech/AI niche
  ai: { volume: 500_000_000, competition: 0.8, relevance: 0.9 },
  artificialintelligence: { volume: 200_000_000, competition: 0.7, relevance: 0.95 },
  tech: { volume: 1_000_000_000, competition: 0.85, relevance: 0.8 },
  techtok: { volume: 300_000_000, competition: 0.6, relevance: 0.85 },
  productivity: { volume: 400_000_000, competition: 0.7, relevance: 0.75 },
  startup: { volume: 200_000_000, competition: 0.65, relevance: 0.7 },

  // Marketing
  marketing: { volume: 800_000_000, competition: 0.8, relevance: 0.9 },
  digitalmarketing: { volume: 300_000_000, competition: 0.7, relevance: 0.95 },
  socialmedia: { volume: 600_000_000, competition: 0.75, relevance: 0.85 },
  contentcreator: { volume: 400_000_000, competition: 0.7, relevance: 0.8 },
  growthhacking: { volume: 100_000_000, competition: 0.5, relevance: 0.85 },
};

/**
 * Score a hashtag based on volume, competition, relevance, and trend velocity
 */
export function scoreHashtag(
  tag: string,
  niche: string,
  platform: SocialPlatform
): HashtagScore {
  const clean = tag.replace(/^#/, '').toLowerCase();
  const known = HASHTAG_DB[clean];

  const volume = known?.volume ?? estimateVolume(clean);
  const competition = known?.competition ?? estimateCompetition(volume);
  const relevance = known?.relevance ?? estimateRelevance(clean, niche);
  const trendVelocity = estimateTrendVelocity(clean);

  // Composite score: balance discoverability vs competition
  // High relevance + moderate competition + growing trend = best
  const weights = platform === 'tiktok'
    ? { relevance: 0.35, antiCompetition: 0.25, trend: 0.25, volume: 0.15 }
    : { relevance: 0.4, antiCompetition: 0.2, trend: 0.2, volume: 0.2 };

  const score =
    weights.relevance * relevance +
    weights.antiCompetition * (1 - competition) +
    weights.trend * Math.min(1, trendVelocity) +
    weights.volume * normalizeVolume(volume);

  return {
    tag: clean,
    volume,
    competition,
    relevance,
    trendVelocity,
    score: Math.round(score * 1000) / 1000,
  };
}

/**
 * Recommend optimal hashtag set for a post
 */
export function recommendHashtags(
  platform: SocialPlatform,
  niche: string,
  campaignTag?: string,
  maxTotal?: number
): HashtagSet {
  const max = maxTotal ?? (platform === 'tiktok' ? 8 : 3);

  // Score all known hashtags for this niche
  const scored = Object.keys(HASHTAG_DB)
    .map(tag => scoreHashtag(tag, niche, platform))
    .sort((a, b) => b.score - a.score);

  const primary = campaignTag ? [campaignTag] : [];

  // Pick top trending (high volume + high velocity)
  const trending = scored
    .filter(h => h.trendVelocity > 0.5 && h.volume > 100_000_000)
    .slice(0, 2)
    .map(h => h.tag);

  // Pick top niche (high relevance, moderate competition)
  const nicheHashes = scored
    .filter(h => h.relevance > 0.7 && h.competition < 0.8 && !trending.includes(h.tag))
    .slice(0, Math.max(1, max - primary.length - trending.length - 1))
    .map(h => h.tag);

  // Pick discovery tags (broad reach)
  const remaining = max - primary.length - trending.length - nicheHashes.length;
  const discovery = scored
    .filter(h => h.volume > 500_000_000 && !trending.includes(h.tag) && !nicheHashes.includes(h.tag))
    .slice(0, Math.max(0, remaining))
    .map(h => h.tag);

  return { primary, trending, niche: nicheHashes, discovery };
}

/**
 * Analyze hashtag performance from published posts
 */
export function analyzeHashtagPerformance(posts: SocialPost[]): Map<string, {
  uses: number;
  avgEngagement: number;
  avgImpressions: number;
  avgReach: number;
}> {
  const stats = new Map<string, { uses: number; totalEng: number; totalImp: number; totalReach: number }>();

  for (const post of posts) {
    if (!post.analytics) continue;

    for (const tag of post.hashtags) {
      const clean = tag.replace(/^#/, '').toLowerCase();
      const current = stats.get(clean) ?? { uses: 0, totalEng: 0, totalImp: 0, totalReach: 0 };
      const eng = post.analytics.likes + post.analytics.comments + post.analytics.shares;

      current.uses++;
      current.totalEng += eng;
      current.totalImp += post.analytics.impressions;
      current.totalReach += post.analytics.reach;
      stats.set(clean, current);
    }
  }

  const result = new Map<string, { uses: number; avgEngagement: number; avgImpressions: number; avgReach: number }>();
  for (const [tag, data] of stats) {
    result.set(tag, {
      uses: data.uses,
      avgEngagement: data.uses > 0 ? data.totalEng / data.uses : 0,
      avgImpressions: data.uses > 0 ? data.totalImp / data.uses : 0,
      avgReach: data.uses > 0 ? data.totalReach / data.uses : 0,
    });
  }

  return result;
}

/**
 * Find competitor hashtags from a list of competitor post hashtags
 */
export function findCompetitorHashtags(
  competitorHashtags: string[][],
  ownHashtags: string[]
): { shared: string[]; missed: string[]; unique: string[] } {
  const ownSet = new Set(ownHashtags.map(t => t.toLowerCase()));
  const frequency = new Map<string, number>();

  for (const tags of competitorHashtags) {
    for (const tag of tags) {
      const clean = tag.toLowerCase();
      frequency.set(clean, (frequency.get(clean) ?? 0) + 1);
    }
  }

  // Sort by frequency
  const sorted = [...frequency.entries()].sort((a, b) => b[1] - a[1]);

  const shared = sorted.filter(([tag]) => ownSet.has(tag)).map(([tag]) => tag);
  const missed = sorted.filter(([tag]) => !ownSet.has(tag)).map(([tag]) => tag);
  const unique = [...ownSet].filter(tag => !frequency.has(tag));

  return { shared, missed, unique };
}

// --- estimation helpers ---

function estimateVolume(tag: string): number {
  // Rough estimate based on tag length and common patterns
  return Math.max(10_000, 100_000_000 / (tag.length * 2));
}

function estimateCompetition(volume: number): number {
  // Higher volume = more competition
  return Math.min(1, Math.log10(volume) / 10);
}

function estimateRelevance(tag: string, niche: string): number {
  const nicheLower = niche.toLowerCase();
  const tagLower = tag.toLowerCase();
  if (tagLower.includes(nicheLower) || nicheLower.includes(tagLower)) return 0.9;
  return 0.3;
}

function estimateTrendVelocity(tag: string): number {
  // In production, compare current vs past volume
  // For now, known trending tags get higher velocity
  const trending = ['ai', 'techtok', 'growthhacking', 'productivity'];
  return trending.includes(tag.toLowerCase()) ? 0.8 : 0.3;
}

function normalizeVolume(volume: number): number {
  return Math.min(1, Math.log10(Math.max(1, volume)) / 10);
}
