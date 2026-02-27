# Vision 007: EMA Statistical Correctness — Population vs Sample Variance

## Source
- Bridge: finn PR #108 (bridge-20260226), Deep Review, MEDIUM observation
- Finding Severity: MEDIUM (correctness)

## Insight

Finn's graduation evaluation (`evaluate-graduation.ts:232-237`) uses **population variance** (divides by n) when computing the coefficient of variation for EMA stability assessment. For small sample sizes (early in the EMA ramp), this underestimates true variance, making the system appear more stable than it actually is.

This directly affects FR-3's `computeDampenedScore()`: the adaptive alpha ramp (ALPHA_MIN → ALPHA_MAX over RAMP_SAMPLES=50) means the first ~50 samples use a lower alpha, which is correct for dampening but may mask instability if the CV calculation also underestimates variance.

## Pattern

```
POPULATION VARIANCE:  σ² = Σ(x-μ)² / n      — correct for complete populations
SAMPLE VARIANCE:      s² = Σ(x-μ)² / (n-1)  — correct for samples from larger population

For EMA stability assessment:
  - Early samples (n < 30): use sample variance (n-1) — Bessel's correction
  - Large samples (n > 30): difference is negligible
  - Recommendation: use n-1 consistently for safety
```

## Applicability

- FR-3 `computeDampenedScore()` reference implementation should document which variance formula is used
- Graduation evaluation should use sample variance for small windows
- Conformance vectors should include small-sample edge cases

## Connection

- FR-3 (Feedback Dampening Protocol Pattern)
- Finn graduation thresholds (T6: EMA stability)
- Dixie EMA constants (RAMP_SAMPLES=50 — first 50 samples are in the "small sample" regime)
