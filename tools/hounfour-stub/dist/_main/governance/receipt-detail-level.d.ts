/**
 * `ReceiptDetailLevel` — verbosity selector for `RecallReceipt`.
 *
 * Three substrate-agnostic levels covering the spectrum from
 * minimum-disclosure receipt to debug-level introspection. The
 * level chosen on the `RecallRequest` is echoed back on the
 * matching `RecallReceipt` so the recipient can match outgoing
 * detail expectations against incoming receipts.
 *
 * Hounfour does not constrain *what content* a level implies —
 * the consumer's audit policy decides what fields populate each
 * level; per ADR-010 the library ships shape, not policy.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.3)
 */
import { type Static } from '@sinclair/typebox';
export declare const ReceiptDetailLevelSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"minimal">, import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"debug">]>;
export type ReceiptDetailLevel = Static<typeof ReceiptDetailLevelSchema>;
//# sourceMappingURL=receipt-detail-level.d.ts.map