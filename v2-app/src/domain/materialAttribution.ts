import type { MaterialNameTags } from './materialNameParser'
import type { PerformanceMetrics } from './types'

export interface MaterialAttributionInput {
  id: string
  accountId: string
  materialName: string
  metrics: PerformanceMetrics
  ownerName?: string
}

export interface MaterialAttribution {
  id: string
  accountId: string
  materialName: string
  tags: MaterialNameTags
  novelName: string
  status: 'resolved' | 'needs_review'
  reviewReason?: string
  shouldNotifyOwner: boolean
  metrics: PerformanceMetrics
}

export interface MaterialAttributionSummary {
  attributions: MaterialAttribution[]
  resolvedCount: number
  reviewCount: number
  notificationCandidateCount: number
  novelNames: string[]
}

