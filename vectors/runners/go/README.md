# Go Vector Runner

Cross-language golden vector validation for loa-hounfour protocol schemas.

## Setup

```bash
go mod tidy    # Downloads dependencies and generates go.sum
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

## Reference verifier port (`verify/`, v8.8.0)

Package `verify` ports the TS reference verifier byte for byte:
`SafeCanonicalize` (NFC + RFC 8785 + 100 KB cap, via `gowebpki/jcs` and
`golang.org/x/text/unicode/norm`), `BuildDomainTag` /
`ComputeAuditEntryHash` / `VerifyAuditTrailIntegrity`,
`VerifyEnvelopeSignatureEd25519` (`crypto/ed25519`) and
`LookupRevocation`. `go test ./verify/...` runs the verifier conformance
suite (`vectors/verifier/`), the canonicalization edge corpus
(`vectors/_canonicalization-edge-cases/`) and the shared JCS files in
`vectors/runners/_shared/`.

```bash
go run ./cmd/verifier-runner                   # per-case ok/FAIL, exit 1 on mismatch
go run ./cmd/verifier-runner --emit-manifest   # JSON manifest for the parity harness
```

From the repo root, `npm run verifier:parity` diffs this runner's
manifest against the TS reference. See
`docs/architecture/reference-verifier.md`.
