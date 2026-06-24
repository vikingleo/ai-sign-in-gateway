import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import { routeConcurrencyLimitLabel } from './gatewaySettingsModel.ts'
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

type GatewayDerivedStateOptions<
  TRouteFilters,
  TRouteTotalBalanceSummary,
  TMetricCards,
  TRoutePoolStatusCards,
  TRoutePoolPreviewRoutes,
  TGatewayStrategyCards,
  TUsageSummaryCards,
  TGroupOptions,
  TActivityFeed,
  TRouteColumns,
  TUsageColumns,
  TLogColumns,
> = {
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
  routeFilterState: ComputedRef<TRouteFilters>
  logSearch: Ref<string>
  routeLogSearch: Ref<string>
  settingsForm: GatewaySettingsFormLike
  buildRouteTotalBalanceSummary: (routes: GatewayRoute[]) => TRouteTotalBalanceSummary
  buildMetricCards: (
    overview: GatewayOverview | null,
    routeTotalBalanceSummary: TRouteTotalBalanceSummary,
  ) => TMetricCards
  buildRoutePoolStatusCards: (overview: GatewayOverview | null) => TRoutePoolStatusCards
  buildRoutePoolPreviewRoutes: (routes: GatewayRoute[]) => TRoutePoolPreviewRoutes
  buildGatewayStrategyCards: (breakdown: GatewayOverview['strategy_breakdown_24h'] | undefined) => TGatewayStrategyCards
  buildUsageSummaryCards: (usage: GatewayUsage | null) => TUsageSummaryCards
  buildGroupOptions: (
    groups: GatewayRouteGroup[],
    routes: GatewayRoute[],
    selectedGroups: string[],
  ) => TGroupOptions
  buildSiteGroupOptions: (
    siteGroups: SiteGroup[],
    addUpstreamGroupNames: string[],
  ) => TGroupOptions
  buildActivityFeed: (activeRequests: GatewayActiveRequest[], logs: GatewayLog[]) => TActivityFeed
  filterRoutes: (routes: GatewayRoute[], filters: TRouteFilters) => GatewayRoute[]
  filterLogs: (logs: GatewayLog[], search: string) => GatewayLog[]
  createRouteColumns: () => TRouteColumns
  createUsageColumns: () => TUsageColumns
  createLogColumns: () => TLogColumns
}

export function useGatewayDerivedState<
  TRouteFilters,
  TRouteTotalBalanceSummary,
  TMetricCards,
  TRoutePoolStatusCards,
  TRoutePoolPreviewRoutes,
  TGatewayStrategyCards,
  TUsageSummaryCards,
  TGroupOptions,
  TActivityFeed,
  TRouteColumns,
  TUsageColumns,
  TLogColumns,
>({
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
  buildRouteTotalBalanceSummary,
  buildMetricCards,
  buildRoutePoolStatusCards,
  buildRoutePoolPreviewRoutes,
  buildGatewayStrategyCards,
  buildUsageSummaryCards,
  buildGroupOptions,
  buildSiteGroupOptions,
  buildActivityFeed,
  filterRoutes,
  filterLogs,
  createRouteColumns,
  createUsageColumns,
  createLogColumns,
}: GatewayDerivedStateOptions<
  TRouteFilters,
  TRouteTotalBalanceSummary,
  TMetricCards,
  TRoutePoolStatusCards,
  TRoutePoolPreviewRoutes,
  TGatewayStrategyCards,
  TUsageSummaryCards,
  TGroupOptions,
  TActivityFeed,
  TRouteColumns,
  TUsageColumns,
  TLogColumns
>) {
  const routeTotalBalanceSummary = computed(() => buildRouteTotalBalanceSummary(routes.value))
  const metricCards = computed(() => buildMetricCards(overview.value, routeTotalBalanceSummary.value))
  const routePoolStatusCards = computed(() => buildRoutePoolStatusCards(overview.value))
  const routePoolPreviewRoutes = computed(() => buildRoutePoolPreviewRoutes(routes.value))
  const gatewayStrategyCards = computed(() => buildGatewayStrategyCards(overview.value?.strategy_breakdown_24h))
  const usageSummaryCards = computed(() => buildUsageSummaryCards(gatewayUsage.value))
  const groupOptions = computed(() =>
    buildGroupOptions(routeGroups.value, routes.value, selectedGroups.value),
  )
  const siteGroupOptions = computed(() =>
    buildSiteGroupOptions(siteGroups.value, addUpstreamGroupNames.value),
  )
  const routeConcurrencyLimitLabelValue = computed(() =>
    routeConcurrencyLimitLabel(settingsForm.route_concurrency_limit),
  )
  const routeActivityFeed = computed(() => buildActivityFeed(activeRequests.value, logs.value))
  const filteredRoutes = computed(() => filterRoutes(routes.value, routeFilterState.value))
  const filteredLogs = computed(() => filterLogs(logs.value, logSearch.value))
  const filteredRouteLogs = computed(() => filterLogs(routeLogs.value, routeLogSearch.value))

  return {
    routeTotalBalanceSummary,
    metricCards,
    routePoolStatusCards,
    routePoolPreviewRoutes,
    gatewayStrategyCards,
    usageColumns: createUsageColumns(),
    usageSummaryCards,
    routeConcurrencyLimitLabel: routeConcurrencyLimitLabelValue,
    groupOptions,
    siteGroupOptions,
    routeColumns: createRouteColumns(),
    logColumns: createLogColumns(),
    routeActivityFeed,
    filteredRoutes,
    filteredLogs,
    filteredRouteLogs,
  }
}

export type GatewayDerivedState = ReturnType<typeof useGatewayDerivedState>
