package verify

import (
	"encoding/json"
	"strings"
	"testing"
)

// panicky is a dynamic value no JSON parser produces; its MarshalJSON
// panics, standing in for any hostile value a Go caller might embed.
type panicky struct{}

func (panicky) MarshalJSON() ([]byte, error) { panic("hostile marshaler") }

func TestVerifyEnvelopeRecoversPanics(t *testing.T) {
	_, pub := testKey(t, 6)
	fake := signaturePrefix + strings.Repeat("A", 86)
	env := map[string]any{"signature": fake, "body": map[string]any{"list": []any{panicky{}}}}
	expect(t, "panicking marshaler", VerifyEnvelopeSignatureEd25519(env, pub, nil), `{"verified":false,"reason":"verification_error"}`)
}

func TestCyclicAndDeepTreesFailCleanly(t *testing.T) {
	_, pub := testKey(t, 7)
	fake := signaturePrefix + strings.Repeat("A", 86)
	cyc := map[string]any{"signature": fake}
	inner := map[string]any{}
	inner["self"] = inner // cycle: unbounded recursion would be a fatal stack overflow
	cyc["loop"] = inner
	expect(t, "cycle", VerifyEnvelopeSignatureEd25519(cyc, pub, nil), `{"verified":false,"reason":"canonicalization_failed"}`)
	arr := []any{}
	var deep any = arr
	for i := 0; i < MaxTreeDepth+5; i++ {
		deep = []any{deep}
	}
	if _, err := CanonicalizeRaw(deep); err != ErrTreeTooDeep {
		t.Errorf("CanonicalizeRaw deep: %v", err)
	}
	if _, err := SafeCanonicalize(deep); err != ErrTreeTooDeep {
		t.Errorf("SafeCanonicalize deep: %v", err)
	}
}

func TestLookupRevocationHostileListIsShapeInvalid(t *testing.T) {
	l1 := rl(t, "l1", "2026-09-01T00:00:00Z", "", "2026-08-15T00:00:00Z")
	hostile := map[string]any{"list_id": panicky{}, "revoked_keys": []any{map[string]any{"key_id": func() {}}}}
	got := lookup(t, []any{hostile, l1}, keyX, "2026-10-01T00:00:00Z")
	var r RevocationLookupResult
	if err := json.Unmarshal([]byte(got), &r); err != nil {
		t.Fatal(err)
	}
	if !r.Revoked || r.ListID != "l1" || r.ListValid || r.ListValidityReason != "shape_invalid: lists[0]" {
		t.Errorf("got %s", got)
	}
}
