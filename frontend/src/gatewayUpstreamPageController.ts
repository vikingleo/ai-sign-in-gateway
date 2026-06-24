import type { Ref } from 'vue'

import { createSubmitGatewayAddUpstreamAction } from './gatewayAddUpstreamController.ts'
import type { AddUpstreamForm } from './gatewayAddUpstreamModel.ts'
import { createSyncGatewayRoutesWithBalancesAction } from './gatewaySyncController.ts'
import type { GatewayRoute, SitePayload } from './types.ts'

type GatewayUpstreamNoticePlan = {
  notice: {
    tone: 'success' | 'error'
    message: string
  }
}

type GatewaySyncResult = {
  route_count: number
}

type GatewayBalanceProbeResult = {
  success: number
}

type GatewayUpstreamPageOptions = {
  routes: Ref<GatewayRoute[]>
  addUpstreamForm: AddUpstreamForm
  addUpstreamGroupNames: Ref<string[]>
  requestSync: () => Promise<GatewaySyncResult>
  requestCreateSite: (payload: SitePayload) => Promise<unknown>
  reloadGatewayData: () => Promise<void>
  probeRouteBalances: (routeIds: number[], options: { silent: true }) => Promise<GatewayBalanceProbeResult>
  setGatewayLoading: (loading: boolean) => void
  setAddUpstreamLoading: (loading: boolean) => void
  closeAddUpstreamAfterSuccess: () => void
  showPlanNotice: (plan: GatewayUpstreamNoticePlan) => void
}

export function useGatewayUpstreamPageActions({
  routes,
  addUpstreamForm,
  addUpstreamGroupNames,
  requestSync,
  requestCreateSite,
  reloadGatewayData,
  probeRouteBalances,
  setGatewayLoading,
  setAddUpstreamLoading,
  closeAddUpstreamAfterSuccess,
  showPlanNotice,
}: GatewayUpstreamPageOptions) {
  const handleSync = createSyncGatewayRoutesWithBalancesAction({
    getRoutes: () => routes.value,
    requestSync,
    reloadGatewayData,
    probeRouteBalances,
    setLoading: setGatewayLoading,
    showPlanNotice,
  })
  const submitAddUpstream = createSubmitGatewayAddUpstreamAction({
    getForm: () => addUpstreamForm,
    getGroupNames: () => addUpstreamGroupNames.value,
    requestCreateSite,
    setLoading: setAddUpstreamLoading,
    closeAfterSuccess: closeAddUpstreamAfterSuccess,
    syncGatewayRoutes: handleSync,
    reloadGatewayData,
    showPlanNotice,
  })

  return {
    handleSync,
    submitAddUpstream,
  }
}
