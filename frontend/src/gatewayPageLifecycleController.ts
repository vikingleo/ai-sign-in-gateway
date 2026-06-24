type GatewayPageLifecycleEventHandler = () => unknown

type GatewayPageLifecycleHandlers = {
  handleSiteGroupsChanged: GatewayPageLifecycleEventHandler
  handleVisibilityChange: GatewayPageLifecycleEventHandler
}

type MountGatewayPageLifecycleOptions = GatewayPageLifecycleHandlers & {
  setMounted: (mounted: boolean) => void
  addPageListeners: (handlers: GatewayPageLifecycleHandlers) => void
  resetUsageRangeToToday: () => void
  loadData: () => Promise<void>
  isMounted: () => boolean
  startAutoRefresh: () => void
  scheduleRouteSummaryRefresh: () => void
}

type UnmountGatewayPageLifecycleOptions = GatewayPageLifecycleHandlers & {
  setMounted: (mounted: boolean) => void
  stopAutoRefresh: () => void
  abortLoadData: () => void
  abortUsageLoad: () => void
  disposeRouteProbeState: () => void
  disposeRouteBalanceProbeState: () => void
  removePageListeners: (handlers: GatewayPageLifecycleHandlers) => void
}

export async function mountGatewayPageLifecycle({
  setMounted,
  addPageListeners,
  handleSiteGroupsChanged,
  handleVisibilityChange,
  resetUsageRangeToToday,
  loadData,
  isMounted,
  startAutoRefresh,
  scheduleRouteSummaryRefresh,
}: MountGatewayPageLifecycleOptions) {
  setMounted(true)
  addPageListeners({
    handleSiteGroupsChanged,
    handleVisibilityChange,
  })
  resetUsageRangeToToday()
  await loadData()
  if (!isMounted()) {
    return
  }
  startAutoRefresh()
  scheduleRouteSummaryRefresh()
}

export function unmountGatewayPageLifecycle({
  setMounted,
  stopAutoRefresh,
  abortLoadData,
  abortUsageLoad,
  disposeRouteProbeState,
  disposeRouteBalanceProbeState,
  removePageListeners,
  handleSiteGroupsChanged,
  handleVisibilityChange,
}: UnmountGatewayPageLifecycleOptions) {
  setMounted(false)
  stopAutoRefresh()
  abortLoadData()
  abortUsageLoad()
  disposeRouteProbeState()
  disposeRouteBalanceProbeState()
  removePageListeners({
    handleSiteGroupsChanged,
    handleVisibilityChange,
  })
}
