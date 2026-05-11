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
use std::sync::OnceLock;

/// SSOT files. iter-2 F008+F011 mitigation: every runner reads the
/// version + regex from `vectors/runners/_shared/` rather than
/// holding a hardcoded fallback that would silently drift across
/// runners. Initialized once at process startup; misconfigured
/// installs fail loudly at first call.
static PARITY_PROTOCOL_VERSION_CELL: OnceLock<String> = OnceLock::new();
static RFC3339_UTC_PATTERN_SOURCE: OnceLock<String> = OnceLock::new();

fn load_shared(root: &Path) -> Result<(), String> {
    let pv_path = root
        .join("vectors")
        .join("runners")
        .join("_shared")
        .join("parity-protocol-version.txt");
    let pv = fs::read_to_string(&pv_path)
        .map_err(|e| format!("load {}: {}", pv_path.display(), e))?
        .trim()
        .to_string();
    if pv.is_empty() {
        return Err(format!("{}: empty file", pv_path.display()));
    }
    PARITY_PROTOCOL_VERSION_CELL
        .set(pv)
        .map_err(|_| "PARITY_PROTOCOL_VERSION already initialized".to_string())?;
    let rp_path = root
        .join("vectors")
        .join("runners")
        .join("_shared")
        .join("rfc3339-utc-pattern.txt");
    let rp = fs::read_to_string(&rp_path)
        .map_err(|e| format!("load {}: {}", rp_path.display(), e))?
        .trim()
        .to_string();
    if rp.is_empty() {
        return Err(format!("{}: empty file", rp_path.display()));
    }
    RFC3339_UTC_PATTERN_SOURCE
        .set(rp)
        .map_err(|_| "RFC3339_UTC_PATTERN_SOURCE already initialized".to_string())?;
    Ok(())
}

fn parity_protocol_version() -> &'static str {
    PARITY_PROTOCOL_VERSION_CELL
        .get()
        .expect("load_shared() must run before parity_protocol_version()")
}

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
    // v8.7.0 cycle-007 cluster — versioned layout. PR-A4.1 (FR-G1).
    SchemaReg { name: "ClusterRunSeries", version_path: Some("v8.7.0"), buckets: &["valid", "invalid", "invalid-cross-field"] },
    // v8.7.0 cycle-007 cluster — versioned layout. PR-A4.2 (FR-G2).
    SchemaReg { name: "InterSeriesScopingArtifact", version_path: Some("v8.7.0"), buckets: &["valid", "invalid", "invalid-cross-field"] },
    // v8.7.0 cycle-007 cluster — versioned layout. PR-A4.3 (FR-G3).
    SchemaReg { name: "SubscriptionPoolState", version_path: Some("v8.7.0"), buckets: &["valid", "invalid", "invalid-cross-field"] },
    // v8.7.0 cycle-007 cluster — versioned layout. PR-A4.4 (FR-G4).
    SchemaReg { name: "RevocationList", version_path: Some("v8.7.0"), buckets: &["valid", "invalid", "invalid-cross-field"] },
    // v8.7.0 cycle-007 cluster — versioned layout. PR-A4.5 (FR-G5).
    SchemaReg { name: "MergeArtifact", version_path: Some("v8.7.0"), buckets: &["valid", "invalid"] },
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

/// camel_to_kebab converts PascalCase / camelCase to kebab-case.
/// iter-2 F003 mitigation: handles the consecutive-uppercase boundary
/// (HTTPServer → http-server, not httpserver) via lookahead.
fn camel_to_kebab(s: &str) -> String {
    let chars: Vec<char> = s.chars().collect();
    let mut out = String::with_capacity(s.len() + 4);
    for (i, &c) in chars.iter().enumerate() {
        let is_upper = c.is_ascii_uppercase();
        if is_upper && i > 0 {
            let prev_upper = chars[i - 1].is_ascii_uppercase();
            let next_lower = chars
                .get(i + 1)
                .map(|n| n.is_ascii_lowercase())
                .unwrap_or(false);
            // Rule 1: lowercase before uppercase → hyphen.
            // Rule 2: uppercase before uppercase-then-lowercase → hyphen.
            if !prev_upper || (prev_upper && next_lower) {
                out.push('-');
            }
        }
        out.extend(c.to_lowercase());
    }
    out
}

