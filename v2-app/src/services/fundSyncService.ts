import type { FundBalanceRecord, FundBalanceSummary } from '../domain/fundSync'
import type { OceanEngineClient } from '../domain/oceanEngine'
import type { FundRepository } from './fundRepository'

export interface FundSyncService {
  runOnce: (advertiserIds: string[]) => Promise<FundBalanceSummary>
}

export function createFundSyncService(
  oceanEngineClient: OceanEngineClient,
  fundRepository: FundRepository,
  source: FundBalanceRecord['source'],
): FundSyncService {
  return {
    async runOnce(advertiserIds) {
      const startedAt = new Date().toISOString()
      const runId = `fund-sync-${startedAt}`
      const ids = advertiserIds.filter(Boolean)

      try {
        const balances = ids.length ? await oceanEngineClient.getFundBalances(ids) : []
        const syncedAt = new Date().toISOString()
        const records = balances.map((balance): FundBalanceRecord => ({
          ...balance,
          syncedAt,
          source,
        }))

        await fundRepository.saveBalances(records)
        await fundRepository.saveSyncRun({
          id: runId,
          status: 'success',
          startedAt,
          finishedAt: new Date().toISOString(),
          rowCount: records.length,
        })

        return fundRepository.getSummary()
      } catch (error) {
        await fundRepository.saveSyncRun({
          id: runId,
          status: 'failed',
          startedAt,
          finishedAt: new Date().toISOString(),
          rowCount: 0,
          error: error instanceof Error ? error.message : String(error),
        })

        return fundRepository.getSummary()
      }
    },
  }
}
