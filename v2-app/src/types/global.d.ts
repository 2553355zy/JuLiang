import type { RuntimeConfigStatus } from '../services/runtimeConfig'
import type {
  OceanEngineAdvertiser,
  OceanEngineAuthStatus,
  OceanEngineFundBalance,
  OceanEngineReportQuery,
  OceanEngineReportRow,
} from '../domain/oceanEngine'

declare global {
  interface Window {
    juliang?: {
      getRuntimeInfo: () => Promise<{
        appVersion: string
        platform: string
        mode: 'development' | 'production'
      }>
      getRuntimeConfigStatus: () => Promise<RuntimeConfigStatus>
      oceanEngine?: {
        getAuthStatus: () => Promise<OceanEngineAuthStatus>
        listAuthorizedAdvertisers: () => Promise<OceanEngineAdvertiser[]>
        queryReport: (query: OceanEngineReportQuery) => Promise<OceanEngineReportRow[]>
        getFundBalances: (advertiserIds: string[]) => Promise<OceanEngineFundBalance[]>
      }
    }
  }
}

export {}
