# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] — 2026-02-12

### Added

- **ERROR_HTTP_STATUS mapping** (Finding 2): Canonical HTTP status codes for all 31 error codes. Ensures loa-finn and arrakis return consistent HTTP statuses for the same error conditions. Exported from `vocabulary/errors.ts`.
- **SSE sequence field** (Finding 3): Optional `sequence: integer` field on all 6 stream event types (`stream_start`, `chunk`, `tool_call`, `usage`, `stream_end`, `error`). Enables SSE reconnection via `Last-Event-ID`.
- **PoolCapabilitiesSchema** (Finding 5): TypeBox schema for pool capability declarations. Shape validation only — actual values remain in consumer config. Exported from `vocabulary/pools.ts`.
- **Versioned $id URIs** (Finding 8): All generated JSON schemas now include `$id: "https://schemas.0xhoneyjar.com/loa-hounfour/{version}/{name}"` and `$comment` with contract version metadata.

### Fixed

- **Idempotency key collision** (Finding 1 — High): `deriveIdempotencyKey()` now uses `JSON.stringify([tenant, reqHash, provider, model])` instead of colon-delimited concatenation. Prevents collision when components contain `:`.
- **Version compatibility patch check** (Finding 4): `validateCompatibility()` now performs full semver comparison (major → minor → patch) instead of only major + minor.

### Improved

- **Decompression order documentation** (Finding 7): Inline documentation on `parseEncodings()` explaining HTTP Content-Encoding unwrap semantics per RFC 9110 §8.4.

### Source

All changes from [BridgeBuilder review of PR #61](https://github.com/0xHoneyJar/loa-finn/pull/61).
