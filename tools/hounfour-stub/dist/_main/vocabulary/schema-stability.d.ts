import { type TSchema } from '@sinclair/typebox';
export declare const SCHEMA_STABILITY_LEVELS: {
    readonly experimental: {
        readonly label: "experimental";
        readonly description: "No stability guarantees. Schema may change or be removed in any minor version.";
        readonly breaking_change_policy: "Any change allowed in any release";
        readonly removal_timeline: "Can be removed without notice in any minor version";
    };
    readonly stable: {
        readonly label: "stable";
        readonly description: "Follows semver. Breaking changes require major version bump.";
        readonly breaking_change_policy: "Breaking changes only in major versions";
        readonly removal_timeline: "Deprecated first, removed only in major versions";
    };
    readonly deprecated: {
        readonly label: "deprecated";
        readonly description: "Scheduled for removal. Will be removed in next major version.";
        readonly breaking_change_policy: "No new features, bug fixes only";
        readonly removal_timeline: "Removed in next major version";
    };
};
export type SchemaStabilityLevel = keyof typeof SCHEMA_STABILITY_LEVELS;
/**
 * Check whether a TypeBox schema is marked as experimental.
 * Experimental schemas have `x-experimental: true` in their options.
 */
export declare function isExperimentalSchema(schema: TSchema): boolean;
//# sourceMappingURL=schema-stability.d.ts.map