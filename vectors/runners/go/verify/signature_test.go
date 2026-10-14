package verify

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"strings"
	"testing"
)

func testKey(t *testing.T, seedByte byte) (ed25519.PrivateKey, string) {
	t.Helper()
	seed := make([]byte, ed25519.SeedSize)
	for i := range seed {
		seed[i] = seedByte
	}
	priv := ed25519.NewKeyFromSeed(seed)
	return priv, pubkeyPrefix + base64.RawURLEncoding.EncodeToString(priv.Public().(ed25519.PublicKey))
}

func signed(t *testing.T, priv ed25519.PrivateKey, unsignedJSON string) map[string]any {
	t.Helper()
	env := mustParse(t, unsignedJSON).(map[string]any)
	msg, err := SafeCanonicalize(env)
	if err != nil {
		t.Fatal(err)
	}
	env["signature"] = signaturePrefix + base64.RawURLEncoding.EncodeToString(ed25519.Sign(priv, msg))
	return env
}

func expect(t *testing.T, name string, got Ed25519VerifyResult, want string) {
	t.Helper()
	b, _ := json.Marshal(got)
	if string(b) != want {
		t.Errorf("%s: got %s want %s", name, b, want)
	}
}

func TestVerifyEnvelopeBranches(t *testing.T) {
	priv, pub := testKey(t, 1)
	_, otherPub := testKey(t, 2)
	env := signed(t, priv, `{"kind":"x","body":{"s":"cafe\u0301"}}`)
	fake := signaturePrefix + strings.Repeat("A", 86)

	expect(t, "valid string key", VerifyEnvelopeSignatureEd25519(env, pub, nil), `{"verified":true}`)
	expect(t, "valid raw key", VerifyEnvelopeSignatureEd25519(env, []byte(priv.Public().(ed25519.PublicKey)), nil), `{"verified":true}`)
	expect(t, "valid ed25519.PublicKey", VerifyEnvelopeSignatureEd25519(env, priv.Public().(ed25519.PublicKey), nil), `{"verified":true}`)
	expect(t, "wrong key", VerifyEnvelopeSignatureEd25519(env, otherPub, nil), `{"verified":false,"reason":"signature_mismatch"}`)
	expect(t, "not object", VerifyEnvelopeSignatureEd25519([]any{}, pub, nil), `{"verified":false,"reason":"envelope_not_object"}`)
	expect(t, "missing", VerifyEnvelopeSignatureEd25519(map[string]any{"a": "b"}, pub, nil), `{"verified":"unverifiable","reason":"signature_missing"}`)
	expect(t, "nil value", VerifyEnvelopeSignatureEd25519(map[string]any{"signature": nil}, pub, nil), `{"verified":"unverifiable","reason":"signature_missing"}`)
	for _, bad := range []any{json.Number("5"), true, []any{}, "ed448:" + strings.Repeat("A", 86), "ed25519:AAAA",
		signaturePrefix + strings.Repeat("A", 85) + "B", signaturePrefix + strings.Repeat("+", 86),
		signaturePrefix + strings.Repeat("A", 40) + "\n" + strings.Repeat("A", 45)} {
		expect(t, "malformed sig", VerifyEnvelopeSignatureEd25519(map[string]any{"signature": bad}, pub, nil), `{"verified":false,"reason":"signature_malformed"}`)
	}
	for _, bad := range []any{strings.TrimPrefix(pub, pubkeyPrefix), pubkeyPrefix + "AAAA", pubkeyPrefix + strings.Repeat("A", 42) + "B", make([]byte, 31), 7} {
		expect(t, "malformed key", VerifyEnvelopeSignatureEd25519(map[string]any{"signature": fake}, bad, nil), `{"verified":false,"reason":"public_key_malformed"}`)
	}
	big := map[string]any{"signature": fake, "s": strings.Repeat("x", SafeCanonicalizeDefaultMaxBytes)}
	expect(t, "cap", VerifyEnvelopeSignatureEd25519(big, pub, nil), `{"verified":false,"reason":"canonical_size_cap_exceeded"}`)
	coll := mustParse(t, `{"caf\u00e9":1,"cafe\u0301":2,"signature":"`+fake+`"}`)
	expect(t, "collision", VerifyEnvelopeSignatureEd25519(coll, pub, nil), `{"verified":false,"reason":"canonical_key_collision"}`)
	expect(t, "unencodable", VerifyEnvelopeSignatureEd25519(map[string]any{"signature": fake, "c": make(chan int)}, pub, nil), `{"verified":false,"reason":"canonicalization_failed"}`)

	// Default omission covers quorum_signatures; signature field always omitted.
	env["quorum_signatures"] = []any{"anything"}
	expect(t, "quorum omitted", VerifyEnvelopeSignatureEd25519(env, pub, nil), `{"verified":true}`)
	expect(t, "explicit empty omit", VerifyEnvelopeSignatureEd25519(env, pub, &VerifyOptions{OmitFields: []string{}}), `{"verified":false,"reason":"signature_mismatch"}`)
	env["sig2"] = env["signature"]
	delete(env, "signature")
	expect(t, "custom field", VerifyEnvelopeSignatureEd25519(env, pub, &VerifyOptions{SignatureField: strPtr("sig2"), OmitFields: []string{"quorum_signatures"}}), `{"verified":true}`)
}

func strPtr(s string) *string { return &s }

func TestVerifyOptionsValidatedInCore(t *testing.T) {
	priv, pub := testKey(t, 3)
	env := signed(t, priv, `{"kind":"x"}`)
	expect(t, "empty signature field", VerifyEnvelopeSignatureEd25519(env, pub, &VerifyOptions{SignatureField: strPtr("")}), `{"verified":false,"reason":"options_invalid"}`)
	expect(t, "envelope check first", VerifyEnvelopeSignatureEd25519("x", pub, &VerifyOptions{SignatureField: strPtr("")}), `{"verified":false,"reason":"envelope_not_object"}`)
	expect(t, "nil field means default", VerifyEnvelopeSignatureEd25519(env, pub, &VerifyOptions{}), `{"verified":true}`)
	o, ok := OptionsFromTree(mustParse(t, `{"signatureField":""}`))
	if !ok {
		t.Fatal("tree layer should pass an empty string through to the core check")
	}
	expect(t, "tree empty field", VerifyEnvelopeSignatureEd25519(env, pub, o), `{"verified":false,"reason":"options_invalid"}`)
}

func TestOptionsFromTree(t *testing.T) {
	if o, ok := OptionsFromTree(nil); !ok || o != nil {
		t.Error("nil options")
	}
	for _, s := range []string{`5`, `{"signatureField":1}`, `{"omitFields":"x"}`, `{"omitFields":[1]}`} {
		if _, ok := OptionsFromTree(mustParse(t, s)); ok {
			t.Errorf("accepted %s", s)
		}
	}
	o, ok := OptionsFromTree(mustParse(t, `{"omitFields":[]}`))
	if !ok || o.OmitFields == nil || len(o.OmitFields) != 0 {
		t.Error("explicit empty omitFields must stay non-nil")
	}
}
