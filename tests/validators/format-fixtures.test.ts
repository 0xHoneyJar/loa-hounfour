/**
 * Runtime string-format fixture tables — pass AND reject cases for every
 * runtime format Hounfour registers (`date-time`, `uri`, `uuid`).
 *
 * These are the executable format semantics demanded by issues #120, #122,
 * #132, #137, #141, #152, #158: each format has a documented fixture table
 * of accepted and rejected inputs, run in CI, so a format behavior change is
 * review-visible as a fixture diff.
 *
 * @see docs/architecture/runtime-validation.md — format semantics spec
 */
import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import {
  validate,
  isStrictIsoDateTime,
  isStrictHttpUri,
  isStrictUuid,
  parseIsoDateTimeStrict,
} from '../../src/validators/index.js';

// ---------------------------------------------------------------------------
// date-time
// ---------------------------------------------------------------------------

const DATE_TIME_ACCEPT: string[] = [
  '2026-01-01T00:00:00Z',
  '2026-12-31T23:59:59Z',
  '2026-02-16T10:00:00.123Z',
  '2026-02-16T10:00:00.000000001Z',
  '2024-02-29T12:00:00Z', // leap year
  '2000-02-29T12:00:00Z', // 400-year leap rule
  '2026-06-15T10:30:00+05:30',
  '2026-06-15T10:30:00-08:00',
  '2026-06-15T10:30:00+23:59', // max offset bound
];

const DATE_TIME_REJECT: string[] = [
  // shape violations (also rejected by the previous regex)
  '2026-01-01', // date only
  '2026-01-01T00:00:00', // missing offset
  '2026-01-01 00:00:00Z', // space separator
  '2026-1-1T00:00:00Z', // non-padded
  'not-a-date',
  '',
  // shape-valid but semantically impossible (the issue #120 class —
  // accepted by the old shape-only check, now rejected)
  '2026-99-99T99:99:99Z',
  '2026-00-10T10:00:00Z', // month 0
  '2026-13-01T10:00:00Z', // month 13
  '2026-01-00T10:00:00Z', // day 0
  '2026-01-32T10:00:00Z', // day 32
  '2026-02-29T10:00:00Z', // not a leap year
  '2100-02-29T10:00:00Z', // 100-year rule: not a leap year
  '2026-04-31T10:00:00Z', // April has 30 days
  '2026-01-01T24:00:00Z', // hour 24
  '2026-01-01T10:60:00Z', // minute 60
  '2026-01-01T10:00:60Z', // leap second — rejected by design
  '2026-01-01T10:00:00+24:00', // offset hour out of bounds
  '2026-01-01T10:00:00+05:60', // offset minute out of bounds
  // documented strictness beyond RFC 3339
  '2026-01-01t10:00:00Z', // lowercase t
  '2026-01-01T10:00:00z', // lowercase z
];

// ---------------------------------------------------------------------------
// uri
// ---------------------------------------------------------------------------

const URI_ACCEPT: string[] = [
  'https://example.com',
  'https://example.com/',
  'http://example.com/path?query=1#frag',
  'https://sub.example.com:8443/deep/path',
  'https://127.0.0.1:3000/health',
  'https://xn--nxasmq6b.example/idn',
];

const URI_REJECT: string[] = [
  // rejected by the old regex too
  'ftp://example.com', // unsupported scheme
  'example.com', // no scheme
  '//example.com', // protocol-relative
  '', // empty
  'https:/example.com', // malformed scheme separator
  // accepted by the old regex `/^https?:\/\/.+/`, rejected now (issue #122)
  'http:// ', // whitespace host
  'http://', // nothing after scheme (old regex needed only ONE char: 'http://x' vs this fails both)
  'https://exa mple.com/x', // space in host
  'https://example.com/pa th', // raw space in path
  'https://example.com/\tpath', // control char
  'https://example.com/\npath', // newline
  'http://[invalid', // unparsable host
  // raw backslash — WHATWG normalizes `\` to `/` in http(s) URLs, so the
  // validated string would differ from what downstream parsers see
  'https://example.com\\evil.com/x',
  'https://example.com/a\\b',
  'https:\\\\example.com', // backslash scheme separator
];

// ---------------------------------------------------------------------------
// uuid
// ---------------------------------------------------------------------------

const UUID_ACCEPT: string[] = [
  '550e8400-e29b-41d4-a716-446655440000',
  '550E8400-E29B-41D4-A716-446655440000', // case-insensitive
  '00000000-0000-0000-0000-000000000000', // nil UUID
];

