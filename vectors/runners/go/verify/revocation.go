package verify

import (
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

// RevocationLookupResult mirrors the TS RevocationLookupResult.
type RevocationLookupResult struct {
	Revoked            bool   `json:"revoked"`
	RevokedAt          string `json:"revoked_at,omitempty"`
	ListID             string `json:"list_id,omitempty"`
	Reason             string `json:"reason,omitempty"`
	ListValid          bool   `json:"list_valid"`
	ListValidityReason string `json:"list_validity_reason,omitempty"`
	// Error is "at_invalid" when no lookup was performed; check it first.
	Error string `json:"error,omitempty"`
}

// LoadRevocationListSchema compiles the generated JSON Schema
// (schemas/revocation-list.schema.json). Shape validation uses the same
// artifact every runtime consumes, so the port cannot drift from the
// TypeBox source.
func LoadRevocationListSchema(path string) (*jsonschema.Schema, error) {
	return jsonschema.NewCompiler().Compile(path)
}

var isoUTCRe = regexp.MustCompile(`^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$`)

// normalizeUTC mirrors the TS helper: fixed-width nanosecond form so
// instants compare correctly as strings.
func normalizeUTC(ts string) (string, bool) {
	m := isoUTCRe.FindStringSubmatch(ts)
	if m == nil {
		return "", false
	}
	return m[1] + "." + m[2] + strings.Repeat("0", 9-len(m[2])) + "Z", true
}

// LookupRevocationAt mirrors lookupRevocation called with a string `at`:
// at must match the strict ISO 8601 UTC form (checked textually), else
// the at_invalid result is returned. Nanosecond resolution.
func LookupRevocationAt(lists []any, signerKeyID string, at string, shape *jsonschema.Schema) RevocationLookupResult {
	atNorm, ok := normalizeUTC(at)
	if !ok {
		return atInvalid()
	}
	return lookupNormalized(lists, signerKeyID, atNorm, shape)
}

func atInvalid() RevocationLookupResult {
	return RevocationLookupResult{Revoked: false, ListValid: false, ListValidityReason: "at_invalid", Error: "at_invalid"}
}

// LookupRevocation mirrors lookupRevocation called with a Date: lists failing shape
// validation are ignored and reported; a list is applicable when
// valid_from <= at < valid_until (null = open); the key is revoked when
// an applicable list has key_id == signerKeyID with revoked_at <= at;
// applicable lists rank by issued_at descending, ties in input order.
// lists are ParseJSON trees. at is compared at nanosecond resolution.
func LookupRevocation(lists []any, signerKeyID string, at time.Time, shape *jsonschema.Schema) RevocationLookupResult {
	u := at.UTC()
	if u.Year() < 0 || u.Year() > 9999 {
		return atInvalid()
	}
	return lookupNormalized(lists, signerKeyID, u.Format("2006-01-02T15:04:05.000000000Z"), shape)
}

// timestampsNormalize reports whether every timestamp the lookup reads
// normalises. The schema pattern already guarantees this, so it is a
// defence in depth: a failure is treated as shape-invalid, as in TS.
func timestampsNormalize(obj map[string]any) bool {
	for _, f := range []string{"valid_from", "issued_at"} {
		s, ok := obj[f].(string)
		if _, norm := normalizeUTC(s); !ok || !norm {
			return false
		}
	}
	if u, present := obj["valid_until"]; present && u != nil {
		s, ok := u.(string)
		if _, norm := normalizeUTC(s); !ok || !norm {
			return false
		}
	}
	entries, ok := obj["revoked_keys"].([]any)
	if !ok {
		return false
	}
	for _, raw := range entries {
		e, ok := raw.(map[string]any)
		if !ok {
			return false
		}
		s, ok := e["revoked_at"].(string)
		if _, norm := normalizeUTC(s); !ok || !norm {
			return false
		}
	}
	return true
}

type revEntry struct {
	keyID, revokedAt, revokedAtNorm, reason string
}

type revList struct {
	listID, from, until, issued string
	entries                     []revEntry
}

// extractList validates one list and extracts the fields the lookup
// reads. Any failure, including a panic from a hostile dynamic value,
// makes the list shape-invalid, so later steps only touch typed data.
func extractList(raw any, shape *jsonschema.Schema) (l revList, ok bool) {
	defer func() {
		if recover() != nil {
			ok = false
		}
	}()
	obj, isObj := raw.(map[string]any)
	if !isObj || shape.Validate(raw) != nil || !timestampsNormalize(obj) {
		return revList{}, false
	}
	l.listID = obj["list_id"].(string)
	l.from, _ = normalizeUTC(obj["valid_from"].(string))
	l.issued, _ = normalizeUTC(obj["issued_at"].(string))
	if s, isStr := obj["valid_until"].(string); isStr {
		l.until, _ = normalizeUTC(s)
	}
	for _, rawEntry := range obj["revoked_keys"].([]any) {
		e := rawEntry.(map[string]any)
		ra := e["revoked_at"].(string)
		rn, _ := normalizeUTC(ra)
		l.entries = append(l.entries, revEntry{e["key_id"].(string), ra, rn, e["reason"].(string)})
	}
	return l, true
}

func lookupNormalized(lists []any, signerKeyID string, atNorm string, shape *jsonschema.Schema) RevocationLookupResult {
	var invalid []string
	var applicable []revList
	for i, raw := range lists {
		l, ok := extractList(raw, shape)
		if !ok {
			invalid = append(invalid, fmt.Sprintf("lists[%d]", i))
			continue
		}
		if l.from <= atNorm && (l.until == "" || atNorm < l.until) {
			applicable = append(applicable, l)
		}
	}
	sort.SliceStable(applicable, func(a, b int) bool { return applicable[a].issued > applicable[b].issued })

	res := RevocationLookupResult{ListValid: len(invalid) == 0}
	if !res.ListValid {
		res.ListValidityReason = "shape_invalid: " + strings.Join(invalid, ", ")
	}
	for _, l := range applicable {
		for _, e := range l.entries {
			if e.keyID == signerKeyID && e.revokedAtNorm <= atNorm {
				res.Revoked = true
				res.RevokedAt = e.revokedAt
				res.ListID = l.listID
				res.Reason = e.reason
				return res
			}
		}
	}
	if len(applicable) > 0 {
		res.ListID = applicable[0].listID
	}
	return res
}
