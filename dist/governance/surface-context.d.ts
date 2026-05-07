/**
 * `SurfaceContext` — environment selector for recall machinery.
 *
 * The closed substrate-agnostic core lists the five environment
 * surfaces every consumer is expected to discriminate against
 * (`public`, `private`, `system`, `demo`, `test`). Anything outside
 * the core is expressed via a 3-segment dotted-string namespace
 * `<github-org>:<consumer>:<surface>` so consumers can mint their
 * own surfaces without registry coordination.
 *
 * The combined regex `^([a-z]+|[a-z][a-z0-9]+:[a-z][a-z0-9_-]+:[a-z][a-z0-9_-]+)$`
 * matches either form for cross-runner parity (Go / Python / Rust
 * runners can carry a single regex literal rather than a union of
 * literal-set + pattern).
 *
 * Hounfour does NOT register or arbitrate consumer namespace
 * uniqueness — that is consumer-coordination concern (per
 * `prd.md:356-357`).
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.3)
 */
import { type Static } from '@sinclair/typebox';
export declare const SurfaceContextSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"private">, import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"demo">, import("@sinclair/typebox").TLiteral<"test">, import("@sinclair/typebox").TString]>;
export type SurfaceContext = Static<typeof SurfaceContextSchema>;
//# sourceMappingURL=surface-context.d.ts.map