const UUID_REJECT: string[] = [
  '550e8400e29b41d4a716446655440000', // no hyphens
  '550e8400-e29b-41d4-a716-44665544000', // short
  '550e8400-e29b-41d4-a716-4466554400000', // long
  'g50e8400-e29b-41d4-a716-446655440000', // non-hex
  '',
];

// ---------------------------------------------------------------------------
// Table runner — both the exported predicate and the compiled-schema path
// (proves TypeCompiler resolves the format to the same semantics).
// ---------------------------------------------------------------------------

const cases: Array<{
  format: 'date-time' | 'uri' | 'uuid';
  fn: (v: string) => boolean;
  accept: string[];
  reject: string[];
}> = [
  { format: 'date-time', fn: isStrictIsoDateTime, accept: DATE_TIME_ACCEPT, reject: DATE_TIME_REJECT },
  { format: 'uri', fn: isStrictHttpUri, accept: URI_ACCEPT, reject: URI_REJECT },
  { format: 'uuid', fn: isStrictUuid, accept: UUID_ACCEPT, reject: UUID_REJECT },
];

for (const { format, fn, accept, reject } of cases) {
  describe(`${format} format fixtures`, () => {
    const schema = Type.Object(
      { value: Type.String({ format }) },
      { $id: `FormatFixture_${format}` },
    );

    for (const value of accept) {
      it(`accepts ${JSON.stringify(value)}`, () => {
        expect(fn(value)).toBe(true);
        expect(validate(schema, { value }).valid).toBe(true);
      });
    }
    for (const value of reject) {
      it(`rejects ${JSON.stringify(value)}`, () => {
        expect(fn(value)).toBe(false);
        expect(validate(schema, { value }).valid).toBe(false);
      });
    }
  });
}

describe('parseIsoDateTimeStrict', () => {
  it('parses a UTC instant to the exact epoch millis', () => {
    expect(parseIsoDateTimeStrict('2026-01-01T00:00:00Z')?.getTime()).toBe(
      Date.UTC(2026, 0, 1, 0, 0, 0, 0),
    );
  });

  it('applies positive offsets (instant is offset-adjusted)', () => {
    expect(parseIsoDateTimeStrict('2026-01-01T05:30:00+05:30')?.getTime()).toBe(
      Date.UTC(2026, 0, 1, 0, 0, 0, 0),
    );
  });

  it('applies negative offsets', () => {
    expect(parseIsoDateTimeStrict('2025-12-31T16:00:00-08:00')?.getTime()).toBe(
      Date.UTC(2026, 0, 1, 0, 0, 0, 0),
    );
  });

  it('parses fractional seconds', () => {
    expect(parseIsoDateTimeStrict('2026-01-01T00:00:00.250Z')?.getTime()).toBe(
      Date.UTC(2026, 0, 1, 0, 0, 0, 250),
    );
  });

  it('truncates (never rounds) sub-millisecond fractions — .9999 stays in its second', () => {
    expect(parseIsoDateTimeStrict('2025-12-31T23:59:59.9999Z')?.getTime()).toBe(
      Date.UTC(2025, 11, 31, 23, 59, 59, 999),
    );
    // short fractions are padded, not scaled
    expect(parseIsoDateTimeStrict('2026-01-01T00:00:00.5Z')?.getTime()).toBe(
      Date.UTC(2026, 0, 1, 0, 0, 0, 500),
    );
  });

  it('represents years 0000–0099 without the legacy Date.UTC 1900 offset', () => {
    const y1 = parseIsoDateTimeStrict('0001-01-01T00:00:00Z');
    expect(y1?.getUTCFullYear()).toBe(1);
    const y99 = parseIsoDateTimeStrict('0099-12-31T23:59:59Z');
    expect(y99?.getUTCFullYear()).toBe(99);
    const y0 = parseIsoDateTimeStrict('0000-01-01T00:00:00Z');
    expect(y0?.getUTCFullYear()).toBe(0);
    // leap-day in an early leap year survives the fixed-year construction
    const leap = parseIsoDateTimeStrict('0004-02-29T00:00:00Z');
    expect(leap?.getUTCFullYear()).toBe(4);
    expect(leap?.getUTCMonth()).toBe(1);
    expect(leap?.getUTCDate()).toBe(29);
  });

  it('fails closed (null) on every reject fixture', () => {
    for (const value of DATE_TIME_REJECT) {
      expect(parseIsoDateTimeStrict(value)).toBeNull();
    }
  });
});
