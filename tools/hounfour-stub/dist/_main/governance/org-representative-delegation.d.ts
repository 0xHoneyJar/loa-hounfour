/**
 * OrgRepresentativeDelegation — append-only delegation log binding org public
 * key → representative AgentIdentity, optionally chained through prior
 * delegations to a genesis sentinel.
 *
 * Each record is Ed25519-signed and bears a `signing_context` envelope
 * (audience = org_id, scope = `'org-delegation/grant'` | `'org-delegation/revoke'`,
 * contract_version) to prevent cross-org and cross-lifecycle replay.
 *
 * The chain is rooted at the literal genesis sentinel string
 * `"genesis:org-public-key"` (SDD section 3.6 ORD-3): the first delegation in
 * a chain has `granted_by == "genesis:org-public-key"`; subsequent records
 * have `granted_by == <prior-delegation-id>`. Maximum chain depth is 20.
 *
 * Cross-field rules ORD-1..3 (constraints/OrgRepresentativeDelegation.constraints.json):
 *   - ORD-1: Ed25519 signature verification — *runtime-deferred* per NF-1
 *   - ORD-2: revocation lifecycle append-only — *runtime-deferred* (single-record stateless)
 *   - ORD-3: chain validity + depth bound — *library*, via `is_valid_dag` (PR-A1.3)
 *
 * **ORD-3 chain-context obligation (consumer-supplied).** ORD-3 references
 * `granted_by_chain_records` — a name that is NOT a field on this schema.
 * The library evaluator picks up this name only when the consumer constructs
 * a validation-context object of the form
 * `{ ...orgRepresentativeDelegationFields, granted_by_chain_records: [...] }`
 * and passes it to the validator. The chain array MUST contain the record
 * under validation plus all ancestors back to (and including) the genesis-
 * rooted record, AND a synthetic terminator entry of the form
 * `{ delegation_id: 'genesis:org-public-key' }` so that `is_valid_dag` can
 * resolve the genesis-rooted record's `granted_by` reference against its
 * id-index (without the synthetic terminator the dangling-ref check would
 * misclassify the sentinel pointer). When `granted_by_chain_records` is
 * omitted, ORD-3 evaluates to vacuous-true; consumers SHOULD treat absence-
 * of-context as a configuration error in their integration suite, not
 * permission to skip enforcement. Reference walk-through and worked example
 * land in `docs/architecture/org-overseer.md` (PR-A1.6).
 *
 * @see SDD section 3.4.2 — OrgRepresentativeDelegation required fields, signing_context binding
 * @see SDD section 3.6 — ORD-3 genesis sentinel encoding
 * @see Issue #61 — Source RFC
 * @since v8.4.0 (FR-B2)
 */
import { type Static } from '@sinclair/typebox';
/**
 * Genesis sentinel literal string. The first delegation in a chain (granted
 * directly by the cold-storage `org_public_key`) records `granted_by` as
 * this exact value. Stable cross-runner per SDD section 3.6.
 */
export declare const ORG_DELEGATION_GENESIS_SENTINEL: "genesis:org-public-key";
export declare const OrgRepresentativeDelegationSchema: import("@sinclair/typebox").TObject<{
    delegation_id: import("@sinclair/typebox").TString;
    org_id: import("@sinclair/typebox").TString;
    representative: import("@sinclair/typebox").TObject<{
        agent_id: import("@sinclair/typebox").TString;
        display_name: import("@sinclair/typebox").TString;
        agent_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model">, import("@sinclair/typebox").TLiteral<"orchestrator">, import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"service">, import("@sinclair/typebox").TLiteral<"composite">]>;
        capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        trust_scopes: import("@sinclair/typebox").TObject<{
            scopes: import("@sinclair/typebox").TObject<{
                billing: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                governance: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                inference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                delegation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                audit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                composition: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
            }>;
            default_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>;
            match_strategy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"exact">, import("@sinclair/typebox").TLiteral<"subset">, import("@sinclair/typebox").TLiteral<"superset">]>>;
            precedence_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        }>;
        delegation_authority: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        max_delegation_depth: import("@sinclair/typebox").TInteger;
        governance_weight: import("@sinclair/typebox").TNumber;
        metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
        contract_version: import("@sinclair/typebox").TString;
    }>;
    capability_scope: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>;
    expiry: import("@sinclair/typebox").TString;
    revocation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        revoked: import("@sinclair/typebox").TLiteral<true>;
        revoked_at: import("@sinclair/typebox").TString;
        revoked_by: import("@sinclair/typebox").TString;
        reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    granted_by: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TLiteral<"genesis:org-public-key">]>;
    chain_depth: import("@sinclair/typebox").TInteger;
    signature: import("@sinclair/typebox").TString;
    signed_by: import("@sinclair/typebox").TString;
    signing_key_id: import("@sinclair/typebox").TString;
    signing_algorithm: import("@sinclair/typebox").TLiteral<"ed25519">;
    signed_at: import("@sinclair/typebox").TString;
    signing_context: import("@sinclair/typebox").TObject<{
        audience: import("@sinclair/typebox").TString;
        scope: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>;
}>;
export type OrgRepresentativeDelegation = Static<typeof OrgRepresentativeDelegationSchema>;
//# sourceMappingURL=org-representative-delegation.d.ts.map