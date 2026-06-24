import type { GatewayRouteGroup, SiteGroup } from './types.ts'

export type RefreshGatewaySiteGroupsOptions = {
  requestSiteGroups: () => Promise<SiteGroup[]>
  setSiteGroups: (groups: SiteGroup[]) => void
  requestRouteGroups: () => Promise<GatewayRouteGroup[]>
  setRouteGroups: (groups: GatewayRouteGroup[]) => void
}

export function createRefreshGatewaySiteGroupsAction({
  requestSiteGroups,
  setSiteGroups,
  requestRouteGroups,
  setRouteGroups,
}: RefreshGatewaySiteGroupsOptions) {
  return () =>
    refreshGatewaySiteGroups({
      requestSiteGroups,
      setSiteGroups,
      requestRouteGroups,
      setRouteGroups,
    })
}

export async function refreshGatewaySiteGroups({
  requestSiteGroups,
  setSiteGroups,
  requestRouteGroups,
  setRouteGroups,
}: RefreshGatewaySiteGroupsOptions) {
  try {
    const siteGroups = await requestSiteGroups()
    setSiteGroups(siteGroups)
  } catch {
    // Header site group changes are best-effort; keep current options on refresh failure.
  }

  try {
    const routeGroups = await requestRouteGroups()
    setRouteGroups(routeGroups)
  } catch {
    // Header route group changes are best-effort; keep current options on refresh failure.
  }
}
