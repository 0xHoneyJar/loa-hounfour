import { describe, it, expect } from 'vitest';
import {
  AUDIT_EVENT_TYPES_KNOWN_PREFIXES,
  isThreeSegmentEventType,
  extractEventTypePrefix,
} from '../../src/vocabulary/audit-event-types.js';

describe('AUDIT_EVENT_TYPES_KNOWN_PREFIXES', () => {
  it('is a readonly string array', () => {
    expect(Array.isArray(AUDIT_EVENT_TYPES_KNOWN_PREFIXES)).toBe(true);
    for (const entry of AUDIT_EVENT_TYPES_KNOWN_PREFIXES) {
      expect(typeof entry).toBe('string');
    }
  });

  it('any registered prefix follows <github-org>:<consumer>: shape', () => {
    for (const entry of AUDIT_EVENT_TYPES_KNOWN_PREFIXES) {
      // Trailing colon required to mark this as a prefix, not a full
      // event type. Two preceding colons separate the three segments.
      expect(entry.endsWith(':')).toBe(true);
      const segments = entry.slice(0, -1).split(':');
      expect(segments).toHaveLength(2);
      const [org, consumer] = segments;
      // Org regex matches the runtime `isThreeSegmentEventType` helper
      // in src/vocabulary/audit-event-types.ts — GitHub-style slugs
      // permit a leading digit (e.g. `0xhoneyjar`) and internal hyphens.
      expect(org).toMatch(/^[a-z0-9][a-z0-9-]*$/);
      expect(consumer).toMatch(/^[a-z][a-z0-9_-]*$/);
    }
  });
});

describe('isThreeSegmentEventType', () => {
  it('accepts a well-formed 3-segment event type', () => {
    expect(isThreeSegmentEventType('0xhoneyjar:example-app:assertion.admitted')).toBe(true);
    expect(isThreeSegmentEventType('myorg:consumer-x:event.something.happened')).toBe(true);
  });

  it('rejects legacy single-segment event types (left to caller-side fallback)', () => {
    expect(isThreeSegmentEventType('agent.lifecycle.transitioned')).toBe(false);
    expect(isThreeSegmentEventType('billing.entry.created')).toBe(false);
  });

  it('rejects malformed shapes', () => {
    expect(isThreeSegmentEventType('')).toBe(false);
    expect(isThreeSegmentEventType('foo:bar')).toBe(false); // 2 segments
    expect(isThreeSegmentEventType('foo:bar:baz:quux')).toBe(false); // 4 segments
    expect(isThreeSegmentEventType('FOO:bar:baz')).toBe(false); // uppercase org
    expect(isThreeSegmentEventType('foo::baz')).toBe(false); // empty consumer
    expect(isThreeSegmentEventType('foo:bar:')).toBe(false); // empty body
  });

  it('rejects org with disallowed chars (underscore, etc.)', () => {
    expect(isThreeSegmentEventType('my_org:consumer:event.x.y')).toBe(false);
    expect(isThreeSegmentEventType('my.org:consumer:event.x.y')).toBe(false);
  });

  it('accepts hyphens in org slug (GitHub username convention)', () => {
    expect(isThreeSegmentEventType('my-org:consumer:event.x.y')).toBe(true);
  });

  it('accepts hyphens / underscores in consumer slug', () => {
    expect(isThreeSegmentEventType('myorg:my-consumer:foo.bar.baz')).toBe(true);
    expect(isThreeSegmentEventType('myorg:my_consumer:foo.bar.baz')).toBe(true);
  });
});

describe('extractEventTypePrefix', () => {
  it('returns the org:consumer: prefix for a 3-segment event type', () => {
    expect(extractEventTypePrefix('0xhoneyjar:example-app:assertion.admitted')).toBe(
      '0xhoneyjar:example-app:',
    );
  });

  it('returns null for legacy single-segment event types', () => {
    expect(extractEventTypePrefix('agent.lifecycle.transitioned')).toBeNull();
  });

  it('returns null for malformed shapes', () => {
    expect(extractEventTypePrefix('foo:bar')).toBeNull();
    expect(extractEventTypePrefix('foo:bar:baz:quux')).toBeNull();
  });
});

describe('Recall Wedge prefix registration (0xhoneyjar:straylight:)', () => {
  // The Straylight Recall Wedge composes the v8.5.0 PR-A2.3 surface
  // (Assertion / Recall* / Forget / CommitmentRoot / AgentEstate*) with
  // the v8.6.0 PR-A3.7 Challenge layer. The conventional event-type
  // vocabulary documented on AUDIT_EVENT_TYPES_KNOWN_PREFIXES is what
  // straylight-side consumers SHOULD emit; this test asserts each
  // conventional type is structurally well-formed under the registered
  // prefix without claiming the prefix-list itself enumerates them
  // (the registry is keyed by prefix, not by event type).
  const STRAYLIGHT_PREFIX = '0xhoneyjar:straylight:';
  const STRAYLIGHT_CONVENTIONAL_TYPES = [
    '0xhoneyjar:straylight:assertion.admitted',
    '0xhoneyjar:straylight:assertion.challenged',
    '0xhoneyjar:straylight:assertion.revoked',
    '0xhoneyjar:straylight:assertion.forgotten',
    '0xhoneyjar:straylight:estate.transition.applied',
    '0xhoneyjar:straylight:recall.request.received',
    '0xhoneyjar:straylight:recall.pack.assembled',
    '0xhoneyjar:straylight:recall.receipt.signed',
    '0xhoneyjar:straylight:commitment.anchored',
  ] as const;

  it('registers the 0xhoneyjar:straylight: prefix in AUDIT_EVENT_TYPES_KNOWN_PREFIXES', () => {
    expect(AUDIT_EVENT_TYPES_KNOWN_PREFIXES).toContain(STRAYLIGHT_PREFIX);
  });

  it.each(STRAYLIGHT_CONVENTIONAL_TYPES)(
    '%s is a structurally well-formed 3-segment event type',
    (eventType) => {
      expect(isThreeSegmentEventType(eventType)).toBe(true);
    },
  );

  it.each(STRAYLIGHT_CONVENTIONAL_TYPES)(
    '%s round-trips to the registered straylight prefix',
    (eventType) => {
      expect(extractEventTypePrefix(eventType)).toBe(STRAYLIGHT_PREFIX);
    },
  );
});
