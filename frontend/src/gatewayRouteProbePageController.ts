import type { Ref } from 'vue'

import {
  createProbeGatewayRouteBalanceAction,
} from './gatewayRouteBalanceProbeFlowController.ts'
import {
  createProbeGatewayRouteBalancesAction,
  createProbeManualGatewayRouteBalanceAction,
  createUpdateAllGatewayRouteBalancesAction,
} from './gatewayRouteBalanceProbeRuntimeController.ts'
import {
  createProbeAllGatewayRoutesAction,
  createProbeGatewayRouteAction,
} from './gatewayRouteProbeController.ts'
import type {
  BalanceProbeResult,
  GatewayOverview,
  GatewayRoute,
  GatewayRouteProbeResult,
} from './types.ts'
import type { RouteBatchProgress } from './gatewayViewModel.ts'

type GatewayProbeNotice = {
  tone: 'success' | 'error'
  message: string
}

type GatewayProbeNoticePlan = {
  notice: GatewayProbeNotice
}

type BalanceRequest = (
  routeId: number,
  payload?: { balance_probe_url?: string },
) => Promise<BalanceProbeResult>

type GatewayRouteProbePageOptions = {
  routes: Ref<GatewayRoute[]>
  overview: Ref<GatewayOverview | null>
  probeLoading: Ref<boolean>
  balanceProbeAllProgress: Ref<RouteBatchProgress | null>
  balanceProbeManualRoute: Ref<GatewayRoute | null>
  balanceProbeManualURL: Ref<string>
  routeProbeState: {
    startBatch: (routeIds: number[]) => void
    finishBatchRoute: (routeId: number, ok: boolean) => void
    finishBatch: (routeIds: number[]) => void
    trackRoute: (routeId: number) => void
    untrackRoute: (routeId: number) => void
  }
  routeBalanceProbeState: {
    trackRoutes: (routeIds: number[]) => void
    untrackRoutes: (routeIds: number[]) => void
    startBatch: (routeIds: number[]) => void
    finishBatch: (routeIds: number[]) => void
    trackRoute: (routeId: number) => void
    untrackRoute: (routeId: number) => void
  }
  requestProbeBatch: (routeIds: number[]) => Promise<GatewayRouteProbeResult[]>
  requestProbe: (routeId: number) => Promise<GatewayRouteProbeResult>
  requestBalance: BalanceRequest
  requestOverview: () => Promise<GatewayOverview>
  applyProbeResult: (result: GatewayRouteProbeResult) => void
  applyBalanceResult: (result: BalanceProbeResult) => void
  refreshRouteSummaries: () => Promise<void>
  notifyOverviewChanged: () => void
  openManualDialog: (route: GatewayRoute, message: string) => void
  setManualDialogLoading: (loading: boolean) => void
  closeManualDialogAfterSuccess: () => void
  setManualFailureMessage: (message: string) => void
  now: () => string
  showNotice: (notice: GatewayProbeNotice) => void
  showPlanNotice: (plan: GatewayProbeNoticePlan) => void
}

export function useGatewayRouteProbePageActions({
  routes,
  overview,
  probeLoading,
  balanceProbeAllProgress,
  balanceProbeManualRoute,
  balanceProbeManualURL,
  routeProbeState,
  routeBalanceProbeState,
  requestProbeBatch,
  requestProbe,
  requestBalance,
  requestOverview,
  applyProbeResult,
  applyBalanceResult,
  refreshRouteSummaries,
  notifyOverviewChanged,
  openManualDialog,
  setManualDialogLoading,
  closeManualDialogAfterSuccess,
  setManualFailureMessage,
  now,
  showNotice,
  showPlanNotice,
}: GatewayRouteProbePageOptions) {
  const probeRouteBalances = createProbeGatewayRouteBalancesAction({
    requestBalance,
    applyBalanceResult,
    requestOverview,
    setOverview: (nextOverview) => {
      overview.value = nextOverview
    },
    probeState: routeBalanceProbeState,
    notifyOverviewChanged,
    showNotice,
  })
  const handleProbeAll = createProbeAllGatewayRoutesAction({
    getRoutes: () => routes.value,
    requestProbeBatch,
    applyProbeResult,
    probeState: routeProbeState,
    now,
    showPlanNotice,
  })
  const handleUpdateAllBalances = createUpdateAllGatewayRouteBalancesAction({
    getRoutes: () => routes.value,
    isRouteProbeRunning: () => probeLoading.value,
    probeState: routeBalanceProbeState,
    probeRouteBalances,
    progress: balanceProbeAllProgress,
    refreshRouteSummaries,
    showNotice,
    showPlanNotice,
  })
  const handleProbeRoute = createProbeGatewayRouteAction({
    requestProbe,
    applyProbeResult,
    probeState: routeProbeState,
    showNotice,
    showPlanNotice,
  })
  const handleProbeRouteBalance = createProbeGatewayRouteBalanceAction({
    requestBalance,
    applyBalanceResult,
    refreshRouteSummaries,
    notifyOverviewChanged,
    openManualDialog,
    probeState: routeBalanceProbeState,
    showNotice,
    showPlanNotice,
  })
  const submitManualRouteBalanceProbe = createProbeManualGatewayRouteBalanceAction({
    getRoute: () => balanceProbeManualRoute.value,
    getBalanceProbeURL: () => balanceProbeManualURL.value,
    requestBalance,
    applyBalanceResult,
    refreshRouteSummaries,
    notifyOverviewChanged,
    setLoading: setManualDialogLoading,
    trackRoute: routeBalanceProbeState.trackRoute,
    untrackRoute: routeBalanceProbeState.untrackRoute,
    closeAfterSuccess: closeManualDialogAfterSuccess,
    setFailureMessage: setManualFailureMessage,
    showPlanNotice,
  })

  return {
    probeRouteBalances,
    handleProbeAll,
    handleUpdateAllBalances,
    handleProbeRoute,
    handleProbeRouteBalance,
    submitManualRouteBalanceProbe,
  }
}
