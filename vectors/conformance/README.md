# Conformance Vectors

**Version:** 7.0.0

Golden test vectors for validating protocol implementations against the
loa-hounfour contract. Each vector encodes a specific input/output
pair with matching rules that define how expected and actual outputs should
be compared.

## Directory Structure

```
conformance/
  agent-identity/            # AgentIdentity schema validation
  bridge-transfer-saga/      # Saga state machine and conservation vectors
  capability-scoped-trust/   # 6-dimension trust scope validation
  conservation-properties/   # Conservation invariant vectors
  delegation-chain/          # DelegationChain link validation
  delegation-outcome/        # Consensus outcome + dissent recording
  delegation-tree/           # Tree structure + budget/authority vectors
  ensemble-position/         # EnsembleResult position and routing
  governance-proposal/       # Weighted voting + quorum validation
  inter-agent-transaction/   # Cross-agent transaction audit vectors
  jwt-boundary/              # JWT boundary verification pipeline
  liveness-properties/       # Temporal logic property validation
  monetary-policy/           # Minting-conservation coupling
  permission-boundary/       # MAY permission semantics
  pricing-calculation/       # BigInt pricing arithmetic
  provider-normalization/    # CompletionResult field mapping per provider
  registry-bridge/           # Cross-registry bridge invariants
  reservation-enforcement/   # Capacity reservation vectors
  thinking-trace/            # ThinkingTrace normalization
  tool-call-roundtrip/       # ToolCall encoding/decoding
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

## Running Vectors

### TypeScript (canonical runner)

```bash
# Run all vectors
npm run test:vectors

# Run a specific category
npx vitest run tests/vectors/conformance-validation.test.ts -t "bridge-transfer-saga"
```

### Cross-Language Usage

Vectors are plain JSON files. Any language can validate against them:

1. **Load** the vector JSON file
2. **Parse** the `input` field as the schema input
3. **Validate** against the corresponding TypeBox/JSON Schema
4. **Compare** your output against `expected_output` using `matching_rules`

```python
# Python example (pseudocode)
import json
from jsonschema import validate

vector = json.load(open("vectors/conformance/pricing-calculation/conformance-pricing-001.json"))
# Your implementation processes vector["input"]
result = your_implementation(vector["input"])
# Compare result against vector["expected_output"]
assert matches(result, vector["expected_output"], vector["matching_rules"])
```

JSON Schemas for validation are available via:
```
@0xhoneyjar/loa-hounfour/schemas/{schema-name}.json
```

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
