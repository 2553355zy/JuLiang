import type { OperationStateSnapshot } from '../domain/operationExecution'
import type { OperationPlan } from '../domain/types'

export interface OperationStateReader {
  readBeforeState: (plan: OperationPlan) => Promise<OperationStateSnapshot>
}

export function createProjectionOperationStateReader(): OperationStateReader {
  return {
    async readBeforeState(plan) {
      if (!plan.stateHint) return buildUnavailableSnapshot()

      return {
        capturedAt: plan.stateHint.capturedAt ?? new Date().toISOString(),
        budget: plan.stateHint.budget,
        status: plan.stateHint.status,
        source: plan.stateHint.source,
      }
    },
  }
}

export function createUnavailableOperationStateReader(): OperationStateReader {
  return {
    async readBeforeState() {
      return buildUnavailableSnapshot()
    },
  }
}

function buildUnavailableSnapshot(): OperationStateSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    source: 'unavailable',
  }
}
