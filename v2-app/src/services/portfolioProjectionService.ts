import type { AuthorizedAdvertiserRecord } from '../domain/advertiserSync'
import { parseMaterialName } from '../domain/materialNameParser'
import type { MetricFact } from '../domain/reportSync'
import type { AccountOwner, AccountStatus, DeliveryAccount, MaterialSignal, PerformanceMetrics } from '../domain/types'

const unassignedOwner: AccountOwner = {
  id: 'owner-unassigned',
  name: '未分配',
  role: 'operator',
}

export interface PortfolioProjection {
  accounts: DeliveryAccount[]
  materialSignals: MaterialSignal[]
  source: 'metric-facts' | 'mock'
}

export function buildPortfolioProjection(
  facts: MetricFact[],
  advertisers: AuthorizedAdvertiserRecord[],
  fallbackAccounts: DeliveryAccount[],
  fallbackSignals: MaterialSignal[],
): PortfolioProjection {
  if (!facts.length) {
    return {
      accounts: fallbackAccounts,
      materialSignals: fallbackSignals,
      source: 'mock',
    }
  }

  const accounts = buildAccounts(facts, advertisers, fallbackAccounts)
  const materialSignals = buildMaterialSignals(facts, advertisers, fallbackSignals)

  return {
    accounts: accounts.length ? accounts : fallbackAccounts,
    materialSignals: materialSignals.length ? materialSignals : fallbackSignals,
    source: accounts.length ? 'metric-facts' : 'mock',
  }
}

function buildAccounts(
  facts: MetricFact[],
  advertisers: AuthorizedAdvertiserRecord[],
  fallbackAccounts: DeliveryAccount[],
): DeliveryAccount[] {
  const advertiserById = new Map(advertisers.map((advertiser) => [advertiser.advertiserId, advertiser]))
  const fallbackById = new Map(fallbackAccounts.map((account) => [account.id, account]))
  const grouped = groupBy(facts, (fact) => fact.advertiserId)

  return [...grouped.entries()]
    .map(([advertiserId, rows]) => {
      const fallback = fallbackById.get(advertiserId)
      const advertiser = advertiserById.get(advertiserId)
      const metrics = aggregateMetrics(rows)
      const status = resolveAccountStatus(metrics, fallback)

      return {
        id: advertiserId,
        name: advertiser?.name || rows.find((row) => row.advertiserName)?.advertiserName || fallback?.name || advertiserId,
        balance: fallback?.balance ?? 0,
        dailyBudget: fallback?.dailyBudget ?? Math.max(1000, Math.round(metrics.spend * 1.2)),
        owner: resolveOwner(advertiser, fallback),
        status,
        metrics,
        trackingHealth: fallback?.trackingHealth ?? 'normal',
        updatedAt: formatTime(rows.map((row) => row.syncedAt).sort().at(-1)),
      } satisfies DeliveryAccount
    })
    .sort((a, b) => b.metrics.roi - a.metrics.roi)
}

function buildMaterialSignals(
  facts: MetricFact[],
  advertisers: AuthorizedAdvertiserRecord[],
  fallbackSignals: MaterialSignal[],
): MaterialSignal[] {
  const advertiserById = new Map(advertisers.map((advertiser) => [advertiser.advertiserId, advertiser]))
  const materialRows = facts.filter((fact) => fact.materialName && fact.materialId)
  if (!materialRows.length) return fallbackSignals

  return materialRows
    .map((fact) => {
      const tags = parseMaterialName(fact.materialName || '')
      const metrics = aggregateMetrics([fact])
      const advertiser = advertiserById.get(fact.advertiserId)

      return {
        id: fact.materialId || fact.id,
        accountId: fact.advertiserId,
        materialName: fact.materialName || fact.id,
        novelName: tags.novelName,
        hookType: tags.hookType ?? '待归类钩子',
        owner: resolveOwner(advertiser),
        metrics,
        confidence: tags.confidence,
        firstSeenAt: formatTime(fact.syncedAt),
      } satisfies MaterialSignal
    })
    .filter((signal) => signal.metrics.roi >= 1.2 || signal.metrics.conversions >= 20)
    .sort((a, b) => b.metrics.roi - a.metrics.roi)
    .slice(0, 12)
}

function aggregateMetrics(rows: MetricFact[]): PerformanceMetrics {
  const spend = sum(rows, (row) => row.cost)
  const revenue = sum(rows, (row) => row.income)
  const conversions = sum(rows, (row) => row.convert)
  const clicks = sum(rows, (row) => row.click)
  const impressions = sum(rows, (row) => row.show)

  return {
    spend,
    revenue,
    conversions,
    clicks,
    impressions,
    ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
    cpc: clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0,
    conversionCost: conversions > 0 ? Number((spend / conversions).toFixed(2)) : 0,
    roi: spend > 0 ? Number((revenue / spend).toFixed(2)) : 0,
    profit: revenue - spend,
  }
}

function resolveOwner(advertiser?: AuthorizedAdvertiserRecord, fallback?: DeliveryAccount): AccountOwner {
  if (fallback?.owner) return fallback.owner
  if (!advertiser?.ownerName) return unassignedOwner

  return {
    id: `owner-${advertiser.ownerName}`,
    name: advertiser.ownerName,
    role: 'operator',
  }
}

function resolveAccountStatus(metrics: PerformanceMetrics, fallback?: DeliveryAccount): AccountStatus {
  if (fallback?.trackingHealth === 'broken' || fallback?.trackingHealth === 'delayed') return 'critical'
  if (metrics.roi < 0.85 && metrics.spend > 300) return 'critical'
  if (metrics.roi < 1.1 || metrics.conversions < 10) return 'attention'
  return 'healthy'
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>()

  items.forEach((item) => {
    const key = getKey(item)
    const group = grouped.get(key) ?? []
    group.push(item)
    grouped.set(key, group)
  })

  return grouped
}

function sum<T>(items: T[], getValue: (item: T) => number): number {
  return items.reduce((total, item) => total + getValue(item), 0)
}

function formatTime(value?: string): string {
  if (!value) return '--:--'
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}
