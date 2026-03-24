import { describe, it, expect } from 'vitest';
import {
  generateXPost,
  generateTikTokScript,
  generateThread,
  adaptContent,
  generateHashtags,
} from '../../src/campaigns/content-generator';

describe('Content Generator', () => {
  describe('generateXPost', () => {
    it('should generate a draft X post', () => {
      const post = generateXPost({ topic: 'AI tools', style: 'informative' });

      expect(post.platform).toBe('x');
      expect(post.format).toBe('text');
      expect(post.status).toBe('draft');
      expect(post.content.text).toBeTruthy();
      expect(post.id).toBeTruthy();
    });

    it('should respect max length of 280 characters', () => {
      const post = generateXPost({
        topic: 'A very long topic about artificial intelligence and machine learning applications',
        style: 'listicle',
        hashtags: ['ai', 'ml', 'tech'],
      });

      expect(post.content.text.length).toBeLessThanOrEqual(280);
    });

    it('should include hashtags when provided', () => {
      const post = generateXPost({
        topic: 'productivity',
        style: 'question',
        hashtags: ['productivity', 'ai'],
      });

      expect(post.content.text).toContain('#productivity');
      expect(post.content.text).toContain('#ai');
      expect(post.hashtags).toEqual(['productivity', 'ai']);
    });

    it('should generate different styles', () => {
      const styles = ['informative', 'provocative', 'storytelling', 'listicle', 'question'] as const;
      const texts = styles.map(style =>
        generateXPost({ topic: 'AI', style }).content.text
      );

      // All unique
      const unique = new Set(texts);
      expect(unique.size).toBe(styles.length);
    });
  });

  describe('generateTikTokScript', () => {
    it('should generate a complete script', () => {
      const script = generateTikTokScript({
        topic: 'productivity apps',
        duration: 30,
        hookStyle: 'question',
      });

      expect(script.hook).toBeTruthy();
      expect(script.body).toBeTruthy();
      expect(script.cta).toBeTruthy();
      expect(script.duration).toBe(30);
      expect(script.textOverlays.length).toBeGreaterThan(0);
      expect(script.transitions.length).toBeGreaterThan(0);
    });

    it('should vary content by duration', () => {
      const short = generateTikTokScript({ topic: 'AI', duration: 15, hookStyle: 'shock' });
      const long = generateTikTokScript({ topic: 'AI', duration: 180, hookStyle: 'shock' });

      expect(long.body.length).toBeGreaterThan(short.body.length);
      expect(long.transitions.length).toBeGreaterThan(short.transitions.length);
    });

    it('should generate different hooks per style', () => {
      const hookStyles = ['question', 'shock', 'promise', 'controversy', 'relatable'] as const;
      const hooks = hookStyles.map(hookStyle =>
        generateTikTokScript({ topic: 'AI tools', duration: 30, hookStyle }).hook
      );

      const unique = new Set(hooks);
      expect(unique.size).toBe(hookStyles.length);
    });

    it('should suggest a sound', () => {
      const script = generateTikTokScript({ topic: 'tech review', duration: 60, hookStyle: 'promise' });
      expect(script.soundSuggestion).toBeTruthy();
    });
  });

  describe('generateThread', () => {
    it('should create a thread with opening and closing', () => {
      const thread = generateThread({
        topic: 'Why AI matters',
        points: ['Point one', 'Point two', 'Point three'],
      });

      expect(thread.format).toBe('thread');
      expect(thread.content.threadParts).toBeTruthy();
      expect(thread.content.threadParts!.length).toBe(5); // opening + 3 points + closing
      expect(thread.content.threadParts![0]).toContain('🧵');
    });

    it('should number points when requested', () => {
      const thread = generateThread({
        topic: 'Test',
        points: ['First', 'Second'],
        includeNumbering: true,
      });

      expect(thread.content.threadParts![1]).toContain('1/');
      expect(thread.content.threadParts![2]).toContain('2/');
    });

    it('should include custom CTA', () => {
      const thread = generateThread({
        topic: 'Test',
        points: ['Point'],
        ctaText: 'Check out flowai.app',
      });

      const lastPart = thread.content.threadParts![thread.content.threadParts!.length - 1];
      expect(lastPart).toContain('flowai.app');
    });
  });

  describe('adaptContent', () => {
    it('should adapt X post to TikTok', () => {
      const adaptation = adaptContent(
        { text: 'This is an X post about AI productivity', hook: 'This is an X post' },
        'x',
        'tiktok'
      );

      expect(adaptation.originalPlatform).toBe('x');
      expect(adaptation.targetPlatform).toBe('tiktok');
      expect(adaptation.changes.length).toBeGreaterThan(0);
      expect(adaptation.adaptedContent.hook).toBeTruthy();
      expect(adaptation.adaptedContent.cta).toBeTruthy();
    });

    it('should adapt TikTok script to X', () => {
      const adaptation = adaptContent(
        { text: 'Short caption', hook: 'POV: you just found the best app', body: 'Full body text', cta: 'Follow for more' },
        'tiktok',
        'x'
      );

      expect(adaptation.targetPlatform).toBe('x');
      expect(adaptation.adaptedContent.text).toBeTruthy();
    });

    it('should handle same-platform adaptation', () => {
      const adaptation = adaptContent(
        { text: 'Same platform' },
        'x',
        'x'
      );

      expect(adaptation.changes).toContain('Same platform — no adaptation needed');
    });

    it('should convert long TikTok content to X thread', () => {
      const longBody = 'This is a very long sentence. '.repeat(20);
      const adaptation = adaptContent(
        { text: 'caption', hook: 'Hook text', body: longBody, cta: 'Follow' },
        'tiktok',
        'x'
      );

      expect(adaptation.adaptedContent.threadParts).toBeTruthy();
      expect(adaptation.changes).toContain('Content too long for single tweet — converted to thread');
    });
  });

  describe('generateHashtags', () => {
    it('should generate X hashtags (fewer)', () => {
      const tags = generateHashtags('x', 'AI productivity', 'FlowAI');
      expect(tags.primary).toContain('FlowAI');
      expect(tags.trending.length).toBeLessThanOrEqual(3);
    });

    it('should generate TikTok hashtags with fyp', () => {
      const tags = generateHashtags('tiktok', 'productivity');
      expect(tags.trending).toContain('fyp');
      expect(tags.trending).toContain('foryou');
    });

    it('should include niche-specific tags', () => {
      const tags = generateHashtags('tiktok', 'AI tools');
      expect(tags.niche.some(t => t.toLowerCase().includes('ai'))).toBe(true);
    });
  });
});
