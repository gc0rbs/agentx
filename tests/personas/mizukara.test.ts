/**
 * Mizukara persona tests — verify the spec's hard facts and safety guards.
 */

import { describe, it, expect } from 'vitest';
import { mizukara, getPersona, PERSONAS } from '../../src/personas';

const CA = '0x407470f85e0b342a52aae2f191e135cef2947777';

describe('mizukara persona', () => {
  it('has correct identity fields', () => {
    expect(mizukara.id).toBe('mizukara');
    expect(mizukara.handle).toBe('mizukaraxyz');
    expect(mizukara.displayName).toBe('Mizukara');
  });

  it('embeds the exact contract address', () => {
    expect(mizukara.systemPrompt).toContain(CA);
  });

  it('embeds the correct chain id', () => {
    expect(mizukara.systemPrompt).toContain('4663');
  });

  it('embeds the sacred tagline', () => {
    expect(mizukara.systemPrompt.toLowerCase()).toContain("don't trust the ai");
    expect(mizukara.systemPrompt.toLowerCase()).toContain('inspect the proof');
  });

  it('carries the no-fabrication safety guard', () => {
    expect(mizukara.systemPrompt).toContain('NO LIVE CHAIN DATA');
    expect(mizukara.systemPrompt).toMatch(/never fabricate/i);
  });

  it('bans hype vocabulary in the voice rules', () => {
    for (const banned of ['WAGMI', 'LFG', '1000x']) {
      expect(mizukara.systemPrompt).toContain(banned);
    }
  });

  it('excludes fabricated-findings topics from the rotation', () => {
    // No topic should reference a specific address, deployer, or trail —
    // those require live data and must not be auto-generated.
    const suspicious = /0x[0-9a-f]{6,}|deployer funded|trail: replay\/[0-9a-f]/i;
    for (const topic of mizukara.postTopics) {
      expect(topic).not.toMatch(suspicious);
    }
  });

  it('has sane rate limits', () => {
    expect(mizukara.maxPostsPerDay).toBeGreaterThan(0);
    expect(mizukara.maxPostsPerDay).toBeLessThanOrEqual(5);
    expect(mizukara.maxRepliesPerHour).toBeGreaterThan(0);
  });
});

describe('persona registry', () => {
  it('registers mizukara and hoodintel', () => {
    expect(PERSONAS.mizukara).toBeDefined();
    expect(PERSONAS.hoodintel).toBeDefined();
  });

  it('getPersona returns a known persona', () => {
    expect(getPersona('mizukara').handle).toBe('mizukaraxyz');
  });

  it('getPersona throws on unknown id with the available list', () => {
    expect(() => getPersona('nope')).toThrow(/Available:/);
  });
});
