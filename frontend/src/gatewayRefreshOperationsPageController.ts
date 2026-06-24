import { useGatewayCatalogRefreshPageActions } from './gatewayCatalogRefreshPageController.ts'
import { useGatewayManualRefreshPageActions } from './gatewayRefreshPageController.ts'

type GatewayRefreshOperationsPageOptions =
  Parameters<typeof useGatewayCatalogRefreshPageActions>[0] &
  Omit<Parameters<typeof useGatewayManualRefreshPageActions>[0], 'refreshRouteSummaries'>

export function useGatewayRefreshOperationsPageActions(options: GatewayRefreshOperationsPageOptions) {
  const catalogActions = useGatewayCatalogRefreshPageActions(options)
  const manualRefreshActions = useGatewayManualRefreshPageActions({
    ...options,
    refreshRouteSummaries: catalogActions.refreshRouteSummaries,
  })

  return {
    ...catalogActions,
    ...manualRefreshActions,
  }
}
