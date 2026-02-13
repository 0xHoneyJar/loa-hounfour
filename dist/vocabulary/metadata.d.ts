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
    /** Consumer-defined extensions. */
    readonly CONSUMER: "x-";
};
export type MetadataNamespace = typeof METADATA_NAMESPACES[keyof typeof METADATA_NAMESPACES];
//# sourceMappingURL=metadata.d.ts.map