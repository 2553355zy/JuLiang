import type {
  MaterialAttribution,
  MaterialAttributionInput,
  MaterialAttributionSummary,
} from '../domain/materialAttribution'
import { parseMaterialName } from '../domain/materialNameParser'

export interface MaterialAttributionPolicy {
  minConfidence: number
  notifyRoi: number
  notifyMinConversions: number
}

export const defaultMaterialAttributionPolicy: MaterialAttributionPolicy = {
  minConfidence: 0.68,
  notifyRoi: 1.4,
  notifyMinConversions: 100,
}

export function attributeMaterials(
  inputs: MaterialAttributionInput[],
  policy: MaterialAttributionPolicy = defaultMaterialAttributionPolicy,
): MaterialAttributionSummary {
  const attributions = inputs.map((input) => attributeMaterial(input, policy))

  return {
    attributions,
    resolvedCount: attributions.filter((item) => item.status === 'resolved').length,
    reviewCount: attributions.filter((item) => item.status === 'needs_review').length,
    notificationCandidateCount: attributions.filter((item) => item.shouldNotifyOwner).length,
    novelNames: [...new Set(attributions.map((item) => item.novelName).filter((name) => name !== '待识别小说'))],
  }
}

function attributeMaterial(
  input: MaterialAttributionInput,
  policy: MaterialAttributionPolicy,
): MaterialAttribution {
  const tags = parseMaterialName(input.materialName)
  const status = tags.confidence >= policy.minConfidence ? 'resolved' : 'needs_review'
  const shouldNotifyOwner =
    status === 'resolved' &&
    input.metrics.roi >= policy.notifyRoi &&
    input.metrics.conversions >= policy.notifyMinConversions

  return {
    id: input.id,
    accountId: input.accountId,
    materialName: input.materialName,
    tags,
    novelName: tags.novelName,
    status,
    reviewReason: status === 'needs_review' ? buildReviewReason(tags.confidence, tags.unresolvedParts) : undefined,
    shouldNotifyOwner,
    metrics: input.metrics,
  }
}

function buildReviewReason(confidence: number, unresolvedParts: string[]): string {
  const parts = unresolvedParts.length ? `未归类片段：${unresolvedParts.join('、')}` : '缺少可识别小说名结构'
  return `置信度 ${Math.round(confidence * 100)}%，${parts}`
}

