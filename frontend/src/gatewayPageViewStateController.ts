import { useGatewayDisplayPageState } from './gatewayDisplayPageController.ts'
import type { GatewayNoticeActions } from './gatewayNoticeController.ts'
import { useGatewayPageAccessState } from './gatewayPageAccessStateController.ts'
import type { GatewayPagePlatform } from './gatewayPagePlatformController.ts'
import type { GatewayPageState } from './gatewayPageStateController.ts'
import { useGatewayRouteMutationActions } from './gatewayRouteMutationActionsController.ts'

type GatewayPageViewStateOptions = {
  state: GatewayPageState
  getApiBase: () => string
  gatewayPagePlatform: GatewayPagePlatform
  showPlanNotice: GatewayNoticeActions['showPlanNotice']
}

export function useGatewayPageViewState({
  state,
  getApiBase,
  gatewayPagePlatform,
  showPlanNotice,
}: GatewayPageViewStateOptions) {
  const accessState = useGatewayPageAccessState({
    state,
    getApiBase,
    gatewayPagePlatform,
    showPlanNotice,
  })
  const routeMutationActions = useGatewayRouteMutationActions({
    routes: state.routes,
    priorityRoutes: state.priorityRoutes,
    overview: state.overview,
    includeDisabled: state.includeDisabled,
  })
  const displayState = useGatewayDisplayPageState({
    overview: state.overview,
    routes: state.routes,
    logs: state.logs,
    routeLogs: state.routeLogs,
    activeRequests: state.activeRequests,
    gatewayUsage: state.gatewayUsage,
    siteGroups: state.siteGroups,
    routeGroups: state.routeGroups,
    selectedGroups: state.selectedGroups,
    addUpstreamGroupNames: state.addUpstreamGroupNames,
    routeFilterState: state.routeFilters.state,
    logSearch: state.logSearch,
    routeLogSearch: state.routeLogSearch,
    settingsForm: state.settingsDialog.form,
  })

  return {
    accessState,
    routeMutationActions,
    displayState,
  }
}
