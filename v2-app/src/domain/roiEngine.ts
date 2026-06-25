import type { DeliveryAccount, RoiRecommendation } from './types'

export function evaluateAccount(account: DeliveryAccount): RoiRecommendation[] {
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

  if (account.metrics.roi >= 1.35 && account.metrics.conversions >= 20) {
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
        targetName: account.name,
        action: '预算上调 15%',
        reason: 'ROI 和转化样本量同时达标',
        risk: 'medium',
        requiresConfirmation: true,
      },
    })
  }

  if (account.metrics.roi < 0.85 && account.metrics.spend > 300) {
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
        targetName: account.name,
        action: '暂停高成本单元',
        reason: '消耗已过样本线且 ROI 未达标',
        risk: 'high',
        requiresConfirmation: true,
      },
    })
  }

  if (account.balance < account.dailyBudget * 0.35) {
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

export function formatMoney(value: number): string {
  return `¥${Math.round(value).toLocaleString('zh-CN')}`
}

