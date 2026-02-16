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
] as const;
