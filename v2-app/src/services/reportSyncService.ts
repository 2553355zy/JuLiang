import type { OceanEngineClient, OceanEngineReportQuery } from '../domain/oceanEngine'
import type { MetricFact, ReportSyncRun, ReportSyncSummary } from '../domain/reportSync'
import type { MetricRepository } from './metricRepository'

export interface ReportSyncService {
  runOnce: (query: OceanEngineReportQuery) => Promise<ReportSyncSummary>
}

export function createReportSyncService(
  oceanEngineClient: OceanEngineClient,
  metricRepository: MetricRepository,
): ReportSyncService {
  return {
    async runOnce(query) {
      const startedAt = new Date().toISOString()
      const runId = `sync-${startedAt}`

      try {
        const rows = await oceanEngineClient.queryReport(query)
        const syncedAt = new Date().toISOString()
        const facts = rows.map((row): MetricFact => ({
          ...row,
          id: [
            row.advertiserId,
            row.projectId ?? 'project',
            row.promotionId ?? 'promotion',
            row.materialId ?? 'material',
            query.startDate,
            query.endDate,
          ].join(':'),
          syncedAt,
          dateRange: {
            startDate: query.startDate,
            endDate: query.endDate,
          },
        }))

        await metricRepository.saveFacts(facts)
        await metricRepository.saveSyncRun({
          id: runId,
          status: 'success',
          startedAt,
          finishedAt: new Date().toISOString(),
          rowCount: facts.length,
        })

        return metricRepository.getSummary()
      } catch (error) {
        const failedRun: ReportSyncRun = {
          id: runId,
          status: 'failed',
          startedAt,
          finishedAt: new Date().toISOString(),
          rowCount: 0,
          error: error instanceof Error ? error.message : String(error),
        }

        await metricRepository.saveSyncRun(failedRun)
        return metricRepository.getSummary()
      }
    },
  }
}

