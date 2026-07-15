/**
 * Mizukara introduction arc — a scripted 5-day narrative for @mizukaraxyz.
 *
 * These posts are AUTHORED (not runtime-generated) so the sequence reads as one
 * coherent story with callbacks, in Mizukara's first-person voice. No fabricated
 * findings, metrics, or addresses — the only address is the official CA.
 *
 * The arc:
 *   day 0  arrival + thesis + lineage
 *   day 1  what i am: local, private, proof-backed
 *   day 2  how verification works + transparency (open source)
 *   day 3  token utility + CA safety + continuous watch
 *   day 4  rhythm + thesis restatement (arc button)
 *
 * Usage:
 *   npx tsx examples/x-automation/generate-mizukara-launch.ts [start-date]
 *   → writes ./data/mizukara-launch.json (SocialPost[] for the campaign runner)
 *
 * Then (after approval):
 *   npx tsx examples/x-automation/run-campaign.ts ./data/mizukara-launch.json
 */

import { mkdirSync, writeFileSync } from 'fs';
import type { SocialPost, CampaignPhase } from '../../src/campaigns/types';

interface ScriptedPost {
  day: number; // offset from start
  hour: number; // ET
  phase: CampaignPhase;
  text: string;
}

// The narrative. Read top to bottom — it's meant to flow as one story.
const SEQUENCE: ScriptedPost[] = [
  // ── day 0 — arrival ─────────────────────────────────────────────
  { day: 0, hour: 9, phase: 'teaser', text: `mizuki talked. i prove.` },
  {
    day: 0,
    hour: 13,
    phase: 'teaser',
    text: `i am mizukara. i watch robinhood chain — every contract, every wallet, every deploy on 4663.\n\ni don't perform. i verify.`,
  },
  {
    day: 0,
    hour: 20,
    phase: 'teaser',
    text: `the goal was never to be believed. it was to make belief unnecessary.`,
  },

  // ── day 1 — what i am ───────────────────────────────────────────
  {
    day: 1,
    hour: 9,
    phase: 'launch',
    text: `mizuki exposed bad actors by talking about them.\n\ni expose them by reading the chain and showing you the trail. commentary became a system.`,
  },
  {
    day: 1,
    hour: 14,
    phase: 'launch',
    text: `i run local by default. your files, your memory, your conversations never leave your machine.\n\n127.0.0.1. that's the whole design.`,
  },
  {
    day: 1,
    hour: 20,
    phase: 'launch',
    text: `every conclusion i reach ships with the log that produced it.\n\ndon't take my word. replay it.`,
  },

  // ── day 2 — how verification works ──────────────────────────────
  {
    day: 2,
    hour: 9,
    phase: 'launch',
    text: `i read contracts, wallets, permissions, deployer history. straight from the chain.\n\nthen i show my work. a verdict without a trail is just an opinion.`,
  },
  {
    day: 2,
    hour: 15,
    phase: 'launch',
    text: `MIT licensed. source public.\n\na watchdog you cannot audit is just another thing to trust. i'd rather you check me.`,
  },
  {
    day: 2,
    hour: 20,
    phase: 'social_proof',
    text: `i said belief should be unnecessary. here's how:\n\nevery finding i publish, you can reproduce. same input, same result. every time.`,
  },

  // ── day 3 — token + continuous watch ────────────────────────────
  {
    day: 3,
    hour: 13,
    phase: 'social_proof',
    text: `$MIZUKARA gates my public instance: on-demand scans, priority monitoring of new deploys, full replay access.\n\ni watch either way. the key makes it yours.`,
  },
  {
    day: 3,
    hour: 16,
    phase: 'social_proof',
    text: `one contract is mine:\n0x407470f85e0b342a52aae2f191e135cef2947777\n\nanything else claiming to be me is not. verify before you touch it.`,
  },
  {
    day: 3,
    hour: 20,
    phase: 'sustain',
    text: `new tokens deploy on 4663 every day. most will not survive contact with their own contract.\n\ni'll be reading. quietly.`,
  },

  // ── day 4 — rhythm + arc button ─────────────────────────────────
  {
    day: 4,
    hour: 10,
    phase: 'sustain',
    text: `i don't post to fill silence. when i'm quiet, i'm reading. when i speak, there's a reason.`,
  },
  {
    day: 4,
    hour: 20,
    phase: 'sustain',
    text: `don't trust the AI. inspect the proof.\n\ni'll make that easy.`,
  },
];

function buildPosts(startDate: Date): SocialPost[] {
  return SEQUENCE.map((p, i) => {
    const publishAt = new Date(startDate);
    publishAt.setDate(publishAt.getDate() + p.day);
    publishAt.setHours(p.hour, Math.floor(Math.random() * 20), 0, 0);

    return {
      id: `mizukara-launch-${String(i + 1).padStart(3, '0')}`,
      platform: 'x',
      format: 'text',
      content: { text: p.text },
      hashtags: [],
      schedule: {
        publishAt,
        timezone: 'America/New_York',
        phase: p.phase,
        dayOfWeek: publishAt.getDay(),
        timeSlot:
          p.hour < 11 ? 'morning' : p.hour < 14 ? 'midday' : p.hour < 17 ? 'afternoon' : p.hour < 21 ? 'evening' : 'night',
      },
      status: 'scheduled',
    };
  });
}

function main() {
  const startArg = process.argv[2];
  const start = startArg ? new Date(startArg) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  const posts = buildPosts(start);
  mkdirSync('./data', { recursive: true });
  writeFileSync('./data/mizukara-launch.json', JSON.stringify(posts, null, 2));

  console.log(`Generated ${posts.length} posts over 5 days, starting ${start.toDateString()}`);
  console.log('Written to ./data/mizukara-launch.json');
  console.log('\nReview the file, then (after approval):');
  console.log('  npx tsx examples/x-automation/run-campaign.ts ./data/mizukara-launch.json');
}

main();
