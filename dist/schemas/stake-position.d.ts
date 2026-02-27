import { type Static } from '@sinclair/typebox';
/**
 * Stake position — economic commitment with vesting schedule.
 *
 * Three stake types map to ECSA commitment taxonomy:
 * - conviction: belief in agent quality (reputational stake)
 * - delegation: authority grant (governance stake)
 * - validation: skin-in-the-game (financial stake)
 *
 * @see BB-V4-DEEP-005 — Three economies integration
 */
export declare const StakePositionSchema: import("@sinclair/typebox").TObject<{
    stake_id: import("@sinclair/typebox").TString;
    staker_id: import("@sinclair/typebox").TString;
    target_id: import("@sinclair/typebox").TString;
    amount_micro: import("@sinclair/typebox").TString;
    stake_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"conviction">, import("@sinclair/typebox").TLiteral<"delegation">, import("@sinclair/typebox").TLiteral<"validation">]>;
    vesting: import("@sinclair/typebox").TObject<{
        schedule: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"immediate">, import("@sinclair/typebox").TLiteral<"performance_gated">, import("@sinclair/typebox").TLiteral<"time_gated">]>;
        vested_micro: import("@sinclair/typebox").TString;
        remaining_micro: import("@sinclair/typebox").TString;
    }>;
    staked_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type StakePosition = Static<typeof StakePositionSchema>;
//# sourceMappingURL=stake-position.d.ts.map