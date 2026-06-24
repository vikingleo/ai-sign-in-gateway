import { computed, ref } from 'vue'

import {
  activeGatewayRouteFilterCount,
  buildGatewayRouteFilterState,
  clearGatewayRouteTypeFilters,
  clearGatewayRouteFilters,
  isGatewayRouteTypeFilterActive,
  toggleGatewayRouteTypeFilter,
} from './gatewayRouteFilterModel.ts'
import type { GatewayIssueState } from './gatewayViewConfig.ts'
import type { GatewayRoute } from './types.ts'

export function useGatewayRouteFilters() {
  const routeSearch = ref('')
  const selectedGroups = ref<string[]>([])
  const selectedRouteTypes = ref<Array<GatewayRoute['route_type']>>([])
  const selectedIssueStates = ref<GatewayIssueState[]>([])
  const state = computed(() =>
    buildGatewayRouteFilterState({
      routeSearch: routeSearch.value,
      selectedGroups: selectedGroups.value,
      selectedRouteTypes: selectedRouteTypes.value,
      selectedIssueStates: selectedIssueStates.value,
    }),
  )
  const activeCount = computed(() => activeGatewayRouteFilterCount(state.value))

  function isRouteTypeActive(routeType: GatewayRoute['route_type']) {
    return isGatewayRouteTypeFilterActive(selectedRouteTypes.value, routeType)
  }

  function toggleRouteType(routeType: GatewayRoute['route_type']) {
    selectedRouteTypes.value = toggleGatewayRouteTypeFilter(selectedRouteTypes.value, routeType)
  }

  function clearRouteTypes() {
    selectedRouteTypes.value = clearGatewayRouteTypeFilters()
  }

  function clearFilters() {
    const next = clearGatewayRouteFilters()
    routeSearch.value = next.routeSearch
    selectedGroups.value = next.selectedGroups
    selectedRouteTypes.value = next.selectedRouteTypes
    selectedIssueStates.value = next.selectedIssueStates
  }

  return {
    routeSearch,
    selectedGroups,
    selectedRouteTypes,
    selectedIssueStates,
    state,
    activeCount,
    isRouteTypeActive,
    toggleRouteType,
    clearRouteTypes,
    clearFilters,
  }
}

export type GatewayRouteFiltersController = ReturnType<typeof useGatewayRouteFilters>
