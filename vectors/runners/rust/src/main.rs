// Cross-language conformance runner for loa-hounfour (Rust).
//
// Mirrors `scripts/cross-runner.ts` (TS reference). Walks the per-file
// vector layout and emits a JSON manifest of `{schema, vector,
// expected, result}` entries. Cross-language harness diffs the Rust
// output against the TS golden corpus per AT-1.
//
// Schema validation uses the `jsonschema` crate against the JSON
// Schema 2020-12 artifacts under `schemas/`. Cross-field invariants
// (CR-1, FR-C builtins, byte-cap, etc.) are NOT evaluated here —
// those are consumer-side per ADR-010 and surface as
// `'pass-cross-field-deferred'` in the manifest.
//
// Usage:
//
//   cd vectors/runners/rust
//   cargo run --release --bin cross-runner -- --emit-manifest
//   cargo run --release --bin cross-runner   # exit 1 on parity divergence
//
// @since v8.6.0 — PR-A3.9 (FR-A2)

use serde::Serialize;
use serde_json::Value;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

/// MUST match `PARITY_PROTOCOL_VERSION` in scripts/cross-runner.ts.
const PARITY_PROTOCOL_VERSION: &str = "1.1.0";

#[derive(Debug, Clone)]
struct SchemaReg {
    name: &'static str,
    version_path: Option<&'static str>,
    buckets: &'static [&'static str],
}

/// Mirrors the SCHEMAS dict in scripts/cross-runner.ts. Keep in
/// lockstep with the Python and Go registries.
const SCHEMAS: &[SchemaReg] = &[
    // v8.4.0 substrate — flat layout.
    SchemaReg { name: "PanelDecisionArtifact", version_path: None, buckets: &["valid", "invalid"] },
    SchemaReg { name: "PanelVerdict", version_path: None, buckets: &["valid", "invalid"] },
    SchemaReg { name: "DeliberationDissent", version_path: None, buckets: &["valid", "invalid"] },
    SchemaReg { name: "CrossScoreReport", version_path: None, buckets: &["valid", "invalid"] },
    SchemaReg { name: "OrgIdentity", version_path: None, buckets: &["valid", "invalid"] },
    SchemaReg { name: "OrgRepresentativeDelegation", version_path: None, buckets: &["valid", "invalid"] },
    SchemaReg { name: "SuccessionPolicy", version_path: None, buckets: &["valid", "invalid"] },
    // v8.6.0 cycle-005 cluster — versioned layout.
    // PhaseCompletionEnvelope deferred — see Tier-1/Tier-2 fixture-
    // routing rationale in scripts/cross-runner.ts (TS reference).
    // SchemaReg { name: "PhaseCompletionEnvelope", version_path: Some("v8.6.0"), buckets: &["valid", "invalid"] },
    SchemaReg { name: "OracleDigest", version_path: Some("v8.6.0"), buckets: &["valid", "invalid"] },
    SchemaReg { name: "EpicCheckpoint", version_path: Some("v8.6.0"), buckets: &["valid", "invalid"] },
    SchemaReg { name: "PlanSignoffEnvelope", version_path: Some("v8.6.0"), buckets: &["valid", "invalid"] },
    SchemaReg { name: "PlanAmendmentRequest", version_path: Some("v8.6.0"), buckets: &["valid", "invalid"] },
    SchemaReg { name: "Challenge", version_path: Some("v8.6.0"), buckets: &["valid", "invalid"] },
    SchemaReg { name: "CanonicalRun", version_path: Some("v8.6.0"), buckets: &["valid", "invalid", "invalid-cross-field"] },
];

#[derive(Serialize, Debug)]
struct Diagnostic {
    code: String,
    path: String,
}

#[derive(Serialize, Debug)]
struct ManifestEntry {
    schema: String,
    vector: String,
    expected: String,
    result: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    diagnostic: Option<Diagnostic>,
}

fn camel_to_kebab(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 4);
    let chars: Vec<char> = s.chars().collect();
    for (i, &c) in chars.iter().enumerate() {
        if c.is_ascii_uppercase() && i > 0 && !chars[i - 1].is_ascii_uppercase() {
            out.push('-');
        }
        out.extend(c.to_lowercase());
    }
    out
}

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent().unwrap()
        .parent().unwrap()
        .parent().unwrap()
        .to_path_buf()
}

fn load_constraint_level_invalids(root: &Path) -> HashSet<String> {
    let path = root.join("vectors").join("_meta").join("constraint-level-invalids.json");
    let raw = match fs::read_to_string(&path) {
        Ok(s) => s,
        Err(_) => return HashSet::new(),
    };
    let v: Value = match serde_json::from_str(&raw) {
        Ok(v) => v,
        Err(_) => return HashSet::new(),
    };
    let mut set = HashSet::new();
    if let Some(arr) = v.get("fixtures").and_then(|x| x.as_array()) {
        for item in arr {
            if let Some(s) = item.as_str() {
                set.insert(s.to_string());
            }
        }
    }
    set
}

