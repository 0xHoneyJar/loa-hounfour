import { Type } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../../vocabulary/currency.js';
export const ModelCapabilitiesSchema = Type.Object({
    model_id: Type.String({ minLength: 1 }),
    provider: Type.String({ minLength: 1 }),
    capabilities: Type.Object({
        thinking_traces: Type.Boolean(),
        vision: Type.Boolean(),
        tool_calling: Type.Boolean(),
        streaming: Type.Boolean(),
        json_mode: Type.Boolean(),
        native_runtime: Type.Boolean(),
    }),
    limits: Type.Object({
        max_context_tokens: Type.Integer({ minimum: 1 }),
        max_output_tokens: Type.Integer({ minimum: 1 }),
        max_thinking_tokens: Type.Optional(Type.Integer({ minimum: 1 })),
    }),
    pricing: Type.Optional(Type.Object({
        input_per_million_micro: MicroUSDUnsigned,
        output_per_million_micro: MicroUSDUnsigned,
        thinking_per_million_micro: Type.Optional(MicroUSDUnsigned),
    })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
    $id: 'ModelCapabilities',
    $comment: 'Financial amounts (input_per_million_micro, output_per_million_micro, thinking_per_million_micro) use string-encoded BigInt (MicroUSD) to prevent floating-point precision loss. See vocabulary/currency.ts for arithmetic utilities.',
    additionalProperties: false,
});
//# sourceMappingURL=model-capabilities.js.map