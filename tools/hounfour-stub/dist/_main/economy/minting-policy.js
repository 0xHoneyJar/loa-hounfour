/**
 * Minting Policy — governs token creation within a registry.
 *
 * @see SDD §2.5.3 — MintingPolicy Schema
 * @since v6.0.0
 */
import { Type } from '@sinclair/typebox';
export const MintingPolicySchema = Type.Object({
    policy_id: Type.String({ format: 'uuid' }),
    registry_id: Type.String({ format: 'uuid' }),
    mint_authority: Type.String({
        minLength: 1,
        description: 'Agent or entity authorized to mint tokens.',
    }),
    mint_constraints: Type.Array(Type.String(), {
        description: 'Constraint IDs that must pass before minting.',
    }),
    max_mint_per_epoch: Type.String({
        pattern: '^\\d+$',
        description: 'Maximum tokens that can be minted per epoch (string-encoded BigInt).',
    }),
    epoch_seconds: Type.Integer({
        minimum: 1,
        description: 'Duration of one minting epoch in seconds.',
    }),
    requires_governance_approval: Type.Boolean({
        default: false,
        description: 'Whether minting requires governance proposal approval.',
    }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
    $id: 'MintingPolicy',
    additionalProperties: false,
    description: 'Policy governing token creation within an economy registry.',
});
//# sourceMappingURL=minting-policy.js.map