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
import { Type, type Static } from '@sinclair/typebox';

export const SurfaceContextSchema = Type.Union(
  [
    Type.Literal('public', {
      description: 'Consumer-public surface; recipient may share the recall publicly.',
    }),
    Type.Literal('private', {
      description: 'Consumer-private surface; recipient must keep the recall internal.',
    }),
    Type.Literal('system', {
      description: 'System / infrastructure surface (logs, telemetry, internal control plane).',
    }),
    Type.Literal('demo', {
      description: 'Demo / showcase surface; not an audit-grade surface.',
    }),
    Type.Literal('test', {
      description: 'Test surface; never an audit-grade surface.',
    }),
    Type.String({
      pattern: '^[a-z][a-z0-9]+:[a-z][a-z0-9_-]+:[a-z][a-z0-9_-]+$',
      description:
        '3-segment consumer namespace: <github-org>:<consumer>:<surface>. Hounfour does not register namespaces; uniqueness is consumer-coordination concern.',
    }),
  ],
  {
    $id: 'SurfaceContext',
    description:
      'Environment selector for recall machinery. Closed 5-member core (public | private | system | demo | test) plus a 3-segment consumer namespace fallback. The combined regex (^([a-z]+|[a-z][a-z0-9]+:[a-z][a-z0-9_-]+:[a-z][a-z0-9_-]+)$) matches either form for cross-runner parity.',
  },
);

export type SurfaceContext = Static<typeof SurfaceContextSchema>;
