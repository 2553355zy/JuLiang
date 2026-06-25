import type { OperationPlan } from './types'

export type OperationAuditStatus = 'previewed' | 'confirmed' | 'blocked' | 'executed' | 'verification_failed'

export interface OperationAuditLog {
  id: string
  planId: string
  status: OperationAuditStatus
  targetName: string
  action: string
  risk: OperationPlan['risk']
  message: string
  createdAt: string
}

export interface OperationAuditSummary {
  total: number
  previewed: number
  confirmed: number
  blocked: number
  executed: number
  verificationFailed: number
  lastLog?: OperationAuditLog
}
