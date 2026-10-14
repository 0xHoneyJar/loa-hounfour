/**
 * `SharedSurfaceDeclarationSchema` — declaration of a surface that
 * several agents share (FR-C3, SDD §2, v8.8.0).
 *
 * A shared surface is anything more than one agent can read or write:
 * a cache, a queue, a scratch directory, an object-store prefix, a
 * message board, a database table. The failure this schema exists for
 * is the undeclared one — a cache that, by accretion, became a message
 * board between agents, with no record of who was supposed to write
 * to it. The declaration names the owner, the writers, the readers and
 * whether the surface is single-writer, so that runtime observation
 * (SSD-6) has something to be checked against.
 *
 * **Not crypto-bearing.** A declaration is a statement of intent, not
 * a signed claim. Consumers that need non-repudiation wrap it in
 * `SignatureEnvelope` (v8.5.0) per their own policy (ADR-010).
 *
 * **Schema-level invariants** (constraint file
 * `constraints/SharedSurfaceDeclaration.constraints.json`):
 *   - SSD-1 (library): `owner_agent_id` is one of `writer_agent_ids`.
 *   - SSD-2 (library): `single_writer` is false, or
 *     `writer_agent_ids` has exactly one entry (which, by SSD-1, is
 *     the owner).
 *   - SSD-3 (library): `writer_agent_ids` entries are distinct.
 *   - SSD-4 (library): `reader_agent_ids` entries are distinct.
 *   - SSD-5 (runtime-deferred): `locator` is unique across the
 *     consumer's declarations. Needs the consumer's registry.
 *   - SSD-6 (runtime-deferred): every agent observed writing to the
 *     surface at runtime appears in `writer_agent_ids`. Needs runtime
 *     observation; this is the check the declaration exists to enable.
 *
 * **Explicit non-constraints** (ADR-010; rules a reviewer might expect
 * that the library deliberately leaves to consumers):
 *   - SSD-N1: the library does NOT parse `locator`. It is an opaque
 *     URI or path; scheme, normalisation and equivalence (two
 *     locators naming one surface) are consumer concerns, which is why
 *     SSD-5 is runtime-deferred.
 *   - SSD-N2: there is NO rule that a reader must also be a writer, or
 *     that a writer must also be listed as a reader. Write-only
 *     producers and read-only consumers are both legitimate.
 *   - SSD-N3: there is NO rule that writers and readers are disjoint,
 *     and NO rule that the owner appears in `reader_agent_ids`.
 *   - SSD-N4: agent identifiers are compared by exact string equality
 *     (SSD-1, SSD-3, SSD-4). The library does not normalise them.
 *   - SSD-N5: `retention` is declarative. The library does not check
 *     that the surface honours it, and an absent `retention` does not
 *     mean "retain forever"; it means "not declared".
 *   - SSD-N6: `audit_trail_id` is an opaque pointer; the library does
 *     not resolve it or require it. Whether a surface must carry an
 *     audit trail is consumer policy.
 *   - SSD-N7: `declared_by` need not be the owner. A platform operator
 *     may declare a surface on an agent's behalf; whether that is
 *     allowed is consumer policy.
 *
 * **Timestamp decision**: `declared_at` uses `ISO8601_UTC_PATTERN`
 * (Z suffix only), not `format: 'date-time'`, so that both schemas in
 * SDD §2 share one timestamp form with `IrreversibleActionAttestation`
 * and cross-runner byte identity holds. Offset forms such as
 * `+02:00` are rejected; producers convert to UTC first.
 *
 * @see docs/patterns/proposer-is-not-executor.md (shared surfaces section)
 * @see ADR-010 — class-vs-policy boundary.
 * @since v8.8.0 — FR-C3 (PR-C3).
 */
import { type Static } from '@sinclair/typebox';
export declare const SharedSurfaceKindSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cache">, import("@sinclair/typebox").TLiteral<"queue">, import("@sinclair/typebox").TLiteral<"scratch_dir">, import("@sinclair/typebox").TLiteral<"object_store">, import("@sinclair/typebox").TLiteral<"message_board">, import("@sinclair/typebox").TLiteral<"database">, import("@sinclair/typebox").TLiteral<"other">]>;
export type SharedSurfaceKind = Static<typeof SharedSurfaceKindSchema>;
export declare const SharedSurfaceDeclarationSchema: import("@sinclair/typebox").TObject<{
    surface_id: import("@sinclair/typebox").TString;
    kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cache">, import("@sinclair/typebox").TLiteral<"queue">, import("@sinclair/typebox").TLiteral<"scratch_dir">, import("@sinclair/typebox").TLiteral<"object_store">, import("@sinclair/typebox").TLiteral<"message_board">, import("@sinclair/typebox").TLiteral<"database">, import("@sinclair/typebox").TLiteral<"other">]>;
    locator: import("@sinclair/typebox").TString;
    owner_agent_id: import("@sinclair/typebox").TString;
    writer_agent_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    reader_agent_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    single_writer: import("@sinclair/typebox").TBoolean;
    audit_trail_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    retention: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        max_age_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        max_entries: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>>;
    declared_at: import("@sinclair/typebox").TString;
    declared_by: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type SharedSurfaceDeclaration = Static<typeof SharedSurfaceDeclarationSchema>;
/**
 * `validateSharedSurfaceDeclaration` — cross-field validator for SSD-1,
 * SSD-2, SSD-3 and SSD-4.
 *
 * Callers normally reach this through `validate(...)`, which runs the
 * structural tier first. Direct callers get defensive behaviour: the
 * function never throws; a non-object input, a non-array writer or
 * reader list, or an `owner_agent_id` that is not a non-empty string
 * returns a tagged structural-precondition error. All
 * violated rules are reported.
 *
 * @since v8.8.0 — FR-C3 (PR-C3).
 */
export declare function validateSharedSurfaceDeclaration(data: unknown): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
//# sourceMappingURL=shared-surface-declaration.d.ts.map