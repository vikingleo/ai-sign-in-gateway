import {
  probeManualGatewayRouteBalance,
  probeGatewayRouteBalances,
  updateAllGatewayRouteBalancesAction,
  type ProbeManualGatewayRouteBalanceOptions,
  type ProbeGatewayRouteBalancesRuntimeOptions,
  type UpdateAllGatewayRouteBalancesActionOptions,
} from './gatewayRouteBalanceProbeFlowController.ts'
import type { BalanceProbeResult, GatewayOverview, GatewayRoute } from './types.ts'

export type { ProbeGatewayRouteBalancesRuntimeOptions } from './gatewayRouteBalanceProbeFlowController.ts'

type GatewayBalanceProbeCount = {
  success: number
  failed: number
}

type GatewayRouteBalanceNotice = {
  tone: 'success' | 'error'
  message: string
}

type BalanceRequest = (
  routeId: number,
  payload?: { balance_probe_url?: string },
) => Promise<BalanceProbeResult>

type GatewayRouteBalanceProbeRuntimeState = {
  trackRoutes: (routeIds: number[]) => void
  untrackRoutes: (routeIds: number[]) => void
}

type ProbeGatewayRouteBalancesRuntimeDependencies = {
  requestBalance: BalanceRequest
  applyBalanceResult: (result: BalanceProbeResult) => void
  requestOverview: () => Promise<GatewayOverview>
  setOverview: (overview: GatewayOverview) => void
  probeState: GatewayRouteBalanceProbeRuntimeState
  notifyOverviewChanged: () => void
  showNotice: (notice: GatewayRouteBalanceNotice) => void
}

type ProbeGatewayRouteBalancesAction = (
  routeIds: number[],
  options?: ProbeGatewayRouteBalancesRuntimeOptions,
) => Promise<GatewayBalanceProbeCount>

export function createProbeGatewayRouteBalancesAction({
  probeState,
  ...dependencies
}: ProbeGatewayRouteBalancesRuntimeDependencies): ProbeGatewayRouteBalancesAction {
  return (routeIds, options = {}) =>
    probeGatewayRouteBalances({
      ...dependencies,
      ...options,
      routeIds,
      trackRoutes: probeState.trackRoutes,
      untrackRoutes: probeState.untrackRoutes,
    })
}

type ProbeManualGatewayRouteBalanceActionDependencies =
  Omit<ProbeManualGatewayRouteBalanceOptions, 'route' | 'balanceProbeURL'> & {
    getRoute: () => GatewayRoute | null
    getBalanceProbeURL: () => string
  }

export function createProbeManualGatewayRouteBalanceAction({
  getRoute,
  getBalanceProbeURL,
  ...dependencies
}: ProbeManualGatewayRouteBalanceActionDependencies) {
  return () =>
    probeManualGatewayRouteBalance({
      ...dependencies,
      route: getRoute(),
      balanceProbeURL: getBalanceProbeURL(),
    })
}

type UpdateAllGatewayRouteBalancesActionDependencies =
  Omit<UpdateAllGatewayRouteBalancesActionOptions, 'routes' | 'isRouteProbeRunning'> & {
    getRoutes: () => GatewayRoute[]
    isRouteProbeRunning: () => boolean
  }

export function createUpdateAllGatewayRouteBalancesAction({
  getRoutes,
  isRouteProbeRunning,
  ...dependencies
}: UpdateAllGatewayRouteBalancesActionDependencies) {
  return () =>
    updateAllGatewayRouteBalancesAction({
      ...dependencies,
      routes: getRoutes(),
      isRouteProbeRunning: isRouteProbeRunning(),
    })
}
