import { useGatewayPriorityPageActions } from './gatewayPriorityPageController.ts'
import { useGatewayRouteActionPageActions } from './gatewayRouteActionPageController.ts'
import { useGatewayRouteConfigPageActions } from './gatewayRouteConfigPageController.ts'
import { useGatewayRouteGroupsPageActions } from './gatewayRouteGroupsPageController.ts'
import { useGatewayRouteInspectionPageActions } from './gatewayRouteInspectionPageController.ts'

type GatewayRouteOperationsPageOptions =
  Parameters<typeof useGatewayPriorityPageActions>[0] &
  Parameters<typeof useGatewayRouteActionPageActions>[0] &
  Parameters<typeof useGatewayRouteConfigPageActions>[0] &
  Parameters<typeof useGatewayRouteGroupsPageActions>[0] &
  Parameters<typeof useGatewayRouteInspectionPageActions>[0]

export function useGatewayRouteOperationsPageActions(options: GatewayRouteOperationsPageOptions) {
  const priorityActions = useGatewayPriorityPageActions(options)
  const routeActions = useGatewayRouteActionPageActions(options)
  const routeConfigActions = useGatewayRouteConfigPageActions(options)
  const routeGroupActions = useGatewayRouteGroupsPageActions(options)
  const routeInspectionActions = useGatewayRouteInspectionPageActions(options)

  return {
    ...priorityActions,
    ...routeActions,
    ...routeConfigActions,
    ...routeGroupActions,
    ...routeInspectionActions,
  }
}
