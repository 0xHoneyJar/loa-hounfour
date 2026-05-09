/**
 * Consumer-Driven Contract Specification — schema + validation.
 *
 * Allows downstream consumers (finn, dixie, freeside) to declare which symbols
 * they import from each hounfour entrypoint. The `validateConsumerContract()`
 * function checks these declarations against actual exports, catching drift
 * before it reaches production.
 *
 * @see SDD §4.4 — FR-4 Consumer-Driven Contract Specification
 * @see PRD FR-4 — Consumer Contracts
 * @since v8.3.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * Single entrypoint specification within a consumer contract.
 */
export declare const ConsumerContractEntrypointSchema: import("@sinclair/typebox").TObject<{
    symbols: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    min_version: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type ConsumerContractEntrypoint = Static<typeof ConsumerContractEntrypointSchema>;
/**
 * Consumer-driven contract declaring imported symbols per entrypoint.
 */
export declare const ConsumerContractSchema: import("@sinclair/typebox").TObject<{
    consumer: import("@sinclair/typebox").TString;
    provider: import("@sinclair/typebox").TLiteral<"@0xhoneyjar/loa-hounfour">;
    provider_version_range: import("@sinclair/typebox").TString;
    entrypoints: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TObject<{
        symbols: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        min_version: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    generated_at: import("@sinclair/typebox").TString;
    checksum: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type ConsumerContract = Static<typeof ConsumerContractSchema>;
/**
 * Result of validating a consumer contract against actual exports.
 */
export interface ContractValidationResult {
    valid: boolean;
    missing_symbols: Array<{
        entrypoint: string;
        symbol: string;
    }>;
    unknown_entrypoints: string[];
}
/**
 * Validate a consumer contract against actual hounfour exports.
 *
 * @param contract - The consumer contract to validate
 * @param exportMap - Map of entrypoint → exported symbol names
 * @returns Validation result with details on missing symbols
 */
export declare function validateConsumerContract(contract: ConsumerContract, exportMap: Record<string, string[]>): ContractValidationResult;
/**
 * Compute canonical SHA-256 checksum of all symbols in a consumer contract.
 *
 * Algorithm: sha256(sorted(all_symbol_strings).join('\n'))
 * Deterministic across platforms for drift detection.
 */
export declare function computeContractChecksum(contract: ConsumerContract): string;
//# sourceMappingURL=consumer-contract.d.ts.map