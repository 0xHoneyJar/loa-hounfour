/**
 * Three-economy integration flow vocabulary.
 *
 * Describes how the three economies (Reputation, Routing, Billing) connect:
 *   Performance -> Reputation -> Routing -> Billing
 *
 * This is a vocabulary (descriptive), not a runtime enforcer.
 * Consumers use this to understand the intended data flow.
 *
 * @see BB-V4-DEEP-005
 */
export interface EconomyFlowEntry {
    source_schema: string;
    target_schema: string;
    linking_field: string;
    description: string;
    verify?: (source: Record<string, unknown>, target: Record<string, unknown>) => {
        valid: boolean;
        reason?: string;
    };
}
export declare const ECONOMY_FLOW: readonly EconomyFlowEntry[];
/**
 * Verify a source/target record pair against a specific economy flow entry.
 *
 * If the flow entry has no verify function, returns `{ valid: true }` (open-world assumption).
 */
export declare function verifyEconomyFlow(source: Record<string, unknown>, target: Record<string, unknown>, flowEntry: EconomyFlowEntry): {
    valid: boolean;
    reason?: string;
};
//# sourceMappingURL=economy-integration.d.ts.map