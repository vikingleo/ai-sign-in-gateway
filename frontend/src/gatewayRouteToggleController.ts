import {
  buildGatewayRouteToggleErrorPlan,
  buildGatewayRouteToggleSuccessPlan,
} from './gatewayRouteStateModel.ts'
import type { GatewayRoute } from './types.ts'

type GatewayRouteToggleNoticePlan =
  | ReturnType<typeof buildGatewayRouteToggleErrorPlan>
  | ReturnType<typeof buildGatewayRouteToggleSuccessPlan>

export type ToggleGatewayRouteEnabledOptions = {
  route: GatewayRoute
  requestToggle: (routeId: number) => Promise<unknown>
  reloadGatewayData: () => Promise<void>
  showPlanNotice: (plan: GatewayRouteToggleNoticePlan) => void
}

export async function toggleGatewayRouteEnabled({
  route,
  requestToggle,
  reloadGatewayData,
  showPlanNotice,
}: ToggleGatewayRouteEnabledOptions) {
  try {
    await requestToggle(route.id)
    showPlanNotice(buildGatewayRouteToggleSuccessPlan({
      wasEnabled: route.is_enabled,
    }))
    await reloadGatewayData()
  } catch (err) {
    showPlanNotice(buildGatewayRouteToggleErrorPlan(err))
  }
}
