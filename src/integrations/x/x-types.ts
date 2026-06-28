/**
 * X (Twitter) API v2 Types
 */

export interface XConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  bearerToken?: string;
}

export interface XUser {
  id: string;
  name: string;
  username: string;
  description?: string;
  profileImageUrl?: string;
  publicMetrics?: {
    followersCount: number;
    followingCount: number;
    tweetCount: number;
    listedCount: number;
  };
}

export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  createdAt: string;
  conversationId?: string;
  inReplyToUserId?: string;
  attachments?: TweetAttachments;
  publicMetrics?: TweetMetrics;
  poll?: Poll;
}

export interface TweetAttachments {
  mediaKeys?: string[];
  pollIds?: string[];
}

export interface TweetMetrics {
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  bookmarkCount: number;
  impressionCount: number;
}

export interface Poll {
  id: string;
  options: PollOption[];
  durationMinutes: number;
  endDatetime: string;
  votingStatus: 'open' | 'closed';
}

export interface PollOption {
  position: number;
  label: string;
  votes: number;
}

export interface Media {
  mediaId: string;
  type: 'photo' | 'video' | 'animated_gif';
  url?: string;
  previewImageUrl?: string;
}

export interface CreateTweetParams {
  text: string;
  mediaIds?: string[];
  pollOptions?: string[];
  pollDurationMinutes?: number;
  replyToTweetId?: string;
  quoteTweetId?: string;
}

export interface CreateThreadParams {
  tweets: string[];
  mediaIds?: string[][];
}

export interface UploadMediaParams {
  mediaData: Buffer | string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'video/mp4';
  mediaCategory?: 'tweet_image' | 'tweet_video' | 'tweet_gif';
}

export interface TweetAnalytics {
  tweetId: string;
  impressions: number;
  engagements: number;
  engagementRate: number;
  retweets: number;
  replies: number;
  likes: number;
  quotes: number;
  profileClicks: number;
  urlClicks: number;
  hashtagClicks: number;
  detailExpands: number;
  mediaViews: number;
  mediaEngagements: number;
}

export interface UserAnalytics {
  followersCount: number;
  followersGained: number;
  followersLost: number;
  impressions: number;
  profileVisits: number;
  mentions: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

export interface XApiResponse<T> {
  data: T;
  includes?: {
    users?: XUser[];
    tweets?: Tweet[];
    media?: Media[];
    polls?: Poll[];
  };
  meta?: {
    resultCount?: number;
    nextToken?: string;
    previousToken?: string;
  };
  errors?: XApiError[];
}

export interface XApiError {
  type: string;
  title: string;
  detail: string;
  status?: number;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
}
