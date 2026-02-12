/**
 * Routing policy schema — shape validation only.
 * Actual pool→provider:model mappings live in loa-finn config.
 *
 * @see SDD 4.5 — Pool Registry
 */
import { Type, type Static } from '@sinclair/typebox';
import { PoolIdSchema } from '../vocabulary/pools.js';

/** Task type for routing decisions. */
export const TaskTypeSchema = Type.Union([
  Type.Literal('chat'),
  Type.Literal('analysis'),
  Type.Literal('architecture'),
  Type.Literal('code'),
  Type.Literal('default'),
], { $id: 'TaskType' });

export type TaskType = Static<typeof TaskTypeSchema>;

/** Per-personality routing configuration. */
export const PersonalityRoutingSchema = Type.Object({
  personality_id: Type.String({ description: 'NFT personality identifier' }),
  task_routing: Type.Record(TaskTypeSchema, PoolIdSchema, {
    description: 'Task type → pool mapping',
  }),
  preferences: Type.Optional(Type.Object({
    temperature: Type.Optional(Type.Number({ minimum: 0, maximum: 2 })),
    max_tokens: Type.Optional(Type.Integer({ minimum: 1 })),
    system_prompt_path: Type.Optional(Type.String()),
  })),
}, { $id: 'PersonalityRouting' });

export type PersonalityRouting = Static<typeof PersonalityRoutingSchema>;

/** Top-level routing policy validated against loa-hounfour. */
export const RoutingPolicySchema = Type.Object({
  version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  personalities: Type.Array(PersonalityRoutingSchema),
}, { $id: 'RoutingPolicy' });

export type RoutingPolicy = Static<typeof RoutingPolicySchema>;
