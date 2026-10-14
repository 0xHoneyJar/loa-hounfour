import { parseIsoDateTimeStrict } from '../validators/formats.js';
function covers(parentModes, childMode) {
    if (parentModes.has('read_write'))
        return true;
    if (childMode === 'read_write')
        return parentModes.has('read') && parentModes.has('write');
    return parentModes.has(childMode);
}
function instantMs(value) {
    const parsed = parseIsoDateTimeStrict(value);
    return parsed === null ? Number.NaN : parsed.getTime();
}
/**
 * Compare an optional child bound against an optional parent bound.
 * Returns true when the child is within the parent. `lessOrEqual` receives
 * both values only when both are present.
 */
function withinBound(child, parent, lessOrEqual) {
    if (parent === undefined)
        return true;
    if (child === undefined)
        return false;
    return lessOrEqual(child, parent);
}
function bigintLe(c, p) {
    try {
        return BigInt(c) <= BigInt(p);
    }
    catch {
        return false;
    }
}
function instantLe(c, p) {
    const cm = instantMs(c);
    const pm = instantMs(p);
    // Unparseable instants compare as "not within" (fail closed).
    return !Number.isNaN(cm) && !Number.isNaN(pm) && cm <= pm;
}
/**
 * SOA-6 — is `child` within `parent`?
 *
 * Pure and total over schema-valid inputs: never reads a clock, never
 * throws. See the module JSDoc for the rule table.
 */
