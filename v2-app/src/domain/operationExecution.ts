import type { OperationPlan } from './types'

export type LiveOperationStatus = 'blocked' | 'rejected' | 'not_implemented' | 'executed'
export type LiveOperationType = 'adjust_budget' | 'pause' | 'resume' | 'close' | 'unknown'
export type BudgetAdjustmentDirection = 'increase' | 'decrease'

export type LiveOperationParams =
  | {
      operationType: 'adjust_budget'
      direction: BudgetAdjustmentDirection
      percent: number
    }
  | {
      operationType: 'pause' | 'resume' | 'close' | 'unknown'
    }

export interface LiveOperationTarget {
  type: OperationPlan['targetType']
  id: string
  name: string
}

export interface LiveOperationAdapterRequest {
  operationType: LiveOperationType
  target: LiveOperationTarget
  planId: string
  rawAction: string
  reason: string
  params: LiveOperationParams
  idempotencyKey: string
}

export interface LiveOperationResult {
  planId: string
  targetId: string
  targetName: string
  action: string
  operationType: LiveOperationType
  status: LiveOperationStatus
  idempotencyKey: string
  message: string
  checkedAt: string
}

export function buildOperationIdempotencyKey(plan: OperationPlan): string {
  return [
    plan.targetType,
    plan.targetId,
    plan.id,
  ].join(':')
}

export function buildLiveOperationAdapterRequest(plan: OperationPlan): LiveOperationAdapterRequest {
  return {
    operationType: inferLiveOperationType(plan),
    target: {
      type: plan.targetType,
      id: plan.targetId,
      name: plan.targetName,
    },
    planId: plan.id,
    rawAction: plan.action,
    reason: plan.reason,
    params: inferLiveOperationParams(plan),
    idempotencyKey: buildOperationIdempotencyKey(plan),
  }
}

export function inferLiveOperationType(plan: OperationPlan): LiveOperationType {
  if (plan.action.includes('预算')) return 'adjust_budget'
  if (plan.action.includes('暂停')) return 'pause'
  if (plan.action.includes('恢复') || plan.action.includes('开启')) return 'resume'
  if (plan.action.includes('关闭')) return 'close'
  return 'unknown'
}

export function inferLiveOperationParams(plan: OperationPlan): LiveOperationParams {
  const operationType = inferLiveOperationType(plan)

  if (operationType !== 'adjust_budget') {
    return { operationType }
  }

  const direction: BudgetAdjustmentDirection = plan.action.includes('下调') ? 'decrease' : 'increase'
  const percentMatch = plan.action.match(/(\d+(?:\.\d+)?)\s*%/)
  const percent = percentMatch ? Number(percentMatch[1]) : 0

  return {
    operationType,
    direction,
    percent,
  }
}
