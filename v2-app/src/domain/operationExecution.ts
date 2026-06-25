import type { OperationPlan } from './types'

export type LiveOperationStatus = 'blocked' | 'rejected' | 'not_implemented' | 'executed'
export type LiveOperationType = 'adjust_budget' | 'pause' | 'resume' | 'close' | 'unknown'
export type BudgetAdjustmentDirection = 'increase' | 'decrease'

export interface OperationStateSnapshot {
  capturedAt: string
  budget?: number
  status?: 'running' | 'paused' | 'closed' | 'unknown'
  source: 'unavailable' | 'mock' | 'oceanengine'
}

export interface OperationExpectedChange {
  field: 'budget' | 'status'
  from?: number | string
  to?: number | string
  description: string
}

export interface OperationVerificationPlan {
  before: OperationStateSnapshot
  expectedChanges: OperationExpectedChange[]
  verifyFields: Array<OperationExpectedChange['field']>
}

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
  verification: OperationVerificationPlan
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
  verification: OperationVerificationPlan
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
    verification: buildOperationVerificationPlan(plan),
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

export function buildOperationVerificationPlan(plan: OperationPlan): OperationVerificationPlan {
  const params = inferLiveOperationParams(plan)
  const before = buildUnavailableSnapshot()

  if (params.operationType === 'adjust_budget') {
    return {
      before,
      expectedChanges: [
        {
          field: 'budget',
          description: `预算${params.direction === 'increase' ? '上调' : '下调'} ${params.percent}%`,
        },
      ],
      verifyFields: ['budget'],
    }
  }

  if (params.operationType === 'pause') {
    return buildStatusVerificationPlan(before, 'paused', '账号或单元应变为暂停状态')
  }

  if (params.operationType === 'resume') {
    return buildStatusVerificationPlan(before, 'running', '账号或单元应恢复运行')
  }

  if (params.operationType === 'close') {
    return buildStatusVerificationPlan(before, 'closed', '账号或单元应变为关闭状态')
  }

  return {
    before,
    expectedChanges: [],
    verifyFields: [],
  }
}

function buildUnavailableSnapshot(): OperationStateSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    source: 'unavailable',
  }
}

function buildStatusVerificationPlan(
  before: OperationStateSnapshot,
  to: NonNullable<OperationStateSnapshot['status']>,
  description: string,
): OperationVerificationPlan {
  return {
    before,
    expectedChanges: [
      {
        field: 'status',
        to,
        description,
      },
    ],
    verifyFields: ['status'],
  }
}
