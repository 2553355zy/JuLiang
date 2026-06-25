import { buildMaterialSignalNotification, type FeishuNotificationDraft } from '../domain/feishu'
import type { MaterialSignal } from '../domain/types'

export interface NotificationQueueSummary {
  drafts: FeishuNotificationDraft[]
  actionCount: number
  dedupeKeys: string[]
}

export function buildNotificationQueue(signals: MaterialSignal[]): NotificationQueueSummary {
  const drafts = signals.map(buildMaterialSignalNotification)

  return {
    drafts,
    actionCount: drafts.filter((draft) => draft.severity === 'action').length,
    dedupeKeys: drafts.map((draft) => draft.dedupeKey),
  }
}

