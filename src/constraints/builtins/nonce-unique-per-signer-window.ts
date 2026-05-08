/**
 * `nonce_unique_per_signer_window` constraint builtin (FR-C1, v8.6.0).
 *
 * State-bearing replay-detection check. For a sliding time window keyed by
 * `signer_id`, asserts that the `(signer_id, nonce)` pair under validation
 * has not already been observed within the window. Returns a structured
 * diagnostic so the constraint evaluator's DSL wrapper can surface a
 * boolean while consumers reach the underlying reason via the standalone
 * function.
 *
 * **State semantics.** The check operates on per-signer `Set<nonce>`
 * histories supplied by the consumer via the validate() `nonceWindow`
 * option. A signer's set is the nonces emitted within
 * `[now - window_seconds, now]`. The library does NOT manage the sliding
 * window itself — pruning expired nonces is a consumer obligation
 * (per ADR-010, the library declares the rule, not the storage).
 *
 * **Three outcomes:**
 *   - `valid: true` (no diagnostic) when the nonce is fresh (not in the
 *     supplied window).
 *   - `valid: false` with code `NONCE_REPLAY_DETECTED` when the nonce is
 *     already in the window for the same signer.
 *   - `valid: true` with diagnostic code `NONCE_CONTEXT_DEFERRED` when
 *     the consumer did not supply a window at all — the obligation is
 *     deferred to consumer-side evaluation, mirroring the ORD-3
 *     context-absent manifest-promotion pattern from PR-A2.3.
 *
 * Cross-runner parity: the diagnostic code strings are normative across
 * the four language runners (TS / Go / Python / Rust). The `code` field
 * is the comparison surface; `message` is human-readable and not pinned
 * across runners.
 *
 * @see SDD section 5.5.2 — Nonce-window protocol (NORMATIVE)
 * @see PR-A3.2 §FR-A4 — companion ORD-3 fail-closed contract pattern
 * @since v8.6.0 — FR-C1
 */

/**
 * Normative error codes for `nonce_unique_per_signer_window`. Stable
 * across cross-language runners; mirrored in the
 * `UnverifiedObligationReason` union as `'nonce_replay_detected'` and
 * `'nonce_context_deferred'`.
 */
export type NonceBuiltinErrorCode =
  | 'NONCE_REPLAY_DETECTED'
  | 'NONCE_CONTEXT_DEFERRED'
  | 'NONCE_INVALID_INPUT';

export interface NonceBuiltinDiagnostic {
  code: NonceBuiltinErrorCode;
  /** Human-readable explanation; not pinned across runners. */
  message: string;
  /** Signer the violation applied to (when known). */
  signer_id?: string;
  /** Nonce value that triggered the diagnostic (when known). */
  nonce?: string;
}

/**
 * Per-signer nonce-window state. Each signer maps to the set of nonces
 * observed within the configured sliding window. The library does NOT
 * mutate this state; it is read-only at evaluate-time.
 *
 * Consumers populate the structure from their persistent store; the
 * pruning of expired nonces is a consumer concern per ADR-010.
 */
export interface NonceWindowState {
  /** Window length in seconds (consumer-declared; library does not enforce a default). */
  window_seconds: number;
  /** Nonces seen within the window, partitioned by signer. */
  per_signer: ReadonlyMap<string, ReadonlySet<string>>;
}

export interface EvaluateNonceUniquePerSignerWindowResult {
  valid: boolean;
  diagnostic?: NonceBuiltinDiagnostic;
}

/**
 * Standalone evaluator. The constraint-DSL wrapper at
 * `src/constraints/evaluator.ts` `parseNonceUniquePerSignerWindow()`
 * returns a boolean; direct callers wanting the structured diagnostic
 * should use this entry point.
 *
 * Argument shape mirrors the other state-bearing builtins:
 *   `nonce_unique_per_signer_window(record, signer_id_field, nonce_field, state?)`
 *
 * @param record - The single record under validation. Must be a non-null
 *                 object containing `signer_id_field` and `nonce_field`
 *                 string-typed values.
 * @param signerIdField - Name of the field on `record` carrying the
 *                        signer identifier.
 * @param nonceField - Name of the field on `record` carrying the nonce
 *                     value.
 * @param state - The per-signer window state supplied by the consumer.
 *                When `undefined`, the diagnostic is `NONCE_CONTEXT_DEFERRED`
 *                and the result is `valid: true` (the obligation surfaces
 *                via the manifest entry on the consumer side).
 */
