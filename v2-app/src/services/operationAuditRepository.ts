import type { OperationAuditLog, OperationAuditSummary } from '../domain/operationAudit'

export interface OperationAuditRepository {
  saveLogs: (logs: OperationAuditLog[]) => Promise<void>
  listLogs: () => Promise<OperationAuditLog[]>
  getSummary: () => Promise<OperationAuditSummary>
}

const auditKey = 'juliang.v2.operationAuditLogs'

export function createOperationAuditRepository(): OperationAuditRepository {
  if (typeof window !== 'undefined' && window.juliang?.operationAudit) {
    return createElectronOperationAuditRepository(window.juliang.operationAudit)
  }

  return createLocalStorageOperationAuditRepository()
}

export function createLocalStorageOperationAuditRepository(): OperationAuditRepository {
  return {
    async saveLogs(logs) {
      const existing = readLogs()
      const byId = new Map(existing.map((log) => [log.id, log]))
      logs.forEach((log) => byId.set(log.id, log))
      writeLogs([...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200))
    },
    async listLogs() {
      return readLogs()
    },
    async getSummary() {
      return summarize(readLogs())
    },
  }
}

function createElectronOperationAuditRepository(
  bridge: NonNullable<NonNullable<Window['juliang']>['operationAudit']>,
): OperationAuditRepository {
  return {
    saveLogs: bridge.saveLogs,
    listLogs: bridge.listLogs,
    getSummary: bridge.getSummary,
  }
}

function summarize(logs: OperationAuditLog[]): OperationAuditSummary {
  return {
    total: logs.length,
    previewed: logs.filter((log) => log.status === 'previewed').length,
    confirmed: logs.filter((log) => log.status === 'confirmed').length,
    blocked: logs.filter((log) => log.status === 'blocked').length,
    executed: logs.filter((log) => log.status === 'executed').length,
    verificationFailed: logs.filter((log) => log.status === 'verification_failed').length,
    lastLog: logs[0],
  }
}

function readLogs(): OperationAuditLog[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(auditKey)
    return raw ? (JSON.parse(raw) as OperationAuditLog[]) : []
  } catch {
    return []
  }
}

function writeLogs(logs: OperationAuditLog[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(auditKey, JSON.stringify(logs))
}
