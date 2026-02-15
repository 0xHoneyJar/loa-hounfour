# Rust Golden Vector Runner

Cross-language golden vector runner for `@0xhoneyjar/loa-hounfour`. Validates JSON Schema files against golden test vectors using the `jsonschema` crate.

## Prerequisites

- Rust 1.70+
- Schemas generated: `npm run schema:generate` (from repo root)

## Usage

```bash
cd vectors/runners/rust
cargo run
```

## What It Validates

| Schema | Vector File | Valid Key | Invalid Key |
|--------|------------|-----------|-------------|
| domain-event | domain-event/events.json | valid_events | invalid |
| domain-event-batch | domain-event/batches.json | valid_batches | invalid_batches |
| conversation | conversation/conversations.json | valid_conversations | invalid |
| billing-entry | billing/allocation.json | valid_entries | invalid_entries |
| transfer-spec | transfer/transfers.json | valid_transfers | invalid_transfers |
| lifecycle-transition-payload | agent/lifecycle-payloads.json | valid_payloads | invalid_payloads |
| health-status | health/health-status.json | valid | invalid |
| thinking-trace | thinking/thinking-traces.json | valid | invalid |

## CI Integration

```yaml
- name: Rust vector runner
  run: |
    cd vectors/runners/rust
    cargo run
```
