import { ref } from 'vue'

import {
  buildGatewayPriorityDialogDraft,
  buildGatewayPriorityListLoadErrorPlan,
  buildGatewayPriorityMoveErrorPlan,
  buildGatewayPriorityMoveRequest,
  buildGatewayPriorityMoveSuccessPlan,
  buildGatewayPriorityPresetErrorPlan,
  buildGatewayPriorityPresetPayload,
  buildGatewayPriorityPresetSuccessPlan,
  gatewayPriorityRouteRowClassName,
  selectGatewayPriorityRoute,
  type GatewayPriorityPresetMode,
} from './gatewayPriorityModel.ts'
import { replaceReorderedGatewayRoutes } from './gatewayRouteStateModel.ts'
import type { GatewayRoute } from './types.ts'

type GatewayPriorityMovePayload = NonNullable<ReturnType<typeof buildGatewayPriorityMoveRequest>['payload']>
type GatewayPriorityMoveValidationNotice = NonNullable<
  ReturnType<typeof buildGatewayPriorityMoveRequest>['validationNotice']
>
type GatewayPriorityPresetPayload = ReturnType<typeof buildGatewayPriorityPresetPayload>

type LoadGatewayPriorityRoutesOptions = {
  route: GatewayRoute
  currentRoutes: GatewayRoute[]
  requestRoutes: (options: { includeDisabled: true }) => Promise<GatewayRoute[]>
  normalizeRoute: (route: GatewayRoute) => GatewayRoute
  openDialog: (route: GatewayRoute, currentRoutes: GatewayRoute[]) => void
  setLoading: (loading: boolean) => void
  setRoutes: (routes: GatewayRoute[]) => void
  selectRoute: (route: GatewayRoute) => void
  showPlanNotice: (plan: ReturnType<typeof buildGatewayPriorityListLoadErrorPlan>) => void
}

export type OpenGatewayPriorityDialogActionOptions = Omit<LoadGatewayPriorityRoutesOptions, 'route' | 'currentRoutes'> & {
  getCurrentRoutes: () => GatewayRoute[]
}

type MoveGatewayPriorityRouteOptions = {
  route: GatewayRoute | null
  target: number | null | undefined
  requestReorder: (payload: GatewayPriorityMovePayload) => Promise<GatewayRoute[]>
  applyReorderedRoutes: (routes: GatewayRoute[]) => void
  setLoading: (loading: boolean) => void
  selectRoute: (route: GatewayRoute) => void
  showNotice: (notice: GatewayPriorityMoveValidationNotice) => void
  showPlanNotice: (
    plan: ReturnType<typeof buildGatewayPriorityMoveErrorPlan> | ReturnType<typeof buildGatewayPriorityMoveSuccessPlan>
  ) => void
}

export type MoveGatewayPriorityRouteActionOptions = Omit<MoveGatewayPriorityRouteOptions, 'route' | 'target'> & {
  getRoute: () => GatewayRoute | null
  getTarget: () => number | null | undefined
}

type PresetGatewayPriorityRoutesOptions = {
  mode: GatewayPriorityPresetMode
  currentRoute: GatewayRoute | null
  requestReorder: (payload: GatewayPriorityPresetPayload) => Promise<GatewayRoute[]>
  applyReorderedRoutes: (routes: GatewayRoute[]) => void
  setLoading: (loading: boolean) => void
  clearInsertIndex: () => void
  selectRoute: (route: GatewayRoute | null) => void
  showPlanNotice: (
    plan:
      | ReturnType<typeof buildGatewayPriorityPresetErrorPlan>
      | ReturnType<typeof buildGatewayPriorityPresetSuccessPlan>
  ) => void
}

export type PresetGatewayPriorityRoutesActionOptions = Omit<PresetGatewayPriorityRoutesOptions, 'mode' | 'currentRoute'> & {
  getCurrentRoute: () => GatewayRoute | null
}

type ApplyGatewayPriorityReorderedRoutesOptions = {
  routeData: GatewayRoute[]
  includeDisabled: boolean
  setPriorityRoutes: (routes: GatewayRoute[]) => void
  setRoutes: (routes: GatewayRoute[]) => void
}

export type ApplyGatewayPriorityReorderedRoutesActionOptions = Omit<
  ApplyGatewayPriorityReorderedRoutesOptions,
  'routeData' | 'includeDisabled'
> & {
  getIncludeDisabled: () => boolean
}

