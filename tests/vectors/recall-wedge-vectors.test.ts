/**
 * End-to-end Recall Wedge round-trip conformance harness.
 *
 * Loads the five fixtures under `vectors/conformance/recall-wedge/` and
 * asserts:
 *
 *   1. Each fixture is a valid `ConformanceVectorSchema` envelope (the
 *      shape required by the global vector harness in
 *      `tests/vectors/conformance-validation.test.ts`).
 *
 *   2. Each `input` payload validates structurally under its TypeBox
 *      domain schema. Crypto-bearing schemas (`Assertion` admitted-variant,
 *      `RecallReceipt`, `CommitmentRoot`) are validated with
 *      `{ acceptDeferred: true }` via `assertStructurallyValid` per
 *      the G1 safe-by-default contract; `RecallRequest` and
 *      `RecallPack` are not crypto-bearing at the top level.
 *
 *   3. The wedge cross-record reference invariants documented in
 *      `vectors/conformance/recall-wedge/README.md`:
 *        - pack.recall_request_ref === request.request_id
 *        - receipt.pack_hash       === pack.pack_hash
 *        - commitment.subject_hash === receipt.receipt_hash
 *        - commitment.commitment_type === 'recall_receipt'
 *        - the packed item id carries the assertion_id suffix
 *
 * The harness does NOT verify hashes or signatures — those are
 * consumer obligations per ADR-010. The corpus is content-coherent
 * with placeholder hashes; the harness asserts shape + composition,
 * not cryptographic verifiability.
 *
 * @see docs/architecture/recall-wedge-composition.md
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Value } from '@sinclair/typebox/value';
import {
  AssertionSchema,
  RecallRequestSchema,
  RecallPackSchema,
  RecallReceiptSchema,
  CommitmentRootSchema,
} from '../../src/governance/index.js';
import { ConformanceVectorSchema } from '../../src/schemas/model/conformance-vector.js';
import { assertStructurallyValid } from '../../src/test-infrastructure/crypto-bearing-helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const corpusDir = join(repoRoot, 'vectors', 'conformance', 'recall-wedge');

interface ConformanceVectorEnvelope<T> {
  vector_id: string;
  category: string;
  description: string;
  contract_version: string;
  input: T;
  expected_output: Record<string, unknown>;
  expected_valid: boolean;
  metadata?: Record<string, unknown>;
}

function loadEnvelope<T>(name: string): ConformanceVectorEnvelope<T> {
  return JSON.parse(
    readFileSync(join(corpusDir, name), 'utf-8'),
  ) as ConformanceVectorEnvelope<T>;
}

interface AssertionFixture {
  assertion_id: string;
  body_hash: string;
  status: string;
  recall_scope: string;
  signatures?: Array<{ envelope_id: string }>;
}
interface RecallRequestFixture {
  request_id: string;
  subject_agent_id: string;
  surface_context: string;
}
interface RecallPackItemFixture {
  item_id: string;
  item_type: string;
}
interface RecallPackFixture {
  pack_id: string;
  recall_request_ref: string;
  pack_hash: string;
  items: RecallPackItemFixture[];
}
interface RecallReceiptFixture {
  receipt_id: string;
  pack_hash: string;
  receipt_hash: string;
}
interface CommitmentRootFixture {
  commitment_id: string;
  commitment_type: string;
  subject_hash: string;
}

describe('Recall Wedge round-trip — conformance corpus', () => {
  const assertionVector = loadEnvelope<AssertionFixture>('assertion-admitted.json');
  const requestVector = loadEnvelope<RecallRequestFixture>('recall-request.json');
  const packVector = loadEnvelope<RecallPackFixture>('recall-pack.json');
  const receiptVector = loadEnvelope<RecallReceiptFixture>('recall-receipt.json');
  const commitmentVector = loadEnvelope<CommitmentRootFixture>('commitment-root.json');

  const allVectors = [
    { name: 'assertion-admitted.json', vector: assertionVector },
    { name: 'recall-request.json', vector: requestVector },
    { name: 'recall-pack.json', vector: packVector },
    { name: 'recall-receipt.json', vector: receiptVector },
    { name: 'commitment-root.json', vector: commitmentVector },
  ];

  const assertion = assertionVector.input;
  const request = requestVector.input;
  const pack = packVector.input;
  const receipt = receiptVector.input;
  const commitment = commitmentVector.input;

  describe('all five vector files load', () => {
    for (const { name, vector } of allVectors) {
      it(`${name} loads as a JSON envelope`, () => {
        expect(vector).toBeDefined();
        expect(vector.input).toBeDefined();
        expect(typeof vector.vector_id).toBe('string');
      });
    }
  });

  describe('envelope validation against ConformanceVectorSchema', () => {
    for (const { name, vector } of allVectors) {
      it(`${name} validates against ConformanceVectorSchema`, () => {
        const ok = Value.Check(ConformanceVectorSchema, vector);
        if (!ok) {
          const errors = [...Value.Errors(ConformanceVectorSchema, vector)];
          const summary = errors
            .map((e) => `${e.path}: ${e.message}`)
            .join('; ');
          expect.fail(`${name} envelope invalid: ${summary}`);
        }
        expect(ok).toBe(true);
      });
    }

    it('all five vectors share the recall-wedge round-trip framing', () => {
      const ids = allVectors.map((v) => v.vector.vector_id);
      expect(new Set(ids).size).toBe(5);
      for (const id of ids) {
        expect(id).toMatch(/^conformance-recall-wedge-\d{3}$/);
      }
    });
  });

  describe('per-input structural validation against domain schemas', () => {
    it('assertion-admitted input validates against AssertionSchema (admitted variant — crypto-bearing, deferred)', () => {
      assertStructurallyValid(AssertionSchema, assertion);
    });

    it('recall-request input validates against RecallRequestSchema', () => {
      assertStructurallyValid(RecallRequestSchema, request);
    });

    it('recall-pack input validates against RecallPackSchema', () => {
      assertStructurallyValid(RecallPackSchema, pack);
    });

    it('recall-receipt input validates against RecallReceiptSchema (crypto-bearing, deferred)', () => {
      assertStructurallyValid(RecallReceiptSchema, receipt);
    });

    it('commitment-root input validates against CommitmentRootSchema (crypto-bearing, deferred)', () => {
      assertStructurallyValid(CommitmentRootSchema, commitment);
    });
  });

  describe('cross-record composition invariants', () => {
    it('the assertion is admitted (the wedge entry-point is a signed admitted assertion)', () => {
      expect(assertion.status).toBe('admitted');
      expect(assertion.signatures).toBeDefined();
      expect(assertion.signatures?.length).toBeGreaterThanOrEqual(1);
    });

    it('pack.recall_request_ref === request.request_id', () => {
      expect(pack.recall_request_ref).toBe(request.request_id);
    });

    it('receipt.pack_hash === pack.pack_hash', () => {
      expect(receipt.pack_hash).toBe(pack.pack_hash);
    });

    it('commitment.subject_hash === receipt.receipt_hash', () => {
      expect(commitment.subject_hash).toBe(receipt.receipt_hash);
    });

    it('commitment.commitment_type is recall_receipt for a receipt anchor', () => {
      expect(commitment.commitment_type).toBe('recall_receipt');
    });

    it('the packed item references the assertion via the documented `assertion-<assertion_id>` lazy-link form', () => {
      expect(pack.items.length).toBeGreaterThanOrEqual(1);
      expect(pack.items[0].item_id).toBe(`assertion-${assertion.assertion_id}`);
      expect(pack.items[0].item_type).toBe('assertion');
    });

    it('the request scope is the private surface (matches the assertion recall_scope policy)', () => {
      expect(request.surface_context).toBe('private');
    });

    it('assertion.recall_scope === request.surface_context (the wedge entry-point and the request agree on the surface)', () => {
      expect(assertion.recall_scope).toBe(request.surface_context);
    });
  });
});
