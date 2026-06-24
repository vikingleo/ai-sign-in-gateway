import { ref } from 'vue'

import type { GatewayRoute, GatewayRouteDeleteResult, GatewayRouteGroup } from './types.ts'

type GatewayRouteGroupNoticePlan = {
  notice: {
    tone: 'success' | 'error'
    message: string
  }
}

type GatewayRouteConfirmWindow = {
  confirm: (message: string) => boolean
}

type GatewayRouteGroupPayload = {
  name: string
  apiKey: string
  clearApiKey?: boolean
}

export type GatewayRouteGroupsStateOptions = {
  setRouteGroups: (groups: GatewayRouteGroup[]) => void
  requestRouteGroups: () => Promise<GatewayRouteGroup[]>
  setLoading: (loading: boolean) => void
  showPlanNotice: (plan: GatewayRouteGroupNoticePlan) => void
}

type GatewayRouteGroupMutationOptions = GatewayRouteGroupsStateOptions & {
  reloadGatewayData: () => Promise<void>
}

export type CreateGatewayRouteGroupOptions = GatewayRouteGroupMutationOptions & {
  payload: GatewayRouteGroupPayload
  requestCreate: (payload: { name: string; api_key?: string }) => Promise<GatewayRouteGroup>
}

export type UpdateGatewayRouteGroupOptions = GatewayRouteGroupMutationOptions & {
  group: GatewayRouteGroup
  payload: GatewayRouteGroupPayload
  requestUpdate: (id: number, payload: { name: string; api_key?: string; clear_api_key?: boolean }) => Promise<GatewayRouteGroup>
}

export type DeleteGatewayRouteGroupOptions = GatewayRouteGroupMutationOptions & {
  group: GatewayRouteGroup
  confirmWindow: GatewayRouteConfirmWindow
  requestDelete: (id: number) => Promise<unknown>
}

export type AssignGatewayRouteGroupsOptions = GatewayRouteGroupMutationOptions & {
  route: GatewayRoute | null
  groupIds: number[]
  requestAssign: (routeId: number, groupIds: number[]) => Promise<GatewayRoute>
  closeAfterSuccess: () => void
}

export type DeleteGatewayRouteOptions = {
  route: GatewayRoute
  confirmWindow: GatewayRouteConfirmWindow
  requestDeleteRoute: (routeId: number) => Promise<GatewayRouteDeleteResult>
  reloadGatewayData: () => Promise<void>
  routeLabel: (route: GatewayRoute) => string
  showPlanNotice: (plan: GatewayRouteGroupNoticePlan) => void
}

function errorPlan(error: unknown, fallback: string): GatewayRouteGroupNoticePlan {
  return {
    notice: {
      tone: 'error',
      message: error instanceof Error ? error.message : fallback,
    },
  }
}

function successPlan(message: string): GatewayRouteGroupNoticePlan {
  return {
    notice: {
      tone: 'success',
      message,
    },
  }
}

function normalizeGroupPayload(payload: GatewayRouteGroupPayload, options: { includeEmptyApiKey: boolean }) {
  const apiKey = payload.apiKey.trim()
  const out: { name: string; api_key?: string; clear_api_key?: boolean } = {
    name: payload.name.trim(),
  }
  if (apiKey || options.includeEmptyApiKey) {
    out.api_key = apiKey
  }
  if (payload.clearApiKey) {
    out.clear_api_key = true
  }
  return {
    ...out,
  }
}

function routeGroupIds(route: GatewayRoute): number[] {
  return (route.groups ?? []).map((group) => group.id)
}

export async function loadGatewayRouteGroups({
  requestRouteGroups,
  setRouteGroups,
  setLoading,
  showPlanNotice,
}: GatewayRouteGroupsStateOptions) {
  setLoading(true)
  try {
    setRouteGroups(await requestRouteGroups())
  } catch (err) {
    showPlanNotice(errorPlan(err, '路由分组加载失败'))
  } finally {
    setLoading(false)
  }
}

