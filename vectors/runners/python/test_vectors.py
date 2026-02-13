#!/usr/bin/env python3
"""
Cross-language golden vector runner for loa-hounfour.

Validates JSON Schema files against golden test vectors using the
reference Python JSON Schema implementation. No TypeScript toolchain required.

Usage:
    pip install jsonschema
    python test_vectors.py
"""
import json
import sys
from pathlib import Path

try:
    import jsonschema
except ImportError:
    print("ERROR: jsonschema not installed. Run: pip install jsonschema")
    sys.exit(1)

# Paths relative to this script
SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent.parent.parent
SCHEMAS_DIR = REPO_ROOT / "schemas"
VECTORS_DIR = REPO_ROOT / "vectors"

passed = 0
failed = 0
errors: list[str] = []


def load_schema(name: str) -> dict:
    """Load a JSON Schema file by name."""
    path = SCHEMAS_DIR / f"{name}.schema.json"
    if not path.exists():
        raise FileNotFoundError(f"Schema not found: {path}")
    with open(path) as f:
        return json.load(f)


def validate_vector(schema: dict, data: dict, expect_valid: bool, vector_id: str) -> bool:
    """Validate a single vector against a schema."""
    global passed, failed
    try:
        jsonschema.validate(instance=data, schema=schema)
        is_valid = True
    except jsonschema.ValidationError:
        is_valid = False

    if is_valid == expect_valid:
        passed += 1
        status = "PASS"
    else:
        failed += 1
        expected = "valid" if expect_valid else "invalid"
        actual = "valid" if is_valid else "invalid"
        errors.append(f"  {vector_id}: expected {expected}, got {actual}")
        status = "FAIL"

    print(f"  [{status}] {vector_id}")
    return is_valid == expect_valid


def run_vector_file(schema_name: str, vector_path: Path, valid_key: str, invalid_key: str):
    """Run all vectors in a file against a schema."""
    schema = load_schema(schema_name)
    with open(vector_path) as f:
        data = json.load(f)

    print(f"\n{schema_name} ({vector_path.name}):")

    # Valid vectors
    for v in data.get(valid_key, []):
        validate_vector(schema, v["data"], True, v["id"])

    # Invalid vectors
    for v in data.get(invalid_key, []):
        if "data" in v:
            validate_vector(schema, v["data"], False, v["id"])


# ── Vector test suites ──────────────────────────────────────────────

# Domain events
run_vector_file(
    "domain-event",
    VECTORS_DIR / "domain-event" / "events.json",
    "valid_events", "invalid",
)

# Domain event batches
run_vector_file(
    "domain-event-batch",
    VECTORS_DIR / "domain-event" / "batches.json",
    "valid_batches", "invalid_batches",
)

# Conversations
run_vector_file(
    "conversation",
    VECTORS_DIR / "conversation" / "conversations.json",
    "valid_conversations", "invalid",
)

# Billing allocation
run_vector_file(
    "billing-entry",
    VECTORS_DIR / "billing" / "allocation.json",
    "valid_entries", "invalid_entries",
)

# Transfer specs
run_vector_file(
    "transfer-spec",
    VECTORS_DIR / "transfer" / "transfers.json",
    "valid_transfers", "invalid_transfers",
)

# Agent lifecycle payloads
run_vector_file(
    "lifecycle-transition-payload",
    VECTORS_DIR / "agent" / "lifecycle-payloads.json",
    "valid_payloads", "invalid_payloads",
)

# ── Summary ─────────────────────────────────────────────────────────

print(f"\n{'=' * 50}")
print(f"Results: {passed} passed, {failed} failed")

if errors:
    print("\nFailures:")
    for e in errors:
        print(e)

sys.exit(1 if failed > 0 else 0)
