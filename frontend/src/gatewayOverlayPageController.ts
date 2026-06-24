import { computed } from 'vue'
import type { ColumnsType } from 'ant-design-vue/es/table'

import type { GatewayAddUpstreamDialog } from './gatewayAddUpstreamController.ts'
import type { AddUpstreamForm } from './gatewayAddUpstreamModel.ts'
import type { GatewayErrorDetail, GatewayErrorDetailLine } from './gatewayActivityDisplayModel.ts'
import type { GatewayErrorDetailDrawer, GatewayLogsDrawer } from './gatewayLogsController.ts'
import type { GatewayPriorityDialog } from './gatewayPriorityController.ts'
import type {
  GatewayRouteBalanceManualDialog,
} from './gatewayRouteBalanceProbeController.ts'
import type { GatewayRouteDiagnosisDrawer } from './gatewayRouteDiagnosisController.ts'
import type {
  GatewayRouteGroupAssignmentDialog,
  GatewayRouteGroupManagerDialog,
} from './gatewayRouteGroupsController.ts'
import type { GatewayRouteLogsDrawer } from './gatewayRouteLogsController.ts'
import type { GatewayRouteModelsDialog } from './gatewayRouteConfigController.ts'
import type { GatewaySettingsDialog } from './gatewaySettingsController.ts'
import type { GatewayPriorityPresetMode } from './gatewayPriorityModel.ts'
import type { GatewayLog, GatewayRoute, GatewayRouteGroup, GatewaySettingsData } from './types.ts'

type ReadonlyRef<T> = {
  readonly value: T
}

type SelectOption = {
  label: string
  value: string
}

export type GatewayOverlayPageBindingOptions = {
  priorityDialog: GatewayPriorityDialog
  balanceManualDialog: GatewayRouteBalanceManualDialog
  settingsDialog: GatewaySettingsDialog
  addUpstreamDialog: GatewayAddUpstreamDialog
  routeGroupManagerDialog: GatewayRouteGroupManagerDialog
  routeGroupAssignmentDialog: GatewayRouteGroupAssignmentDialog
  routeGroups: ReadonlyRef<GatewayRouteGroup[]>
  routeModelsDialog: GatewayRouteModelsDialog
  logsDrawer: GatewayLogsDrawer
  errorDetailDrawer: GatewayErrorDetailDrawer
  routeLogsDrawer: GatewayRouteLogsDrawer
  routeDiagnosisDrawer: GatewayRouteDiagnosisDrawer
  priorityColumns: ColumnsType<GatewayRoute>
  routeRowKey: (record: GatewayRoute) => string | number
  loadRouteLabel: (route: GatewayRoute) => string
  routePriorityLabel: (route: GatewayRoute | null) => string
  formatGroupNames: (value: string | string[] | null | undefined) => string
  siteGroupOptions: ReadonlyRef<SelectOption[]>
  logColumns: ColumnsType<GatewayLog>
  logs: ReadonlyRef<GatewayLog[]>
  routeLogs: ReadonlyRef<GatewayLog[]>
  pageSize: number
  drawerTableY: ReadonlyRef<number>
  logRowKey: (record: GatewayLog) => string | number
  formatTime: (value: string | null) => string
  requestMethodColor: (method: string) => string
  logMethodLabel: (log: GatewayLog) => string
  logRequestLabel: (log: GatewayLog) => string
  logRequestURL: (log: GatewayLog) => string
  logRouteLabel: (log: GatewayLog) => string
  logRouteMeta: (log: GatewayLog) => string
  logTransferLines: (log: GatewayLog) => GatewayErrorDetailLine[]
  gatewayLogHasErrorDetail: (log: GatewayLog) => boolean
  logModelMeta: (log: GatewayLog) => string
  logUserAgent: (log: GatewayLog) => string
  buildLogErrorDetail: (log: GatewayLog) => GatewayErrorDetail
  handlePriorityMove: () => void
  handlePriorityPreset: (mode: GatewayPriorityPresetMode) => void
  submitManualRouteBalanceProbe: () => void
  refreshRouteGroups: () => void
  createRouteGroup: (payload: { name: string; apiKey: string }) => void
  updateRouteGroup: (group: GatewayRouteGroup, payload: { name: string; apiKey: string }) => void
  deleteRouteGroup: (group: GatewayRouteGroup) => void
  saveRouteGroupAssignment: () => void
  saveSettings: (settings: GatewaySettingsData) => void
  submitAddUpstream: (form: AddUpstreamForm, groupNames: string[]) => void
  resetAddUpstreamForm: () => void
  saveRouteModelsDialog: () => void
  openGatewayErrorDetail: (detail: GatewayErrorDetail) => void
  copyGatewayErrorDetail: (value: string) => void
}

