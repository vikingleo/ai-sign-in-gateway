import { ref } from 'vue'

import type { GatewayErrorDetail } from './gatewayActivityDisplayModel.ts'
import type { GatewayLog } from './types.ts'

export function useGatewayErrorDetailDrawer() {
  const open = ref(false)
  const detail = ref<GatewayErrorDetail | null>(null)

  function openDetail(value: GatewayErrorDetail) {
    detail.value = value
    open.value = true
  }

  function close() {
    open.value = false
  }

  return {
    open,
    detail,
    openDetail,
    close,
  }
}

export function useGatewayLogsDrawer() {
  const open = ref(false)
  const search = ref('')
  const logs = ref<GatewayLog[]>([])

  function openDrawer() {
    open.value = true
  }

  function setLogs(value: GatewayLog[]) {
    logs.value = value
  }

  return {
    open,
    search,
    logs,
    openDrawer,
    setLogs,
  }
}

export type GatewayLogsDrawer = ReturnType<typeof useGatewayLogsDrawer>
export type GatewayErrorDetailDrawer = ReturnType<typeof useGatewayErrorDetailDrawer>
