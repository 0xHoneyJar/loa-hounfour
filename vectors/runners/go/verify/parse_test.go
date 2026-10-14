package verify

import (
	"bytes"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

// Expected strings are Node's Buffer.toString('utf8') of the same bytes
// (WHATWG maximal-subpart replacement), recorded from Node 22.
func TestDecodeUTF8LossyMatchesNode(t *testing.T) {
	for _, c := range [][2]string{
		{"e282", "�"}, {"e28241", "�A"}, {"ff41", "�A"},
		{"f09f98", "�"}, {"eda080", "���"}, {"c0af", "��"},
		{"f4908080", "����"}, {"e0809f", "���"},
		{"41e282ac42", "A€B"},
	} {
		b, _ := hex.DecodeString(c[0])
		if got := string(decodeUTF8Lossy(b)); got != c[1] {
			t.Errorf("%s: got %q want %q", c[0], got, c[1])
		}
	}
	v, err := ParseJSON([]byte("\"a\xe2\x82b\""))
	if err != nil || v != "a�b" {
		t.Errorf("raw invalid bytes in string: %q %v", v, err)
	}
}

func TestParseJSONSurrogates(t *testing.T) {
	if v := mustParse(t, `"😀"`); v != "\U0001F600" {
		t.Errorf("pair: %q", v)
	}
	for _, s := range []string{`"a\ud800b"`, `"\udc00"`, `"\ud800A"`, `"\ud800"`} {
		v := mustParse(t, s).(string)
		if _, err := SafeCanonicalize(v); !errors.Is(err, ErrCanonicalNFC) {
			t.Errorf("%s: SafeCanonicalize want ErrCanonicalNFC, got %v", s, err)
		}
		if _, err := CanonicalizeRaw(v); !errors.Is(err, ErrCanonicalNFC) {
			t.Errorf("%s: CanonicalizeRaw want ErrCanonicalNFC, got %v", s, err)
		}
	}
	if _, err := SafeCanonicalize(mustParse(t, `{"\udfff":1}`)); !errors.Is(err, ErrCanonicalNFC) {
		t.Errorf("lone surrogate key: %v", err)
	}
	if v := mustParse(t, `"\ud800A"`).(string); !strings.HasSuffix(v, "A") {
		t.Errorf("high surrogate followed by non-low escape must keep the second escape: %q", v)
	}
}

func TestParseJSONRejectsMalformed(t *testing.T) {
	for _, s := range []string{``, `{`, `[1,]`, `{"a" 1}`, `{"a":1,}`, `01`, `1.`, `-`, `"\x"`, `"\u12g4"`,
		"\"tab\there\"", `tru`, `nul`, `{1:2}`, `[1 2]`, `"abc`, `1 2`} {
		if _, err := ParseJSON([]byte(s)); err == nil {
			t.Errorf("accepted %q", s)
		}
	}
}

// Every committed JSON vector must parse to the same tree as
// encoding/json (with UseNumber) wherever no surrogate edge is involved.
func TestParseJSONAgreesWithEncodingJSON(t *testing.T) {
	root := filepath.Join(repoRoot(t), "vectors")
	n := 0
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(path, ".json") || strings.Contains(path, "/runners/") {
			return err
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		var want any
		dec := json.NewDecoder(bytes.NewReader(data))
		dec.UseNumber()
		if dec.Decode(&want) != nil || bytes.Contains(data, []byte(`\ud`)) || bytes.Contains(data, []byte(`\uD`)) {
			return nil
		}
		got, perr := ParseJSON(data)
		if perr != nil {
			if errors.Is(perr, ErrDuplicateKey) {
				return nil
			}
			t.Errorf("%s: %v", path, perr)
			return nil
		}
		if !reflect.DeepEqual(got, want) {
			t.Errorf("%s: tree differs from encoding/json", path)
		}
		n++
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if n < 500 {
		t.Errorf("only %d vector files compared", n)
	}
}

func TestPublicKeyDefensiveCopy(t *testing.T) {
	priv, _ := testKey(t, 4)
	env := signed(t, priv, `{"k":1}`)
	raw := append([]byte(nil), priv.Public().(ed25519.PublicKey)...)
	before := append([]byte(nil), raw...)
	expect(t, "raw key", VerifyEnvelopeSignatureEd25519(env, raw, nil), `{"verified":true}`)
	if !bytes.Equal(raw, before) {
		t.Error("caller's key slice was modified")
	}
}

func TestLoneSurrogateSignatureReason(t *testing.T) {
	priv, pub := testKey(t, 5)
	env := signed(t, priv, `{"k":1}`)
	env["note"] = mustParse(t, `"x\ud800"`)
	expect(t, "lone surrogate", VerifyEnvelopeSignatureEd25519(env, pub, nil), `{"verified":false,"reason":"canonical_nfc_failed"}`)
}
