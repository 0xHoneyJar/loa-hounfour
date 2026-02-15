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
  {
    $id: 'ProviderType',
    $comment: 'Provider type vocabulary for model routing. See RFC #31 (The Hounfour RFC): https://github.com/0xHoneyJar/loa-finn/issues/31',
  }
);
