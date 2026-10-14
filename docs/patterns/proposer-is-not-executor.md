# Proposer is not executor

**Since:** v8.8.0 (FR-C3). **Schemas:** `IrreversibleActionAttestation`,
`SharedSurfaceDeclaration`. **Boundary:** [ADR-010](../adr/ADR-010-class-vs-policy-boundary.md)
(hounfour ships shape, consumers ship authority).

## The pattern

An irreversible action — a merge, a destructive apply, a key revocation,
a crypto-shredding forget, a funds transfer, a publish — should never be
both proposed and carried out by the same party. This is the two-person
rule: one actor asks, a different actor executes, and each acts under
its own key. When an agent can both propose and execute, a single
mistaken or compromised agent can do irreversible damage with nobody
else in the loop.

`IrreversibleActionAttestation` records the two duties in one envelope:

| Part | Meaning |
|------|---------|
| `action_kind` | `merge`, `apply`, `destroy`, `forget`, `transfer`, `revoke`, `publish` or `other` |
| `target` | the record the action applies to: `schema_id` (PascalCase `$id`), `record_id`, optional `content_hash` |
| `proposal` | `actor_id`, `signer_key_id`, `proposed_at`, optional `signature` |
| `execution` | `actor_id`, `signer_key_id`, `executed_at`, optional `signature` |
| `separation_of_duties` | `policy: 'proposer_is_not_executor'`, optional informational `waiver_reference` |

`validate()` enforces, through the registered cross-field validator:

- **IAA-1**: the proposing actor and the executing actor differ.
- **IAA-2**: the proposing key and the executing key differ.
- **IAA-3**: execution is not before proposal (equal instants are admitted;
  comparison is exact at nanosecond precision).
- **IAA-4**: `target.schema_id` is PascalCase. The PascalCase predicate
  `^[A-Z][A-Za-z0-9]*$` is enforced only by the structural tier (the
  schema pattern). The constraint-file DSL row restates only the length
  bounds for cross-runner parity, so a DSL-only evaluation of IAA-4 is
  not equivalent to the structural check.

Signature verification (**IAA-5**) is the consumer's. The schema is
`x-crypto-bearing`, so `validate()` fails closed with `CRYPTO_DEFERRED`
unless you pass `{ acceptDeferred: true }`, acknowledging that you verify
signatures yourself.

### Signing input

Each signature is ed25519 over the RFC 8785 (JCS) bytes of the
attestation with the signer's own `signature` removed:

- `proposal.signature` covers the attestation with `execution` and
  `proposal.signature` removed. The proposer signs before execution
  exists.
- `execution.signature` covers the attestation with only
  `execution.signature` removed, so the executor also countersigns the
  proposal.

Both signatures therefore bind `target` and `action_kind`. A proposal
signature cannot be lifted onto a different target.

### What the library does not decide

- Whether `target.record_id` exists, or whether `content_hash` matches it.
- Which action kinds are irreversible in your system. Emitting the
  attestation is your declaration that they are.
- Whether two different `actor_id` strings are in fact one principal.
  IAA-1 compares strings exactly; resolve aliases before you emit.
- Whether two different `signer_key_id` values belong to different
  principals. That is your keyring.
- How long may pass between proposal and execution.
- Whether a waiver applies. `waiver_reference` never relaxes IAA-1 or
  IAA-2 inside `validate()`. A consumer that honours waivers checks the
  waiver against its own policy and then decides what to do with the
  `IAA-1:` / `IAA-2:` errors, so a waiver is always an explicit act.
  IAA-3 has no waiver path.

## Wrapping existing schemas

The attestation sits beside the record it attests; it does not modify
it. Two worked mappings follow.

### MergeArtifact

A merge is proposed by the pull-request author and executed by whoever
(or whatever) merges it.

| Attestation field | Source |
|-------------------|--------|
| `action_kind` | `'merge'` |
| `target.schema_id` | `'MergeArtifact'` |
| `target.record_id` | `<repo_slug>#<pr_number>`, or the `merged_commit_sha` |
| `target.content_hash` | optional: `sha256:` of the JCS bytes of the `MergeArtifact` |
| `proposal.actor_id` | the pull-request author (from your forge; `MergeArtifact` does not carry it) |
| `proposal.proposed_at` | when the pull request was opened or marked ready |
| `execution.actor_id` | `MergeArtifact.merger_actor_id` |
| `execution.executed_at` | `MergeArtifact.merged_at` |

