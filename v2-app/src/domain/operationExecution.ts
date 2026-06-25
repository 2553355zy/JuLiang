import type { OperationPlan } from './types'

export type LiveOperationStatus = 'blocked' | 'rejected' | 'not_implemented' | 'executed'

export interface LiveOperationResult {
  planId: string
  targetId: string
  targetName: string
  action: string
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
