import { describe, it, expect } from 'vitest';
import {
  isAgentEvent,
  isBillingEvent,
  isConversationEvent,
  isTransferEvent,
  isToolEvent,
  isMessageEvent,
  type DomainEvent,
} from '../../src/schemas/domain-event.js';
import { validateSagaContext, type SagaContext } from '../../src/schemas/saga-context.js';
import {
  isKnownEventType,
  EVENT_TYPES,
} from '../../src/vocabulary/event-types.js';
import {
  LIFECYCLE_REASON_CODES,
  LIFECYCLE_REASON_CODE_VALUES,
} from '../../src/vocabulary/lifecycle-reasons.js';
import { METADATA_NAMESPACES } from '../../src/vocabulary/metadata.js';

const baseEvent: DomainEvent = {
  event_id: 'evt_test',
  aggregate_id: 'agg_test',
  aggregate_type: 'agent',
  type: 'agent.lifecycle.transitioned',
  version: 1,
  occurred_at: '2026-01-15T10:00:00Z',
  actor: 'test',
  payload: { agent_id: 'agent_abc' },
  contract_version: '2.2.0',
};

describe('Runtime Type Guards (BB-V3-002)', () => {
  describe('isAgentEvent', () => {
    it('returns true for valid agent event', () => {
      expect(isAgentEvent(baseEvent)).toBe(true);
    });

    it('returns false for wrong aggregate_type', () => {
      expect(isAgentEvent({ ...baseEvent, aggregate_type: 'billing' })).toBe(false);
    });

    it('returns false for missing agent_id in payload', () => {
      expect(isAgentEvent({ ...baseEvent, payload: {} })).toBe(false);
    });

    it('accepts extra payload fields', () => {
      expect(isAgentEvent({
        ...baseEvent,
        payload: { agent_id: 'x', extra: 'allowed' },
      })).toBe(true);
    });
  });

  describe('isBillingEvent', () => {
    it('returns true for valid billing event', () => {
      const event: DomainEvent = {
        ...baseEvent,
        aggregate_type: 'billing',
        type: 'billing.entry.created',
        payload: { billing_entry_id: 'bill_001' },
      };
      expect(isBillingEvent(event)).toBe(true);
    });

    it('returns false for missing billing_entry_id', () => {
      const event: DomainEvent = {
        ...baseEvent,
        aggregate_type: 'billing',
        payload: {},
      };
      expect(isBillingEvent(event)).toBe(false);
    });
  });

  describe('isConversationEvent', () => {
    it('returns true for valid conversation event', () => {
      const event: DomainEvent = {
        ...baseEvent,
        aggregate_type: 'conversation',
        type: 'conversation.thread.created',
        payload: { conversation_id: 'conv_001' },
      };
      expect(isConversationEvent(event)).toBe(true);
    });
  });

  describe('isTransferEvent', () => {
    it('returns true for valid transfer event', () => {
      const event: DomainEvent = {
        ...baseEvent,
        aggregate_type: 'transfer',
        type: 'transfer.saga.initiated',
        payload: {
          transfer_id: 'xfer_001',
          from_owner: '0xabc',
          to_owner: '0xdef',
        },
      };
      expect(isTransferEvent(event)).toBe(true);
    });

    it('returns false for missing from_owner', () => {
      const event: DomainEvent = {
        ...baseEvent,
        aggregate_type: 'transfer',
        payload: { transfer_id: 'xfer_001', to_owner: '0xdef' },
      };
      expect(isTransferEvent(event)).toBe(false);
    });
  });

  describe('isToolEvent', () => {
    it('returns true for valid tool event', () => {
      const event: DomainEvent = {
        ...baseEvent,
        aggregate_type: 'tool',
        type: 'tool.call.started',
        payload: { tool_call_id: 'tc_001' },
      };
      expect(isToolEvent(event)).toBe(true);
    });

    it('returns false for wrong aggregate_type', () => {
      expect(isToolEvent({ ...baseEvent, payload: { tool_call_id: 'tc_001' } })).toBe(false);
    });

    it('returns false for missing tool_call_id', () => {
      const event: DomainEvent = {
        ...baseEvent,
        aggregate_type: 'tool',
        payload: {},
      };
      expect(isToolEvent(event)).toBe(false);
    });
  });

  describe('isMessageEvent', () => {
    it('returns true for valid message event', () => {
      const event: DomainEvent = {
        ...baseEvent,
        aggregate_type: 'message',
        type: 'message.content.created',
        payload: { message_id: 'msg_001' },
      };
      expect(isMessageEvent(event)).toBe(true);
    });

    it('returns false for missing message_id', () => {
      const event: DomainEvent = {
        ...baseEvent,
        aggregate_type: 'message',
        payload: {},
      };
      expect(isMessageEvent(event)).toBe(false);
    });
  });
});

