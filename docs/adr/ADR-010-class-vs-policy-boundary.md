# ADR-010: Class-vs-Policy Boundary

**Status**: Accepted
**Date**: 2026-05-06
**Source**: Issue #70 (wedge-class-validation schema intake)

## Context

ADR-008 committed `loa-hounfour` to ship enforcement utilities alongside
schemas (Path B — Governance SDK). v8.5.0 expands that surface with
authority-cascade primitives, recall machinery, forget records,
commitments, and an assertion family. Each new primitive carries a
gravitational pull toward "let's just ship the verifier too." This ADR
draws the hard line that line cannot cross.

## Decision

`loa-hounfour` ships **shape**; consumers ship **authority**. Stated
as four no-go invariants (verbatim from Issue #70:430-453):

1. **Valid JSON ≠ authorized action.** A `RecallRequest` may
   class-validate cleanly and still be policy-denied. Hounfour ships
   the request shape; consumers run authorization engines.
2. **Valid signature ≠ signer competence.** A signed envelope may
   verify cryptographically and still be denied because the signer
   lacks the matched rule's required scopes. Hounfour ships the
   envelope shape + competence-rule shape; consumers run keyring
   evaluators.
3. **Valid action shape ≠ allowed mutation.** Even after class
   validation passes and signer competence clears, consumers apply
   per-candidate disposition before mutation. Hounfour ships action
   and transition shapes; consumers run state machines.
4. **Valid object ≠ active truth.** Class validation accepts a body
   shape; the *authority* of an object is set by transitions.
   Hounfour ships the object shape; consumers own transitions.

## Mechanical enforcement — `scripts/check-class-policy-boundary.ts`

Five structural rules block accidental crossings of the boundary:

- **RULE-1**: `src/**/*.ts` — no exported function returning a union
  containing `'allow' | 'deny' | 'needs_review' | 'verified' |
  'rejected'`. Allowlisted: `src/validators/`.
- **RULE-2**: `src/**/*.ts` — no import from
  `@noble/hashes/{ed25519,secp256k1}` or any signature-verification
  subpath. SHA-256 imports OK.
- **RULE-3**: schema `$id` names — flag `*Evaluator`, `*Verifier`,
  `*Engine`, `*Matcher`. Allowlist documented inline.
- **RULE-4 (G1)**: `tests/**/*.ts` — flag `assertValid()` against
  crypto-bearing schemas. Required: `assertStructurallyValid()` or
  `assertCryptoBearingFailsByDefault()`.
- **RULE-5 (G3)**: `src/**/*.ts` and `tests/**/*.ts` — direct
  `canonicalize` package imports allowed only in
  `src/utilities/safe-canonicalize.ts`.

`npm run check:class-policy-boundary` runs in CI via `npm run
check:all`. Failure messages link back to this ADR plus the
originating finding (G1 / G3) so violators learn the rationale.

## Validation-result-vs-manifest discipline (F7 + G1)

For crypto-bearing schemas (`SignatureEnvelope`, `RecallReceipt`,
`CommitmentRoot`, `Assertion` with non-empty `signatures[]`), the
default behavior of `validate(Schema, payload)` fails closed:

```typescript
// CORRECT BY DEFAULT — naive call fails closed; cannot accidentally authorize
const r = validate(SignatureEnvelopeSchema, payload);
if (r.valid) { authorize(); }  // r.valid is false; authorize never fires.

// EXPLICIT OPT-IN — consumer acknowledges deferred verification + checks obligations
const r = validate(SignatureEnvelopeSchema, payload, { acceptDeferred: true });
if (r.valid && r.unverified_obligations.every(verifyDownstream)) { authorize(); }
```

The opt-in `{ acceptDeferred: true }` is the safety mechanism: it makes
"shape valid means authority granted" structurally impossible to write
by accident. Every consumer-evaluated check emits a manifest entry
with `evaluator: 'consumer'` and a controlled-vocabulary `reason`
(`crypto_deferred`, `pattern_matching`, `state_machine_deferred`,
`integrity_deferred`, etc.) — the manifest enumerates exactly which
deferred verifications the consumer must perform.

## Caveats

- **ForgetRecord interaction with the authority cascade.** The
  `forget_scope` discriminator preserves chain continuity even when
  PII or signing material is destroyed; see the verifiability truth
  table for which variants keep audit non-repudiation intact.
- **Substrate-agnostic naming.** Hounfour names primitives by their
  protocol role, not by the consumer applications that drive intake.
  Every committed surface (code, docs, schemas) follows this rule.
- **Lint allowlist process.** Legitimate exceptions (e.g., the
  validators infrastructure under `src/validators/`) are recorded in
  `scripts/check-class-policy-boundary.allowlist.yml` with a
  per-entry justification and optional expiration.
- **F7 mitigation primacy.** The validation-result-vs-manifest
  discipline above — not the lint — is the primary defense against
  the "shape valid means trusted" failure mode. The lint catches
  mechanical violations; the manifest catches semantic ones.

## Predecessor ADRs

- **ADR-007 (Commons Protocol Pattern)** established the
  `GovernedResource<T>` spread that lets schemas share invariant
  surface. ADR-010 says: that surface is shape, not policy.
- **ADR-008 (Governance Enforcement SDK)** committed to Path B —
  hounfour ships enforcement utilities alongside schemas. ADR-010
  draws the line Path B cannot cross: no signature verifiers, no
  authorization engines, no transition adjudicators. The utilities
  hounfour ships are *substrates* — `evaluateConstraint`,
  `safeCanonicalize`, `verifyAuditTrailIntegrity` — that consumers
  compose into the policy decisions that consumers own.

## Linked from

- `CLAUDE.md` (project overview)
- `SCHEMA-EVOLUTION.md` (versioning + extension policy)
