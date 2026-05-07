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
import { Type } from '@sinclair/typebox';
export const PrivacyScopeSchema = Type.Union([
    Type.Literal('public', {
        description: 'No privacy constraints; assertion may be shared without restriction.',
    }),
    Type.Literal('participants_only', {
        description: 'Assertion content visible only to participants in the deliberation.',
    }),
    Type.Literal('controller_only', {
        description: 'Assertion content visible only to the subject\'s controller_agent_id.',
    }),
    Type.Literal('compliance_only', {
        description: 'Assertion content visible only to compliance / audit roles; sensitive disclosures.',
    }),
], {
    $id: 'PrivacyScope',
    description: 'Privacy classification for Assertion payloads. Four substrate-agnostic levels: public | participants_only | controller_only | compliance_only. Vocabulary only — enforcement is consumer-side.',
});
//# sourceMappingURL=privacy-scope.js.map