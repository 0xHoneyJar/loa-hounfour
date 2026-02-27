/**
 * QuarantineRecord — records quarantined audit trail entries.
 *
 * When a hash chain discontinuity is detected, affected entries after
 * the break are quarantined. The QuarantineRecord tracks the lifecycle:
 * active → reconciled → dismissed.
 *
 * @see SDD §4.8.2 — QuarantineRecord
 * @since v8.0.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * Quarantine lifecycle status.
 *
 * @governance protocol-fixed
 */
export declare const QuarantineStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"reconciled">, import("@sinclair/typebox").TLiteral<"dismissed">]>;
export type QuarantineStatus = Static<typeof QuarantineStatusSchema>;
/**
 * Record of quarantined audit trail entries.
 */
export declare const QuarantineRecordSchema: import("@sinclair/typebox").TObject<{
    quarantine_id: import("@sinclair/typebox").TString;
    discontinuity_id: import("@sinclair/typebox").TString;
    resource_type: import("@sinclair/typebox").TString;
    resource_id: import("@sinclair/typebox").TString;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"reconciled">, import("@sinclair/typebox").TLiteral<"dismissed">]>;
    quarantined_at: import("@sinclair/typebox").TString;
    resolved_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    first_affected_index: import("@sinclair/typebox").TInteger;
    last_affected_index: import("@sinclair/typebox").TInteger;
    resolution_notes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type QuarantineRecord = Static<typeof QuarantineRecordSchema>;
//# sourceMappingURL=quarantine.d.ts.map