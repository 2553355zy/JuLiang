export type SoftwareCenterRunStatus = 'success' | 'failed'
export type SoftwareCenterRunTrigger = 'startup' | 'manual'

export interface SoftwareCenterRunCounts {
  advertisers: number
  reportRows: number
  fundRows: number
  diagnostics: number
  materialSignals: number
  notificationDrafts: number
  operationPlans: number
}

export interface SoftwareCenterRun {
  id: string
  trigger: SoftwareCenterRunTrigger
  status: SoftwareCenterRunStatus
  startedAt: string
  finishedAt: string
  durationMs: number
  dataSource: string
  metricSource: string
  counts: SoftwareCenterRunCounts
  error?: string
}

export interface SoftwareCenterRunSummary {
  total: number
  success: number
  failed: number
  lastRun?: SoftwareCenterRun
}
