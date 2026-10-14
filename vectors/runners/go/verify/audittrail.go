package verify

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"regexp"
	"strings"
)

// Mirrors src/commons/audit-trail-hash.ts. Input grammars are ASCII-only,
// so byte length equals the JS UTF-16 length for every accepted input.
const maxSegmentLength = 256

var (
	schemaIDRe        = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9._:-]*$`)
	contractVersionRe = regexp.MustCompile(`^[0-9][a-zA-Z0-9._+-]*$`)
	segmentStripRe    = regexp.MustCompile(`[^a-z0-9_-]`)
)

func sanitizeSegment(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, ":", "")
	s = strings.NewReplacer(".", "-", "+", "-").Replace(s)
	return segmentStripRe.ReplaceAllString(s, "")
}

// BuildDomainTag mirrors buildDomainTag.
func BuildDomainTag(schemaID, contractVersion string) (string, error) {
	if len(schemaID) == 0 || len(schemaID) > maxSegmentLength {
		return "", fmt.Errorf("schemaId length must be 1-%d (got %d)", maxSegmentLength, len(schemaID))
	}
	if !schemaIDRe.MatchString(schemaID) {
		return "", fmt.Errorf("schemaId must match %s", schemaIDRe)
	}
	if len(contractVersion) == 0 || len(contractVersion) > maxSegmentLength {
		return "", fmt.Errorf("contractVersion length must be 1-%d (got %d)", maxSegmentLength, len(contractVersion))
	}
	if !contractVersionRe.MatchString(contractVersion) {
		return "", fmt.Errorf("contractVersion must match %s", contractVersionRe)
	}
	return "loa-commons:audit:" + sanitizeSegment(schemaID) + ":" + sanitizeSegment(contractVersion), nil
}

// AuditEntryHashInput mirrors AuditEntryHashInput. ActorID and Payload
// are optional; HasPayload distinguishes an absent payload from a JSON
// null payload (absent is omitted from the hash input, null is not).
type AuditEntryHashInput struct {
	EntryID    string
	Timestamp  string
	EventType  string
	ActorID    *string
	Payload    any
	HasPayload bool
}

// ComputeAuditEntryHash mirrors computeAuditEntryHash:
// "sha256:" + hex(sha256(domainTag + JCS(content fields))). No NFC.
func ComputeAuditEntryHash(e AuditEntryHashInput, domainTag string) (string, error) {
	in := map[string]any{
		"entry_id":   e.EntryID,
		"timestamp":  e.Timestamp,
		"event_type": e.EventType,
	}
	if e.ActorID != nil {
		in["actor_id"] = *e.ActorID
	}
	if e.HasPayload {
		in["payload"] = e.Payload
	}
	canonical, err := CanonicalizeRaw(in)
	if err != nil {
		return "", fmt.Errorf("failed to canonicalize AuditEntry: %w", err)
	}
	sum := sha256.Sum256(append([]byte(domainTag), canonical...))
	return "sha256:" + hex.EncodeToString(sum[:]), nil
}

// AuditEntry is the subset of the AuditEntry schema the verifier reads.
type AuditEntry struct {
	AuditEntryHashInput
	EntryHash     string
	PreviousHash  string
	HashDomainTag string
}

// AuditTrail is the subset of the AuditTrail schema the verifier reads.
type AuditTrail struct {
	Entries     []AuditEntry
	GenesisHash string
}

// AuditTrailFromTree extracts an AuditTrail from a ParseJSON tree.
func AuditTrailFromTree(v any) (AuditTrail, error) {
	obj, ok := v.(map[string]any)
	if !ok {
		return AuditTrail{}, fmt.Errorf("trail is not an object")
	}
	var t AuditTrail
	var err error
	if t.GenesisHash, err = str(obj, "genesis_hash"); err != nil {
		return t, err
	}
	entries, ok := obj["entries"].([]any)
	if !ok {
		return t, fmt.Errorf("entries is not an array")
	}
	for i, raw := range entries {
		eo, ok := raw.(map[string]any)
		if !ok {
			return t, fmt.Errorf("entries[%d] is not an object", i)
		}
		var e AuditEntry
		for _, f := range []struct {
			name string
			dst  *string
		}{
			{"entry_id", &e.EntryID}, {"timestamp", &e.Timestamp}, {"event_type", &e.EventType},
			{"entry_hash", &e.EntryHash}, {"previous_hash", &e.PreviousHash}, {"hash_domain_tag", &e.HashDomainTag},
		} {
			if *f.dst, err = str(eo, f.name); err != nil {
				return t, fmt.Errorf("entries[%d]: %w", i, err)
			}
		}
		if a, present := eo["actor_id"]; present {
			s, ok := a.(string)
			if !ok {
				return t, fmt.Errorf("entries[%d]: actor_id is not a string", i)
			}
			e.ActorID = &s
		}
		e.Payload, e.HasPayload = eo["payload"]
		t.Entries = append(t.Entries, e)
	}
	return t, nil
}

func str(obj map[string]any, key string) (string, error) {
	s, ok := obj[key].(string)
	if !ok {
		return "", fmt.Errorf("%s is not a string", key)
	}
	return s, nil
}

// AuditTrailVerificationResult mirrors the TS result; absent fields are
// omitted from JSON exactly as in the TS object.
type AuditTrailVerificationResult struct {
	Valid        bool   `json:"valid"`
	FailurePhase string `json:"failure_phase,omitempty"`
	FailureIndex *int   `json:"failure_index,omitempty"`
	ExpectedHash string `json:"expected_hash,omitempty"`
	ActualHash   string `json:"actual_hash,omitempty"`
}

// VerifyAuditTrailIntegrity mirrors verifyAuditTrailIntegrity: per entry,
// phase 1 recomputes the content hash, phase 2 checks previous_hash
// linkage (entry 0 links to genesis_hash). First failure wins.
func VerifyAuditTrailIntegrity(t AuditTrail) (AuditTrailVerificationResult, error) {
	for i := range t.Entries {
		e := t.Entries[i]
		idx := i
		recomputed, err := ComputeAuditEntryHash(e.AuditEntryHashInput, e.HashDomainTag)
		if err != nil {
			return AuditTrailVerificationResult{}, err
		}
		if recomputed != e.EntryHash {
			return AuditTrailVerificationResult{Valid: false, FailurePhase: "content", FailureIndex: &idx,
				ExpectedHash: e.EntryHash, ActualHash: recomputed}, nil
		}
		expectedPrev := t.GenesisHash
		if i > 0 {
			expectedPrev = t.Entries[i-1].EntryHash
		}
		if e.PreviousHash != expectedPrev {
			return AuditTrailVerificationResult{Valid: false, FailurePhase: "chain", FailureIndex: &idx,
				ExpectedHash: expectedPrev, ActualHash: e.PreviousHash}, nil
		}
	}
	return AuditTrailVerificationResult{Valid: true}, nil
}
