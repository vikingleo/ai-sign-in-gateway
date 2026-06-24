import type { GatewayRoute } from './types.ts'

type BalanceProbeResult = {
  success: number
}

export type RefreshGatewayManuallyOptions = {
  routes: GatewayRoute[]
  loadGatewayData: () => Promise<void>
  probeRouteBalances: (routeIds: number[], options: { silent: true }) => Promise<BalanceProbeResult>
  refreshRouteSummaries: () => Promise<void>
}

export type RefreshGatewayManuallyActionOptions = Omit<RefreshGatewayManuallyOptions, 'routes'> & {
  getRoutes: () => GatewayRoute[]
}

export function createRefreshGatewayManuallyAction({
  getRoutes,
  loadGatewayData,
  probeRouteBalances,
  refreshRouteSummaries,
}: RefreshGatewayManuallyActionOptions) {
  return () =>
    refreshGatewayManually({
      routes: getRoutes(),
      loadGatewayData,
      probeRouteBalances,
      refreshRouteSummaries,
    })
}

export async function refreshGatewayManually({
  routes,
  loadGatewayData,
  probeRouteBalances,
  refreshRouteSummaries,
}: RefreshGatewayManuallyOptions) {
  await loadGatewayData()
  await probeRouteBalances(routes.map((route) => route.id), { silent: true })
  await refreshRouteSummaries()
}
