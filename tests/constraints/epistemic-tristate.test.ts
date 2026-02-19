/**
 * Tests for EpistemicTristate constraint file and pattern documentation (S2-T2).
 *
 * Validates constraint file structure, pattern doc existence,
 * and that all listed instances actually exist in the codebase.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');

describe('EpistemicTristate constraint file', () => {
  const constraintPath = join(rootDir, 'constraints', 'EpistemicTristate.constraints.json');
  const constraint = JSON.parse(readFileSync(constraintPath, 'utf-8'));

  it('has correct schema_id', () => {
    expect(constraint.schema_id).toBe('EpistemicTristate');
  });

  it('has contract_version 5.3.0', () => {
    expect(constraint.contract_version).toBe('5.3.0');
  });

  it('has expression_version 1.0', () => {
    expect(constraint.expression_version).toBe('1.0');
  });

  it('has tristate-distinguishability constraint', () => {
    const c = constraint.constraints.find((c: { id: string }) => c.id === 'tristate-distinguishability');
    expect(c).toBeDefined();
    expect(c.severity).toBe('error');
    expect(c.message).toContain('distinguishable');
    expect(c.institutional_context).toBeDefined();
  });

  it('metadata lists known instances', () => {
    expect(constraint.metadata.instances).toContain('ConservationStatus');
    expect(constraint.metadata.instances).toContain('SignatureVerificationResult');
  });

  it('metadata references Lukasiewicz', () => {
    expect(constraint.metadata.references).toContain('Lukasiewicz 1920');
  });
});

describe('Epistemic Tristate pattern documentation', () => {
  const docPath = join(rootDir, 'docs', 'patterns', 'epistemic-tristate.md');

  it('pattern document exists', () => {
    expect(existsSync(docPath)).toBe(true);
  });

  it('contains all required sections', () => {
    const content = readFileSync(docPath, 'utf-8');
    expect(content).toContain('## Definition');
    expect(content).toContain('## When to Use');
    expect(content).toContain('## Instances in loa-hounfour');
    expect(content).toContain('## Why Not a Generic Type?');
    expect(content).toContain('## Parallels');
    expect(content).toContain('## Invariant');
  });

  it('references the constraint file', () => {
    const content = readFileSync(docPath, 'utf-8');
    expect(content).toContain('EpistemicTristate.constraints.json');
  });

  it('documents FL-PRD-006 decision', () => {
    const content = readFileSync(docPath, 'utf-8');
    expect(content).toContain('FL-PRD-006');
  });
});

describe('Epistemic Tristate instances have JSDoc references', () => {
  it('ConservationStatus references the pattern', () => {
    const content = readFileSync(join(rootDir, 'src', 'vocabulary', 'conservation-status.ts'), 'utf-8');
    expect(content).toContain('Epistemic Tristate');
    expect(content).toContain('docs/patterns/epistemic-tristate.md');
  });

  it('SignatureVerificationResult references the pattern', () => {
    const content = readFileSync(join(rootDir, 'src', 'utilities', 'signature.ts'), 'utf-8');
    expect(content).toContain('Epistemic Tristate');
    expect(content).toContain('docs/patterns/epistemic-tristate.md');
  });
});
