import {
  buildGatewayEnableOnlyRouteErrorPlan,
  buildGatewayEnableOnlyRouteSuccessPlan,
} from './gatewayRouteStateModel.ts'
import type { GatewayRoute } from './types.ts'

type GatewayRouteEnableOnlyNoticePlan =
  | ReturnType<typeof buildGatewayEnableOnlyRouteErrorPlan>
  | ReturnType<typeof buildGatewayEnableOnlyRouteSuccessPlan>

export type EnableOnlyGatewayRouteWithConfirmationOptions = {
  route: GatewayRoute
  confirmEnableOnly: (route: GatewayRoute) => boolean
  requestEnableOnly: (routeId: number) => Promise<unknown>
  reloadGatewayData: () => Promise<void>
  showPlanNotice: (plan: GatewayRouteEnableOnlyNoticePlan) => void
}

export async function enableOnlyGatewayRouteWithConfirmation({
  route,
  confirmEnableOnly,
  requestEnableOnly,
  reloadGatewayData,
  showPlanNotice,
}: EnableOnlyGatewayRouteWithConfirmationOptions) {
  if (!confirmEnableOnly(route)) {
    return
  }

  try {
    await requestEnableOnly(route.id)
    showPlanNotice(buildGatewayEnableOnlyRouteSuccessPlan())
    await reloadGatewayData()
  } catch (err) {
    showPlanNotice(buildGatewayEnableOnlyRouteErrorPlan(err))
  }
}
