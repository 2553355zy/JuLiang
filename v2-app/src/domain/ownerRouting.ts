import type { AccountOwner } from './types'

export type OwnerRouteType = 'material' | 'novel' | 'account' | 'fallback'

export interface OwnerRoute {
  routeType: Exclude<OwnerRouteType, 'fallback'>
  key: string
  owner: AccountOwner
}

export interface OwnerRoutingResult {
  materialId: string
  routeType: OwnerRouteType
  receiver: AccountOwner
  matchedKey: string
}

