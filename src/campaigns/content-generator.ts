/**
 * Content Generator for X (Twitter) and TikTok
 * Creates platform-optimized social media content
 */

import { v4 as uuid } from 'uuid';
import type {
  SocialPlatform,
  SocialPost,
  PostContent,
  TikTokScript,
  ContentAdaptation,
  HashtagSet,
  ContentFormat,
} from './types';

const X_MAX_LENGTH = 280;
const X_THREAD_MAX_PER_PART = 280;
const TIKTOK_MAX_CAPTION = 2200;

export interface GenerateXPostOptions {
  topic: string;
  style: 'informative' | 'provocative' | 'storytelling' | 'listicle' | 'question';
  hashtags?: string[];
  includeEmoji?: boolean;
  maxLength?: number;
}

export interface GenerateTikTokOptions {
  topic: string;
  duration: 7 | 15 | 30 | 60 | 180;
  hookStyle: 'question' | 'shock' | 'promise' | 'controversy' | 'relatable';
  hashtags?: string[];
}

export interface GenerateThreadOptions {
  topic: string;
  points: string[];
  includeNumbering?: boolean;
  ctaText?: string;
}

/**
 * Generate a single X (Twitter) post
 */
export function generateXPost(options: GenerateXPostOptions): SocialPost {
  const { topic, style, hashtags = [], includeEmoji = true, maxLength = X_MAX_LENGTH } = options;

  const text = buildXText(topic, style, includeEmoji, hashtags, maxLength);

  return {
    id: uuid(),
    platform: 'x',
    format: 'text',
    content: {
      text,
      hook: text.split('\n')[0],
      cta: extractCTA(text),
    },
    hashtags,
    schedule: {
      publishAt: new Date(),
      timezone: 'UTC',
      phase: 'launch',
      dayOfWeek: new Date().getDay(),
      timeSlot: 'morning',
    },
    status: 'draft',
  };
}

function buildXText(
  topic: string,
  style: GenerateXPostOptions['style'],
  includeEmoji: boolean,
  hashtags: string[],
  maxLength: number
): string {
  const hashtagStr = hashtags.length > 0 ? '\n\n' + hashtags.map(t => `#${t}`).join(' ') : '';
  const availableLength = maxLength - hashtagStr.length;

  let body: string;

  switch (style) {
    case 'question':
      body = `What if ${topic} could change everything?\n\nMost people don't realize this yet.`;
      break;
    case 'provocative':
      body = `Hot take: ${topic} is completely misunderstood.\n\nHere's what nobody tells you:`;
      break;
    case 'storytelling':
      body = `6 months ago I started exploring ${topic}.\n\nWhat I found surprised me:`;
      break;
    case 'listicle':
      body = `3 things about ${topic} you need to know:\n\n1. It's simpler than you think\n2. It saves you time\n3. It compounds`;
      break;
    case 'informative':
    default:
      body = `${topic} — here's what matters:\n\nThe key insight most people miss.`;
      break;
  }

  if (includeEmoji) {
    body = addEmojis(body);
  }

  // Truncate if needed
  if (body.length > availableLength) {
    body = body.slice(0, availableLength - 3) + '...';
  }

  return body + hashtagStr;
}

function addEmojis(text: string): string {
  return text
    .replace(/^Hot take:/m, '🔥 Hot take:')
    .replace(/^What if/m, '💡 What if')
    .replace(/^3 things/m, '🧵 3 things')
    .replace(/surprised me/m, 'surprised me 👇');
}

