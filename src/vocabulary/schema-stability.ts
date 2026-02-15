import { type TSchema } from '@sinclair/typebox';

export const SCHEMA_STABILITY_LEVELS = {
  experimental: {
    label: 'experimental',
    description: 'No stability guarantees. Schema may change or be removed in any minor version.',
    breaking_change_policy: 'Any change allowed in any release',
    removal_timeline: 'Can be removed without notice in any minor version',
  },
  stable: {
    label: 'stable',
    description: 'Follows semver. Breaking changes require major version bump.',
    breaking_change_policy: 'Breaking changes only in major versions',
    removal_timeline: 'Deprecated first, removed only in major versions',
  },
  deprecated: {
    label: 'deprecated',
    description: 'Scheduled for removal. Will be removed in next major version.',
    breaking_change_policy: 'No new features, bug fixes only',
    removal_timeline: 'Removed in next major version',
  },
} as const;

export type SchemaStabilityLevel = keyof typeof SCHEMA_STABILITY_LEVELS;

/**
 * Check whether a TypeBox schema is marked as experimental.
 * Experimental schemas have `x-experimental: true` in their options.
 */
export function isExperimentalSchema(schema: TSchema): boolean {
  return (schema as Record<string, unknown>)['x-experimental'] === true;
}
