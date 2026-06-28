/**
 * X (Twitter) Integration Exports
 */

export { XClient, createXClient } from './x-client';
export { XAuthClient, REQUIRED_SCOPES, OPTIONAL_SCOPES } from './x-auth';
export type {
  XConfig,
  XUser,
  Tweet,
  TweetMetrics,
  Media,
  Poll,
  PollOption,
  CreateTweetParams,
  CreateThreadParams,
  UploadMediaParams,
  TweetAnalytics,
  UserAnalytics,
  RateLimitInfo,
  XApiResponse,
  XApiError,
  OAuthTokens,
} from './x-types';