/// findRepoRoot walks upward from the current working directory
/// looking for the marker file that uniquely identifies the
/// loa-hounfour repo root. iter-3 F008 mitigation:
/// `env!("CARGO_MANIFEST_DIR")` bakes the build-host source path
/// into the binary at compile time — once `cargo install`'d (or
/// distributed via any non-`cargo run` channel), that path no
/// longer exists and the binary fails opaquely.
///
/// LOA_HOUNFOUR_REPO_ROOT env var override is honored for CI / sandbox
/// environments where CWD might be a temp dir.
fn repo_root() -> Result<PathBuf, String> {
    if let Ok(env) = std::env::var("LOA_HOUNFOUR_REPO_ROOT") {
        if !env.is_empty() {
            return Ok(PathBuf::from(env));
        }
    }
    let cwd = std::env::current_dir().map_err(|e| format!("getcwd: {}", e))?;
    let mut dir = cwd.clone();
    for _ in 0..16 {
        // Marker: vectors/runners/_shared/parity-protocol-version.txt
        // (load-bearing for this binary; won't exist outside the
        // loa-hounfour tree).
        let marker = dir
            .join("vectors")
            .join("runners")
            .join("_shared")
            .join("parity-protocol-version.txt");
        if marker.exists() {
            return Ok(dir);
        }
        match dir.parent() {
            Some(p) if p != dir => dir = p.to_path_buf(),
            _ => break,
        }
    }
    Err(format!(
        "could not find loa-hounfour repo root from {} (looked for vectors/runners/_shared/parity-protocol-version.txt up to 16 levels up; set LOA_HOUNFOUR_REPO_ROOT to override)",
        cwd.display()
    ))
}

fn load_constraint_level_invalids(root: &Path) -> Result<HashSet<String>, String> {
    let path = root
        .join("vectors")
        .join("_meta")
        .join("constraint-level-invalids.json");
    // iter-2 F-001 mitigation: surface I/O and parse errors loudly
    // rather than swallowing into an empty set. A missing file is
    // tolerable (returns empty); a corrupted file MUST fail at
    // startup so consumers see the diagnostic instead of silently
    // diverging from TS reference output.
    let raw = match fs::read_to_string(&path) {
        Ok(s) => s,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(HashSet::new()),
        Err(e) => return Err(format!("read {}: {}", path.display(), e)),
    };
    let v: Value = serde_json::from_str(&raw)
        .map_err(|e| format!("parse {}: {}", path.display(), e))?;
    let mut set = HashSet::new();
    if let Some(arr) = v.get("fixtures").and_then(|x| x.as_array()) {
        for item in arr {
            if let Some(s) = item.as_str() {
                set.insert(s.to_string());
            }
        }
    }
    Ok(set)
}

/// RFC 3339 / ISO 8601 UTC date-time check. iter-3 mitigation: regex
/// compiled from the shared `vectors/runners/_shared/rfc3339-utc-
/// pattern.txt` source so Python / Go / Rust all consult the same
/// pattern (F008 SSOT). Compiled once per process via OnceLock.
static RFC3339_UTC_DATE_TIME_RE: OnceLock<regex::Regex> = OnceLock::new();

fn check_rfc3339_date_time(value: &str) -> bool {
    let re = RFC3339_UTC_DATE_TIME_RE.get_or_init(|| {
        let pattern = RFC3339_UTC_PATTERN_SOURCE
            .get()
            .expect("load_shared() must run before check_rfc3339_date_time()");
        regex::Regex::new(pattern)
            .unwrap_or_else(|e| panic!("compile rfc3339-utc-pattern: {}", e))
    });
    re.is_match(value)
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

fn list_json_files(dir: &Path) -> Result<Vec<String>, String> {
    // iter-3 F-001 mitigation: previously swallowed all read_dir errors
    // as empty Vec, masking permission / I/O failures as "missing
    // bucket". Now: ENOENT tolerated (returns empty), all other
    // I/O errors surface as Result::Err so the harness sees the
    // diagnostic at startup. Pattern matches the SSOT load discipline
    // — failure mode IS the product.
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
        Err(e) => return Err(format!("read_dir {}: {}", dir.display(), e)),
    };
    let mut out: Vec<String> = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("read_dir entry in {}: {}", dir.display(), e))?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.ends_with(".json") && !name.ends_with(".trace.json") {
            out.push(name);
        }
    }
    out.sort();
    Ok(out)
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
    let cl_invalids = load_constraint_level_invalids(root)?;
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
            for fname in list_json_files(&bucket_dir)? {
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
    let root = match repo_root() {
        Ok(r) => r,
        Err(e) => {
            eprintln!("FATAL (cross-runner repo_root): {}", e);
            return ExitCode::from(2);
        }
    };
    if let Err(e) = load_shared(&root) {
        eprintln!("FATAL (cross-runner init): {}", e);
        return ExitCode::from(2);
    }
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
        parity_protocol_version()
    );
    ExitCode::SUCCESS
}
