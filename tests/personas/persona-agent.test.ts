/**
 * Persona Agent Tests
 */

import { describe, it, expect, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { createPersonaAgent, hoodintel } from '../../src/personas';

function mockClient(responses: { text: string; stopReason?: string }[]): Anthropic {
  let call = 0;
  return {
    messages: {
      create: vi.fn().mockImplementation(async () => {
        const r = responses[Math.min(call++, responses.length - 1)];
        return {
          stop_reason: r.stopReason ?? 'end_turn',
          content: [{ type: 'text', text: r.text }],
          usage: { input_tokens: 1000, output_tokens: 50 },
        };
      }),
    },
  } as unknown as Anthropic;
}

describe('hoodintel persona', () => {
  it('has the required fields', () => {
    expect(hoodintel.id).toBe('hoodintel');
    expect(hoodintel.handle).toBe('hoodintel');
    expect(hoodintel.systemPrompt).toContain('Hood Intelligence');
    expect(hoodintel.systemPrompt).toContain('VOICE RULES');
    expect(hoodintel.postTopics.length).toBeGreaterThan(5);
    expect(hoodintel.maxPostsPerDay).toBeGreaterThan(0);
    expect(hoodintel.maxRepliesPerHour).toBeGreaterThan(0);
  });
});

describe('PersonaAgent', () => {
  it('generates a post with mode prefix and system prompt', async () => {
    const client = mockClient([{ text: 'tvl up 7x in two weeks. rwas still $12.8m.' }]);
    const agent = createPersonaAgent(hoodintel, {}, client);

    const result = await agent.generatePost('tvl growth');

    expect(result.text).toBe('tvl up 7x in two weeks. rwas still $12.8m.');
    expect(result.outputTokens).toBe(50);

    const call = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.system[0].text).toContain('Hood Intelligence');
    expect(call.messages[0].content).toBe('[POST]\ntvl growth');
  });

  it('uses MENTION mode for replies', async () => {
    const client = mockClient([{ text: 'chain id 4663. add it as a custom network.' }]);
    const agent = createPersonaAgent(hoodintel, {}, client);

    await agent.replyToMention('@user: what chain id?');

    const call = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.messages[0].content).toContain('[MENTION]');
  });

  it('uses THREAD mode for discussions', async () => {
    const client = mockClient([{ text: 'tvl doesnt lie but neither does the rwa number.' }]);
    const agent = createPersonaAgent(hoodintel, {}, client);

    await agent.joinThread('user1: ghost town\nuser2: fr');

    const call = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.messages[0].content).toContain('[THREAD]');
  });

  it('retries when draft exceeds 280 chars', async () => {
    const longDraft = 'a'.repeat(300);
    const client = mockClient([{ text: longDraft }, { text: 'short version.' }]);
    const agent = createPersonaAgent(hoodintel, {}, client);

    const result = await agent.generatePost('some topic');

    expect(result.text).toBe('short version.');
    expect(client.messages.create).toHaveBeenCalledTimes(2);
  });

  it('hard truncates if retry also runs long', async () => {
    const longDraft = 'word '.repeat(80);
    const client = mockClient([{ text: longDraft }]);
    const agent = createPersonaAgent(hoodintel, {}, client);

    const result = await agent.generatePost('some topic');

    expect(result.text.length).toBeLessThanOrEqual(280);
    expect(result.text.endsWith('…')).toBe(true);
  });

  it('throws on refusal', async () => {
    const client = mockClient([{ text: '', stopReason: 'refusal' }]);
    const agent = createPersonaAgent(hoodintel, {}, client);

    await expect(agent.generatePost('anything')).rejects.toThrow(/refused/);
  });

  it('throws on empty response', async () => {
    const client = mockClient([{ text: '' }]);
    const agent = createPersonaAgent(hoodintel, {}, client);

    await expect(agent.generatePost('anything')).rejects.toThrow(/Empty/);
  });
});
