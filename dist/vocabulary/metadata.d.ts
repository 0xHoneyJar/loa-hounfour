/**
 * Metadata namespace conventions for protocol extensibility.
 *
 * All envelope schemas (DomainEvent, BillingEntry, InvokeResponse) carry an
 * optional `metadata` record. These namespace prefixes prevent implicit
 * contracts — the Google FieldMask cautionary tale.
 *
 * @see BB-V3-001 — Metadata namespace conventions
 */
/** Reserved metadata namespace prefixes. */
export declare const METADATA_NAMESPACES: {
    /** Protocol-level metadata reserved for loa-hounfour evolution. */
    readonly PROTOCOL: "loa.";
    /** OpenTelemetry-compatible observability data. */
    readonly TRACE: "trace.";
    /**
     * Model-provenance metadata for multi-model routing.
     *
     * Reserved for the Hounfour's multi-model routing layer. When a domain event
     * or billing entry is produced by a specific model (Claude, GPT, Kimi-K2,
     * Qwen3-Coder-Next), the producing agent can annotate with model.* keys.
     *
     * @see {@link MODEL_METADATA_KEYS} for documented keys
     * @see {@link https://github.com/0xHoneyJar/loa-finn/issues/31 | The Hounfour RFC}
     */
    readonly MODEL: "model.";
    /**
     * Billing/economy metadata for cost tracking and reconciliation.
     *
     * Reserved for the economy layer. When a domain event or billing entry
     * carries billing provenance, the producing service annotates with
     * billing.* keys.
     *
     * @see {@link BILLING_METADATA_KEYS} for documented keys
     */
    readonly BILLING: "billing.";
    /** Consumer-defined extensions. */
    readonly CONSUMER: "x-";
};
export type MetadataNamespace = typeof METADATA_NAMESPACES[keyof typeof METADATA_NAMESPACES];
/**
 * Documented metadata keys for the `model.*` namespace.
 *
 * These keys are conventions, not enforced by schema validation. Producers
 * SHOULD populate them when model provenance matters (e.g., multi-model
 * routing, billing reconciliation, debugging tool call fidelity).
 *
 * @see {@link https://github.com/0xHoneyJar/loa-finn/issues/31 | The Hounfour RFC}
 * @see BB-C4-ADV-004 — No metadata namespace for model reasoning traces
 */
export declare const MODEL_METADATA_KEYS: {
    /**
     * Model identifier (e.g., 'claude-opus-4-6', 'gpt-5.2', 'kimi-k2-thinking').
     * @type string
     */
    readonly ID: "model.id";
    /**
     * Model provider (e.g., 'anthropic', 'openai', 'moonshot', 'alibaba').
     * @type string
     */
    readonly PROVIDER: "model.provider";
    /**
     * Whether the model produced a thinking/reasoning trace for this operation.
     * @type boolean
     */
    readonly THINKING_TRACE_AVAILABLE: "model.thinking_trace_available";
    /**
     * Fraction of the model's context window used (0.0 to 1.0).
     * Useful for routing decisions when approaching context limits.
     * @type number
     */
    readonly CONTEXT_WINDOW_USED: "model.context_window_used";
};
export type ModelMetadataKey = typeof MODEL_METADATA_KEYS[keyof typeof MODEL_METADATA_KEYS];
/**
 * Documented metadata keys for the `billing.*` namespace.
 *
 * These keys are conventions, not enforced by schema validation. Producers
 * SHOULD populate them when billing provenance matters (e.g., cost reconciliation,
 * audit trails, multi-model ensemble billing attribution).
 *
 * @see BB-C4-ADV-003 — Billing cross-field validation
 */
export declare const BILLING_METADATA_KEYS: {
    /**
     * Billing entry identifier (ULID) linking this event to a BillingEntry.
     * @type string
     */
    readonly ENTRY_ID: "billing.entry_id";
    /**
     * Cost in micro-USD associated with this event.
     * @type string (MicroUSDUnsigned pattern: ^[0-9]+$)
     */
    readonly COST_MICRO: "billing.cost_micro";
    /**
     * Whether this billing entry has been reconciled against the ledger.
     * @type boolean
     */
    readonly RECONCILED: "billing.reconciled";
    /**
     * Provider that generated the cost (e.g., 'anthropic', 'openai').
     * @type string
     */
    readonly PROVIDER: "billing.provider";
    /**
     * On-chain payment transaction hash for provenance tracking.
     * @type string
     */
    readonly PAYMENT_TX: "billing.payment_tx";
    /**
     * Credit lot identifier for prepaid billing reconciliation.
     * @type string
     */
    readonly CREDIT_LOT_ID: "billing.credit_lot_id";
};
export type BillingMetadataKey = typeof BILLING_METADATA_KEYS[keyof typeof BILLING_METADATA_KEYS];
/**
 * Check whether a metadata key belongs to any known namespace.
 *
 * @returns true if the key starts with a recognized namespace prefix
 */
export declare function isValidMetadataKey(key: string): boolean;
/**
 * Determine the namespace owner for a metadata key.
 *
 * @returns the owner string, or undefined if the key does not match any known namespace
 */
export declare function getNamespaceOwner(key: string): string | undefined;
//# sourceMappingURL=metadata.d.ts.map