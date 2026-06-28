/**
 * X (Twitter) OAuth 2.0 Authentication
 * Handles PKCE flow for user authentication
 */

import crypto from 'crypto';
import { createLogger } from '../../core/logger';
import type { OAuthTokens, XConfig } from './x-types';

const logger = createLogger('x-auth');

const X_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const X_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

export class XAuthClient {
  private readonly config: XConfig;
  private tokens: OAuthTokens | null = null;

  constructor(config: XConfig) {
    this.config = config;
    if (config.accessToken && config.refreshToken) {
      this.tokens = {
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        expiresAt: new Date(Date.now() + 7200000), // Assume 2hr validity
        scope: [],
      };
    }
  }

  /**
   * Generate PKCE challenge for OAuth flow
   */
  generatePKCE(): PKCEChallenge {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    const state = crypto.randomBytes(16).toString('hex');

    return { codeVerifier, codeChallenge, state };
  }

  /**
   * Get authorization URL for user to grant access
   */
  getAuthorizationUrl(
    redirectUri: string,
    scopes: string[],
    pkce: PKCEChallenge
  ): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      state: pkce.state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${X_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(
    code: string,
    redirectUri: string,
    codeVerifier: string
  ): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      client_id: this.config.clientId,
    });

    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64');

    const response = await fetch(X_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Token exchange failed', { status: response.status, error });
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope.split(' '),
    };

    logger.info('OAuth tokens obtained', { scopes: this.tokens.scope });
    return this.tokens;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<OAuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.tokens.refreshToken,
      client_id: this.config.clientId,
    });

    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64');

    const response = await fetch(X_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Token refresh failed', { status: response.status, error });
      throw new Error(`Token refresh failed: ${error}`);
    }

    const data = await response.json();
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope.split(' '),
    };

    logger.info('Access token refreshed');
    return this.tokens;
  }

  /**
   * Get valid access token, refreshing if needed
   */
  async getAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('Not authenticated - call exchangeCode first');
    }

    // Refresh if token expires in less than 5 minutes
    if (this.tokens.expiresAt.getTime() - Date.now() < 300000) {
      await this.refreshAccessToken();
    }

    return this.tokens.accessToken;
  }

  /**
   * Get bearer token for app-only authentication
   */
  getBearerToken(): string | undefined {
    return this.config.bearerToken;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.tokens !== null;
  }

  /**
   * Get current tokens
   */
  getTokens(): OAuthTokens | null {
    return this.tokens;
  }

  /**
   * Set tokens (for restoring from storage)
   */
  setTokens(tokens: OAuthTokens): void {
    this.tokens = tokens;
  }
}

/**
 * Required OAuth scopes for full functionality
 */
export const REQUIRED_SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'offline.access',
];

export const OPTIONAL_SCOPES = [
  'tweet.moderate.write',
  'follows.read',
  'follows.write',
  'like.read',
  'like.write',
  'list.read',
  'list.write',
  'block.read',
  'block.write',
  'bookmark.read',
  'bookmark.write',
  'space.read',
];
