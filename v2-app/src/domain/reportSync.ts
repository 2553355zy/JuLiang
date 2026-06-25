import type { OceanEngineReportRow } from './oceanEngine'

export type SyncStatus = 'idle' | 'running' | 'success' | 'failed'

export interface MetricFact extends OceanEngineReportRow {
  id: string
  syncedAt: string
  dateRange: {
    startDate: string
    endDate: string
  }
}

export interface ReportSyncRun {
  id: string
  status: SyncStatus
  startedAt: string
  finishedAt?: string
  rowCount: number
  error?: string
}

export interface ReportSyncSummary {
  lastRun?: ReportSyncRun
  storedFactCount: number
  latestSyncedAt?: string
}

