import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../../src/validators/index.js';
import {
  ConversationSchema,
  MessageSchema,
  ConversationSealingPolicySchema,
  AccessPolicySchema,
  validateSealingPolicy,
  validateAccessPolicy,
} from '../../src/schemas/conversation.js';

const VECTORS_DIR = join(__dirname, '../../vectors/conversation');
function loadVectors(filename: string) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

describe('Conversation Golden Vectors', () => {
  const data = loadVectors('conversations.json');

  describe('valid conversations', () => {
    for (const v of data.valid_conversations as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(ConversationSchema, v.data);
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('valid messages', () => {
    for (const v of data.valid_messages as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(MessageSchema, v.data);
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('invalid data rejected', () => {
    it('rejects invalid conversation status', () => {
      const result = validate(ConversationSchema, {
        id: 'conv_test',
        nft_id: 'eip155:1/0x5Af0D9827E0c53E4799BB226655A1de152A425a5/42',
        status: 'deleted',
        message_count: 0,
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-01-15T10:00:00Z',
        contract_version: '3.0.0',
      });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid message role', () => {
      const result = validate(MessageSchema, {
        id: 'msg_test',
        conversation_id: 'conv_test',
        role: 'admin',
        content: 'test',
        created_at: '2026-01-15T10:00:00Z',
        contract_version: '3.0.0',
      });
      expect(result.valid).toBe(false);
    });

    it('rejects previous_owner_access (removed in v3.0.0)', () => {
      const result = validate(ConversationSealingPolicySchema, {
        encryption_scheme: 'none',
        key_derivation: 'none',
        access_audit: false,
        previous_owner_access: 'none',
      });
      expect(result.valid).toBe(false);
    });
  });
});

describe('AccessPolicy Schema (v3.0.0)', () => {
  it('accepts type=none', () => {
    const result = validate(AccessPolicySchema, {
      type: 'none',
      audit_required: false,
      revocable: false,
    });
    expect(result.valid).toBe(true);
  });

  it('accepts type=read_only', () => {
    const result = validate(AccessPolicySchema, {
      type: 'read_only',
      audit_required: true,
      revocable: true,
    });
    expect(result.valid).toBe(true);
  });

  it('accepts type=time_limited with duration_hours', () => {
    const result = validate(AccessPolicySchema, {
      type: 'time_limited',
      duration_hours: 24,
      audit_required: true,
      revocable: true,
    });
    expect(result.valid).toBe(true);
  });

  it('accepts type=role_based with roles', () => {
    const result = validate(AccessPolicySchema, {
      type: 'role_based',
      roles: ['auditor', 'compliance'],
      audit_required: true,
      revocable: false,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = validate(AccessPolicySchema, {
      type: 'custom',
      audit_required: false,
      revocable: false,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects duration_hours < 1', () => {
    const result = validate(AccessPolicySchema, {
      type: 'time_limited',
      duration_hours: 0,
      audit_required: true,
      revocable: true,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects role_based with empty string role', () => {
    const result = validate(AccessPolicySchema, {
      type: 'role_based',
      roles: [''],
      audit_required: true,
      revocable: false,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects duration_hours > 8760 (1 year)', () => {
    const result = validate(AccessPolicySchema, {
      type: 'time_limited',
      duration_hours: 9000,
      audit_required: true,
      revocable: true,
    });
    expect(result.valid).toBe(false);
  });
});

describe('validateAccessPolicy cross-field invariants', () => {
  it('accepts time_limited with duration_hours', () => {
    const result = validateAccessPolicy({
      type: 'time_limited',
      duration_hours: 24,
      audit_required: true,
      revocable: true,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects time_limited without duration_hours', () => {
    const result = validateAccessPolicy({
      type: 'time_limited',
      audit_required: true,
      revocable: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('duration_hours');
  });

  it('accepts role_based with roles', () => {
    const result = validateAccessPolicy({
      type: 'role_based',
      roles: ['admin'],
      audit_required: true,
      revocable: false,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects role_based without roles', () => {
    const result = validateAccessPolicy({
      type: 'role_based',
      audit_required: true,
      revocable: false,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('roles');
  });

  it('accepts none without optional fields', () => {
    const result = validateAccessPolicy({
      type: 'none',
      audit_required: false,
      revocable: false,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('warns on extraneous duration_hours for type=none', () => {
    const result = validateAccessPolicy({
      type: 'none',
      duration_hours: 24,
      audit_required: false,
      revocable: false,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('duration_hours');
  });

  it('warns on extraneous roles for type=none', () => {
    const result = validateAccessPolicy({
      type: 'none',
      roles: ['admin'],
      audit_required: false,
      revocable: false,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('roles');
  });

  it('warns on both extraneous fields simultaneously', () => {
    const result = validateAccessPolicy({
      type: 'read_only',
      duration_hours: 48,
      roles: ['admin'],
      audit_required: true,
      revocable: true,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(2);
  });
});

describe('Sealing Policy Validation (v3.0.0)', () => {
  it('accepts valid encrypted policy with access_policy', () => {
    const result = validateSealingPolicy({
      encryption_scheme: 'aes-256-gcm',
      key_derivation: 'hkdf-sha256',
      key_reference: 'kref-001',
      access_audit: true,
      access_policy: {
        type: 'time_limited',
        duration_hours: 24,
        audit_required: true,
        revocable: true,
      },
    });
    expect(result.valid).toBe(true);
  });

  it('accepts no-encryption policy', () => {
    const result = validateSealingPolicy({
      encryption_scheme: 'none',
      key_derivation: 'none',
      access_audit: false,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects encryption without key_derivation', () => {
    const result = validateSealingPolicy({
      encryption_scheme: 'aes-256-gcm',
      key_derivation: 'none',
      key_reference: 'kref-001',
      access_audit: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('key_derivation');
  });

  it('rejects encryption without key_reference', () => {
    const result = validateSealingPolicy({
      encryption_scheme: 'aes-256-gcm',
      key_derivation: 'hkdf-sha256',
      access_audit: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('key_reference');
  });

  it('propagates access_policy cross-field errors', () => {
    const result = validateSealingPolicy({
      encryption_scheme: 'none',
      key_derivation: 'none',
      access_audit: false,
      access_policy: {
        type: 'time_limited',
        audit_required: true,
        revocable: true,
        // Missing duration_hours
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('duration_hours');
  });
});
