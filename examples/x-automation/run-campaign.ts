/**
 * Example: Run a campaign end-to-end
 * Publishes due posts via browser automation and collects analytics on a loop.
 *
 * Usage:
 *   # Continuous loop (checks every 5 min):
 *   npx tsx examples/x-automation/run-campaign.ts path/to/posts.json
 *
 *   # Single pass (for cron):
 *   npx tsx examples/x-automation/run-campaign.ts path/to/posts.json --once
 *
 *   # No posts file? Queues a demo tweet due immediately:
 *   npx tsx examples/x-automation/run-campaign.ts --demo
 *
 * posts.json is an array of SocialPost objects (see src/campaigns/types.ts).
 * State persists to ./data/campaign-state.json — delete it to start fresh.
 *
 * Credentials via environment variables: X_USERNAME, X_PASSWORD, X_EMAIL (optional).
 */

import { existsSync, readFileSync } from 'fs';
import { createXBrowserClient } from '../../src/integrations/x';
import { CampaignRunner, CampaignStore } from '../../src/orchestrator';
import type { SocialPost } from '../../src/campaigns/types';

const STATE_PATH = './data/campaign-state.json';

function demoPosts(): SocialPost[] {
  return [
    {
      id: `demo-${Date.now()}`,
      platform: 'x',
      format: 'text',
      content: { text: 'Testing my marketing swarm — this post was queued, scheduled, and published by the orchestrator. 🐝' },
      hashtags: [],
      schedule: {
        publishAt: new Date(),
        timezone: 'America/New_York',
        phase: 'launch',
        dayOfWeek: new Date().getDay(),
        timeSlot: 'midday',
      },
      status: 'scheduled',
    },
  ];
}

function loadPosts(path: string): SocialPost[] {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as SocialPost[];
  for (const post of raw) {
    post.schedule.publishAt = new Date(post.schedule.publishAt);
  }
  return raw;
}

async function main() {
  const args = process.argv.slice(2);
  const once = args.includes('--once');
  const demo = args.includes('--demo');
  const postsPath = args.find((a) => !a.startsWith('--'));

  const authToken = process.env.X_AUTH_TOKEN;
  const username = process.env.X_USERNAME;
  const password = process.env.X_PASSWORD;
  if (!authToken && (!username || !password)) {
    console.error('Set X_AUTH_TOKEN, or X_USERNAME + X_PASSWORD');
    process.exit(1);
  }

  // Load or resume campaign state
  let store: CampaignStore;
  if (existsSync(STATE_PATH)) {
    store = new CampaignStore(STATE_PATH);
    console.log('Resuming existing campaign state');
  } else {
    const posts = demo ? demoPosts() : postsPath ? loadPosts(postsPath) : null;
    if (!posts) {
      console.error('No saved state. Provide a posts.json path or use --demo');
      process.exit(1);
    }
    store = new CampaignStore(STATE_PATH, {
      campaignId: 'campaign-1',
      campaignName: demo ? 'Demo campaign' : (postsPath as string),
      posts,
    });
  }

  const x = createXBrowserClient({
    headless: true,
    userDataDir: './data/x-session',
  });

  console.log('Initializing browser...');
  await x.init();

  const hasSession = await x.checkSession();
  if (!hasSession) {
    let ok = false;
    if (authToken) {
      console.log('Authenticating via auth_token cookie...');
      ok = await x.loginWithCookie(authToken);
    } else {
      console.log('Logging in...');
      ok = await x.login({ username: username!, password: password!, email: process.env.X_EMAIL });
    }
    if (!ok) {
      console.error('Login failed — run post-tweet.ts with headless:false to debug');
      await x.close();
      process.exit(1);
    }
  }

  const runner = new CampaignRunner(store, x);

  const shutdown = async () => {
    console.log('\nShutting down...');
    runner.stop();
    await x.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  if (once) {
    const result = await runner.tick();
    console.log('Tick result:', result);
    await x.close();
  } else {
    console.log('Runner started — Ctrl+C to stop');
    await runner.run();
  }
}

main();
