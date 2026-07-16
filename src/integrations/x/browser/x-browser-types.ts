/**
 * X Browser Automation Types
 */

export interface XBrowserConfig {
  headless?: boolean;
  userDataDir?: string;
  slowMo?: number;
  timeout?: number;
  /** Override the Chromium binary (e.g. a pre-installed browser). Falls back to
   *  PLAYWRIGHT_CHROMIUM_PATH env, then Playwright's bundled browser. */
  executablePath?: string;
  /** Route browser traffic through a proxy (e.g. a residential proxy for a
   *  residential exit IP). Falls back to the PROXY_URL env
   *  (http://user:pass@host:port). */
  proxy?: { server: string; username?: string; password?: string };
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
