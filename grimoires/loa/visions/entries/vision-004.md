# Vision 004: Temporal Trust — Revocable Graduation vs Decayed Confidence

## Source
- Bridge: finn PR #108 (bridge-20260226), Deep Meditation Part 3
- Finding Severity: ARCHITECTURAL (design tension)

## Insight

Finn's graduation protocol (PR #108) treats the `shadow → enabled` transition as permanent — once an agent graduates, it stays graduated. But hounfour already exports `computeDecayedConfidence()`, which implies trust should be temporal — confidence decays over time without reinforcing evidence.

These two models are in tension:
- **Finn**: graduation is a one-way gate with 8 thresholds (T1-T8)
- **Hounfour**: confidence is temporal, decaying via `computeDecayedConfidence()`

The Bridgebuilder meditation recommended: "Degradation should flow through the same thresholds as graduation." A graduated agent that stops meeting T3 (latency) should degrade, not permanently retain its status.

## Pattern

```
PERMANENT GRADUATION:
  shadow → enabled (one-way, based on 72h window of 8 thresholds)

TEMPORAL TRUST (reconciled):
  shadow → enabled (graduation)
  enabled → shadow (degradation, if thresholds violated for sustained period)
  shadow → enabled (re-graduation, faster with prior history)

Key: degradation cooldown ≠ graduation warmup
     Re-graduation should be faster (Bayesian prior from previous tenure)
```

## Applicability

- Hounfour governance module: should `computeDecayedConfidence()` inform graduation status?
- Finn's routing state machine: add `enabled → shadow` transition?
- Protocol-level question: is trust permanent or temporal?

## Connection

- Hounfour `computeDecayedConfidence()` in governance module
- Finn graduation thresholds (T1-T8, PR #108)
- Dixie EMA dampening (FR-3) — same adaptive alpha concept applied to trust decay
- Ostrom Principle 4: monitoring by accountable parties (ongoing, not one-time)

## Status

Deferred — design question for post-launch. Neither model is wrong; they need reconciliation at the protocol level.
