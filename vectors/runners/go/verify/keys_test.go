package verify

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// The test keys are derived from public seeds (vectors/verifier/keys/README.md):
// seed = SHA-256("loa-hounfour verifier conformance test key " + label).
// Re-deriving them here proves the committed public keys follow the rule
// and that no private key material is needed in the tree.
func TestTestKeysDeriveFromPublicSeeds(t *testing.T) {
	dir := filepath.Join(repoRoot(t), "vectors", "verifier", "keys")
	for _, label := range []string{"a", "b", "c"} {
		seed := sha256.Sum256([]byte("loa-hounfour verifier conformance test key " + label))
		pub := ed25519.NewKeyFromSeed(seed[:]).Public().(ed25519.PublicKey)
		want := pubkeyPrefix + base64.RawURLEncoding.EncodeToString(pub)
		data, err := os.ReadFile(filepath.Join(dir, "signer-"+label+".pub.txt"))
		if err != nil {
			t.Fatal(err)
		}
		lines := strings.Split(strings.TrimSpace(string(data)), "\n")
		if got := lines[len(lines)-1]; got != want {
			t.Errorf("signer-%s: committed %s, derived %s", label, got, want)
		}
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range entries {
		if !strings.HasSuffix(e.Name(), ".pub.txt") && e.Name() != "README.md" {
			t.Errorf("unexpected file in keys/: %s", e.Name())
		}
	}
}
