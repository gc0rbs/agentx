/**
 * Social Media Campaign Types
 * Specialized for organic content on X (Twitter) and TikTok
 */

// Platforms for social content (distinct from paid ad platforms)
export type SocialPlatform = 'x' | 'tiktok';

export type ContentFormat =
  | 'text'         // X text post
  | 'image'        // X image post
  | 'video'        // Both platforms
  | 'thread'       // X thread
  | 'poll'         // X poll
  | 'carousel'     // TikTok photo carousel
  | 'duet'         // TikTok duet
  | 'stitch';      // TikTok stitch

export type CampaignPhase = 'teaser' | 'launch' | 'social_proof' | 'sustain';

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  format: ContentFormat;
  content: PostContent;
  hashtags: string[];
  schedule: PostSchedule;
  status: PostStatus;
  analytics?: PostAnalytics;
  metadata?: Record<string, unknown>;
}

export interface PostContent {
  text: string;
  hook?: string;              // First line / first 3 seconds
  body?: string;              // Main content
  cta?: string;               // Call to action
  mediaUrls?: string[];       // Attached media
  soundId?: string;           // TikTok sound
  duration?: number;          // Video duration in seconds
  threadParts?: string[];     // For X threads
  pollOptions?: string[];     // For X polls
  pollDuration?: number;      // Poll duration in hours (1-168)
}

export interface PostSchedule {
  publishAt: Date;
  timezone: string;
  phase: CampaignPhase;
  dayOfWeek: number;          // 0=Sun, 6=Sat
  timeSlot: 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
}

export interface PostAnalytics {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;             // Retweets on X, shares on TikTok
  saves: number;
  clicks: number;
  profileVisits: number;
  followers: number;          // Followers gained
  engagementRate: number;     // (likes+comments+shares) / impressions
  videoViews?: number;
  avgWatchTime?: number;      // Seconds
  completionRate?: number;    // % who watched to end
}

export interface SocialCampaign {
  id: string;
  name: string;
  description: string;
  platforms: SocialPlatform[];
  phases: CampaignPhaseConfig[];
  targetAudience: SocialAudience;
  contentPillars: string[];
  kpis: CampaignKPIs;
  posts: SocialPost[];
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'paused' | 'completed';
}

export interface CampaignPhaseConfig {
  phase: CampaignPhase;
  startDay: number;           // Day offset from campaign start
  endDay: number;
  postsPerDay: Record<SocialPlatform, number>;
  focus: string;
}

export interface SocialAudience {
  demographics: {
    ageRange: [number, number];
    interests: string[];
    locations: string[];
  };
  psychographics: {
    painPoints: string[];
    aspirations: string[];
    contentPreferences: ContentFormat[];
  };
}

export interface CampaignKPIs {
  targetImpressions: number;
  targetEngagementRate: number;
  targetFollowerGrowth: number;
  targetClicks: number;
  targetVideoViews?: number;
}

export interface HashtagSet {
  primary: string[];          // Brand/campaign tags (1-2)
  trending: string[];         // Currently trending (2-3)
  niche: string[];            // Community/niche tags (3-5)
  discovery: string[];        // Broad discovery tags (1-2)
}

export interface HashtagScore {
  tag: string;
  volume: number;             // Posts using this tag
  competition: number;        // 0-1 scale
  relevance: number;          // 0-1 scale
  trendVelocity: number;      // Growth rate
  score: number;              // Composite score
}

export interface TikTokScript {
  hook: string;               // First 1-3 seconds
  body: string;               // Main content
  cta: string;                // Call to action
  duration: number;           // Target duration in seconds
  soundSuggestion?: string;
  textOverlays: string[];
  transitions: string[];
}

export interface ContentAdaptation {
  originalPlatform: SocialPlatform;
  targetPlatform: SocialPlatform;
  originalContent: PostContent;
  adaptedContent: PostContent;
  changes: string[];
}
