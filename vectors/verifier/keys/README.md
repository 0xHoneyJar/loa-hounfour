# TEST KEYS

TEST KEY — generated 2026-10-14 for conformance vectors; never use for anything else.

Every file in this directory is a deterministic Ed25519 test key derived
by `scripts/generate-verifier-vectors.ts` from the public seed
`sha256("hounfour-verifier-test-key:<name>")`. The private keys are
public knowledge by construction. They exist only so the conformance
vectors can be regenerated and independently re-signed.

| File | Content |
|------|---------|
| `<name>.pub.txt` | `ed25519-pub:<43 base64url>` raw public key |
| `<name>.pkcs8.pem` | PKCS#8 PEM private key |

Each file starts with a `# TEST KEY` comment line. PEM parsers that
require the first line to be `-----BEGIN` need that line stripped.
