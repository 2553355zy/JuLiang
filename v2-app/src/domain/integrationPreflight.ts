export type IntegrationPreflightStatus = 'pass' | 'warn' | 'fail'

export interface IntegrationPreflightCheck {
  id: string
  title: string
  status: IntegrationPreflightStatus
  evidence: string
  detail?: string
}

export interface IntegrationPreflightSummary {
  checkedAt: string
  passed: number
  warnings: number
  failed: number
  checks: IntegrationPreflightCheck[]
}
