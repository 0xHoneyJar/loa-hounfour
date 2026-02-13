# Python Vector Runner

Cross-language golden vector validation for loa-hounfour protocol schemas.

## Setup

```bash
pip install jsonschema
```

## Run

```bash
python test_vectors.py
```

## Requirements

- Python 3.10+
- `jsonschema` library (reference JSON Schema implementation)
- No TypeScript toolchain required

## What It Does

Loads generated JSON Schema files from `schemas/` and validates golden test vectors from `vectors/` against them. Valid vectors must pass validation; invalid vectors must fail.

Schemas tested:
- `domain-event` — Domain event envelope
- `domain-event-batch` — Atomic multi-event delivery
- `conversation` — NFT-bound conversation
- `billing-entry` — Multi-party billing
- `transfer-spec` — NFT transfer specification
- `lifecycle-transition-payload` — Typed lifecycle events