export function useGatewayOverlayPageBindings({
  priorityDialog,
  balanceManualDialog,
  settingsDialog,
  addUpstreamDialog,
  routeGroupManagerDialog,
  routeGroupAssignmentDialog,
  routeGroups,
  routeModelsDialog,
  logsDrawer,
  errorDetailDrawer,
  routeLogsDrawer,
  routeDiagnosisDrawer,
  priorityColumns,
  routeRowKey,
  loadRouteLabel,
  routePriorityLabel,
  formatGroupNames,
  siteGroupOptions,
  logColumns,
  logs,
  routeLogs,
  pageSize,
  drawerTableY,
  logRowKey,
  formatTime,
  requestMethodColor,
  logMethodLabel,
  logRequestLabel,
  logRequestURL,
  logRouteLabel,
  logRouteMeta,
  logTransferLines,
  gatewayLogHasErrorDetail,
  logModelMeta,
  logUserAgent,
  buildLogErrorDetail,
  handlePriorityMove,
  handlePriorityPreset,
  submitManualRouteBalanceProbe,
  refreshRouteGroups,
  createRouteGroup,
  updateRouteGroup,
  deleteRouteGroup,
  saveRouteGroupAssignment,
  saveSettings,
  submitAddUpstream,
  resetAddUpstreamForm,
  saveRouteModelsDialog,
  openGatewayErrorDetail,
  copyGatewayErrorDetail,
}: GatewayOverlayPageBindingOptions) {
  const overlayPageProps = computed(() => ({
    priorityDialog,
    balanceManualDialog,
    settingsDialog,
    addUpstreamDialog,
    routeGroupManagerDialog,
    routeGroupAssignmentDialog,
    routeGroups: routeGroups.value,
    routeModelsDialog,
    logsDrawer,
    errorDetailDrawer,
    routeLogsDrawer,
    routeDiagnosisDrawer,
    priorityColumns,
    routeRowKey,
    loadRouteLabel,
    routePriorityLabel,
    formatGroupNames,
    groupOptions: siteGroupOptions.value,
    logColumns,
    logs: logs.value,
    routeLogs: routeLogs.value,
    pageSize,
    drawerTableY: drawerTableY.value,
    logRowKey,
    formatTime,
    requestMethodColor,
    logMethodLabel,
    logRequestLabel,
    logRequestURL,
    logRouteLabel,
    logRouteMeta,
    logTransferLines,
    gatewayLogHasErrorDetail,
    logModelMeta,
    logUserAgent,
    buildLogErrorDetail,
  }))

  const overlayPageHandlers = {
    'priority-move': handlePriorityMove,
    'priority-preset': handlePriorityPreset,
    'balance-submit': submitManualRouteBalanceProbe,
    'route-groups-refresh': refreshRouteGroups,
    'route-group-create': createRouteGroup,
    'route-group-update': updateRouteGroup,
    'route-group-delete': deleteRouteGroup,
    'route-group-assignment-save': saveRouteGroupAssignment,
    'settings-save': saveSettings,
    'add-upstream-submit': submitAddUpstream,
    'add-upstream-reset': resetAddUpstreamForm,
    'route-models-save': saveRouteModelsDialog,
    'open-log-error-detail': openGatewayErrorDetail,
    'copy-error-detail': copyGatewayErrorDetail,
  }

  return {
    overlayPageProps,
    overlayPageHandlers,
  }
}
