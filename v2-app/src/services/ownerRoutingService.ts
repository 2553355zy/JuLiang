import type { OwnerRoute, OwnerRoutingResult } from '../domain/ownerRouting'
import type { MaterialSignal } from '../domain/types'

export function resolveOwnerRoute(signal: MaterialSignal, routes: OwnerRoute[]): OwnerRoutingResult {
  const materialRoute = routes.find((route) => route.routeType === 'material' && route.key === signal.id)
  if (materialRoute) return toResult(signal.id, materialRoute, signal.id)

  const novelRoute = routes.find((route) => route.routeType === 'novel' && route.key === signal.novelName)
  if (novelRoute) return toResult(signal.id, novelRoute, signal.novelName)

  const accountRoute = routes.find((route) => route.routeType === 'account' && route.key === signal.accountId)
  if (accountRoute) return toResult(signal.id, accountRoute, signal.accountId)

  return {
    materialId: signal.id,
    routeType: 'fallback',
    receiver: signal.owner,
    matchedKey: signal.owner.id,
  }
}

export function resolveOwnerRoutes(signals: MaterialSignal[], routes: OwnerRoute[]): OwnerRoutingResult[] {
  return signals.map((signal) => resolveOwnerRoute(signal, routes))
}

function toResult(materialId: string, route: OwnerRoute, matchedKey: string): OwnerRoutingResult {
  return {
    materialId,
    routeType: route.routeType,
    receiver: route.owner,
    matchedKey,
  }
}

