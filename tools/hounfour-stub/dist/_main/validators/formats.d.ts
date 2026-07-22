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
export declare function isStrictIsoDateTime(value: string): boolean;
/**
 * Strict ISO 8601 date-time parser. Returns the represented instant as a
 * `Date`, or `null` when the input violates any rule listed on
 * {@link isStrictIsoDateTime}. Use this helper instead of ad hoc
 * `new Date(...)` comparisons so temporal checks fail closed on
 * unparsable input (issue #120).
 */
export declare function parseIsoDateTimeStrict(value: string): Date | null;
export declare function isStrictHttpUri(value: string): boolean;
/** Strict `uuid` format validation. See {@link UUID_SHAPE}. */
export declare function isStrictUuid(value: string): boolean;
/**
 * The canonical Hounfour runtime format set. Exposed so consumers and tests
 * can assert registry state (`FormatRegistry.Get('uri') === HOUNFOUR_FORMATS.uri`)
 * without re-deriving semantics.
 */
export declare const HOUNFOUR_FORMATS: {
    readonly 'date-time': typeof isStrictIsoDateTime;
    readonly uri: typeof isStrictHttpUri;
    readonly uuid: typeof isStrictUuid;
};
/**
 * Register (or re-assert) Hounfour's strict format validators in TypeBox's
 * process-global `FormatRegistry`. Called at `validators/index.js` module
 * load; idempotent and safe to call again at any time — e.g. from a host
 * application's startup path to guarantee protocol semantics after other
 * libraries may have mutated the global registry (issues #123 / #147).
 */
export declare function registerHounfourFormats(): void;
/**
 * Assert that the process-global `FormatRegistry` currently resolves the
 * three Hounfour formats to the canonical implementations. Returns the list
 * of format names that DIVERGE (empty array = deterministic protocol
 * semantics are in force). Hosts embedding multiple TypeBox users can call
 * this at startup and either fail fast or re-run
 * {@link registerHounfourFormats}.
 */
export declare function assertHounfourFormats(): string[];
//# sourceMappingURL=formats.d.ts.map