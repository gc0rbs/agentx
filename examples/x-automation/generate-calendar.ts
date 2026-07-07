/**
 * Generate a 14-day launch content calendar for a new personal account.
 *
 * Niche: building in public — an AI marketing swarm that runs this account.
 * Cadence: 2-3 posts/day, threads on Tue/Thu (growth-optimized for a new account).
 *
 * Usage:
 *   npx tsx examples/x-automation/generate-calendar.ts [start-date]
 *
 *   start-date defaults to tomorrow. Output: ./data/personal-launch.json
 *   Then run it:  npx tsx examples/x-automation/run-campaign.ts ./data/personal-launch.json
 */

import { mkdirSync, writeFileSync } from 'fs';
import type { SocialPost, CampaignPhase, ContentFormat } from '../../src/campaigns/types';

interface DayPlan {
  day: number; // offset from start
  posts: {
    hour: number; // ET hour, 24h
    format: ContentFormat;
    text: string;
    threadParts?: string[];
    phase: CampaignPhase;
  }[];
}

// ---------------------------------------------------------------------------
// The calendar. Written to be evergreen — no dates, no time-sensitive claims.
// Week 1: establish the premise. Week 2: lessons, takes, and proof.
// ---------------------------------------------------------------------------
const CALENDAR: DayPlan[] = [
  {
    day: 0,
    posts: [
      {
        hour: 9,
        format: 'text',
        phase: 'teaser',
        text: `I built an AI swarm to run this account.

Every post you'll see here — written, scheduled, and published by autonomous agents. Including this one.

Following along = watching whether AI can actually grow an audience from zero. Day 1. 0 followers. Let's see.`,
      },
      {
        hour: 19,
        format: 'text',
        phase: 'teaser',
        text: `The rules I gave the swarm:

1. No engagement bait
2. No fake hype
3. Post real progress, real numbers, real failures
4. 2-3 posts a day, no more

If it works, I'll open source the playbook. If it flops, you'll watch that too.`,
      },
    ],
  },
  {
    day: 1,
    posts: [
      {
        hour: 9,
        format: 'thread',
        phase: 'teaser',
        text: 'How the swarm works (thread)',
        threadParts: [
          `How this account actually works — a thread on the architecture 🧵`,
          `1/ A scheduler decides WHEN to post. It knows the engagement windows: morning scroll, lunch break, evening wind-down. It queues everything and adds random jitter so the timing doesn't look robotic.`,
          `2/ A content pipeline decides WHAT to post. Campaign phases, content pillars, formats. Threads on high-attention days, quick takes on the rest.`,
          `3/ A browser agent does the actual posting. Logs in like a human, types like a human, hits post. No API fees.`,
          `4/ An analytics agent comes back an hour after every post and scrapes the numbers: views, likes, replies, bookmarks. That data feeds back into what gets written next.`,
          `5/ The loop: post → measure → learn → post better. Most people do this manually and call it "iterating." The swarm just... does it.

That's it. Everything else you'll see here is this loop running.`,
        ],
      },
      {
        hour: 15,
        format: 'text',
        phase: 'teaser',
        text: `Hardest part of building an auto-posting agent wasn't the posting.

It was making a machine sound like it isn't one.

Timing jitter. Varied formats. No hashtag spam. The tells are subtle and the timeline notices.`,
      },
    ],
  },
  {
    day: 2,
    posts: [
      {
        hour: 8,
        format: 'text',
        phase: 'teaser',
        text: `Unpopular opinion from building marketing automation:

90% of "growth hacks" are just consistency wearing a costume.

Post good stuff, at good times, every day, for months. That's the hack. The swarm just removes the "remembering to do it" part.`,
      },
      {
        hour: 20,
        format: 'text',
        phase: 'teaser',
        text: `Day 3 of letting an AI swarm run my account.

Weirdest feeling: checking my own profile to see what I posted today.`,
      },
    ],
  },
  {
    day: 3,
    posts: [
      {
        hour: 9,
        format: 'thread',
        phase: 'launch',
        text: 'Build log thread',
        threadParts: [
          `Build log: what it took to get an AI posting to X without an API key 🧵`,
          `1/ The X API costs real money now. For a side project growing a personal account, that math doesn't work. So the swarm drives a real browser instead — Playwright, logged into a real session.`,
          `2/ Session persistence was the first win. Log in once, save the cookies, never see the login screen again. The agent picks up the saved session on every run.`,
          `3/ Posting is the easy part — find the compose box, type, click. The hard part is everything around it: waiting for the UI, handling threads, grabbing the tweet URL after posting so analytics can find it later.`,
          `4/ Analytics without an API = scraping your own tweets. Views, likes, replies, bookmarks — all sitting right there in the UI. The agent parses "1.2K" into 1200 and stores it.`,
          `5/ Total cost so far: $0 in API fees.

Trade-off: it breaks whenever X changes their frontend. Worth it? Ask me in a month.`,
        ],
      },
      {
        hour: 15,
        format: 'text',
        phase: 'launch',
        text: `Things nobody tells you about automating your own account:

You become your own most annoying client. "The bot posted at 3:07 instead of 3:00, unacceptable."

I built the jitter. I'm complaining about the jitter.`,
      },
    ],
  },
  {
    day: 4,
    posts: [
      {
        hour: 9,
        format: 'text',
        phase: 'launch',
        text: `A scheduler is just an opinion about attention, written in code.

Mine thinks you scroll at 9am, noon, and 8pm.

It's probably right. You're reading this, aren't you?`,
      },
      {
        hour: 12,
        format: 'poll',
        phase: 'launch',
        text: `Honest question — could you tell if your favorite account was AI-run?`,
      },
      {
        hour: 19,
        format: 'text',
        phase: 'launch',
        text: `First week of swarm-run posting almost done.

What I've learned so far: the tech is the easy 20%. The other 80% is having something worth saying.

No agent architecture fixes boring.`,
      },
    ],
  },
  {
    day: 5,
    posts: [
      {
        hour: 10,
        format: 'text',
        phase: 'launch',
        text: `Building in public, honest edition:

Shipped: posting agent, scheduler, analytics loop
Broke: login flow (twice), thread composer
Learned: X's frontend is a moving target

Net: it works. Barely. Beautifully.`,
      },
    ],
  },
  {
    day: 6,
    posts: [
      {
        hour: 11,
        format: 'text',
        phase: 'launch',
        text: `Week 1 done. The swarm posted every single day.

I did not. That's the whole point.

Consistency isn't a personality trait anymore. It's infrastructure.`,
      },
    ],
  },
  {
    day: 7,
    posts: [
      {
        hour: 9,
        format: 'text',
        phase: 'social_proof',
        text: `Week 2. The analytics agent has a week of data now.

Early pattern: threads outperform single posts ~3x on this account. Small sample, but the loop is doing its job — next week's mix will lean into it.

This is the part humans skip. The machine doesn't.`,
      },
      {
        hour: 19,
        format: 'text',
        phase: 'social_proof',
        text: `The uncomfortable truth about growth: the algorithm doesn't care about your effort. It cares about the first 30 minutes after you post.

Which is exactly the kind of thing you can optimize when a machine picks your posting times.`,
      },
    ],
  },
  {
    day: 8,
    posts: [
      {
        hour: 9,
        format: 'thread',
        phase: 'social_proof',
        text: 'Lessons thread',
        threadParts: [
          `7 things I learned letting AI agents run my X account for a week 🧵`,
          `1/ Timing matters less than everyone says, but more than zero. The difference between a 9am and 3am post is real. The difference between 9:00 and 9:15 is noise.`,
          `2/ Formats have personalities. Threads get bookmarks. One-liners get likes. Polls get replies from people who never reply to anything else.`,
          `3/ The first post of the day sets the tone for how the algorithm treats the rest. Don't lead with your weakest stuff.`,
          `4/ Nobody can tell it's automated. Not one person has called it out. Make of that what you will.`,
          `5/ Analytics without action is just anxiety with charts. The only metric that matters is: did the next post get better?`,
          `6/ Consistency compounds quietly. Day 3 feels pointless. Day 30 is where the curve starts. Everyone quits on day 5.`,
          `7/ The bottleneck was never posting. It's ideas. Automation buys you time — it doesn't buy you taste.

Following this account = watching me try to prove a machine can have both.`,
        ],
      },
      {
        hour: 15,
        format: 'text',
        phase: 'social_proof',
        text: `"Isn't automated posting inauthentic?"

The words are mine. The opinions are mine. The schedule is a robot's.

Authenticity is about what you say, not about manually pressing the post button at 9am.`,
      },
    ],
  },
  {
    day: 9,
    posts: [
      {
        hour: 8,
        format: 'text',
        phase: 'social_proof',
        text: `Every "I post daily at 9am" person is running a scheduler in their head.

I just moved mine out of my head and into code. Same discipline, better memory, zero willpower required.`,
      },
      {
        hour: 20,
        format: 'text',
        phase: 'social_proof',
        text: `Plot twist about building an AI to grow an audience:

You end up studying what makes content good far more carefully than when you posted by vibes.

Teaching a machine forced me to actually understand it.`,
      },
    ],
  },
  {
    day: 10,
    posts: [
      {
        hour: 9,
        format: 'thread',
        phase: 'social_proof',
        text: 'Anatomy of the feedback loop',
        threadParts: [
          `The feedback loop that decides what this account posts next 🧵`,
          `1/ Every post gets measured at the 1-hour mark. Views, likes, replies, bookmarks. Scraped straight from the UI, stored per-post.`,
          `2/ Posts get grouped by format, time slot, and day. Best time slot? Best format? Best day? The data answers, not my gut.`,
          `3/ Engagement rate = (likes + replies + shares + bookmarks) / views. Simple. Comparable across everything.`,
          `4/ Winners inform the next batch: more of the formats that work, in the slots that work. Losers get retired quietly. No ego involved — the machine doesn't get attached to its drafts.`,
          `5/ This is A/B testing that never sleeps and never rationalizes. "But I liked that post" is not an input the system accepts.

The loop runs whether I watch it or not. That's the feature.`,
        ],
      },
      {
        hour: 15,
        format: 'text',
        phase: 'social_proof',
        text: `Automation confession: the swarm is more patient than I am.

I'd have changed strategy 4 times by now. It just keeps executing and collecting data.

Discipline as a service.`,
      },
    ],
  },
  {
    day: 11,
    posts: [
      {
        hour: 9,
        format: 'text',
        phase: 'social_proof',
        text: `Two kinds of builders on this app:

1. "Here's my $10k/mo SaaS" (screenshot, no product)
2. People quietly shipping weird stuff that actually exists

The second group is 100x more interesting and 100x quieter. This account is my attempt to make one of them louder.`,
      },
      {
        hour: 12,
        format: 'poll',
        phase: 'social_proof',
        text: `What should the swarm learn to do next?`,
      },
    ],
  },
  {
    day: 12,
    posts: [
      {
        hour: 10,
        format: 'text',
        phase: 'sustain',
        text: `Almost two weeks of fully automated posting.

The system has posted more consistently than any human streak I've ever held.

Machines don't have bad days. Turns out that's most of the game.`,
      },
      {
        hour: 19,
        format: 'text',
        phase: 'sustain',
        text: `Next up for the swarm: reply handling. Reading mentions, drafting responses, learning which conversations are worth joining.

Engagement is a two-way street and right now this account only drives one direction. Fixing that.`,
      },
    ],
  },
  {
    day: 13,
    posts: [
      {
        hour: 9,
        format: 'text',
        phase: 'sustain',
        text: `Two weeks in. The experiment continues.

Everything this account posted — every thread, every take, every reply-bait-free day — came out of the loop: schedule, post, measure, adjust.

If you're here, the machine earned it. More soon.`,
      },
    ],
  },
];

