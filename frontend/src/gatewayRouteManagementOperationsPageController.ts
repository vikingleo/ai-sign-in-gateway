import { useGatewayRouteOperationsPageActions } from './gatewayRouteOperationsPageController.ts'
import { useGatewayRouteProbePageActions } from './gatewayRouteProbePageController.ts'

type GatewayRouteManagementOperationsPageOptions =
  Parameters<typeof useGatewayRouteProbePageActions>[0] &
  Parameters<typeof useGatewayRouteOperationsPageActions>[0]

export function useGatewayRouteManagementOperationsPageActions(
  options: GatewayRouteManagementOperationsPageOptions,
) {
  const routeProbeActions = useGatewayRouteProbePageActions(options)
  const routeOperationsActions = useGatewayRouteOperationsPageActions(options)

  return {
    ...routeProbeActions,
    ...routeOperationsActions,
  }
}
