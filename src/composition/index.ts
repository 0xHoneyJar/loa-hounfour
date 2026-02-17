/**
 * Composition sub-package barrel.
 *
 * Unified entry point for cross-domain composition types:
 * registry bridges, exchange rates, minting policies, and delegation trees.
 *
 * @since v6.0.0
 */

// Registry Composition (economy domain)
export {
  BridgeEnforcementSchema,
  BridgeInvariantSchema,
  ExchangeRateTypeSchema,
  ExchangeRateSpecSchema,
  SettlementPolicySchema,
  RegistryBridgeSchema,
  type BridgeEnforcement,
  type BridgeInvariant,
  type ExchangeRateType,
  type ExchangeRateSpec,
  type SettlementPolicy,
  type RegistryBridge,
} from '../economy/registry-composition.js';

// Minting Policy (economy domain)
export {
  MintingPolicySchema,
  type MintingPolicy,
} from '../economy/minting-policy.js';

// Delegation Tree (governance domain)
export {
  ForkTypeSchema,
  TreeNodeStatusSchema,
  TreeStrategySchema,
  BudgetAllocationSchema,
  DelegationTreeNodeSchema,
  DelegationTreeSchema,
  chainToTree,
  treeToChain,
  type ForkType,
  type TreeNodeStatus,
  type TreeStrategy,
  type BudgetAllocation,
  type DelegationTreeNode,
  type DelegationTree,
} from '../governance/delegation-tree.js';
