import { buildMaterialSignalNotification, type FeishuNotificationDraft } from '../domain/feishu'
import type { OwnerRoute } from '../domain/ownerRouting'
import type { MaterialSignal } from '../domain/types'
import { resolveOwnerRoute } from './ownerRoutingService'

export interface NotificationQueueSummary {
  drafts: FeishuNotificationDraft[]
  actionCount: number
  dedupeKeys: string[]
}

export function buildNotificationQueue(signals: MaterialSignal[], ownerRoutes: OwnerRoute[] = []): NotificationQueueSummary {
  const drafts = signals.map((signal) => {
    const draft = buildMaterialSignalNotification(signal)
    const routedOwner = resolveOwnerRoute(signal, ownerRoutes)

    return {
      ...draft,
      receiver: routedOwner.receiver.feishuUserId ?? routedOwner.receiver.name,
    }
  })

  return {
    drafts,
    actionCount: drafts.filter((draft) => draft.severity === 'action').length,
    dedupeKeys: drafts.map((draft) => draft.dedupeKey),
  }
}
