package verify

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"errors"
	"regexp"
	"strings"
)

// VerifyStatus is the tri-state `verified` value: true, false, or
// "unverifiable" (the check could not be performed; NOT a pass).
type VerifyStatus int

const (
	StatusFalse VerifyStatus = iota
	StatusTrue
	StatusUnverifiable
)

// MarshalJSON emits true, false or "unverifiable" as in the TS result.
func (s VerifyStatus) MarshalJSON() ([]byte, error) {
	switch s {
	case StatusTrue:
		return []byte("true"), nil
	case StatusUnverifiable:
		return []byte(`"unverifiable"`), nil
	default:
		return []byte("false"), nil
	}
}

// Ed25519VerifyResult mirrors the TS Ed25519VerifyResult.
type Ed25519VerifyResult struct {
	Verified VerifyStatus `json:"verified"`
	Reason   string       `json:"reason,omitempty"`
}

// VerifyOptions mirrors Ed25519VerifyOptions. A nil SignatureField means
// the default "signature"; a pointer to "" is invalid (options_invalid),
// as an empty signatureField is in TS. A nil OmitFields means the default
// [signature field, "quorum_signatures"]; a non-nil (even empty) slice is
// used as given. The signature field is always omitted.
type VerifyOptions struct {
	SignatureField *string
	OmitFields     []string
}

// validate mirrors the TS options_invalid check. Type errors that TS
// also rejects (non-string field, non-array omitFields) cannot be
// expressed in this struct; OptionsFromTree reports those.
func (o *VerifyOptions) validate() bool {
	return o == nil || o.SignatureField == nil || *o.SignatureField != ""
}

const (
	signaturePrefix = "ed25519:"
	pubkeyPrefix    = "ed25519-pub:"
)

// Go's base64 decoders silently skip '\r' and '\n'; the explicit
// alphabet check keeps decoding identical to the strict TS decoder.
var b64urlRe = regexp.MustCompile(`^[A-Za-z0-9_-]*$`)

func decodeB64URLStrict(s string, n int) ([]byte, bool) {
	if len(s) != (n*4+2)/3 || !b64urlRe.MatchString(s) {
		return nil, false
	}
	b, err := base64.RawURLEncoding.Strict().DecodeString(s)
	if err != nil || len(b) != n {
		return nil, false
	}
	return b, true
}

func fail(reason string) Ed25519VerifyResult {
	return Ed25519VerifyResult{Verified: StatusFalse, Reason: reason}
}

// VerifyEnvelopeSignatureEd25519 mirrors verifyEnvelopeSignatureEd25519,
// with the same step order and reason vocabulary. envelope is a ParseJSON
// tree; publicKey is a 32-byte []byte / ed25519.PublicKey or an
// "ed25519-pub:<43 base64url>" string. Never panics on malformed input.
func VerifyEnvelopeSignatureEd25519(envelope any, publicKey any, opts *VerifyOptions) (result Ed25519VerifyResult) {
	// Mirrors the TS catch-all: a panic from a hostile dynamic value (for
	// example a json.Marshaler that panics) becomes verification_error.
	defer func() {
		if recover() != nil {
			result = fail("verification_error")
		}
	}()
	env, ok := envelope.(map[string]any)
	if !ok {
		return fail("envelope_not_object")
	}
	if !opts.validate() {
		return fail("options_invalid")
	}
	sigField := "signature"
	var omit []string
	if opts != nil {
		if opts.SignatureField != nil {
			sigField = *opts.SignatureField
		}
		omit = opts.OmitFields
	}
	if omit == nil {
		omit = []string{sigField, "quorum_signatures"}
	}

	// Absent key and JSON null both mean "no signature", as in TS.
	rawSig, present := env[sigField]
	if !present || rawSig == nil {
		return Ed25519VerifyResult{Verified: StatusUnverifiable, Reason: "signature_missing"}
	}
	sigText, ok := rawSig.(string)
	if !ok || !strings.HasPrefix(sigText, signaturePrefix) {
		return fail("signature_malformed")
	}
	sig, ok := decodeB64URLStrict(sigText[len(signaturePrefix):], ed25519.SignatureSize)
	if !ok {
		return fail("signature_malformed")
	}

	var pub []byte
	switch k := publicKey.(type) {
	case string:
		if strings.HasPrefix(k, pubkeyPrefix) {
			pub, _ = decodeB64URLStrict(k[len(pubkeyPrefix):], ed25519.PublicKeySize)
		}
	case ed25519.PublicKey:
		pub = append([]byte(nil), k...) // defensive copy, as TS does
	case []byte:
		pub = append([]byte(nil), k...)
	}
	if len(pub) != ed25519.PublicKeySize {
		return fail("public_key_malformed")
	}

	skip := map[string]bool{sigField: true}
	for _, f := range omit {
		skip[f] = true
	}
	unsigned := make(map[string]any, len(env))
	for k, v := range env {
		if !skip[k] {
			unsigned[k] = v
		}
	}
	msg, err := SafeCanonicalize(unsigned)
	if err != nil {
		switch {
		case errors.Is(err, ErrCanonicalSizeCap):
			return fail("canonical_size_cap_exceeded")
		case errors.Is(err, ErrCanonicalKeyCollision):
			return fail("canonical_key_collision")
		case errors.Is(err, ErrCanonicalNFC):
			return fail("canonical_nfc_failed")
		default:
			return fail("canonicalization_failed")
		}
	}
	if !ed25519.Verify(ed25519.PublicKey(pub), msg, sig) {
		return fail("signature_mismatch")
	}
	return Ed25519VerifyResult{Verified: StatusTrue}
}

// OptionsFromTree decodes a vector's `options` object
// ({signatureField?, omitFields?}); nil input yields nil options. ok is
// false where the TS function reports options_invalid.
func OptionsFromTree(v any) (*VerifyOptions, bool) {
	if v == nil {
		return nil, true
	}
	obj, ok := v.(map[string]any)
	if !ok {
		return nil, false
	}
	o := &VerifyOptions{}
	if sf, present := obj["signatureField"]; present {
		s, ok := sf.(string)
		if !ok {
			return nil, false // TS reports options_invalid for this
		}
		o.SignatureField = &s // "" is rejected by the core function
	}
	if of, present := obj["omitFields"]; present {
		arr, ok := of.([]any)
		if !ok {
			return nil, false
		}
		o.OmitFields = []string{}
		for _, e := range arr {
			s, ok := e.(string)
			if !ok {
				return nil, false
			}
			o.OmitFields = append(o.OmitFields, s)
		}
	}
	return o, true
}

var _ json.Marshaler = VerifyStatus(0)
