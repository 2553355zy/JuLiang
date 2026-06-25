import type { OperationPlan, RoiRecommendation } from '../domain/types'

export interface OperationQueueSummary {
  plans: OperationPlan[]
  highRiskCount: number
  confirmationRequiredCount: number
  liveExecutionAllowed: boolean
}

export function buildOperationQueue(recommendations: RoiRecommendation[]): OperationQueueSummary {
  const plans = recommendations
    .map((recommendation) => recommendation.operationPlan)
    .filter((plan): plan is OperationPlan => Boolean(plan))

  return {
    plans,
    highRiskCount: plans.filter((plan) => plan.risk === 'high').length,
    confirmationRequiredCount: plans.filter((plan) => plan.requiresConfirmation).length,
    liveExecutionAllowed: false,
  }
}

