import { Type, type Static } from '@sinclair/typebox';
import { NftIdSchema } from '../utilities/nft-id.js';

/**
 * Personality tier classification for agent bears.
 *
 * @see SDD §2.2 — PersonalityAssignment Schema (FR-2)
 */
export const PersonalityTierSchema = Type.Union([
  Type.Literal('basic'),
  Type.Literal('standard'),
  Type.Literal('premium'),
], { $id: 'PersonalityTier' });

export type PersonalityTier = Static<typeof PersonalityTierSchema>;

/**
 * Personality assignment binding an NFT to its personality configuration.
 *
 * Fields `archetype`, `ancestor`, `era`, and `element` are extensible strings —
 * the protocol defines structure, not domain vocabulary. Exact enum values
 * live in the consuming service's personality configuration.
 *
 * @see SDD §2.2 — PersonalityAssignment Schema (FR-2)
 */
export const PersonalityAssignmentSchema = Type.Object({
  token_id: NftIdSchema,

  archetype: Type.String({
    minLength: 1,
    description: 'Personality archetype identifier. Values are domain-specific.',
  }),

  ancestor: Type.String({
    minLength: 1,
    description: 'Ancestor reference for personality lineage.',
  }),

  era: Type.String({
    minLength: 1,
    description: 'Historical era classification.',
  }),

  element: Type.String({
    minLength: 1,
    description: 'Elemental affinity classification.',
  }),

  tier: PersonalityTierSchema,

  fingerprint_hash: Type.String({
    pattern: '^[a-f0-9]{64}$',
    description: 'SHA-256 fingerprint of personality configuration (lowercase hex).',
  }),
}, {
  $id: 'PersonalityAssignment',
  additionalProperties: false,
});

export type PersonalityAssignment = Static<typeof PersonalityAssignmentSchema>;
