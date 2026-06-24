import {
  applyGatewaySiteSummaries,
  buildGatewayRouteSummaryRefreshErrorPlan,
  buildGatewayRouteSummaryRefreshPlan,
} from './gatewayRouteStateModel.ts'
import type { GatewayRoute, SiteSummary } from './types.ts'

type GatewayRouteSummaryNoticePlan = ReturnType<typeof buildGatewayRouteSummaryRefreshErrorPlan>

export type RefreshGatewayRouteSummariesOptions = {
  routes: GatewayRoute[]
  requestSummaries: (payload: { site_ids: number[] }) => Promise<SiteSummary[]>
  setRoutes: (routes: GatewayRoute[]) => void
  showPlanNotice: (plan: GatewayRouteSummaryNoticePlan) => void
}

export async function refreshGatewayRouteSummaries({
  routes,
  requestSummaries,
  setRoutes,
  showPlanNotice,
}: RefreshGatewayRouteSummariesOptions) {
  const refreshPlan = buildGatewayRouteSummaryRefreshPlan(routes)
  if (!refreshPlan.shouldRefresh) {
    return
  }

  try {
    const summaries = await requestSummaries({ site_ids: refreshPlan.siteIds })
    setRoutes(applyGatewaySiteSummaries(routes, summaries))
  } catch (err) {
    showPlanNotice(buildGatewayRouteSummaryRefreshErrorPlan(err))
  }
}

export type RefreshGatewayRouteSummariesActionOptions = Omit<RefreshGatewayRouteSummariesOptions, 'routes'> & {
  getRoutes: () => GatewayRoute[]
}

export function createRefreshGatewayRouteSummariesAction({
  getRoutes,
  ...options
}: RefreshGatewayRouteSummariesActionOptions) {
  return () =>
    refreshGatewayRouteSummaries({
      ...options,
      routes: getRoutes(),
    })
}
