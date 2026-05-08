/**
 * PR-A3.3 (FR-C3) — Tests for `chain_validator_prev_hash` builtin.
 *
 * Acceptance hooks:
 *   - NA-1: expected_prior_hash mismatch surfaces CHAIN_LEDGER_MISMATCH.
 *
 * @see src/constraints/builtins/chain-validator-prev-hash.ts
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateChainValidatorPrevHash,
  DEFAULT_LEDGER_GENESIS_SENTINEL,
  type ChainLedgerState,
} from '../../src/constraints/builtins/chain-validator-prev-hash.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const validChain = [
  { entry_hash: 'h0', previous_hash: DEFAULT_LEDGER_GENESIS_SENTINEL },
  { entry_hash: 'h1', previous_hash: 'h0' },
  { entry_hash: 'h2', previous_hash: 'h1' },
];

function makeState(overrides: Partial<ChainLedgerState> = {}): ChainLedgerState {
  return {
    expected_prior_hash: new Map<number, string>(),
    ...overrides,
  };
}

describe('evaluateChainValidatorPrevHash (standalone)', () => {
  describe('CHAIN_CONTEXT_DEFERRED', () => {
    it('fires when state is undefined; valid stays true', () => {
      const result = evaluateChainValidatorPrevHash(
        validChain,
        'entry_hash',
        'previous_hash',
        undefined,
      );
      expect(result.valid).toBe(true);
      expect(result.diagnostic?.code).toBe('CHAIN_CONTEXT_DEFERRED');
    });
  });

  describe('Empty / vacuous chains', () => {
    it('empty chain returns valid:true', () => {
      const result = evaluateChainValidatorPrevHash(
        [],
        'entry_hash',
        'previous_hash',
        makeState(),
      );
      expect(result.valid).toBe(true);
      expect(result.diagnostic).toBeUndefined();
    });
  });

  describe('CHAIN_GENESIS_VIOLATION', () => {
    it('fires when first record\'s previous_hash != default sentinel', () => {
      const chain = [
        { entry_hash: 'h0', previous_hash: 'not-genesis' },
        { entry_hash: 'h1', previous_hash: 'h0' },
      ];
      const result = evaluateChainValidatorPrevHash(
        chain,
        'entry_hash',
        'previous_hash',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CHAIN_GENESIS_VIOLATION');
      expect(result.diagnostic?.chain_index).toBe(0);
      expect(result.diagnostic?.expected_value).toBe(DEFAULT_LEDGER_GENESIS_SENTINEL);
    });

    it('respects custom genesis_hash override', () => {
      const customSentinel = 'custom:genesis-anchor';
      const chain = [
        { entry_hash: 'h0', previous_hash: customSentinel },
      ];
      const result = evaluateChainValidatorPrevHash(
        chain,
        'entry_hash',
        'previous_hash',
        makeState({ genesis_hash: customSentinel }),
      );
      expect(result.valid).toBe(true);
    });

    it('default sentinel rejected when state declares custom one', () => {
      const customSentinel = 'custom:genesis-anchor';
      const chain = [
        { entry_hash: 'h0', previous_hash: DEFAULT_LEDGER_GENESIS_SENTINEL },
      ];
      const result = evaluateChainValidatorPrevHash(
        chain,
        'entry_hash',
        'previous_hash',
        makeState({ genesis_hash: customSentinel }),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CHAIN_GENESIS_VIOLATION');
    });
  });

  describe('CHAIN_PREV_HASH_MISMATCH', () => {
    it('fires when successor\'s previous_hash != predecessor\'s entry_hash', () => {
      const chain = [
        { entry_hash: 'h0', previous_hash: DEFAULT_LEDGER_GENESIS_SENTINEL },
        { entry_hash: 'h1', previous_hash: 'WRONG' },
      ];
      const result = evaluateChainValidatorPrevHash(
        chain,
        'entry_hash',
        'previous_hash',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CHAIN_PREV_HASH_MISMATCH');
      expect(result.diagnostic?.chain_index).toBe(1);
      expect(result.diagnostic?.expected_value).toBe('h0');
      expect(result.diagnostic?.chain_value).toBe('WRONG');
    });

    it('fires at the first broken link, not later ones', () => {
      const chain = [
        { entry_hash: 'h0', previous_hash: DEFAULT_LEDGER_GENESIS_SENTINEL },
        { entry_hash: 'h1', previous_hash: 'BAD-1' },
        { entry_hash: 'h2', previous_hash: 'BAD-2' },
      ];
      const result = evaluateChainValidatorPrevHash(
        chain,
        'entry_hash',
        'previous_hash',
        makeState(),
      );
      expect(result.diagnostic?.chain_index).toBe(1);
    });
  });

  describe('CHAIN_LEDGER_MISMATCH (NA-1)', () => {
    it('fires when audit-ledger expected_prior_hash differs from chain previous_hash', () => {
      const expectedPriorHash = new Map<number, string>([
        [1, 'expected-h0'], // ledger says chain[1].previous_hash should be 'expected-h0'
      ]);
      // But chain[1].previous_hash is 'h0' (matches predecessor entry_hash).
      // The ledger's expectation diverges from the chain payload.
      const result = evaluateChainValidatorPrevHash(
        validChain,
        'entry_hash',
        'previous_hash',
        makeState({ expected_prior_hash: expectedPriorHash }),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CHAIN_LEDGER_MISMATCH');
      expect(result.diagnostic?.chain_index).toBe(1);
      expect(result.diagnostic?.chain_value).toBe('h0');
      expect(result.diagnostic?.expected_value).toBe('expected-h0');
    });

    it('does NOT fire when audit ledger has no entry for index (consumer hasn\'t recorded yet)', () => {
      // Ledger empty → no NA-1 cross-check; just chain-internal consistency.
      const result = evaluateChainValidatorPrevHash(
        validChain,
        'entry_hash',
        'previous_hash',
        makeState({ expected_prior_hash: new Map() }),
      );
      expect(result.valid).toBe(true);
    });

    it('does NOT fire when audit ledger entry matches chain payload', () => {
      const expectedPriorHash = new Map<number, string>([
        [0, DEFAULT_LEDGER_GENESIS_SENTINEL],
        [1, 'h0'],
        [2, 'h1'],
      ]);
      const result = evaluateChainValidatorPrevHash(
        validChain,
        'entry_hash',
        'previous_hash',
        makeState({ expected_prior_hash: expectedPriorHash }),
      );
      expect(result.valid).toBe(true);
    });

    it('NA-1 fires at the FIRST divergence index (not the last)', () => {
      const expectedPriorHash = new Map<number, string>([
        [1, 'WRONG-1'], // first divergence at index 1
        [2, 'WRONG-2'], // also wrong at 2 but should not be reached
      ]);
      const result = evaluateChainValidatorPrevHash(
        validChain,
        'entry_hash',
        'previous_hash',
        makeState({ expected_prior_hash: expectedPriorHash }),
      );
      expect(result.diagnostic?.code).toBe('CHAIN_LEDGER_MISMATCH');
      expect(result.diagnostic?.chain_index).toBe(1);
    });
  });

  describe('Happy path', () => {
    it('valid chain with no audit-ledger expectations passes', () => {
      const result = evaluateChainValidatorPrevHash(
        validChain,
        'entry_hash',
        'previous_hash',
        makeState(),
      );
      expect(result.valid).toBe(true);
      expect(result.diagnostic).toBeUndefined();
    });

    it('single-record chain at genesis passes', () => {
      const result = evaluateChainValidatorPrevHash(
        [{ entry_hash: 'h0', previous_hash: DEFAULT_LEDGER_GENESIS_SENTINEL }],
        'entry_hash',
        'previous_hash',
        makeState(),
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('CHAIN_INVALID_INPUT', () => {
    it('rejects non-array chain', () => {
      const result = evaluateChainValidatorPrevHash(
        'not-an-array',
        'entry_hash',
        'previous_hash',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CHAIN_INVALID_INPUT');
    });

    it('rejects record without string entry_hash', () => {
      const chain = [
        { entry_hash: 42, previous_hash: DEFAULT_LEDGER_GENESIS_SENTINEL },
      ];
      const result = evaluateChainValidatorPrevHash(
        chain,
        'entry_hash',
        'previous_hash',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CHAIN_INVALID_INPUT');
    });

    it('rejects null record in chain', () => {
      const chain = [
        { entry_hash: 'h0', previous_hash: DEFAULT_LEDGER_GENESIS_SENTINEL },
        null,
      ];
      const result = evaluateChainValidatorPrevHash(
        chain,
        'entry_hash',
        'previous_hash',
        makeState(),
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CHAIN_INVALID_INPUT');
      expect(result.diagnostic?.chain_index).toBe(1);
    });
  });
});

describe('chain_validator_prev_hash (constraint-DSL wrapper)', () => {
  it('returns true when state is absent (deferred → DSL passes)', () => {
    const data = { chain: validChain };
    const result = evaluateConstraint(
      data,
      "chain_validator_prev_hash(chain, 'entry_hash', 'previous_hash')",
    );
    expect(result).toBe(true);
  });

  it('returns false when chain has broken link', () => {
    const data = {
      chain: [
        { entry_hash: 'h0', previous_hash: DEFAULT_LEDGER_GENESIS_SENTINEL },
        { entry_hash: 'h1', previous_hash: 'WRONG' },
      ],
    };
    const result = evaluateConstraint(
      data,
      "chain_validator_prev_hash(chain, 'entry_hash', 'previous_hash')",
      { chain_ledger: makeState() },
    );
    expect(result).toBe(false);
  });

  it('returns false when audit ledger diverges (NA-1)', () => {
    const data = { chain: validChain };
    const result = evaluateConstraint(
      data,
      "chain_validator_prev_hash(chain, 'entry_hash', 'previous_hash')",
      {
        chain_ledger: makeState({
          expected_prior_hash: new Map<number, string>([[1, 'WRONG']]),
        }),
      },
    );
    expect(result).toBe(false);
  });
});
