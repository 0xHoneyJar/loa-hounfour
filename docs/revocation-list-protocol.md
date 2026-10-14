# Revocation-list protocol

> **Status:** consumer-implementer guide for `RevocationListSchema`
> (v8.7.0 shape, FR-G4). Non-normative supplement to the schema; the
> signing input and lookup rules match the v8.8.0 reference verifier.
> **Schema:** `src/canonical/revocation-list.ts`,
> `schemas/revocation-list.schema.json`,
> `constraints/RevocationList.constraints.json` (RL-1..RL-12).
> **Reference code:** `verifyEnvelopeSignatureEd25519` and
> `lookupRevocation` in `src/integrity/verify.ts`, with the Go port in
> `vectors/runners/go/verify/`. See
> [reference-verifier.md](architecture/reference-verifier.md).

A `RevocationList` names Ed25519 signing keys that must no longer be
trusted. Verifiers consult it before accepting any envelope signed under
a listed key. hounfour ships the shape and the byte rules. Which lists to
trust, how many signatures to require and how stale a list may be are
consumer policy (ADR-010).

## 1. Signed payload

The primary `signature` and every `quorum_signatures[i].signature` sign
the same bytes:

```
signing_input = UTF-8( safeCanonicalize( list minus { signature, quorum_signatures } ) )
```

`safeCanonicalize` NFC-normalises every string and key, applies RFC 8785
JCS and enforces the 100 KB canonical-size cap
([hashing-spec-freeze-v8.5.md](architecture/hashing-spec-freeze-v8.5.md)).
Every other field is inside the signed bytes, including `null` values.
Absent and `null` are different, so a producer must not drop a `null`
field after signing.

Encodings: `signature` is `ed25519:` + 86 unpadded base64url chars
(64 bytes). Key ids are `ed25519-pub:` + 43 unpadded base64url chars
(32 bytes, the raw public key).

## 2. Producing a list

1. Fill every field except `signature` and `quorum_signatures`. Keep
   `contract_version: "8.7.0"` (pinned by the schema).
2. Respect the local invariants: distinct `revoked_keys[*].key_id` (RL-1),
   the signer does not revoke itself (RL-5), `revoked_at <= issued_at`
   (RL-7), `valid_from <= valid_until` (RL-9), `valid_from <= issued_at`
   (RL-10).
3. Compute `signing_input` and sign it with the key named by
   `signer_key_id`. Store the result in `signature`.
4. Single-signer mode: set `quorum_signatures: null`.
   Quorum mode: have each quorum signer sign the same `signing_input`.
   Store `{ signer_key_id, signature }` entries with distinct signers,
   one of which is the primary signer (RL-12, at least one entry).
5. Run `validate(RevocationListSchema, list, { acceptDeferred: true })`
   to confirm shape and local invariants before publishing.

## 3. Verifying a list

1. **Shape.** `validate(RevocationListSchema, list, ...)`. The list is
   crypto-bearing, so without `acceptDeferred: true` validation fails
   closed with `CRYPTO_DEFERRED`, which is a reminder that steps 2 and 3
   are yours to do.
2. **Primary signature.** Resolve the public key for `signer_key_id` from
   your keyring, then:

   ```ts
   const r = await verifyEnvelopeSignatureEd25519(list, publicKey);
   // default omitFields = ['signature', 'quorum_signatures']
   ```

   Require `r.verified === true`. `'unverifiable'` is not a pass.
3. **Quorum (when `quorum_signatures` is non-null).** For each entry,
   resolve its key and verify the entry's signature over the same
   `signing_input`. One way to reuse the reference function is a view that
   carries the entry signature in a separate field:

   ```ts
   const view = { ...list, quorum_entry_signature: entry.signature };
   await verifyEnvelopeSignatureEd25519(view, entryKey, {
     signatureField: 'quorum_entry_signature',
     omitFields: ['signature', 'quorum_signatures'],
   });
   ```

   Count distinct valid signers against your m-of-n policy.
4. **Chain and freshness (consumer state).** Check `nonce` monotonicity
   per `cluster_id` (RL-2), nonce uniqueness per signer window (RL-6),
   `prev_envelope_hash` against the predecessor you hold (RL-3),
   `next_page_hash` pagination (RL-11), and `max_staleness_seconds`
   against your own clock. The hash input for `prev_envelope_hash` and
   `next_page_hash` is consumer-defined. A common convention is
   SHA-256 over `safeCanonicalize` of the complete referenced list,
   signatures included. hounfour does not fix or verify it.
5. **Root of trust.** When `root_of_trust_id` is non-null, confirm with
   your registry that the signer was authorised to publish this list.

## 4. Looking up a key

After the lists you hold have passed section 3, ask whether a signer key
was revoked at the instant an envelope was signed (or at "now"):

```ts
const r = lookupRevocation(trustedLists, envelope.signer_key_id, envelope.signed_at); // Date or ISO 8601 UTC string
if (r.error === 'at_invalid') { /* reject: the instant itself is malformed */ }
if (r.revoked) { /* reject: r.reason, r.revoked_at, r.list_id */ }
if (!r.list_valid) { /* some supplied lists were malformed: r.list_validity_reason */ }
```

Rules:

- A list applies when `valid_from <= at` and (`valid_until` is null or
  `at < valid_until`). `valid_from` is inclusive and `valid_until` exclusive.
- A key is revoked when an applicable list has an entry for it with
  `revoked_at <= at`. A revocation is not retroactive past its
  `revoked_at`: signatures made before that instant are not revoked by it.
- Applicable lists rank by `issued_at`, newest first, ties in input
  order. The newest list carrying an effective entry supplies `list_id`,
  `revoked_at` and `reason`.
- Lists failing shape validation are skipped and reported
  (`list_valid: false`, `list_validity_reason: "shape_invalid: lists[i], ..."`).
- Every timestamp must be a real calendar instant in years 0001..9999,
  with no leap seconds. A list with an impossible date such as
  `2027-02-29` is skipped as shape-invalid, and an impossible `at`
  yields `error: 'at_invalid'`.
- Timestamps compare on the instant, at nanosecond resolution:
  `00:00:00.5Z` equals `00:00:00.500Z`.

`lookupRevocation` does not verify signatures, chain linkage or
freshness. Pass only lists that passed section 3.

## 5. Signer-compromise recovery

- **Layer 1, quorum.** With `quorum_signatures`, one compromised key
  cannot publish a list alone if your policy needs m > 1.
- **Layer 2, root of trust.** Operators present compromise evidence to
  the root-of-trust authority named by `root_of_trust_id`. That authority
  publishes a successor list that puts the compromised key in
  `revoked_keys[]`, signed by a different key (RL-5), with
  `prev_envelope_hash` pointing at the last known-good list. Fork
  reconciliation across divergent chains is consumer policy.

## 6. Conformance

The `revocation` and `signature/quorum-*` cases in `vectors/verifier/`
exercise this procedure. Lists there are signed with the test keys under
`vectors/verifier/keys/`. Those keys are for conformance vectors only.
