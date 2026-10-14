package verify

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

// Kinds lists the verifier conformance-suite case kinds.
var Kinds = []string{"audit-trail", "signature", "revocation"}

// Case is one vectors/verifier/<kind>/<case>.json file.
type Case struct {
	Case     string
	Kind     string
	Input    map[string]any
	Expected any
}

// ManifestEntry is one row of the runner manifest diffed by
// scripts/run-verifier-parity.sh.
type ManifestEntry struct {
	Kind            string `json:"kind"`
	Case            string `json:"case"`
	Result          any    `json:"result"`
	MatchesExpected bool   `json:"matches_expected"`
}

// FindRepoRoot walks up from start to the directory holding
// vectors/verifier/_meta.json (walk-up-to-marker; no build-host paths).
func FindRepoRoot(start string) (string, error) {
	dir, err := filepath.Abs(start)
	if err != nil {
		return "", err
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "vectors", "verifier", "_meta.json")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("repo root (vectors/verifier/_meta.json) not found above %s", start)
		}
		dir = parent
	}
}

// LoadCases reads every case file, sorted by kind then file name.
func LoadCases(repoRoot string) ([]Case, error) {
	var out []Case
	for _, kind := range Kinds {
		dir := filepath.Join(repoRoot, "vectors", "verifier", kind)
		names, err := os.ReadDir(dir)
		if err != nil {
			return nil, err
		}
		var files []string
		for _, n := range names {
			if strings.HasSuffix(n.Name(), ".json") {
				files = append(files, n.Name())
			}
		}
		sort.Strings(files)
		for _, f := range files {
			data, err := os.ReadFile(filepath.Join(dir, f))
			if err != nil {
				return nil, err
			}
			tree, err := ParseJSON(data)
			if err != nil {
				return nil, fmt.Errorf("%s/%s: %w", kind, f, err)
			}
			obj, ok := tree.(map[string]any)
			if !ok {
				return nil, fmt.Errorf("%s/%s: not an object", kind, f)
			}
			c := Case{Expected: obj["expected"]}
			c.Case, _ = obj["case"].(string)
			c.Kind, _ = obj["kind"].(string)
			c.Input, _ = obj["input"].(map[string]any)
			if c.Kind != kind || c.Case+".json" != f || c.Input == nil {
				return nil, fmt.Errorf("%s/%s: kind/case/input do not match its path", kind, f)
			}
			out = append(out, c)
		}
	}
	return out, nil
}

// RunCase executes one case through the Go port and returns its result.
func RunCase(c Case, shape *jsonschema.Schema) (any, error) {
	switch c.Kind {
	case "audit-trail":
		t, err := AuditTrailFromTree(c.Input["trail"])
		if err != nil {
			return nil, err
		}
		return VerifyAuditTrailIntegrity(t)
	case "signature":
		opts, ok := OptionsFromTree(c.Input["options"])
		if !ok {
			return fail("options_invalid"), nil
		}
		return VerifyEnvelopeSignatureEd25519(c.Input["envelope"], c.Input["public_key"], opts), nil
	case "revocation":
		lists, ok := c.Input["lists"].([]any)
		if !ok {
			return nil, fmt.Errorf("lists is not an array")
		}
		key, _ := c.Input["signer_key_id"].(string)
		atText, _ := c.Input["at"].(string)
		return LookupRevocationAt(lists, key, atText, shape), nil
	}
	return nil, fmt.Errorf("unknown kind %q", c.Kind)
}

// CanonicalJSON returns the JCS form of any JSON-marshalable value, used
// to compare results with expectations independent of key order.
func CanonicalJSON(v any) (string, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return "", err
	}
	tree, err := ParseJSON(buf.Bytes())
	if err != nil {
		return "", err
	}
	out, err := CanonicalizeRaw(tree)
	return string(out), err
}

// BuildManifest runs the whole suite.
func BuildManifest(repoRoot string) ([]ManifestEntry, error) {
	shape, err := LoadRevocationListSchema(filepath.Join(repoRoot, "schemas", "revocation-list.schema.json"))
	if err != nil {
		return nil, err
	}
	cases, err := LoadCases(repoRoot)
	if err != nil {
		return nil, err
	}
	var out []ManifestEntry
	for _, c := range cases {
		res, err := RunCase(c, shape)
		if err != nil {
			return nil, fmt.Errorf("%s/%s: %w", c.Kind, c.Case, err)
		}
		got, err := CanonicalJSON(res)
		if err != nil {
			return nil, err
		}
		want, err := CanonicalJSON(c.Expected)
		if err != nil {
			return nil, err
		}
		var resultTree any
		if err := json.Unmarshal([]byte(got), &resultTree); err != nil {
			return nil, err
		}
		out = append(out, ManifestEntry{Kind: c.Kind, Case: c.Case, Result: resultTree, MatchesExpected: got == want})
	}
	return out, nil
}
