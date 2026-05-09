// Cross-language conformance runner for loa-hounfour (Go).
//
// Mirrors `scripts/cross-runner.ts` (TS reference). Walks the per-file
// vector layout and emits a JSON manifest of `{schema, vector,
// expected, result}` entries. Cross-language harness diffs the Go
// output against the TS golden corpus per AT-1.
//
// Schema validation uses santhosh-tekuri/jsonschema/v6 against the
// JSON Schema 2020-12 artifacts under `schemas/`. Cross-field
// invariants (CR-1, FR-C builtins, byte-cap, etc.) are NOT
// evaluated here — those are consumer-side per ADR-010 and surface
// as `'pass-cross-field-deferred'` in the manifest, matching the TS
// reference behaviour.
//
// Usage:
//
//	cd vectors/runners/go
//	go run ./cmd/cross-runner --emit-manifest > go-manifest.json
//	go run ./cmd/cross-runner            # exit 1 on parity divergence
//
// @since v8.6.0 — PR-A3.9 (FR-A2)
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

// rfc3339UTCDateTime matches the same shape Python (cross_runner.py)
// and Rust (cross-runner/src/main.rs) accept: 4-2-2 date, T, 2-2-2
// time, optional 1-9 fractional digits, mandatory Z suffix. Hand-
// rolled to lock cross-runner parity rather than relying on the
// santhosh-tekuri/jsonschema library default (iter-1 mitigation:
// three implementations, three potentially divergent date-time
// semantics — unify on the same regex shape across all three).
var rfc3339UTCDateTime = regexp.MustCompile(
	`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$`,
)

// dateTimeFormat replaces the library default's date-time checker
// with a regex matching the cycle-005 ISO8601_UTC_PATTERN. Returns
// nil on success, error on failure (the v6 API contract).
func dateTimeFormat(value any) error {
	s, ok := value.(string)
	if !ok {
		return nil // type-mismatch reported separately by structural tier
	}
	if !rfc3339UTCDateTime.MatchString(s) {
		return fmt.Errorf("not RFC 3339 UTC date-time: %q", s)
	}
	return nil
}

// PARITY_PROTOCOL_VERSION MUST match scripts/cross-runner.ts.
const ParityProtocolVersion = "1.1.0"

type SchemaReg struct {
	Name        string
	VersionPath string // empty for flat layout
	Buckets     []string
}

// SCHEMAS mirrors the SCHEMAS dict in scripts/cross-runner.ts.
// Cross-language runners MUST keep this in lockstep — additions here
// are mirrored in vectors/runners/{python,rust}/cross_runner.* and
// scripts/cross-runner.ts.
var Schemas = []SchemaReg{
	// v8.4.0 substrate — flat layout.
	{"PanelDecisionArtifact", "", []string{"valid", "invalid"}},
	{"PanelVerdict", "", []string{"valid", "invalid"}},
	{"DeliberationDissent", "", []string{"valid", "invalid"}},
	{"CrossScoreReport", "", []string{"valid", "invalid"}},
	{"OrgIdentity", "", []string{"valid", "invalid"}},
	{"OrgRepresentativeDelegation", "", []string{"valid", "invalid"}},
	{"SuccessionPolicy", "", []string{"valid", "invalid"}},
	// v8.6.0 cycle-005 cluster — versioned layout.
	// PhaseCompletionEnvelope deferred — see Tier-1/Tier-2 fixture-
	// routing rationale in scripts/cross-runner.ts (TS reference).
	// {"PhaseCompletionEnvelope", "v8.6.0", []string{"valid", "invalid"}},
	{"OracleDigest", "v8.6.0", []string{"valid", "invalid"}},
	{"EpicCheckpoint", "v8.6.0", []string{"valid", "invalid"}},
	{"PlanSignoffEnvelope", "v8.6.0", []string{"valid", "invalid"}},
	{"PlanAmendmentRequest", "v8.6.0", []string{"valid", "invalid"}},
	{"Challenge", "v8.6.0", []string{"valid", "invalid"}},
	{"CanonicalRun", "v8.6.0", []string{"valid", "invalid", "invalid-cross-field"}},
}

type ManifestEntry struct {
	Schema     string         `json:"schema"`
	Vector     string         `json:"vector"`
	Expected   string         `json:"expected"`
	Result     string         `json:"result"`
	Diagnostic *DiagnosticPtr `json:"diagnostic,omitempty"`
}

type DiagnosticPtr struct {
	Code string `json:"code"`
	Path string `json:"path"`
}

// camelToKebab converts PascalCase / camelCase to kebab-case using
// rune-indexed iteration. Schema names are ASCII today, but iter-1 F-001
// flagged the byte/rune mismatch in `for i, r := range s; s[i-1]` — the
// `[]rune(s)` slice form is correct for any future Unicode-bearing names.
func camelToKebab(s string) string {
	var out strings.Builder
	runes := []rune(s)
	for i, r := range runes {
		if r >= 'A' && r <= 'Z' && i > 0 {
			prev := runes[i-1]
			if !(prev >= 'A' && prev <= 'Z') {
				out.WriteByte('-')
			}
		}
		if r >= 'A' && r <= 'Z' {
			out.WriteRune(r + ('a' - 'A'))
		} else {
			out.WriteRune(r)
		}
	}
	return out.String()
}

var repoRoot string

func init() {
	_, filename, _, _ := runtime.Caller(0)
	// .../vectors/runners/go/cmd/cross-runner/main.go → up 5 to repo root
	repoRoot = filepath.Join(filepath.Dir(filename), "..", "..", "..", "..", "..")
}

