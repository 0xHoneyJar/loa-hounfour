/**
 * Minting Policy — governs token creation within a registry.
 *
 * @see SDD §2.5.3 — MintingPolicy Schema
 * @since v6.0.0
 */
import { type Static } from '@sinclair/typebox';
export declare const MintingPolicySchema: import("@sinclair/typebox").TObject<{
    policy_id: import("@sinclair/typebox").TString;
    registry_id: import("@sinclair/typebox").TString;
    mint_authority: import("@sinclair/typebox").TString;
    mint_constraints: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    max_mint_per_epoch: import("@sinclair/typebox").TString;
    epoch_seconds: import("@sinclair/typebox").TInteger;
    requires_governance_approval: import("@sinclair/typebox").TBoolean;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type MintingPolicy = Static<typeof MintingPolicySchema>;
//# sourceMappingURL=minting-policy.d.ts.map