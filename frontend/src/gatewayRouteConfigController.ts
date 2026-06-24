import { ref } from 'vue'

import {
  applyGatewayRoutePathDraft,
  applyGatewayRouteTypeDraft,
  buildGatewayRouteModelsDialogDraft,
  buildGatewayRouteModelsPayload,
  buildGatewayRouteModelsSaveErrorPlan,
  buildGatewayRouteModelsSaveSuccessPlan,
  buildGatewayRoutePathChangeErrorPlan,
  buildGatewayRoutePathChangeSuccessPlan,
  buildGatewayRoutePathPayload,
  buildGatewayRouteTypeChangeErrorPlan,
  buildGatewayRouteTypeChangeSuccessPlan,
  buildGatewayRouteTypePayload,
  isGatewayRoutePath,
  isGatewayRouteType,
  replaceGatewayRoute,
} from './gatewayRouteConfigModel.ts'
import type { GatewayRoute, GatewayRouteUpdatePayload } from './types.ts'

type GatewayRouteConfigNoticePlan =
  | ReturnType<typeof buildGatewayRouteTypeChangeErrorPlan>
  | ReturnType<typeof buildGatewayRouteTypeChangeSuccessPlan>
  | ReturnType<typeof buildGatewayRoutePathChangeErrorPlan>
  | ReturnType<typeof buildGatewayRoutePathChangeSuccessPlan>
  | ReturnType<typeof buildGatewayRouteModelsSaveErrorPlan>
  | ReturnType<typeof buildGatewayRouteModelsSaveSuccessPlan>

type GatewayRouteConfigStateOptions = {
  getRoutes: () => GatewayRoute[]
  setRoutes: (routes: GatewayRoute[]) => void
  getPriorityRoutes: () => GatewayRoute[]
  setPriorityRoutes: (routes: GatewayRoute[]) => void
  requestUpdateRoute: (routeId: number, payload: GatewayRouteUpdatePayload) => Promise<GatewayRoute>
  showPlanNotice: (plan: GatewayRouteConfigNoticePlan) => void
}

export type ChangeGatewayRouteTypeOptions = GatewayRouteConfigStateOptions & {
  route: GatewayRoute
  routeType: GatewayRoute['route_type']
  routeLabel: () => string
  routeTypeLabel: () => string
}

export type ChangeGatewayRouteTypeActionOptions =
  Omit<ChangeGatewayRouteTypeOptions, 'route' | 'routeType' | 'routeLabel' | 'routeTypeLabel'> & {
    routeLabel: (route: GatewayRoute) => string
    routeTypeLabel: (routeType: GatewayRoute['route_type']) => string
  }

export type ChangeGatewayRoutePathOptions = GatewayRouteConfigStateOptions & {
  route: GatewayRoute
  routePath: NonNullable<GatewayRoute['route_path']>
  routeLabel: () => string
  routePathLabel: () => string
}

export type ChangeGatewayRoutePathActionOptions =
  Omit<ChangeGatewayRoutePathOptions, 'route' | 'routePath' | 'routeLabel' | 'routePathLabel'> & {
    routeLabel: (route: GatewayRoute) => string
    routePathLabel: (routePath: NonNullable<GatewayRoute['route_path']>) => string
  }

export type SaveGatewayRouteModelsOptions = GatewayRouteConfigStateOptions & {
  route: GatewayRoute | null
  supportedModels: unknown
  requestURLs: unknown
  setSaving: (saving: boolean) => void
  closeAfterSuccess: () => void
}

export type SaveGatewayRouteModelsActionOptions =
  Omit<SaveGatewayRouteModelsOptions, 'route' | 'supportedModels' | 'requestURLs'> & {
    getRoute: () => GatewayRoute | null
    getSupportedModels: () => unknown
    getRequestURLs: () => unknown
  }

export type SelectGatewayRouteTypeOptions = {
  route: GatewayRoute
  value: unknown
  changeRouteType: (route: GatewayRoute, routeType: GatewayRoute['route_type']) => Promise<void>
}

export type SelectGatewayRoutePathOptions = {
  route: GatewayRoute
  value: unknown
  changeRoutePath: (route: GatewayRoute, routePath: NonNullable<GatewayRoute['route_path']>) => Promise<void>
}

export function createChangeGatewayRouteTypeAction({
  routeLabel,
  routeTypeLabel,
  ...options
}: ChangeGatewayRouteTypeActionOptions) {
  return (route: GatewayRoute, routeType: GatewayRoute['route_type']) =>
    changeGatewayRouteType({
      ...options,
      route,
      routeType,
      routeLabel: () => routeLabel(route),
      routeTypeLabel: () => routeTypeLabel(routeType),
    })
}

export function createSelectGatewayRouteTypeAction(options: Pick<SelectGatewayRouteTypeOptions, 'changeRouteType'>) {
  return (route: GatewayRoute, value: unknown) => selectGatewayRouteType({ ...options, route, value })
}

export function createChangeGatewayRoutePathAction({
  routeLabel,
  routePathLabel,
  ...options
}: ChangeGatewayRoutePathActionOptions) {
  return (route: GatewayRoute, routePath: NonNullable<GatewayRoute['route_path']>) =>
    changeGatewayRoutePath({
      ...options,
      route,
      routePath,
      routeLabel: () => routeLabel(route),
      routePathLabel: () => routePathLabel(routePath),
    })
}

