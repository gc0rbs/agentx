/**
 * Persona Exports
 */

import { hoodintel } from './hoodintel';
import type { Persona } from './types';

export { PersonaAgent, createPersonaAgent } from './persona-agent';
export type { PersonaAgentConfig, GenerateResult } from './persona-agent';
export { hoodintel } from './hoodintel';
export type { Persona, PersonaMode } from './types';

/** Registry of all personas, keyed by id. */
export const PERSONAS: Record<string, Persona> = {
  [hoodintel.id]: hoodintel,
};

/** Look up a persona by id; throws with the available list if unknown. */
export function getPersona(id: string): Persona {
  const persona = PERSONAS[id];
  if (!persona) {
    throw new Error(
      `Unknown persona "${id}". Available: ${Object.keys(PERSONAS).join(', ')}`
    );
  }
  return persona;
}
