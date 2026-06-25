import type { LiveOperationAdapterRequest, LiveOperationResult } from '../domain/operationExecution'

export interface OperationAdapter {
  execute: (request: LiveOperationAdapterRequest) => Promise<LiveOperationResult>
}

export function createNoopOperationAdapter(): OperationAdapter {
  return {
    async execute(request) {
      return {
        planId: request.planId,
        targetId: request.target.id,
        targetName: request.target.name,
        action: request.rawAction,
        operationType: request.operationType,
        status: 'not_implemented',
        idempotencyKey: request.idempotencyKey,
        message: formatNoopMessage(request),
        checkedAt: new Date().toISOString(),
      }
    },
  }
}

function formatNoopMessage(request: LiveOperationAdapterRequest): string {
  const operationLabel = formatOperationType(request.operationType)
  return `真实巨量 ${operationLabel} 适配器尚未接入；本次只完成门禁、确认词、参数结构和幂等 key 检查。`
}

function formatOperationType(operationType: LiveOperationAdapterRequest['operationType']): string {
  const labels: Record<LiveOperationAdapterRequest['operationType'], string> = {
    adjust_budget: '预算调整',
    pause: '暂停',
    resume: '恢复',
    close: '关闭',
    unknown: '未知操作',
  }

  return labels[operationType]
}
