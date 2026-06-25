import type { OperationStateSnapshot } from '../domain/operationExecution'
import type { OperationPlan } from '../domain/types'

export interface OperationStateReader {
  readBeforeState: (plan: OperationPlan) => Promise<OperationStateSnapshot>
}

export interface OceanEngineOperationStateClient {
  getAccountState: (accountId: string) => Promise<{
    budget?: number
    status?: OperationStateSnapshot['status']
    source?: OperationStateSnapshot['source']
  }>
}

export function createElectronOperationStateClient(): OceanEngineOperationStateClient | null {
  if (typeof window === 'undefined' || !window.juliang?.operationState) return null

  return {
    getAccountState: window.juliang.operationState.getAccountState,
  }
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

export function createOceanEngineOperationStateReader(
  client?: OceanEngineOperationStateClient,
): OperationStateReader {
  return {
    async readBeforeState(plan) {
      if (!client) return buildNotConfiguredSnapshot()
      if (plan.targetType !== 'account') return buildUnavailableSnapshot()

      const state = await client.getAccountState(plan.targetId)
      return {
        capturedAt: new Date().toISOString(),
        budget: state.budget,
        status: state.status ?? 'unknown',
        source: state.source ?? 'oceanengine',
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

function buildNotConfiguredSnapshot(): OperationStateSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    source: 'not_configured',
  }
}

function buildUnavailableSnapshot(): OperationStateSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    source: 'unavailable',
  }
}
