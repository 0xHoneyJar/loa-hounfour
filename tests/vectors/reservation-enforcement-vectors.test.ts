/**
 * Tests for reservation-enforcement conformance vectors (S8-T2).
 *
 * Validates all 4 vectors in vectors/conformance/reservation-enforcement/
 * against the reservation utilities and tier validation logic.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReservedMicro, validateReservationTier, shouldAllowRequest, type ReservationDecision } from '../../src/utilities/reservation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const vectorDir = join(__dirname, '..', '..', 'vectors', 'conformance', 'reservation-enforcement');

interface ReservationVector {
  vector_id: string;
  category: string;
  description: string;
  contract_version: string;
  input: {
    agent_id: string;
    conformance_level: string;
    reserved_capacity_bps: number;
    budget_limit_micro: string;
    budget_spent_micro: string;
    request_cost_micro?: string;
    enforcement?: string;
  };
  expected_output: {
    reserved_micro: string;
    tier_valid?: boolean;
    enforcement?: string;
    allowed?: boolean;
    floor_breached?: boolean;
    reason?: string;
    /** Expected warning message pattern (advisory mode, v5.3.0). */
    warning_pattern?: string;
    /** Expected post-transaction available (v5.3.0). */
    post_transaction_available?: string;
    /** Expected enforcement action. */
    enforcement_action?: string;
  };
  expected_valid: boolean;
  matching_rules: {
    select_fields: string[];
  };
  metadata: Record<string, string>;
}

function loadVectors(): ReservationVector[] {
  const files = readdirSync(vectorDir).filter(f => f.endsWith('.json')).sort();
  return files.map(f => JSON.parse(readFileSync(join(vectorDir, f), 'utf-8')));
}

// ---------------------------------------------------------------------------
// Vector discovery
// ---------------------------------------------------------------------------

