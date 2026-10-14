/**
 * PR-C5 (FR-C5) — AgentIdentityBinding schema + cross-field validator.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AgentIdentityBindingSchema,
  AGENT_IDENTITY_BINDING_PROFILES,
  AGENT_IDENTITY_BINDING_PROFILE_BLOCK,
  COMPACT_JWS_PATTERN,
  validateAgentIdentityBinding,
  type AgentIdentityBinding,
} from '../../src/governance/agent-identity-binding.js';
import * as root from '../../src/index.js';
import * as governance from '../../src/governance/index.js';
import { validate, getCrossFieldValidatorSchemas } from '../../src/validators/index.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const constraintFile = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'constraints', 'AgentIdentityBinding.constraints.json'), 'utf-8'),
) as { constraints: Array<{ id: string; expression: string }> };

const BLOCKS = {
  a2a: { card_url: 'https://agents.example.com/.well-known/agent-card.json' },
  directory: {
    directory_kind: 'okta',
    tenant_id: 'tenant-1',
    object_id: 'obj-1',
    accountable_role: 'Agent Platform Owner',
    lifecycle_state: 'active',
  },
  vc: { issuer: 'did:web:issuer.example.com', credential_type: 'AgentCredential', credential_hash: 'sha256:' + 'ab'.repeat(32) },
} as const;
type BlockKey = keyof typeof BLOCKS;
const BLOCK_KEYS = Object.keys(BLOCKS) as BlockKey[];

function binding(profile: string, present: BlockKey[]): Record<string, unknown> {
  const rec: Record<string, unknown> = {
    binding_id: '0b6f2d4e-1a3c-4e5f-8a7b-9c0d1e2f3a4b',
    agent_id: 'research-agent',
    profile,
  };
  for (const k of present) rec[k] = BLOCKS[k];
  rec.bound_at = '2026-10-14T00:00:00Z';
  rec.bound_by_signer_id = 'signer-1';
  rec.contract_version = '8.8.0';
  return rec;
}

describe('AgentIdentityBindingSchema metadata', () => {
  it('carries $id, closed shape, description, and the cross-field marker', () => {
    const s = AgentIdentityBindingSchema as Record<string, unknown>;
    expect(s.$id).toBe('AgentIdentityBinding');
    expect(s.additionalProperties).toBe(false);
    expect(typeof s.description).toBe('string');
    expect(s['x-cross-field-validated']).toBe(true);
    expect(s['x-crypto-bearing']).toBeUndefined();
  });

  it('registers a cross-field validator', () => {
    expect(getCrossFieldValidatorSchemas()).toContain('AgentIdentityBinding');
  });

  it('is reachable from the governance and root barrels', () => {
    expect(governance.AgentIdentityBindingSchema).toBe(AgentIdentityBindingSchema);
    expect(root.AgentIdentityBindingSchema).toBe(AgentIdentityBindingSchema);
    expect(root.validateAgentIdentityBinding).toBe(validateAgentIdentityBinding);
    expect(root.AGENT_IDENTITY_BINDING_PROFILES).toBe(AGENT_IDENTITY_BINDING_PROFILES);
  });

  it('maps each profile to a distinct block', () => {
    expect(AGENT_IDENTITY_BINDING_PROFILES.map((p) => AGENT_IDENTITY_BINDING_PROFILE_BLOCK[p])).toEqual(['a2a', 'directory', 'vc']);
  });
});

describe('COMPACT_JWS_PATTERN', () => {
  const re = new RegExp(COMPACT_JWS_PATTERN);
  it('accepts three non-empty base64url segments', () => {
    expect(re.test('aGVhZGVy.cGF5bG9hZA.c2ln')).toBe(true);
    expect(re.test('a-_.b-_.c-_')).toBe(true);
  });
  it('rejects detached, two-segment, four-segment, and padded forms', () => {
    for (const v of ['aGVhZGVy..c2ln', 'a.b', 'a.b.c.d', 'a.b.c=', '.b.c', 'a.b.', 'a b.c.d']) {
      expect(re.test(v)).toBe(false);
    }
  });
});

describe('validateAgentIdentityBinding — branches', () => {
  it('rejects non-object input', () => {
    for (const v of [null, [], 'x', 1, undefined]) {
      const r = validateAgentIdentityBinding(v);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toMatch(/^AIB: structural shape precondition failed/);
    }
  });

  it('rejects an unknown or missing profile', () => {
    expect(validateAgentIdentityBinding({ profile: 'other' }).errors[0]).toMatch(/profile must be one of/);
    expect(validateAgentIdentityBinding({}).valid).toBe(false);
  });

  for (const profile of AGENT_IDENTITY_BINDING_PROFILES) {
    const required = AGENT_IDENTITY_BINDING_PROFILE_BLOCK[profile];
    const id = `AIB-${AGENT_IDENTITY_BINDING_PROFILES.indexOf(profile) + 1}`;

    it(`${id}: accepts profile ${profile} with only its own block`, () => {
      expect(validateAgentIdentityBinding(binding(profile, [required]))).toEqual({ valid: true, errors: [], warnings: [] });
    });

    it(`${id}: reports the missing ${required} block`, () => {
      const r = validateAgentIdentityBinding(binding(profile, []));
      expect(r.errors).toEqual([`${id}: profile '${profile}' requires the ${required} block, which is absent.`]);
    });

    for (const other of BLOCK_KEYS.filter((k) => k !== required)) {
      it(`${id}: reports the forbidden ${other} block`, () => {
        const r = validateAgentIdentityBinding(binding(profile, [required, other]));
        expect(r.errors).toEqual([`${id}: profile '${profile}' forbids the ${other} block, which is present.`]);
      });
    }

    it(`${id}: reports missing and forbidden together`, () => {
      const others = BLOCK_KEYS.filter((k) => k !== required);
      const r = validateAgentIdentityBinding(binding(profile, others));
      expect(r.errors).toHaveLength(3);
    });
  }

  it('treats a null block as absent, matching the DSL (direct call)', () => {
    const rec = { ...binding('a2a-agent-card', ['a2a']), directory: null, vc: null };
    expect(validateAgentIdentityBinding(rec)).toEqual({ valid: true, errors: [], warnings: [] });
    const exprs = constraintFile.constraints.filter((c) => ['AIB-1', 'AIB-2', 'AIB-3'].includes(c.id));
    expect(exprs.every((c) => evaluateConstraint(rec, c.expression))).toBe(true);
  });

  it('reports a null required block as missing (direct call)', () => {
    const rec = { ...binding('directory-identity', []), directory: null };
    expect(validateAgentIdentityBinding(rec).errors).toEqual([
      "AIB-2: profile 'directory-identity' requires the directory block, which is absent.",
    ]);
    const aib2 = constraintFile.constraints.find((c) => c.id === 'AIB-2')!;
    expect(evaluateConstraint(rec, aib2.expression)).toBe(false);
  });

  it('rejects a null block at the structural tier in validate()', () => {
    const rec = { ...binding('a2a-agent-card', ['a2a']), directory: null };
    const r = validate(AgentIdentityBindingSchema, rec);
    expect(r.valid).toBe(false);
    expect(r.errors!.some((e) => e.startsWith('/directory'))).toBe(true);
  });

  for (const [label, value] of [['string', 'x'], ['array', []], ['number', 42]] as const) {
    it(`rejects a present ${label} block on the direct-call path`, () => {
      const r = validateAgentIdentityBinding({ ...binding('a2a-agent-card', []), a2a: value });
      expect(r.valid).toBe(false);
      expect(r.errors).toEqual([
        `AIB: structural shape precondition failed — a2a block must be an object when present; got ${label}. The cross-field validator requires the structural tier (Value.Check) to have passed first.`,
      ]);
    });

    it(`rejects a forbidden ${label} block on the direct-call path`, () => {
      const r = validateAgentIdentityBinding({ ...binding('a2a-agent-card', ['a2a']), vc: value });
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toMatch(/^AIB: structural shape precondition failed — vc block must be an object/);
    });
  }

  it('runs inside validate()', () => {
    const r = validate(AgentIdentityBindingSchema, binding('a2a-agent-card', ['a2a', 'vc']));
    expect(r.valid).toBe(false);
    expect(r.errors).toEqual(["AIB-1: profile 'a2a-agent-card' forbids the vc block, which is present."]);
  });

  it('types a valid record', () => {
    const rec = binding('directory-identity', ['directory']) as unknown as AgentIdentityBinding;
    expect(validate(AgentIdentityBindingSchema, rec).valid).toBe(true);
  });
});

describe('validateAgentIdentityBinding — properties', () => {
  const profileArb = fc.constantFrom(...AGENT_IDENTITY_BINDING_PROFILES);
  const subsetArb = fc.subarray(BLOCK_KEYS);

  it('is valid iff the present blocks are exactly the profile block', () => {
    fc.assert(
      fc.property(profileArb, subsetArb, (profile, present) => {
        const r = validateAgentIdentityBinding(binding(profile, present));
        const expected = present.length === 1 && present[0] === AGENT_IDENTITY_BINDING_PROFILE_BLOCK[profile];
        return r.valid === expected;
      }),
    );
  });

  it('error count equals missing-required plus forbidden-present blocks', () => {
    fc.assert(
      fc.property(profileArb, subsetArb, (profile, present) => {
        const required = AGENT_IDENTITY_BINDING_PROFILE_BLOCK[profile];
        const expected = (present.includes(required) ? 0 : 1) + present.filter((k) => k !== required).length;
        return validateAgentIdentityBinding(binding(profile, present)).errors.length === expected;
      }),
    );
  });

  it('agrees with the AIB-1..3 DSL expressions', () => {
    const exprs = constraintFile.constraints.filter((c) => ['AIB-1', 'AIB-2', 'AIB-3'].includes(c.id));
    fc.assert(
      fc.property(profileArb, subsetArb, (profile, present) => {
        const rec = binding(profile, present);
        const dsl = exprs.every((c) => evaluateConstraint(rec, c.expression));
        return dsl === validateAgentIdentityBinding(rec).valid;
      }),
    );
  });

  it('adding a non-profile block to a valid record always invalidates it (monotone)', () => {
    fc.assert(
      fc.property(profileArb, fc.constantFrom(...BLOCK_KEYS), (profile, extra) => {
        const required = AGENT_IDENTITY_BINDING_PROFILE_BLOCK[profile];
        fc.pre(extra !== required);
        return !validateAgentIdentityBinding(binding(profile, [required, extra])).valid;
      }),
    );
  });
});

describe('card_url host looseness (documented, pinned)', () => {
  const rec = (url: string) => ({
    ...binding('a2a-agent-card', []),
    a2a: { card_url: url },
  });

  it('admits a host label ending in "-" (http://x-/); label rules are the consumer\'s', () => {
    expect(validate(AgentIdentityBindingSchema, rec('http://x-/')).valid).toBe(true);
  });

  it('documents the looseness in the card_url description', () => {
    const a2a = (AgentIdentityBindingSchema.properties.a2a as unknown as {
      properties: { card_url: { description: string } };
    }).properties.card_url;
    expect(a2a.description).toContain('http://x-/');
    expect(a2a.description).toContain('scheme and a non-empty host only');
  });
});

describe('cross-field note (AIB-1..3 are not enforced by the JSON Schema alone)', () => {
  it('BLOCK_KEYS derived from BLOCKS matches the schema module profile map', () => {
    expect([...BLOCK_KEYS].sort()).toEqual(Object.values(AGENT_IDENTITY_BINDING_PROFILE_BLOCK).sort());
  });

  it('the schema description states it', () => {
    const d = String((AgentIdentityBindingSchema as Record<string, unknown>).description);
    expect(d).toContain('validate() enforces AIB-1..3 with the registered cross-field validator');
    expect(d).toContain('The JSON Schema alone does NOT enforce AIB-1..3');
  });

  for (const doc of ['agent-identity-a2a-card.md', 'agent-identity-directory.md']) {
    it(`docs/profiles/${doc} states it`, () => {
      const text = readFileSync(join(__dirname, '..', '..', 'docs', 'profiles', doc), 'utf-8');
      expect(text).toContain('**The JSON Schema alone does not enforce this rule.**');
      expect(text).toContain('constraints/AgentIdentityBinding.constraints.json');
    });
  }
});