export function useGatewayPriorityDialog() {
  const open = ref(false)
  const loading = ref(false)
  const route = ref<GatewayRoute | null>(null)
  const insertIndex = ref<number | undefined>(undefined)
  const routes = ref<GatewayRoute[]>([])

  function openDialog(selectedRoute: GatewayRoute, currentRoutes: GatewayRoute[]) {
    const draft = buildGatewayPriorityDialogDraft(selectedRoute, currentRoutes)
    route.value = draft.route
    insertIndex.value = draft.insertIndex
    open.value = draft.open
    routes.value = draft.routes
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function selectRoute(selectedRoute: GatewayRoute | null) {
    route.value = selectGatewayPriorityRoute(routes.value, selectedRoute)
  }

  function clearInsertIndex() {
    insertIndex.value = undefined
  }

  function rowClassName(record: GatewayRoute) {
    return gatewayPriorityRouteRowClassName(record, route.value)
  }

  return {
    open,
    loading,
    route,
    insertIndex,
    routes,
    openDialog,
    setLoading,
    selectRoute,
    clearInsertIndex,
    rowClassName,
  }
}

export type GatewayPriorityDialog = ReturnType<typeof useGatewayPriorityDialog>

export function applyGatewayPriorityReorderedRoutes({
  routeData,
  includeDisabled,
  setPriorityRoutes,
  setRoutes,
}: ApplyGatewayPriorityReorderedRoutesOptions) {
  const next = replaceReorderedGatewayRoutes(routeData, includeDisabled)
  setPriorityRoutes(next.priorityRoutes)
  setRoutes(next.routes)
}

export function createApplyGatewayPriorityReorderedRoutesAction({
  getIncludeDisabled,
  ...options
}: ApplyGatewayPriorityReorderedRoutesActionOptions) {
  return (routeData: GatewayRoute[]) =>
    applyGatewayPriorityReorderedRoutes({
      ...options,
      routeData,
      includeDisabled: getIncludeDisabled(),
    })
}

export async function loadGatewayPriorityRoutes({
  route,
  currentRoutes,
  requestRoutes,
  normalizeRoute,
  openDialog,
  setLoading,
  setRoutes,
  selectRoute,
  showPlanNotice,
}: LoadGatewayPriorityRoutesOptions) {
  openDialog(route, currentRoutes)
  setLoading(true)
  try {
    const loadedRoutes = (await requestRoutes({ includeDisabled: true })).map(normalizeRoute)
    setRoutes(loadedRoutes)
    selectRoute(route)
  } catch (err) {
    const errorPlan = buildGatewayPriorityListLoadErrorPlan(err)
    showPlanNotice(errorPlan)
  } finally {
    setLoading(false)
  }
}

export function createOpenGatewayPriorityDialogAction({
  getCurrentRoutes,
  ...options
}: OpenGatewayPriorityDialogActionOptions) {
  return (route: GatewayRoute) =>
    loadGatewayPriorityRoutes({
      ...options,
      route,
      currentRoutes: getCurrentRoutes(),
    })
}

export async function presetGatewayPriorityRoutes({
  mode,
  currentRoute,
  requestReorder,
  applyReorderedRoutes,
  setLoading,
  clearInsertIndex,
  selectRoute,
  showPlanNotice,
}: PresetGatewayPriorityRoutesOptions) {
  setLoading(true)
  try {
    const routeData = await requestReorder(buildGatewayPriorityPresetPayload(mode))
    applyReorderedRoutes(routeData)
    clearInsertIndex()
    selectRoute(currentRoute)
    const successPlan = buildGatewayPriorityPresetSuccessPlan(mode)
    showPlanNotice(successPlan)
  } catch (err) {
    const errorPlan = buildGatewayPriorityPresetErrorPlan(err)
    showPlanNotice(errorPlan)
  } finally {
    setLoading(false)
  }
}

export function createPresetGatewayPriorityRoutesAction({
  getCurrentRoute,
  ...options
}: PresetGatewayPriorityRoutesActionOptions) {
  return (mode: GatewayPriorityPresetMode) =>
    presetGatewayPriorityRoutes({
      ...options,
      mode,
      currentRoute: getCurrentRoute(),
    })
}

export async function moveGatewayPriorityRoute({
  route,
  target,
  requestReorder,
  applyReorderedRoutes,
  setLoading,
  selectRoute,
  showNotice,
  showPlanNotice,
}: MoveGatewayPriorityRouteOptions) {
  if (!route) {
    return
  }
  const request = buildGatewayPriorityMoveRequest(route, target)
  if (!request.payload) {
    const notice = request.validationNotice
    if (notice) {
      showNotice(notice)
    }
    return
  }
  setLoading(true)
  try {
    const routeData = await requestReorder(request.payload)
    applyReorderedRoutes(routeData)
    selectRoute(route)
    const successPlan = buildGatewayPriorityMoveSuccessPlan()
    showPlanNotice(successPlan)
  } catch (err) {
    const errorPlan = buildGatewayPriorityMoveErrorPlan(err)
    showPlanNotice(errorPlan)
  } finally {
    setLoading(false)
  }
}

export function createMoveGatewayPriorityRouteAction({
  getRoute,
  getTarget,
  ...options
}: MoveGatewayPriorityRouteActionOptions) {
  return () =>
    moveGatewayPriorityRoute({
      ...options,
      route: getRoute(),
      target: getTarget(),
    })
}
