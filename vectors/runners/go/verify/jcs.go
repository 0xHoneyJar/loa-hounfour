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
	"regexp"
	"unicode/utf16"
	"unicode/utf8"

	"github.com/gowebpki/jcs"
	"golang.org/x/text/unicode/norm"
)

// MaxTreeDepth bounds recursion over value trees. A tree within the
// 100 KB cap cannot legitimately nest deeper (each level costs at least
// two bytes), so the bound only rejects cycles and pathological input.
const MaxTreeDepth = 50_000

// SafeCanonicalizeDefaultMaxBytes mirrors SAFE_CANONICALIZE_DEFAULT_MAX_BYTES.
const SafeCanonicalizeDefaultMaxBytes = 100_000

var (
	// ErrCanonicalSizeCap mirrors CanonicalizeSizeError.
	ErrCanonicalSizeCap = errors.New("canonical_size_cap_exceeded")
	// ErrCanonicalKeyCollision mirrors CanonicalizeKeyCollisionError.
	ErrCanonicalKeyCollision = errors.New("canonical_key_collision")
	// ErrDuplicateKey reports a JSON object with a repeated member name.
	ErrDuplicateKey = errors.New("duplicate_object_key")
	// ErrCanonicalNFC mirrors CanonicalizeNFCError's reason code: a string
	// or key is not well-formed Unicode (an unpaired surrogate), so it has
	// no NFC form and no UTF-8 encoding. Reported as canonical_nfc_failed.
	ErrCanonicalNFC = errors.New("canonical_nfc_failed")
	// ErrTreeTooDeep reports nesting beyond MaxTreeDepth (or a cycle).
	// Reported as canonicalization_failed, like a JS cycle's RangeError.
	ErrTreeTooDeep = errors.New("tree_too_deep")
)

// ParseJSON decodes one JSON value into a tree of map[string]any, []any,
// string, json.Number, bool and nil, matching what a JS runtime sees after
// reading the bytes as UTF-8 and calling JSON.parse:
//
//   - Invalid UTF-8 bytes become U+FFFD per the WHATWG "maximal subpart"
//     rule, exactly as Node's UTF-8 decoder does (decodeUTF8Lossy).
//   - A \u escape for an unpaired surrogate is kept, encoded as its
//     3-byte WTF-8 form. The resulting Go string is not valid UTF-8, which
//     SafeCanonicalize and CanonicalizeRaw reject. encoding/json would
//     instead substitute U+FFFD silently and diverge from the TS bytes.
//
// It also rejects duplicate object keys (RFC 8785 §3.2.3; last-key-wins
// parsers would let two runtimes disagree on the same bytes) and trailing
// data.
func ParseJSON(data []byte) (any, error) {
	p := &jsonParser{data: decodeUTF8Lossy(data)}
	p.skipWS()
	v, err := p.value()
	if err != nil {
		return nil, err
	}
	p.skipWS()
	if p.pos != len(p.data) {
		return nil, fmt.Errorf("trailing data after JSON value at offset %d", p.pos)
	}
	return v, nil
}

// decodeUTF8Lossy replaces each maximal ill-formed subpart with U+FFFD
// (WHATWG Encoding "UTF-8 decode", the behaviour of Node's decoder).
func decodeUTF8Lossy(b []byte) []byte {
	if utf8.Valid(b) {
		return b
	}
	out := make([]byte, 0, len(b)+8)
	for i := 0; i < len(b); {
		c := b[i]
		if c < 0x80 {
			out = append(out, c)
			i++
			continue
		}
		need, lo, hi := 0, byte(0x80), byte(0xBF)
		switch {
		case c >= 0xC2 && c <= 0xDF:
			need = 1
		case c == 0xE0:
			need, lo = 2, 0xA0
		case c == 0xED:
			need, hi = 2, 0x9F
		case c >= 0xE1 && c <= 0xEF:
			need = 2
		case c == 0xF0:
			need, lo = 3, 0x90
		case c == 0xF4:
			need, hi = 3, 0x8F
		case c >= 0xF1 && c <= 0xF3:
			need = 3
		}
		j := i + 1
		for k := 0; k < need && j < len(b); k++ {
			if b[j] < lo || b[j] > hi {
				break
			}
			lo, hi = 0x80, 0xBF
			j++
		}
		if need > 0 && j-i == need+1 {
			out = append(out, b[i:j]...)
		} else {
			out = append(out, "\uFFFD"...)
		}
		i = j
	}
	return out
}

