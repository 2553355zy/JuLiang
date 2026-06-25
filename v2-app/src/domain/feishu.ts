import type { MaterialSignal } from './types'

export interface FeishuNotificationDraft {
  title: string
  summary: string
  receiver: string
  severity: 'info' | 'action'
  dedupeKey: string
}

export function buildMaterialSignalNotification(signal: MaterialSignal): FeishuNotificationDraft {
  return {
    title: `爆量素材命中：${signal.novelName}`,
    summary: `${signal.materialName} ROI ${signal.metrics.roi.toFixed(2)}，消耗 ¥${Math.round(signal.metrics.spend)}，转化 ${signal.metrics.conversions}。建议负责人 ${signal.owner.name} 复盘并扩展同题材素材。`,
    receiver: signal.owner.feishuUserId ?? signal.owner.name,
    severity: signal.metrics.roi >= 1.5 ? 'action' : 'info',
    dedupeKey: `${signal.accountId}:${signal.novelName}:${signal.id}`,
  }
}

