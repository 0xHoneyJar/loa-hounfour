import { type Static } from '@sinclair/typebox';
/**
 * Reconciliation mode for billing-pricing alignment.
 *
 * - `protocol_authoritative`: Protocol's computed cost is the source of truth.
 * - `provider_invoice_authoritative`: Provider's actual invoice is authoritative;
 *   protocol records computed cost and delta for reconciliation.
 */
export declare const ReconciliationModeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"protocol_authoritative">, import("@sinclair/typebox").TLiteral<"provider_invoice_authoritative">]>;
export type ReconciliationMode = Static<typeof ReconciliationModeSchema>;
/** All reconciliation modes. */
export declare const RECONCILIATION_MODES: readonly ReconciliationMode[];
//# sourceMappingURL=reconciliation-mode.d.ts.map