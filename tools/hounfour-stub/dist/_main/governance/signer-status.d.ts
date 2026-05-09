/**
 * Lifecycle state of a `SignerEntry` within a `Keyring`.
 *
 * Orthogonal to `AgentLifecycleState` (which tracks the agent / actor
 * itself). A signer can be `revoked` while its underlying agent is
 * still `active` — e.g. a compromised key is rotated while the agent
 * keeps operating with a fresh signer.
 *
 * 3 members.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.2)
 */
import { type Static } from '@sinclair/typebox';
export declare const SignerStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"revoked">, import("@sinclair/typebox").TLiteral<"expired">]>;
export type SignerStatus = Static<typeof SignerStatusSchema>;
//# sourceMappingURL=signer-status.d.ts.map