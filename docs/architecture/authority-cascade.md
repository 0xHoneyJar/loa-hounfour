# Three-Layer Authority Cascade — v8.5.0

> **Status:** Live in v8.5.0 (PR-A2.2 lands Layer 2 + 3; v8.4.0 already shipped Layer 1)
> **See also:** [ADR-010](../adr/ADR-010-class-vs-policy-boundary.md), `docs/architecture/hashing-spec-freeze-v8.5.md`, `docs/migrations/v8.5.0-class-validation-intake.md`

A signature on its own says nothing about *who* may take *which*
action. v8.5.0 closes that loop with a three-layer cascade:
constitutional principal → cryptographic material → action-matching
rule. Each layer composes with the others under a single shared
`CapabilityScope` vocabulary. Hounfour ships the *shape*; consumers
ship the matchers, verifiers, and policy decisions per ADR-010.

## Layer composition

```
LAYER 1 — Constitutional (v8.4.0, shipped)
─────────────────────────────────────────
OrgIdentity { org_id, org_public_key, current_representatives[],
              constitutional_hash }
    ├── OrgRepresentativeDelegation
    │     { org_id, rep_id, capability_scope, expiry,
    │       revocation, granted_by_chain_records }
    │     (chain validated by is_valid_dag → org_public_key genesis)
    │     (v8.5.0 adds ORD-5 sub-rule: capability_scope binds to
    │      canonical CapabilityScope vocabulary)
    └── SuccessionPolicy { amend / rotate / add / remove thresholds }

LAYER 2 — Cryptographic material (v8.5.0)
─────────────────────────────────────────
Keyring (org_id FK → OrgIdentity.org_id)
   └── SignerEntry[]
        { signer_id, key_ref, public_key,
          signature_type, scoped_trust (CapabilityScopedTrust),
          signer_status }

LAYER 3 — Action-matching (v8.5.0)
─────────────────────────────────────────
SignerCompetenceRule[]
   { action_pattern, required_capability_scopes[]  ← canonical
     CapabilityScope vocabulary,
     threshold, revoked? }

SignerCompetenceResult
   { signer_id (FK), rule_id_matched, outcome (PolicyDecisionOutcome) }

SignatureEnvelope (crypto-bearing, x-crypto-bearing: true)
   { envelope_id, signature_type, key_ref (FK SignerEntry),
     signed_payload_hash, signature_value, signed_at }
```

The cascade is *single-action verification*: every protocol action
flows through Layers 3 → 2 → 1 to produce an `AccessDecision`. Layer
2 + 3 sit "below" the constitutional principal — they don't
re-authorize the org; they answer "given that this org's public key
delegated authority to this rep, may this signer's specific key sign
this specific action?".

## Consumer-side verification trace (single action)

A consumer presented with a `SignatureEnvelope` over an action
performs the trace below. **Hounfour does not perform any of these
steps**; per ADR-010 the library ships shape and the consumer ships
authority. The validate() runtime emits `unverified_obligations`
manifest entries for each step the consumer must perform.

```
   1. Recompute signed_payload_hash via safeCanonicalize(payload-minus-
      signatures-minus-signed_payload_hash). Reject on mismatch.
                                                  │
                                                  ▼
   2. Resolve SignatureEnvelope.key_ref to a SignerEntry inside the
      keyring associated with the action's org. Reject if signer_status
      is revoked or expired.
                                                  │
                                                  ▼
   3. Verify signature_value against SignerEntry.public_key using
      Ed25519. Reject on cryptographic failure.
                                                  │
                                                  ▼
   4. Find the SignerCompetenceRule whose action_pattern matches the
      action. If none match, reject (no rule no authority).
                                                  │
                                                  ▼
   5. Compare the matched rule's required_capability_scopes against
      the SignerEntry.scoped_trust per scoped_trust.match_strategy
      (default 'subset'). Reject if the trust profile does not satisfy.
                                                  │
                                                  ▼
   6. Walk Layer 1: confirm the signer's authority traces (via
      OrgRepresentativeDelegation.granted_by_chain_records) back to
      the org's genesis-rooted record (`is_valid_dag` already
      validates the DAG; consumer reconciles asserted vs traversed
      chain_depth per ORD-4).
                                                  │
                                                  ▼
   7. Emit AccessDecision { granted, outcome, signer_competence_result }
      threading the Layer-3 result through the economic boundary
      surface for downstream auditing.
```