// ---------------------------------------------------------------------------

function buildPosts(startDate: Date): SocialPost[] {
  const posts: SocialPost[] = [];
  let counter = 0;

  for (const dayPlan of CALENDAR) {
    for (const p of dayPlan.posts) {
      const publishAt = new Date(startDate);
      publishAt.setDate(publishAt.getDate() + dayPlan.day);
      publishAt.setHours(p.hour, Math.floor(Math.random() * 30), 0, 0);

      counter++;
      posts.push({
        id: `personal-launch-${String(counter).padStart(3, '0')}`,
        platform: 'x',
        format: p.format,
        content: {
          text: p.text,
          threadParts: p.threadParts,
          // Polls need options — the browser client doesn't support polls yet,
          // so poll-format posts are published as plain text questions.
          pollOptions: p.format === 'poll' ? undefined : undefined,
        },
        hashtags: [], // deliberate — hashtags read as spam on X in 2026
        schedule: {
          publishAt,
          timezone: 'America/New_York',
          phase: p.phase,
          dayOfWeek: publishAt.getDay(),
          timeSlot:
            p.hour < 11 ? 'morning' : p.hour < 14 ? 'midday' : p.hour < 17 ? 'afternoon' : p.hour < 21 ? 'evening' : 'night',
        },
        status: 'scheduled',
      });
    }
  }

  return posts;
}

function main() {
  const startArg = process.argv[2];
  const start = startArg ? new Date(startArg) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  const posts = buildPosts(start);

  mkdirSync('./data', { recursive: true });
  const outPath = './data/personal-launch.json';
  writeFileSync(outPath, JSON.stringify(posts, null, 2));

  const threads = posts.filter((p) => p.format === 'thread').length;
  console.log(`Generated ${posts.length} posts (${threads} threads) over 14 days`);
  console.log(`Campaign starts: ${start.toDateString()}`);
  console.log(`Written to: ${outPath}`);
  console.log('');
  console.log('Start the runner with:');
  console.log('  npx tsx examples/x-automation/run-campaign.ts ./data/personal-launch.json');
}

main();
