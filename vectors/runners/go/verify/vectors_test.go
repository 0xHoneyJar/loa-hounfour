package verify

import (
	"os"
	"testing"
)

func repoRoot(t *testing.T) string {
	t.Helper()
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	root, err := FindRepoRoot(wd)
	if err != nil {
		t.Fatal(err)
	}
	return root
}

// TestVerifierConformanceSuite runs every vectors/verifier/ case through
// the Go port and requires the exact `expected` object.
func TestVerifierConformanceSuite(t *testing.T) {
	manifest, err := BuildManifest(repoRoot(t))
	if err != nil {
		t.Fatal(err)
	}
	if len(manifest) < 17 {
		t.Fatalf("expected at least 17 cases, got %d", len(manifest))
	}
	kinds := map[string]int{}
	for _, e := range manifest {
		kinds[e.Kind]++
		e := e
		t.Run(e.Kind+"/"+e.Case, func(t *testing.T) {
			if !e.MatchesExpected {
				got, _ := CanonicalJSON(e.Result)
				t.Errorf("result %s does not match expected", got)
			}
		})
	}
	for _, k := range Kinds {
		if kinds[k] == 0 {
			t.Errorf("no cases for kind %s", k)
		}
	}
}
