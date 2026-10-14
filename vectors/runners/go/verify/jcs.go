// Package verify is the Go reference port of the hounfour verifier
// functions (FR-C2, SDD §5). It mirrors, byte for byte:
//
//   - safeCanonicalize (src/utilities/safe-canonicalize.ts): NFC on every
//     string and object key, RFC 8785 JCS, 100 KB canonical-size cap.
//   - buildDomainTag / computeAuditEntryHash / verifyAuditTrailIntegrity
//     (src/commons/audit-trail-hash.ts).
//   - verifyEnvelopeSignatureEd25519 and lookupRevocation
//     (src/integrity/verify.ts).
//
// The language-neutral conformance suite under vectors/verifier/ is the
// contract; vectors_test.go runs it, and cmd/verifier-runner emits the
// manifest that scripts/run-verifier-parity.sh diffs against the TS
// reference.
//
// Shape, not authority (ADR-010): the package does not resolve public
// keys from identifiers and does not evaluate signer competence or quorum
// policy.
package verify

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"

	"github.com/gowebpki/jcs"
	"golang.org/x/text/unicode/norm"
)

// SafeCanonicalizeDefaultMaxBytes mirrors SAFE_CANONICALIZE_DEFAULT_MAX_BYTES.
const SafeCanonicalizeDefaultMaxBytes = 100_000

var (
	// ErrCanonicalSizeCap mirrors CanonicalizeSizeError.
	ErrCanonicalSizeCap = errors.New("canonical_size_cap_exceeded")
	// ErrCanonicalKeyCollision mirrors CanonicalizeKeyCollisionError.
	ErrCanonicalKeyCollision = errors.New("canonical_key_collision")
	// ErrDuplicateKey reports a JSON object with a repeated member name.
	ErrDuplicateKey = errors.New("duplicate_object_key")
)

// ParseJSON decodes one JSON value into a tree of map[string]any, []any,
// string, json.Number, bool and nil. Unlike encoding/json it rejects
// duplicate object keys (RFC 8785 §3.2.3; last-key-wins parsers would
// let two runtimes disagree on the same bytes) and trailing data.
func ParseJSON(data []byte) (any, error) {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.UseNumber()
	v, err := parseValue(dec)
	if err != nil {
		return nil, err
	}
	if _, err := dec.Token(); err != io.EOF {
		return nil, fmt.Errorf("trailing data after JSON value")
	}
	return v, nil
}

func parseValue(dec *json.Decoder) (any, error) {
	tok, err := dec.Token()
	if err != nil {
		return nil, err
	}
	switch t := tok.(type) {
	case json.Delim:
		switch t {
		case '{':
			obj := map[string]any{}
			for dec.More() {
				kt, err := dec.Token()
				if err != nil {
					return nil, err
				}
				k, ok := kt.(string)
				if !ok {
					return nil, fmt.Errorf("object key is not a string")
				}
				if _, dup := obj[k]; dup {
					return nil, fmt.Errorf("%w: %q", ErrDuplicateKey, k)
				}
				v, err := parseValue(dec)
				if err != nil {
					return nil, err
				}
				obj[k] = v
			}
			if _, err := dec.Token(); err != nil { // '}'
				return nil, err
			}
			return obj, nil
		case '[':
			arr := []any{}
			for dec.More() {
				v, err := parseValue(dec)
				if err != nil {
					return nil, err
				}
				arr = append(arr, v)
			}
			if _, err := dec.Token(); err != nil { // ']'
				return nil, err
			}
			return arr, nil
		}
		return nil, fmt.Errorf("unexpected delimiter %v", t)
	default:
		return t, nil // string, json.Number, bool, nil
	}
}

// nfcTree returns a copy of v with every string value and object key
// NFC-normalised, failing on keys that fold to the same NFC form.
func nfcTree(v any) (any, error) {
	switch t := v.(type) {
	case string:
		return norm.NFC.String(t), nil
	case []any:
		out := make([]any, len(t))
		for i, e := range t {
			n, err := nfcTree(e)
			if err != nil {
				return nil, err
			}
			out[i] = n
		}
		return out, nil
	case map[string]any:
		out := make(map[string]any, len(t))
		for k, e := range t {
			nk := norm.NFC.String(k)
			if _, seen := out[nk]; seen {
				return nil, fmt.Errorf("%w on %q", ErrCanonicalKeyCollision, nk)
			}
			n, err := nfcTree(e)
			if err != nil {
				return nil, err
			}
			out[nk] = n
		}
		return out, nil
	default:
		return v, nil
	}
}

// CanonicalizeRaw is RFC 8785 JCS with no NFC step and no size cap. It
// mirrors the direct `canonicalize` call used by the pre-v8.5.0 audit
// entry hash domain (hashing-spec-freeze-v8.5.md §8).
func CanonicalizeRaw(v any) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return jcs.Transform(bytes.TrimRight(buf.Bytes(), "\n"))
}

// SafeCanonicalize mirrors safeCanonicalize: NFC-normalise every string
// and key, RFC 8785 canonicalise, then enforce the 100 KB cap on the
// canonical UTF-8 length.
func SafeCanonicalize(v any) ([]byte, error) {
	return SafeCanonicalizeMax(v, SafeCanonicalizeDefaultMaxBytes)
}

// SafeCanonicalizeMax is SafeCanonicalize with an explicit byte cap.
func SafeCanonicalizeMax(v any, maxBytes int) ([]byte, error) {
	n, err := nfcTree(v)
	if err != nil {
		return nil, err
	}
	out, err := CanonicalizeRaw(n)
	if err != nil {
		return nil, err
	}
	if len(out) > maxBytes {
		return nil, fmt.Errorf("%w: %d > %d bytes", ErrCanonicalSizeCap, len(out), maxBytes)
	}
	return out, nil
}
