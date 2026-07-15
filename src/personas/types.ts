/**
 * Persona definition types
 * A persona is a complete voice + knowledge package an agent can post as.
 */

export type PersonaMode = 'MENTION' | 'THREAD' | 'POST';

export interface Persona {
  /** Unique key, e.g. 'hoodintel' */
  id: string;
  /** X handle without @ */
  handle: string;
  displayName: string;
  /** Full system prompt: identity, knowledge base, voice rules, task modes */
  systemPrompt: string;
  /** Topics the agent rotates through for original [POST] content */
  postTopics: string[];
  /** Max posts per day for this persona */
  maxPostsPerDay: number;
  /** Max mention replies per hour (spam guard) */
  maxRepliesPerHour: number;
}
