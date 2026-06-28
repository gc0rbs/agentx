/**
 * X (Twitter) Client Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { XClient, createXClient, XAuthClient, REQUIRED_SCOPES } from '../../src/integrations/x';
import type { XConfig, Tweet, XUser } from '../../src/integrations/x';

describe('XClient', () => {
  const mockConfig: XConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
  };

  let client: XClient;

  beforeEach(() => {
    client = createXClient(mockConfig);
    vi.clearAllMocks();
  });

  describe('createXClient', () => {
    it('should create client instance', () => {
      expect(client).toBeInstanceOf(XClient);
    });

    it('should provide auth client', () => {
      const auth = client.getAuthClient();
      expect(auth).toBeInstanceOf(XAuthClient);
    });
  });

  describe('XAuthClient', () => {
    it('should generate PKCE challenge', () => {
      const auth = client.getAuthClient();
      const pkce = auth.generatePKCE();

      expect(pkce.codeVerifier).toBeDefined();
      expect(pkce.codeChallenge).toBeDefined();
      expect(pkce.state).toBeDefined();
      expect(pkce.codeVerifier.length).toBeGreaterThan(32);
    });

    it('should build authorization URL', () => {
      const auth = client.getAuthClient();
      const pkce = auth.generatePKCE();
      const redirectUri = 'http://localhost:3000/callback';

      const url = auth.getAuthorizationUrl(redirectUri, REQUIRED_SCOPES, pkce);

      expect(url).toContain('https://twitter.com/i/oauth2/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('code_challenge=');
      expect(url).toContain('state=');
    });

    it('should report authentication status', () => {
      const auth = client.getAuthClient();
      expect(auth.isAuthenticated()).toBe(true);
    });

    it('should return tokens', () => {
      const auth = client.getAuthClient();
      const tokens = auth.getTokens();

      expect(tokens).toBeDefined();
      expect(tokens?.accessToken).toBe('test-access-token');
      expect(tokens?.refreshToken).toBe('test-refresh-token');
    });
  });

  describe('Tweet Operations', () => {
    it('should have createTweet method', () => {
      expect(typeof client.createTweet).toBe('function');
    });

    it('should have createThread method', () => {
      expect(typeof client.createThread).toBe('function');
    });

    it('should have deleteTweet method', () => {
      expect(typeof client.deleteTweet).toBe('function');
    });

    it('should have getTweet method', () => {
      expect(typeof client.getTweet).toBe('function');
    });
  });

  describe('Media Operations', () => {
    it('should have uploadMedia method', () => {
      expect(typeof client.uploadMedia).toBe('function');
    });
  });

  describe('Analytics Operations', () => {
    it('should have getTweetMetrics method', () => {
      expect(typeof client.getTweetMetrics).toBe('function');
    });

    it('should have getBatchTweetMetrics method', () => {
      expect(typeof client.getBatchTweetMetrics).toBe('function');
    });
  });

  describe('Engagement Operations', () => {
    it('should have likeTweet method', () => {
      expect(typeof client.likeTweet).toBe('function');
    });

    it('should have retweet method', () => {
      expect(typeof client.retweet).toBe('function');
    });

    it('should have getMentions method', () => {
      expect(typeof client.getMentions).toBe('function');
    });
  });

  describe('Search Operations', () => {
    it('should have searchTweets method', () => {
      expect(typeof client.searchTweets).toBe('function');
    });

    it('should have getTrends method', () => {
      expect(typeof client.getTrends).toBe('function');
    });
  });

  describe('Rate Limiting', () => {
    it('should have getRateLimit method', () => {
      expect(typeof client.getRateLimit).toBe('function');
    });

    it('should return undefined for unknown endpoints', () => {
      const limit = client.getRateLimit('/unknown/endpoint');
      expect(limit).toBeUndefined();
    });
  });
});

describe('REQUIRED_SCOPES', () => {
  it('should include essential scopes', () => {
    expect(REQUIRED_SCOPES).toContain('tweet.read');
    expect(REQUIRED_SCOPES).toContain('tweet.write');
    expect(REQUIRED_SCOPES).toContain('users.read');
    expect(REQUIRED_SCOPES).toContain('offline.access');
  });
});
