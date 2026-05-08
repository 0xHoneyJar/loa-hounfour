/**
 * PR-A3.5 iter-1 F-002 (FR-B3) — Tests for `utf8_byte_length_max`
 * LOCAL builtin.
 *
 * @see src/constraints/builtins/utf8-byte-length-max.ts
 */
import { describe, it, expect } from 'vitest';
import { evaluateUtf8ByteLengthMax } from '../../src/constraints/builtins/utf8-byte-length-max.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

describe('evaluateUtf8ByteLengthMax (standalone)', () => {
  describe('Happy path — ASCII', () => {
    it('empty string passes any positive cap', () => {
      const result = evaluateUtf8ByteLengthMax('', 4096);
      expect(result.valid).toBe(true);
      expect(result.diagnostic).toBeUndefined();
    });

    it('short ASCII passes', () => {
      const result = evaluateUtf8ByteLengthMax('hello world', 4096);
      expect(result.valid).toBe(true);
    });

    it('exactly cap-bytes passes (≤ inclusive)', () => {
      const value = 'a'.repeat(4096);
      const result = evaluateUtf8ByteLengthMax(value, 4096);
      expect(result.valid).toBe(true);
    });

    it('cap-minus-one passes', () => {
      const result = evaluateUtf8ByteLengthMax('a'.repeat(4095), 4096);
      expect(result.valid).toBe(true);
    });
  });

  describe('Multi-byte input — the F-002 wire bug', () => {
    it('a 4096-emoji string (4096 code units, ~16 KB UTF-8) FAILS the 4096 BYTE cap', () => {
      // Pile-of-poo emoji `\u{1F4A9}` encodes to 4 UTF-8 bytes per occurrence.
      // 4096 occurrences = 4096 UTF-16 code units BUT 16384 UTF-8 bytes.
      // JSON Schema's `maxLength: 4096` would PASS this; the byte-length
      // check MUST reject it.
      const value = '\u{1F4A9}'.repeat(4096);
      expect(value.length).toBe(8192); // 4096 codepoints, each 2 surrogate code units in JS
      const result = evaluateUtf8ByteLengthMax(value, 4096);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('UTF8_BYTE_LENGTH_EXCEEDED');
      expect(result.diagnostic?.actual_bytes).toBe(16384);
      expect(result.diagnostic?.cap_bytes).toBe(4096);
    });

    it('CJK string consumes 3 UTF-8 bytes per char', () => {
      // 100 occurrences of 你 (3 UTF-8 bytes each) = 300 bytes, length === 100 code units
      const value = '你'.repeat(100);
      expect(value.length).toBe(100);
      const at300 = evaluateUtf8ByteLengthMax(value, 300);
      expect(at300.valid).toBe(true);
      const at299 = evaluateUtf8ByteLengthMax(value, 299);
      expect(at299.valid).toBe(false);
      expect(at299.diagnostic?.actual_bytes).toBe(300);
    });

    it('mixed ASCII + emoji counts each correctly', () => {
      // "a" (1 byte) + "💩" (4 bytes) = 5 bytes total
      const value = 'a\u{1F4A9}';
      expect(evaluateUtf8ByteLengthMax(value, 5).valid).toBe(true);
      expect(evaluateUtf8ByteLengthMax(value, 4).valid).toBe(false);
    });

    it('actual_bytes diagnostic is exact', () => {
      const value = '\u{1F4A9}\u{1F4A9}\u{1F4A9}'; // 12 bytes
      const result = evaluateUtf8ByteLengthMax(value, 8);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.actual_bytes).toBe(12);
      expect(result.diagnostic?.cap_bytes).toBe(8);
    });
  });

  describe('Invalid input — non-string value', () => {
    it('number returns INVALID_INPUT', () => {
      const result = evaluateUtf8ByteLengthMax(42 as unknown as string, 4096);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('UTF8_BYTE_LENGTH_INVALID_INPUT');
    });

    it('null returns INVALID_INPUT', () => {
      const result = evaluateUtf8ByteLengthMax(null as unknown as string, 4096);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('UTF8_BYTE_LENGTH_INVALID_INPUT');
    });

    it('undefined returns INVALID_INPUT', () => {
      const result = evaluateUtf8ByteLengthMax(undefined as unknown as string, 4096);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('UTF8_BYTE_LENGTH_INVALID_INPUT');
    });

    it('object returns INVALID_INPUT', () => {
      const result = evaluateUtf8ByteLengthMax({} as unknown as string, 4096);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('UTF8_BYTE_LENGTH_INVALID_INPUT');
    });
  });

  describe('Invalid input — non-positive-integer cap', () => {
    it('zero cap rejected', () => {
      const result = evaluateUtf8ByteLengthMax('hi', 0);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('UTF8_BYTE_LENGTH_INVALID_INPUT');
    });

    it('negative cap rejected', () => {
      const result = evaluateUtf8ByteLengthMax('hi', -1);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('UTF8_BYTE_LENGTH_INVALID_INPUT');
    });

    it('non-integer cap rejected', () => {
      const result = evaluateUtf8ByteLengthMax('hi', 4096.5);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('UTF8_BYTE_LENGTH_INVALID_INPUT');
    });

    it('NaN cap rejected', () => {
      const result = evaluateUtf8ByteLengthMax('hi', Number.NaN);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('UTF8_BYTE_LENGTH_INVALID_INPUT');
    });

    it('Infinity cap rejected', () => {
      const result = evaluateUtf8ByteLengthMax('hi', Number.POSITIVE_INFINITY);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('UTF8_BYTE_LENGTH_INVALID_INPUT');
    });

    it('non-number cap rejected', () => {
      const result = evaluateUtf8ByteLengthMax('hi', '4096' as unknown as number);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('UTF8_BYTE_LENGTH_INVALID_INPUT');
    });
  });
});

describe('utf8_byte_length_max via DSL', () => {
  it('passes for short ASCII', () => {
    const ok = evaluateConstraint(
      { telegram_variant_md_below_4kb: 'hello' },
      'utf8_byte_length_max(telegram_variant_md_below_4kb, 4096)',
    );
    expect(ok).toBe(true);
  });

  it('fails when emoji blow the byte cap despite low code-unit count', () => {
    const ok = evaluateConstraint(
      { telegram_variant_md_below_4kb: '\u{1F4A9}'.repeat(2000) }, // 8000 bytes
      'utf8_byte_length_max(telegram_variant_md_below_4kb, 4096)',
    );
    expect(ok).toBe(false);
  });

  it('passes at exact cap boundary', () => {
    const ok = evaluateConstraint(
      { value: 'a'.repeat(100) },
      'utf8_byte_length_max(value, 100)',
    );
    expect(ok).toBe(true);
  });
});
