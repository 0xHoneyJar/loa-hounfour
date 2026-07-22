/**
 * Hounfour runtime string-format semantics.
 *
 * This module is the single source of truth for the runtime behavior of the
 * `date-time`, `uri`, and `uuid` string formats used by protocol schemas.
 * The exact semantics are documented per format below and in
 * `docs/architecture/runtime-validation.md` — consumers and cross-language
 * runners MUST implement the same rules to stay wire-compatible.
 *
 * Determinism contract: `registerHounfourFormats()` registers these
 * validators into TypeBox's process-global `FormatRegistry`
 * **unconditionally** (overwriting any pre-existing registration for the
 * three format names). This makes Hounfour validation semantics independent
 * of host-application import order — a consumer that registered a weaker
 * `date-time` before Hounfour loaded can no longer silently weaken protocol
 * validation. Hosts that intentionally mutate these formats AFTER Hounfour
 * loads own the consequences; call `registerHounfourFormats()` again to
 * restore protocol semantics.
 *
 * @see docs/architecture/runtime-validation.md
 * @since v8.7.x — issues #120, #122, #123, #141, #147, #152
 */
import { FormatRegistry } from '@sinclair/typebox';

/**
 * Strict ISO 8601 / RFC 3339 date-time shape:
 * `YYYY-MM-DDTHH:MM:SS(.fraction)?(Z|±HH:MM)`.
 *
 * Deliberately stricter than RFC 3339 in two documented ways:
 * - `T` and `Z` MUST be uppercase (lowercase `t`/`z` are rejected).
 * - Leap seconds (`:60`) are rejected — second is bounded to `00–59` so
 *   temporal comparisons are total and deterministic across runtimes.
 */
const DATE_TIME_SHAPE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Strict `date-time` format validation.
 *
 * Semantics (all MUST hold):
 * 1. Shape matches `YYYY-MM-DDTHH:MM:SS(.fraction)?(Z|±HH:MM)`
 *    (uppercase `T`/`Z`; fraction is one or more digits).
 * 2. Calendar correctness: month `01–12`, day `01–<days in month>`
 *    (leap-year aware — `2024-02-29` is valid, `2026-02-29` is not).
 * 3. Clock bounds: hour `00–23`, minute `00–59`, second `00–59`
 *    (leap second `60` rejected by design; see module doc).
 * 4. Offset bounds: `Z` or `±HH:MM` with hour `00–23`, minute `00–59`.
 *
 * Shape-valid but semantically impossible instants (e.g.
 * `2026-99-99T99:99:99Z`, `2026-02-30T10:00:00Z`, `2026-01-01T10:00:00+99:00`)
 * are rejected — they previously passed the shape-only check and made
 * temporal cross-field comparisons fail open via `Invalid Date` (issue #120).
 */
export function isStrictIsoDateTime(value: string): boolean {
  return matchIsoComponents(value) !== null;
}

/**
 * Shared shape + bounds check. Returns the regex match when every rule on
 * {@link isStrictIsoDateTime} holds, else `null`. Hot path — no allocation
 * beyond the regex match array.
 */
function matchIsoComponents(value: string): RegExpExecArray | null {
  const match = DATE_TIME_SHAPE.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) return null;
  const maxDay = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
  if (day < 1 || day > maxDay) return null;
  if (Number(match[4]) > 23 || Number(match[5]) > 59 || Number(match[6]) > 59) return null;

  const offset = match[8];
  if (offset !== 'Z') {
    if (Number(offset.slice(1, 3)) > 23 || Number(offset.slice(4, 6)) > 59) return null;
  }
  return match;
}

/**
 * Strict ISO 8601 date-time parser. Returns the represented instant as a
 * `Date`, or `null` when the input violates any rule listed on
 * {@link isStrictIsoDateTime}. Use this helper instead of ad hoc
 * `new Date(...)` comparisons so temporal checks fail closed on
 * unparsable input (issue #120).
 */
