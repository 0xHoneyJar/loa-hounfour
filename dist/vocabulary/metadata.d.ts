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
//# sourceMappingURL=metadata.d.ts.map