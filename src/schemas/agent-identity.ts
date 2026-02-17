/**
 * Agent Identity Schema — canonical identity for protocol participants.
 *
 * Defines the trust model, agent types, and identity structure for all
 * entities participating in the agent economy. Trust levels gate delegation
 * authority — only agents at 'verified' or above may delegate.
 *
 * @see SDD §2.6 — Agent Identity (FR-6)
 * @since v5.5.0
 */
import { Type, type Static } from '@sinclair/typebox';

/**
 * Trust level assigned to an agent.
 *
 * Trust levels form a total order: untrusted < basic < verified < trusted < sovereign.
 * Delegation requires 'verified' or above (DELEGATION_TRUST_THRESHOLD).
 */
export const TrustLevelSchema = Type.Union(
  [
    Type.Literal('untrusted'),
    Type.Literal('basic'),
    Type.Literal('verified'),
    Type.Literal('trusted'),
    Type.Literal('sovereign'),
  ],
  {
    $id: 'TrustLevel',
    description: 'Trust level assigned to an agent. Forms a total order from untrusted to sovereign.',
  },
);

export type TrustLevel = Static<typeof TrustLevelSchema>;

/**
 * Ordered trust levels for comparison.
 */
export const TRUST_LEVELS = ['untrusted', 'basic', 'verified', 'trusted', 'sovereign'] as const;

/**
 * Minimum trust level required for delegation authority.
 */
export const DELEGATION_TRUST_THRESHOLD: TrustLevel = 'verified';

/**
 * Agent type classification.
 */
export const AgentTypeSchema = Type.Union(
  [
    Type.Literal('model'),
    Type.Literal('orchestrator'),
    Type.Literal('human'),
    Type.Literal('service'),
    Type.Literal('composite'),
  ],
  {
    $id: 'AgentType',
    description: 'Classification of agent type in the protocol.',
  },
);

export type AgentType = Static<typeof AgentTypeSchema>;

/**
 * Canonical agent identity schema.
 */
export const AgentIdentitySchema = Type.Object(
  {
    agent_id: Type.String({
      pattern: '^[a-z][a-z0-9_-]{2,63}$',
      description: 'Unique agent identifier (lowercase, 3-64 chars).',
    }),
    display_name: Type.String({
      minLength: 1,
      maxLength: 128,
      description: 'Human-readable agent display name.',
    }),
    agent_type: AgentTypeSchema,
    capabilities: Type.Array(Type.String({ minLength: 1 }), {
      minItems: 1,
      description: 'Non-empty list of agent capabilities.',
    }),
    trust_level: TrustLevelSchema,
    delegation_authority: Type.Array(Type.String({ minLength: 1 }), {
      description: 'Permissions this agent may delegate to others. Requires trust_level >= verified.',
    }),
    max_delegation_depth: Type.Integer({
      minimum: 0,
      maximum: 10,
      description: 'Maximum delegation chain depth this agent may create.',
    }),
    governance_weight: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Voting weight in governance proposals (0-1).',
    }),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown(), {
      description: 'Extensible metadata key-value store.',
    })),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Protocol contract version.',
    }),
  },
  {
    $id: 'AgentIdentity',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description: 'Canonical agent identity for protocol participants with trust-gated delegation.',
  },
);

export type AgentIdentity = Static<typeof AgentIdentitySchema>;

/**
 * Get the ordinal index of a trust level in the hierarchy.
 * untrusted=0, basic=1, verified=2, trusted=3, sovereign=4.
 */
export function trustLevelIndex(level: TrustLevel): number {
  const idx = TRUST_LEVELS.indexOf(level);
  if (idx === -1) throw new RangeError(`Unknown trust level: ${level}`);
  return idx;
}

/**
 * Check if a trust level meets or exceeds a required threshold.
 */
export function meetsThreshold(level: TrustLevel, threshold: TrustLevel): boolean {
  return trustLevelIndex(level) >= trustLevelIndex(threshold);
}
