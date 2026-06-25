import type { OceanEngineFundBalance } from './oceanEngine'

export type FundSyncStatus = 'idle' | 'success' | 'failed'

export interface FundBalanceRecord extends OceanEngineFundBalance {
  syncedAt: string
  source: 'oceanengine' | 'mock'
}

export interface FundSyncRun {
  id: string
  status: FundSyncStatus
  startedAt: string
  finishedAt?: string
  rowCount: number
  error?: string
}

export interface FundBalanceSummary {
  balances: FundBalanceRecord[]
  lastRun?: FundSyncRun
  storedBalanceCount: number
  latestSyncedAt?: string
}
