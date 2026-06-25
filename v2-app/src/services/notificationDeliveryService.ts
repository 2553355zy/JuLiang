import type { FeishuNotificationDraft } from '../domain/feishu'
import type {
  NotificationDeliveryLog,
  NotificationDeliveryResult,
  NotificationDeliverySummary,
} from '../domain/notificationDelivery'
import type { NotificationDeliveryRepository } from './notificationDeliveryRepository'

export interface NotificationDeliveryService {
  deliver: (draft: FeishuNotificationDraft) => Promise<NotificationDeliverySummary>
}

export function createNotificationDeliveryService(
  repository: NotificationDeliveryRepository,
): NotificationDeliveryService {
  return {
    async deliver(draft) {
      const logs = await repository.listLogs()
      const alreadySent = logs.find((log) => log.dedupeKey === draft.dedupeKey && log.status === 'sent')

      if (alreadySent) {
        await repository.saveLog(toLog(draft, {
          status: 'duplicate',
          dedupeKey: draft.dedupeKey,
          receiver: draft.receiver,
          sentAt: new Date().toISOString(),
          error: 'duplicate dedupeKey already sent',
        }))
        return repository.getSummary()
      }

      const result = await sendFeishuDraft(draft)
      await repository.saveLog(toLog(draft, result))
      return repository.getSummary()
    },
  }
}

async function sendFeishuDraft(draft: FeishuNotificationDraft): Promise<NotificationDeliveryResult> {
  if (typeof window !== 'undefined' && window.juliang?.feishu?.sendNotification) {
    return window.juliang.feishu.sendNotification(draft)
  }

  return {
    status: 'previewed',
    dedupeKey: draft.dedupeKey,
    receiver: draft.receiver,
    sentAt: new Date().toISOString(),
    error: 'browser fallback preview',
  }
}

function toLog(
  draft: FeishuNotificationDraft,
  result: NotificationDeliveryResult,
): NotificationDeliveryLog {
  return {
    ...result,
    id: `${result.dedupeKey}:${result.status}:${result.sentAt}`,
    draft,
  }
}
