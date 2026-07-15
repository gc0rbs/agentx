/**
 * X Browser Automation Types
 */

export interface XBrowserConfig {
  headless?: boolean;
  userDataDir?: string;
  slowMo?: number;
  timeout?: number;
}

export interface XCredentials {
  username: string;
  password: string;
  email?: string;
  twoFactorSecret?: string;
}

export interface PostResult {
  success: boolean;
  tweetUrl?: string;
  tweetId?: string;
  error?: string;
}

export interface ThreadResult {
  success: boolean;
  tweets: PostResult[];
  threadUrl?: string;
  error?: string;
}

export interface MediaUploadResult {
  success: boolean;
  error?: string;
}

export interface TweetData {
  text: string;
  mediaPath?: string;
  mediaUrls?: string[];
}

export interface Mention {
  tweetId: string;
  tweetUrl: string;
  author: string;
  text: string;
}

export interface UIAnalytics {
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  bookmarks: number;
}
