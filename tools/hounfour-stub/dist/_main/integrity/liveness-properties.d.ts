/**
 * Liveness Properties — F_t-bounded temporal logic for forward progress.
 *
 * Each liveness property complements a corresponding safety invariant (I-*),
 * proving that the system doesn't just avoid bad states, but eventually
 * reaches good ones within bounded time. The F_t operator guarantees
 * "eventually within t seconds".
 *
 * Together with conservation properties (safety), liveness properties form
 * the complete correctness guarantee: safety says "nothing bad happens",
 * liveness says "something good eventually happens".
 *
 * @see SDD §2.1.1–§2.1.6 — Liveness Properties (FR-1)
 * @see arXiv:2512.16856 — Distributional AGI Safety
 * @since v6.0.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * Timeout behavior when a liveness property's F_t bound expires.
 *
 * - reaper: Automated cleanup/forced termination of the pending operation.
 * - escalation: Alert raised to a higher authority (operator, governance).
 * - reconciliation: Drift detected and queued for reconciliation pass.
 * - manual: Requires human intervention to resolve.
 */
export declare const TimeoutBehaviorSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"reaper">, import("@sinclair/typebox").TLiteral<"escalation">, import("@sinclair/typebox").TLiteral<"reconciliation">, import("@sinclair/typebox").TLiteral<"manual">]>;
export type TimeoutBehavior = Static<typeof TimeoutBehaviorSchema>;
export declare const TIMEOUT_BEHAVIORS: readonly TimeoutBehavior[];
/**
 * A single liveness property with F_t-bounded temporal logic specification.
 *
 * Each liveness property pairs with a companion safety invariant (I-*),
 * together forming a complete correctness envelope:
 *   Safety (G): "the bad thing never happens"
 *   Liveness (F_t): "the good thing happens within t seconds"
 */
export declare const LivenessPropertySchema: import("@sinclair/typebox").TObject<{
    liveness_id: import("@sinclair/typebox").TString;
    name: import("@sinclair/typebox").TString;
    description: import("@sinclair/typebox").TString;
    ltl_formula: import("@sinclair/typebox").TString;
    companion_safety: import("@sinclair/typebox").TString;
    universe: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"single_lot">, import("@sinclair/typebox").TLiteral<"account">, import("@sinclair/typebox").TLiteral<"platform">, import("@sinclair/typebox").TLiteral<"bilateral">]>;
    timeout_behavior: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"reaper">, import("@sinclair/typebox").TLiteral<"escalation">, import("@sinclair/typebox").TLiteral<"reconciliation">, import("@sinclair/typebox").TLiteral<"manual">]>;
    timeout_seconds: import("@sinclair/typebox").TInteger;
    error_codes: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"critical">, import("@sinclair/typebox").TLiteral<"error">, import("@sinclair/typebox").TLiteral<"warning">]>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type LivenessProperty = Static<typeof LivenessPropertySchema>;
/**
 * Canonical 6 liveness properties for v6.0.0.
 *
 * Each complements an existing safety invariant, closing the
 * safety-liveness duality for the 6 most critical forward-progress
 * requirements in the protocol.
 *
 * @see SDD §2.1.3 — Canonical liveness properties
 */
export declare const CANONICAL_LIVENESS_PROPERTIES: readonly LivenessProperty[];
//# sourceMappingURL=liveness-properties.d.ts.map