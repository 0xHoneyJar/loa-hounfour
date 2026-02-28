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
import { Type, type Static } from '@sinclair/typebox';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

/**
 * Single entrypoint specification within a consumer contract.
 */
export const ConsumerContractEntrypointSchema = Type.Object(
  {
    symbols: Type.Array(Type.String({ minLength: 1 }), {
      minItems: 1,
      description: 'Imported symbol names from this entrypoint.',
    }),
    min_version: Type.Optional(Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Per-entrypoint minimum version requirement.',
    })),
  },
  { additionalProperties: false },
);

export type ConsumerContractEntrypoint = Static<typeof ConsumerContractEntrypointSchema>;

/**
 * Consumer-driven contract declaring imported symbols per entrypoint.
 */
export const ConsumerContractSchema = Type.Object(
  {
    consumer: Type.String({ minLength: 1 }),
    provider: Type.Literal('@0xhoneyjar/loa-hounfour'),
    provider_version_range: Type.String({
      minLength: 1,
      description: 'Semver range (e.g., ">=8.2.0").',
    }),
    entrypoints: Type.Record(
      Type.String(),
      ConsumerContractEntrypointSchema,
      {
        description: 'Map of entrypoint paths to consumed symbols.',
      },
    ),
    generated_at: Type.String({ format: 'date-time' }),
    checksum: Type.Optional(Type.String({
      pattern: '^sha256:[a-f0-9]{64}$',
      description: 'SHA-256 of sorted symbol list for drift detection.',
    })),
  },
  {
    $id: 'ConsumerContract',
    additionalProperties: false,
    description: 'Consumer-driven contract declaring imported symbols per entrypoint.',
  },
);

export type ConsumerContract = Static<typeof ConsumerContractSchema>;

/**
 * Result of validating a consumer contract against actual exports.
 */
export interface ContractValidationResult {
  valid: boolean;
  missing_symbols: Array<{ entrypoint: string; symbol: string }>;
  unknown_entrypoints: string[];
}

/**
 * Validate a consumer contract against actual hounfour exports.
 *
 * @param contract - The consumer contract to validate
 * @param exportMap - Map of entrypoint → exported symbol names
 * @returns Validation result with details on missing symbols
 */
export function validateConsumerContract(
  contract: ConsumerContract,
  exportMap: Record<string, string[]>,
): ContractValidationResult {
  const missing: ContractValidationResult['missing_symbols'] = [];
  const unknown: string[] = [];

  for (const [entrypoint, spec] of Object.entries(contract.entrypoints)) {
    const exports = exportMap[entrypoint];
    if (!exports) {
      unknown.push(entrypoint);
      continue;
    }
    for (const sym of spec.symbols) {
      if (!exports.includes(sym)) {
        missing.push({ entrypoint, symbol: sym });
      }
    }
  }

  return {
    valid: missing.length === 0 && unknown.length === 0,
    missing_symbols: missing,
    unknown_entrypoints: unknown,
  };
}

/**
 * Compute canonical SHA-256 checksum of all symbols in a consumer contract.
 *
 * Algorithm: sha256(sorted(all_symbol_strings).join('\n'))
 * Deterministic across platforms for drift detection.
 */
export function computeContractChecksum(contract: ConsumerContract): string {
  const allSymbols: string[] = [];
  for (const [entrypoint, spec] of Object.entries(contract.entrypoints)) {
    for (const sym of spec.symbols) {
      allSymbols.push(`${entrypoint}:${sym}`);
    }
  }
  allSymbols.sort();
  const hash = sha256(new TextEncoder().encode(allSymbols.join('\n')));
  return `sha256:${bytesToHex(hash)}`;
}
