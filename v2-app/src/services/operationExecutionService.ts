import type { OperationAuditLog, OperationAuditSummary } from '../domain/operationAudit'
import { buildOperationIdempotencyKey, type LiveOperationResult } from '../domain/operationExecution'
import type { OperationPlan } from '../domain/types'
import type { OperationAuditRepository } from './operationAuditRepository'
import type { OperationLiveGate } from './operationPlanner'

export interface OperationExecutionService {
  previewPlans: (plans: OperationPlan[]) => Promise<OperationAuditSummary>
  confirmPlan: (plan: OperationPlan, confirmationText: string) => Promise<OperationAuditSummary>
  blockLiveExecution: (plan: OperationPlan, reason: string) => Promise<OperationAuditSummary>
  requestLiveExecution: (
    plan: OperationPlan,
    gate: OperationLiveGate | undefined,
    confirmationText: string,
  ) => Promise<{ result: LiveOperationResult; auditSummary: OperationAuditSummary }>
}

export function createOperationExecutionService(
  auditRepository: OperationAuditRepository,
): OperationExecutionService {
  return {
    async previewPlans(plans) {
      await auditRepository.saveLogs(
        plans.map((plan) => createLog(plan, 'previewed', '操作计划已进入预览队列，尚未真实执行。')),
      )
      return auditRepository.getSummary()
    },
    async confirmPlan(plan, confirmationText) {
      const expected = confirmationKeyword(plan)
      const passed = confirmationText.trim() === expected
      await auditRepository.saveLogs([
        createLog(
          plan,
          passed ? 'confirmed' : 'blocked',
          passed ? `确认词校验通过：${expected}` : `确认词不匹配，期望输入：${expected}`,
        ),
      ])
      return auditRepository.getSummary()
    },
    async blockLiveExecution(plan, reason) {
      await auditRepository.saveLogs([createLog(plan, 'blocked', reason)])
      return auditRepository.getSummary()
    },
    async requestLiveExecution(plan, gate, confirmationText) {
      const result = buildLiveExecutionResult(plan, gate, confirmationText)
      await auditRepository.saveLogs([
        createLog(plan, result.status === 'executed' ? 'executed' : 'blocked', result.message),
      ])

      return {
        result,
        auditSummary: await auditRepository.getSummary(),
      }
    },
  }
}

export function confirmationKeyword(plan: OperationPlan): string {
  if (plan.risk === 'high') return '确认高风险'
  if (plan.action.includes('预算')) return '确认预算'
  if (plan.action.includes('暂停') || plan.action.includes('关闭')) return '确认关闭'
  return '确认执行'
}

function buildLiveExecutionResult(
  plan: OperationPlan,
  gate: OperationLiveGate | undefined,
  confirmationText: string,
): LiveOperationResult {
  const idempotencyKey = buildOperationIdempotencyKey(plan)
  const checkedAt = new Date().toISOString()

  if (!gate || gate.status !== 'live_candidate') {
    return {
      planId: plan.id,
      targetId: plan.targetId,
      targetName: plan.targetName,
      action: plan.action,
      status: 'blocked',
      idempotencyKey,
      message: gate?.reason ?? '真实操作门禁未生成，禁止执行。',
      checkedAt,
    }
  }

  const expected = confirmationKeyword(plan)
  if (confirmationText.trim() !== expected) {
    return {
      planId: plan.id,
      targetId: plan.targetId,
      targetName: plan.targetName,
      action: plan.action,
      status: 'rejected',
      idempotencyKey,
      message: `确认词不匹配，期望输入：${expected}`,
      checkedAt,
    }
  }

  return {
    planId: plan.id,
    targetId: plan.targetId,
    targetName: plan.targetName,
    action: plan.action,
    status: 'not_implemented',
    idempotencyKey,
    message: '真实巨量操作执行器尚未接入；本次只完成门禁、确认词和幂等 key 检查。',
    checkedAt,
  }
}

function createLog(
  plan: OperationPlan,
  status: OperationAuditLog['status'],
  message: string,
): OperationAuditLog {
  return {
    id: `${plan.id}:${status}`,
    planId: plan.id,
    status,
    targetName: plan.targetName,
    action: plan.action,
    risk: plan.risk,
    message,
    createdAt: new Date().toISOString(),
  }
}
