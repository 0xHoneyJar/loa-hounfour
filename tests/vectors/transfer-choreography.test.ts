import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../../src/validators/index.js';
import { DomainEventSchema } from '../../src/schemas/domain-event.js';
import { SagaContextSchema } from '../../src/schemas/saga-context.js';
import {
  TRANSFER_CHOREOGRAPHY,
  type ScenarioChoreography,
} from '../../src/vocabulary/transfer-choreography.js';
import { EVENT_TYPES, isKnownEventType } from '../../src/vocabulary/event-types.js';
import type { TransferScenario } from '../../src/schemas/transfer-spec.js';

const VECTORS_DIR = join(__dirname, '../../vectors/transfer');
function loadVectors(filename: string) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

describe('Transfer Choreography Constants', () => {
  const scenarios: TransferScenario[] = ['sale', 'gift', 'admin_recovery', 'custody_change'];

  it('covers all 4 transfer scenarios', () => {
    for (const scenario of scenarios) {
      expect(TRANSFER_CHOREOGRAPHY[scenario]).toBeDefined();
    }
  });

  it('every choreography event type is a registered EventType', () => {
    for (const scenario of scenarios) {
      const choreo = TRANSFER_CHOREOGRAPHY[scenario];
      for (const eventType of choreo.forward) {
        expect(isKnownEventType(eventType)).toBe(true);
      }
      for (const eventType of choreo.compensation) {
        expect(isKnownEventType(eventType)).toBe(true);
      }
    }
  });

  it('every forward path starts with transfer.saga.initiated', () => {
    for (const scenario of scenarios) {
      expect(TRANSFER_CHOREOGRAPHY[scenario].forward[0]).toBe('transfer.saga.initiated');
    }
  });

  it('every forward path ends with transfer.saga.completed', () => {
    for (const scenario of scenarios) {
      const forward = TRANSFER_CHOREOGRAPHY[scenario].forward;
      expect(forward[forward.length - 1]).toBe('transfer.saga.completed');
    }
  });

  it('every compensation path ends with transfer.saga.rolled_back', () => {
    for (const scenario of scenarios) {
      const comp = TRANSFER_CHOREOGRAPHY[scenario].compensation;
      expect(comp[comp.length - 1]).toBe('transfer.saga.rolled_back');
    }
  });

  it('sale includes billing.entry.created (financial transaction)', () => {
    expect(TRANSFER_CHOREOGRAPHY.sale.forward).toContain('billing.entry.created');
  });

  it('gift does NOT include billing events', () => {
    expect(TRANSFER_CHOREOGRAPHY.gift.forward).not.toContain('billing.entry.created');
  });

  it('admin_recovery does NOT include conversation.thread.sealed', () => {
    expect(TRANSFER_CHOREOGRAPHY.admin_recovery.forward).not.toContain('conversation.thread.sealed');
  });

  it('sale compensation includes billing.entry.voided', () => {
    expect(TRANSFER_CHOREOGRAPHY.sale.compensation).toContain('billing.entry.voided');
  });
});

describe('Transfer Choreography Golden Vectors', () => {
  const data = loadVectors('choreography.json');

  describe('valid choreography vectors', () => {
    for (const v of data.valid_choreographies as Array<{
      id: string;
      scenario: TransferScenario;
      direction: string;
      events: Array<Record<string, unknown>>;
      saga: Record<string, unknown>;
      note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        // Validate each event against DomainEventSchema
        for (const event of v.events) {
          const result = validate(DomainEventSchema, event);
          expect(result.valid).toBe(true);
        }

        // Validate saga context
        const sagaResult = validate(SagaContextSchema, v.saga);
        expect(sagaResult.valid).toBe(true);

        // Verify event types match expected choreography
        const choreo = TRANSFER_CHOREOGRAPHY[v.scenario];
        const expectedTypes = v.direction === 'forward' ? choreo.forward : choreo.compensation;
        const actualTypes = v.events.map(e => e.type as string);
        expect(actualTypes).toEqual([...expectedTypes]);
      });
    }
  });

  describe('invalid choreography vectors', () => {
    for (const v of data.invalid_choreographies as Array<{
      id: string;
      scenario: TransferScenario;
      direction: string;
      event_types: string[];
      note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const choreo = TRANSFER_CHOREOGRAPHY[v.scenario];
        const expectedTypes = v.direction === 'forward' ? choreo.forward : choreo.compensation;
        // Invalid vectors should NOT match the expected choreography
        expect(v.event_types).not.toEqual([...expectedTypes]);
      });
    }
  });
});
