import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import { useGatewayDerivedState } from './gatewayDerivedStateController.ts'
import {
  logModelMeta,
  logRequestLabel,
  logRouteLabel,
  logUserAgent,
} from './gatewayActivityDisplayModel.ts'
import {
  buildRouteActivityFeed,
  formatGatewayTime,
} from './gatewayActivityFeedModel.ts'
import {
  loadRouteLabel,
  routeLastUpdateTime,
  routePathLabel,
  usageRouteLabel,
} from './gatewayRouteDisplayModel.ts'
import {
  createLogColumns,
  createRouteColumns,
  createUsageColumns,
  priorityDialogColumns,
} from './gatewayViewConfig.ts'
import {
  buildGatewayGroupOptions,
  buildGatewayMetricCards,
  buildGatewayRouteFilters,
  buildGatewayStrategyCards,
  buildSiteGroupOptions,
  buildRoutePoolPreviewRoutes,
  buildRoutePoolStatusCards,
  buildUsageSummaryCards,
  filterGatewayLogs,
  filterGatewayRoutes,
  routeTotalBalanceSummary,
} from './gatewayViewModel.ts'
import type {
  GatewayActiveRequest,
  GatewayLog,
  GatewayOverview,
  GatewayRoute,
  GatewayRouteGroup,
  GatewayUsage,
  SiteGroup,
} from './types.ts'

type GatewaySettingsFormLike = {
  route_concurrency_limit: number
}

type GatewayRouteFilterState = Parameters<typeof buildGatewayRouteFilters>[0]
type MaybeReadonlyRef<T> = Ref<T> | ComputedRef<T>

type GatewayDisplayPageStateOptions = {
  overview: Ref<GatewayOverview | null>
  routes: Ref<GatewayRoute[]>
  logs: Ref<GatewayLog[]>
  routeLogs: Ref<GatewayLog[]>
  activeRequests: Ref<GatewayActiveRequest[]>
  gatewayUsage: Ref<GatewayUsage | null>
  siteGroups: Ref<SiteGroup[]>
  routeGroups: Ref<GatewayRouteGroup[]>
  selectedGroups: Ref<string[]>
  addUpstreamGroupNames: Ref<string[]>
  routeFilterState: MaybeReadonlyRef<GatewayRouteFilterState>
  logSearch: Ref<string>
  routeLogSearch: Ref<string>
  settingsForm: GatewaySettingsFormLike
}

export function useGatewayDisplayPageState({
  overview,
  routes,
  logs,
  routeLogs,
  activeRequests,
  gatewayUsage,
  siteGroups,
  routeGroups,
  selectedGroups,
  addUpstreamGroupNames,
  routeFilterState,
  logSearch,
  routeLogSearch,
  settingsForm,
}: GatewayDisplayPageStateOptions) {
  const derivedState = useGatewayDerivedState({
    overview,
    routes,
    logs,
    routeLogs,
    activeRequests,
    gatewayUsage,
    siteGroups,
    routeGroups,
    selectedGroups,
    addUpstreamGroupNames,
    routeFilterState: computed(() => buildGatewayRouteFilters(routeFilterState.value)),
    logSearch,
    routeLogSearch,
    settingsForm,
    buildRouteTotalBalanceSummary: routeTotalBalanceSummary,
    buildMetricCards: buildGatewayMetricCards,
    buildRoutePoolStatusCards,
    buildRoutePoolPreviewRoutes,
    buildGatewayStrategyCards,
    buildUsageSummaryCards,
    buildGroupOptions: buildGatewayGroupOptions,
    buildSiteGroupOptions,
    buildActivityFeed: buildRouteActivityFeed,
    filterRoutes: filterGatewayRoutes,
    filterLogs: filterGatewayLogs,
    createRouteColumns: () => createRouteColumns({
      loadRouteLabel,
      routePathLabel,
      routeLastUpdateTime,
    }),
    createUsageColumns: () => createUsageColumns({ usageRouteLabel }),
    createLogColumns: () => createLogColumns({
      logRequestLabel,
      logRouteLabel,
      logModelMeta,
      logUserAgent,
    }),
  })

  return {
    ...derivedState,
    priorityDialogColumns,
    formatTime: formatGatewayTime,
  }
}

export type GatewayDisplayPageState = ReturnType<typeof useGatewayDisplayPageState>