## Vocabulary harmonization (single CapabilityScope language)

All three layers consume the *same* `CapabilityScope` vocabulary
defined in `src/schemas/agent-identity.ts`:

```typescript
type CapabilityScope =
  | 'billing' | 'governance' | 'inference'
  | 'delegation' | 'audit' | 'composition';
```

- **Layer 1**: `OrgRepresentativeDelegation.capability_scope` — what
  scope the rep was delegated authority over.
- **Layer 2**: `SignerEntry.scoped_trust.scopes[<scope>]` — the
  trust level the signer carries within each scope.
- **Layer 3**: `SignerCompetenceRule.required_capability_scopes[]` —
  the scopes a signer must satisfy to authorize a matching action.

Without harmonization, the cascade fragments into three parallel
scope languages and the consumer has to translate between them at
every boundary. The shared vocabulary collapses that translation to
a vocabulary-membership check; ORD-5 (warn-mode) emits a
`vocabulary_drift` manifest entry when consumer payloads use scope
keys outside the canonical set, surfacing fragmentation as a warning
without failing validation. Cycle-005 escalates ORD-5 to error
severity after a soak window per R3.

## Worked example — concrete `'allow'` decision

A model-provider service receives a request to charge a tenant for
inference. The request carries a `SignatureEnvelope`.

**Inputs:**

- `org_id`: `0xhoneyjar` (the org owning the keyring)
- `action`: `inference.invoke` (consumer-defined action descriptor)
- `signed_payload_hash`: `sha256:abcdef…` over `safeCanonicalize` of
  the inference payload