export async function createGatewayRouteGroupAction({
  payload,
  requestCreate,
  reloadGatewayData,
  ...options
}: CreateGatewayRouteGroupOptions) {
  const normalized = normalizeGroupPayload(payload, { includeEmptyApiKey: true })
  if (!normalized.name) {
    options.showPlanNotice(errorPlan(new Error('分组名称不能为空。'), '分组创建失败'))
    return
  }
  options.setLoading(true)
  try {
    await requestCreate(normalized)
    options.showPlanNotice(successPlan('路由分组已创建。'))
    await reloadGatewayData()
  } catch (err) {
    options.showPlanNotice(errorPlan(err, '路由分组创建失败'))
  } finally {
    options.setLoading(false)
  }
}

export async function updateGatewayRouteGroupAction({
  group,
  payload,
  requestUpdate,
  reloadGatewayData,
  ...options
}: UpdateGatewayRouteGroupOptions) {
  const normalized = normalizeGroupPayload(payload, { includeEmptyApiKey: false })
  if (!normalized.name) {
    options.showPlanNotice(errorPlan(new Error('分组名称不能为空。'), '路由分组更新失败'))
    return
  }
  options.setLoading(true)
  try {
    await requestUpdate(group.id, normalized)
    options.showPlanNotice(successPlan('路由分组已更新。'))
    await reloadGatewayData()
  } catch (err) {
    options.showPlanNotice(errorPlan(err, '路由分组更新失败'))
  } finally {
    options.setLoading(false)
  }
}

export async function deleteGatewayRouteGroupAction({
  group,
  confirmWindow,
  requestDelete,
  reloadGatewayData,
  ...options
}: DeleteGatewayRouteGroupOptions) {
  if (!confirmWindow.confirm(`确认删除路由分组「${group.name}」吗？该分组下的路由绑定会被移除。`)) {
    return
  }
  options.setLoading(true)
  try {
    await requestDelete(group.id)
    options.showPlanNotice(successPlan('路由分组已删除。'))
    await reloadGatewayData()
  } catch (err) {
    options.showPlanNotice(errorPlan(err, '路由分组删除失败'))
  } finally {
    options.setLoading(false)
  }
}

export async function assignGatewayRouteGroupsAction({
  route,
  groupIds,
  requestAssign,
  reloadGatewayData,
  closeAfterSuccess,
  ...options
}: AssignGatewayRouteGroupsOptions) {
  if (!route) {
    return
  }
  options.setLoading(true)
  try {
    await requestAssign(route.id, groupIds)
    closeAfterSuccess()
    options.showPlanNotice(successPlan('路由分组已保存。'))
    await reloadGatewayData()
  } catch (err) {
    options.showPlanNotice(errorPlan(err, '路由分组保存失败'))
  } finally {
    options.setLoading(false)
  }
}

export async function deleteGatewayRouteAction({
  route,
  confirmWindow,
  requestDeleteRoute,
  reloadGatewayData,
  routeLabel,
  showPlanNotice,
}: DeleteGatewayRouteOptions) {
  if (!confirmWindow.confirm(`确认删除路由「${routeLabel(route)}」吗？对应站点 API Key 会同步移除。`)) {
    return
  }
  try {
    await requestDeleteRoute(route.id)
    showPlanNotice(successPlan('路由已删除。'))
    await reloadGatewayData()
  } catch (err) {
    showPlanNotice(errorPlan(err, '路由删除失败'))
  }
}

export function useGatewayRouteGroupManagerDialog() {
  const open = ref(false)
  const loading = ref(false)

  function openDialog() {
    open.value = true
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  return {
    open,
    loading,
    openDialog,
    setLoading,
  }
}

export function useGatewayRouteGroupAssignmentDialog() {
  const open = ref(false)
  const loading = ref(false)
  const route = ref<GatewayRoute | null>(null)
  const groupIds = ref<number[]>([])

  function openDialog(selectedRoute: GatewayRoute) {
    route.value = selectedRoute
    groupIds.value = routeGroupIds(selectedRoute)
    open.value = true
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function closeAfterSuccess() {
    open.value = false
    loading.value = false
    route.value = null
    groupIds.value = []
  }

  return {
    open,
    loading,
    route,
    groupIds,
    openDialog,
    setLoading,
    closeAfterSuccess,
  }
}

export type GatewayRouteGroupManagerDialog = ReturnType<typeof useGatewayRouteGroupManagerDialog>
export type GatewayRouteGroupAssignmentDialog = ReturnType<typeof useGatewayRouteGroupAssignmentDialog>
