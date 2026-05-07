/**
 * `RiskLevel` — risk classification for `Assertion` payloads.
 *
 * Four substrate-agnostic ordinal levels covering the spectrum from
 * routine to severe. The classification is vocabulary only; *risk
 * thresholds* (what triggers panel routing, sanctions, escalation)
 * are consumer-side per ADR-010.
 *
 * Member set locked in PR-A2.3 reuse-audit.
 *
 * @see AssertionSchema
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.3)
 */
import { Type, type Static } from '@sinclair/typebox';

export const RiskLevelSchema = Type.Union(
  [
    Type.Literal('routine', {
      description: 'No elevated risk; routine assertion handling.',
    }),
    Type.Literal('elevated', {
      description: 'Elevated risk; consumer policy may require additional review.',
    }),
    Type.Literal('high', {
      description: 'High risk; consumer policy typically requires panel review or asymmetric blocker treatment.',
    }),
    Type.Literal('severe', {
      description: 'Severe risk; consumer policy typically requires immediate halt + sanction review.',
    }),
  ],
  {
    $id: 'RiskLevel',
    description:
      'Risk classification for Assertion payloads. Four ordinal levels: routine | elevated | high | severe. Vocabulary only — risk thresholds are consumer-side.',
  },
);

export type RiskLevel = Static<typeof RiskLevelSchema>;
