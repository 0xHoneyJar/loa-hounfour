package verify

import (
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

const (
	keyX   = "ed25519-pub:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXA"
	keyY   = "ed25519-pub:YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYA"
	signer = "ed25519-pub:SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSA"
)

func rl(t *testing.T, listID, issuedAt, validUntil, revokedAt string) any {
	t.Helper()
	until := "null"
	if validUntil != "" {
		until = `"` + validUntil + `"`
	}
	revoked := "[]"
	if revokedAt != "" {
		revoked = `[{"key_id":"` + keyX + `","reason":"compromise","revoked_at":"` + revokedAt + `","revocation_evidence_hash":null}]`
	}
	return mustParse(t, `{"envelope_kind":"revocation_list","contract_version":"8.7.0","cluster_id":"c","list_id":"`+listID+
		`","issued_at":"`+issuedAt+`","valid_from":"2026-08-01T00:00:00Z","valid_until":`+until+
		`,"max_staleness_seconds":null,"nonce":1,"prev_envelope_hash":null,"next_page_hash":null,"revoked_keys":`+revoked+
		`,"signer_key_id":"`+signer+`","signature":"ed25519:`+strings.Repeat("A", 86)+`","quorum_signatures":null,"root_of_trust_id":null}`)
}

func lookup(t *testing.T, lists []any, key, at string) string {
	t.Helper()
	shape, err := LoadRevocationListSchema(filepath.Join(repoRoot(t), "schemas", "revocation-list.schema.json"))
	if err != nil {
		t.Fatal(err)
	}
	ts, err := time.Parse(time.RFC3339Nano, at)
	if err != nil {
		t.Fatal(err)
	}
	b, _ := json.Marshal(LookupRevocation(lists, key, ts, shape))
	return string(b)
}

func TestLookupRevocationBranches(t *testing.T) {
	at := "2026-10-01T00:00:00Z"
	l1 := rl(t, "l1", "2026-09-01T00:00:00Z", "", "2026-08-15T00:00:00Z")
	for _, c := range []struct {
		name  string
		lists []any
		key   string
		at    string
		want  string
	}{
		{"revoked", []any{l1}, keyX, at, `{"revoked":true,"revoked_at":"2026-08-15T00:00:00Z","list_id":"l1","reason":"compromise","list_valid":true}`},
		{"other key", []any{l1}, keyY, at, `{"revoked":false,"list_id":"l1","list_valid":true}`},
		{"empty", []any{}, keyX, at, `{"revoked":false,"list_valid":true}`},
		{"from inclusive", []any{l1}, keyY, "2026-08-01T00:00:00Z", `{"revoked":false,"list_id":"l1","list_valid":true}`},
		{"before from", []any{l1}, keyY, "2026-07-31T23:59:59.999Z", `{"revoked":false,"list_valid":true}`},
		{"until exclusive", []any{rl(t, "b", "2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z", "2026-08-15T00:00:00Z")}, keyX, at, `{"revoked":false,"list_valid":true}`},
		{"revoked_at inclusive", []any{rl(t, "f", "2026-09-01T00:00:00Z", "", "2026-08-15T00:00:00.001Z")}, keyX, "2026-08-15T00:00:00.001Z", `{"revoked":true,"revoked_at":"2026-08-15T00:00:00.001Z","list_id":"f","reason":"compromise","list_valid":true}`},
		{"nanosecond after", []any{rl(t, "n", "2026-09-01T00:00:00Z", "", "2026-08-15T00:00:00.000000001Z")}, keyX, "2026-08-15T00:00:00Z", `{"revoked":false,"list_id":"n","list_valid":true}`},
		{"ties keep order", []any{rl(t, "first", "2026-09-01T00:00:00Z", "", ""), rl(t, "second", "2026-09-01T00:00:00Z", "", "")}, keyX, at, `{"revoked":false,"list_id":"first","list_valid":true}`},
		{"falls through to older", []any{l1, rl(t, "newer", "2026-09-10T00:00:00Z", "", "")}, keyX, at, `{"revoked":true,"revoked_at":"2026-08-15T00:00:00Z","list_id":"l1","reason":"compromise","list_valid":true}`},
		{"invalid lists reported", []any{mustParse(t, `{"list_id":"x"}`), l1, "nope"}, keyX, at, `{"revoked":true,"revoked_at":"2026-08-15T00:00:00Z","list_id":"l1","reason":"compromise","list_valid":false,"list_validity_reason":"shape_invalid: lists[0], lists[2]"}`},
	} {
		if got := lookup(t, c.lists, c.key, c.at); got != c.want {
			t.Errorf("%s:\n got %s\nwant %s", c.name, got, c.want)
		}
	}
}
