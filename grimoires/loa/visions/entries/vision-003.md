# Vision 003: Timestamp Validation at Audit Trail I/O Boundary

## Source
- Bridge: freeside PR #99 (bridge-20260226-6bb222), Iteration 1, high-1
- Finding Severity: HIGH

## Insight

Freeside's reputation event router had `new Date(event.timestamp)` without validation — malformed input returns `Invalid Date`, propagating NULL/invalid timestamps into the audit chain. This was flagged as HIGH severity because once an invalid timestamp enters the hash chain, it becomes permanently embedded (chain immutability means you can't fix it retroactively).

Hounfour exports `computeAuditEntryHash()` and `computeChainBoundHash()` which accept a `timestamp: string` field, but neither validates the timestamp format. The validation burden falls entirely on consumers.

## Pattern

```typescript
// Proposed: hounfour exports a strict timestamp parser
export function parseAuditTimestamp(input: string): string {
  const date = new Date(input);
  if (isNaN(date.getTime())) {
    throw new AuditTrailError(`Invalid timestamp: ${input}`);
  }
  return date.toISOString(); // Canonical ISO 8601 format
}

// Or: TypeBox schema with format validation
export const AuditTimestampSchema = Type.String({
  format: 'date-time',
  description: 'ISO 8601 timestamp — validated at I/O boundary before chain entry',
});
```

## Applicability

- All consumers writing audit trail entries
- Defensive validation at the protocol layer prevents poison entries
- TypeBox `format: 'date-time'` already exists but is not enforced by `computeAuditEntryHash()`

## Connection

- FR-5 (audit trail utilities)
- Freeside PR #99 bridge finding high-1
- General pattern: validate at system boundaries, not deep in business logic
