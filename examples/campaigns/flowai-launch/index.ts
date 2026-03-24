/**
 * FlowAI Launch Campaign Runner
 * Demonstrates using the campaign system to execute a real launch
 */

import { v4 as uuid } from 'uuid';
import {
  generateXPost,
  generateTikTokScript,
  generateThread,
  adaptContent,
  recommendHashtags,
  PostScheduler,
  generateCampaignReport,
} from '../../../src/campaigns';
import type { SocialCampaign, SocialPost, PostAnalytics } from '../../../src/campaigns';

// --- Campaign Setup ---

function createFlowAICampaign(): SocialCampaign {
  return {
    id: 'flowai-launch-2026',
    name: 'FlowAI Product Launch',
    description: 'AI productivity assistant launch across X and TikTok',
    platforms: ['x', 'tiktok'],
    phases: [
      { phase: 'teaser', startDay: 0, endDay: 6, postsPerDay: { x: 3, tiktok: 2 }, focus: 'Build curiosity' },
      { phase: 'launch', startDay: 7, endDay: 13, postsPerDay: { x: 4, tiktok: 3 }, focus: 'Reveal and demo' },
      { phase: 'social_proof', startDay: 14, endDay: 20, postsPerDay: { x: 3, tiktok: 2 }, focus: 'Results and testimonials' },
    ],
    targetAudience: {
      demographics: {
        ageRange: [22, 40],
        interests: ['productivity', 'AI', 'tech'],
        locations: ['US', 'UK', 'CA'],
      },
      psychographics: {
        painPoints: ['Too many apps', 'Context switching'],
        aspirations: ['10x output', 'Simplified workflow'],
        contentPreferences: ['video', 'thread', 'text'],
      },
    },
    contentPillars: [
      'The Problem',
      'The Solution',
      'Social Proof',
      'Behind the Scenes',
      'Tips & Value',
    ],
    kpis: {
      targetImpressions: 2_000_000,
      targetEngagementRate: 0.045,
      targetFollowerGrowth: 5_000,
      targetClicks: 25_000,
      targetVideoViews: 500_000,
    },
    posts: [],
    startDate: new Date('2026-04-07'),
    endDate: new Date('2026-04-27'),
    status: 'draft',
  };
}

// --- Content Generation ---

function generateCampaignContent(): SocialPost[] {
  const posts: SocialPost[] = [];

  // X content - teaser phase
  const xHashtags = recommendHashtags('x', 'AI productivity', 'FlowAI');
  const allXTags = [...xHashtags.primary, ...xHashtags.niche, ...xHashtags.trending];

  posts.push(generateXPost({
    topic: 'AI productivity assistant',
    style: 'storytelling',
    hashtags: allXTags,
  }));

  posts.push(generateXPost({
    topic: 'app switching kills your focus',
    style: 'provocative',
    hashtags: ['productivity'],
  }));

  posts.push(generateXPost({
    topic: 'FlowAI auto-plans your week',
    style: 'informative',
    hashtags: ['FlowAI', 'ai'],
  }));

  // X thread
  posts.push(generateThread({
    topic: 'Why existing productivity tools are broken',
    points: [
      'The average knowledge worker uses 9+ apps daily. Each context switch costs 23 minutes.',
      'Current tools make YOU do the organizing. That defeats the purpose.',
      'AI should handle scheduling, prioritization, and adaptation automatically.',
      'FlowAI does exactly this. It learns your patterns and manages your workflow.',
      'Beta users save an average of 5.2 hours per week.',
    ],
    ctaText: 'Early access is live at flowai.app',
  }));

  // TikTok scripts
  const script1 = generateTikTokScript({
    topic: 'AI productivity app',
    duration: 60,
    hookStyle: 'promise',
    hashtags: ['FlowAI', 'productivity', 'techtok', 'fyp'],
  });

  posts.push({
    id: uuid(),
    platform: 'tiktok',
    format: 'video',
    content: {
      text: `${script1.hook}\n\n${script1.body}\n\n${script1.cta}`,
      hook: script1.hook,
      body: script1.body,
      cta: script1.cta,
      duration: script1.duration,
      soundId: script1.soundSuggestion,
    },
    hashtags: ['FlowAI', 'productivity', 'techtok', 'fyp'],
    schedule: { publishAt: new Date(), timezone: 'America/New_York', phase: 'launch', dayOfWeek: 1, timeSlot: 'evening' },
    status: 'draft',
  });

  const script2 = generateTikTokScript({
    topic: 'replacing 9 productivity apps',
    duration: 15,
    hookStyle: 'shock',
    hashtags: ['FlowAI', 'ai', 'fyp'],
  });

  posts.push({
    id: uuid(),
    platform: 'tiktok',
    format: 'video',
    content: {
      text: `${script2.hook}\n\n${script2.body}\n\n${script2.cta}`,
      hook: script2.hook,
      body: script2.body,
      cta: script2.cta,
      duration: script2.duration,
      soundId: script2.soundSuggestion,
    },
    hashtags: ['FlowAI', 'ai', 'fyp'],
    schedule: { publishAt: new Date(), timezone: 'America/New_York', phase: 'teaser', dayOfWeek: 3, timeSlot: 'evening' },
    status: 'draft',
  });

  // Cross-platform adaptation: turn the X thread into a TikTok script
  const threadPost = posts.find(p => p.format === 'thread')!;
  const adapted = adaptContent(threadPost.content, 'x', 'tiktok');

  posts.push({
    id: uuid(),
    platform: 'tiktok',
    format: 'video',
    content: adapted.adaptedContent,
    hashtags: ['FlowAI', 'productivity', 'fyp'],
    schedule: { publishAt: new Date(), timezone: 'America/New_York', phase: 'launch', dayOfWeek: 3, timeSlot: 'afternoon' },
    status: 'draft',
  });

  return posts;
}

