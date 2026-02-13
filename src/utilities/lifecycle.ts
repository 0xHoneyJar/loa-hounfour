/**
 * Generic state transition validator factory.
 * Used by agent lifecycle (v2.0.0) and tool lifecycle (v2.1.0).
 */

export interface TransitionValidator<T extends string> {
  /** Check whether a transition from `from` to `to` is valid. */
  isValid(from: T, to: T): boolean;
  /** Get all valid target states from the given state. */
  getValidTargets(from: T): readonly T[];
}

/**
 * Create a transition validator from a state transition map.
 *
 * @param transitions - Map of state → valid target states
 * @returns Validator with `isValid` and `getValidTargets` methods
 */
export function createTransitionValidator<T extends string>(
  transitions: Record<T, readonly T[]>,
): TransitionValidator<T> {
  return {
    isValid(from: T, to: T): boolean {
      const targets = transitions[from];
      return targets !== undefined && (targets as readonly string[]).includes(to);
    },
    getValidTargets(from: T): readonly T[] {
      return transitions[from] ?? [];
    },
  };
}
