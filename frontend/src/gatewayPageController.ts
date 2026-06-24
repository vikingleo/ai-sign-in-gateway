import {
  type GatewayPageFoundationProps,
  useGatewayPageFoundation,
} from './gatewayPageFoundationController.ts'
import { useGatewayPageLifecycleActions } from './gatewayPageLifecycleActionsController.ts'
import { useGatewayPageOperations } from './gatewayPageOperationsController.ts'
import { useGatewayPageShellBindings } from './gatewayPageShellBindingsController.ts'
import { useGatewayPageViewState } from './gatewayPageViewStateController.ts'

export type GatewayPageControllerProps = GatewayPageFoundationProps

type GatewayPageControllerOptions = Parameters<typeof useGatewayPageFoundation>[0] & {
  getApiBase: () => string
  nowMs: () => number
  nowIso: () => string
}

export function useGatewayPageController({
  props,
  toast,
  getApiBase,
  nowMs,
  nowIso,
  requests,
  platformWindow,
  platformDocument,
  platformNavigator,
}: GatewayPageControllerOptions) {
  const {
    isRouteManagement,
    isGatewayMonitor,
    showNotice,
    showPlanNotice,
    gatewayPageRequests,
    gatewayPageDisplayHelpers,
    gatewayPagePlatform,
    state,
    tableLayout,
    setMounted,
    isMounted,
  } = useGatewayPageFoundation({
    props,
    toast,
    requests,
    platformWindow,
    platformDocument,
    platformNavigator,
  })

  const {
    accessState,
    routeMutationActions,
    displayState,
  } = useGatewayPageViewState({
    state,
    getApiBase,
    gatewayPagePlatform,
    showPlanNotice,
  })
  const {
    runtimeActions,
    refreshActions,
    routeActions,
    adminActions,
  } = useGatewayPageOperations({
    state,
    gatewayPageRequests,
    gatewayPageDisplayHelpers,
    gatewayPagePlatform,
    routeMutationActions,
    isGatewayMonitor,
    mounted: isMounted,
    nowMs,
    nowIso,
    showNotice,
    showPlanNotice,
  })
  const {
    monitorPageProps,
    monitorPageHandlers,
    routeManagementPageProps,
    routeManagementPageHandlers,
    overlayPageProps,
    overlayPageHandlers,
  } = useGatewayPageShellBindings({
    gatewayPageDisplayHelpers,
    accessState,
    state,
    displayState,
    tableLayout,
    refreshActions,
    runtimeActions,
    routeActions,
    adminActions,
  })
  const lifecycleActions = useGatewayPageLifecycleActions({
    state,
    gatewayPagePlatform,
    refreshActions,
    runtimeActions,
    setMounted,
    isMounted,
  })

  return {
    isRouteManagement,
    isGatewayMonitor,
    monitorPageProps,
    monitorPageHandlers,
    routeManagementPageProps,
    routeManagementPageHandlers,
    overlayPageProps,
    overlayPageHandlers,
    mount: lifecycleActions.mount,
    unmount: lifecycleActions.unmount,
  }
}
