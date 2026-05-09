//! Cross-language golden vector runner for loa-hounfour.
//!
//! Validates JSON Schema files against golden test vectors using the
//! `jsonschema` crate. No TypeScript toolchain required.
//!
//! # Usage
//!
//! ```bash
//! cd vectors/runners/rust
//! cargo run
//! ```

use glob::glob;
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::process;

fn repo_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("..")
        .canonicalize()
        .expect("Failed to resolve repo root")
}

fn load_json(path: &Path) -> Value {
    let content = std::fs::read_to_string(path)
        .unwrap_or_else(|e| panic!("Failed to read {}: {e}", path.display()));
    serde_json::from_str(&content)
        .unwrap_or_else(|e| panic!("Failed to parse {}: {e}", path.display()))
}

fn compile_schema(schema: &Value) -> jsonschema::Validator {
    jsonschema::validator_for(schema)
        .unwrap_or_else(|e| panic!("Failed to compile schema: {e}"))
}

struct TestResult {
    passed: u32,
    failed: u32,
    errors: Vec<String>,
}

impl TestResult {
    fn new() -> Self {
        Self {
            passed: 0,
            failed: 0,
            errors: Vec::new(),
        }
    }
}

fn run_vector_suite(
    result: &mut TestResult,
    schema_name: &str,
    vector_path: &Path,
    valid_key: &str,
    invalid_key: &str,
) {
    let root = repo_root();
    let schema_path = root.join("schemas").join(format!("{schema_name}.schema.json"));

    if !schema_path.exists() {
        eprintln!("  SKIP: schema not found: {}", schema_path.display());
        return;
    }

    if !vector_path.exists() {
        eprintln!("  SKIP: vectors not found: {}", vector_path.display());
        return;
    }

    let schema_json = load_json(&schema_path);
    let validator = compile_schema(&schema_json);
    let vectors = load_json(vector_path);

    println!("\n{schema_name} ({}):", vector_path.file_name().unwrap().to_str().unwrap());

    // Valid vectors
    if let Some(valid_arr) = vectors.get(valid_key).and_then(|v| v.as_array()) {
        for entry in valid_arr {
            let id = entry.get("id").and_then(|v| v.as_str()).unwrap_or("unknown");
            let data = entry.get("data").expect("Missing 'data' field");

            if validator.validate(data).is_ok() {
                result.passed += 1;
                println!("  [PASS] {id}");
            } else {
                result.failed += 1;
                let msg = format!("{schema_name}/{id}: expected valid, got invalid");
                println!("  [FAIL] {id}");
                result.errors.push(msg);
            }
        }
    }

    // Invalid vectors
    if let Some(invalid_arr) = vectors.get(invalid_key).and_then(|v| v.as_array()) {
        for entry in invalid_arr {
            let id = entry.get("id").and_then(|v| v.as_str()).unwrap_or("unknown");
            let data = match entry.get("data") {
                Some(d) => d,
                None => continue, // Skip entries without data
            };

            if validator.validate(data).is_err() {
                result.passed += 1;
                println!("  [PASS] {id}");
            } else {
                result.failed += 1;
                let msg = format!("{schema_name}/{id}: expected invalid, got valid");
                println!("  [FAIL] {id}");
                result.errors.push(msg);
            }
        }
    }
}

fn main() {
    let root = repo_root();
    let vectors_dir = root.join("vectors");
    let mut result = TestResult::new();

    println!("loa-hounfour Golden Vector Runner (Rust)");
    println!("========================================");

    // Domain events
    run_vector_suite(
        &mut result,
        "domain-event",
        &vectors_dir.join("domain-event").join("events.json"),
        "valid_events",
        "invalid",
    );

    // Domain event batches
    run_vector_suite(
        &mut result,
        "domain-event-batch",
        &vectors_dir.join("domain-event").join("batches.json"),
        "valid_batches",
        "invalid_batches",
    );

    // Conversations
    run_vector_suite(
        &mut result,
        "conversation",
        &vectors_dir.join("conversation").join("conversations.json"),
        "valid_conversations",
        "invalid",
    );

    // Billing allocation
    run_vector_suite(
        &mut result,
        "billing-entry",
        &vectors_dir.join("billing").join("allocation.json"),
        "valid_entries",
        "invalid_entries",
    );

    // Transfer specs
    run_vector_suite(
        &mut result,
        "transfer-spec",
        &vectors_dir.join("transfer").join("transfers.json"),
        "valid_transfers",
        "invalid_transfers",
    );

    // Agent lifecycle payloads
    run_vector_suite(
        &mut result,
        "lifecycle-transition-payload",
        &vectors_dir.join("agent").join("lifecycle-payloads.json"),
        "valid_payloads",
        "invalid_payloads",
    );

    // Health status (v3.1.0)
    run_vector_suite(
        &mut result,
        "health-status",
        &vectors_dir.join("health").join("health-status.json"),
        "valid",
        "invalid",
    );

    // Thinking traces (v3.1.0)
    run_vector_suite(
        &mut result,
        "thinking-trace",
        &vectors_dir.join("thinking").join("thinking-traces.json"),
        "valid",
        "invalid",
    );

    // Summary
    println!("\n{}", "=".repeat(50));
    println!("Results: {} passed, {} failed", result.passed, result.failed);

    if !result.errors.is_empty() {
        println!("\nFailures:");
        for e in &result.errors {
            println!("  {e}");
        }
    }

    process::exit(if result.failed > 0 { 1 } else { 0 });
}