func loadConstraintLevelInvalids() (map[string]bool, error) {
	path := filepath.Join(repoRoot, "vectors", "_meta", "constraint-level-invalids.json")
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]bool{}, nil
		}
		return nil, err
	}
	var doc struct {
		Fixtures []string `json:"fixtures"`
	}
	if err := json.Unmarshal(data, &doc); err != nil {
		return nil, err
	}
	set := make(map[string]bool, len(doc.Fixtures))
	for _, f := range doc.Fixtures {
		set[f] = true
	}
	return set, nil
}

func loadSchema(name string) (*jsonschema.Schema, error) {
	stem := camelToKebab(name)
	schemaPath := filepath.Join(repoRoot, "schemas", stem+".schema.json")
	c := jsonschema.NewCompiler()
	// JSON Schema 2020-12 makes `format` an annotation by default.
	// Cycle-005 contracts treat format as ASSERTIVE (TypeBox's
	// FormatRegistry rejects malformed date-time, etc.) so the Go
	// runner enables format-assertion to match.
	c.AssertFormat()
	// iter-1 mitigation: register a custom date-time checker matching
	// the same regex shape Python and Rust use (rfc3339UTCDateTime
	// above). Without this, the santhosh-tekuri library's default
	// date-time checker may accept / reject edge cases (`+00:00`
	// timezone offset, fractional-precision boundaries) that diverge
	// from the hand-rolled checkers in the other two runners.
	c.RegisterFormat(&jsonschema.Format{
		Name:     "date-time",
		Validate: dateTimeFormat,
	})
	return c.Compile(schemaPath)
}

func listJSONFiles(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var out []string
	for _, e := range entries {
		name := e.Name()
		if !e.IsDir() && strings.HasSuffix(name, ".json") && !strings.HasSuffix(name, ".trace.json") {
			out = append(out, name)
		}
	}
	sort.Strings(out)
	return out, nil
}

// stripComment removes the optional `_comment` field from
// fixture-root objects per cycle-005 vector convention.
func stripComment(data interface{}) interface{} {
	if m, ok := data.(map[string]interface{}); ok {
		delete(m, "_comment")
		return m
	}
	return data
}

func emitManifest() ([]ManifestEntry, error) {
	clInvalids, err := loadConstraintLevelInvalids()
	if err != nil {
		return nil, err
	}
	manifest := []ManifestEntry{}
	for _, reg := range Schemas {
		schema, err := loadSchema(reg.Name)
		if err != nil {
			return nil, fmt.Errorf("compile schema %s: %w", reg.Name, err)
		}
		for _, bucket := range reg.Buckets {
			parts := []string{repoRoot, "vectors", reg.Name}
			if reg.VersionPath != "" {
				parts = append(parts, reg.VersionPath)
			}
			parts = append(parts, bucket)
			bucketDir := filepath.Join(parts...)
			vectorPrefix := bucket
			if reg.VersionPath != "" {
				vectorPrefix = reg.VersionPath + "/" + bucket
			}
			files, err := listJSONFiles(bucketDir)
			if err != nil {
				return nil, err
			}
			for _, fname := range files {
				fpath := filepath.Join(bucketDir, fname)
				raw, err := os.ReadFile(fpath)
				if err != nil {
					return nil, err
				}
				var data interface{}
				if err := json.Unmarshal(raw, &data); err != nil {
					manifest = append(manifest, ManifestEntry{
						Schema:     reg.Name,
						Vector:     vectorPrefix + "/" + fname,
						Expected:   bucket,
						Result:     "fail",
						Diagnostic: &DiagnosticPtr{Code: "FIXTURE_PARSE_ERROR", Path: "$"},
					})
					continue
				}
				data = stripComment(data)
				validateErr := schema.Validate(data)
				ok := validateErr == nil
				key := reg.Name + "/" + vectorPrefix + "/" + fname
				var result string
				switch {
				case bucket == "invalid-cross-field":
					if ok {
						result = "pass-cross-field-deferred"
					} else {
						result = "fail"
					}
				case bucket == "boundary":
					if ok {
						result = "pass"
					} else {
						result = "fail"
					}
				case clInvalids[key]:
					if ok {
						result = "pass-constraint-level"
					} else {
						result = "fail"
					}
				default:
					expectedValid := bucket == "valid"
					if ok == expectedValid {
						result = "pass"
					} else {
						result = "fail"
					}
				}
				manifest = append(manifest, ManifestEntry{
					Schema:   reg.Name,
					Vector:   vectorPrefix + "/" + fname,
					Expected: bucket,
					Result:   result,
				})
			}
		}
	}
	return manifest, nil
}

func main() {
	emit := false
	for _, a := range os.Args[1:] {
		if a == "--emit-manifest" {
			emit = true
		}
	}
	manifest, err := emitManifest()
	if err != nil {
		fmt.Fprintf(os.Stderr, "FATAL: %v\n", err)
		os.Exit(2)
	}
	if emit {
		out, err := json.Marshal(manifest)
		if err != nil {
			fmt.Fprintf(os.Stderr, "marshal: %v\n", err)
			os.Exit(2)
		}
		fmt.Println(string(out))
		return
	}
	fails := 0
	for _, e := range manifest {
		if e.Result == "fail" {
			fails++
		}
	}
	if fails > 0 {
		fmt.Fprintf(os.Stderr, "FAIL: %d fixture(s) diverged from expectation\n", fails)
		os.Exit(1)
	}
	fmt.Printf("OK: %d fixtures validated (parity_protocol_version=%s)\n", len(manifest), ParityProtocolVersion)
}
