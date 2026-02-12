/**
 * Idempotency key conformance vectors per SDD 6.1.
 */
import { describe, it, expect } from 'vitest';
import { deriveIdempotencyKey } from '../../src/integrity/idempotency.js';

describe('deriveIdempotencyKey', () => {
  it('produces deterministic key for same inputs', () => {
    const key1 = deriveIdempotencyKey('tenant-a', 'sha256:abc123', 'openai', 'gpt-4o');
    const key2 = deriveIdempotencyKey('tenant-a', 'sha256:abc123', 'openai', 'gpt-4o');
    expect(key1).toBe(key2);
    expect(key1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('retry storm: same logical request, different trace_ids produce same key', () => {
    // Key does NOT depend on trace_id — only tenant:reqHash:provider:model
    const key1 = deriveIdempotencyKey('tenant-x', 'sha256:samebody', 'anthropic', 'claude-opus-4-6');
    const key2 = deriveIdempotencyKey('tenant-x', 'sha256:samebody', 'anthropic', 'claude-opus-4-6');
    expect(key1).toBe(key2); // Same key despite potentially different trace_ids
  });

  it('different body produces different key', () => {
    const key1 = deriveIdempotencyKey('tenant-a', 'sha256:body1hash', 'openai', 'gpt-4o');
    const key2 = deriveIdempotencyKey('tenant-a', 'sha256:body2hash', 'openai', 'gpt-4o');
    expect(key1).not.toBe(key2);
  });

  it('different model produces different key', () => {
    const key1 = deriveIdempotencyKey('tenant-a', 'sha256:same', 'openai', 'gpt-4o');
    const key2 = deriveIdempotencyKey('tenant-a', 'sha256:same', 'openai', 'o3');
    expect(key1).not.toBe(key2);
  });

  it('different tenant produces different key', () => {
    const key1 = deriveIdempotencyKey('tenant-a', 'sha256:same', 'openai', 'gpt-4o');
    const key2 = deriveIdempotencyKey('tenant-b', 'sha256:same', 'openai', 'gpt-4o');
    expect(key1).not.toBe(key2);
  });

  it('components containing colons produce distinct keys (Finding 1)', () => {
    // With colon-delimited concatenation, these would collide:
    // "a:b" + "x" → "a:b:x:..." vs "a" + "b:x" → "a:b:x:..."
    // JSON array serialization prevents this:
    // ["a:b","x",...] !== ["a","b:x",...]
    const key1 = deriveIdempotencyKey('tenant:a', 'sha256:hash', 'openai', 'gpt-4o');
    const key2 = deriveIdempotencyKey('tenant', 'a:sha256:hash', 'openai', 'gpt-4o');
    expect(key1).not.toBe(key2);

    // Another collision scenario with provider/model boundary
    const key3 = deriveIdempotencyKey('t', 'sha256:x', 'open:ai', 'gpt-4o');
    const key4 = deriveIdempotencyKey('t', 'sha256:x', 'open', 'ai:gpt-4o');
    expect(key3).not.toBe(key4);
  });

  it('throws on empty components', () => {
    expect(() => deriveIdempotencyKey('', 'sha256:x', 'openai', 'gpt-4o')).toThrow();
    expect(() => deriveIdempotencyKey('t', '', 'openai', 'gpt-4o')).toThrow();
    expect(() => deriveIdempotencyKey('t', 'sha256:x', '', 'gpt-4o')).toThrow();
    expect(() => deriveIdempotencyKey('t', 'sha256:x', 'openai', '')).toThrow();
  });
});
