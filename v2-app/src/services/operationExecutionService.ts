import type { OperationAuditLog, OperationAuditSummary } from '../domain/operationAudit'
import type { OperationPlan } from '../domain/types'
import type { OperationAuditRepository } from './operationAuditRepository'

export interface OperationExecutionService {
  previewPlans: (plans: OperationPlan[]) => Promise<OperationAuditSummary>
  confirmPlan: (plan: OperationPlan, confirmationText: string) => Promise<OperationAuditSummary>
  blockLiveExecution: (plan: OperationPlan, reason: string) => Promise<OperationAuditSummary>
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
  }
}

export function confirmationKeyword(plan: OperationPlan): string {
  if (plan.risk === 'high') return '确认高风险'
  if (plan.action.includes('预算')) return '确认预算'
  if (plan.action.includes('暂停') || plan.action.includes('关闭')) return '确认关闭'
  return '确认执行'
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

