# TEST KEYS

TEST KEY — generated 2026-10-14 for conformance vectors; never use for anything else.

These Ed25519 keys are test-only. They are derived from public seeds,
so they are worthless as secrets by construction. Only the public keys
are committed. No private key material is stored in this repository.

## Derivation rule

For each label `a`, `b`, `c`:

1. `seed = SHA-256(UTF-8("loa-hounfour verifier conformance test key " + label))`, which is 32 bytes. The string ends with one space before the label, so label `a` hashes `"loa-hounfour verifier conformance test key a"`.
2. The Ed25519 private key is the RFC 8032 key whose 32-byte seed is `seed`.
   As PKCS#8 DER it is the 16-byte prefix `302e020100300506032b657004220420` followed by `seed`.
   In Node, load it with `crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' })`.
   In Go, use `ed25519.NewKeyFromSeed(seed)`.
3. The public key is the raw 32-byte Ed25519 public key, encoded as `ed25519-pub:` plus 43 unpadded base64url chars.

| File | Label | Public key |
|------|-------|------------|
| `signer-a.pub.txt` | `a` | `ed25519-pub:VmoZNth7BC6kHKN-qWzudSbjQgaa3adlVcPkBZ8YFaQ` |
| `signer-b.pub.txt` | `b` | `ed25519-pub:F-O3AHdAZ3I-dmDAcI0ejiwZaFeoyLacdfn5M23aD1o` |
| `signer-c.pub.txt` | `c` | `ed25519-pub:GsDRzNUM4zID0517GUNEmasa4qZC3yi4PyR_NJ-asRI` |

Each `.pub.txt` file starts with a `# TEST KEY` comment line followed by the public key.
`scripts/generate-verifier-vectors.ts` applies this rule and writes this README.