describe('Reservation enforcement conformance vectors', () => {
  const vectors = loadVectors();

  it('has at least 8 vectors', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(8);
  });

  it('all vectors belong to reservation-enforcement category', () => {
    for (const v of vectors) {
      expect(v.category).toBe('reservation-enforcement');
    }
  });

  it('all vectors have contract_version 5.2.0 or 5.3.0', () => {
    for (const v of vectors) {
      expect(['5.2.0', '5.3.0']).toContain(v.contract_version);
    }
  });

  it('all vector IDs follow naming convention', () => {
    for (const v of vectors) {
      expect(v.vector_id).toMatch(/^conformance-reservation-enforcement-\d{4}$/);
    }
  });

  it('vector IDs are unique', () => {
    const ids = vectors.map(v => v.vector_id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// Vector 0001: Self-declared valid
// ---------------------------------------------------------------------------

describe('Vector 0001: self_declared valid reservation', () => {
  const vectors = loadVectors();
  const v = vectors.find(v => v.vector_id === 'conformance-reservation-enforcement-0001')!;

  it('vector exists', () => {
    expect(v).toBeDefined();
  });

  it('computes correct reserved_micro', () => {
    const result = computeReservedMicro(v.input.budget_limit_micro, v.input.reserved_capacity_bps);
    expect(result).toBe(v.expected_output.reserved_micro);
  });

  it('tier validation passes', () => {
    const tier = validateReservationTier(
      v.input.conformance_level as 'self_declared',
      v.input.reserved_capacity_bps,
    );
    expect(tier.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Vector 0002: Below minimum bps
// ---------------------------------------------------------------------------

describe('Vector 0002: below minimum bps for community_verified', () => {
  const vectors = loadVectors();
  const v = vectors.find(v => v.vector_id === 'conformance-reservation-enforcement-0002')!;

  it('vector exists', () => {
    expect(v).toBeDefined();
  });

  it('computes correct reserved_micro', () => {
    const result = computeReservedMicro(v.input.budget_limit_micro, v.input.reserved_capacity_bps);
    expect(result).toBe(v.expected_output.reserved_micro);
  });

  it('tier validation reports below minimum', () => {
    const tier = validateReservationTier(
      v.input.conformance_level as 'community_verified',
      v.input.reserved_capacity_bps,
    );
    expect(tier.valid).toBe(false);
    expect(tier.reason).toMatch(/below minimum/);
  });
});

// ---------------------------------------------------------------------------
// Vector 0003: Budget within floor
// ---------------------------------------------------------------------------

describe('Vector 0003: budget spending within reservation floor', () => {
  const vectors = loadVectors();
  const v = vectors.find(v => v.vector_id === 'conformance-reservation-enforcement-0003')!;

  it('vector exists', () => {
    expect(v).toBeDefined();
  });

  it('computes correct reserved_micro', () => {
    const result = computeReservedMicro(v.input.budget_limit_micro, v.input.reserved_capacity_bps);
    expect(result).toBe(v.expected_output.reserved_micro);
  });

  it('allows request when budget is sufficient', () => {
    const reserved = computeReservedMicro(v.input.budget_limit_micro, v.input.reserved_capacity_bps);
    const available = (BigInt(v.input.budget_limit_micro) - BigInt(v.input.budget_spent_micro)).toString();
    const decision = shouldAllowRequest(available, v.input.request_cost_micro!, reserved, 'strict');
    expect(decision.allowed).toBe(true);
    expect(decision.floor_breached).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Vector 0004: Budget exhaustion with floor enforcement
// ---------------------------------------------------------------------------

describe('Vector 0004: budget exhaustion with floor enforcement', () => {
  const vectors = loadVectors();
  const v = vectors.find(v => v.vector_id === 'conformance-reservation-enforcement-0004')!;

  it('vector exists', () => {
    expect(v).toBeDefined();
  });

  it('computes correct reserved_micro', () => {
    const result = computeReservedMicro(v.input.budget_limit_micro, v.input.reserved_capacity_bps);
    expect(result).toBe(v.expected_output.reserved_micro);
  });

  it('blocks request when it would breach reservation floor', () => {
    const reserved = computeReservedMicro(v.input.budget_limit_micro, v.input.reserved_capacity_bps);
    const available = (BigInt(v.input.budget_limit_micro) - BigInt(v.input.budget_spent_micro)).toString();
    const decision = shouldAllowRequest(available, v.input.request_cost_micro!, reserved, 'strict');
    expect(decision.allowed).toBe(false);
    expect(decision.floor_breached).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Vector 0005: Advisory floor breach (v5.3.0)
// ---------------------------------------------------------------------------

describe('Vector 0005: advisory enforcement allows with warning on floor breach', () => {
  const vectors = loadVectors();
  const v = vectors.find(v => v.vector_id === 'conformance-reservation-enforcement-0005')!;

  it('vector exists', () => {
    expect(v).toBeDefined();
  });

  it('computes correct reserved_micro', () => {
    const result = computeReservedMicro(v.input.budget_limit_micro, v.input.reserved_capacity_bps);
    expect(result).toBe(v.expected_output.reserved_micro);
  });

  it('allows request with warning when advisory enforcement and floor would be breached', () => {
    const reserved = computeReservedMicro(v.input.budget_limit_micro, v.input.reserved_capacity_bps);
    const available = (BigInt(v.input.budget_limit_micro) - BigInt(v.input.budget_spent_micro)).toString();
    const decision = shouldAllowRequest(available, v.input.request_cost_micro!, reserved, 'advisory');
    expect(decision.allowed).toBe(v.expected_output.allowed);
    expect(decision.floor_breached).toBe(v.expected_output.floor_breached);
    expect(decision.warning).toBeDefined();
    expect(decision.warning).toMatch(new RegExp(v.expected_output.warning_pattern!));
    expect(decision.post_transaction_available).toBe(v.expected_output.post_transaction_available);
  });
});

// ---------------------------------------------------------------------------
// Vector 0006: Advisory near-floor warning (v5.3.0)
// ---------------------------------------------------------------------------

describe('Vector 0006: advisory enforcement warns when near floor', () => {
  const vectors = loadVectors();
  const v = vectors.find(v => v.vector_id === 'conformance-reservation-enforcement-0006')!;

  it('vector exists', () => {
    expect(v).toBeDefined();
  });

  it('computes correct reserved_micro', () => {
    const result = computeReservedMicro(v.input.budget_limit_micro, v.input.reserved_capacity_bps);
    expect(result).toBe(v.expected_output.reserved_micro);
  });

  it('allows with near-floor warning when post-transaction within threshold', () => {
    const reserved = computeReservedMicro(v.input.budget_limit_micro, v.input.reserved_capacity_bps);
    const available = (BigInt(v.input.budget_limit_micro) - BigInt(v.input.budget_spent_micro)).toString();
    const decision = shouldAllowRequest(available, v.input.request_cost_micro!, reserved, 'advisory');
    expect(decision.allowed).toBe(v.expected_output.allowed);
    expect(decision.floor_breached).toBe(v.expected_output.floor_breached);
    expect(decision.warning).toBeDefined();
    expect(decision.warning).toMatch(new RegExp(v.expected_output.warning_pattern!));
    expect(decision.post_transaction_available).toBe(v.expected_output.post_transaction_available);
  });
});

// ---------------------------------------------------------------------------
// Vector 0007: Unsupported above floor (v5.3.0)
// ---------------------------------------------------------------------------

describe('Vector 0007: unsupported enforcement allows above floor', () => {
  const vectors = loadVectors();
  const v = vectors.find(v => v.vector_id === 'conformance-reservation-enforcement-0007')!;

  it('vector exists', () => {
    expect(v).toBeDefined();
  });

  it('computes correct reserved_micro', () => {
    const result = computeReservedMicro(v.input.budget_limit_micro, v.input.reserved_capacity_bps);
    expect(result).toBe(v.expected_output.reserved_micro);
  });

  it('allows request when above floor with unsupported enforcement', () => {
    const reserved = computeReservedMicro(v.input.budget_limit_micro, v.input.reserved_capacity_bps);
    const available = (BigInt(v.input.budget_limit_micro) - BigInt(v.input.budget_spent_micro)).toString();
    const decision = shouldAllowRequest(available, v.input.request_cost_micro!, reserved, 'unsupported');
    expect(decision.allowed).toBe(v.expected_output.allowed);
    expect(decision.floor_breached).toBe(v.expected_output.floor_breached);
    expect(decision.post_transaction_available).toBe(v.expected_output.post_transaction_available);
  });
});

// ---------------------------------------------------------------------------
// Vector 0008: Unsupported at floor (v5.3.0)
// ---------------------------------------------------------------------------

describe('Vector 0008: unsupported enforcement blocks at floor', () => {
  const vectors = loadVectors();
  const v = vectors.find(v => v.vector_id === 'conformance-reservation-enforcement-0008')!;

  it('vector exists', () => {
    expect(v).toBeDefined();
  });

  it('computes correct reserved_micro', () => {
    const result = computeReservedMicro(v.input.budget_limit_micro, v.input.reserved_capacity_bps);
    expect(result).toBe(v.expected_output.reserved_micro);
  });

  it('blocks request when at floor with unsupported enforcement', () => {
    const reserved = computeReservedMicro(v.input.budget_limit_micro, v.input.reserved_capacity_bps);
    const available = (BigInt(v.input.budget_limit_micro) - BigInt(v.input.budget_spent_micro)).toString();
    const decision = shouldAllowRequest(available, v.input.request_cost_micro!, reserved, 'unsupported');
    expect(decision.allowed).toBe(v.expected_output.allowed);
    expect(decision.floor_breached).toBe(v.expected_output.floor_breached);
    expect(decision.enforcement_action).toBe(v.expected_output.enforcement_action);
  });
});