export function parseIsoDateTimeStrict(value: string): Date | null {
  const match = matchIsoComponents(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const fraction = match[7] ?? '';
  const offset = match[8];

  let offsetMinutes = 0;
  if (offset !== 'Z') {
    offsetMinutes = Number(offset.slice(1, 3)) * 60 + Number(offset.slice(4, 6));
    if (offset.startsWith('-')) offsetMinutes = -offsetMinutes;
  }

  // Truncate (never round) to millisecond precision: rounding `.9999`
  // would roll the instant into the next second and misrepresent ordering
  // at second boundaries.
  const millis = fraction ? Number(fraction.slice(0, 3).padEnd(3, '0')) : 0;
  // Date.UTC applies the legacy two-digit-year offset (years 0–99 map to
  // 1900–1999). Build with a fixed leap-safe year, then set the real year
  // explicitly so 0000–0099 represent their proleptic-Gregorian instants.
  const utcDate = new Date(Date.UTC(2000, month - 1, day, hour, minute, second, millis));
  utcDate.setUTCFullYear(year);
  return new Date(utcDate.getTime() - offsetMinutes * 60_000);
}

/**
 * Characters that must never appear raw in a protocol URI, expressed as a
 * printable-ASCII allowlist (`!`–`~` minus backslash). The WHATWG URL
 * parser silently strips ASCII tab/newline, percent-encodes other
 * whitespace AND raw non-ASCII (e.g. `https://example.com/ x`), and
 * punycodes Unicode hostnames (`https://例え.テスト/`), so an explicit
 * pre-parse reject keeps the wire artifact canonical (what validates is
 * byte-for-byte what downstream parsers see). Raw backslash is excluded
 * from the allowlist: the WHATWG parser normalizes `\` to `/` in http(s)
 * URLs, so `https://example.com\evil` would silently change meaning
 * between validation and downstream parsing. Non-ASCII destinations are
 * still expressible — in their canonical percent-encoded/punycoded form.
 */
const URI_FORBIDDEN_CHARS = /[^\u0021-\u005B\u005D-\u007E]/;

/**
 * Strict `uri` format validation.
 *
 * Semantics (all MUST hold):
 * 1. No whitespace or C0/DEL control characters anywhere in the raw string.
 * 2. The string parses under the WHATWG URL parser (`new URL(value)`).
 * 3. The scheme is `http:` or `https:` — the same scheme restriction the
 *    previous shape-only check (`/^https?:\/\/.+/`) enforced, now paired
 *    with real structural parsing.
 * 4. The parsed URL has a non-empty hostname.
 *
 * This rejects inputs the old regex accepted, such as `http:// /`,
 * `https://exa mple.com/x`, and `http://<NUL>evil` (issue #122).
 */
const URI_CANONICAL_PREFIX = /^https?:\/\//;

export function isStrictHttpUri(value: string): boolean {
  if (URI_FORBIDDEN_CHARS.test(value)) return false;
  // The WHATWG parser silently repairs slash-deficient spellings like
  // `https:/example.com` and `https:example.com`; the wire artifact must
  // already be canonical, so reject them before parsing.
  if (!URI_CANONICAL_PREFIX.test(value)) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  return url.hostname.length > 0;
}

/**
 * RFC 4122 hyphenated UUID (any version), case-insensitive.
 * Unchanged from the pre-v8.7.x behavior — documented here so the full
 * runtime format surface has one specification home.
 */
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Strict `uuid` format validation. See {@link UUID_SHAPE}. */
export function isStrictUuid(value: string): boolean {
  return UUID_SHAPE.test(value);
}

/**
 * The canonical Hounfour runtime format set. Exposed so consumers and tests
 * can assert registry state (`FormatRegistry.Get('uri') === HOUNFOUR_FORMATS.uri`)
 * without re-deriving semantics.
 */
export const HOUNFOUR_FORMATS = {
  'date-time': isStrictIsoDateTime,
  uri: isStrictHttpUri,
  uuid: isStrictUuid,
} as const;

/**
 * Register (or re-assert) Hounfour's strict format validators in TypeBox's
 * process-global `FormatRegistry`. Called at `validators/index.js` module
 * load; idempotent and safe to call again at any time — e.g. from a host
 * application's startup path to guarantee protocol semantics after other
 * libraries may have mutated the global registry (issues #123 / #147).
 */
export function registerHounfourFormats(): void {
  for (const [name, check] of Object.entries(HOUNFOUR_FORMATS)) {
    FormatRegistry.Set(name, check);
  }
}

/**
 * Assert that the process-global `FormatRegistry` currently resolves the
 * three Hounfour formats to the canonical implementations. Returns the list
 * of format names that DIVERGE (empty array = deterministic protocol
 * semantics are in force). Hosts embedding multiple TypeBox users can call
 * this at startup and either fail fast or re-run
 * {@link registerHounfourFormats}.
 */
export function assertHounfourFormats(): string[] {
  const divergent: string[] = [];
  for (const [name, check] of Object.entries(HOUNFOUR_FORMATS)) {
    if (FormatRegistry.Get(name) !== check) divergent.push(name);
  }
  return divergent;
}
