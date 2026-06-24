import {
  disableAllGatewayRoutesWithConfirmation,
  type DisableAllGatewayRoutesWithConfirmationOptions,
} from './gatewayRouteDisableController.ts'
import {
  enableOnlyGatewayRouteWithConfirmation,
  type EnableOnlyGatewayRouteWithConfirmationOptions,
} from './gatewayRouteEnableOnlyController.ts'
import {
  resetGatewayRouteCircuitState,
  type ResetGatewayRouteCircuitStateOptions,
} from './gatewayRouteCircuitController.ts'
import {
  toggleGatewayRouteEnabled,
  type ToggleGatewayRouteEnabledOptions,
} from './gatewayRouteToggleController.ts'
import {
  deleteGatewayRouteAction as deleteGatewayRouteWithConfirmation,
  type DeleteGatewayRouteOptions,
} from './gatewayRouteGroupsController.ts'
import type { GatewayRoute } from './types.ts'

const DISABLE_ALL_ROUTES_CONFIRM_MESSAGE = '确认禁用全部路由？禁用后网关将没有可用路由，直到重新启用。'

type ConfirmGatewayRouteAction = (message: string) => boolean
type RouteLabelResolver = (route: GatewayRoute) => string
type GatewayRouteConfirmWindow = {
  confirm: (message: string) => boolean
}

export type ToggleGatewayRouteActionOptions = ToggleGatewayRouteEnabledOptions
export type ResetGatewayRouteCircuitActionOptions = ResetGatewayRouteCircuitStateOptions
export type DeleteGatewayRouteActionOptions = DeleteGatewayRouteOptions
export type ToggleGatewayRouteRuntimeActionOptions = Omit<ToggleGatewayRouteActionOptions, 'route'>
export type ResetGatewayRouteCircuitRuntimeActionOptions = Omit<ResetGatewayRouteCircuitActionOptions, 'route'>
export type DeleteGatewayRouteRuntimeActionOptions = Omit<DeleteGatewayRouteActionOptions, 'route'>

export type ConfirmGatewayRouteActionOptions = {
  confirmWindow: GatewayRouteConfirmWindow
}

export type DisableAllGatewayRoutesActionOptions =
  Omit<DisableAllGatewayRoutesWithConfirmationOptions, 'confirmDisableAll'> & {
    confirm: ConfirmGatewayRouteAction
  }

export type EnableOnlyGatewayRouteActionOptions =
  Omit<EnableOnlyGatewayRouteWithConfirmationOptions, 'confirmEnableOnly'> & {
    confirm: ConfirmGatewayRouteAction
    routeLabel: RouteLabelResolver
  }

export type EnableOnlyGatewayRouteRuntimeActionOptions = Omit<EnableOnlyGatewayRouteActionOptions, 'route'>

function buildEnableOnlyRouteConfirmMessage(route: GatewayRoute, routeLabel: RouteLabelResolver) {
  return `确认仅启用「${routeLabel(route)}」，并禁用其他全部路由？`
}

export function createConfirmGatewayRouteAction({
  confirmWindow,
}: ConfirmGatewayRouteActionOptions) {
  return (message: string) => confirmWindow.confirm(message)
}

export function createToggleGatewayRouteAction(options: ToggleGatewayRouteRuntimeActionOptions) {
  return (route: GatewayRoute) =>
    toggleGatewayRouteAction({
      ...options,
      route,
    })
}

export function createDisableAllGatewayRoutesAction(options: DisableAllGatewayRoutesActionOptions) {
  return () => disableAllGatewayRoutesAction(options)
}

export function createEnableOnlyGatewayRouteAction(options: EnableOnlyGatewayRouteRuntimeActionOptions) {
  return (route: GatewayRoute) =>
    enableOnlyGatewayRouteAction({
      ...options,
      route,
    })
}

export function createResetGatewayRouteCircuitAction(options: ResetGatewayRouteCircuitRuntimeActionOptions) {
  return (route: GatewayRoute) =>
    resetGatewayRouteCircuitAction({
      ...options,
      route,
    })
}

export function createDeleteGatewayRouteAction(options: DeleteGatewayRouteRuntimeActionOptions) {
  return (route: GatewayRoute) =>
    deleteGatewayRouteAction({
      ...options,
      route,
    })
}

export async function toggleGatewayRouteAction(options: ToggleGatewayRouteActionOptions) {
  await toggleGatewayRouteEnabled(options)
}

export async function disableAllGatewayRoutesAction({
  confirm,
  ...options
}: DisableAllGatewayRoutesActionOptions) {
  await disableAllGatewayRoutesWithConfirmation({
    ...options,
    confirmDisableAll: () => confirm(DISABLE_ALL_ROUTES_CONFIRM_MESSAGE),
  })
}

export async function enableOnlyGatewayRouteAction({
  confirm,
  routeLabel,
  ...options
}: EnableOnlyGatewayRouteActionOptions) {
  await enableOnlyGatewayRouteWithConfirmation({
    ...options,
    confirmEnableOnly: (route) => confirm(buildEnableOnlyRouteConfirmMessage(route, routeLabel)),
  })
}

export async function resetGatewayRouteCircuitAction(options: ResetGatewayRouteCircuitActionOptions) {
  await resetGatewayRouteCircuitState(options)
}

export async function deleteGatewayRouteAction(options: DeleteGatewayRouteActionOptions) {
  await deleteGatewayRouteWithConfirmation(options)
}
