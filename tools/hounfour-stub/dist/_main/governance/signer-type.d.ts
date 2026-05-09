/**
 * Classification of the entity that produced a signature.
 *
 * Distinct from `AgentType` (which classifies an `AgentIdentity`'s role
 * in the protocol). `SignerType` describes the *signer* side of a
 * `SignatureEnvelope` — the signing-entity kind that consumed a
 * `SignerEntry` from a `Keyring` to produce the signature.
 *
 * 8 substrate-agnostic members; consumers extend at their own
 * boundary with consumer-side tags rather than mutating this enum.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.2)
 */
import { type Static } from '@sinclair/typebox';
export declare const SignerTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"agent">, import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"organization">, import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"delegate">, import("@sinclair/typebox").TLiteral<"oracle">, import("@sinclair/typebox").TLiteral<"witness">, import("@sinclair/typebox").TLiteral<"device">]>;
export type SignerType = Static<typeof SignerTypeSchema>;
//# sourceMappingURL=signer-type.d.ts.map