import type { FeishuNotificationDraft } from './feishu'

export type NotificationDeliveryStatus = 'previewed' | 'skipped' | 'sent' | 'failed' | 'duplicate'

export interface NotificationDeliveryResult {
  status: NotificationDeliveryStatus
  dedupeKey: string
  receiver: string
  sentAt: string
  error?: string
}

export interface NotificationDeliveryLog extends NotificationDeliveryResult {
  id: string
  draft: FeishuNotificationDraft
}

export interface NotificationDeliverySummary {
  total: number
  previewed: number
  skipped: number
  sent: number
  failed: number
  duplicate: number
  lastLog?: NotificationDeliveryLog
}
