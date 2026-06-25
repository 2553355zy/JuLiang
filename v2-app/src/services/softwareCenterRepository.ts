import type { SoftwareCenterRun, SoftwareCenterRunSummary } from '../domain/softwareCenter'

export interface SoftwareCenterRepository {
  saveRun: (run: SoftwareCenterRun) => Promise<void>
  listRuns: () => Promise<SoftwareCenterRun[]>
  getSummary: () => Promise<SoftwareCenterRunSummary>
}

const runsKey = 'juliang.v2.softwareCenterRuns'

export function createLocalStorageSoftwareCenterRepository(): SoftwareCenterRepository {
  return {
    async saveRun(run) {
      const existing = readRuns()
      const byId = new Map(existing.map((item) => [item.id, item]))
      byId.set(run.id, run)
      writeRuns([...byId.values()].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)).slice(0, 100))
    },
    async listRuns() {
      return readRuns()
    },
    async getSummary() {
      return summarize(readRuns())
    },
  }
}

function summarize(runs: SoftwareCenterRun[]): SoftwareCenterRunSummary {
  return {
    total: runs.length,
    success: runs.filter((run) => run.status === 'success').length,
    failed: runs.filter((run) => run.status === 'failed').length,
    lastRun: runs[0],
  }
}

function readRuns(): SoftwareCenterRun[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(runsKey)
    return raw ? (JSON.parse(raw) as SoftwareCenterRun[]) : []
  } catch {
    return []
  }
}

function writeRuns(runs: SoftwareCenterRun[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(runsKey, JSON.stringify(runs))
}
