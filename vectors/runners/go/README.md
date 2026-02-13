# Go Vector Runner

Cross-language golden vector validation for loa-hounfour protocol schemas.

## Setup

```bash
go mod download
```

## Run

```bash
go test ./... -v
```

## Requirements

- Go 1.22+
- `github.com/santhosh-tekuri/jsonschema/v6` (fast Go JSON Schema library)
- No TypeScript toolchain required

## What It Does

Loads generated JSON Schema files from `schemas/` and validates golden test vectors from `vectors/` against them. Valid vectors must pass validation; invalid vectors must fail.

Schemas tested:
- `domain-event` — Domain event envelope
- `domain-event-batch` — Atomic multi-event delivery
- `conversation` — NFT-bound conversation
- `lifecycle-transition-payload` — Typed lifecycle events
