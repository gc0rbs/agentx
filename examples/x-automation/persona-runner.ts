/**
 * Generic persona agent runner — works for any persona in the registry.
 *
 * Loop:
 *   1. Poll mentions → generate replies via Claude → post them
 *   2. On a paced schedule, generate original posts from the persona's topic rotation
 *
 * Usage:
 *   npx tsx examples/x-automation/persona-runner.ts --persona hoodintel --dry-run
 *   npx tsx examples/x-automation/persona-runner.ts --persona hoodintel --once
 *   npx tsx examples/x-automation/persona-runner.ts --persona hoodintel
 *
 * Auth (in priority order):
 *   X_AUTH_TOKEN   — X session cookie (preferred; skips password + 2FA)
 *   X_USERNAME / X_PASSWORD / X_EMAIL — password login fallback
 *
 * ANTHROPIC_API_KEY is required for content generation.
 *
 * --dry-run generates content and prints it. NOTHING is posted to X in dry-run.
 * State persists to ./data/<persona>-state.json.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createXBrowserClient } from '../../src/integrations/x';
import { createPersonaAgent, getPersona } from '../../src/personas';

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 min

interface AgentState {
  repliedTweetIds: string[];
  postLog: { at: string; topic: string; text: string }[];
  replyLog: { at: string; tweetId: string; text: string }[];
  topicIndex: number;
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function loadState(path: string): AgentState {
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'));
  return { repliedTweetIds: [], postLog: [], replyLog: [], topicIndex: 0 };
}

function saveState(path: string, state: AgentState): void {
  mkdirSync('./data', { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2));
}

function postsToday(state: AgentState): number {
  const today = new Date().toISOString().slice(0, 10);
  return state.postLog.filter((p) => p.at.startsWith(today)).length;
}

function repliesLastHour(state: AgentState): number {
  const cutoff = Date.now() - 3600_000;
  return state.replyLog.filter((r) => new Date(r.at).getTime() > cutoff).length;
}

function shouldPostNow(state: AgentState, maxPerDay: number): boolean {
  const now = new Date();
  const hour = now.getHours();
  if (hour < 9 || hour >= 21) return false;

  const done = postsToday(state);
  if (done >= maxPerDay) return false;

  const windowHours = 12;
  const elapsed = hour - 9 + now.getMinutes() / 60;
  const expectedByNow = Math.floor((elapsed / windowHours) * maxPerDay);
  return done <= expectedByNow;
}

async function main() {
  const personaId = argValue('--persona');
  if (!personaId) {
    console.error('Usage: --persona <id> [--once] [--dry-run]');
    process.exit(1);
  }

  const persona = getPersona(personaId);
  const once = process.argv.includes('--once');
  const dryRun = process.argv.includes('--dry-run');
  const statePath = `./data/${persona.id}-state.json`;
  const state = loadState(statePath);
  const agent = createPersonaAgent(persona);

  // Dry run: generate one post and show it, no browser, no posting.
  if (dryRun) {
    const topic = persona.postTopics[state.topicIndex % persona.postTopics.length];
    console.log(`[dry-run] persona: @${persona.handle}`);
    console.log(`[dry-run] topic: ${topic}\n`);
    const result = await agent.generatePost(topic);
    console.log(`would post:\n\n${result.text}\n`);
    console.log(`(${result.text.length} chars, ${result.outputTokens} output tokens)`);
    return;
  }

  const username = process.env.X_USERNAME;
  const password = process.env.X_PASSWORD;
  const authToken = process.env.X_AUTH_TOKEN;
  if (!authToken && (!username || !password)) {
    console.error('Set X_AUTH_TOKEN, or X_USERNAME + X_PASSWORD');
    process.exit(1);
  }

  // Default to headed — X flags headless Chromium and serves a bot page that
  // breaks cookie auth. The container runs this under Xvfb (see entrypoint).
  // Set HEADLESS=true to override (e.g. local dry testing).
  const x = createXBrowserClient({
    headless: process.env.HEADLESS === 'true',
    userDataDir: `./data/${persona.id}-session`,
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
      console.log(`Logging in as @${persona.handle}...`);
      ok = await x.login({ username: username!, password: password!, email: process.env.X_EMAIL });
    }
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
    // --- 1. Mentions ---
    const mentions = await x.getMentions(20);
    const fresh = mentions.filter(
      (m) =>
        !state.repliedTweetIds.includes(m.tweetId) &&
        m.author.toLowerCase() !== persona.handle.toLowerCase()
    );
    console.log(`Mentions: ${mentions.length} total, ${fresh.length} new`);

    for (const mention of fresh) {
      if (repliesLastHour(state) >= persona.maxRepliesPerHour) {
        console.log('Reply rate limit reached this hour, deferring');
        break;
      }
      try {
        const reply = await agent.replyToMention(`@${mention.author}: ${mention.text}`);
        const result = await x.replyToTweet(mention.tweetUrl, reply.text);
        if (result.success) {
          state.replyLog.push({ at: new Date().toISOString(), tweetId: mention.tweetId, text: reply.text });
          console.log(`Replied to @${mention.author}: ${reply.text.slice(0, 60)}...`);
        }
        state.repliedTweetIds.push(mention.tweetId);
        saveState(statePath, state);
        await sleep(30_000 + Math.random() * 60_000);
      } catch (error) {
        console.error(`Reply to ${mention.tweetId} failed:`, error);
        state.repliedTweetIds.push(mention.tweetId);
        saveState(statePath, state);
      }
    }

    // --- 2. Paced original post ---
    if (shouldPostNow(state, persona.maxPostsPerDay)) {
      const topic = persona.postTopics[state.topicIndex % persona.postTopics.length];
      try {
        const post = await agent.generatePost(topic);
        const result = await x.postTweet(post.text);
        if (result.success) {
          state.postLog.push({ at: new Date().toISOString(), topic, text: post.text });
          state.topicIndex++;
          saveState(statePath, state);
          console.log(`Posted: ${post.text.slice(0, 80)}...`);
        }
      } catch (error) {
        console.error('Post failed:', error);
      }
    }

    console.log(
      `${postsToday(state)}/${persona.maxPostsPerDay} posts today, ` +
        `${repliesLastHour(state)}/${persona.maxRepliesPerHour} replies this hour`
    );
  };

  if (once) {
    await tick();
    await x.close();
    return;
  }

  console.log(`@${persona.handle} running — every ${POLL_INTERVAL_MS / 60000} min, Ctrl+C to stop`);
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
