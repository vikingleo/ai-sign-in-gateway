import {
  buildGatewayDisableAllRoutesErrorPlan,
  buildGatewayDisableAllRoutesSuccessPlan,
} from './gatewayRouteStateModel.ts'

type GatewayRouteDisableNoticePlan =
  | ReturnType<typeof buildGatewayDisableAllRoutesErrorPlan>
  | ReturnType<typeof buildGatewayDisableAllRoutesSuccessPlan>

export type DisableAllGatewayRoutesWithConfirmationOptions = {
  confirmDisableAll: () => boolean
  requestDisableAll: () => Promise<{ disabled_count: number }>
  reloadGatewayData: () => Promise<void>
  showPlanNotice: (plan: GatewayRouteDisableNoticePlan) => void
}

export async function disableAllGatewayRoutesWithConfirmation({
  confirmDisableAll,
  requestDisableAll,
  reloadGatewayData,
  showPlanNotice,
}: DisableAllGatewayRoutesWithConfirmationOptions) {
  if (!confirmDisableAll()) {
    return
  }

  try {
    const result = await requestDisableAll()
    showPlanNotice(buildGatewayDisableAllRoutesSuccessPlan({
      disabledCount: result.disabled_count,
    }))
    await reloadGatewayData()
  } catch (err) {
    showPlanNotice(buildGatewayDisableAllRoutesErrorPlan(err))
  }
}
