import type { Ref } from 'vue'

import { createLoadGatewayUsageRuntimeAction } from './gatewayRuntimeLoadController.ts'
import {
  createLoadGatewayUsageAction,
  createLoadGatewayUsageTodayAction,
} from './gatewayUsageRangeController.ts'
import type { GatewayUsage } from './types.ts'

export type AbortControllerLike = {
  signal: {
    aborted: boolean
  }
  abort: () => void
}

export type RuntimeControllerSlot<TController extends AbortControllerLike> = {
  replace: () => TController
  clearIfCurrent: (controller: TController) => boolean
}

type GatewayUsageRequestRange = {
  start: string
  end: string
}

type GatewayUsageNotice = {
  tone: 'error'
  message: string
}

type GatewayUsageNoticePlan = {
  notice: GatewayUsageNotice
}

export type GatewayUsagePageOptions<TController extends AbortControllerLike = AbortController> = {
  gatewayUsage: Ref<GatewayUsage | null>
  loadUsage: Parameters<typeof createLoadGatewayUsageRuntimeAction<GatewayUsage, TController>>[0]['loadUsage']
  isMonitor: () => boolean
  getRequestRange: () => GatewayUsageRequestRange
  mounted: () => boolean
  controllerSlot: RuntimeControllerSlot<TController>
  requestUsage: (options: GatewayUsageRequestRange & { signal: TController['signal'] }) => Promise<GatewayUsage>
  setUsageLoading: (loading: boolean) => void
  resetToToday: () => void
  showNotice: (notice: GatewayUsageNotice) => void
  showPlanNotice: (plan: GatewayUsageNoticePlan) => void
  isAbortError: (error: unknown) => boolean
}

export function useGatewayUsagePageActions<TController extends AbortControllerLike = AbortController>({
  gatewayUsage,
  loadUsage,
  isMonitor,
  getRequestRange,
  mounted,
  controllerSlot,
  requestUsage,
  setUsageLoading,
  resetToToday,
  showNotice,
  showPlanNotice,
  isAbortError,
}: GatewayUsagePageOptions<TController>) {
  const loadGatewayUsage = createLoadGatewayUsageRuntimeAction({
    loadUsage,
    isMonitor,
    getRequestRange,
    mounted,
    controllerSlot,
    requestUsage,
    setUsage: (usage) => {
      gatewayUsage.value = usage
    },
    setUsageLoading,
    showNotice,
    showPlanNotice,
    isAbortError,
  })
  const handleUsageQuery = createLoadGatewayUsageAction({
    loadGatewayUsage,
  })
  const handleUsageToday = createLoadGatewayUsageTodayAction({
    resetToToday,
    loadGatewayUsage,
  })

  return {
    loadGatewayUsage,
    handleUsageQuery,
    handleUsageToday,
  }
}
