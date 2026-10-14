package verify

import "testing"

// Expected values were produced by the TS reference (buildDomainTag /
// computeAuditEntryHash in src/commons/audit-trail-hash.ts).
func TestBuildDomainTagMatchesTS(t *testing.T) {
	for _, c := range [][3]string{
		{"GovernedCredits", "8.3.0", "loa-commons:audit:governedcredits:8-3-0"},
		{"test-store", "8.0.0+build1", "loa-commons:audit:test-store:8-0-0-build1"},
		{"a:b.C", "1.2.3-rc.1", "loa-commons:audit:ab-c:1-2-3-rc-1"},
		{"X", "9", "loa-commons:audit:x:9"},
	} {
		got, err := BuildDomainTag(c[0], c[1])
		if err != nil || got != c[2] {
			t.Errorf("BuildDomainTag(%q,%q) = %q, %v; want %q", c[0], c[1], got, err, c[2])
		}
	}
	long := make([]byte, 257)
	for i := range long {
		long[i] = 'a'
	}
	for _, c := range [][2]string{{"", "1"}, {"1abc", "1"}, {"ok", "v1"}, {"ok", "1 2"}, {string(long), "1"}, {"ok", ""}} {
		if _, err := BuildDomainTag(c[0], c[1]); err == nil {
			t.Errorf("BuildDomainTag(%q,%q) accepted", c[0], c[1])
		}
	}
}

func TestComputeAuditEntryHashAbsentVsNull(t *testing.T) {
	base := AuditEntryHashInput{EntryID: "e", Timestamp: "t", EventType: "a.b.c"}
	absent, err := ComputeAuditEntryHash(base, "tag")
	if err != nil || absent != "sha256:888bddfccb1fb4193d16af25b95f5a7575aa613c96164466197288e1657d508a" {
		t.Errorf("absent payload hash %s (%v)", absent, err)
	}
	withNull := base
	withNull.HasPayload = true
	null, err := ComputeAuditEntryHash(withNull, "tag")
	if err != nil || null != "sha256:f1e91eb15f1d065e42d3ff66dd7f7035c0c9b9c9d18de84565262dcb87c4ef57" {
		t.Errorf("null payload hash %s (%v)", null, err)
	}
}

func TestAuditTrailFromTreeRejectsMalformed(t *testing.T) {
	for _, s := range []string{
		`[]`,
		`{"entries":[]}`,
		`{"genesis_hash":"g","entries":{}}`,
		`{"genesis_hash":"g","entries":[1]}`,
		`{"genesis_hash":"g","entries":[{"entry_id":"e"}]}`,
		`{"genesis_hash":"g","entries":[{"entry_id":"e","timestamp":"t","event_type":"x","entry_hash":"h","previous_hash":"p","hash_domain_tag":"d","actor_id":5}]}`,
	} {
		if _, err := AuditTrailFromTree(mustParse(t, s)); err == nil {
			t.Errorf("accepted %s", s)
		}
	}
}
