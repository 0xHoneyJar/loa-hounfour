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
import { Type } from '@sinclair/typebox';
export const ReceiptDetailLevelSchema = Type.Union([
    Type.Literal('minimal', {
        description: 'Receipt carries only the pack_hash + signature_envelope; no item-level enumeration.',
    }),
    Type.Literal('standard', {
        description: 'Receipt carries item-level acknowledgment + redaction summary; the default verbosity.',
    }),
    Type.Literal('debug', {
        description: 'Receipt carries every consumer-side trace point; intended for non-production audit + integration testing.',
    }),
], {
    $id: 'ReceiptDetailLevel',
    description: 'Verbosity selector for RecallReceipt. Three substrate-agnostic levels: minimal | standard | debug. The consumer\'s audit policy decides what fields populate each level; the library ships only the selector vocabulary.',
});
//# sourceMappingURL=receipt-detail-level.js.map