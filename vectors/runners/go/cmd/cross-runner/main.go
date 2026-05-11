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
	"sort"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

// loadShared populates ParityProtocolVersion + rfc3339UTCDateTime
// from vectors/runners/_shared/. Called from init() so misconfigured
// installs fail loudly at startup rather than silently passing the
// cross-runner harness.
func loadShared() error {
	pv, err := os.ReadFile(filepath.Join(repoRoot, "vectors", "runners", "_shared", "parity-protocol-version.txt"))
	if err != nil {
		return fmt.Errorf("load parity-protocol-version.txt: %w", err)
	}
	ParityProtocolVersion = strings.TrimSpace(string(pv))
	if ParityProtocolVersion == "" {
		return fmt.Errorf("parity-protocol-version.txt is empty")
	}
	rp, err := os.ReadFile(filepath.Join(repoRoot, "vectors", "runners", "_shared", "rfc3339-utc-pattern.txt"))
	if err != nil {
		return fmt.Errorf("load rfc3339-utc-pattern.txt: %w", err)
	}
	rfc3339UTCDateTime, err = regexp.Compile(strings.TrimSpace(string(rp)))
	if err != nil {
		return fmt.Errorf("compile rfc3339-utc-pattern.txt: %w", err)
	}
	return nil
}

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

// ParityProtocolVersion is loaded at startup from
// vectors/runners/_shared/parity-protocol-version.txt. iter-2 F011
// mitigation: the shared file is the SSOT; hardcoded fallbacks
// drift silently. Same for the RFC 3339 regex (F008).
var (
	ParityProtocolVersion string
	rfc3339UTCDateTime    *regexp.Regexp
)

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
	// v8.7.0 cycle-007 cluster — versioned layout. PR-A4.1 (FR-G1).
	{"ClusterRunSeries", "v8.7.0", []string{"valid", "invalid", "invalid-cross-field"}},
	// v8.7.0 cycle-007 cluster — versioned layout. PR-A4.2 (FR-G2).
	{"InterSeriesScopingArtifact", "v8.7.0", []string{"valid", "invalid", "invalid-cross-field"}},
	// v8.7.0 cycle-007 cluster — versioned layout. PR-A4.3 (FR-G3).
	{"SubscriptionPoolState", "v8.7.0", []string{"valid", "invalid", "invalid-cross-field"}},
	// v8.7.0 cycle-007 cluster — versioned layout. PR-A4.4 (FR-G4).
	{"RevocationList", "v8.7.0", []string{"valid", "invalid", "invalid-cross-field"}},
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

// camelToKebab converts PascalCase / camelCase to kebab-case.
// Iter-2 F003 mitigation: hyphenate at every word boundary, including
// the consecutive-uppercase → lowercase transition (HTTPServer →
// http-server, not httpserver). Two boundary rules:
//   1. lowercase → uppercase    (e.g., camelCase → camel-Case)
//   2. UPPER → upper + lower    (e.g., HTTPServer → HTTP-Server)
// Both produce a single hyphen at the boundary; the rest of the
// string is lowercased.
//
// All current schema names land in rule 1 (PascalCase with single-
// uppercase boundaries), but the rule-2 fix prevents future
// HTTPServer / URLPath / IDToken-style identifiers from collapsing.
func camelToKebab(s string) string {
	runes := []rune(s)
	var out strings.Builder
	for i, r := range runes {
		isUpper := r >= 'A' && r <= 'Z'
		if isUpper && i > 0 {
			prev := runes[i-1]
			prevUpper := prev >= 'A' && prev <= 'Z'
			next := rune(0)
			if i+1 < len(runes) {
				next = runes[i+1]
			}
			nextLower := next >= 'a' && next <= 'z'
			// Rule 1: lowercase before uppercase → hyphen.
			// Rule 2: uppercase before uppercase-then-lowercase → hyphen.
			if !prevUpper || (prevUpper && nextLower) {
				out.WriteByte('-')
			}
		}
		if isUpper {
			out.WriteRune(r + ('a' - 'A'))
		} else {
			out.WriteRune(r)
		}
	}
	return out.String()
}

var repoRoot string

// findRepoRoot walks upward from the current working directory looking
// for a marker that uniquely identifies the loa-hounfour repo root.
// iter-3 F007 mitigation: `runtime.Caller(0)`-based resolution embeds
// the build-host source path into the binary; once `go install`'d (or
// distributed via any non-`go run` channel), the source path is gone
// and the binary fails opaquely. CWD-walk-up + marker detection works
// for `go run` from any subdirectory AND for installed binaries
// invoked from the repo root.
//
// LOA_HOUNFOUR_REPO_ROOT env var override is honored for CI / sandbox
// environments where CWD might be a temp dir.
func findRepoRoot() (string, error) {
	if env := os.Getenv("LOA_HOUNFOUR_REPO_ROOT"); env != "" {
		return env, nil
	}
	cwd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("getwd: %w", err)
	}
	dir := cwd
	for i := 0; i < 16; i++ {
		// Marker: vectors/runners/_shared/parity-protocol-version.txt
		// (chosen because it's load-bearing for this binary and won't
		// exist outside the loa-hounfour tree).
		marker := filepath.Join(dir, "vectors", "runners", "_shared", "parity-protocol-version.txt")
		if _, err := os.Stat(marker); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return "", fmt.Errorf("could not find loa-hounfour repo root from %s (looked for vectors/runners/_shared/parity-protocol-version.txt up to 16 levels up; set LOA_HOUNFOUR_REPO_ROOT to override)", cwd)
}

func init() {
	root, err := findRepoRoot()
	if err != nil {
		fmt.Fprintf(os.Stderr, "FATAL (cross-runner init): %v\n", err)
		os.Exit(2)
	}
	repoRoot = root
	if err := loadShared(); err != nil {
		fmt.Fprintf(os.Stderr, "FATAL (cross-runner init): %v\n", err)
		os.Exit(2)
	}
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
