import type { OperationAuditLog, OperationAuditSummary } from '../domain/operationAudit'
import {
  buildOperationVerificationPlan,
  buildLiveOperationAdapterRequest,
  buildOperationIdempotencyKey,
  inferLiveOperationType,
  type OperationStateSnapshot,
  type LiveOperationResult,
} from '../domain/operationExecution'
import type { OperationPlan } from '../domain/types'
import { createNoopOperationAdapter, type OperationAdapter } from './operationAdapter'
import type { OperationAuditRepository } from './operationAuditRepository'
import type { OperationLiveGate } from './operationPlanner'
import { createProjectionOperationStateReader, type OperationStateReader } from './operationStateReader'

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
  adapter: OperationAdapter = createNoopOperationAdapter(),
  stateReader: OperationStateReader = createProjectionOperationStateReader(),
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
      const beforeState = await stateReader.readBeforeState(plan)
      const result = await buildLiveExecutionResult(plan, gate, confirmationText, adapter, beforeState)
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
  adapter: OperationAdapter,
  beforeState: OperationStateSnapshot,
): Promise<LiveOperationResult> {
  const idempotencyKey = buildOperationIdempotencyKey(plan)
  const verification = buildOperationVerificationPlan(plan, beforeState)
  const checkedAt = new Date().toISOString()

  if (!gate || gate.status !== 'live_candidate') {
    return Promise.resolve({
      planId: plan.id,
      targetId: plan.targetId,
      targetName: plan.targetName,
      action: plan.action,
      operationType: inferLiveOperationType(plan),
      status: 'blocked',
      idempotencyKey,
      verification,
      message: gate?.reason ?? '真实操作门禁未生成，禁止执行。',
      checkedAt,
    })
  }

  const expected = confirmationKeyword(plan)
  if (confirmationText.trim() !== expected) {
    return Promise.resolve({
      planId: plan.id,
      targetId: plan.targetId,
      targetName: plan.targetName,
      action: plan.action,
      operationType: inferLiveOperationType(plan),
      status: 'rejected',
      idempotencyKey,
      verification,
      message: `确认词不匹配，期望输入：${expected}`,
      checkedAt,
    })
  }

  return adapter.execute(buildLiveOperationAdapterRequest(plan, beforeState))
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
