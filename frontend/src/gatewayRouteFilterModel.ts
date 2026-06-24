import type { GatewayIssueState } from './gatewayViewConfig.ts'
import type { GatewayRoute } from './types.ts'

type GatewayRouteFilterState = {
  routeSearch: string
  selectedGroups: string[]
  selectedRouteTypes: Array<GatewayRoute['route_type']>
  selectedIssueStates: GatewayIssueState[]
}

export function buildGatewayRouteFilterState(filters: GatewayRouteFilterState): GatewayRouteFilterState {
  return {
    routeSearch: filters.routeSearch,
    selectedGroups: [...filters.selectedGroups],
    selectedRouteTypes: [...filters.selectedRouteTypes],
    selectedIssueStates: [...filters.selectedIssueStates],
  }
}

export function toggleGatewayRouteTypeFilter(
  selectedRouteTypes: Array<GatewayRoute['route_type']>,
  routeType: GatewayRoute['route_type'],
) {
  if (selectedRouteTypes.includes(routeType)) {
    return selectedRouteTypes.filter((item) => item !== routeType)
  }
  return [...selectedRouteTypes, routeType]
}

export function isGatewayRouteTypeFilterActive(
  selectedRouteTypes: Array<GatewayRoute['route_type']>,
  routeType: GatewayRoute['route_type'],
) {
  return selectedRouteTypes.includes(routeType)
}

export function clearGatewayRouteTypeFilters(): Array<GatewayRoute['route_type']> {
  return []
}

export function activeGatewayRouteFilterCount(filters: GatewayRouteFilterState) {
  return filters.selectedGroups.length +
    filters.selectedRouteTypes.length +
    filters.selectedIssueStates.length +
    (filters.routeSearch.trim() ? 1 : 0)
}

export function clearGatewayRouteFilters(): GatewayRouteFilterState {
  return {
    routeSearch: '',
    selectedGroups: [],
    selectedRouteTypes: [],
    selectedIssueStates: [],
  }
}
