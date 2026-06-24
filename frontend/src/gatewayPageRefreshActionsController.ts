import type { GatewayNoticeActions } from './gatewayNoticeController.ts'
import type { GatewayPageRequests } from './gatewayPageRequestsController.ts'
import type { useGatewayPageRuntimeActions } from './gatewayPageRuntimeActionsController.ts'
import type { GatewayPageState } from './gatewayPageStateController.ts'
import { useGatewayRefreshOperationsPageActions } from './gatewayRefreshOperationsPageController.ts'
import type { useGatewayRouteManagementOperationsPageActions } from './gatewayRouteManagementOperationsPageController.ts'

type GatewayPageRefreshActionsOptions = {
  state: GatewayPageState
  gatewayPageRequests: GatewayPageRequests
  runtimeActions: ReturnType<typeof useGatewayPageRuntimeActions>
  getRouteActions: () => ReturnType<typeof useGatewayRouteManagementOperationsPageActions>
  showPlanNotice: GatewayNoticeActions['showPlanNotice']
}

export function useGatewayPageRefreshActions({
  state,
  gatewayPageRequests,
  runtimeActions,
  getRouteActions,
  showPlanNotice,
}: GatewayPageRefreshActionsOptions) {
  return useGatewayRefreshOperationsPageActions({
    routes: state.routes,
    requestSummaries: gatewayPageRequests.refreshSiteSummaries,
    setRoutes: (routeData) => {
      state.routes.value = routeData
    },
    showPlanNotice,
    siteGroups: state.siteGroups,
    requestSiteGroups: gatewayPageRequests.getSiteGroups,
    routeGroups: state.routeGroups,
    requestRouteGroups: gatewayPageRequests.getGatewayRouteGroups,
    loadGatewayData: () => runtimeActions.loadData(),
    probeRouteBalances: (routeIds, options) => getRouteActions().probeRouteBalances(routeIds, options),
  })
}
