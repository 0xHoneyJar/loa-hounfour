/**
 * Shared BFS helpers for state machine reachability analysis.
 *
 * Extracted from state-machine-safety.test.ts and state-machine-liveness.test.ts
 * to eliminate duplicate BFS implementations across test files.
 *
 * @see BB-C9-010 — Bridge iteration 2, Sprint 2
 */
import { STATE_MACHINES, getValidTransitions } from '../../src/vocabulary/state-machines.js';

/**
 * BFS path finder: returns the sequence of (from, to) transitions
 * from `from` to `to` in the given state machine, or null if unreachable.
 */
export function findPath(
  machineId: string,
  from: string,
  to: string,
): Array<{ from: string; to: string }> | null {
  const machine = STATE_MACHINES[machineId];
  if (!machine) return null;
  if (from === to) return [];

  const queue: Array<{ state: string; path: Array<{ from: string; to: string }> }> = [
    { state: from, path: [] },
  ];
  const visited = new Set<string>([from]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const outbound = machine.transitions.filter((t) => t.from === current.state);

    for (const transition of outbound) {
      if (visited.has(transition.to)) continue;
      visited.add(transition.to);

      const newPath = [...current.path, { from: transition.from, to: transition.to }];
      if (transition.to === to) return newPath;

      queue.push({ state: transition.to, path: newPath });
    }
  }

  return null;
}

/**
 * Returns the set of all states reachable from `startState` in the given
 * state machine via valid transitions (BFS traversal).
 */
export function reachableStates(machineId: string, startState: string): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = [startState];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const targets = getValidTransitions(machineId, current);
    for (const target of targets) {
      if (!visited.has(target)) {
        queue.push(target);
      }
    }
  }

  return visited;
}

/**
 * Returns true if at least one terminal state is reachable from
 * `startState` in the given state machine.
 */
export function canReachTerminal(machineId: string, startState: string): boolean {
  const machine = STATE_MACHINES[machineId];
  if (!machine) return false;

  const reachable = reachableStates(machineId, startState);
  return machine.terminal.some((t) => reachable.has(t));
}