export function evaluateNonceUniquePerSignerWindow(
  record: unknown,
  signerIdField: string,
  nonceField: string,
  state: NonceWindowState | undefined,
): EvaluateNonceUniquePerSignerWindowResult {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return {
      valid: false,
      diagnostic: {
        code: 'NONCE_INVALID_INPUT',
        message: 'nonce_unique_per_signer_window: record argument must be a non-array object',
      },
    };
  }
  const rec = record as Record<string, unknown>;
  const signerId = rec[signerIdField];
  const nonce = rec[nonceField];

  if (typeof signerId !== 'string' || typeof nonce !== 'string') {
    return {
      valid: false,
      diagnostic: {
        code: 'NONCE_INVALID_INPUT',
        message:
          `nonce_unique_per_signer_window: ${signerIdField} and ${nonceField} ` +
          'must both resolve to string values on the record',
      },
    };
  }

  // F-001 mitigation (iter-2 HIGH): runtime shape validation for state.
  // Sibling builtins (sequence-monotonic, chain-validator) validate their
  // Map state at the trust boundary; FR-C1 must inherit the same
  // discipline. Without this, a JSON-revived state (where the Set decoded
  // to an Array) would throw TypeError on `seen.has(...)`. The bridge
  // iter-2 review surfaced this as the security floor — when sibling
  // builtins share a contract, the weakest one defines the system's
  // actual safety floor.
  if (state !== undefined && !(state.per_signer instanceof Map)) {
    return {
      valid: false,
      diagnostic: {
        code: 'NONCE_INVALID_INPUT',
        message:
          'nonce_unique_per_signer_window: state.per_signer must be a Map ' +
          'instance. Consumer-supplied state crosses a trust boundary; the ' +
          'library validates the runtime shape rather than relying on ' +
          'TypeScript type erasure.',
      },
    };
  }

  // Iter-3 LOW F-002 mitigation: validate window_seconds is a finite
  // non-negative number. NaN, Infinity, negative values, or non-number
  // types would surface in diagnostics and degrade troubleshooting.
  if (
    state !== undefined &&
    (typeof state.window_seconds !== 'number' ||
      !Number.isFinite(state.window_seconds) ||
      state.window_seconds < 0)
  ) {
    return {
      valid: false,
      diagnostic: {
        code: 'NONCE_INVALID_INPUT',
        message:
          'nonce_unique_per_signer_window: state.window_seconds must be a ' +
          'finite non-negative number. NaN, Infinity, negative values, and ' +
          'non-number types are rejected at the trust boundary.',
      },
    };
  }

  if (state === undefined) {
    return {
      valid: true,
      diagnostic: {
        code: 'NONCE_CONTEXT_DEFERRED',
        message:
          `nonce_unique_per_signer_window: nonceWindow state was not supplied via ` +
          'validate() options.nonceWindow. The obligation is deferred to consumer-side ' +
          'evaluation; the consumer MUST maintain a per-signer set of nonces seen within ' +
          'the [now - window_seconds, now] window and reject any record whose nonce ' +
          'already appears in the set for its signer.',
        signer_id: signerId,
        nonce,
      },
    };
  }

  const seen = state.per_signer.get(signerId);
  // F-001 mitigation (iter-2 HIGH): also validate the inner bucket. The
  // outer per_signer Map check guarantees `state.per_signer` is a Map,
  // but `.get()` returns whatever was put in — a JSON-revived state
  // could have the bucket as an Array, plain object, or null. Validate
  // before invoking `.has()`.
  if (seen !== undefined && !(seen instanceof Set)) {
    return {
      valid: false,
      diagnostic: {
        code: 'NONCE_INVALID_INPUT',
        message:
          'nonce_unique_per_signer_window: state.per_signer.get(...) must ' +
          'return a Set instance (or be undefined for unknown signers). ' +
          'Consumer-supplied state crosses a trust boundary; the library ' +
          'validates the runtime shape rather than relying on TypeScript ' +
          'type erasure.',
        signer_id: signerId,
      },
    };
  }
  if (seen && seen.has(nonce)) {
    return {
      valid: false,
      diagnostic: {
        code: 'NONCE_REPLAY_DETECTED',
        message:
          `nonce_unique_per_signer_window: nonce "${nonce}" already observed for ` +
          `signer "${signerId}" within the ${state.window_seconds}s window — ` +
          'replay candidate. Reject the record and investigate the producer.',
        signer_id: signerId,
        nonce,
      },
    };
  }

  return { valid: true };
}
