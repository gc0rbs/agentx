/**
 * Example: Post a single tweet using browser automation.
 *
 * Usage:
 *   npx tsx examples/x-automation/post-tweet.ts "Your tweet text here"
 *
 * Auth (in priority order):
 *   X_AUTH_TOKEN - X session cookie (preferred; skips password + 2FA)
 *   X_USERNAME / X_PASSWORD / X_EMAIL - password login fallback
 *
 * The session is saved to ./data/x-session so re-runs skip auth.
 */

import { createXBrowserClient } from '../../src/integrations/x';

async function main() {
  const text = process.argv[2];
  if (!text) {
    console.error('Usage: npx tsx examples/x-automation/post-tweet.ts "Your tweet"');
    process.exit(1);
  }

  const authToken = process.env.X_AUTH_TOKEN;
  const username = process.env.X_USERNAME;
  const password = process.env.X_PASSWORD;

  if (!authToken && (!username || !password)) {
    console.error('Set X_AUTH_TOKEN, or X_USERNAME + X_PASSWORD');
    process.exit(1);
  }

  const client = createXBrowserClient({
    headless: false, // Set to true for background operation
    userDataDir: './data/x-session', // Saves login session
  });

  try {
    console.log('Initializing browser...');
    await client.init();

    // Check if we have a saved session
    const hasSession = await client.checkSession();

    if (!hasSession) {
      let loggedIn = false;
      if (authToken) {
        console.log('Authenticating via auth_token cookie...');
        loggedIn = await client.loginWithCookie(authToken);
      } else {
        console.log('Logging in...');
        loggedIn = await client.login({
          username: username!,
          password: password!,
          email: process.env.X_EMAIL,
        });
      }

      if (!loggedIn) {
        console.error('Login failed');
        await client.screenshot('./login-failed.png');
        process.exit(1);
      }
    }

    console.log('Posting tweet...');
    const result = await client.postTweet(text);

    if (result.success) {
      console.log('Tweet posted successfully!');
      if (result.tweetUrl) {
        console.log(`URL: ${result.tweetUrl}`);
      }
    } else {
      console.error('Failed to post:', result.error);
    }

  } catch (error) {
    console.error('Error:', error);
    await client.screenshot('./error.png');
  } finally {
    await client.close();
  }
}

main();