export function evaluateScopeInheritance(child, parent) {
    const violations = [];
    if (child.parent_scope_id !== parent.scope_id) {
        violations.push({
            code: 'PARENT_ID_MISMATCH',
            message: child.parent_scope_id === undefined
                ? `child scope is a root scope (no parent_scope_id) but was evaluated against parent ${parent.scope_id}.`
                : `child.parent_scope_id ${child.parent_scope_id} does not reference parent.scope_id ${parent.scope_id}.`,
            field: 'parent_scope_id',
            child_value: child.parent_scope_id,
            parent_value: parent.scope_id,
        });
    }
    const parentGoals = new Set(parent.permitted_sub_goals);
    child.permitted_sub_goals.forEach((goal, i) => {
        if (!parentGoals.has(goal)) {
            violations.push({
                code: 'SUB_GOAL_NOT_IN_PARENT',
                message: `sub-goal ${JSON.stringify(goal)} is not permitted by the parent scope.`,
                field: `permitted_sub_goals[${i}]`,
                child_value: goal,
            });
        }
    });
    const cb = child.side_effect_budget;
    const pb = parent.side_effect_budget;
    if (!withinBound(cb.max_cost_micro, pb.max_cost_micro, bigintLe)) {
        violations.push({
            code: 'COST_EXCEEDS_PARENT',
            message: cb.max_cost_micro === undefined
                ? `parent limits cost to ${pb.max_cost_micro} micro-USD but child sets no cost limit.`
                : `child cost limit ${cb.max_cost_micro} exceeds parent limit ${pb.max_cost_micro} micro-USD.`,
            field: 'side_effect_budget.max_cost_micro',
            child_value: cb.max_cost_micro,
            parent_value: pb.max_cost_micro,
        });
    }
    if (!withinBound(cb.max_wall_clock_ms, pb.max_wall_clock_ms, (c, p) => c <= p)) {
        violations.push({
            code: 'WALL_CLOCK_EXCEEDS_PARENT',
            message: cb.max_wall_clock_ms === undefined
                ? `parent limits wall clock to ${pb.max_wall_clock_ms} ms but child sets no wall-clock limit.`
                : `child wall-clock limit ${cb.max_wall_clock_ms} ms exceeds parent limit ${pb.max_wall_clock_ms} ms.`,
            field: 'side_effect_budget.max_wall_clock_ms',
            child_value: cb.max_wall_clock_ms,
            parent_value: pb.max_wall_clock_ms,
        });
    }
    const parentModes = new Map();
    for (const grant of pb.data_access) {
        let modes = parentModes.get(grant.resource);
        if (!modes) {
            modes = new Set();
            parentModes.set(grant.resource, modes);
        }
        modes.add(grant.mode);
    }
    cb.data_access.forEach((grant, i) => {
        const modes = parentModes.get(grant.resource);
        if (!modes || !covers(modes, grant.mode)) {
            violations.push({
                code: 'DATA_ACCESS_EXCEEDS_PARENT',
                message: `child requests ${grant.mode} on ${JSON.stringify(grant.resource)}, which the parent does not grant.`,
                field: `side_effect_budget.data_access[${i}]`,
                child_value: grant,
                parent_value: modes ? [...modes].sort() : undefined,
            });
        }
    });
    if (parent.allowed_tools !== undefined) {
        if (child.allowed_tools === undefined) {
            violations.push({
                code: 'TOOL_NOT_IN_PARENT',
                message: 'parent restricts allowed_tools but child does not, so the child would permit any tool.',
                field: 'allowed_tools',
                parent_value: parent.allowed_tools,
            });
        }
        else {
            const parentTools = new Set(parent.allowed_tools);
            child.allowed_tools.forEach((tool, i) => {
                if (!parentTools.has(tool)) {
                    violations.push({
                        code: 'TOOL_NOT_IN_PARENT',
                        message: `tool ${JSON.stringify(tool)} is not allowed by the parent scope.`,
                        field: `allowed_tools[${i}]`,
                        child_value: tool,
                    });
                }
            });
        }
    }
    const cl = child.ending_condition.latest_time;
    const pl = parent.ending_condition.latest_time;
    if (!withinBound(cl, pl, instantLe)) {
        violations.push({
            code: 'LATEST_TIME_AFTER_PARENT',
            message: cl === undefined
                ? `parent ends no later than ${pl} but child sets no latest_time.`
                : `child latest_time ${cl} is after parent latest_time ${pl}.`,
            field: 'ending_condition.latest_time',
            child_value: cl,
            parent_value: pl,
        });
    }
    if (!withinBound(child.expires_at, parent.expires_at, instantLe)) {
        violations.push({
            code: 'EXPIRES_AFTER_PARENT',
            message: child.expires_at === undefined
                ? `parent expires at ${parent.expires_at} but child sets no expires_at.`
                : `child expires_at ${child.expires_at} is after parent expires_at ${parent.expires_at}.`,
            field: 'expires_at',
            child_value: child.expires_at,
            parent_value: parent.expires_at,
        });
    }
    if (parent.stop_work.requested && !child.stop_work.requested) {
        violations.push({
            code: 'STOP_WORK_NOT_INHERITED',
            message: 'parent scope has a stop-work request that the child scope does not carry.',
            field: 'stop_work.requested',
            child_value: child.stop_work.requested,
            parent_value: parent.stop_work.requested,
        });
    }
    return { within_parent: violations.length === 0, violations };
}
/**
 * Is `scope` active at `now`? The only clock is the injected `now`.
 *
 * @throws RangeError when `now` is not a valid Date (an invalid clock
 *   cannot answer the question; failing loudly beats reporting `active`).
 */
export function evaluateScopeActivity(scope, now) {
    const t = now instanceof Date ? now.getTime() : Number.NaN;
    if (Number.isNaN(t)) {
        throw new RangeError('evaluateScopeActivity: now must be a valid Date.');
    }
    if (scope.stop_work.requested)
        return { active: false, reason: 'stop_work_requested' };
    const issued = instantMs(scope.issued_at);
    if (Number.isNaN(issued) || t < issued)
        return { active: false, reason: 'not_yet_issued' };
    if (scope.expires_at !== undefined) {
        const expires = instantMs(scope.expires_at);
        if (Number.isNaN(expires) || t >= expires)
            return { active: false, reason: 'expired' };
    }
    const latest = scope.ending_condition.latest_time;
    if (latest !== undefined) {
        const latestMs = instantMs(latest);
        if (Number.isNaN(latestMs) || t >= latestMs)
            return { active: false, reason: 'latest_time_passed' };
    }
    return { active: true, reason: 'active' };
}
//# sourceMappingURL=scope-of-autonomy-eval.js.map