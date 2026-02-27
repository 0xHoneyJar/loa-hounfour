/**
 * AuditTrailEntry schema — bidirectional provenance linking completions to billing.
 *
 * Every AI inference completion produces a billing entry. The AuditTrailEntry
 * provides the bidirectional link: given a completion you can find the bill,
 * and given a bill you can find the completion. This is the "receipt" that
 * proves conservation of value across the inference pipeline.
 *
 * @see SDD §3.7 — AuditTrailEntry
 */
import { type Static } from '@sinclair/typebox';
/**
 * Bidirectional provenance entry linking completion → billing → conservation.
 */
export declare const AuditTrailEntrySchema: import("@sinclair/typebox").TObject<{
    entry_id: import("@sinclair/typebox").TString;
    completion_id: import("@sinclair/typebox").TString;
    billing_entry_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    provider: import("@sinclair/typebox").TString;
    model_id: import("@sinclair/typebox").TString;
    cost_micro: import("@sinclair/typebox").TString;
    timestamp: import("@sinclair/typebox").TString;
    conservation_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"conserved">, import("@sinclair/typebox").TLiteral<"violated">, import("@sinclair/typebox").TLiteral<"unverifiable">]>;
    contract_version: import("@sinclair/typebox").TString;
    metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
}>;
export type AuditTrailEntry = Static<typeof AuditTrailEntrySchema>;
//# sourceMappingURL=audit-trail-entry.d.ts.map