package verify

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func mustParse(t *testing.T, s string) any {
	t.Helper()
	v, err := ParseJSON([]byte(s))
	if err != nil {
		t.Fatalf("parse %q: %v", s, err)
	}
	return v
}

// TestCanonicalizationEdgeCorpus runs vectors/_canonicalization-edge-cases/
// (the safeCanonicalize corpus) and requires byte-identical canonical
// text and SHA-256.
func TestCanonicalizationEdgeCorpus(t *testing.T) {
	root := repoRoot(t)
	base := filepath.Join(root, "vectors", "_canonicalization-edge-cases")
	metaBytes, err := os.ReadFile(filepath.Join(base, "_meta.json"))
	if err != nil {
		t.Fatal(err)
	}
	meta := mustParse(t, string(metaBytes)).(map[string]any)
	fixtures := meta["fixtures"].([]any)
	if len(fixtures) < 30 {
		t.Fatalf("expected >= 30 edge-case fixtures, got %d", len(fixtures))
	}
	for _, raw := range fixtures {
		f := raw.(map[string]any)
		name := f["category"].(string) + "/" + f["case"].(string)
		t.Run(name, func(t *testing.T) {
			input, err := os.ReadFile(filepath.Join(base, name+".input.json"))
			if err != nil {
				t.Fatal(err)
			}
			wantCanon, err := os.ReadFile(filepath.Join(base, name+".canonical.txt"))
			if err != nil {
				t.Fatal(err)
			}
			wantHash, err := os.ReadFile(filepath.Join(base, name+".hash.txt"))
			if err != nil {
				t.Fatal(err)
			}
			got, err := SafeCanonicalize(mustParse(t, string(input)))
			if err != nil {
				t.Fatal(err)
			}
			if string(got) != string(wantCanon) {
				t.Errorf("canonical mismatch\n got: %s\nwant: %s", got, wantCanon)
			}
			sum := sha256.Sum256(got)
			if hex.EncodeToString(sum[:]) != strings.TrimSpace(string(wantHash)) {
				t.Errorf("hash mismatch")
			}
		})
	}
}

// TestSharedJCSConformance runs vectors/runners/_shared/jcs-conformance.json.
// Each fixture supplies `input` (JSON value) or `input_json` (raw text)
// plus `expected_canonical` (or `canonical`). An unrecognised fixture
// shape fails loudly rather than passing silently.
func TestSharedJCSConformance(t *testing.T) {
	doc := loadShared(t, "jcs-conformance.json")
	fixtures, _ := doc["fixtures"].([]any)
	t.Logf("jcs-conformance.json: %d fixtures", len(fixtures))
	for i, raw := range fixtures {
		f, _ := raw.(map[string]any)
		var input any
		if s, ok := f["input_json"].(string); ok {
			input = mustParse(t, s)
		} else if v, ok := f["input"]; ok {
			input = v
		} else {
			t.Errorf("fixture %d: no input/input_json", i)
			continue
		}
		want, ok := f["expected_canonical"].(string)
		if !ok {
			want, ok = f["canonical"].(string)
		}
		if !ok {
			t.Errorf("fixture %d: no expected_canonical", i)
			continue
		}
		got, err := SafeCanonicalize(input)
		if err != nil || string(got) != want {
			t.Errorf("fixture %d: got %q (%v), want %q", i, got, err, want)
		}
	}
}

// TestSharedJCSDuplicateKeyRejection runs
// vectors/runners/_shared/jcs-duplicate-key-rejection.json: every
// `input_json` must be rejected by ParseJSON.
func TestSharedJCSDuplicateKeyRejection(t *testing.T) {
	doc := loadShared(t, "jcs-duplicate-key-rejection.json")
	fixtures, _ := doc["fixtures"].([]any)
	t.Logf("jcs-duplicate-key-rejection.json: %d fixtures", len(fixtures))
	for i, raw := range fixtures {
		f, _ := raw.(map[string]any)
		s, ok := f["input_json"].(string)
		if !ok {
			t.Errorf("fixture %d: no input_json", i)
			continue
		}
		if _, err := ParseJSON([]byte(s)); err == nil {
			t.Errorf("fixture %d: duplicate-key input accepted", i)
		}
	}
}

func loadShared(t *testing.T, name string) map[string]any {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(repoRoot(t), "vectors", "runners", "_shared", name))
	if err != nil {
		t.Fatal(err)
	}
	doc, ok := mustParse(t, string(data)).(map[string]any)
	if !ok {
		t.Fatalf("%s is not an object", name)
	}
	return doc
}

func TestDuplicateKeysRejected(t *testing.T) {
	for _, s := range []string{
		`{"a":1,"a":2}`,
		`{"x":{"b":1,"b":1}}`,
		`[{"k":true,"k":false}]`,
	} {
		if _, err := ParseJSON([]byte(s)); !errors.Is(err, ErrDuplicateKey) {
			t.Errorf("%s: want ErrDuplicateKey, got %v", s, err)
		}
	}
	if _, err := ParseJSON([]byte(`{"a":1} {}`)); err == nil {
		t.Error("trailing data accepted")
	}
}