type jsonParser struct {
	data []byte
	pos  int
}

var jsonNumberRe = regexp.MustCompile(`^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?`)

func (p *jsonParser) skipWS() {
	for p.pos < len(p.data) {
		switch p.data[p.pos] {
		case ' ', '\t', '\n', '\r':
			p.pos++
		default:
			return
		}
	}
}

func (p *jsonParser) errf(format string, a ...any) error {
	return fmt.Errorf("json offset %d: %s", p.pos, fmt.Sprintf(format, a...))
}

func (p *jsonParser) value() (any, error) {
	if p.pos >= len(p.data) {
		return nil, p.errf("unexpected end of input")
	}
	switch c := p.data[p.pos]; {
	case c == '{':
		return p.object()
	case c == '[':
		return p.array()
	case c == '"':
		return p.str()
	case c == '-' || (c >= '0' && c <= '9'):
		m := jsonNumberRe.Find(p.data[p.pos:])
		if m == nil {
			return nil, p.errf("invalid number")
		}
		p.pos += len(m)
		return json.Number(m), nil
	}
	for lit, v := range map[string]any{"true": true, "false": false, "null": nil} {
		if bytes.HasPrefix(p.data[p.pos:], []byte(lit)) {
			p.pos += len(lit)
			return v, nil
		}
	}
	return nil, p.errf("unexpected character %q", p.data[p.pos])
}

func (p *jsonParser) object() (any, error) {
	p.pos++ // '{'
	obj := map[string]any{}
	p.skipWS()
	if p.pos < len(p.data) && p.data[p.pos] == '}' {
		p.pos++
		return obj, nil
	}
	for {
		p.skipWS()
		if p.pos >= len(p.data) || p.data[p.pos] != '"' {
			return nil, p.errf("object key is not a string")
		}
		k, err := p.str()
		if err != nil {
			return nil, err
		}
		if _, dup := obj[k]; dup {
			return nil, fmt.Errorf("%w: %q", ErrDuplicateKey, k)
		}
		p.skipWS()
		if p.pos >= len(p.data) || p.data[p.pos] != ':' {
			return nil, p.errf("expected ':'")
		}
		p.pos++
		p.skipWS()
		v, err := p.value()
		if err != nil {
			return nil, err
		}
		obj[k] = v
		p.skipWS()
		if p.pos < len(p.data) && p.data[p.pos] == ',' {
			p.pos++
			continue
		}
		if p.pos < len(p.data) && p.data[p.pos] == '}' {
			p.pos++
			return obj, nil
		}
		return nil, p.errf("expected ',' or '}'")
	}
}

func (p *jsonParser) array() (any, error) {
	p.pos++ // '['
	arr := []any{}
	p.skipWS()
	if p.pos < len(p.data) && p.data[p.pos] == ']' {
		p.pos++
		return arr, nil
	}
	for {
		p.skipWS()
		v, err := p.value()
		if err != nil {
			return nil, err
		}
		arr = append(arr, v)
		p.skipWS()
		if p.pos < len(p.data) && p.data[p.pos] == ',' {
			p.pos++
			continue
		}
		if p.pos < len(p.data) && p.data[p.pos] == ']' {
			p.pos++
			return arr, nil
		}
		return nil, p.errf("expected ',' or ']'")
	}
}

func (p *jsonParser) hex4() (rune, bool) {
	if p.pos+4 > len(p.data) {
		return 0, false
	}
	var r rune
	for _, c := range p.data[p.pos : p.pos+4] {
		var d byte
		switch {
		case c >= '0' && c <= '9':
			d = c - '0'
		case c >= 'a' && c <= 'f':
			d = c - 'a' + 10
		case c >= 'A' && c <= 'F':
			d = c - 'A' + 10
		default:
			return 0, false
		}
		r = r<<4 | rune(d)
	}
	p.pos += 4
	return r, true
}

// appendWTF8 encodes a lone surrogate code unit as 3 bytes (not valid UTF-8).
func appendWTF8(out []byte, cu rune) []byte {
	return append(out, byte(0xE0|cu>>12), byte(0x80|(cu>>6)&0x3F), byte(0x80|cu&0x3F))
}

