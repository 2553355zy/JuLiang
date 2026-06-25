import type { OperationPlan } from './types'

export type LiveOperationStatus = 'blocked' | 'rejected' | 'not_implemented' | 'executed'
export type LiveOperationType = 'adjust_budget' | 'pause' | 'resume' | 'close' | 'unknown'

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
