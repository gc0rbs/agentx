/**
 * Persona Agent
 * LLM content engine: turns a persona + task mode into tweet text via the Claude API.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '../core/logger';
import type { Persona, PersonaMode } from './types';

const logger = createLogger('persona-agent');

export interface PersonaAgentConfig {
  /** Defaults to ANTHROPIC_API_KEY / an `ant auth login` profile */
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export class PersonaAgent {
  private readonly persona: Persona;
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(persona: Persona, config: PersonaAgentConfig = {}, client?: Anthropic) {
    this.persona = persona;
    this.client = client ?? new Anthropic(config.apiKey ? { apiKey: config.apiKey } : {});
    this.model = config.model ?? 'claude-opus-4-8';
    this.maxTokens = config.maxTokens ?? 1024;
  }

  getPersona(): Persona {
    return this.persona;
  }

  /**
   * Generate an original standalone post for a topic.
   */
  async generatePost(topic: string): Promise<GenerateResult> {
    return this.generate('POST', topic);
  }

  /**
   * Reply to a mention. Pass the mention text (and author handle if known).
   */
  async replyToMention(mentionText: string): Promise<GenerateResult> {
    return this.generate('MENTION', mentionText);
  }

  /**
   * Join an ongoing thread. Pass the discussion so far, one line per post.
   */
  async joinThread(threadContext: string): Promise<GenerateResult> {
    return this.generate('THREAD', threadContext);
  }

  private async generate(mode: PersonaMode, input: string): Promise<GenerateResult> {
    logger.info('Generating content', { persona: this.persona.id, mode });

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: [
        {
          type: 'text',
          text: this.persona.systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: `[${mode}]\n${input}` }],
    });

    if (response.stop_reason === 'refusal') {
      throw new Error(`Model refused to generate content for mode ${mode}`);
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (!text) {
      throw new Error('Empty response from model');
    }

    // Voice guard: tweets must fit; the persona never threads unprompted
    const clipped = text.length > 280 ? this.retryShorter(mode, input, text) : text;

    logger.info('Content generated', {
      persona: this.persona.id,
      mode,
      chars: text.length,
      outputTokens: response.usage.output_tokens,
    });

    return {
      text: await clipped,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  /**
   * One retry pass if the first draft exceeded 280 chars.
   */
  private async retryShorter(mode: PersonaMode, input: string, longDraft: string): Promise<string> {
    logger.warn('Draft over 280 chars, requesting shorter version', { chars: longDraft.length });

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: [
        {
          type: 'text',
          text: this.persona.systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        { role: 'user', content: `[${mode}]\n${input}` },
        { role: 'assistant', content: longDraft },
        {
          role: 'user',
          content: 'that ran over 280 characters. rewrite it under 280. keep the sharpest point, cut the rest.',
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    // Last resort: hard truncate at a word boundary
    if (!text || text.length > 280) {
      const source = text || longDraft;
      return source.slice(0, 277).replace(/\s+\S*$/, '') + '…';
    }
    return text;
  }
}

export function createPersonaAgent(
  persona: Persona,
  config?: PersonaAgentConfig,
  client?: Anthropic
): PersonaAgent {
  return new PersonaAgent(persona, config, client);
}
