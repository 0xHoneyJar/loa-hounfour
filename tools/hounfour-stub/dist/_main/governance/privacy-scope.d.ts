/**
 * `PrivacyScope` — privacy classification for `Assertion` payloads.
 *
 * Four substrate-agnostic levels covering the spectrum from
 * fully-public to consumer-restricted. The classification is
 * vocabulary only; *enforcement* (who may read which scope) is
 * consumer-side per ADR-010.
 *
 * Member set locked in PR-A2.3 reuse-audit.
 *
 * @see AssertionSchema
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.3)
 */
import { type Static } from '@sinclair/typebox';
export declare const PrivacyScopeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"participants_only">, import("@sinclair/typebox").TLiteral<"controller_only">, import("@sinclair/typebox").TLiteral<"compliance_only">]>;
export type PrivacyScope = Static<typeof PrivacyScopeSchema>;
//# sourceMappingURL=privacy-scope.d.ts.map