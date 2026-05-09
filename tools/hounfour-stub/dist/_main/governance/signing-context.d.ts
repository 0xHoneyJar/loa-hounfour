/**
 * Signing context — audience/scope/contract_version envelope bound under signature.
 *
 * Shared sub-schema referenced by PanelVerdictSchema, CrossScoreReportSchema,
 * and OrgRepresentativeDelegationSchema. Provides protocol-level cross-context
 * replay protection (consumers reject signatures whose `signing_context` does
 * not match the local audience/scope), analogous to JWT `aud` claims and
 * AWS SigV4 scope binding.
 *
 * @see SDD section 3.3.2 — `signing_context` field on PanelVerdict
 * @since v8.4.0
 */
import { type Static } from '@sinclair/typebox';
export declare const SigningContextSchema: import("@sinclair/typebox").TObject<{
    audience: import("@sinclair/typebox").TString;
    scope: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type SigningContext = Static<typeof SigningContextSchema>;
//# sourceMappingURL=signing-context.d.ts.map