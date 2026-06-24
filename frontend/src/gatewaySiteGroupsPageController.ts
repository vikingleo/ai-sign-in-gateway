import type { Ref } from 'vue'

import { createRefreshGatewaySiteGroupsAction } from './gatewaySiteGroupsController.ts'
import type { GatewayRouteGroup, SiteGroup } from './types.ts'

type GatewaySiteGroupsPageOptions = {
  siteGroups: Ref<SiteGroup[]>
  requestSiteGroups: () => Promise<SiteGroup[]>
  routeGroups: Ref<GatewayRouteGroup[]>
  requestRouteGroups: () => Promise<GatewayRouteGroup[]>
}

export function useGatewaySiteGroupsPageActions({
  siteGroups,
  requestSiteGroups,
  routeGroups,
  requestRouteGroups,
}: GatewaySiteGroupsPageOptions) {
  const handleSiteGroupsChanged = createRefreshGatewaySiteGroupsAction({
    requestSiteGroups,
    setSiteGroups: (groups) => {
      siteGroups.value = groups
    },
    requestRouteGroups,
    setRouteGroups: (groups) => {
      routeGroups.value = groups
    },
  })

  return {
    handleSiteGroupsChanged,
  }
}
