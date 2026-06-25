import type { NotificationDeliveryLog, NotificationDeliverySummary } from '../domain/notificationDelivery'

export interface NotificationDeliveryRepository {
  saveLog: (log: NotificationDeliveryLog) => Promise<void>
  listLogs: () => Promise<NotificationDeliveryLog[]>
  getSummary: () => Promise<NotificationDeliverySummary>
}

const deliveryKey = 'juliang.v2.notificationDeliveryLogs'

export function createLocalStorageNotificationDeliveryRepository(): NotificationDeliveryRepository {
  return {
    async saveLog(log) {
      const existing = readLogs()
      const byId = new Map(existing.map((item) => [item.id, item]))
      byId.set(log.id, log)
      writeLogs([...byId.values()].sort((a, b) => b.sentAt.localeCompare(a.sentAt)).slice(0, 300))
    },
    async listLogs() {
      return readLogs()
    },
    async getSummary() {
      return summarize(readLogs())
    },
  }
}

function summarize(logs: NotificationDeliveryLog[]): NotificationDeliverySummary {
  return {
    total: logs.length,
    previewed: logs.filter((log) => log.status === 'previewed').length,
    skipped: logs.filter((log) => log.status === 'skipped').length,
    sent: logs.filter((log) => log.status === 'sent').length,
    failed: logs.filter((log) => log.status === 'failed').length,
    duplicate: logs.filter((log) => log.status === 'duplicate').length,
    lastLog: logs[0],
  }
}

function readLogs(): NotificationDeliveryLog[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(deliveryKey)
    return raw ? (JSON.parse(raw) as NotificationDeliveryLog[]) : []
  } catch {
    return []
  }
}

function writeLogs(logs: NotificationDeliveryLog[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(deliveryKey, JSON.stringify(logs))
}
