import { useGatewayRouteSummaryPageActions } from './gatewayRefreshPageController.ts'
import { useGatewaySiteGroupsPageActions } from './gatewaySiteGroupsPageController.ts'

type GatewayCatalogRefreshPageOptions =
  Parameters<typeof useGatewayRouteSummaryPageActions>[0] &
  Parameters<typeof useGatewaySiteGroupsPageActions>[0]

export function useGatewayCatalogRefreshPageActions(options: GatewayCatalogRefreshPageOptions) {
  const routeSummaryActions = useGatewayRouteSummaryPageActions(options)
  const siteGroupsActions = useGatewaySiteGroupsPageActions(options)

  return {
    ...routeSummaryActions,
    ...siteGroupsActions,
  }
}
