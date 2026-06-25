import type {
  LiveOperationAdapterRequest,
  LiveOperationResult,
  LiveOperationType,
} from '../domain/operationExecution'

export interface OperationAdapter {
  execute: (request: LiveOperationAdapterRequest) => Promise<LiveOperationResult>
}

export interface OperationAdapterValidationResult {
  valid: boolean
  errors: string[]
}

export function createNoopOperationAdapter(): OperationAdapter {
  return {
    async execute(request) {
      const validation = validateLiveOperationAdapterRequest(request)
      if (!validation.valid) {
        return buildResult(request, 'rejected', `操作参数校验失败：${validation.errors.join('；')}`)
      }

      const paramsSummary = formatParamsSummary(request)
      return {
        ...buildResult(request, 'not_implemented', formatNoopMessage(request)),
        message: `${formatNoopMessage(request)}${paramsSummary ? ` 参数：${paramsSummary}。` : ''}`,
      }
    },
  }
}

export function validateLiveOperationAdapterRequest(
  request: LiveOperationAdapterRequest,
): OperationAdapterValidationResult {
  const errors: string[] = []

  if (!request.planId.trim()) errors.push('缺少 planId')
  if (!request.target.id.trim()) errors.push('缺少目标账号 ID')
  if (!request.target.name.trim()) errors.push('缺少目标名称')
  if (!request.idempotencyKey.includes(request.planId) || !request.idempotencyKey.includes(request.target.id)) {
    errors.push('幂等 key 未包含目标 ID 和计划 ID')
  }
  if (request.target.type !== 'account') errors.push('当前只允许账号级真实操作')
  if (request.operationType === 'unknown') errors.push('无法识别操作类型')
  if (request.reason.trim().length < 4) errors.push('操作原因过短')

  if (request.operationType === 'adjust_budget') {
    if (request.params.operationType !== 'adjust_budget') {
      errors.push('预算操作参数类型不匹配')
    } else {
      if (!['increase', 'decrease'].includes(request.params.direction)) {
        errors.push('预算调整方向无效')
      }
      if (!Number.isFinite(request.params.percent) || request.params.percent <= 0) {
        errors.push('预算调整比例必须大于 0')
      }
      if (request.params.percent > 50) {
        errors.push('单次预算调整比例不能超过 50%')
      }
    }
  }

  if (['pause', 'resume', 'close'].includes(request.operationType) && request.params.operationType !== request.operationType) {
    errors.push('状态操作参数类型不匹配')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function formatNoopMessage(request: LiveOperationAdapterRequest): string {
  const operationLabel = formatOperationType(request.operationType)
  return `真实巨量 ${operationLabel} 适配器尚未接入；本次只完成门禁、确认词、参数结构和幂等 key 检查。`
}

function buildResult(
  request: LiveOperationAdapterRequest,
  status: LiveOperationResult['status'],
  message: string,
): LiveOperationResult {
  return {
    planId: request.planId,
    targetId: request.target.id,
    targetName: request.target.name,
    action: request.rawAction,
    operationType: request.operationType,
    status,
    idempotencyKey: request.idempotencyKey,
    message,
    checkedAt: new Date().toISOString(),
  }
}

function formatParamsSummary(request: LiveOperationAdapterRequest): string {
  if (request.params.operationType === 'adjust_budget') {
    return `${request.params.direction === 'increase' ? '上调' : '下调'} ${request.params.percent}%`
  }

  return ''
}

function formatOperationType(operationType: LiveOperationType): string {
  const labels: Record<LiveOperationType, string> = {
    adjust_budget: '预算调整',
    pause: '暂停',
    resume: '恢复',
    close: '关闭',
    unknown: '未知操作',
  }

  return labels[operationType]
}