A self-merge produces `proposal.actor_id === execution.actor_id` and
fails IAA-1. That is the point.

### ForgetRecord with `forget_scope: 'crypto_full_destruction'`

Crypto-shredding destroys the ability to verify history. It is the
clearest case for two people.

| Attestation field | Source |
|-------------------|--------|
| `action_kind` | `'forget'` |
| `target.schema_id` | `'ForgetRecord'` |
| `target.record_id` | `ForgetRecord.forget_id` |
| `proposal.actor_id` | the requester: the party that asked for destruction (data subject, legal counsel, operator) |
| `execution.actor_id` | `ForgetRecord.authorized_by_signer_id` |
| `execution.executed_at` | when the keys were destroyed |

The `legal_mandate_reference` that `ForgetRecord` already requires on
this scope explains *why*; the attestation records *who asked and who
did it*, and that they were not the same party.

### Why existing schemas are not retro-constrained

`MergeArtifact` and `ForgetRecord` were published without a separation
rule. Adding one to them now would make previously valid records
invalid, which is a breaking change under the additive-only policy for
minor versions. The attestation is a new, separate envelope instead:
consumers that want the two-person rule adopt it alongside the records
they already emit; consumers that do not are unaffected.

## Shared surfaces: when a cache becomes a message board

Separation of duties fails quietly in a second way. Two agents that are
not supposed to coordinate start doing so through a surface that was
never meant for it: a cache one agent fills and another reads as
instructions, a scratch directory that turns into a mailbox, a database
table everyone writes to. Nobody proposed the channel, so nobody
reviewed it.

`SharedSurfaceDeclaration` makes the channel explicit:

| Field | Meaning |
|-------|---------|
| `kind` | `cache`, `queue`, `scratch_dir`, `object_store`, `message_board`, `database` or `other` |
| `locator` | opaque URI or path; not parsed by the library |
| `owner_agent_id` | the agent accountable for the surface |
| `writer_agent_ids` | every agent allowed to write (1..256, distinct, includes the owner) |
| `reader_agent_ids` | every agent allowed to read (0..1024, distinct) |
| `single_writer` | when true, exactly one writer |
| `audit_trail_id`, `retention` | optional pointers and declared limits |

`validate()` enforces SSD-1 (the owner is a writer), SSD-2 (single-writer
consistency), SSD-3 and SSD-4 (distinct lists). Two rules need state the
library does not have and are the consumer's:

- **SSD-5**: one declaration per locator across your registry.
- **SSD-6**: every agent you observe writing to the surface is in
  `writer_agent_ids`. This is the check that catches the cache that
  became a message board. Run it against the surface's write log or the
  audit trail named by `audit_trail_id`.

The library does not require readers to be writers or writers to be
readers, does not require the owner to be a reader, and does not
require `declared_by` to be the owner.

A surface whose kind you would honestly describe as `message_board`
should be declared as one. If the declaration says `cache` with
`single_writer: true` and SSD-6 observes a second writer, the
declaration is wrong or the system is; either way someone now knows.

## Example

```typescript
import {
  IrreversibleActionAttestationSchema,
  SharedSurfaceDeclarationSchema,
  validate,
} from '@0xhoneyjar/loa-hounfour';

const att = validate(IrreversibleActionAttestationSchema, attestation, {
  acceptDeferred: true, // you verify proposal.signature / execution.signature
});
if (!att.valid) {
  // IAA-1 / IAA-2 / IAA-3 errors are prefixed with their rule id.
}

const decl = validate(SharedSurfaceDeclarationSchema, declaration);
```

Vectors live under `vectors/IrreversibleActionAttestation/v8.8.0/` and
`vectors/SharedSurfaceDeclaration/v8.8.0/`; cross-field-only rejections
are in each `invalid-cross-field/` directory.
