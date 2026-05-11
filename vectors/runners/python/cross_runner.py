#!/usr/bin/env python3
"""
Cross-language conformance runner for loa-hounfour (Python).

Mirrors `scripts/cross-runner.ts` (TS reference). Walks the per-file
vector layout and emits a JSON manifest of `{schema, vector, expected,
result}` entries. Cross-language harness (`scripts/run-cross-runners.sh`)
diffs the Python output against the TS golden corpus per AT-1.

Schema validation uses the `jsonschema` package against the JSON
Schema 2020-12 artifacts under `schemas/`. Cross-field invariants
(CR-1, FR-C builtins, byte-cap, etc.) are NOT evaluated here — those
are consumer-side per ADR-010 and surface as `'pass-cross-field-
deferred'` in the manifest, matching the TS reference behaviour.

Usage:
    python cross_runner.py                  # run, exit 1 on parity divergence
    python cross_runner.py --emit-manifest  # write JSON manifest to stdout

Dependencies:
    pip install jsonschema

@since v8.6.0 — PR-A3.9 (FR-A2)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Iterable, Literal

try:
    import jsonschema
except ImportError:
    print("ERROR: jsonschema not installed. Run: pip install jsonschema", file=sys.stderr)
    sys.exit(1)

# ── Paths ────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent.parent
SCHEMAS_DIR = REPO_ROOT / "schemas"
VECTORS_DIR = REPO_ROOT / "vectors"

# ── Cross-runner harness contract ────────────────────────────────────
# Source-of-truth lives at vectors/runners/_shared/. iter-2 F008+F011
# mitigation: every runner reads from the same file rather than holding
# a hardcoded copy that would silently drift.
SHARED_DIR = REPO_ROOT / "vectors" / "runners" / "_shared"
PARITY_PROTOCOL_VERSION = (SHARED_DIR / "parity-protocol-version.txt").read_text().strip()
RFC3339_UTC_PATTERN_SOURCE = (SHARED_DIR / "rfc3339-utc-pattern.txt").read_text().strip()


# ── Schema registry ──────────────────────────────────────────────────
# Mirrors the SCHEMAS dict in scripts/cross-runner.ts.
#
# Each entry: (schema_name, version_path | None, buckets).
# - version_path: None for flat layout, '<version>' for nested.
# - buckets: ('valid', 'invalid') by default; CanonicalRun adds
#   'invalid-cross-field' per the FR-A2 cross-field-deferred contract.
SCHEMAS: list[tuple[str, str | None, tuple[str, ...]]] = [
    # v8.4.0 substrate — flat layout.
    ("PanelDecisionArtifact", None, ("valid", "invalid")),
    ("PanelVerdict", None, ("valid", "invalid")),
    ("DeliberationDissent", None, ("valid", "invalid")),
    ("CrossScoreReport", None, ("valid", "invalid")),
    ("OrgIdentity", None, ("valid", "invalid")),
    ("OrgRepresentativeDelegation", None, ("valid", "invalid")),
    ("SuccessionPolicy", None, ("valid", "invalid")),
    # v8.6.0 cycle-005 cluster — versioned layout.
    # PhaseCompletionEnvelope deferred — see Tier-1/Tier-2 fixture-routing
    # rationale in scripts/cross-runner.ts (TS reference). Mirrored here.
    # ("PhaseCompletionEnvelope", "v8.6.0", ("valid", "invalid")),
    ("OracleDigest", "v8.6.0", ("valid", "invalid")),
    ("EpicCheckpoint", "v8.6.0", ("valid", "invalid")),
    ("PlanSignoffEnvelope", "v8.6.0", ("valid", "invalid")),
    ("PlanAmendmentRequest", "v8.6.0", ("valid", "invalid")),
    ("Challenge", "v8.6.0", ("valid", "invalid")),
    ("CanonicalRun", "v8.6.0", ("valid", "invalid", "invalid-cross-field")),
    # v8.7.0 cycle-007 cluster — versioned layout. PR-A4.1 (FR-G1).
    ("ClusterRunSeries", "v8.7.0", ("valid", "invalid", "invalid-cross-field")),
    # v8.7.0 cycle-007 cluster — versioned layout. PR-A4.2 (FR-G2).
    ("InterSeriesScopingArtifact", "v8.7.0", ("valid", "invalid", "invalid-cross-field")),
    # v8.7.0 cycle-007 cluster — versioned layout. PR-A4.3 (FR-G3).
    ("SubscriptionPoolState", "v8.7.0", ("valid", "invalid", "invalid-cross-field")),
    # v8.7.0 cycle-007 cluster — versioned layout. PR-A4.4 (FR-G4).
    ("RevocationList", "v8.7.0", ("valid", "invalid", "invalid-cross-field")),
    # v8.7.0 cycle-007 cluster — versioned layout. PR-A4.5 (FR-G5).
    # No cross-field validator: MA-1/MA-3 are structural; MA-2/MA-4 consumer-state.
    ("MergeArtifact", "v8.7.0", ("valid", "invalid")),
]

# Schema-name → schema-file-name (kebab-case). Most files map by
# lowercasing CamelCase to kebab-case automatically; a few schemas use
# bespoke filenames.
SCHEMA_FILE_OVERRIDES: dict[str, str] = {
    # Defaults handle the 14 entries above; overrides land here when
    # the on-disk filename diverges from the camelCase→kebab transform.
}


def camel_to_kebab(name: str) -> str:
    """Convert PascalCase / camelCase to kebab-case.

    iter-2 F003 mitigation: handles the consecutive-uppercase boundary
    (HTTPServer → http-server, not httpserver) via lookahead.
    Two boundary rules:
        1. lowercase → uppercase    (camelCase → camel-Case)
        2. UPPER → upper + lower    (HTTPServer → HTTP-Server)
    """
    out: list[str] = []
    n = len(name)
    for i, ch in enumerate(name):
        if ch.isupper() and i > 0:
            prev_upper = name[i - 1].isupper()
            next_lower = i + 1 < n and name[i + 1].islower()
            if not prev_upper or (prev_upper and next_lower):
                out.append("-")
        out.append(ch.lower())
    return "".join(out)


# ── Constraint-level invalid registry ────────────────────────────────
CONSTRAINT_LEVEL_INVALIDS_PATH = VECTORS_DIR / "_meta" / "constraint-level-invalids.json"


def load_constraint_level_invalids() -> set[str]:
    """Load the constraint-level-invalids registry.

    iter-3 F-002 mitigation: surface I/O / parse failures with a
    diagnostic message rather than letting an unhandled JSONDecodeError
    abort module import opaquely. ENOENT tolerated (returns empty set
    so a fresh checkout without the file still runs); all other
    failures hard-fail at startup with a path-tagged error so the
    operator sees what's wrong.
    """
    if not CONSTRAINT_LEVEL_INVALIDS_PATH.exists():
        return set()
    try:
        with open(CONSTRAINT_LEVEL_INVALIDS_PATH) as f:
            doc = json.load(f)
    except json.JSONDecodeError as e:
        raise RuntimeError(
            f"FATAL: parse {CONSTRAINT_LEVEL_INVALIDS_PATH}: {e}"
        ) from e
    except OSError as e:
        raise RuntimeError(
            f"FATAL: read {CONSTRAINT_LEVEL_INVALIDS_PATH}: {e}"
        ) from e
    fixtures = doc.get("fixtures")
    if not isinstance(fixtures, list):
        raise RuntimeError(
            f"FATAL: {CONSTRAINT_LEVEL_INVALIDS_PATH}: 'fixtures' must be a list"
        )
    return set(fixtures)


CONSTRAINT_LEVEL_INVALIDS = load_constraint_level_invalids()


# ── Manifest entry shape ─────────────────────────────────────────────
ResultLabel = Literal[
    "pass", "fail", "pass-constraint-level", "pass-cross-field-deferred"
]


def list_json_files(directory: Path) -> list[str]:
    if not directory.is_dir():
        return []
    return sorted(
        f.name
        for f in directory.iterdir()
        if f.suffix == ".json" and not f.name.endswith(".trace.json")
    )


def load_schema(schema_name: str) -> dict[str, Any]:
    file_stem = SCHEMA_FILE_OVERRIDES.get(schema_name, camel_to_kebab(schema_name))
    schema_path = SCHEMAS_DIR / f"{file_stem}.schema.json"
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema artifact missing: {schema_path}")
    with open(schema_path) as f:
        return json.load(f)


# Format-checker enforces JSON Schema 2020-12 `format` keywords
# (e.g., 'date-time') so Python rejects the same fixtures TypeBox's
# FormatRegistry rejects. Without this, Python `jsonschema` ignores
# `format` annotations by default and lets `"created_at": "yesterday"`
# fixtures through structural validation — diverging from TS.
#
# Python `jsonschema`'s built-in checkers cover only date / email /
# uuid / etc. but NOT date-time (which requires the optional
# `rfc3339-validator` package). We register a minimal date-time
# checker inline so the runner has zero non-stdlib dependencies
# beyond `jsonschema` itself.
import re as _re

FORMAT_CHECKER = jsonschema.FormatChecker()

# RFC 3339 / ISO 8601 UTC date-time. The pattern source is loaded
# from vectors/runners/_shared/rfc3339-utc-pattern.txt at startup
# (iter-2 F008 mitigation: SSOT regex shared across Python/Go/Rust).
_DATE_TIME_RE = _re.compile(RFC3339_UTC_PATTERN_SOURCE)


@FORMAT_CHECKER.checks("date-time", raises=ValueError)
def _check_date_time(instance: Any) -> bool:
    if not isinstance(instance, str):
        return True  # type-mismatch is reported separately
    if not _DATE_TIME_RE.match(instance):
        raise ValueError(f"not RFC 3339 date-time: {instance!r}")
    return True


def validate_structural(schema: dict[str, Any], data: Any) -> bool:
    """Return True iff `data` passes structural validation against `schema`."""
    try:
        jsonschema.validate(instance=data, schema=schema, format_checker=FORMAT_CHECKER)
        return True
    except jsonschema.ValidationError:
        return False
    except jsonschema.SchemaError as e:
        # Schema artifact malformed — surface as validation failure
        # rather than crashing the sweep.
        print(f"WARN: schema malformed: {e}", file=sys.stderr)
        return False


def emit_manifest() -> list[dict[str, Any]]:
    manifest: list[dict[str, Any]] = []
    for schema_name, version_path, buckets in SCHEMAS:
        schema = load_schema(schema_name)
        for bucket in buckets:
            bucket_parts: list[str] = [schema_name]
            if version_path is not None:
                bucket_parts.append(version_path)
            bucket_parts.append(bucket)
            bucket_dir = VECTORS_DIR / Path(*bucket_parts)
            vector_prefix = (
                f"{version_path}/{bucket}" if version_path else bucket
            )
            for fname in list_json_files(bucket_dir):
                fpath = bucket_dir / fname
                try:
                    with open(fpath) as f:
                        raw = json.load(f)
                except json.JSONDecodeError:
                    manifest.append({
                        "schema": schema_name,
                        "vector": f"{vector_prefix}/{fname}",
                        "expected": bucket,
                        "result": "fail",
                        "diagnostic": {"code": "FIXTURE_PARSE_ERROR", "path": "$"},
                    })
                    continue
                # Strip optional `_comment` field per cycle-005 vector
                # convention (cf. tests/vectors/challenge-vectors.test.ts).
                if isinstance(raw, dict) and "_comment" in raw:
                    raw = {k: v for k, v in raw.items() if k != "_comment"}
                ok = validate_structural(schema, raw)
                key = f"{schema_name}/{vector_prefix}/{fname}"
                if bucket == "invalid-cross-field":
                    result: ResultLabel = (
                        "pass-cross-field-deferred" if ok else "fail"
                    )
                elif bucket == "boundary":
                    result = "pass" if ok else "fail"
                elif key in CONSTRAINT_LEVEL_INVALIDS:
                    result = "pass-constraint-level" if ok else "fail"
                else:
                    expected_valid = bucket == "valid"
                    result = "pass" if ok == expected_valid else "fail"
                manifest.append({
                    "schema": schema_name,
                    "vector": f"{vector_prefix}/{fname}",
                    "expected": bucket,
                    "result": result,
                })
    return manifest


def main(argv: list[str]) -> int:
    manifest = emit_manifest()
    if "--emit-manifest" in argv:
        print(json.dumps(manifest, separators=(",", ":")))
        return 0
    fails = [e for e in manifest if e["result"] == "fail"]
    if fails:
        print(f"FAIL: {len(fails)} fixture(s) diverged from expectation:", file=sys.stderr)
        for e in fails[:20]:
            print(f"  {e['schema']}/{e['vector']}: result={e['result']}", file=sys.stderr)
        if len(fails) > 20:
            print(f"  ... +{len(fails) - 20} more", file=sys.stderr)
        return 1
    print(f"OK: {len(manifest)} fixtures validated (parity_protocol_version={PARITY_PROTOCOL_VERSION})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