/// Conservative RFC 3339 / ISO 8601 UTC date-time check matching
/// the TypeBox ISO8601_UTC_PATTERN (Z suffix, optional 1-9 fractional
/// digits). Cycle-005 contracts treat `format: date-time` as
/// ASSERTIVE; this function backs the format-assertion path so the
/// Rust runner rejects the same fixtures TypeBox does.
fn check_rfc3339_date_time(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() < 20 {
        return false;
    }
    if *bytes.last().unwrap() != b'Z' {
        return false;
    }
    let is_d = |b: u8| b.is_ascii_digit();
    let pos = |i: usize| bytes.get(i).copied();
    if !(is_d(pos(0).unwrap_or(0)) && is_d(pos(1).unwrap_or(0)) && is_d(pos(2).unwrap_or(0)) && is_d(pos(3).unwrap_or(0))) { return false; }
    if pos(4) != Some(b'-') { return false; }
    if !(is_d(pos(5).unwrap_or(0)) && is_d(pos(6).unwrap_or(0))) { return false; }
    if pos(7) != Some(b'-') { return false; }
    if !(is_d(pos(8).unwrap_or(0)) && is_d(pos(9).unwrap_or(0))) { return false; }
    if pos(10) != Some(b'T') { return false; }
    if !(is_d(pos(11).unwrap_or(0)) && is_d(pos(12).unwrap_or(0))) { return false; }
    if pos(13) != Some(b':') { return false; }
    if !(is_d(pos(14).unwrap_or(0)) && is_d(pos(15).unwrap_or(0))) { return false; }
    if pos(16) != Some(b':') { return false; }
    if !(is_d(pos(17).unwrap_or(0)) && is_d(pos(18).unwrap_or(0))) { return false; }
    let tail = &bytes[19..];
    if tail == b"Z" {
        return true;
    }
    if tail.first() != Some(&b'.') {
        return false;
    }
    let frac = &tail[1..tail.len() - 1];
    if frac.is_empty() || frac.len() > 9 {
        return false;
    }
    frac.iter().all(|b| b.is_ascii_digit())
}

fn load_schema(root: &Path, name: &str) -> Result<jsonschema::Validator, String> {
    let stem = camel_to_kebab(name);
    let schema_path = root.join("schemas").join(format!("{}.schema.json", stem));
    let raw = fs::read_to_string(&schema_path)
        .map_err(|e| format!("read {}: {}", schema_path.display(), e))?;
    let value: Value = serde_json::from_str(&raw)
        .map_err(|e| format!("parse {}: {}", schema_path.display(), e))?;
    jsonschema::options()
        .with_format("date-time", check_rfc3339_date_time)
        .should_validate_formats(true)
        .build(&value)
        .map_err(|e| format!("compile {}: {}", schema_path.display(), e))
}

fn list_json_files(dir: &Path) -> Vec<String> {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return vec![],
    };
    let mut out: Vec<String> = entries
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .filter(|n| n.ends_with(".json") && !n.ends_with(".trace.json"))
        .collect();
    out.sort();
    out
}

fn strip_comment(value: Value) -> Value {
    if let Value::Object(mut map) = value {
        map.remove("_comment");
        Value::Object(map)
    } else {
        value
    }
}

fn emit_manifest(root: &Path) -> Result<Vec<ManifestEntry>, String> {
    let cl_invalids = load_constraint_level_invalids(root);
    let mut manifest = Vec::new();
    for reg in SCHEMAS {
        let validator = load_schema(root, reg.name)?;
        for &bucket in reg.buckets {
            let mut bucket_dir = root.join("vectors").join(reg.name);
            if let Some(vp) = reg.version_path {
                bucket_dir.push(vp);
            }
            bucket_dir.push(bucket);
            let vector_prefix = match reg.version_path {
                Some(vp) => format!("{}/{}", vp, bucket),
                None => bucket.to_string(),
            };
            for fname in list_json_files(&bucket_dir) {
                let fpath = bucket_dir.join(&fname);
                let raw = match fs::read_to_string(&fpath) {
                    Ok(s) => s,
                    Err(e) => return Err(format!("read {}: {}", fpath.display(), e)),
                };
                let parsed: Result<Value, _> = serde_json::from_str(&raw);
                let data = match parsed {
                    Ok(d) => strip_comment(d),
                    Err(_) => {
                        manifest.push(ManifestEntry {
                            schema: reg.name.to_string(),
                            vector: format!("{}/{}", vector_prefix, fname),
                            expected: bucket.to_string(),
                            result: "fail".to_string(),
                            diagnostic: Some(Diagnostic {
                                code: "FIXTURE_PARSE_ERROR".to_string(),
                                path: "$".to_string(),
                            }),
                        });
                        continue;
                    }
                };
                let ok = validator.is_valid(&data);
                let key = format!("{}/{}/{}", reg.name, vector_prefix, fname);
                let result = match bucket {
                    "invalid-cross-field" => if ok { "pass-cross-field-deferred" } else { "fail" },
                    "boundary" => if ok { "pass" } else { "fail" },
                    _ if cl_invalids.contains(&key) => if ok { "pass-constraint-level" } else { "fail" },
                    _ => {
                        let expected_valid = bucket == "valid";
                        if ok == expected_valid { "pass" } else { "fail" }
                    }
                };
                manifest.push(ManifestEntry {
                    schema: reg.name.to_string(),
                    vector: format!("{}/{}", vector_prefix, fname),
                    expected: bucket.to_string(),
                    result: result.to_string(),
                    diagnostic: None,
                });
            }
        }
    }
    Ok(manifest)
}

fn main() -> ExitCode {
    let emit = std::env::args().any(|a| a == "--emit-manifest");
    let root = repo_root();
    let manifest = match emit_manifest(&root) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("FATAL: {}", e);
            return ExitCode::from(2);
        }
    };
    if emit {
        match serde_json::to_string(&manifest) {
            Ok(s) => println!("{}", s),
            Err(e) => {
                eprintln!("marshal: {}", e);
                return ExitCode::from(2);
            }
        }
        return ExitCode::SUCCESS;
    }
    let fails = manifest.iter().filter(|e| e.result == "fail").count();
    if fails > 0 {
        eprintln!("FAIL: {} fixture(s) diverged from expectation", fails);
        return ExitCode::from(1);
    }
    println!(
        "OK: {} fixtures validated (parity_protocol_version={})",
        manifest.len(),
        PARITY_PROTOCOL_VERSION
    );
    ExitCode::SUCCESS
}
