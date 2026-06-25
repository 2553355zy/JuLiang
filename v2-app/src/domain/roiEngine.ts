import type { DeliveryAccount, MaterialSignal, RoiRecommendation } from './types'

export interface RoiPolicy {
  scaleRoi: number
  reduceRoi: number
  minSpendForDecision: number
  minConversionsForScale: number
  lowBalanceBudgetRatio: number
  materialSignalRoi: number
  materialSignalMinConversions: number
}

export type DiagnosticKind =
  | 'scale_candidate'
  | 'reduce_candidate'
  | 'tracking_issue'
  | 'low_balance'
  | 'material_signal'

export interface RoiDiagnostic {
  id: string
  kind: DiagnosticKind
  title: string
  severity: 'p0' | 'p1' | 'p2'
  entityName: string
  evidence: string
}

export interface PortfolioDiagnostics {
  diagnostics: RoiDiagnostic[]
  p0Count: number
  scaleCandidateCount: number
  materialSignalCount: number
  trackingIssueCount: number
}

export const defaultRoiPolicy: RoiPolicy = {
  scaleRoi: 1.35,
  reduceRoi: 0.85,
  minSpendForDecision: 300,
  minConversionsForScale: 20,
  lowBalanceBudgetRatio: 0.35,
  materialSignalRoi: 1.4,
  materialSignalMinConversions: 100,
}

export function evaluateAccount(
  account: DeliveryAccount,
  policy: RoiPolicy = defaultRoiPolicy,
): RoiRecommendation[] {
  const recommendations: RoiRecommendation[] = []

  if (account.trackingHealth !== 'normal') {
    recommendations.push({
      id: `${account.id}-tracking`,
      accountId: account.id,
      title: '先排查转化回传，再判断投放质量',
      type: 'inspect_tracking',
      evidence: `当前回传状态为 ${account.trackingHealth}，避免误关高潜素材。`,
      priority: 'p0',
    })
    return recommendations
  }

  if (account.metrics.roi >= policy.scaleRoi && account.metrics.conversions >= policy.minConversionsForScale) {
    recommendations.push({
      id: `${account.id}-scale`,
      accountId: account.id,
      title: 'ROI 稳定达标，进入扩量候选',
      type: 'scale',
      evidence: `ROI ${account.metrics.roi.toFixed(2)}，转化 ${account.metrics.conversions}，利润 ${formatMoney(account.metrics.profit)}。`,
      priority: 'p0',
      operationPlan: {
        id: `${account.id}-budget-up`,
        targetType: 'account',
        targetId: account.id,
        targetName: account.name,
        stateHint: buildAccountStateHint(account),
        action: '预算上调 15%',
        reason: 'ROI 和转化样本量同时达标',
        risk: 'medium',
        requiresConfirmation: true,
      },
    })
  }

  if (account.metrics.roi < policy.reduceRoi && account.metrics.spend > policy.minSpendForDecision) {
    recommendations.push({
      id: `${account.id}-reduce`,
      accountId: account.id,
      title: 'ROI 低于阈值，建议控量观察',
      type: 'reduce',
      evidence: `消耗 ${formatMoney(account.metrics.spend)}，ROI ${account.metrics.roi.toFixed(2)}，转化成本 ${formatMoney(account.metrics.conversionCost)}。`,
      priority: 'p1',
      operationPlan: {
        id: `${account.id}-pause-low-roi`,
        targetType: 'account',
        targetId: account.id,
        targetName: account.name,
        stateHint: buildAccountStateHint(account),
        action: '暂停高成本单元',
        reason: '消耗已过样本线且 ROI 未达标',
        risk: 'high',
        requiresConfirmation: true,
      },
    })
  }

  if (account.balance < account.dailyBudget * policy.lowBalanceBudgetRatio) {
    recommendations.push({
      id: `${account.id}-balance`,
      accountId: account.id,
      title: '余额低于安全线，避免断投',
      type: 'hold',
      evidence: `余额 ${formatMoney(account.balance)}，日预算 ${formatMoney(account.dailyBudget)}。`,
      priority: 'p1',
    })
  }

  return recommendations
}

export function evaluatePortfolioDiagnostics(
  accounts: DeliveryAccount[],
  materialSignals: MaterialSignal[],
  policy: RoiPolicy = defaultRoiPolicy,
): PortfolioDiagnostics {
  const diagnostics: RoiDiagnostic[] = []

  accounts.forEach((account) => {
    if (account.trackingHealth !== 'normal') {
      diagnostics.push({
        id: `${account.id}:tracking`,
        kind: 'tracking_issue',
        title: '转化回传异常',
        severity: 'p0',
        entityName: account.name,
        evidence: `回传状态 ${account.trackingHealth}，该账号建议暂停自动关停判断。`,
      })
    }

    if (account.metrics.roi >= policy.scaleRoi && account.metrics.conversions >= policy.minConversionsForScale) {
      diagnostics.push({
        id: `${account.id}:scale`,
        kind: 'scale_candidate',
        title: '扩量候选',
        severity: 'p0',
        entityName: account.name,
        evidence: `ROI ${account.metrics.roi.toFixed(2)}，转化 ${account.metrics.conversions}，利润 ${formatMoney(account.metrics.profit)}。`,
      })
    }

    if (account.metrics.roi < policy.reduceRoi && account.metrics.spend > policy.minSpendForDecision) {
      diagnostics.push({
        id: `${account.id}:reduce`,
        kind: 'reduce_candidate',
        title: '控量候选',
        severity: 'p1',
        entityName: account.name,
        evidence: `消耗 ${formatMoney(account.metrics.spend)} 后 ROI ${account.metrics.roi.toFixed(2)}，需要复核单元和素材。`,
      })
    }

    if (account.balance < account.dailyBudget * policy.lowBalanceBudgetRatio) {
      diagnostics.push({
        id: `${account.id}:balance`,
        kind: 'low_balance',
        title: '余额风险',
        severity: 'p1',
        entityName: account.name,
        evidence: `余额 ${formatMoney(account.balance)} 低于日预算安全线 ${formatMoney(account.dailyBudget * policy.lowBalanceBudgetRatio)}。`,
      })
    }
  })

  materialSignals.forEach((signal) => {
    if (signal.metrics.roi >= policy.materialSignalRoi && signal.metrics.conversions >= policy.materialSignalMinConversions) {
      diagnostics.push({
        id: `${signal.id}:material`,
        kind: 'material_signal',
        title: '爆量素材信号',
        severity: 'p0',
        entityName: signal.novelName,
        evidence: `${signal.materialName} ROI ${signal.metrics.roi.toFixed(2)}，转化 ${signal.metrics.conversions}，应通知 ${signal.owner.name}。`,
      })
    }
  })

  return {
    diagnostics,
    p0Count: diagnostics.filter((item) => item.severity === 'p0').length,
    scaleCandidateCount: diagnostics.filter((item) => item.kind === 'scale_candidate').length,
    materialSignalCount: diagnostics.filter((item) => item.kind === 'material_signal').length,
    trackingIssueCount: diagnostics.filter((item) => item.kind === 'tracking_issue').length,
  }
}

export function formatMoney(value: number): string {
  return `¥${Math.round(value).toLocaleString('zh-CN')}`
}

function buildAccountStateHint(account: DeliveryAccount) {
  return {
    budget: account.dailyBudget,
    status: 'running' as const,
    source: 'projection' as const,
    capturedAt: new Date().toISOString(),
  }
}
