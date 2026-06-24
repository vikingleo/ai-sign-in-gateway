import {
  buildGatewayResetCircuitErrorPlan,
  buildGatewayResetCircuitSuccessPlan,
} from './gatewayRouteStateModel.ts'
import type { GatewayRoute } from './types.ts'

type GatewayRouteCircuitNoticePlan =
  | ReturnType<typeof buildGatewayResetCircuitErrorPlan>
  | ReturnType<typeof buildGatewayResetCircuitSuccessPlan>

export type ResetGatewayRouteCircuitStateOptions = {
  route: GatewayRoute
  requestReset: (routeId: number) => Promise<unknown>
  reloadGatewayData: () => Promise<void>
  showPlanNotice: (plan: GatewayRouteCircuitNoticePlan) => void
}

export async function resetGatewayRouteCircuitState({
  route,
  requestReset,
  reloadGatewayData,
  showPlanNotice,
}: ResetGatewayRouteCircuitStateOptions) {
  try {
    await requestReset(route.id)
    showPlanNotice(buildGatewayResetCircuitSuccessPlan())
    await reloadGatewayData()
  } catch (err) {
    showPlanNotice(buildGatewayResetCircuitErrorPlan(err))
  }
}
