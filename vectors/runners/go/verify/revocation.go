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

// LookupRevocation mirrors lookupRevocation: lists failing shape
// validation are ignored and reported; a list is applicable when
// valid_from <= at < valid_until (null = open); the key is revoked when
// an applicable list has key_id == signerKeyID with revoked_at <= at;
// applicable lists rank by issued_at descending, ties in input order.
// lists are ParseJSON trees. at is compared at nanosecond resolution.
func LookupRevocation(lists []any, signerKeyID string, at time.Time, shape *jsonschema.Schema) RevocationLookupResult {
	atNorm := at.UTC().Format("2006-01-02T15:04:05.000000000Z")
	type app struct {
		list   map[string]any
		issued string
	}
	var invalid []string
	var applicable []app
	for i, raw := range lists {
		obj, ok := raw.(map[string]any)
		if !ok || shape.Validate(raw) != nil {
			invalid = append(invalid, fmt.Sprintf("lists[%d]", i))
			continue
		}
		from, _ := normalizeUTC(obj["valid_from"].(string))
		issued, _ := normalizeUTC(obj["issued_at"].(string))
		until := ""
		if s, ok := obj["valid_until"].(string); ok {
			until, _ = normalizeUTC(s)
		}
		if from <= atNorm && (until == "" || atNorm < until) {
			applicable = append(applicable, app{obj, issued})
		}
	}
	sort.SliceStable(applicable, func(a, b int) bool { return applicable[a].issued > applicable[b].issued })

	res := RevocationLookupResult{ListValid: len(invalid) == 0}
	if !res.ListValid {
		res.ListValidityReason = "shape_invalid: " + strings.Join(invalid, ", ")
	}
	for _, a := range applicable {
		for _, rawEntry := range a.list["revoked_keys"].([]any) {
			e := rawEntry.(map[string]any)
			if e["key_id"].(string) != signerKeyID {
				continue
			}
			revokedAt, _ := normalizeUTC(e["revoked_at"].(string))
			if revokedAt <= atNorm {
				res.Revoked = true
				res.RevokedAt = e["revoked_at"].(string)
				res.ListID = a.list["list_id"].(string)
				res.Reason = e["reason"].(string)
				return res
			}
		}
	}
	if len(applicable) > 0 {
		res.ListID = applicable[0].list["list_id"].(string)
	}
	return res
}
