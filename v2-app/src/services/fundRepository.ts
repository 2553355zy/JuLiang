import type { FundBalanceRecord, FundBalanceSummary, FundSyncRun } from '../domain/fundSync'

export interface FundRepository {
  saveBalances: (balances: FundBalanceRecord[]) => Promise<void>
  listBalances: () => Promise<FundBalanceRecord[]>
  saveSyncRun: (run: FundSyncRun) => Promise<void>
  getSummary: () => Promise<FundBalanceSummary>
}

export function createLocalStorageFundRepository(namespace = 'default'): FundRepository {
  const balancesKey = `juliang.v2.fundBalances.${namespace}`
  const runsKey = `juliang.v2.fundSyncRuns.${namespace}`

  return {
    async saveBalances(balances) {
      const existing = readJson<FundBalanceRecord[]>(balancesKey, [])
      const byId = new Map(existing.map((balance) => [balance.advertiserId, balance]))
      balances.forEach((balance) => byId.set(balance.advertiserId, balance))
      writeJson(balancesKey, [...byId.values()].sort((a, b) => a.advertiserId.localeCompare(b.advertiserId)))
    },
    async listBalances() {
      return readJson<FundBalanceRecord[]>(balancesKey, [])
    },
    async saveSyncRun(run) {
      const runs = readJson<FundSyncRun[]>(runsKey, [])
      writeJson(runsKey, [run, ...runs].slice(0, 50))
    },
    async getSummary() {
      return summarize(readJson<FundBalanceRecord[]>(balancesKey, []), readJson<FundSyncRun[]>(runsKey, []))
    },
  }
}

export function createMemoryFundRepository(): FundRepository {
  let balances: FundBalanceRecord[] = []
  let runs: FundSyncRun[] = []

  return {
    async saveBalances(nextBalances) {
      const byId = new Map(balances.map((balance) => [balance.advertiserId, balance]))
      nextBalances.forEach((balance) => byId.set(balance.advertiserId, balance))
      balances = [...byId.values()].sort((a, b) => a.advertiserId.localeCompare(b.advertiserId))
    },
    async listBalances() {
      return balances
    },
    async saveSyncRun(run) {
      runs = [run, ...runs].slice(0, 50)
    },
    async getSummary() {
      return summarize(balances, runs)
    },
  }
}

function summarize(balances: FundBalanceRecord[], runs: FundSyncRun[]): FundBalanceSummary {
  const latestSyncedAt = balances
    .map((balance) => balance.syncedAt)
    .sort()
    .at(-1)

  return {
    balances,
    lastRun: runs[0],
    storedBalanceCount: balances.length,
    latestSyncedAt,
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
