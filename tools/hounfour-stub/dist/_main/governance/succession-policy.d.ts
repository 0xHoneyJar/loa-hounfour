/**
 * SuccessionPolicy — constitutional thresholds for representative-set actions.
 *
 * Pins the four constitutional actions (`amend`, `rotate`, `add`, `remove`)
 * to per-action `threshold` (quorum fraction in [0, 1]) and `cooldown_seconds`
 * (minimum elapsed time between actions of the same kind). The asymmetric
 * ladder + non-decreasing cooldown invariants are declared in
 * `constraints/SuccessionPolicy.constraints.json` (cross-field, library-evaluated).
 *
 * No `self_removal_allowed` field (OQ4 resolution): the SP-007 minimum-rep
 * invariant on `OrgIdentity.current_representatives.length >= 1` blocks the
 * write that would zero out reps; consumer-side runtime models the
 * `governance.delegation.self_removal_pending` lifecycle.
 *
 * @see SDD section 3.4.3 — SuccessionPolicy required fields, cross-field rules
 * @see Issue #61 — Source RFC, OQ4
 * @since v8.4.0 (FR-B3)
 */
import { type Static } from '@sinclair/typebox';
export declare const SuccessionPolicySchema: import("@sinclair/typebox").TObject<{
    policy_id: import("@sinclair/typebox").TString;
    org_id: import("@sinclair/typebox").TString;
    amend: import("@sinclair/typebox").TObject<{
        threshold: import("@sinclair/typebox").TNumber;
        cooldown_seconds: import("@sinclair/typebox").TInteger;
    }>;
    rotate: import("@sinclair/typebox").TObject<{
        threshold: import("@sinclair/typebox").TNumber;
        cooldown_seconds: import("@sinclair/typebox").TInteger;
    }>;
    add: import("@sinclair/typebox").TObject<{
        threshold: import("@sinclair/typebox").TNumber;
        cooldown_seconds: import("@sinclair/typebox").TInteger;
    }>;
    remove: import("@sinclair/typebox").TObject<{
        threshold: import("@sinclair/typebox").TNumber;
        cooldown_seconds: import("@sinclair/typebox").TInteger;
    }>;
    effective_at: import("@sinclair/typebox").TString;
}>;
export type SuccessionPolicy = Static<typeof SuccessionPolicySchema>;
//# sourceMappingURL=succession-policy.d.ts.map