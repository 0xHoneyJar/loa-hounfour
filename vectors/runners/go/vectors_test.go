// Cross-language golden vector runner for loa-hounfour.
//
// Validates JSON Schema files against golden test vectors using the
// santhosh-tekuri/jsonschema library. No TypeScript toolchain required.
//
// Usage:
//
//	cd vectors/runners/go
//	go test ./...
package vectors_test

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

var repoRoot string

func init() {
	_, filename, _, _ := runtime.Caller(0)
	repoRoot = filepath.Join(filepath.Dir(filename), "..", "..", "..")
}

func schemaPath(name string) string {
	return filepath.Join(repoRoot, "schemas", name+".schema.json")
}

func vectorPath(parts ...string) string {
	return filepath.Join(append([]string{repoRoot, "vectors"}, parts...)...)
}

func loadJSON(path string) (interface{}, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var v interface{}
	if err := json.Unmarshal(data, &v); err != nil {
		return nil, err
	}
	return v, nil
}

func compileSchema(t *testing.T, name string) *jsonschema.Schema {
	t.Helper()
	c := jsonschema.NewCompiler()
	sch, err := c.Compile(schemaPath(name))
	if err != nil {
		t.Fatalf("compile schema %s: %v", name, err)
	}
	return sch
}

type vectorEntry struct {
	ID   string      `json:"id"`
	Data interface{} `json:"data"`
	Note string      `json:"note"`
}

func runVectorSuite(t *testing.T, schemaName string, vecPath string, validKey string, invalidKey string) {
	t.Helper()

	raw, err := os.ReadFile(vecPath)
	if err != nil {
		t.Fatalf("read vectors: %v", err)
	}

	var doc map[string]json.RawMessage
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("parse vectors: %v", err)
	}

	sch := compileSchema(t, schemaName)

	// Valid vectors
	if validRaw, ok := doc[validKey]; ok {
		var valid []vectorEntry
		if err := json.Unmarshal(validRaw, &valid); err != nil {
			t.Fatalf("parse valid vectors: %v", err)
		}
		for _, v := range valid {
			t.Run(fmt.Sprintf("valid/%s", v.ID), func(t *testing.T) {
				if err := sch.Validate(v.Data); err != nil {
					t.Errorf("%s: expected valid, got error: %v", v.ID, err)
				}
			})
		}
	}

	// Invalid vectors
	if invalidRaw, ok := doc[invalidKey]; ok {
		var invalid []vectorEntry
		if err := json.Unmarshal(invalidRaw, &invalid); err != nil {
			t.Fatalf("parse invalid vectors: %v", err)
		}
		for _, v := range invalid {
			if v.Data == nil {
				continue // Skip entries without data (e.g., field-level markers)
			}
			t.Run(fmt.Sprintf("invalid/%s", v.ID), func(t *testing.T) {
				if err := sch.Validate(v.Data); err == nil {
					t.Errorf("%s: expected invalid, but validation passed", v.ID)
				}
			})
		}
	}
}

func TestDomainEvents(t *testing.T) {
	runVectorSuite(t, "domain-event",
		vectorPath("domain-event", "events.json"),
		"valid_events", "invalid")
}

func TestDomainEventBatches(t *testing.T) {
	runVectorSuite(t, "domain-event-batch",
		vectorPath("domain-event", "batches.json"),
		"valid_batches", "invalid_batches")
}

func TestConversations(t *testing.T) {
	runVectorSuite(t, "conversation",
		vectorPath("conversation", "conversations.json"),
		"valid_conversations", "invalid")
}

func TestLifecyclePayloads(t *testing.T) {
	runVectorSuite(t, "lifecycle-transition-payload",
		vectorPath("agent", "lifecycle-payloads.json"),
		"valid_payloads", "invalid_payloads")
}
