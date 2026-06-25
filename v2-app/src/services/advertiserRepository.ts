import type {
  AdvertiserSyncRun,
  AuthorizedAdvertiserRecord,
  AuthorizedAdvertiserSummary,
} from '../domain/advertiserSync'

export interface AdvertiserRepository {
  saveAdvertisers: (advertisers: AuthorizedAdvertiserRecord[]) => Promise<void>
  listAdvertisers: () => Promise<AuthorizedAdvertiserRecord[]>
  saveSyncRun: (run: AdvertiserSyncRun) => Promise<void>
  getSummary: () => Promise<AuthorizedAdvertiserSummary>
}

export function createLocalStorageAdvertiserRepository(namespace = 'default'): AdvertiserRepository {
  const advertisersKey = `juliang.v2.authorizedAdvertisers.${namespace}`
  const runsKey = `juliang.v2.advertiserSyncRuns.${namespace}`

  return {
    async saveAdvertisers(advertisers) {
      const existing = readJson<AuthorizedAdvertiserRecord[]>(advertisersKey, [])
      const byId = new Map(existing.map((advertiser) => [advertiser.advertiserId, advertiser]))
      advertisers.forEach((advertiser) => byId.set(advertiser.advertiserId, advertiser))
      writeJson(
        advertisersKey,
        [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
      )
    },
    async listAdvertisers() {
      return readJson<AuthorizedAdvertiserRecord[]>(advertisersKey, [])
    },
    async saveSyncRun(run) {
      const runs = readJson<AdvertiserSyncRun[]>(runsKey, [])
      writeJson(runsKey, [run, ...runs].slice(0, 50))
    },
    async getSummary() {
      return summarize(
        readJson<AuthorizedAdvertiserRecord[]>(advertisersKey, []),
        readJson<AdvertiserSyncRun[]>(runsKey, []),
      )
    },
  }
}

export function createMemoryAdvertiserRepository(): AdvertiserRepository {
  let advertisers: AuthorizedAdvertiserRecord[] = []
  let runs: AdvertiserSyncRun[] = []

  return {
    async saveAdvertisers(nextAdvertisers) {
      const byId = new Map(advertisers.map((advertiser) => [advertiser.advertiserId, advertiser]))
      nextAdvertisers.forEach((advertiser) => byId.set(advertiser.advertiserId, advertiser))
      advertisers = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
    },
    async listAdvertisers() {
      return advertisers
    },
    async saveSyncRun(run) {
      runs = [run, ...runs].slice(0, 50)
    },
    async getSummary() {
      return summarize(advertisers, runs)
    },
  }
}

function summarize(
  advertisers: AuthorizedAdvertiserRecord[],
  runs: AdvertiserSyncRun[],
): AuthorizedAdvertiserSummary {
  const latestSyncedAt = advertisers
    .map((advertiser) => advertiser.syncedAt)
    .sort()
    .at(-1)

  return {
    advertisers,
    lastRun: runs[0],
    storedAdvertiserCount: advertisers.length,
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
