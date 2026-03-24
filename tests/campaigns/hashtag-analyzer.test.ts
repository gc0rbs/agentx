import { describe, it, expect } from 'vitest';
import {
  scoreHashtag,
  recommendHashtags,
  analyzeHashtagPerformance,
  findCompetitorHashtags,
} from '../../src/campaigns/hashtag-analyzer';
import type { SocialPost } from '../../src/campaigns/types';

describe('Hashtag Analyzer', () => {
  describe('scoreHashtag', () => {
    it('should score a known hashtag', () => {
      const score = scoreHashtag('ai', 'artificial intelligence', 'tiktok');

      expect(score.tag).toBe('ai');
      expect(score.volume).toBeGreaterThan(0);
      expect(score.competition).toBeGreaterThanOrEqual(0);
      expect(score.competition).toBeLessThanOrEqual(1);
      expect(score.relevance).toBeGreaterThan(0);
      expect(score.score).toBeGreaterThan(0);
      expect(score.score).toBeLessThanOrEqual(1);
    });

    it('should score an unknown hashtag', () => {
      const score = scoreHashtag('randomnewtag123', 'tech', 'x');

      expect(score.tag).toBe('randomnewtag123');
      expect(score.volume).toBeGreaterThan(0);
      expect(score.score).toBeGreaterThan(0);
    });

    it('should strip # prefix', () => {
      const score = scoreHashtag('#ai', 'tech', 'x');
      expect(score.tag).toBe('ai');
    });

    it('should score higher for relevant niche tags', () => {
      const relevant = scoreHashtag('ai', 'ai tools', 'x');
      const irrelevant = scoreHashtag('cooking', 'ai tools', 'x');

      expect(relevant.relevance).toBeGreaterThan(irrelevant.relevance);
    });
  });

  describe('recommendHashtags', () => {
    it('should recommend hashtags for TikTok', () => {
      const tags = recommendHashtags('tiktok', 'AI productivity', 'FlowAI');

      expect(tags.primary).toContain('FlowAI');
      const allTags = [...tags.primary, ...tags.trending, ...tags.niche, ...tags.discovery];
      expect(allTags.length).toBeGreaterThan(0);
      expect(allTags.length).toBeLessThanOrEqual(8);
    });

    it('should recommend hashtags for X', () => {
      const tags = recommendHashtags('x', 'marketing');

      const allTags = [...tags.primary, ...tags.trending, ...tags.niche, ...tags.discovery];
      expect(allTags.length).toBeLessThanOrEqual(3);
    });

    it('should respect maxTotal parameter', () => {
      const tags = recommendHashtags('tiktok', 'tech', undefined, 5);
      const allTags = [...tags.primary, ...tags.trending, ...tags.niche, ...tags.discovery];
      expect(allTags.length).toBeLessThanOrEqual(5);
    });
  });

  describe('analyzeHashtagPerformance', () => {
    it('should aggregate performance by hashtag', () => {
      const posts: SocialPost[] = [
        {
          id: '1', platform: 'x', format: 'text', content: { text: 'Test' },
          hashtags: ['ai', 'tech'],
          schedule: { publishAt: new Date(), timezone: 'UTC', phase: 'launch', dayOfWeek: 1, timeSlot: 'morning' },
          status: 'published',
          analytics: {
            impressions: 10000, reach: 5000, likes: 500, comments: 50,
            shares: 100, saves: 30, clicks: 200, profileVisits: 60,
            followers: 10, engagementRate: 0.068,
          },
        },
        {
          id: '2', platform: 'x', format: 'text', content: { text: 'Test2' },
          hashtags: ['ai'],
          schedule: { publishAt: new Date(), timezone: 'UTC', phase: 'launch', dayOfWeek: 2, timeSlot: 'midday' },
          status: 'published',
          analytics: {
            impressions: 20000, reach: 10000, likes: 1000, comments: 100,
            shares: 200, saves: 60, clicks: 400, profileVisits: 120,
            followers: 20, engagementRate: 0.068,
          },
        },
      ];

      const result = analyzeHashtagPerformance(posts);

      expect(result.get('ai')!.uses).toBe(2);
      expect(result.get('tech')!.uses).toBe(1);
      expect(result.get('ai')!.avgImpressions).toBe(15000);
    });

    it('should skip posts without analytics', () => {
      const posts: SocialPost[] = [
        {
          id: '1', platform: 'x', format: 'text', content: { text: 'Test' },
          hashtags: ['ai'],
          schedule: { publishAt: new Date(), timezone: 'UTC', phase: 'launch', dayOfWeek: 1, timeSlot: 'morning' },
          status: 'draft',
        },
      ];

      const result = analyzeHashtagPerformance(posts);
      expect(result.size).toBe(0);
    });
  });

  describe('findCompetitorHashtags', () => {
    it('should identify shared, missed, and unique hashtags', () => {
      const competitorTags = [
        ['ai', 'tech', 'startup'],
        ['ai', 'saas', 'productivity'],
        ['ai', 'tech', 'automation'],
      ];
      const ownTags = ['ai', 'flowai', 'productivity'];

      const result = findCompetitorHashtags(competitorTags, ownTags);

      expect(result.shared).toContain('ai');
      expect(result.shared).toContain('productivity');
      expect(result.missed).toContain('tech');
      expect(result.missed).toContain('startup');
      expect(result.unique).toContain('flowai');
    });
  });
});
