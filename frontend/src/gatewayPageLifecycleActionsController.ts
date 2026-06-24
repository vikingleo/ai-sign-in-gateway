import { mountGatewayPageLifecycle, unmountGatewayPageLifecycle } from './gatewayPageLifecycleController.ts'
import type { GatewayPagePlatform } from './gatewayPagePlatformController.ts'
import type { useGatewayPageRefreshActions } from './gatewayPageRefreshActionsController.ts'
import type { useGatewayPageRuntimeActions } from './gatewayPageRuntimeActionsController.ts'
import type { GatewayPageState } from './gatewayPageStateController.ts'

type GatewayPageLifecycleActionsOptions = {
  state: GatewayPageState
  gatewayPagePlatform: GatewayPagePlatform
  refreshActions: ReturnType<typeof useGatewayPageRefreshActions>
  runtimeActions: ReturnType<typeof useGatewayPageRuntimeActions>
  setMounted: (mounted: boolean) => void
  isMounted: () => boolean
}

export function useGatewayPageLifecycleActions({
  state,
  gatewayPagePlatform,
  refreshActions,
  runtimeActions,
  setMounted,
  isMounted,
}: GatewayPageLifecycleActionsOptions) {
  async function mount() {
    await mountGatewayPageLifecycle({
      setMounted,
      addPageListeners: gatewayPagePlatform.lifecycle.addPageListeners,
      handleSiteGroupsChanged: refreshActions.handleSiteGroupsChanged,
      handleVisibilityChange: runtimeActions.handleVisibilityChange,
      resetUsageRangeToToday: state.usageRangeState.resetToToday,
      loadData: runtimeActions.loadData,
      isMounted,
      startAutoRefresh: runtimeActions.startAutoRefresh,
      scheduleRouteSummaryRefresh: refreshActions.scheduleRouteSummaryRefresh,
    })
  }

  function unmount() {
    unmountGatewayPageLifecycle({
      setMounted,
      stopAutoRefresh: runtimeActions.stopAutoRefresh,
      abortLoadData: state.gatewayRuntime.loadDataControllerSlot.abortAndClear,
      abortUsageLoad: state.gatewayRuntime.gatewayUsageControllerSlot.abortAndClear,
      disposeRouteProbeState: state.routeProbeState.dispose,
      disposeRouteBalanceProbeState: state.routeBalanceProbeState.dispose,
      removePageListeners: gatewayPagePlatform.lifecycle.removePageListeners,
      handleSiteGroupsChanged: refreshActions.handleSiteGroupsChanged,
      handleVisibilityChange: runtimeActions.handleVisibilityChange,
    })
  }

  return {
    mount,
    unmount,
  }
}
