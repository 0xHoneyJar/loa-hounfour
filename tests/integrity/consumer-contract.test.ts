/**
 * Tests for Consumer-Driven Contract Specification.
 *
 * @see SDD §4.4 — FR-4 Consumer Contracts
 * @see PRD FR-4 — Consumer Contracts
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (uuid, date-time)
import {
  ConsumerContractSchema,
  ConsumerContractEntrypointSchema,
  validateConsumerContract,
  computeContractChecksum,
  type ConsumerContract,
} from '../../src/integrity/consumer-contract.js';

const VALID_CONTRACT: ConsumerContract = {
  consumer: 'loa-finn',
  provider: '@0xhoneyjar/loa-hounfour',
  provider_version_range: '>=8.3.0',
  entrypoints: {
    '@0xhoneyjar/loa-hounfour/core': {
      symbols: ['AgentProfileSchema', 'MessageEnvelopeSchema'],
    },
    '@0xhoneyjar/loa-hounfour/economy': {
      symbols: ['BillingEntrySchema', 'X402QuoteSchema'],
      min_version: '8.3.0',
    },
  },
  generated_at: '2026-02-28T12:00:00Z',
};

const EXPORT_MAP: Record<string, string[]> = {
  '@0xhoneyjar/loa-hounfour/core': [
    'AgentProfileSchema', 'MessageEnvelopeSchema', 'DelegationRequestSchema',
  ],
  '@0xhoneyjar/loa-hounfour/economy': [
    'BillingEntrySchema', 'X402QuoteSchema', 'EscrowSchema',
  ],
  '@0xhoneyjar/loa-hounfour/governance': [
    'SanctionSchema', 'DisputeRecordSchema',
  ],
};

describe('ConsumerContractSchema', () => {
  it('has correct $id', () => {
    expect(ConsumerContractSchema.$id).toBe('ConsumerContract');
  });

  it('validates a correct contract', () => {
    expect(Value.Check(ConsumerContractSchema, VALID_CONTRACT)).toBe(true);
  });

  it('validates contract with checksum', () => {
    const checksum = computeContractChecksum(VALID_CONTRACT);
    expect(Value.Check(ConsumerContractSchema, {
      ...VALID_CONTRACT,
      checksum,
    })).toBe(true);
  });

  it('rejects empty consumer name', () => {
    expect(Value.Check(ConsumerContractSchema, {
      ...VALID_CONTRACT,
      consumer: '',
    })).toBe(false);
  });

  it('rejects wrong provider', () => {
    expect(Value.Check(ConsumerContractSchema, {
      ...VALID_CONTRACT,
      provider: 'wrong-provider',
    })).toBe(false);
  });

  it('rejects empty symbols array', () => {
    expect(Value.Check(ConsumerContractSchema, {
      ...VALID_CONTRACT,
      entrypoints: {
        '@0xhoneyjar/loa-hounfour/core': { symbols: [] },
      },
    })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(ConsumerContractSchema, {
      ...VALID_CONTRACT,
      extra: true,
    })).toBe(false);
  });

  it('rejects invalid checksum format', () => {
    expect(Value.Check(ConsumerContractSchema, {
      ...VALID_CONTRACT,
      checksum: 'md5:abc123',
    })).toBe(false);
  });
});

describe('ConsumerContractEntrypointSchema', () => {
  it('validates entrypoint with symbols', () => {
    expect(Value.Check(ConsumerContractEntrypointSchema, {
      symbols: ['AgentProfileSchema'],
    })).toBe(true);
  });

  it('validates entrypoint with min_version', () => {
    expect(Value.Check(ConsumerContractEntrypointSchema, {
      symbols: ['Foo'],
      min_version: '8.3.0',
    })).toBe(true);
  });

  it('rejects invalid min_version', () => {
    expect(Value.Check(ConsumerContractEntrypointSchema, {
      symbols: ['Foo'],
      min_version: 'latest',
    })).toBe(false);
  });
});

describe('validateConsumerContract', () => {
  it('returns valid for matching contract', () => {
    const result = validateConsumerContract(VALID_CONTRACT, EXPORT_MAP);
    expect(result.valid).toBe(true);
    expect(result.missing_symbols).toEqual([]);
    expect(result.unknown_entrypoints).toEqual([]);
  });

  it('detects missing symbols', () => {
    const contract: ConsumerContract = {
      ...VALID_CONTRACT,
      entrypoints: {
        '@0xhoneyjar/loa-hounfour/core': {
          symbols: ['AgentProfileSchema', 'NonExistentSchema'],
        },
      },
    };
    const result = validateConsumerContract(contract, EXPORT_MAP);
    expect(result.valid).toBe(false);
    expect(result.missing_symbols).toEqual([
      { entrypoint: '@0xhoneyjar/loa-hounfour/core', symbol: 'NonExistentSchema' },
    ]);
  });

  it('detects unknown entrypoints', () => {
    const contract: ConsumerContract = {
      ...VALID_CONTRACT,
      entrypoints: {
        '@0xhoneyjar/loa-hounfour/unknown': {
          symbols: ['SomeSchema'],
        },
      },
    };
    const result = validateConsumerContract(contract, EXPORT_MAP);
    expect(result.valid).toBe(false);
    expect(result.unknown_entrypoints).toEqual(['@0xhoneyjar/loa-hounfour/unknown']);
  });

  it('reports both missing symbols and unknown entrypoints', () => {
    const contract: ConsumerContract = {
      ...VALID_CONTRACT,
      entrypoints: {
        '@0xhoneyjar/loa-hounfour/core': {
          symbols: ['MissingOne'],
        },
        '@0xhoneyjar/loa-hounfour/nonexistent': {
          symbols: ['AnySymbol'],
        },
      },
    };
    const result = validateConsumerContract(contract, EXPORT_MAP);
    expect(result.valid).toBe(false);
    expect(result.missing_symbols.length).toBe(1);
    expect(result.unknown_entrypoints.length).toBe(1);
  });
});

describe('computeContractChecksum', () => {
  it('returns sha256-prefixed hex string', () => {
    const checksum = computeContractChecksum(VALID_CONTRACT);
    expect(checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('is deterministic', () => {
    const a = computeContractChecksum(VALID_CONTRACT);
    const b = computeContractChecksum(VALID_CONTRACT);
    expect(a).toBe(b);
  });

  it('changes when symbols change', () => {
    const modified: ConsumerContract = {
      ...VALID_CONTRACT,
      entrypoints: {
        '@0xhoneyjar/loa-hounfour/core': {
          symbols: ['DifferentSchema'],
        },
      },
    };
    expect(computeContractChecksum(VALID_CONTRACT))
      .not.toBe(computeContractChecksum(modified));
  });

  it('is order-independent (sorted)', () => {
    const contractA: ConsumerContract = {
      ...VALID_CONTRACT,
      entrypoints: {
        'b': { symbols: ['Y'] },
        'a': { symbols: ['X'] },
      },
    };
    const contractB: ConsumerContract = {
      ...VALID_CONTRACT,
      entrypoints: {
        'a': { symbols: ['X'] },
        'b': { symbols: ['Y'] },
      },
    };
    expect(computeContractChecksum(contractA))
      .toBe(computeContractChecksum(contractB));
  });
});
