/**
 * Schema validators with compile cache.
 *
 * Uses TypeBox TypeCompiler for fast runtime validation.
 * Compiled validators are cached on first use.
 *
 * @see SDD 4.1 — Schema Validation
 */
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { JwtClaimsSchema, S2SJwtClaimsSchema } from '../schemas/jwt-claims.js';
import { InvokeResponseSchema, UsageReportSchema } from '../schemas/invoke-response.js';
import { StreamEventSchema } from '../schemas/stream-events.js';
import { RoutingPolicySchema } from '../schemas/routing-policy.js';
// Compile cache — lazily populated on first use
const cache = new Map();
function getOrCompile(schema) {
    const id = schema.$id ?? JSON.stringify(schema);
    let compiled = cache.get(id);
    if (!compiled) {
        compiled = TypeCompiler.Compile(schema);
        cache.set(id, compiled);
    }
    return compiled;
}
/**
 * Validate data against a schema.
 * Returns { valid: true } or { valid: false, errors: [...] }.
 */
export function validate(schema, data) {
    const compiled = getOrCompile(schema);
    if (compiled.Check(data)) {
        return { valid: true };
    }
    const errors = [...compiled.Errors(data)].map((e) => `${e.path}: ${e.message}`);
    return { valid: false, errors };
}
// Pre-built validators for common schemas
export const validators = {
    jwtClaims: () => getOrCompile(JwtClaimsSchema),
    s2sJwtClaims: () => getOrCompile(S2SJwtClaimsSchema),
    invokeResponse: () => getOrCompile(InvokeResponseSchema),
    usageReport: () => getOrCompile(UsageReportSchema),
    streamEvent: () => getOrCompile(StreamEventSchema),
    routingPolicy: () => getOrCompile(RoutingPolicySchema),
};
//# sourceMappingURL=index.js.map