- `signature_value`: Ed25519 over the hash, signed by `signer_id: bot-001`
- The org's `Keyring` lists `bot-001` with `scoped_trust = {
  scopes: { billing: 'verified', inference: 'trusted' },
  default_level: 'basic', match_strategy: 'subset' }`
- `SignerCompetenceRule` for action `inference.*`: `required_capability_scopes:
  ['inference']`, `threshold: 500`

**Trace:**

1. Consumer recomputes `signed_payload_hash` via `safeCanonicalize`
   over the inference-payload-minus-signatures. Matches the carried
   value. **Pass.**
2. Resolves `key_ref → SignerEntry: bot-001`. `signer_status: active`.
   **Pass.**
3. Ed25519 verification of `signature_value` against `bot-001`'s
   `public_key`. **Pass.**
4. `action_pattern: 'inference.*'` matches `inference.invoke`. **Match.**
5. `required_capability_scopes: ['inference']` ⊆ `bot-001`'s
   `scoped_trust.scopes` keys (`['billing', 'inference']`) per
   `match_strategy: 'subset'`. Trust level `'trusted'` ≥ rule
   threshold equivalent. **Pass.**
6. Layer 1: `bot-001`'s authority chains back to `0xhoneyjar`'s
   genesis-rooted `OrgRepresentativeDelegation`. `chain_depth: 2 ≤ 20`;
   `is_valid_dag` succeeds; ORD-4 reconciliation matches asserted vs
   traversed depth. **Pass.**
7. Consumer emits `AccessDecision { granted: true, outcome: 'verified',
   signer_competence_result: { signer_id: 'bot-001', rule_id_matched:
   'rule-uuid-1', outcome: 'allow', evaluated_at: '...' } }`.

**Output:** action authorized; the model-provider proceeds with the
inference call.

## Consumer obligations (manifest reasons)

Calling `validate(SignatureEnvelopeSchema, payload, { acceptDeferred:
true })` emits an `unverified_obligations` manifest entry under
`rule_id: CRYPTO_DEFERRED`. Calling without `{ acceptDeferred: true }`
returns `{ valid: false, errors: [{ ... CRYPTO_DEFERRED ... }] }` —
the safe-by-default behavior that prevents consumers from writing
`if (validate(...).valid) { authorize(); }` and treating shape-validity
as authority.

The full manifest-extension vocabulary lands in PR-A2.3 alongside
the consumer-evaluator extension to `UnverifiedObligationsManifest`.
For PR-A2.2 the obligation is surfaced under the existing v8.4.0
shape with `evaluator: 'runtime-deferred'` and a `CRYPTO_DEFERRED`
rule_id; PR-A2.3 widens the type to carry `evaluator: 'consumer'`
with a `reason` vocabulary that includes:

- `crypto_deferred` — signature verification (this commit)
- `pattern_matching` — signer competence (Layer 3)
- `vocabulary_drift` — ORD-5 capability_scope check (Layer 1 ↔ canonical)
- `state_machine_deferred` — consumer-state transition disposition
- `integrity_deferred` — `CommitmentRoot.subject_hash` content verification

## Consumer import surface (per Issue #61 Drift A)

Per ADR-001 (root-barrel collision avoidance), the v8.5.0 authority-
cascade primitives are NOT re-exported from `'@0xhoneyjar/loa-hounfour'`
root. Consumers MUST import from the `/governance` subpath:

| Symbol | Subpath |
|---|---|
| `KeyringSchema`, `Keyring` | `/governance` |
| `SignerEntrySchema`, `SignerEntry` | `/governance` |
| `SignerCompetenceRuleSchema`, `SignerCompetenceRule` | `/governance` |
| `SignerCompetenceResultSchema`, `SignerCompetenceResult` | `/governance` |
| `SignatureEnvelopeSchema`, `SignatureEnvelope` | `/governance` |
| `SignerTypeSchema`, `SignerType` | `/governance` |
| `SignatureTypeSchema`, `SignatureType` | `/governance` |
| `SignerStatusSchema`, `SignerStatus` | `/governance` |
| `PolicyDecisionOutcomeSchema`, `PolicyDecisionOutcome` | `/governance` |
| `safeCanonicalize`, `CanonicalizeSizeError`, `SafeCanonicalizeOptions` | root |
| `assertStructurallyValid`, `assertCryptoBearingFailsByDefault` | `'@0xhoneyjar/loa-hounfour/test-infrastructure'` (when shipped) |
| `CapabilityScopeSchema`, `CapabilityScopedTrustSchema` (EXTENDED in v8.5.0) | `/core` |
| `AccessDecisionSchema` (EXTENDED in v8.5.0) | `/economy` |

Naïve root imports fail typecheck with `Module
'"@0xhoneyjar/loa-hounfour"' has no exported member 'KeyringSchema'`.
The fix is mechanical (subpath import) but the friction is real;
this table is the canonical reference.

```typescript
import {
  KeyringSchema,
  SignatureEnvelopeSchema,
  SignerCompetenceRuleSchema,
} from '@0xhoneyjar/loa-hounfour/governance';

import { safeCanonicalize } from '@0xhoneyjar/loa-hounfour';

import {
  CapabilityScopedTrustSchema,
} from '@0xhoneyjar/loa-hounfour/core';

import {
  AccessDecisionSchema,
} from '@0xhoneyjar/loa-hounfour/economy';
```

## Constraint-ID stability commitment

The authority-cascade constraint files (`constraints/Keyring.constraints.json`,
etc.) ship in v8.5.0 with stable `id` values that bind the contract:

- `SE-1` — `SignatureEnvelope` runtime-deferred consumer obligation
  (signature verification + payload-hash recomputation).
- `ORD-5` — `OrgRepresentativeDelegation` capability_scope binds to
  canonical `CapabilityScope` vocabulary (warn mode).

Subsequent PRs (PR-A2.3 onward) MAY add new constraint IDs
strict-additively. Removing or renaming an ID is a MAJOR-version
change. Constraint-ID stability is the binding contract; the
collapse-vs-ladder rebalancing observed in the v8.4.0 cycle (Issue
#61 Drift D) is documented as a one-time reconciliation, not the
norm going forward.

## Linked from

- `CLAUDE.md` (project overview)
- `SCHEMA-EVOLUTION.md` (versioning + extension policy)
