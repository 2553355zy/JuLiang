import type { OceanEngineAdvertiser } from './oceanEngine'

export type AdvertiserSyncStatus = 'idle' | 'success' | 'failed'

export interface AuthorizedAdvertiserRecord extends OceanEngineAdvertiser {
  syncedAt: string
  source: 'oceanengine' | 'mock'
}

export interface AdvertiserSyncRun {
  id: string
  status: AdvertiserSyncStatus
  startedAt: string
  finishedAt?: string
  rowCount: number
  error?: string
}

export interface AuthorizedAdvertiserSummary {
  advertisers: AuthorizedAdvertiserRecord[]
  lastRun?: AdvertiserSyncRun
  storedAdvertiserCount: number
  latestSyncedAt?: string
}
