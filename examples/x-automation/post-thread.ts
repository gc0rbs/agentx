/**
 * Example: Post a thread using browser automation
 *
 * Usage:
 *   npx tsx examples/x-automation/post-thread.ts
 *
 * Modify the thread content below before running.
 */

import { createXBrowserClient, TweetData } from '../../src/integrations/x';

const thread: TweetData[] = [
  { text: '🧵 Thread: Why AI Marketing Swarms are the future...' },
  { text: '1/ Traditional marketing automation is linear. One rule triggers one action. But markets are chaotic, non-linear systems.' },
  { text: '2/ Swarm intelligence mirrors how markets actually work: distributed, adaptive, emergent behavior.' },
  { text: '3/ Each agent specializes: content generation, timing optimization, audience analysis, performance tracking.' },
  { text: '4/ They coordinate without central control. Like a flock of birds - no leader, yet perfectly synchronized.' },
  { text: '5/ The result? Marketing that adapts in real-time, learns from every interaction, and scales without breaking.' },
];

async function main() {
  const username = process.env.X_USERNAME;
  const password = process.env.X_PASSWORD;

  if (!username || !password) {
    console.error('Set X_USERNAME and X_PASSWORD environment variables');
    process.exit(1);
  }

  const client = createXBrowserClient({
    headless: false,
    userDataDir: './data/x-session',
  });

  try {
    console.log('Initializing browser...');
    await client.init();

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
        process.exit(1);
      }
    }

    console.log(`Posting thread with ${thread.length} tweets...`);
    const result = await client.postThread(thread);

    if (result.success) {
      console.log('Thread posted successfully!');
      if (result.threadUrl) {
        console.log(`URL: ${result.threadUrl}`);
      }
    } else {
      console.error('Failed to post thread:', result.error);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

main();
