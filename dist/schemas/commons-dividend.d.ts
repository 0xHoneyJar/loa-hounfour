import { type Static } from '@sinclair/typebox';
/**
 * CommonsDividend schema — commons pool dividend declaration and distribution.
 *
 * `dividend_id` uses `minLength: 1` (consumer-provided opaque identifier).
 * Consumers may use any format (ULID, nanoid, UUID, etc.) — the protocol
 * does not enforce a specific ID shape. Compare with `escrow_id` / `stake_id`
 * which use `UUID_V4_PATTERN` because they are protocol-generated.
 */
export declare const CommonsDividendSchema: import("@sinclair/typebox").TObject<{
    dividend_id: import("@sinclair/typebox").TString;
    pool_id: import("@sinclair/typebox").TString;
    total_micro: import("@sinclair/typebox").TString;
    governance: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"mod_discretion">, import("@sinclair/typebox").TLiteral<"member_vote">, import("@sinclair/typebox").TLiteral<"algorithmic">, import("@sinclair/typebox").TLiteral<"stake_weighted">]>;
    period_start: import("@sinclair/typebox").TString;
    period_end: import("@sinclair/typebox").TString;
    source_performance_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    distribution: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        recipients: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            address: import("@sinclair/typebox").TString;
            role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider">, import("@sinclair/typebox").TLiteral<"platform">, import("@sinclair/typebox").TLiteral<"producer">, import("@sinclair/typebox").TLiteral<"agent_tba">, import("@sinclair/typebox").TLiteral<"agent_performer">, import("@sinclair/typebox").TLiteral<"commons">]>;
            share_bps: import("@sinclair/typebox").TInteger;
            amount_micro: import("@sinclair/typebox").TString;
        }>>;
    }>>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type CommonsDividend = Static<typeof CommonsDividendSchema>;
//# sourceMappingURL=commons-dividend.d.ts.map