# ADR-009: DynamicContract → Model Routing Integration

**Status**: Accepted
**Date**: 2026-02-25
**Deciders**: soju + Claude
**Source**: Bridgebuilder Review — PR #37, Strategic Questions Q3 + Q4

## Context

The Bridgebuilder review raised two connected questions:

> **Q3 (Conway question)**: How does the payment protocol (x402/Conway) integrate with commons governance? An agent's payment capacity affects what protocol surface it can access.
>
> **Q4 (Routing governance)**: Multi-model routing currently uses static configuration. DynamicContract maps reputation → protocol surface. How do these connect?

`DynamicContract` (v8.0.0) maps `ReputationState → ProtocolSurface`, defining what schemas, capabilities, and rate limits each model accesses. The model routing system in loa-finn selects models based on task requirements, cost estimates, and ensemble strategies. These systems must coordinate without coupling.

## Decision

DynamicContract surfaces **inform but do not replace** loa-finn's routing logic. The integration is data-driven, not control-driven.

### Integration Model

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ DynamicContract  │────>│ ContractNegotiation │───>│ Routing Decision │
│ (hounfour)       │     │ (hounfour schema) │     │ (loa-finn logic) │
│                  │     │                    │     │                  │
│ Reputation →     │     │ Granted surface    │     │ Task requirements│
│ ProtocolSurface  │     │ = available models │     │ + surface filter │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

1. **hounfour** defines the `DynamicContract` mapping and `ContractNegotiation` schema
2. **loa-finn** performs negotiation at runtime, receiving a `granted_surface`
3. **loa-finn** filters its model pool by the granted surface (only models with sufficient capabilities)
4. **loa-finn** applies its own routing logic (cost, quality, ensemble strategy) within the filtered pool

### What hounfour provides (this repo)

- `DynamicContractSchema` — the mapping definition
- `ContractNegotiationSchema` — the handshake schema
- `verifyMonotonicExpansion()` — validates contract correctness (v8.1.0)
- `isNegotiationValid()` — validates TTL (v8.1.0)
- Conformance vectors for all of the above

### What hounfour does NOT provide

- Runtime negotiation service (loa-finn's responsibility)
- Model selection logic (loa-finn's responsibility)
- Payment integration (x402/Conway — future, separate ADR)
- Rate limit enforcement (arrakis gateway's responsibility)

## Consequences

### Positive

- Clean separation: hounfour defines the contract, consumers implement enforcement
- No coupling between routing logic and protocol schema
- Conway/x402 integration can layer on top without modifying DynamicContract
- `verifyMonotonicExpansion()` provides protocol-level correctness checking

### Negative

- Consumers must implement their own negotiation flow
- No reference implementation of the full negotiation lifecycle in hounfour
- Conway integration deferred (requires separate design work)

### Future Considerations

- **Conway Integration RFC**: Payment capacity as a dimension of ProtocolSurface (e.g., a `payment_tier` field alongside `rate_limit_tier`). This is additive and doesn't require changes to the current DynamicContract schema.
- **Reference Negotiation Flow**: Consider providing a `negotiateContract()` utility in a future version that takes a DynamicContract + reputation state and returns a ContractNegotiation.

## References

- Bridgebuilder Review, PR #37 — "The Conway question" and "Multi-model routing connection"
- `src/commons/dynamic-contract.ts` — DynamicContract + ProtocolSurface schemas
- `src/commons/contract-negotiation.ts` — ContractNegotiation schema
- `src/commons/dynamic-contract-monotonic.ts` — monotonic expansion verification (v8.1.0)
- `src/commons/contract-negotiation-validity.ts` — TTL validation (v8.1.0)