func (p *jsonParser) str() (string, error) {
	p.pos++ // opening quote
	var out []byte
	for {
		if p.pos >= len(p.data) {
			return "", p.errf("unterminated string")
		}
		c := p.data[p.pos]
		switch {
		case c == '"':
			p.pos++
			return string(out), nil
		case c < 0x20:
			return "", p.errf("control character in string")
		case c != '\\':
			out = append(out, c)
			p.pos++
			continue
		}
		p.pos++ // backslash
		if p.pos >= len(p.data) {
			return "", p.errf("unterminated escape")
		}
		e := p.data[p.pos]
		p.pos++
		switch e {
		case '"', '\\', '/':
			out = append(out, e)
		case 'b':
			out = append(out, '\b')
		case 'f':
			out = append(out, '\f')
		case 'n':
			out = append(out, '\n')
		case 'r':
			out = append(out, '\r')
		case 't':
			out = append(out, '\t')
		case 'u':
			cu, ok := p.hex4()
			if !ok {
				return "", p.errf("invalid \\u escape")
			}
			switch {
			case cu >= 0xD800 && cu <= 0xDBFF:
				save := p.pos
				if p.pos+2 <= len(p.data) && p.data[p.pos] == '\\' && p.data[p.pos+1] == 'u' {
					p.pos += 2
					if lo, ok := p.hex4(); ok && lo >= 0xDC00 && lo <= 0xDFFF {
						out = utf8.AppendRune(out, utf16.DecodeRune(cu, lo))
						break
					}
				}
				p.pos = save
				out = appendWTF8(out, cu)
			case cu >= 0xDC00 && cu <= 0xDFFF:
				out = appendWTF8(out, cu)
			default:
				out = utf8.AppendRune(out, cu)
			}
		default:
			return "", p.errf("invalid escape %q", e)
		}
	}
}

// nfcTree returns a copy of v with every string value and object key
// NFC-normalised, failing on keys that fold to the same NFC form.
func nfcTree(v any) (any, error) { return nfcTreeDepth(v, 0) }

func nfcTreeDepth(v any, depth int) (any, error) {
	if depth > MaxTreeDepth {
		return nil, ErrTreeTooDeep
	}
	switch t := v.(type) {
	case string:
		if !utf8.ValidString(t) {
			return nil, ErrCanonicalNFC
		}
		return norm.NFC.String(t), nil
	case []any:
		out := make([]any, len(t))
		for i, e := range t {
			n, err := nfcTreeDepth(e, depth+1)
			if err != nil {
				return nil, err
			}
			out[i] = n
		}
		return out, nil
	case map[string]any:
		out := make(map[string]any, len(t))
		for k, e := range t {
			if !utf8.ValidString(k) {
				return nil, ErrCanonicalNFC
			}
			nk := norm.NFC.String(k)
			if _, seen := out[nk]; seen {
				return nil, fmt.Errorf("%w on %q", ErrCanonicalKeyCollision, nk)
			}
			n, err := nfcTreeDepth(e, depth+1)
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
//
// A string or key that is not valid UTF-8 (an unpaired surrogate kept by
// ParseJSON) returns ErrCanonicalNFC instead of being silently replaced
// with U+FFFD. The TS writer escapes such strings as \uXXXX, which RFC 8785
// does not define; ports reject them rather than guess.
func CanonicalizeRaw(v any) ([]byte, error) {
	if err := checkTree(v, 0); err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return jcs.Transform(bytes.TrimRight(buf.Bytes(), "\n"))
}

// checkTree rejects strings or keys that are not valid UTF-8
// (ErrCanonicalNFC) and trees deeper than MaxTreeDepth (ErrTreeTooDeep;
// also stops a cyclic map from overflowing the stack, which is fatal in
// Go rather than a recoverable panic).
func checkTree(v any, depth int) error {
	if depth > MaxTreeDepth {
		return ErrTreeTooDeep
	}
	switch t := v.(type) {
	case string:
		if !utf8.ValidString(t) {
			return ErrCanonicalNFC
		}
	case []any:
		for _, e := range t {
			if err := checkTree(e, depth+1); err != nil {
				return err
			}
		}
	case map[string]any:
		for k, e := range t {
			if !utf8.ValidString(k) {
				return ErrCanonicalNFC
			}
			if err := checkTree(e, depth+1); err != nil {
				return err
			}
		}
	}
	return nil
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
