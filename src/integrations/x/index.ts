/**
 * X (Twitter) Integration Exports
 */

// API Client
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

// Browser Automation
export { XBrowserClient, createXBrowserClient } from './browser';
export type {
  XBrowserConfig,
  XCredentials,
  PostResult,
  ThreadResult,
  TweetData,
  UIAnalytics,
} from './browser';
