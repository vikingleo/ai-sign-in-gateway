import { useGatewayAdminOperationsPageActions } from './gatewayAdminOperationsPageController.ts'
import type { GatewayNoticeActions } from './gatewayNoticeController.ts'
import type { GatewayPageRequests } from './gatewayPageRequestsController.ts'
import type { GatewayPageState } from './gatewayPageStateController.ts'
import type { useGatewayRouteManagementOperationsPageActions } from './gatewayRouteManagementOperationsPageController.ts'
import type { useGatewayPageRuntimeActions } from './gatewayPageRuntimeActionsController.ts'

type GatewayPageAdminActionsOptions = {
  state: GatewayPageState
  gatewayPageRequests: GatewayPageRequests
  routeActions: ReturnType<typeof useGatewayRouteManagementOperationsPageActions>
  runtimeActions: ReturnType<typeof useGatewayPageRuntimeActions>
  showPlanNotice: GatewayNoticeActions['showPlanNotice']
}

export function useGatewayPageAdminActions({
  state,
  gatewayPageRequests,
  routeActions,
  runtimeActions,
  showPlanNotice,
}: GatewayPageAdminActionsOptions) {
  return useGatewayAdminOperationsPageActions({
    routes: state.routes,
    addUpstreamForm: state.addUpstreamForm,
    addUpstreamGroupNames: state.addUpstreamGroupNames,
    requestSync: gatewayPageRequests.syncGatewayRoutes,
    requestCreateSite: gatewayPageRequests.createSite,
    reloadGatewayData: runtimeActions.reloadGatewayDataAfterAction,
    probeRouteBalances: routeActions.probeRouteBalances,
    setGatewayLoading: state.gatewayRuntime.setLoading,
    setAddUpstreamLoading: state.addUpstreamDialog.setLoading,
    closeAddUpstreamAfterSuccess: state.addUpstreamDialog.closeAfterSuccess,
    settingsForm: state.settingsDialog.form,
    requestSaveSettings: gatewayPageRequests.updateGatewaySettings,
    setSettingsLoading: state.settingsDialog.setLoading,
    setSettings: state.settingsDialog.setSettings,
    closeSettingsAfterSuccess: state.settingsDialog.closeAfterSuccess,
    showPlanNotice,
  })
}
