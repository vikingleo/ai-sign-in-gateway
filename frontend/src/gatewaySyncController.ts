import {
  buildGatewaySyncErrorPlan,
  buildGatewaySyncSuccessPlan,
} from './gatewayRouteStateModel.ts'
import type { GatewayRoute } from './types.ts'

type GatewaySyncNoticePlan =
  | ReturnType<typeof buildGatewaySyncErrorPlan>
  | ReturnType<typeof buildGatewaySyncSuccessPlan>

type GatewaySyncResult = {
  route_count: number
}

type GatewayBalanceProbeResult = {
  success: number
}

export type SyncGatewayRoutesWithBalancesOptions = {
  getRoutes: () => GatewayRoute[]
  requestSync: () => Promise<GatewaySyncResult>
  reloadGatewayData: () => Promise<void>
  probeRouteBalances: (routeIds: number[], options: { silent: true }) => Promise<GatewayBalanceProbeResult>
  setLoading: (loading: boolean) => void
  showPlanNotice: (plan: GatewaySyncNoticePlan) => void
}

export type SyncGatewayRoutesWithBalancesActionOptions = SyncGatewayRoutesWithBalancesOptions

export function createSyncGatewayRoutesWithBalancesAction(options: SyncGatewayRoutesWithBalancesActionOptions) {
  return () => syncGatewayRoutesWithBalances(options)
}

export async function syncGatewayRoutesWithBalances({
  getRoutes,
  requestSync,
  reloadGatewayData,
  probeRouteBalances,
  setLoading,
  showPlanNotice,
}: SyncGatewayRoutesWithBalancesOptions) {
  setLoading(true)
  try {
    const result = await requestSync()
    await reloadGatewayData()
    const routes = getRoutes()
    const balances = await probeRouteBalances(routes.map((route) => route.id), { silent: true })
    showPlanNotice(buildGatewaySyncSuccessPlan({
      routeCount: result.route_count,
      balanceSuccessCount: balances.success,
    }))
  } catch (err) {
    showPlanNotice(buildGatewaySyncErrorPlan(err))
  } finally {
    setLoading(false)
  }
}
