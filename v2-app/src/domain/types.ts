export type AccountStatus = 'healthy' | 'attention' | 'critical'

export type OperationRisk = 'low' | 'medium' | 'high'

export type RecommendationType =
  | 'scale'
  | 'hold'
  | 'reduce'
  | 'pause'
  | 'inspect_tracking'
  | 'notify_owner'

export interface AccountOwner {
  id: string
  name: string
  role: 'operator' | 'creative' | 'producer' | 'manager'
  feishuUserId?: string
  feishuWebhook?: string
}

export interface PerformanceMetrics {
  spend: number
  revenue: number
  conversions: number
  clicks: number
  impressions: number
  ctr: number
  cpc: number
  conversionCost: number
  roi: number
  profit: number
}

export interface DeliveryAccount {
  id: string
  name: string
  balance: number
  dailyBudget: number
  owner: AccountOwner
  status: AccountStatus
  metrics: PerformanceMetrics
  trackingHealth: 'normal' | 'delayed' | 'broken'
  updatedAt: string
}

export interface MaterialSignal {
  id: string
  accountId: string
  materialName: string
  novelName: string
  hookType: string
  owner: AccountOwner
  metrics: PerformanceMetrics
  confidence: number
  firstSeenAt: string
}

export interface OperationPlan {
  id: string
  targetType: 'account' | 'project' | 'promotion' | 'material'
  targetId: string
  targetName: string
  stateHint?: OperationTargetStateHint
  action: string
  reason: string
  risk: OperationRisk
  requiresConfirmation: boolean
}

export interface OperationTargetStateHint {
  budget?: number
  status?: 'running' | 'paused' | 'closed' | 'unknown'
  source: 'projection' | 'unavailable'
  capturedAt?: string
}

export interface RoiRecommendation {
  id: string
  accountId: string
  title: string
  type: RecommendationType
  evidence: string
  priority: 'p0' | 'p1' | 'p2'
  operationPlan?: OperationPlan
}
