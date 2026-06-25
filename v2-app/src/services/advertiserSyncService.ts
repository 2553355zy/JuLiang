import type { AuthorizedAdvertiserRecord, AuthorizedAdvertiserSummary } from '../domain/advertiserSync'
import type { OceanEngineClient } from '../domain/oceanEngine'
import type { AdvertiserRepository } from './advertiserRepository'

export interface AdvertiserSyncService {
  runOnce: () => Promise<AuthorizedAdvertiserSummary>
}

export function createAdvertiserSyncService(
  oceanEngineClient: OceanEngineClient,
  advertiserRepository: AdvertiserRepository,
  source: AuthorizedAdvertiserRecord['source'],
): AdvertiserSyncService {
  return {
    async runOnce() {
      const startedAt = new Date().toISOString()
      const runId = `advertiser-sync-${startedAt}`

      try {
        const advertisers = await oceanEngineClient.listAuthorizedAdvertisers()
        const syncedAt = new Date().toISOString()
        const records = advertisers.map((advertiser): AuthorizedAdvertiserRecord => ({
          ...advertiser,
          syncedAt,
          source,
        }))

        await advertiserRepository.saveAdvertisers(records)
        await advertiserRepository.saveSyncRun({
          id: runId,
          status: 'success',
          startedAt,
          finishedAt: new Date().toISOString(),
          rowCount: records.length,
        })

        return advertiserRepository.getSummary()
      } catch (error) {
        await advertiserRepository.saveSyncRun({
          id: runId,
          status: 'failed',
          startedAt,
          finishedAt: new Date().toISOString(),
          rowCount: 0,
          error: error instanceof Error ? error.message : String(error),
        })

        return advertiserRepository.getSummary()
      }
    },
  }
}
