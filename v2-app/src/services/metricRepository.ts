import type { MetricFact, ReportSyncRun, ReportSyncSummary } from '../domain/reportSync'

export interface MetricRepository {
  saveFacts: (facts: MetricFact[]) => Promise<void>
  listFacts: () => Promise<MetricFact[]>
  saveSyncRun: (run: ReportSyncRun) => Promise<void>
  getSummary: () => Promise<ReportSyncSummary>
}

const factsKey = 'juliang.v2.metricFacts'
const runsKey = 'juliang.v2.reportSyncRuns'

export function createLocalStorageMetricRepository(): MetricRepository {
  return {
    async saveFacts(facts) {
      const existing = readJson<MetricFact[]>(factsKey, [])
      const byId = new Map(existing.map((fact) => [fact.id, fact]))
      facts.forEach((fact) => byId.set(fact.id, fact))
      writeJson(factsKey, [...byId.values()])
    },
    async listFacts() {
      return readJson<MetricFact[]>(factsKey, [])
    },
    async saveSyncRun(run) {
      const runs = readJson<ReportSyncRun[]>(runsKey, [])
      writeJson(runsKey, [run, ...runs].slice(0, 50))
    },
    async getSummary() {
      const facts = readJson<MetricFact[]>(factsKey, [])
      const runs = readJson<ReportSyncRun[]>(runsKey, [])
      const latestSyncedAt = facts
        .map((fact) => fact.syncedAt)
        .sort()
        .at(-1)

      return {
        lastRun: runs[0],
        storedFactCount: facts.length,
        latestSyncedAt,
      }
    },
  }
}

export function createMemoryMetricRepository(): MetricRepository {
  let facts: MetricFact[] = []
  let runs: ReportSyncRun[] = []

  return {
    async saveFacts(nextFacts) {
      const byId = new Map(facts.map((fact) => [fact.id, fact]))
      nextFacts.forEach((fact) => byId.set(fact.id, fact))
      facts = [...byId.values()]
    },
    async listFacts() {
      return facts
    },
    async saveSyncRun(run) {
      runs = [run, ...runs].slice(0, 50)
    },
    async getSummary() {
      const latestSyncedAt = facts
        .map((fact) => fact.syncedAt)
        .sort()
        .at(-1)

      return {
        lastRun: runs[0],
        storedFactCount: facts.length,
        latestSyncedAt,
      }
    },
  }
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

