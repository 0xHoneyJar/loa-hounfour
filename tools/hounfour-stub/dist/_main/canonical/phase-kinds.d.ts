/**
 * `PhaseKindSchema` — controlled-vocabulary classifying a phase
 * within a `CanonicalRunSchema.required_phases[*]` entry (FR-B1,
 * v8.6.0).
 *
 * The five exhaustive members name the canonical phase progression
 * a producer walks through:
 *
 *   - `discovery` — initial information-gathering / requirement
 *     elicitation; precedes design.
 *   - `design` — architectural / interface decisions captured before
 *     implementation begins.
 *   - `implement` — production of the deliverable artifact (code,
 *     schema, doc, dataset).
 *   - `audit` — independent validation pass against the design /
 *     acceptance criteria.
 *   - `ship` — terminal phase; deliverable is released or merged
 *     into the canonical record.
 *
 * The enum is exhaustive at the v8.6.0 ship line. Widening is
 * strict-additive — existing consumers continue to validate older
 * payloads against the narrower enum (a new label is a no-match
 * → invalid), and new consumers see the widened set.
 *
 * @since v8.6.0 — FR-B1 (PR-A3.8)
 */
import { type Static } from '@sinclair/typebox';
/**
 * Canonical exhaustive list of `PhaseKind` enum members.
 *
 * Single source of truth — both `PhaseKindSchema` (built from this
 * list) and the conformance vector suite consume the same array, so
 * widening or reordering produces a single-edit diff. The pattern
 * mirrors `CHALLENGE_TYPES` / `CHALLENGE_REQUESTED_EFFECTS` from
 * PR-A3.7 (FR-A1) — see `src/governance/challenge-types.ts`.
 *
 * @since v8.6.0 — FR-B1 (PR-A3.8)
 */
export declare const PHASE_KINDS: readonly ["discovery", "design", "implement", "audit", "ship"];
export declare const PhaseKindSchema: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"audit" | "discovery" | "design" | "implement" | "ship">[]>;
export type PhaseKind = Static<typeof PhaseKindSchema>;
//# sourceMappingURL=phase-kinds.d.ts.map