// --- Schedule & Execute ---

function schedulePosts(posts: SocialPost[]): SocialPost[] {
  const scheduler = new PostScheduler({
    timezone: 'America/New_York',
    maxPostsPerDay: { x: 5, tiktok: 3 },
    minGapMinutes: 120,
    respectRateLimits: true,
  });

  return scheduler.scheduleCampaign(posts, new Date('2026-04-07'), [
    { phase: 'teaser', days: 7 },
    { phase: 'launch', days: 7 },
    { phase: 'social_proof', days: 7 },
  ]);
}

// --- Simulate Analytics ---

function simulateAnalytics(post: SocialPost): PostAnalytics {
  const base = post.platform === 'tiktok'
    ? { impressions: 50_000, reach: 30_000 }
    : { impressions: 15_000, reach: 8_000 };

  const multiplier = post.schedule.phase === 'launch' ? 2.5 : 1;

  const impressions = Math.round(base.impressions * multiplier * (0.5 + Math.random()));
  const reach = Math.round(base.reach * multiplier * (0.5 + Math.random()));
  const likes = Math.round(impressions * (0.02 + Math.random() * 0.06));
  const comments = Math.round(likes * (0.05 + Math.random() * 0.15));
  const shares = Math.round(likes * (0.03 + Math.random() * 0.1));
  const saves = Math.round(likes * (0.02 + Math.random() * 0.08));
  const clicks = Math.round(impressions * (0.005 + Math.random() * 0.02));
  const engagementRate = (likes + comments + shares + saves) / impressions;

  return {
    impressions,
    reach,
    likes,
    comments,
    shares,
    saves,
    clicks,
    profileVisits: Math.round(clicks * 0.3),
    followers: Math.round(clicks * 0.05),
    engagementRate,
    videoViews: post.format === 'video' ? Math.round(impressions * 0.7) : undefined,
    avgWatchTime: post.format === 'video' ? 8 + Math.random() * 20 : undefined,
    completionRate: post.format === 'video' ? 0.2 + Math.random() * 0.4 : undefined,
  };
}

// --- Main ---

export function runFlowAICampaign() {
  console.log('=== FlowAI Launch Campaign ===\n');

  // 1. Create campaign
  const campaign = createFlowAICampaign();
  console.log(`Campaign: ${campaign.name}`);
  console.log(`Platforms: ${campaign.platforms.join(', ')}`);
  console.log(`Duration: ${campaign.startDate.toDateString()} — ${campaign.endDate.toDateString()}\n`);

  // 2. Generate content
  const posts = generateCampaignContent();
  console.log(`Generated ${posts.length} posts:`);
  console.log(`  X: ${posts.filter(p => p.platform === 'x').length} posts`);
  console.log(`  TikTok: ${posts.filter(p => p.platform === 'tiktok').length} posts\n`);

  // 3. Schedule
  const scheduled = schedulePosts(posts);
  console.log('Scheduled posts:');
  for (const post of scheduled) {
    console.log(`  [${post.platform.toUpperCase().padEnd(6)}] ${post.schedule.publishAt.toDateString()} ${post.schedule.timeSlot.padEnd(10)} ${post.format}`);
  }

  // 4. Simulate analytics
  campaign.posts = scheduled.map(post => ({
    ...post,
    status: 'published' as const,
    analytics: simulateAnalytics(post),
  }));

  // 5. Generate report
  const report = generateCampaignReport(campaign);
  console.log('\n=== Campaign Report ===');
  console.log(`Total impressions: ${report.crossPlatform.totalImpressions.toLocaleString()}`);
  console.log(`Avg engagement rate: ${(report.crossPlatform.avgEngagementRate * 100).toFixed(2)}%`);
  console.log(`Followers gained: ${report.crossPlatform.totalFollowersGained.toLocaleString()}`);
  console.log(`Best platform: ${report.crossPlatform.bestPerformingPlatform}`);

  console.log('\nKPI Progress:');
  for (const [key, val] of Object.entries(report.kpiProgress)) {
    console.log(`  ${key}: ${val.pct}% (${val.actual.toLocaleString()} / ${val.target.toLocaleString()})`);
  }

  return { campaign, report };
}

// Run if executed directly
runFlowAICampaign();
