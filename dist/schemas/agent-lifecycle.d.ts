/**
 * 6-state agent lifecycle machine.
 *
 * DORMANT → PROVISIONING → ACTIVE → SUSPENDED → ACTIVE (cycle)
 *                                 → TRANSFERRED → PROVISIONING (new owner)
 *                                 → ARCHIVED (terminal)
 */
export declare const AGENT_LIFECYCLE_STATES: readonly ["DORMANT", "PROVISIONING", "ACTIVE", "SUSPENDED", "TRANSFERRED", "ARCHIVED"];
export type AgentLifecycleState = (typeof AGENT_LIFECYCLE_STATES)[number];
export declare const AgentLifecycleStateSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"DORMANT">, import("@sinclair/typebox").TLiteral<"PROVISIONING">, import("@sinclair/typebox").TLiteral<"ACTIVE">, import("@sinclair/typebox").TLiteral<"SUSPENDED">, import("@sinclair/typebox").TLiteral<"TRANSFERRED">, import("@sinclair/typebox").TLiteral<"ARCHIVED">]>;
/**
 * Valid state transitions. ARCHIVED is terminal (no outgoing edges).
 */
export declare const AGENT_LIFECYCLE_TRANSITIONS: Record<AgentLifecycleState, readonly AgentLifecycleState[]>;
/**
 * Check whether a lifecycle transition is valid.
 */
export declare function isValidTransition(from: AgentLifecycleState, to: AgentLifecycleState): boolean;
//# sourceMappingURL=agent-lifecycle.d.ts.map