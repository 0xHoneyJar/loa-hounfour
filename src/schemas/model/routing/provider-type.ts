import { Type } from '@sinclair/typebox';

/**
 * Provider type vocabulary for model routing.
 * Identifies the provider hosting the model.
 */
export const ProviderTypeSchema = Type.Union(
  [
    Type.Literal('claude-code'),
    Type.Literal('openai'),
    Type.Literal('openai-compatible'),
  ],
  { $id: 'ProviderType' }
);
