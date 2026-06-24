import { createGatewayNoticeActions } from './gatewayNoticeController.ts'
import { createGatewayPageDisplayHelpers } from './gatewayPageDisplayHelpersController.ts'
import { createGatewayPagePlatform } from './gatewayPagePlatformController.ts'
import { createGatewayPageRequests, type GatewayPageRequests } from './gatewayPageRequestsController.ts'
import { type GatewayPageSection, useGatewayPageSectionState } from './gatewayPageSectionController.ts'
import { useGatewayPageState } from './gatewayPageStateController.ts'
import { useGatewayPageTableLayout } from './gatewayPageTableLayoutController.ts'

export type GatewayPageFoundationProps = {
  section?: GatewayPageSection
}

type GatewayPageFoundationOptions = Parameters<typeof createGatewayPagePlatform>[0] & {
  props: GatewayPageFoundationProps
  toast: Parameters<typeof createGatewayNoticeActions>[0]['toast']
  requests?: GatewayPageRequests
}

export function useGatewayPageFoundation({
  props,
  toast,
  requests,
  platformWindow,
  platformDocument,
  platformNavigator,
}: GatewayPageFoundationOptions) {
  const { isRouteManagement, isGatewayMonitor } = useGatewayPageSectionState(props)
  const { showNotice, showPlanNotice } = createGatewayNoticeActions({ toast })
  const gatewayPageRequests = requests ?? createGatewayPageRequests()
  const gatewayPageDisplayHelpers = createGatewayPageDisplayHelpers()
  const gatewayPagePlatform = createGatewayPagePlatform({
    platformWindow,
    platformDocument,
    platformNavigator,
  })
  const state = useGatewayPageState()
  const tableLayout = useGatewayPageTableLayout()
  let mounted = false

  return {
    isRouteManagement,
    isGatewayMonitor,
    showNotice,
    showPlanNotice,
    gatewayPageRequests,
    gatewayPageDisplayHelpers,
    gatewayPagePlatform,
    state,
    tableLayout,
    setMounted: (nextMounted: boolean) => {
      mounted = nextMounted
    },
    isMounted: () => mounted,
  }
}
