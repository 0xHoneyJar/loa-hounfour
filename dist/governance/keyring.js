/**
 * Layer-2 keyring — collection of `SignerEntry` records owned by an
 * organization (`org_id` foreign-keys to `OrgIdentity.org_id`).
 *
 * The keyring is the cryptographic-material container in the
 * authority cascade. Layer 1 (constitutional) anchors the org;
 * Layer 2 (this) holds its signers; Layer 3 (action-matching) decides
 * whether a given signer's trust profile satisfies the action's
 * required capability scopes.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/authority-cascade.md
 * @since v8.5.0 (PR-A2.2)
 */
import { Type } from '@sinclair/typebox';
import { SignerEntrySchema } from './signer-entry.js';
export const KeyringSchema = Type.Object({
    keyring_id: Type.String({
        format: 'uuid',
        description: 'Stable opaque identifier for this keyring (UUID v4).',
    }),
    org_id: Type.String({
        format: 'uuid',
        description: 'Foreign key to OrgIdentity.org_id — the constitutional principal owning this keyring.',
    }),
    signers: Type.Array(SignerEntrySchema, {
        minItems: 1,
        description: 'At least one signer must be enrolled. Empty keyrings are not meaningful.',
    }),
    created_at: Type.String({
        format: 'date-time',
        description: 'When the keyring was first published.',
    }),
    updated_at: Type.String({
        format: 'date-time',
        description: 'When the keyring last had a SignerEntry added, removed, or status-changed.',
    }),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Hounfour contract version this keyring instance was authored against.',
    }),
}, {
    $id: 'Keyring',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description: 'Layer-2 keyring: collection of SignerEntry records owned by an organization. Composes with v8.4.0 OrgIdentity (Layer 1) and v8.5.0 SignerCompetenceRule (Layer 3) to form the three-layer authority cascade. Cross-field validation enforces signer_id uniqueness within signers[] (KR-1) and warns on duplicate key_ref entries (KR-2 — duplicate references to the same underlying key are typically a misconfiguration).',
});
//# sourceMappingURL=keyring.js.map