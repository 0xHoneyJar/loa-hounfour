# Sprint Plan — Bridge Iteration 2: Bridgebuilder Findings

> Generated from Bridgebuilder review of iteration 1 (18 findings: 2 high, 5 medium, 5 low, 6 praise)

## Sprint 1: Security & Type Safety (High + Medium Findings)

**Goal**: Address both high-severity findings and all medium findings.

### S1-T1: Constraint evaluator recursion depth limit (BB-C9-001)
- Add `MAX_EXPRESSION_DEPTH = 32` constant
- Add depth counter to Parser constructor and recursive calls
- Throw descriptive error on depth exceeded
- Add test for deeply nested expressions
- **AC**: Depth > 32 throws `Error('Expression nesting exceeds maximum depth')`

### S1-T2: STATE_MACHINES satisfies pattern (BB-C9-002)
- Change `Record<string, StateMachineDefinition>` type annotation to `satisfies`
- Verify `STATE_MACHINES.nonexistent` produces TypeScript error
- **AC**: `npx tsc --noEmit` passes, literal key types preserved

### S1-T3: Formalize escrow 'funded' event (BB-C9-003)
- Add self-transition `{ from: 'held', to: 'held', event: 'economy.escrow.funded' }` to STATE_MACHINES.escrow
- Update test count expectations
- **AC**: `funded` appears in STATE_MACHINES.escrow.transitions

### S1-T4: Deprecation functions accept registry parameter (BB-C9-005)
- Add optional `registry` parameter to `getDeprecatedSchemas()` and `isDeprecated()`
- Default to DEPRECATION_REGISTRY
- Refactor tests to call real exported functions with synthetic data
- **AC**: Tests call exported functions directly, not local reimplementations

### S1-T5: parseBigintSum try/catch (BB-C9-006)
- Wrap `BigInt(String(val))` calls in parseBigintSum() in try/catch
- Return 0n on conversion failure
- Add test for non-numeric string input
- **AC**: `parseBigintSum` with non-numeric values returns 0n instead of throwing

### S1-T6: Economy flow verify semantic checks (BB-C9-007)
- Strengthen verify functions with semantic validation (e.g., score >= min_reputation)
- Add JSDoc clarifying structural vs semantic validation
- Update tests to cover semantic violation cases
- **AC**: Verify functions return false for semantically invalid linkages

## Sprint 2: Polish & Consistency (Low Findings)

**Goal**: Address all low-severity findings for protocol polish.

### S2-T1: Fix temporal property L3 formal expression (BB-C9-009)
- Remove 'vested' from L3 target set OR add clarifying comment
- Align with STATE_MACHINES.stake terminal states
- **AC**: L3 formal expression matches terminal state definitions

### S2-T2: Extract BFS helpers to shared module (BB-C9-010)
- Create `tests/helpers/state-machine-bfs.ts`
- Move `findPath()` and `reachableStates()` to shared module
- Import from both safety and liveness test files
- **AC**: No duplicate BFS implementations

### S2-T3: ProtocolLedger numeric amount handling (BB-C9-011)
- Add `typeof raw === 'number'` handling in `extractAmount()`
- Handle BigInt inputs
- Add test for numeric amount_micro values
- **AC**: Numeric amount_micro values are correctly processed

### S2-T4: Aggregate boundary schema reference validation (BB-C9-004)
- Add check:boundaries script or typed constant mapping schema names to $id values
- **AC**: Schema reference drift is detectable at CI time

### S2-T5: Consistent isValid* naming documentation (BB-C9-008)
- Add JSDoc deprecation note on `isValidTransition` re: future rename
- Track for next major version
- **AC**: Deprecation intent documented
