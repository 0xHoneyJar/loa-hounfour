import { describe, expect, it } from 'vitest';
import { Type } from '@sinclair/typebox';
import {
  getCrossFieldValidatorSchemas,
  registerCrossFieldValidator,
  validate,
} from '../../src/validators/index.js';

const AuditorRegistrySchema = Type.Object(
  {
    state: Type.String(),
  },
  {
    $id: 'AuditorRegistryContract',
    additionalProperties: false,
  },
);

registerCrossFieldValidator('AuditorRegistryContract', (data) => {
  const value = data as { state: string };
  if (value.state === 'warn') {
    return { valid: true, errors: [], warnings: ['state entered warning fixture'] };
  }
  if (value.state !== 'ok') {
    return { valid: false, errors: ['state must be ok'], warnings: [] };
  }
  return { valid: true, errors: [], warnings: [] };
});

describe('validator registry runtime contract', () => {
  it('discovers registered cross-field validators', () => {
    expect(getCrossFieldValidatorSchemas()).toContain('AuditorRegistryContract');
  });

  it('runs registered cross-field validators after structural validation', () => {
    const result = validate(AuditorRegistrySchema, { state: 'bad' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain('state must be ok');
    }
  });

  it('can skip cross-field validation explicitly', () => {
    const result = validate(AuditorRegistrySchema, { state: 'bad' }, { crossField: false });
    expect(result.valid).toBe(true);
  });

  it('surfaces cross-field warnings without failing validation', () => {
    const result = validate(AuditorRegistrySchema, { state: 'warn' });
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain('state entered warning fixture');
  });
});

describe('runtime string format validation', () => {
  it('rejects invalid date-time values at runtime', () => {
    const schema = Type.Object({ ts: Type.String({ format: 'date-time' }) });
    expect(validate(schema, { ts: '2026-01-01' }).valid).toBe(false);
  });

  it('rejects unsupported uri schemes at runtime', () => {
    const schema = Type.Object({ uri: Type.String({ format: 'uri' }) });
    expect(validate(schema, { uri: 'ftp://example.test/resource' }).valid).toBe(false);
  });

  it('rejects malformed uuid values at runtime', () => {
    const schema = Type.Object({ id: Type.String({ format: 'uuid' }) });
    expect(validate(schema, { id: 'not-a-uuid' }).valid).toBe(false);
  });
});
