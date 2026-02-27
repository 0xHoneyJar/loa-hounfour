import { Type } from '@sinclair/typebox';
/**
 * Execution mode vocabulary for agent routing.
 * Distinguishes between native runtime execution and remote model execution.
 */
export const ExecutionModeSchema = Type.Union([Type.Literal('native_runtime'), Type.Literal('remote_model')], { $id: 'ExecutionMode' });
//# sourceMappingURL=execution-mode.js.map