/**
 * Hood Intelligence agent — live X agent for the @hoodintel persona.
 *
 * Loop:
 *   1. Poll mentions → generate [MENTION] replies via Claude → post them
 *   2. On a schedule, generate [POST] content from the topic rotation → post it
 *
 * Usage:
 *   npx tsx examples/x-automation/hoodintel-agent.ts          # continuous
 *   npx tsx examples/x-automation/hoodintel-agent.ts --once   # one pass (cron)
 *   npx tsx examples/x-automation/hoodintel-agent.ts --dry-run # generate but don't post
 *
 * Environment:
 *   X_USERNAME / X_PASSWORD / X_EMAIL   — the @hoodintel account credentials
 *   ANTHROPIC_API_KEY                    — Claude API key for content generation
 *
 * State persists to ./data/hoodintel-state.json (replied mentions, post log).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createXBrowserClient } from '../../src/integrations/x';
import { createPersonaAgent, hoodintel } from '../../src/personas';

const STATE_PATH = './data/hoodintel-state.json';
const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 min

interface AgentState {
  repliedTweetIds: string[];
  postLog: { at: string; topic: string; text: string }[];
  replyLog: { at: string; tweetId: string; text: string }[];
  topicIndex: number;
}

function loadState(): AgentState {
  if (existsSync(STATE_PATH)) {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
  }
  return { repliedTweetIds: [], postLog: [], replyLog: [], topicIndex: 0 };
}

function saveState(state: AgentState): void {
  mkdirSync('./data', { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function postsToday(state: AgentState): number {
  const today = new Date().toISOString().slice(0, 10);
  return state.postLog.filter((p) => p.at.startsWith(today)).length;
}

function repliesLastHour(state: AgentState): number {
  const cutoff = Date.now() - 3600_000;
  return state.replyLog.filter((r) => new Date(r.at).getTime() > cutoff).length;
}

/** Posting window: spread maxPostsPerDay across 9am-9pm, post if we're behind pace */
function shouldPostNow(state: AgentState): boolean {
  const now = new Date();
  const hour = now.getHours();
  if (hour < 9 || hour >= 21) return false;

  const done = postsToday(state);
  if (done >= hoodintel.maxPostsPerDay) return false;

  const windowHours = 12;
  const elapsed = hour - 9 + now.getMinutes() / 60;
  const expectedByNow = Math.floor((elapsed / windowHours) * hoodintel.maxPostsPerDay);
  return done <= expectedByNow;
}

async function main() {
  const once = process.argv.includes('--once');
  const dryRun = process.argv.includes('--dry-run');

  const username = process.env.X_USERNAME;
  const password = process.env.X_PASSWORD;
  if (!dryRun && (!username || !password)) {
    console.error('Set X_USERNAME and X_PASSWORD (the @hoodintel account)');
    process.exit(1);
  }

  const agent = createPersonaAgent(hoodintel);
  const state = loadState();

  // Dry run: generate one post + show it, no browser needed
  if (dryRun) {
    const topic = hoodintel.postTopics[state.topicIndex % hoodintel.postTopics.length];
    console.log(`[dry-run] topic: ${topic}`);
    const result = await agent.generatePost(topic);
    console.log(`[dry-run] would post:\n\n${result.text}\n`);
    console.log(`[dry-run] tokens: ${result.inputTokens} in / ${result.outputTokens} out`);
    return;
  }

  const x = createXBrowserClient({
    headless: true,
    userDataDir: './data/hoodintel-session',
  });

  console.log('Initializing browser...');
  await x.init();

  const hasSession = await x.checkSession();
  if (!hasSession) {
    console.log('Logging in as @' + hoodintel.handle + '...');
    const ok = await x.login({
      username: username!,
      password: password!,
      email: process.env.X_EMAIL,
    });
    if (!ok) {
      console.error('Login failed');
      await x.close();
      process.exit(1);
    }
  }

  let running = true;
  const shutdown = async () => {
    console.log('\nShutting down...');
    running = false;
    await x.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const tick = async () => {
    // --- 1. Handle mentions ---
    const mentions = await x.getMentions(20);
    const fresh = mentions.filter(
      (m) =>
        !state.repliedTweetIds.includes(m.tweetId) &&
        m.author.toLowerCase() !== hoodintel.handle.toLowerCase()
    );
    console.log(`Mentions: ${mentions.length} total, ${fresh.length} new`);

    for (const mention of fresh) {
      if (repliesLastHour(state) >= hoodintel.maxRepliesPerHour) {
        console.log('Reply rate limit reached for this hour, deferring rest');
        break;
      }

      try {
        const reply = await agent.replyToMention(`@${mention.author}: ${mention.text}`);
        const result = await x.replyToTweet(mention.tweetUrl, reply.text);

        if (result.success) {
          state.replyLog.push({
            at: new Date().toISOString(),
            tweetId: mention.tweetId,
            text: reply.text,
          });
          console.log(`Replied to @${mention.author}: ${reply.text.slice(0, 60)}...`);
        }
        // Mark handled either way so a broken mention doesn't retry forever
        state.repliedTweetIds.push(mention.tweetId);
        saveState(state);

        // Human-ish pacing between replies
        await sleep(30_000 + Math.random() * 60_000);
      } catch (error) {
        console.error(`Failed replying to ${mention.tweetId}:`, error);
        state.repliedTweetIds.push(mention.tweetId);
        saveState(state);
      }
    }

    // --- 2. Original post if we're due ---
    if (shouldPostNow(state)) {
      const topic = hoodintel.postTopics[state.topicIndex % hoodintel.postTopics.length];
      try {
        const post = await agent.generatePost(topic);
        const result = await x.postTweet(post.text);

        if (result.success) {
          state.postLog.push({ at: new Date().toISOString(), topic, text: post.text });
          state.topicIndex++;
          saveState(state);
          console.log(`Posted [${topic}]: ${post.text.slice(0, 80)}...`);
        }
      } catch (error) {
        console.error('Post generation/publish failed:', error);
      }
    }

    console.log(
      `State: ${postsToday(state)}/${hoodintel.maxPostsPerDay} posts today, ` +
        `${repliesLastHour(state)}/${hoodintel.maxRepliesPerHour} replies this hour`
    );
  };

  if (once) {
    await tick();
    await x.close();
    return;
  }

  console.log(`@${hoodintel.handle} agent running — checking every ${POLL_INTERVAL_MS / 60000} min, Ctrl+C to stop`);
  while (running) {
    try {
      await tick();
    } catch (error) {
      console.error('Tick failed:', error);
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main();
