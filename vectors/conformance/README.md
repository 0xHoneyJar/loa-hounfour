# Conformance Vectors

**Version:** 5.1.0

Golden test vectors for validating model provider implementations against the
loa-hounfour protocol contract. Each vector encodes a specific input/output
pair with matching rules that define how expected and actual outputs should
be compared.

## Directory Structure

```
conformance/
  provider-normalization/   # CompletionResult field mapping per provider
  pricing-calculation/      # BigInt pricing arithmetic vectors
  thinking-trace/           # ThinkingTrace normalization vectors
  tool-call-roundtrip/      # ToolCall encoding/decoding vectors
  ensemble-position/        # EnsembleResult position and routing vectors
```

## Vector Schema

All vectors conform to `ConformanceVectorSchema` (see `src/schemas/model/conformance-vector.ts`).

Key fields:
- `vector_id`: Unique identifier matching `^conformance-[a-z]+-\d{3}$`
- `category`: One of the `ConformanceCategory` values
- `input`: Provider-specific raw input payload
- `expected_output`: Expected normalized output
- `matching_rules`: How to compare actual vs expected (field selection, tolerance, etc.)
- `expected_valid`: Whether the vector represents a valid or invalid scenario

## Adding Vectors

1. Choose the appropriate category directory
2. Create a `.json` file following the `ConformanceVectorSchema`
3. Ensure `vector_id` is unique across all vectors
4. Run `npx vitest run tests/vectors/conformance-validation.test.ts` to validate

## Matching Semantics

The matching engine (`src/utilities/conformance-matcher.ts`) supports:
- **Field selection**: Compare only specified fields via `select_fields`
- **Volatile fields**: Ignore fields that change between runs (timestamps, IDs)
- **Numeric tolerance**: Floating-point comparison with configurable epsilon
- **String canonicalization**: Case-insensitive and whitespace-normalized comparison
- **Null handling**: Configurable treatment of null vs undefined vs missing
