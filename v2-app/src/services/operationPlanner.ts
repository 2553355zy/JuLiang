import type { OperationPlan, RoiRecommendation } from '../domain/types'

export type OperationExecutionMode = 'readonly' | 'preview' | 'live'
export type OperationLiveGateStatus = 'live_candidate' | 'preview_only' | 'blocked'

export interface OperationQueueOptions {
  executionMode: OperationExecutionMode
  allowlistedAccountIds: string[]
}

export interface OperationLiveGate {
  planId: string
  status: OperationLiveGateStatus
  reason: string
}

export interface OperationQueueSummary {
  plans: OperationPlan[]
  gates: OperationLiveGate[]
  highRiskCount: number
  confirmationRequiredCount: number
  liveCandidateCount: number
  blockedLiveCount: number
  liveExecutionAllowed: boolean
}

export function buildOperationQueue(
  recommendations: RoiRecommendation[],
  options: OperationQueueOptions = { executionMode: 'readonly', allowlistedAccountIds: [] },
): OperationQueueSummary {
  const plans = recommendations
    .map((recommendation) => recommendation.operationPlan)
    .filter((plan): plan is OperationPlan => Boolean(plan))
  const gates = plans.map((plan) => evaluateLiveGate(plan, options))

  return {
    plans,
    gates,
    highRiskCount: plans.filter((plan) => plan.risk === 'high').length,
    confirmationRequiredCount: plans.filter((plan) => plan.requiresConfirmation).length,
    liveCandidateCount: gates.filter((gate) => gate.status === 'live_candidate').length,
    blockedLiveCount: gates.filter((gate) => gate.status === 'blocked').length,
    liveExecutionAllowed: gates.some((gate) => gate.status === 'live_candidate'),
  }
}

export function evaluateLiveGate(
  plan: OperationPlan,
  options: OperationQueueOptions,
): OperationLiveGate {
  if (options.executionMode === 'readonly') {
    return {
      planId: plan.id,
      status: 'blocked',
      reason: '当前是 readonly 模式，禁止进入真实操作。',
    }
  }

  if (options.executionMode === 'preview') {
    return {
      planId: plan.id,
      status: 'preview_only',
      reason: '当前是 preview 模式，只允许预览、确认和审计。',
    }
  }

  if (plan.targetType !== 'account') {
    return {
      planId: plan.id,
      status: 'blocked',
      reason: '当前只允许账号级操作进入真实候选。',
    }
  }

  if (!options.allowlistedAccountIds.includes(plan.targetId)) {
    return {
      planId: plan.id,
      status: 'blocked',
      reason: '目标账号不在真实操作白名单内。',
    }
  }

  return {
    planId: plan.id,
    status: 'live_candidate',
    reason: '执行模式为 live，且目标账号在白名单内；仍需确认词和审计。',
  }
}
