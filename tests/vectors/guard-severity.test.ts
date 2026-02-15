import { describe, it, expect } from 'vitest';
import {
  requiresTransferId,
  requiresNoActiveTransfer,
  requiresReasonResolved,
  requiresTransferCompleted,
  isValidGuardResult,
  type GuardResult,
} from '../../src/utilities/lifecycle.js';

describe('GuardResult Severity (v3.1.0)', () => {
  describe('requiresTransferId — client_error severity', () => {
    it('returns client_error when transfer_id is missing', () => {
      const result = requiresTransferId('ACTIVE', 'TRANSFERRED');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.severity).toBe('client_error');
      }
    });

    it('returns valid with no severity on success', () => {
      const result = requiresTransferId('ACTIVE', 'TRANSFERRED', { transfer_id: 'tx-123' });
      expect(result.valid).toBe(true);
    });
  });

  describe('requiresNoActiveTransfer — policy_violation severity', () => {
    it('returns policy_violation when transfer is active', () => {
      const result = requiresNoActiveTransfer('ACTIVE', 'ARCHIVED', { transfer_id: 'tx-123' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.severity).toBe('policy_violation');
      }
    });

    it('returns valid when no transfer_id', () => {
      const result = requiresNoActiveTransfer('ACTIVE', 'ARCHIVED');
      expect(result.valid).toBe(true);
    });
  });

  describe('requiresReasonResolved — client_error severity', () => {
    it('returns client_error when reason not resolved', () => {
      const result = requiresReasonResolved('SUSPENDED', 'ACTIVE');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.severity).toBe('client_error');
      }
    });
  });

  describe('requiresTransferCompleted — client_error severity', () => {
    it('returns client_error when transfer not completed', () => {
      const result = requiresTransferCompleted('TRANSFERRED', 'PROVISIONING');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.severity).toBe('client_error');
      }
    });
  });

  describe('isValidGuardResult backward compatibility', () => {
    it('still narrows valid results correctly', () => {
      const valid: GuardResult = { valid: true };
      expect(isValidGuardResult(valid)).toBe(true);

      const invalid: GuardResult = {
        valid: false,
        reason: 'test',
        guard: 'test',
        severity: 'client_error',
      };
      expect(isValidGuardResult(invalid)).toBe(false);
    });

    it('works with severity-less results (backward compat)', () => {
      const invalid: GuardResult = {
        valid: false,
        reason: 'test',
        guard: 'test',
      };
      expect(isValidGuardResult(invalid)).toBe(false);
      if (!invalid.valid) {
        expect(invalid.severity).toBeUndefined();
      }
    });
  });
});
