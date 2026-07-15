/**
 * X Browser Automation Client
 * Uses Playwright to automate X.com directly
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { createLogger } from '../../../core/logger';
import type {
  XBrowserConfig,
  XCredentials,
  PostResult,
  ThreadResult,
  TweetData,
  UIAnalytics,
  Mention,
} from './x-browser-types';

const logger = createLogger('x-browser');

const X_URL = 'https://x.com';
const LOGIN_URL = 'https://x.com/i/flow/login';
const COMPOSE_URL = 'https://x.com/compose/tweet';

export class XBrowserClient {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: XBrowserConfig;
  private isLoggedIn = false;

  constructor(config: XBrowserConfig = {}) {
    this.config = {
      headless: true,
      timeout: 30000,
      slowMo: 50,
      ...config,
    };
  }

  /**
   * Initialize browser
   */
  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo,
    });

    const contextOptions: Record<string, unknown> = {
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (this.config.userDataDir) {
      const statePath = `${this.config.userDataDir}/state.json`;
      // Only load storage state if the file exists
      if (existsSync(statePath)) {
        contextOptions.storageState = statePath;
      } else {
        // Create the directory for future session saves
        mkdirSync(this.config.userDataDir, { recursive: true });
      }
    }

    this.context = await this.browser.newContext(contextOptions);
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.timeout || 30000);

    logger.info('Browser initialized');
  }

  /**
   * Login to X
   */
  async login(credentials: XCredentials): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      await this.page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(2000);

      // Enter username
      const usernameInput = this.page.locator('input[autocomplete="username"]');
      await usernameInput.waitFor({ state: 'visible' });
      await usernameInput.fill(credentials.username);
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(1500);

      // Check for email verification step
      const emailInput = this.page.locator('input[data-testid="ocfEnterTextTextInput"]');
      if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        if (!credentials.email) {
          throw new Error('Email verification required but not provided');
        }
        await emailInput.fill(credentials.email);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(1500);
      }

      // Enter password
      const passwordInput = this.page.locator('input[type="password"]');
      await passwordInput.waitFor({ state: 'visible' });
      await passwordInput.fill(credentials.password);
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(3000);

      // Check if logged in
      const homeLink = this.page.locator('a[data-testid="AppTabBar_Home_Link"]');
      this.isLoggedIn = await homeLink.isVisible({ timeout: 10000 }).catch(() => false);

      if (this.isLoggedIn) {
        logger.info('Login successful');
        await this.saveSession();
      } else {
        logger.error('Login failed - home link not found');
      }

      return this.isLoggedIn;
    } catch (error) {
      logger.error('Login error', error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Authenticate by injecting an X auth_token session cookie.
   * Avoids the username/password + 2FA flow entirely.
   *
   * The token is never persisted by this method — pass it from an env var.
   * X's frontend derives the ct0 (CSRF) cookie itself once the session loads.
   */
  async loginWithCookie(authToken: string): Promise<boolean> {
    if (!this.context || !this.page) throw new Error('Browser not initialized');

    try {
      await this.context.addCookies([
        {
          name: 'auth_token',
          value: authToken,
          domain: '.x.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'None',
        },
        {
          name: 'auth_token',
          value: authToken,
          domain: '.twitter.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'None',
        },
      ]);

      const ok = await this.checkSession();
      if (ok) {
        logger.info('Authenticated via auth_token cookie');
        await this.saveSession();
      } else {
        logger.error('auth_token cookie did not produce a logged-in session');
      }
      return ok;
    } catch (error) {
      logger.error('Cookie auth failed', error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Check if already logged in (from saved session)
   */
  async checkSession(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      await this.page.goto(X_URL, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(2000);

      const homeLink = this.page.locator('a[data-testid="AppTabBar_Home_Link"]');
      this.isLoggedIn = await homeLink.isVisible({ timeout: 5000 }).catch(() => false);

      logger.info('Session check', { isLoggedIn: this.isLoggedIn });
      return this.isLoggedIn;
    } catch {
      return false;
    }
  }

  /**
   * Save session state
   */
  private async saveSession(): Promise<void> {
    if (!this.context || !this.config.userDataDir) return;

    try {
      await this.context.storageState({
        path: `${this.config.userDataDir}/state.json`,
      });
      logger.info('Session saved');
    } catch (error) {
      logger.warn('Failed to save session', { error });
    }
  }

  /**
   * Post a tweet
   */
  async postTweet(text: string, mediaPath?: string): Promise<PostResult> {
    if (!this.page) throw new Error('Browser not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    try {
      await this.page.goto(COMPOSE_URL, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(1500);

      // Find tweet compose box
      const tweetBox = this.page.locator('[data-testid="tweetTextarea_0"]');
      await tweetBox.waitFor({ state: 'visible' });
      await tweetBox.click();
      await this.page.keyboard.type(text, { delay: 20 });

      // Upload media if provided
      if (mediaPath) {
        const fileInput = this.page.locator('input[data-testid="fileInput"]');
        await fileInput.setInputFiles(mediaPath);
        await this.page.waitForTimeout(3000);
      }

      // Click post button
      const postButton = this.page.locator('[data-testid="tweetButton"]');
      await postButton.waitFor({ state: 'visible' });
      await postButton.click();

      // Wait for post to complete
      await this.page.waitForTimeout(3000);

      // Try to get the tweet URL from redirect or notification
      const currentUrl = this.page.url();
      const tweetMatch = currentUrl.match(/status\/(\d+)/);

      const result: PostResult = {
        success: true,
        tweetId: tweetMatch?.[1],
        tweetUrl: tweetMatch ? currentUrl : undefined,
      };

      logger.info('Tweet posted', { ...result });
      return result;
    } catch (error) {
      logger.error('Failed to post tweet', error instanceof Error ? error : undefined);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Post a thread
   */
  async postThread(tweets: TweetData[]): Promise<ThreadResult> {
    if (!this.page) throw new Error('Browser not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    const results: PostResult[] = [];

    try {
      await this.page.goto(COMPOSE_URL, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(1500);

      for (let i = 0; i < tweets.length; i++) {
        const tweet = tweets[i];
        const tweetBox = this.page.locator(`[data-testid="tweetTextarea_${i}"]`);
        await tweetBox.waitFor({ state: 'visible' });
        await tweetBox.click();
        await this.page.keyboard.type(tweet.text, { delay: 20 });

        if (tweet.mediaPath) {
          const fileInput = this.page.locator('input[data-testid="fileInput"]').last();
          await fileInput.setInputFiles(tweet.mediaPath);
          await this.page.waitForTimeout(2000);
        }

        // Add another tweet to thread (except for last one)
        if (i < tweets.length - 1) {
          const addButton = this.page.locator('[data-testid="addButton"]');
          await addButton.click();
          await this.page.waitForTimeout(500);
        }

        results.push({ success: true });
      }

      // Post the thread
      const postAllButton = this.page.locator('[data-testid="tweetButton"]');
      await postAllButton.click();
      await this.page.waitForTimeout(3000);

      const currentUrl = this.page.url();
      const tweetMatch = currentUrl.match(/status\/(\d+)/);

      logger.info('Thread posted', { tweetCount: tweets.length });

      return {
        success: true,
        tweets: results,
        threadUrl: tweetMatch ? currentUrl : undefined,
      };
    } catch (error) {
      logger.error('Failed to post thread', error instanceof Error ? error : undefined);
      return {
        success: false,
        tweets: results,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get analytics for a tweet from UI
   */
  async getTweetAnalytics(tweetUrl: string): Promise<UIAnalytics | null> {
    if (!this.page) throw new Error('Browser not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    try {
      await this.page.goto(tweetUrl, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(2000);

      const parseMetric = async (testId: string): Promise<number> => {
        const element = this.page!.locator(`[data-testid="${testId}"]`);
        const text = await element.textContent().catch(() => '0');
        return this.parseCount(text || '0');
      };

      const analytics: UIAnalytics = {
        likes: await parseMetric('like'),
        retweets: await parseMetric('retweet'),
        replies: await parseMetric('reply'),
        bookmarks: await parseMetric('bookmark'),
        views: 0,
      };

      // Views are displayed differently
      const viewsText = await this.page
        .locator('a[href$="/analytics"]')
        .textContent()
        .catch(() => '0');
      analytics.views = this.parseCount(viewsText || '0');

      logger.info('Analytics fetched', { ...analytics });
      return analytics;
    } catch (error) {
      logger.error('Failed to get analytics', error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Parse count strings like "1.2K", "5M" to numbers
   */
  private parseCount(text: string): number {
    const cleaned = text.replace(/[^0-9.KMB]/gi, '').trim();
    if (!cleaned) return 0;

    const multipliers: Record<string, number> = {
      K: 1000,
      M: 1000000,
      B: 1000000000,
    };

    const match = cleaned.match(/^([\d.]+)([KMB])?$/i);
    if (!match) return parseInt(cleaned) || 0;

    const num = parseFloat(match[1]);
    const suffix = match[2]?.toUpperCase();
    return Math.round(num * (multipliers[suffix] || 1));
  }

  /**
   * Like a tweet
   */
  async likeTweet(tweetUrl: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    try {
      await this.page.goto(tweetUrl, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(1500);

      const likeButton = this.page.locator('[data-testid="like"]');
      await likeButton.click();
      await this.page.waitForTimeout(1000);

      logger.info('Tweet liked', { tweetUrl });
      return true;
    } catch (error) {
      logger.error('Failed to like tweet', error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Retweet a tweet
   */
  async retweet(tweetUrl: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    try {
      await this.page.goto(tweetUrl, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(1500);

      const retweetButton = this.page.locator('[data-testid="retweet"]');
      await retweetButton.click();
      await this.page.waitForTimeout(500);

      // Click "Repost" in the menu
      const repostOption = this.page.locator('[data-testid="retweetConfirm"]');
      await repostOption.click();
      await this.page.waitForTimeout(1000);

      logger.info('Tweet retweeted', { tweetUrl });
      return true;
    } catch (error) {
      logger.error('Failed to retweet', error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Reply to a tweet
   */
  async replyToTweet(tweetUrl: string, text: string): Promise<PostResult> {
    if (!this.page) throw new Error('Browser not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    try {
      await this.page.goto(tweetUrl, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(1500);

      // The inline reply box on the tweet detail page
      const replyBox = this.page.locator('[data-testid="tweetTextarea_0"]');
      await replyBox.waitFor({ state: 'visible' });
      await replyBox.click();
      await this.page.keyboard.type(text, { delay: 20 });

      const replyButton = this.page.locator('[data-testid="tweetButton"]');
      await replyButton.waitFor({ state: 'visible' });
      await replyButton.click();
      await this.page.waitForTimeout(2500);

      logger.info('Reply posted', { tweetUrl });
      return { success: true };
    } catch (error) {
      logger.error('Failed to reply', error instanceof Error ? error : undefined);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Scrape recent mentions from the notifications page
   */
  async getMentions(limit = 20): Promise<Mention[]> {
    if (!this.page) throw new Error('Browser not initialized');
    if (!this.isLoggedIn) throw new Error('Not logged in');

    try {
      await this.page.goto('https://x.com/notifications/mentions', {
        waitUntil: 'networkidle',
      });
      await this.page.waitForTimeout(2500);

      const articles = this.page.locator('article[data-testid="tweet"]');
      const count = Math.min(await articles.count(), limit);
      const mentions: Mention[] = [];

      for (let i = 0; i < count; i++) {
        const article = articles.nth(i);

        const text = await article
          .locator('[data-testid="tweetText"]')
          .first()
          .textContent()
          .catch(() => null);
        if (!text) continue;

        // Tweet permalink: the <a> wrapping the timestamp
        const href = await article
          .locator('a:has(time)')
          .first()
          .getAttribute('href')
          .catch(() => null);
        if (!href) continue;

        const idMatch = href.match(/status\/(\d+)/);
        const authorMatch = href.match(/^\/([^/]+)\/status/);

        mentions.push({
          tweetId: idMatch?.[1] ?? href,
          tweetUrl: `https://x.com${href}`,
          author: authorMatch?.[1] ?? 'unknown',
          text: text.trim(),
        });
      }

      logger.info('Mentions scraped', { count: mentions.length });
      return mentions;
    } catch (error) {
      logger.error('Failed to fetch mentions', error instanceof Error ? error : undefined);
      return [];
    }
  }

  /**
   * Take screenshot (for debugging)
   */
  async screenshot(path: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.screenshot({ path, fullPage: true });
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.config.userDataDir) {
      await this.saveSession();
    }
    await this.browser?.close();
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isLoggedIn = false;
    logger.info('Browser closed');
  }
}

/**
 * Create browser client instance
 */
export function createXBrowserClient(config?: XBrowserConfig): XBrowserClient {
  return new XBrowserClient(config);
}
