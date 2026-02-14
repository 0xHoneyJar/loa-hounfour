import { describe, it, expect } from 'vitest';
import { validate } from '../../src/validators/index.js';
import { ConversationSealingPolicySchema, AccessPolicySchema, validateAccessPolicy } from '../../src/schemas/conversation.js';
import { BillingEntrySchema } from '../../src/schemas/billing-entry.js';
import { Type } from '@sinclair/typebox';

describe('Validation Pipeline (v3.1.0)', () => {
  describe('cross-field validator wiring (BB-C4-ADV-003)', () => {
    it('validate() runs cross-field checks for ConversationSealingPolicy', () => {
      const invalidPolicy = {
        encryption_scheme: 'aes-256-gcm',
        key_derivation: 'none', // cross-field violation
        access_audit: true,
      };
      const result = validate(ConversationSealingPolicySchema, invalidPolicy);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.includes('key_derivation'))).toBe(true);
      }
    });

    it('validate() returns warnings for AccessPolicy extraneous fields', () => {
      const policyWithExtraneous = {
        type: 'none',
        duration_hours: 24, // extraneous for type=none
        audit_required: true,
        revocable: false,
      };
      const result = validate(AccessPolicySchema, policyWithExtraneous);
      expect(result.valid).toBe(true);
      if (result.valid && 'warnings' in result) {
        expect(result.warnings!.some((w: string) => w.includes('duration_hours'))).toBe(true);
      }
    });

    it('validate() with crossField: false skips cross-field checks', () => {
      const invalidPolicy = {
        encryption_scheme: 'aes-256-gcm',
        key_derivation: 'none',
        access_audit: true,
      };
      const result = validate(ConversationSealingPolicySchema, invalidPolicy, { crossField: false });
      // Schema validation still passes (the fields are valid types)
      expect(result.valid).toBe(true);
    });
  });

  describe('validator cache constraint (BB-V3-003)', () => {
    it('schemas without $id are validated but not cached', () => {
      const adhocSchema = Type.Object({
        name: Type.String(),
      });
      // Should work without error even without $id
      const result = validate(adhocSchema, { name: 'test' });
      expect(result.valid).toBe(true);

      const invalid = validate(adhocSchema, { name: 123 });
      expect(invalid.valid).toBe(false);
    });
  });

  describe('AccessPolicy strict mode (BB-C5-Part5-§4)', () => {
    it('default mode: extraneous fields produce warnings', () => {
      const result = validateAccessPolicy({
        type: 'none',
        duration_hours: 24,
        audit_required: true,
        revocable: false,
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('duration_hours');
    });

    it('strict mode: extraneous fields produce errors', () => {
      const result = validateAccessPolicy({
        type: 'none',
        duration_hours: 24,
        audit_required: true,
        revocable: false,
      }, { strict: true });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('duration_hours');
    });

    it('strict mode: extraneous roles on non-role_based type', () => {
      const result = validateAccessPolicy({
        type: 'read_only',
        roles: ['admin'],
        audit_required: true,
        revocable: true,
      }, { strict: true });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('roles'))).toBe(true);
    });

    it('strict mode: valid policy with no extraneous fields passes', () => {
      const result = validateAccessPolicy({
        type: 'time_limited',
        duration_hours: 720,
        audit_required: true,
        revocable: true,
      }, { strict: true });
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('strict mode: required field violations are still errors', () => {
      const result = validateAccessPolicy({
        type: 'time_limited',
        audit_required: true,
        revocable: true,
      }, { strict: true });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('duration_hours is required'))).toBe(true);
    });
  });
});
