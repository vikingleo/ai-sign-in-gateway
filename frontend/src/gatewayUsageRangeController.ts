import { reactive } from 'vue'

import { buildGatewayUsageTodayRange, datetimeLocalToISOString } from './gatewayUsageRangeModel.ts'

export type GatewayUsageRange = {
  start: string
  end: string
}

type LoadGatewayUsageTodayOptions = {
  resetToToday: () => void
  loadGatewayUsage: () => Promise<void>
}

type LoadGatewayUsageActionOptions = {
  loadGatewayUsage: () => Promise<void>
}

export function createLoadGatewayUsageAction({
  loadGatewayUsage,
}: LoadGatewayUsageActionOptions) {
  return () => loadGatewayUsage()
}

export function createLoadGatewayUsageTodayAction({
  resetToToday,
  loadGatewayUsage,
}: LoadGatewayUsageTodayOptions) {
  return () =>
    loadGatewayUsageToday({
      resetToToday,
      loadGatewayUsage,
    })
}

export async function loadGatewayUsageToday({
  resetToToday,
  loadGatewayUsage,
}: LoadGatewayUsageTodayOptions) {
  resetToToday()
  await loadGatewayUsage()
}

export function useGatewayUsageRangeState() {
  const range = reactive<GatewayUsageRange>({
    start: '',
    end: '',
  })

  function resetToToday(now = new Date()) {
    const next = buildGatewayUsageTodayRange(now)
    range.start = next.start
    range.end = next.end
  }

  function toRequestRange() {
    return {
      start: datetimeLocalToISOString(range.start),
      end: datetimeLocalToISOString(range.end),
    }
  }

  return {
    range,
    resetToToday,
    toRequestRange,
  }
}

export type GatewayUsageRangeState = ReturnType<typeof useGatewayUsageRangeState>
