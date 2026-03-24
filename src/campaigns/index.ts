/**
 * Social Media Campaign Module
 * Content creation, scheduling, and analytics for X and TikTok
 */

export * from './types';
export {
  generateXPost,
  generateTikTokScript,
  generateThread,
  adaptContent,
  generateHashtags,
} from './content-generator';
export type {
  GenerateXPostOptions,
  GenerateTikTokOptions,
  GenerateThreadOptions,
} from './content-generator';
export { PostScheduler } from './scheduler';
export type { SchedulerConfig } from './scheduler';
export {
  calcEngagementRate,
  analyzePlatform,
  generateCampaignReport,
  comparePlatforms,
} from './analytics';
export type { PlatformReport, CampaignReport } from './analytics';
export {
  scoreHashtag,
  recommendHashtags,
  analyzeHashtagPerformance,
  findCompetitorHashtags,
} from './hashtag-analyzer';