function extractCTA(text: string): string | undefined {
  const ctaPatterns = [/👇.*$/, /Here's what/, /Check it out/, /Link in bio/];
  for (const pattern of ctaPatterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return undefined;
}

/**
 * Generate a TikTok video script
 */
export function generateTikTokScript(options: GenerateTikTokOptions): TikTokScript {
  const { topic, duration, hookStyle, hashtags = [] } = options;

  const hook = buildTikTokHook(topic, hookStyle);
  const body = buildTikTokBody(topic, duration);
  const cta = buildTikTokCTA(topic);

  return {
    hook,
    body,
    cta,
    duration,
    soundSuggestion: suggestSound(topic),
    textOverlays: buildOverlays(topic, hook, cta),
    transitions: suggestTransitions(duration),
  };
}

function buildTikTokHook(topic: string, hookStyle: GenerateTikTokOptions['hookStyle']): string {
  switch (hookStyle) {
    case 'question':
      return `Did you know ${topic}? Most people have no idea.`;
    case 'shock':
      return `STOP scrolling. This ${topic} hack changed everything for me.`;
    case 'promise':
      return `I'm about to show you the ${topic} secret that took me months to learn.`;
    case 'controversy':
      return `Unpopular opinion: everything you know about ${topic} is wrong.`;
    case 'relatable':
      return `POV: You just discovered ${topic} and your mind is blown.`;
    default:
      return `Here's something about ${topic} you need to see.`;
  }
}

function buildTikTokBody(topic: string, duration: number): string {
  if (duration <= 15) {
    return `Quick breakdown of ${topic} — watch till the end for the best part.`;
  }
  if (duration <= 30) {
    return `Let me walk you through ${topic} step by step. First, understand the basics. Then, apply this one trick. Finally, see the results.`;
  }
  if (duration <= 60) {
    return `Deep dive into ${topic}. I'm going to break this down into three parts so you can actually use this. Part 1: The setup. Part 2: The strategy. Part 3: The results you can expect.`;
  }
  return `Full ${topic} tutorial. Save this for later because you'll want to come back to it. I'm covering everything from beginner to advanced.`;
}

function buildTikTokCTA(topic: string): string {
  return `Follow for more ${topic} content. Drop a comment if you want part 2!`;
}

function suggestSound(topic: string): string {
  // Map common topics to trending sound categories
  const soundMap: Record<string, string> = {
    tech: 'Trending tech sounds / Oh No by Kreepa',
    productivity: 'Aesthetic motivation / original sound',
    business: 'Corporate / Money by Cardi B',
    lifestyle: 'Trending pop / viral original',
  };

  const key = Object.keys(soundMap).find(k =>
    topic.toLowerCase().includes(k)
  );
  return soundMap[key ?? ''] ?? 'Trending original sound - check Discover page';
}

function buildOverlays(topic: string, hook: string, cta: string): string[] {
  return [
    hook.slice(0, 60),
    `${topic} explained`,
    cta.slice(0, 50),
  ];
}

function suggestTransitions(duration: number): string[] {
  if (duration <= 15) return ['jump cut'];
  if (duration <= 30) return ['jump cut', 'swipe'];
  return ['jump cut', 'swipe', 'zoom in', 'text reveal'];
}

/**
 * Generate an X thread from a topic and key points
 */
export function generateThread(options: GenerateThreadOptions): SocialPost {
  const { topic, points, includeNumbering = true, ctaText } = options;

  const parts: string[] = [];

  // Opening tweet
  parts.push(`${topic}\n\nA thread 🧵👇`);

  // Body tweets
  points.forEach((point, i) => {
    const prefix = includeNumbering ? `${i + 1}/ ` : '';
    const text = `${prefix}${point}`;
    // Split if too long
    if (text.length <= X_THREAD_MAX_PER_PART) {
      parts.push(text);
    } else {
      const chunks = splitText(text, X_THREAD_MAX_PER_PART);
      parts.push(...chunks);
    }
  });

  // Closing tweet
  const closing = ctaText
    ? `${ctaText}\n\nIf you found this useful:\n• Repost the first tweet\n• Follow for more threads like this`
    : `That's a wrap!\n\nIf this was helpful:\n• Repost the first tweet\n• Follow for more on ${topic}`;
  parts.push(closing);

  return {
    id: uuid(),
    platform: 'x',
    format: 'thread',
    content: {
      text: parts[0],
      hook: parts[0],
      threadParts: parts,
      cta: closing,
    },
    hashtags: [],
    schedule: {
      publishAt: new Date(),
      timezone: 'UTC',
      phase: 'launch',
      dayOfWeek: new Date().getDay(),
      timeSlot: 'morning',
    },
    status: 'draft',
  };
}

function splitText(text: string, maxLength: number): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxLength) {
      chunks.push(current.trim());
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }
  return chunks;
}

/**
 * Adapt content from one platform to another
 */
export function adaptContent(
  content: PostContent,
  from: SocialPlatform,
  to: SocialPlatform
): ContentAdaptation {
  const changes: string[] = [];
  let adapted: PostContent;

  if (from === 'x' && to === 'tiktok') {
    adapted = xToTikTok(content, changes);
  } else if (from === 'tiktok' && to === 'x') {
    adapted = tikTokToX(content, changes);
  } else {
    adapted = { ...content };
    changes.push('Same platform — no adaptation needed');
  }

  return {
    originalPlatform: from,
    targetPlatform: to,
    originalContent: content,
    adaptedContent: adapted,
    changes,
  };
}

function xToTikTok(content: PostContent, changes: string[]): PostContent {
  const text = content.threadParts
    ? content.threadParts.join('\n\n')
    : content.text;

  changes.push('Converted text to video script format');
  changes.push('Added hook for first 3 seconds');
  changes.push('Added text overlays for key points');
  if (content.threadParts) {
    changes.push('Merged thread parts into continuous script');
  }

  return {
    text: text.slice(0, TIKTOK_MAX_CAPTION),
    hook: content.hook ?? text.split('\n')[0],
    body: text,
    cta: content.cta ?? 'Follow for more!',
    duration: Math.min(60, Math.max(15, Math.ceil(text.length / 20))),
  };
}

function tikTokToX(content: PostContent, changes: string[]): PostContent {
  const fullText = [content.hook, content.body, content.cta]
    .filter(Boolean)
    .join('\n\n');

  changes.push('Condensed video script to text format');

  if (fullText.length <= X_MAX_LENGTH) {
    changes.push('Fit within single tweet');
    return {
      text: fullText,
      hook: content.hook,
      cta: content.cta,
    };
  }

  // Convert to thread
  changes.push('Content too long for single tweet — converted to thread');
  const sentences = fullText.split(/[.!?]+/).filter(s => s.trim());
  const parts = [
    `${content.hook}\n\n🧵👇`,
    ...sentences.map(s => s.trim()),
  ];

  return {
    text: parts[0],
    hook: content.hook,
    threadParts: parts,
    cta: content.cta,
  };
}

/**
 * Generate platform-appropriate hashtag set
 */
export function generateHashtags(
  platform: SocialPlatform,
  niche: string,
  campaignTag?: string
): HashtagSet {
  if (platform === 'x') {
    return {
      primary: campaignTag ? [campaignTag] : [],
      trending: [],           // Filled by hashtag analyzer at runtime
      niche: [niche.replace(/\s+/g, '')],
      discovery: [],
    };
  }

  // TikTok — more hashtags are normal
  return {
    primary: campaignTag ? [campaignTag] : [],
    trending: ['fyp', 'foryou'],
    niche: [
      niche.replace(/\s+/g, ''),
      `${niche.replace(/\s+/g, '')}tok`,
    ],
    discovery: ['viral', 'trending'],
  };
}
