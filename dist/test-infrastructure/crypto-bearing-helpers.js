import { validate } from '../validators/index.js';
/**
 * Assert that `payload` is structurally valid against `schema` —
 * shape only, NOT a crypto-verification guarantee. Internally calls
 * `validate(schema, payload, { acceptDeferred: true })` so the safe-
 * by-default check is satisfied while still asserting the schema's
 * structural validity.
 *
 * For non-crypto-bearing schemas this is equivalent to a plain
 * `validate()` call returning `{ valid: true }`.
 *
 * Throws on structural failure; returns the (valid) result on success.
 */
export function assertStructurallyValid(schema, payload) {
    const result = validate(schema, payload, { acceptDeferred: true });
    if (!result.valid) {
        const id = schema.$id ?? '<anonymous>';
        throw new Error(`assertStructurallyValid failed for ${String(id)}: ${result.errors.join('; ')}`);
    }
}
/**
 * Assert that the schema is crypto-bearing AND that calling
 * `validate()` without `{ acceptDeferred: true }` produces the
 * CRYPTO_DEFERRED failure. Used to verify the safe-by-default API
 * stays coherent across the four observation surfaces (TypeBox
 * source, generated JSON Schema, runtime validate(), structural
 * lint).
 *
 * Throws if the schema is NOT crypto-bearing or if the default call
 * unexpectedly returns `{ valid: true }`.
 */
export function assertCryptoBearingFailsByDefault(schema, payload) {
    const flag = schema['x-crypto-bearing'];
    if (flag !== true) {
        const id = schema.$id ?? '<anonymous>';
        throw new Error(`assertCryptoBearingFailsByDefault: ${String(id)} is NOT marked x-crypto-bearing — call assertStructurallyValid for non-crypto schemas.`);
    }
    const result = validate(schema, payload);
    if (result.valid) {
        const id = schema.$id ?? '<anonymous>';
        throw new Error(`assertCryptoBearingFailsByDefault: ${String(id)} returned valid: true without { acceptDeferred: true } — safe-by-default contract violated.`);
    }
    // Match against the literal token at the start of the error string. The
    // CRYPTO_DEFERRED error contract is "the error string starts with the token
    // 'CRYPTO_DEFERRED:'" — substring matching against `includes()` would yield
    // false positives if a future structural error mentions the token in its
    // message body (e.g., "expected CRYPTO_DEFERRED was not present").
    const hasDeferredCode = result.errors.some((e) => e.startsWith('CRYPTO_DEFERRED:'));
    if (!hasDeferredCode) {
        const id = schema.$id ?? '<anonymous>';
        throw new Error(`assertCryptoBearingFailsByDefault: ${String(id)} failed for the wrong reason — expected error to start with 'CRYPTO_DEFERRED:', got: ${result.errors.join('; ')}`);
    }
}
//# sourceMappingURL=crypto-bearing-helpers.js.map