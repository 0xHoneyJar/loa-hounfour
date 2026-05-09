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
import { Type } from '@sinclair/typebox';
export const SignerStatusSchema = Type.Union([
    Type.Literal('active', {
        description: 'Signer is current and may produce signatures.',
    }),
    Type.Literal('revoked', {
        description: 'Signer is permanently invalidated (key compromise, intentional rotation, or sanction).',
    }),
    Type.Literal('expired', {
        description: 'Signer has aged out per the keyring policy. Past signatures remain verifiable; new ones are not accepted.',
    }),
], {
    $id: 'SignerStatus',
    description: 'Lifecycle state of a SignerEntry within a Keyring. Orthogonal to AgentLifecycleState.',
});
//# sourceMappingURL=signer-status.js.map