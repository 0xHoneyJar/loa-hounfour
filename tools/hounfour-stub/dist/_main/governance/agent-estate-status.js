/**
 * `AgentEstateStatus` — lifecycle vocabulary for `AgentEstate`.
 *
 * Five substrate-agnostic states covering the spectrum from
 * provisioning to fully transferred / dissolved. The state machine
 * itself (which transitions are valid) is consumer-side per ADR-010;
 * hounfour ships only the vocabulary.
 *
 * Member set is normalized to substrate-agnostic from Eileen's
 * wedge-fitted `EstateStatus` enum and locked in PR-A2.3 reuse-audit
 * (per `prd.md:438-441`).
 *
 * @see AgentEstateSchema
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.3)
 */
import { Type } from '@sinclair/typebox';
export const AgentEstateStatusSchema = Type.Union([
    Type.Literal('provisioning', {
        description: 'Estate is being set up; controller_agent_id + keyring_id are being bound.',
    }),
    Type.Literal('active', {
        description: 'Estate is in normal operation; controller may sign and act.',
    }),
    Type.Literal('paused', {
        description: 'Estate signing is suspended; existing artifacts remain valid.',
    }),
    Type.Literal('transferring', {
        description: 'Estate is mid-transition to a new controller / keyring; intermediate state.',
    }),
    Type.Literal('dissolved', {
        description: 'Estate is wound down; no further signing. Historical artifacts remain.',
    }),
], {
    $id: 'AgentEstateStatus',
    description: 'Lifecycle vocabulary for AgentEstate. Five substrate-agnostic states: provisioning | active | paused | transferring | dissolved. State-machine validity is consumer-side per ADR-010.',
});
//# sourceMappingURL=agent-estate-status.js.map