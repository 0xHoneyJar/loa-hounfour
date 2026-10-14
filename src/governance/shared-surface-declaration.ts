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
 * @see docs/patterns/proposer-is-not-executor.md (shared surfaces section)
 * @see ADR-010 — class-vs-policy boundary.
 * @since v8.8.0 — FR-C3 (PR-C3).
 */
import { Type, type Static } from '@sinclair/typebox';
import {
  describeNonObject,
  duplicateStrings,
  isPlainRecord,
} from './separation-of-duties-local.js';

const AGENT_ID = Type.String({
  minLength: 1,
  maxLength: 256,
  description:
    'Consumer-shaped agent identifier, compared by exact string ' +
    'equality (SSD-N4).',
});

export const SharedSurfaceKindSchema = Type.Union(
  [
    Type.Literal('cache'),
    Type.Literal('queue'),
    Type.Literal('scratch_dir'),
    Type.Literal('object_store'),
    Type.Literal('message_board'),
    Type.Literal('database'),
    Type.Literal('other'),
  ],
  { description: 'Kind of shared surface.' },
);
export type SharedSurfaceKind = Static<typeof SharedSurfaceKindSchema>;

export const SharedSurfaceDeclarationSchema = Type.Object(
  {
    surface_id: Type.String({
      format: 'uuid',
      description: 'Stable opaque identifier for this declaration (UUID).',
    }),
    kind: SharedSurfaceKindSchema,
    locator: Type.String({
      minLength: 1,
      maxLength: 1024,
      description:
        'Opaque URI or path naming the surface. Not parsed by the ' +
        'library (SSD-N1); uniqueness across declarations is SSD-5, ' +
        'runtime-deferred.',
    }),
    owner_agent_id: Type.String({
      minLength: 1,
      maxLength: 256,
      description:
        'Agent accountable for the surface. MUST appear in ' +
        'writer_agent_ids (SSD-1).',
    }),
    writer_agent_ids: Type.Array(AGENT_ID, {
      minItems: 1,
      maxItems: 256,
      description:
        'Every agent permitted to write to the surface. Entries are ' +
        'distinct (SSD-3) and include the owner (SSD-1). Runtime ' +
        'writers outside this list are the SSD-6 violation.',
    }),
    reader_agent_ids: Type.Array(AGENT_ID, {
      maxItems: 1024,
      description:
        'Every agent permitted to read the surface. May be empty. ' +
        'Entries are distinct (SSD-4). No relationship to the writer ' +
        'list is required (SSD-N2, SSD-N3).',
    }),
    single_writer: Type.Boolean({
      description:
        'True when exactly one agent writes to the surface. When true, ' +
        'writer_agent_ids has exactly one entry (SSD-2).',
    }),
    audit_trail_id: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: 256,
        description:
          'Optional opaque pointer to the audit trail that records ' +
          'writes to the surface. Not resolved (SSD-N6).',
      }),
    ),
    retention: Type.Optional(
      Type.Object(
        {
          max_age_ms: Type.Optional(
            Type.Integer({
              minimum: 0,
              maximum: 9_007_199_254_740_991,
              description: 'Maximum age of an entry, in milliseconds.',
            }),
          ),
          max_entries: Type.Optional(
            Type.Integer({
              minimum: 0,
              maximum: 9_007_199_254_740_991,
              description: 'Maximum number of retained entries.',
            }),
          ),
        },
        {
          additionalProperties: false,
          description:
            'Optional declared retention. Declarative only (SSD-N5).',
        },
      ),
    ),
    declared_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp at which the declaration was made.',
    }),
    declared_by: Type.String({
      minLength: 1,
      maxLength: 256,
      description:
        'Actor that made the declaration. Need not be the owner (SSD-N7).',
    }),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description:
        'Hounfour contract version this declaration was authored against.',
    }),
  },
  {
    $id: 'SharedSurfaceDeclaration',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description:
      'Declaration of a surface shared between agents: owner, writers, ' +
      'readers and single-writer flag. The library enforces owner-is-' +
      'a-writer (SSD-1), single-writer consistency (SSD-2) and distinct ' +
      'writer and reader lists (SSD-3, SSD-4); locator uniqueness and ' +
      'runtime writer conformance are consumer-side (SSD-5, SSD-6).',
  },
);
export type SharedSurfaceDeclaration = Static<
  typeof SharedSurfaceDeclarationSchema
>;

/**
 * `validateSharedSurfaceDeclaration` — cross-field validator for SSD-1,
 * SSD-2, SSD-3 and SSD-4.
 *
 * Callers normally reach this through `validate(...)`, which runs the
 * structural tier first. Direct callers get defensive behaviour: the
 * function never throws; a non-object input, or a non-array writer or
 * reader list, returns a tagged structural-precondition error. All
 * violated rules are reported.
 *
 * @since v8.8.0 — FR-C3 (PR-C3).
 */
export function validateSharedSurfaceDeclaration(data: unknown): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  if (!isPlainRecord(data)) {
    return {
      valid: false,
      errors: [
        `SSD: structural shape precondition failed — input must be a non-null object (SharedSurfaceDeclaration record); got ${describeNonObject(data)}.`,
      ],
      warnings: [],
    };
  }
  const writers = data.writer_agent_ids;
  const readers = data.reader_agent_ids;
  if (!Array.isArray(writers) || !Array.isArray(readers)) {
    return {
      valid: false,
      errors: [
        'SSD: structural shape precondition failed — writer_agent_ids and reader_agent_ids must both be arrays; the cross-field validator requires the structural tier (Value.Check) to have passed first.',
      ],
      warnings: [],
    };
  }

  const errors: string[] = [];
  const owner = data.owner_agent_id;

  // SSD-1: owner is a writer.
  if (!writers.includes(owner)) {
    errors.push(
      `SSD-1: owner_agent_id "${String(owner)}" does not appear in writer_agent_ids — the owner of a shared surface MUST be one of its declared writers.`,
    );
  }

  // SSD-2: single_writer implies exactly one writer.
  if (data.single_writer === true && writers.length !== 1) {
    errors.push(
      `SSD-2: single_writer is true but writer_agent_ids has ${writers.length} entries — a single-writer surface MUST declare exactly one writer.`,
    );
  }

  // SSD-3: writers distinct.
  for (const dup of duplicateStrings(writers)) {
    errors.push(
      `SSD-3: writer_agent_ids entry "${dup.value}" appears at indices ${dup.indices.join(', ')} — writer entries MUST be distinct.`,
    );
  }

  // SSD-4: readers distinct.
  for (const dup of duplicateStrings(readers)) {
    errors.push(
      `SSD-4: reader_agent_ids entry "${dup.value}" appears at indices ${dup.indices.join(', ')} — reader entries MUST be distinct.`,
    );
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}
