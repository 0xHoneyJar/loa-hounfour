# Agent identity profile: A2A Agent Card

> Profile `a2a-agent-card` of `AgentIdentityBinding` (v8.8.0, SDD §4, FR-C5).

An A2A Agent Card is the JSON document an agent publishes so other agents
can discover what it is, what it can do, and how to authenticate to it.
This profile binds a hounfour `AgentIdentity` to one published card. The
binding records where the card lives, what it hashed to, and the card's
signature when it has one. The binding does not copy the card.

## Binding record

```json
{
  "binding_id": "7d1e4c2a-0b3f-4c5d-9e6f-000000000002",
  "agent_id": "research-agent",
  "profile": "a2a-agent-card",
  "a2a": {
    "card_url": "https://agents.example.com/.well-known/agent-card.json",
    "card_hash": "sha256:<64 hex>",
    "card_signature_jws": "<header>.<payload>.<signature>",
    "protocol_version": "1.0"
  },
  "bound_at": "2026-10-14T09:30:00Z",
  "bound_by_signer_id": "signer-ops-1",
  "contract_version": "8.8.0"
}
```

| Field | Meaning |
|-------|---------|
| `a2a.card_url` | Where the card is published. Required. Must be an `http` or `https` URL whose host has at least one character other than `.` and `-`, because Agent Cards are published over HTTP(S). Other URI schemes such as `did:`, and URLs with whitespace or trailing garbage, are rejected. At most 2048 characters. |
| `a2a.card_hash` | sha256 of the JCS (RFC 8785) canonical form of the fetched card, written `sha256:` followed by 64 hex characters. The prefix is required. Optional. |
| `a2a.card_signature_jws` | Compact JWS over the canonical card. Three non-empty segments. Optional. |
| `a2a.protocol_version` | A2A protocol version the card declares, `MAJOR.MINOR` or `MAJOR.MINOR.PATCH`. Optional. |

When `profile` is `a2a-agent-card`, the `a2a` block must be present and the
`directory` and `vc` blocks must be absent (AIB-1).

> **The JSON Schema alone does not enforce this rule.** `validate()`
> enforces it through the registered cross-field validator. TypeBox
> `Value.Check` and JSON Schema validators running the published
> `schemas/agent-identity-binding.schema.json` accept a record whose
> blocks do not match its `profile`. TypeScript consumers call
> `validate()`. Consumers in other languages must implement AIB-1..3
> themselves, using `constraints/AgentIdentityBinding.constraints.json`
> as the specification.

## Field mapping: AgentIdentity to Agent Card

| AgentIdentity field | Agent Card field | Notes |
|---------------------|------------------|-------|
| `agent_id` | `name` and `url` together | The card has no single stable id. The pair of display name and service URL identifies it; the binding's `card_url` pins which card. |
| `display_name` | `name` | Human-readable name. |
| `capabilities` | `skills[]` | Each capability string corresponds to one skill entry. The card's `capabilities` object describes transport features such as streaming, not agent skills. |
| `delegation_authority` | no card field | Carried in card `extensions` when a consumer needs to publish it. |
| `max_delegation_depth` | no card field | Carried in card `extensions` if published at all. |
| `trust_scopes` | `securitySchemes` and `security` | The card states how callers authenticate. Hounfour trust levels are the consumer's view of the agent and are not published by the agent itself. |
| `agent_type` | no card field | Carried in card `extensions` if needed. |
| `governance_weight` | no card field | Internal to the consumer's governance. |
| `metadata` | `extensions` | Free-form additions. |
| binding `signature` | card `signatures` (JWS) | The binding signature covers the binding record. The card signature covers the card. They are separate objects with separate signers. |

## Canonicalization and signatures

The A2A specification signs a card by canonicalizing it with JCS
(RFC 8785) and producing a JWS over the canonical bytes. `card_hash` uses
the same canonical form, so a consumer computes it once and can both
compare the hash and verify the signature over the same bytes.

The card's own signature entries use the JWS JSON form with `protected`
and `signature` members. A consumer that records `card_signature_jws`
converts one entry to compact form with the canonical card as the payload.
The detached-payload form, with an empty middle segment, is not admitted
by the schema.

## What the library does not do

- It does not fetch `card_url` (AIB-N1). Fetching is I/O.
- It does not recompute `card_hash` or compare it to anything.
- It does not verify `card_signature_jws` or the binding `signature`
  (AIB-4, consumer-side, reason `crypto_deferred`). The schema is not
  marked crypto-bearing because both signatures are optional.
- It does not check that `agent_id` resolves to an `AgentIdentity` or that
  `bound_by_signer_id` may bind it (AIB-5).
- It does not check that the card's `name`, `url`, or `skills` agree with
  the `AgentIdentity`. That comparison needs the fetched card.

## Consumer verification sequence

1. Validate the binding with `validate(AgentIdentityBindingSchema, record)`.
2. Fetch `card_url`, canonicalize the card with JCS, and compute sha256.
3. Compare the result to `card_hash` when present.
4. Verify `card_signature_jws` over the canonical bytes when present.
5. Verify the binding `signature` against the key for `bound_by_signer_id`.
6. Resolve `agent_id` and confirm the binder's authority under local policy.
