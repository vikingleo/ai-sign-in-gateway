import {
  createConfirmGatewayRouteAction,
  createDeleteGatewayRouteAction,
  createDisableAllGatewayRoutesAction,
  createEnableOnlyGatewayRouteAction,
  createResetGatewayRouteCircuitAction,
  createToggleGatewayRouteAction,
} from './gatewayRouteActionController.ts'
import type { GatewayRoute, GatewayRouteDeleteResult } from './types.ts'

type GatewayRouteNoticePlan = {
  notice: {
    tone: 'success' | 'error'
    message: string
  }
}

type GatewayRouteConfirmWindow = {
  confirm: (message: string) => boolean
}

type ToggleGatewayRouteResult = {
  id: number
  is_enabled: boolean
  is_enabled_manual?: boolean
  circuit_state: string
}

type DisableAllGatewayRoutesResult = {
  status: string
  disabled_count: number
}

type EnableOnlyGatewayRouteResult = {
  status: string
  enabled_route_id: number
}

type ResetGatewayRouteCircuitResult = {
  id: number
  is_enabled: boolean
  circuit_state: string
}

type GatewayRouteActionPageOptions = {
  confirmWindow: GatewayRouteConfirmWindow
  requestToggle: (id: number) => Promise<ToggleGatewayRouteResult>
  requestDisableAll: () => Promise<DisableAllGatewayRoutesResult>
  requestEnableOnly: (id: number) => Promise<EnableOnlyGatewayRouteResult>
  requestReset: (id: number) => Promise<ResetGatewayRouteCircuitResult>
  requestDeleteRoute: (id: number) => Promise<GatewayRouteDeleteResult>
  reloadGatewayData: () => Promise<void>
  routeLabel: (route: GatewayRoute) => string
  showPlanNotice: (plan: GatewayRouteNoticePlan) => void
}

export function useGatewayRouteActionPageActions({
  confirmWindow,
  requestToggle,
  requestDisableAll,
  requestEnableOnly,
  requestReset,
  requestDeleteRoute,
  reloadGatewayData,
  routeLabel,
  showPlanNotice,
}: GatewayRouteActionPageOptions) {
  const confirmGatewayRouteAction = createConfirmGatewayRouteAction({
    confirmWindow,
  })
  const handleToggle = createToggleGatewayRouteAction({
    requestToggle,
    reloadGatewayData,
    showPlanNotice,
  })
  const handleDisableAllRoutes = createDisableAllGatewayRoutesAction({
    confirm: confirmGatewayRouteAction,
    requestDisableAll,
    reloadGatewayData,
    showPlanNotice,
  })
  const handleEnableOnlyRoute = createEnableOnlyGatewayRouteAction({
    confirm: confirmGatewayRouteAction,
    routeLabel,
    requestEnableOnly,
    reloadGatewayData,
    showPlanNotice,
  })
  const handleResetCircuit = createResetGatewayRouteCircuitAction({
    requestReset,
    reloadGatewayData,
    showPlanNotice,
  })
  const handleDeleteRoute = createDeleteGatewayRouteAction({
    confirmWindow,
    requestDeleteRoute,
    reloadGatewayData,
    routeLabel,
    showPlanNotice,
  })

  return {
    handleToggle,
    handleDisableAllRoutes,
    handleEnableOnlyRoute,
    handleResetCircuit,
    handleDeleteRoute,
  }
}
