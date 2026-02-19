import { Type, type Static } from '@sinclair/typebox';

/**
 * Reconciliation mode for billing-pricing alignment.
 *
 * - `protocol_authoritative`: Protocol's computed cost is the source of truth.
 * - `provider_invoice_authoritative`: Provider's actual invoice is authoritative;
 *   protocol records computed cost and delta for reconciliation.
 */
export const ReconciliationModeSchema = Type.Union(
  [
    Type.Literal('protocol_authoritative'),
    Type.Literal('provider_invoice_authoritative'),
  ],
  {
    $id: 'ReconciliationMode',
    description: 'Billing reconciliation mode — determines cost source of truth.',
  },
);

export type ReconciliationMode = Static<typeof ReconciliationModeSchema>;

/** All reconciliation modes. */
export const RECONCILIATION_MODES: readonly ReconciliationMode[] = [
  'protocol_authoritative',
  'provider_invoice_authoritative',
] as const;