// Expected outputs are JS String(JSON.parse(lit)), i.e. what the TS
// reference emits (ECMAScript Number::toString per RFC 8785 §3.2.2.3).
func TestNumberFormattingMatchesECMAScript(t *testing.T) {
	cases := [][2]string{
		{"0", "0"}, {"-0", "0"}, {"1", "1"}, {"-1", "-1"}, {"0.1", "0.1"},
		{"1e21", "1e+21"}, {"1e+21", "1e+21"}, {"1e20", "100000000000000000000"},
		{"123456789012345680000", "123456789012345680000"}, {"1.5e-7", "1.5e-7"},
		{"0.000001", "0.000001"}, {"1e-7", "1e-7"}, {"9007199254740993", "9007199254740992"},
		{"5e-324", "5e-324"}, {"1.7976931348623157e308", "1.7976931348623157e+308"},
		{"0.30000000000000004", "0.30000000000000004"}, {"100", "100"}, {"1E2", "100"},
		{"-1.25e-10", "-1.25e-10"}, {"12345678.9", "12345678.9"}, {"4.35", "4.35"},
		{"2.5e+300", "2.5e+300"}, {"1e-6", "0.000001"}, {"123e-20", "1.23e-18"},
		{"0.0000012345", "0.0000012345"},
	}
	for _, c := range cases {
		got, err := SafeCanonicalize(mustParse(t, "["+c[0]+"]"))
		if err != nil {
			t.Fatalf("%s: %v", c[0], err)
		}
		if string(got) != "["+c[1]+"]" {
			t.Errorf("%s: got %s want [%s]", c[0], got, c[1])
		}
	}
}

func TestSafeCanonicalizeNFCAndCollision(t *testing.T) {
	got, err := SafeCanonicalize(mustParse(t, `{"cafe\u0301":"cafe\u0301","b":[1,"\u1100\u1161"]}`))
	if err != nil {
		t.Fatal(err)
	}
	if want := "{\"b\":[1,\"\uac00\"],\"caf\u00e9\":\"caf\u00e9\"}"; string(got) != want {
		t.Errorf("got %s want %s", got, want)
	}
	if _, err := SafeCanonicalize(mustParse(t, `{"caf\u00e9":1,"cafe\u0301":2}`)); !errors.Is(err, ErrCanonicalKeyCollision) {
		t.Errorf("want ErrCanonicalKeyCollision, got %v", err)
	}
	// CanonicalizeRaw does NOT normalise (pre-v8.5.0 audit hash domain).
	raw, err := CanonicalizeRaw(mustParse(t, `{"s":"cafe\u0301"}`))
	if err != nil || string(raw) != "{\"s\":\"cafe\u0301\"}" {
		t.Errorf("raw got %q (%v)", raw, err)
	}
}

func TestSafeCanonicalizeSizeCap(t *testing.T) {
	// {"s":"..."} is 8 bytes of framing.
	exact := map[string]any{"s": strings.Repeat("x", SafeCanonicalizeDefaultMaxBytes-8)}
	if _, err := SafeCanonicalize(exact); err != nil {
		t.Errorf("payload at the cap rejected: %v", err)
	}
	over := map[string]any{"s": strings.Repeat("x", SafeCanonicalizeDefaultMaxBytes-7)}
	if _, err := SafeCanonicalize(over); !errors.Is(err, ErrCanonicalSizeCap) {
		t.Errorf("want ErrCanonicalSizeCap, got %v", err)
	}
	if _, err := SafeCanonicalizeMax(over, SafeCanonicalizeDefaultMaxBytes+1); err != nil {
		t.Errorf("override rejected: %v", err)
	}
}

func TestStringEscapingAndKeyOrder(t *testing.T) {
	got, err := SafeCanonicalize(mustParse(t, `{"\u00e4":1,"z":2,"a\u0000":"<&> /\"\\\u001f\b"}`))
	if err != nil {
		t.Fatal(err)
	}
	want := "{\"a\\u0000\":\"<&> /\\\"\\\\\\u001f\\b\",\"z\":2,\"\u00e4\":1}"
	if string(got) != want {
		t.Errorf("got  %s\nwant %s", got, want)
	}
	// UTF-16 code-unit order: U+FF61 sorts after U+1F600 (surrogate D83D).
	got, _ = SafeCanonicalize(mustParse(t, `{"\uff61":1,"\ud83d\ude00":2}`))
	if want := "{\"\U0001F600\":2,\"\uff61\":1}"; string(got) != want {
		t.Errorf("utf16 order got %s want %s", got, want)
	}
}
