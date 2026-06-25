import type { RuntimeConfigStatus } from '../services/runtimeConfig'
import type { FeishuNotificationDraft } from '../domain/feishu'
import type { NotificationDeliveryResult } from '../domain/notificationDelivery'
import type { OperationStateSnapshot } from '../domain/operationExecution'
import type { OperationAuditLog, OperationAuditSummary } from '../domain/operationAudit'
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
      feishu?: {
        sendNotification: (draft: FeishuNotificationDraft) => Promise<NotificationDeliveryResult>
      }
      operationAudit?: {
        saveLogs: (logs: OperationAuditLog[]) => Promise<void>
        listLogs: () => Promise<OperationAuditLog[]>
        getSummary: () => Promise<OperationAuditSummary>
      }
      operationState?: {
        getAccountState: (accountId: string) => Promise<OperationStateSnapshot & { accountId?: string; error?: string }>
      }
    }
  }
}

export {}