export function createSelectGatewayRoutePathAction(options: Pick<SelectGatewayRoutePathOptions, 'changeRoutePath'>) {
  return (route: GatewayRoute, value: unknown) => selectGatewayRoutePath({ ...options, route, value })
}

export function createOpenGatewayRouteModelsDialogAction({ openDialog }: { openDialog: (route: GatewayRoute) => void }) {
  return openDialog
}

export function createSaveGatewayRouteModelsAction({
  getRoute,
  getSupportedModels,
  getRequestURLs,
  ...options
}: SaveGatewayRouteModelsActionOptions) {
  return () =>
    saveGatewayRouteModels({
      ...options,
      route: getRoute(),
      supportedModels: getSupportedModels(),
      requestURLs: getRequestURLs(),
    })
}

export async function changeGatewayRouteType({
  route,
  routeType,
  getRoutes,
  setRoutes,
  getPriorityRoutes,
  setPriorityRoutes,
  requestUpdateRoute,
  routeLabel,
  routeTypeLabel,
  showPlanNotice,
}: ChangeGatewayRouteTypeOptions) {
  const previousType = route.route_type
  setRoutes(applyGatewayRouteTypeDraft(getRoutes(), route.id, routeType))
  try {
    const updated = await requestUpdateRoute(route.id, buildGatewayRouteTypePayload(route, routeType))
    setRoutes(replaceGatewayRoute(getRoutes(), updated))
    setPriorityRoutes(replaceGatewayRoute(getPriorityRoutes(), updated))
    showPlanNotice(buildGatewayRouteTypeChangeSuccessPlan({
      routeLabel: routeLabel(),
      routeTypeLabel: routeTypeLabel(),
    }))
  } catch (err) {
    setRoutes(applyGatewayRouteTypeDraft(getRoutes(), route.id, previousType))
    showPlanNotice(buildGatewayRouteTypeChangeErrorPlan(err))
  }
}

export async function selectGatewayRouteType({
  route,
  value,
  changeRouteType,
}: SelectGatewayRouteTypeOptions) {
  if (!isGatewayRouteType(value)) {
    return
  }
  await changeRouteType(route, value)
}

export async function changeGatewayRoutePath({
  route,
  routePath,
  getRoutes,
  setRoutes,
  getPriorityRoutes,
  setPriorityRoutes,
  requestUpdateRoute,
  routeLabel,
  routePathLabel,
  showPlanNotice,
}: ChangeGatewayRoutePathOptions) {
  const previousPath = route.route_path ?? ''
  setRoutes(applyGatewayRoutePathDraft(getRoutes(), route.id, routePath))
  try {
    const updated = await requestUpdateRoute(route.id, buildGatewayRoutePathPayload(route, routePath))
    setRoutes(replaceGatewayRoute(getRoutes(), updated))
    setPriorityRoutes(replaceGatewayRoute(getPriorityRoutes(), updated))
    showPlanNotice(buildGatewayRoutePathChangeSuccessPlan({
      routeLabel: routeLabel(),
      routePathLabel: routePathLabel(),
    }))
  } catch (err) {
    setRoutes(applyGatewayRoutePathDraft(getRoutes(), route.id, previousPath))
    showPlanNotice(buildGatewayRoutePathChangeErrorPlan(err))
  }
}

export async function selectGatewayRoutePath({
  route,
  value,
  changeRoutePath,
}: SelectGatewayRoutePathOptions) {
  if (!isGatewayRoutePath(value)) {
    return
  }
  await changeRoutePath(route, value)
}

export async function saveGatewayRouteModels({
  route,
  supportedModels,
  requestURLs,
  getRoutes,
  setRoutes,
  getPriorityRoutes,
  setPriorityRoutes,
  requestUpdateRoute,
  setSaving,
  closeAfterSuccess,
  showPlanNotice,
}: SaveGatewayRouteModelsOptions) {
  if (!route) {
    return
  }
  setSaving(true)
  try {
    const updated = await requestUpdateRoute(route.id, buildGatewayRouteModelsPayload(route, supportedModels, requestURLs))
    setRoutes(replaceGatewayRoute(getRoutes(), updated))
    setPriorityRoutes(replaceGatewayRoute(getPriorityRoutes(), updated))
    closeAfterSuccess()
    showPlanNotice(buildGatewayRouteModelsSaveSuccessPlan())
  } catch (err) {
    showPlanNotice(buildGatewayRouteModelsSaveErrorPlan(err))
  } finally {
    setSaving(false)
  }
}

export function useGatewayRouteModelsDialog() {
  const open = ref(false)
  const saving = ref(false)
  const route = ref<GatewayRoute | null>(null)
  const supportedModels = ref<string[]>([])
  const requestURLs = ref('')

  function openDialog(selectedRoute: GatewayRoute) {
    const draft = buildGatewayRouteModelsDialogDraft(selectedRoute)
    route.value = selectedRoute
    supportedModels.value = draft.supportedModels
    requestURLs.value = draft.requestURLs
    open.value = true
  }

  function setSaving(value: boolean) {
    saving.value = value
  }

  function closeAfterSuccess() {
    open.value = false
    route.value = null
    supportedModels.value = []
    requestURLs.value = ''
  }

  return {
    open,
    saving,
    route,
    supportedModels,
    requestURLs,
    openDialog,
    setSaving,
    closeAfterSuccess,
  }
}

export type GatewayRouteModelsDialog = ReturnType<typeof useGatewayRouteModelsDialog>
