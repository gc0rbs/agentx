/**
 * Example: Post a tweet using browser automation
 *
 * Usage:
 *   npx tsx examples/x-automation/post-tweet.ts "Your tweet text here"
 *
 * Set credentials via environment variables:
 *   X_USERNAME - your X username or email
 *   X_PASSWORD - your X password
 *   X_EMAIL - (optional) email for verification step
 */

import { createXBrowserClient } from '../../src/integrations/x';

async function main() {
  const text = process.argv[2];
  if (!text) {
    console.error('Usage: npx tsx examples/x-automation/post-tweet.ts "Your tweet"');
    process.exit(1);
  }

  const username = process.env.X_USERNAME;
  const password = process.env.X_PASSWORD;

  if (!username || !password) {
    console.error('Set X_USERNAME and X_PASSWORD environment variables');
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
      console.log('Logging in...');
      const loggedIn = await client.login({
        username,
        password,
        email: process.env.X_EMAIL,
      });

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
