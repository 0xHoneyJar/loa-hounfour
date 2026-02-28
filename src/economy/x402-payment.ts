/**
 * x402 Payment Schemas — HTTP payment flow types for AI agent economy.
 *
 * Defines schemas for the x402 payment protocol: quotes, payment proofs,
 * settlements, and error codes. All financial values use string-encoded
 * MicroUSD (^[0-9]+$) — no floating point.
 *
 * @see PRD FR-1 — x402 Payment Schemas
 * @see SDD §6.1 — x402 Payment Schemas
 * @since v8.3.0
 */
import { Type, type Static } from '@sinclair/typebox';

/** MicroUSD string pattern — non-negative integer as string. */
const MicroUSDStringSchema = Type.String({
  pattern: '^[0-9]+$',
  maxLength: 20,
  description: 'MicroUSD amount as non-negative integer string. 1 USD = 1,000,000 micro-USD.',
});

/** Ethereum address pattern — 0x-prefixed, 40 hex chars. */
const EthAddressPattern = '^0x[a-fA-F0-9]{40}$';

/**
 * x402 Quote — pricing offer from a model provider.
 */
export const X402QuoteSchema = Type.Object(
  {
    quote_id: Type.String({ format: 'uuid' }),
    model: Type.String({ minLength: 1 }),
    max_cost_micro: MicroUSDStringSchema,
    payment_address: Type.String({
      pattern: EthAddressPattern,
      description: 'Hex-encoded Ethereum address for payment (EIP-55 validation not enforced at schema level).',
    }),
    chain_id: Type.Integer({
      minimum: 1,
      description: 'EVM chain ID (1=mainnet, 137=Polygon, etc.).',
    }),
    token_address: Type.String({
      pattern: EthAddressPattern,
      description: 'ERC-20 token contract address for settlement.',
    }),
    valid_until: Type.String({
      format: 'date-time',
      description: 'Quote expiration time (UTC).',
    }),
    cost_per_input_token_micro: Type.Optional(MicroUSDStringSchema),
    cost_per_output_token_micro: Type.Optional(MicroUSDStringSchema),
  },
  {
    $id: 'X402Quote',
    additionalProperties: false,
  },
);

export type X402Quote = Static<typeof X402QuoteSchema>;

/**
 * x402 Payment Proof — evidence of payment submitted with request.
 */
export const X402PaymentProofSchema = Type.Object(
  {
    payment_header: Type.String({
      minLength: 1,
      description: 'HTTP 402 payment header value.',
    }),
    quote_id: Type.String({ format: 'uuid' }),
    tx_hash: Type.Optional(
      Type.String({
        pattern: '^0x[a-fA-F0-9]{64}$',
        description: 'On-chain transaction hash for verification.',
      }),
    ),
  },
  {
    $id: 'X402PaymentProof',
    additionalProperties: false,
  },
);

export type X402PaymentProof = Static<typeof X402PaymentProofSchema>;

/**
 * x402 Settlement Status — lifecycle state of a payment settlement.
 */
export const X402SettlementStatusSchema = Type.Union(
  [
    Type.Literal('pending'),
    Type.Literal('confirmed'),
    Type.Literal('failed'),
    Type.Literal('refunded'),
  ],
  {
    $id: 'X402SettlementStatus',
  },
);

export type X402SettlementStatus = Static<typeof X402SettlementStatusSchema>;

/**
 * x402 Settlement — final settlement record after payment processing.
 */
export const X402SettlementSchema = Type.Object(
  {
    payment_id: Type.String({ format: 'uuid' }),
    quote_id: Type.String({ format: 'uuid' }),
    actual_cost_micro: MicroUSDStringSchema,
    settlement_status: X402SettlementStatusSchema,
    settled_at: Type.Optional(Type.String({ format: 'date-time' })),
    chain_id: Type.Integer({
      minimum: 1,
      description: 'EVM chain ID where settlement occurred.',
    }),
    token_address: Type.String({
      pattern: EthAddressPattern,
      description: 'ERC-20 token contract address used for settlement.',
    }),
  },
  {
    $id: 'X402Settlement',
    additionalProperties: false,
  },
);

export type X402Settlement = Static<typeof X402SettlementSchema>;

/**
 * x402 Error Code — machine-parseable error codes for payment failures.
 */
export const X402ErrorCodeSchema = Type.Union(
  [
    Type.Literal('PAYMENT_REQUIRED'),
    Type.Literal('NOT_ALLOWLISTED'),
    Type.Literal('INFERENCE_FAILED'),
    Type.Literal('FEATURE_DISABLED'),
    Type.Literal('QUOTE_EXPIRED'),
    Type.Literal('INSUFFICIENT_FUNDS'),
  ],
  {
    $id: 'X402ErrorCode',
  },
);

export type X402ErrorCode = Static<typeof X402ErrorCodeSchema>;