describe('validateSagaContext (BB-V3-F008)', () => {
  it('returns valid for step within total_steps', () => {
    const ctx: SagaContext = { saga_id: 's1', step: 2, total_steps: 3, direction: 'forward' };
    expect(validateSagaContext(ctx)).toEqual({ valid: true });
  });

  it('returns valid for step equal to total_steps', () => {
    const ctx: SagaContext = { saga_id: 's1', step: 3, total_steps: 3, direction: 'forward' };
    expect(validateSagaContext(ctx)).toEqual({ valid: true });
  });

  it('returns invalid for step exceeding total_steps', () => {
    const ctx: SagaContext = { saga_id: 's1', step: 5, total_steps: 3, direction: 'forward' };
    const result = validateSagaContext(ctx);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('5');
      expect(result.reason).toContain('3');
    }
  });

  it('returns valid when total_steps is omitted', () => {
    const ctx: SagaContext = { saga_id: 's1', step: 100, direction: 'compensation' };
    expect(validateSagaContext(ctx)).toEqual({ valid: true });
  });
});

describe('Event Type Vocabulary (BB-V3-011)', () => {
  it('has 20+ registered event types', () => {
    expect(Object.keys(EVENT_TYPES).length).toBeGreaterThanOrEqual(20);
  });

  it('isKnownEventType returns true for registered types', () => {
    expect(isKnownEventType('agent.lifecycle.transitioned')).toBe(true);
    expect(isKnownEventType('billing.entry.created')).toBe(true);
    expect(isKnownEventType('transfer.saga.initiated')).toBe(true);
  });

  it('isKnownEventType returns false for unregistered types', () => {
    expect(isKnownEventType('agent.state.changed')).toBe(false);
    expect(isKnownEventType('unknown.type.here')).toBe(false);
  });
});

describe('Lifecycle Reason Codes (BB-V3-009)', () => {
  it('has 10 canonical reason codes', () => {
    expect(LIFECYCLE_REASON_CODE_VALUES).toHaveLength(10);
  });

  it('all codes have human-readable descriptions', () => {
    for (const code of LIFECYCLE_REASON_CODE_VALUES) {
      expect(LIFECYCLE_REASON_CODES[code]).toBeTruthy();
      expect(typeof LIFECYCLE_REASON_CODES[code]).toBe('string');
    }
  });

  it('includes key transfer-related codes', () => {
    expect(LIFECYCLE_REASON_CODES.transfer_initiated).toBeDefined();
    expect(LIFECYCLE_REASON_CODES.transfer_completed).toBeDefined();
  });
});

describe('Metadata Namespaces (BB-V3-001)', () => {
  it('defines three namespace prefixes', () => {
    expect(METADATA_NAMESPACES.PROTOCOL).toBe('loa.');
    expect(METADATA_NAMESPACES.TRACE).toBe('trace.');
    expect(METADATA_NAMESPACES.CONSUMER).toBe('x-');
  });
});
