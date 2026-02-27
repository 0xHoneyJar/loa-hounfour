/**
 * GovernedCredits — governed credit lot schema.
 *
 * Maps to loa-freeside's lot_invariant (I-1 through I-5).
 * Conservation law: balance + reserved + consumed == original_allocation.
 *
 * @see SDD §4.5.1 — GovernedCredits
 * @since v8.0.0
 */
import { Type } from '@sinclair/typebox';
import { GOVERNED_RESOURCE_FIELDS } from './governed-resource.js';
/**
 * Governed credit lot with conservation law enforcement.
 *
 * All financial values are string-encoded micro-USD (^[0-9]+$) — no floating point.
 */
export const GovernedCreditsSchema = Type.Object({
    lot_id: Type.String({ format: 'uuid' }),
    balance: Type.String({
        pattern: '^[0-9]+$',
        description: 'Current balance in micro-USD. String-encoded, no floating point.',
    }),
    original_allocation: Type.String({ pattern: '^[0-9]+$' }),
    reserved: Type.String({ pattern: '^[0-9]+$' }),
    consumed: Type.String({ pattern: '^[0-9]+$' }),
    currency: Type.Literal('micro-usd'),
    ...GOVERNED_RESOURCE_FIELDS,
}, {
    $id: 'GovernedCredits',
    additionalProperties: false,
    description: 'Governed credit lot — maps to loa-freeside lot_invariant (I-1 through I-5). '
        + 'Conservation law: balance + reserved + consumed == original_allocation.',
});
//# sourceMappingURL=governed-credits.js.map