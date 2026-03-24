import { describe, it, expect } from 'vitest';
import {
  calcEngagementRate,
  analyzePlatform,
  generateCampaignReport,
  comparePlatforms,
} from '../../src/campaigns/analytics';
import type { SocialPost, PostAnalytics, SocialCampaign } from '../../src/campaigns/types';

function makeAnalytics(overrides: Partial<PostAnalytics> = {}): PostAnalytics {
  return {
    impressions: 10000,
    reach: 5000,
    likes: 500,
    comments: 50,
    shares: 100,
    saves: 30,
    clicks: 200,
    profileVisits: 60,
    followers: 10,
    engagementRate: 0.068,
    ...overrides,
  };
}

function makePost(platform: 'x' | 'tiktok', analytics?: PostAnalytics): SocialPost {
  return {
    id: 'test-' + Math.random().toString(36).slice(2),
    platform,
    format: platform === 'tiktok' ? 'video' : 'text',
    content: { text: 'Test' },
    hashtags: ['test'],
    schedule: {
      publishAt: new Date('2026-04-14'),
      timezone: 'UTC',
      phase: 'launch',
      dayOfWeek: 1,
      timeSlot: 'morning',
    },
    status: 'published',
    analytics,
  };
}

describe('Analytics', () => {
  describe('calcEngagementRate', () => {
    it('should calculate engagement rate correctly', () => {
      const rate = calcEngagementRate(makeAnalytics({
        impressions: 1000,
        likes: 50,
        comments: 10,
        shares: 5,
        saves: 5,
      }));

      expect(rate).toBeCloseTo(0.07); // (50+10+5+5)/1000
    });

    it('should return 0 for zero impressions', () => {
      expect(calcEngagementRate(makeAnalytics({ impressions: 0 }))).toBe(0);
    });
  });

  describe('analyzePlatform', () => {
    it('should aggregate metrics for a platform', () => {
      const posts = [
        makePost('x', makeAnalytics({ impressions: 10000, likes: 500, comments: 50, shares: 100, saves: 30, reach: 5000 })),
        makePost('x', makeAnalytics({ impressions: 20000, likes: 1000, comments: 100, shares: 200, saves: 60, reach: 10000 })),
      ];

      const report = analyzePlatform(posts, 'x', {
        start: new Date('2026-04-07'),
        end: new Date('2026-04-27'),
      });

      expect(report.totalPosts).toBe(2);
      expect(report.totalImpressions).toBe(30000);
      expect(report.totalReach).toBe(15000);
    });

    it('should skip posts without analytics', () => {
      const posts = [
        makePost('x', makeAnalytics()),
        makePost('x'), // no analytics
      ];

      const report = analyzePlatform(posts, 'x', {
        start: new Date('2026-04-07'),
        end: new Date('2026-04-27'),
      });

      expect(report.totalPosts).toBe(1);
    });

    it('should identify top posts by engagement', () => {
      const posts = [
        makePost('x', makeAnalytics({ engagementRate: 0.02 })),
        makePost('x', makeAnalytics({ engagementRate: 0.15 })),
        makePost('x', makeAnalytics({ engagementRate: 0.08 })),
      ];

      const report = analyzePlatform(posts, 'x', {
        start: new Date('2026-04-07'),
        end: new Date('2026-04-27'),
      });

      expect(report.topPosts[0].analytics!.engagementRate).toBe(0.15);
    });
  });

  describe('comparePlatforms', () => {
    it('should compare X and TikTok performance', () => {
      const posts = [
        makePost('x', makeAnalytics({ impressions: 10000, likes: 100, comments: 10, shares: 10, saves: 5 })),
        makePost('tiktok', makeAnalytics({ impressions: 10000, likes: 500, comments: 100, shares: 50, saves: 30 })),
      ];

      const result = comparePlatforms(posts, {
        start: new Date('2026-04-07'),
        end: new Date('2026-04-27'),
      });

      expect(result.winner).toBe('tiktok');
      expect(result.insights.length).toBeGreaterThan(0);
    });
  });

  describe('generateCampaignReport', () => {
    it('should generate a full campaign report with KPI progress', () => {
      const campaign: SocialCampaign = {
        id: 'test',
        name: 'Test Campaign',
        description: 'Test',
        platforms: ['x', 'tiktok'],
        phases: [],
        targetAudience: {
          demographics: { ageRange: [22, 40], interests: [], locations: [] },
          psychographics: { painPoints: [], aspirations: [], contentPreferences: [] },
        },
        contentPillars: [],
        kpis: {
          targetImpressions: 100000,
          targetEngagementRate: 0.05,
          targetFollowerGrowth: 1000,
          targetClicks: 5000,
        },
        posts: [
          makePost('x', makeAnalytics({ impressions: 30000, clicks: 1500, followers: 200 })),
          makePost('tiktok', makeAnalytics({ impressions: 70000, clicks: 3500, followers: 800 })),
        ],
        startDate: new Date('2026-04-07'),
        endDate: new Date('2026-04-27'),
        status: 'active',
      };

      const report = generateCampaignReport(campaign);

      expect(report.crossPlatform.totalImpressions).toBe(100000);
      expect(report.kpiProgress.impressions.pct).toBe(100);
      expect(report.kpiProgress.clicks.actual).toBe(5000);
      expect(report.kpiProgress.followerGrowth.actual).toBe(1000);
      expect(report.platforms.length).toBe(2);
    });
  });
});
