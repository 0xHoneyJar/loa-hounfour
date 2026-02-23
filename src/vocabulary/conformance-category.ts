import { Type, type Static } from '@sinclair/typebox';

/**
 * Conformance test categories for provider verification.
 *
 * Each category represents a distinct facet of protocol conformance
 * that providers must pass to achieve higher trust levels.
 */
export const ConformanceCategorySchema = Type.Union(
  [
    Type.Literal('provider-normalization'),
    Type.Literal('pricing-calculation'),
    Type.Literal('thinking-trace'),
    Type.Literal('tool-call-roundtrip'),
    Type.Literal('ensemble-position'),
    Type.Literal('reservation-enforcement'),
    Type.Literal('delegation-chain'),
    Type.Literal('inter-agent-transaction'),
    Type.Literal('conservation-properties'),
    Type.Literal('jwt-boundary'),
    Type.Literal('agent-identity'),
    Type.Literal('capability-scoped-trust'),
    Type.Literal('liveness-properties'),
    Type.Literal('registry-bridge'),
    Type.Literal('delegation-tree'),
    Type.Literal('bridge-transfer-saga'),
    Type.Literal('delegation-outcome'),
    Type.Literal('monetary-policy'),
    Type.Literal('permission-boundary'),
    Type.Literal('governance-proposal'),
    Type.Literal('micro-usdc'),
    Type.Literal('personality-assignment'),
    Type.Literal('reputation-aggregate'),
    Type.Literal('reputation-credential'),
    Type.Literal('access-policy'),
    Type.Literal('event-subscription'),
    Type.Literal('reputation-portability'),
    Type.Literal('delegation-quality'),
    Type.Literal('collection-governance-config'),
  ],
  {
    $id: 'ConformanceCategory',
    description: 'Category of conformance vector for provider verification.',
  },
);

export type ConformanceCategory = Static<typeof ConformanceCategorySchema>;

/** All conformance categories. */
export const CONFORMANCE_CATEGORIES: readonly ConformanceCategory[] = [
  'provider-normalization',
  'pricing-calculation',
  'thinking-trace',
  'tool-call-roundtrip',
  'ensemble-position',
  'reservation-enforcement',
  'delegation-chain',
  'inter-agent-transaction',
  'conservation-properties',
  'jwt-boundary',
  'agent-identity',
  'capability-scoped-trust',
  'liveness-properties',
  'registry-bridge',
  'delegation-tree',
  'bridge-transfer-saga',
  'delegation-outcome',
  'monetary-policy',
  'permission-boundary',
  'governance-proposal',
  'micro-usdc',
  'personality-assignment',
  'reputation-aggregate',
  'reputation-credential',
  'access-policy',
  'event-subscription',
  'reputation-portability',
  'delegation-quality',
  'collection-governance-config',
] as const;
