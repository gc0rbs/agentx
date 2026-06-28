/**
 * X (Twitter) API v2 Client
 * Full integration for posting, analytics, and engagement
 */

import { createLogger } from '../../core/logger';
import { XAuthClient } from './x-auth';
import type {
  XConfig,
  XUser,
  Tweet,
  TweetMetrics,
  Media,
  CreateTweetParams,
  CreateThreadParams,
  UploadMediaParams,
  TweetAnalytics,
  XApiResponse,
  RateLimitInfo,
} from './x-types';

const logger = createLogger('x-client');

const X_API_BASE = 'https://api.twitter.com/2';
const X_UPLOAD_BASE = 'https://upload.twitter.com/1.1';

export class XClient {
  private readonly auth: XAuthClient;
  private rateLimits: Map<string, RateLimitInfo> = new Map();

  constructor(config: XConfig) {
    this.auth = new XAuthClient(config);
  }

  /**
   * Get auth client for OAuth flow
   */
  getAuthClient(): XAuthClient {
    return this.auth;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useBearer = false
  ): Promise<XApiResponse<T>> {
    const token = useBearer
      ? this.auth.getBearerToken()
      : await this.auth.getAccessToken();

    if (!token) {
      throw new Error('No authentication token available');
    }

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${X_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Track rate limits
    this.updateRateLimits(endpoint, response.headers);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      logger.error('API request failed', {
        endpoint,
        status: response.status,
        error,
      });
      throw new Error(`X API error: ${error.detail || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update rate limit tracking
   */
  private updateRateLimits(endpoint: string, headers: Headers): void {
    const limit = headers.get('x-rate-limit-limit');
    const remaining = headers.get('x-rate-limit-remaining');
    const reset = headers.get('x-rate-limit-reset');

    if (limit && remaining && reset) {
      this.rateLimits.set(endpoint, {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: new Date(parseInt(reset) * 1000),
      });
    }
  }

  /**
   * Get rate limit info for endpoint
   */
  getRateLimit(endpoint: string): RateLimitInfo | undefined {
    return this.rateLimits.get(endpoint);
  }

  // ==================== User Operations ====================

  /**
   * Get authenticated user's profile
   */
  async getMe(): Promise<XUser> {
    const response = await this.request<XUser>('/users/me', {
      method: 'GET',
    });
    return response.data;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<XUser> {
    const response = await this.request<XUser>(
      `/users/by/username/${username}?user.fields=public_metrics,description,profile_image_url`
    );
    return response.data;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<XUser> {
    const response = await this.request<XUser>(
      `/users/${userId}?user.fields=public_metrics,description,profile_image_url`
    );
    return response.data;
  }

  // ==================== Tweet Operations ====================

  /**
   * Create a new tweet
   */
  async createTweet(params: CreateTweetParams): Promise<Tweet> {
    const body: Record<string, unknown> = { text: params.text };

    if (params.mediaIds?.length) {
      body.media = { media_ids: params.mediaIds };
    }

    if (params.pollOptions?.length) {
      body.poll = {
        options: params.pollOptions,
        duration_minutes: params.pollDurationMinutes || 1440,
      };
    }

    if (params.replyToTweetId) {
      body.reply = { in_reply_to_tweet_id: params.replyToTweetId };
    }

    if (params.quoteTweetId) {
      body.quote_tweet_id = params.quoteTweetId;
    }

    const response = await this.request<Tweet>('/tweets', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    logger.info('Tweet created', { tweetId: response.data.id });
    return response.data;
  }

  /**
   * Create a thread (multiple connected tweets)
   */
  async createThread(params: CreateThreadParams): Promise<Tweet[]> {
    const tweets: Tweet[] = [];
    let previousTweetId: string | undefined;

    for (let i = 0; i < params.tweets.length; i++) {
      const tweet = await this.createTweet({
        text: params.tweets[i],
        mediaIds: params.mediaIds?.[i],
        replyToTweetId: previousTweetId,
      });
      tweets.push(tweet);
      previousTweetId = tweet.id;
    }

    logger.info('Thread created', {
      tweetCount: tweets.length,
      firstTweetId: tweets[0].id,
    });
    return tweets;
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(tweetId: string): Promise<void> {
    await this.request(`/tweets/${tweetId}`, { method: 'DELETE' });
    logger.info('Tweet deleted', { tweetId });
  }

  /**
   * Get tweet by ID with metrics
   */
  async getTweet(tweetId: string): Promise<Tweet> {
    const response = await this.request<Tweet>(
      `/tweets/${tweetId}?tweet.fields=public_metrics,created_at,attachments&expansions=attachments.media_keys`
    );
    return response.data;
  }

  /**
   * Get user's recent tweets
   */
  async getUserTweets(
    userId: string,
    maxResults = 10
  ): Promise<Tweet[]> {
    const response = await this.request<Tweet[]>(
      `/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=public_metrics,created_at`
    );
    return response.data;
  }

  // ==================== Media Operations ====================

  /**
   * Upload media (image/video/gif)
   * Uses v1.1 upload endpoint
   */
  async uploadMedia(params: UploadMediaParams): Promise<string> {
    const token = await this.auth.getAccessToken();

    // For images, use simple upload
    if (params.mediaType.startsWith('image/')) {
      return this.uploadImage(params.mediaData, token);
    }

    // For video/gif, use chunked upload
    return this.uploadChunked(params, token);
  }

  private async uploadImage(data: Buffer | string, token: string): Promise<string> {
    const base64 = Buffer.isBuffer(data) ? data.toString('base64') : data;

    const formData = new URLSearchParams();
    formData.append('media_data', base64);

    const response = await fetch(`${X_UPLOAD_BASE}/media/upload.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`Media upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    logger.info('Media uploaded', { mediaId: result.media_id_string });
    return result.media_id_string;
  }

  private async uploadChunked(
    params: UploadMediaParams,
    token: string
  ): Promise<string> {
    const data = Buffer.isBuffer(params.mediaData)
      ? params.mediaData
      : Buffer.from(params.mediaData, 'base64');

    // INIT
    const initParams = new URLSearchParams({
      command: 'INIT',
      total_bytes: data.length.toString(),
      media_type: params.mediaType,
      media_category: params.mediaCategory || 'tweet_video',
    });

    const initResponse = await fetch(
      `${X_UPLOAD_BASE}/media/upload.json?${initParams.toString()}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!initResponse.ok) {
      throw new Error(`Media init failed: ${initResponse.statusText}`);
    }

    const { media_id_string: mediaId } = await initResponse.json();

    // APPEND (chunk by 5MB)
    const chunkSize = 5 * 1024 * 1024;
    let segmentIndex = 0;

    for (let offset = 0; offset < data.length; offset += chunkSize) {
      const chunk = data.subarray(offset, offset + chunkSize);
      const formData = new FormData();
      formData.append('command', 'APPEND');
      formData.append('media_id', mediaId);
      formData.append('segment_index', segmentIndex.toString());
      formData.append('media', new Blob([chunk]));

      await fetch(`${X_UPLOAD_BASE}/media/upload.json`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      segmentIndex++;
    }

    // FINALIZE
    const finalizeParams = new URLSearchParams({
      command: 'FINALIZE',
      media_id: mediaId,
    });

    const finalizeResponse = await fetch(
      `${X_UPLOAD_BASE}/media/upload.json?${finalizeParams.toString()}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!finalizeResponse.ok) {
      throw new Error(`Media finalize failed: ${finalizeResponse.statusText}`);
    }

    const result = await finalizeResponse.json();

    // Check processing status for video
    if (result.processing_info) {
      await this.waitForProcessing(mediaId, token);
    }

    logger.info('Video uploaded', { mediaId });
    return mediaId;
  }

  private async waitForProcessing(mediaId: string, token: string): Promise<void> {
    const maxWait = 120000; // 2 minutes
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      const params = new URLSearchParams({
        command: 'STATUS',
        media_id: mediaId,
      });

      const response = await fetch(
        `${X_UPLOAD_BASE}/media/upload.json?${params.toString()}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result = await response.json();

      if (!result.processing_info) {
        return; // Done
      }

      if (result.processing_info.state === 'failed') {
        throw new Error(`Media processing failed: ${result.processing_info.error?.message}`);
      }

      if (result.processing_info.state === 'succeeded') {
        return;
      }

      // Wait before checking again
      await new Promise((r) => setTimeout(r, result.processing_info.check_after_secs * 1000));
    }

    throw new Error('Media processing timed out');
  }

  // ==================== Analytics Operations ====================

  /**
   * Get tweet metrics
   */
  async getTweetMetrics(tweetId: string): Promise<TweetMetrics> {
    const tweet = await this.getTweet(tweetId);
    if (!tweet.publicMetrics) {
      throw new Error('Metrics not available for this tweet');
    }
    return tweet.publicMetrics;
  }

  /**
   * Get metrics for multiple tweets
   */
  async getBatchTweetMetrics(tweetIds: string[]): Promise<Map<string, TweetMetrics>> {
    const response = await this.request<Tweet[]>(
      `/tweets?ids=${tweetIds.join(',')}&tweet.fields=public_metrics`
    );

    const metrics = new Map<string, TweetMetrics>();
    for (const tweet of response.data) {
      if (tweet.publicMetrics) {
        metrics.set(tweet.id, tweet.publicMetrics);
      }
    }
    return metrics;
  }

  // ==================== Engagement Operations ====================

  /**
   * Like a tweet
   */
  async likeTweet(tweetId: string): Promise<void> {
    const me = await this.getMe();
    await this.request(`/users/${me.id}/likes`, {
      method: 'POST',
      body: JSON.stringify({ tweet_id: tweetId }),
    });
  }

  /**
   * Retweet a tweet
   */
  async retweet(tweetId: string): Promise<void> {
    const me = await this.getMe();
    await this.request(`/users/${me.id}/retweets`, {
      method: 'POST',
      body: JSON.stringify({ tweet_id: tweetId }),
    });
  }

  /**
   * Get mentions timeline
   */
  async getMentions(maxResults = 10): Promise<Tweet[]> {
    const me = await this.getMe();
    const response = await this.request<Tweet[]>(
      `/users/${me.id}/mentions?max_results=${maxResults}&tweet.fields=public_metrics,created_at,author_id`
    );
    return response.data;
  }

  // ==================== Search Operations ====================

  /**
   * Search recent tweets
   */
  async searchTweets(query: string, maxResults = 10): Promise<Tweet[]> {
    const response = await this.request<Tweet[]>(
      `/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}&tweet.fields=public_metrics,created_at,author_id`,
      {},
      true // Use bearer token for search
    );
    return response.data;
  }

  /**
   * Get trending topics for a location
   */
  async getTrends(woeid = 1): Promise<{ name: string; tweetVolume: number | null }[]> {
    // Note: Trends endpoint requires v1.1 API
    const token = this.auth.getBearerToken();
    if (!token) {
      throw new Error('Bearer token required for trends');
    }

    const response = await fetch(
      `https://api.twitter.com/1.1/trends/place.json?id=${woeid}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Trends request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data[0]?.trends || [];
  }
}

/**
 * Create X client instance
 */
export function createXClient(config: XConfig): XClient {
  return new XClient(config);
}
