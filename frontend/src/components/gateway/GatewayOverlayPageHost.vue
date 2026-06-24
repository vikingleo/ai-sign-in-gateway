<script setup lang="ts">
import { computed, type WritableComputedRef } from 'vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { GatewayAddUpstreamDialog } from '../../gatewayAddUpstreamController'
import type { AddUpstreamForm } from '../../gatewayAddUpstreamModel'
import type { GatewayErrorDetail, GatewayErrorDetailLine } from '../../gatewayActivityDisplayModel'
import type { GatewayErrorDetailDrawer, GatewayLogsDrawer } from '../../gatewayLogsController'
import type { GatewayPriorityDialog } from '../../gatewayPriorityController'
import type {
  GatewayRouteBalanceManualDialog,
} from '../../gatewayRouteBalanceProbeController'
import type { GatewayRouteDiagnosisDrawer } from '../../gatewayRouteDiagnosisController'
import type {
  GatewayRouteGroupAssignmentDialog,
  GatewayRouteGroupManagerDialog,
} from '../../gatewayRouteGroupsController'
import type { GatewayRouteLogsDrawer } from '../../gatewayRouteLogsController'
import type { GatewayRouteModelsDialog } from '../../gatewayRouteConfigController'
import type { GatewaySettingsDialog } from '../../gatewaySettingsController'
import type { GatewayLog, GatewayRoute, GatewayRouteGroup, GatewaySettingsData } from '../../types'
import type { GatewayPriorityPresetMode } from '../../gatewayPriorityModel'
import GatewayOverlayHost from './GatewayOverlayHost.vue'

type SelectOption = {
  label: string
  value: string
}

function writableValue<T>(getValue: () => T, setValue: (value: T) => void): WritableComputedRef<T> {
  return computed({
    get: getValue,
    set: setValue,
  })
}

const props = defineProps<{
  priorityDialog: GatewayPriorityDialog
  balanceManualDialog: GatewayRouteBalanceManualDialog
  settingsDialog: GatewaySettingsDialog
  addUpstreamDialog: GatewayAddUpstreamDialog
  routeGroupManagerDialog: GatewayRouteGroupManagerDialog
  routeGroupAssignmentDialog: GatewayRouteGroupAssignmentDialog
  routeGroups: GatewayRouteGroup[]
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
  groupOptions: SelectOption[]
  logColumns: ColumnsType<GatewayLog>
  logs: GatewayLog[]
  routeLogs: GatewayLog[]
  pageSize: number
  drawerTableY: number
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
}>()

const emit = defineEmits<{
  (event: 'priority-move'): void
  (event: 'priority-preset', mode: GatewayPriorityPresetMode): void
  (event: 'balance-submit'): void
  (event: 'settings-save', form: GatewaySettingsData): void
  (event: 'add-upstream-submit', form: AddUpstreamForm, groupNames: string[]): void
  (event: 'add-upstream-reset'): void
  (event: 'route-groups-refresh'): void
  (event: 'route-group-create', payload: { name: string; apiKey: string }): void
  (event: 'route-group-update', group: GatewayRouteGroup, payload: { name: string; apiKey: string }): void
  (event: 'route-group-delete', group: GatewayRouteGroup): void
  (event: 'route-group-assignment-save'): void
  (event: 'route-models-save'): void
  (event: 'open-log-error-detail', detail: GatewayErrorDetail): void
  (event: 'copy-error-detail', value: string): void
}>()

const priorityOpen = writableValue(
  () => props.priorityDialog.open.value,
  (value) => {
    props.priorityDialog.open.value = value
  },
)

const priorityInsertIndex = writableValue(
  () => props.priorityDialog.insertIndex.value,
  (value) => {
    props.priorityDialog.insertIndex.value = value
  },
)

const balanceManualOpen = writableValue(
  () => props.balanceManualDialog.open.value,
  (value) => {
    props.balanceManualDialog.open.value = value
  },
)

const balanceManualURL = writableValue(
  () => props.balanceManualDialog.url.value,
  (value) => {
    props.balanceManualDialog.url.value = value
  },
)

const settingsOpen = writableValue(
  () => props.settingsDialog.open.value,
  (value) => {
    props.settingsDialog.open.value = value
  },
)

const addUpstreamOpen = writableValue(
  () => props.addUpstreamDialog.open.value,
  (value) => {
    props.addUpstreamDialog.open.value = value
  },
)

const addUpstreamGroupNames = writableValue(
  () => props.addUpstreamDialog.groupNames.value,
  (value) => {
    props.addUpstreamDialog.groupNames.value = value
  },
)

const routeGroupManagerOpen = writableValue(
  () => props.routeGroupManagerDialog.open.value,
  (value) => {
    props.routeGroupManagerDialog.open.value = value
  },
)

const routeGroupAssignmentOpen = writableValue(
  () => props.routeGroupAssignmentDialog.open.value,
  (value) => {
    props.routeGroupAssignmentDialog.open.value = value
  },
)

const routeGroupAssignmentIds = writableValue(
  () => props.routeGroupAssignmentDialog.groupIds.value,
  (value) => {
    props.routeGroupAssignmentDialog.groupIds.value = value
  },
)

const routeModelsOpen = writableValue(
  () => props.routeModelsDialog.open.value,
  (value) => {
    props.routeModelsDialog.open.value = value
  },
)

const routeModelsRequestURLs = writableValue(
  () => props.routeModelsDialog.requestURLs.value,
  (value) => {
    props.routeModelsDialog.requestURLs.value = value
  },
)

const routeModelsSupportedModels = writableValue(
  () => props.routeModelsDialog.supportedModels.value,
  (value) => {
    props.routeModelsDialog.supportedModels.value = value
  },
)

const logsDrawerOpen = writableValue(
  () => props.logsDrawer.open.value,
  (value) => {
    props.logsDrawer.open.value = value
  },
)

const logSearch = writableValue(
  () => props.logsDrawer.search.value,
  (value) => {
    props.logsDrawer.search.value = value
  },
)

const routeLogsDrawerOpen = writableValue(
  () => props.routeLogsDrawer.open.value,
  (value) => {
    props.routeLogsDrawer.open.value = value
  },
)

const errorDetailOpen = writableValue(
  () => props.errorDetailDrawer.open.value,
  (value) => {
    props.errorDetailDrawer.open.value = value
  },
)

const routeLogSearch = writableValue(
  () => props.routeLogsDrawer.search.value,
  (value) => {
    props.routeLogsDrawer.search.value = value
  },
)

const routeDiagnosisOpen = writableValue(
  () => props.routeDiagnosisDrawer.open.value,
  (value) => {
    props.routeDiagnosisDrawer.open.value = value
  },
)

const routeLogsTitle = computed(() => {
  const route = props.routeLogsDrawer.route.value
  return `路由请求历史 - ${route ? props.loadRouteLabel(route) : ''}`
})
</script>

<template>
  <GatewayOverlayHost
    v-model:priority-open="priorityOpen"
    v-model:priority-insert-index="priorityInsertIndex"
    v-model:balance-probe-manual-open="balanceManualOpen"
    v-model:balance-probe-manual-u-r-l="balanceManualURL"
    v-model:settings-open="settingsOpen"
    v-model:add-upstream-open="addUpstreamOpen"
    v-model:add-upstream-group-names="addUpstreamGroupNames"
    v-model:route-group-manager-open="routeGroupManagerOpen"
    v-model:route-group-assignment-open="routeGroupAssignmentOpen"
    v-model:route-group-assignment-ids="routeGroupAssignmentIds"
    v-model:route-models-open="routeModelsOpen"
    v-model:route-models-request-urls="routeModelsRequestURLs"
    v-model:route-models-supported-models="routeModelsSupportedModels"
    v-model:logs-drawer-open="logsDrawerOpen"
    v-model:error-detail-open="errorDetailOpen"
    v-model:log-search="logSearch"
    v-model:route-logs-drawer-open="routeLogsDrawerOpen"
    v-model:route-log-search="routeLogSearch"
    v-model:route-diagnosis-open="routeDiagnosisOpen"
    :priority-loading="priorityDialog.loading.value"
    :priority-columns="priorityColumns"
    :priority-routes="priorityDialog.routes.value"
    :priority-selected-route="priorityDialog.route.value"
    :route-row-key="routeRowKey"
    :priority-row-class-name="priorityDialog.rowClassName"
    :load-route-label="loadRouteLabel"
    :route-priority-label="routePriorityLabel"
    :format-group-names="formatGroupNames"
    :balance-route="balanceManualDialog.route.value"
    :balance-message="balanceManualDialog.message.value"
    :balance-loading="balanceManualDialog.loading.value"
    :settings-form="settingsDialog.form"
    :settings-loading="settingsDialog.loading.value"
    :add-upstream-form="addUpstreamDialog.form"
    :group-options="groupOptions"
    :add-upstream-loading="addUpstreamDialog.loading.value"
    :route-group-manager-loading="routeGroupManagerDialog.loading.value"
    :route-group-assignment-loading="routeGroupAssignmentDialog.loading.value"
    :route-group-assignment-route="routeGroupAssignmentDialog.route.value"
    :route-groups="routeGroups"
    :route-models-route="routeModelsDialog.route.value"
    :route-models-saving="routeModelsDialog.saving.value"
    :log-columns="logColumns"
    :logs="logs"
    :error-detail="errorDetailDrawer.detail.value"
    :route-logs="routeLogs"
    :route-logs-loading="routeLogsDrawer.loading.value"
    :route-logs-title="routeLogsTitle"
    :page-size="pageSize"
    :drawer-table-y="drawerTableY"
    :log-row-key="logRowKey"
    :format-time="formatTime"
    :request-method-color="requestMethodColor"
    :log-method-label="logMethodLabel"
    :log-request-label="logRequestLabel"
    :log-request-u-r-l="logRequestURL"
    :log-route-label="logRouteLabel"
    :log-route-meta="logRouteMeta"
    :log-transfer-lines="logTransferLines"
    :gateway-log-has-error-detail="gatewayLogHasErrorDetail"
    :log-model-meta="logModelMeta"
    :log-user-agent="logUserAgent"
    :build-log-error-detail="buildLogErrorDetail"
    :route-diagnosis="routeDiagnosisDrawer.diagnosis.value"
    :route-diagnosis-loading="routeDiagnosisDrawer.loading.value"
    @priority-move="emit('priority-move')"
    @priority-preset="emit('priority-preset', $event)"
    @balance-submit="emit('balance-submit')"
    @settings-save="emit('settings-save', $event)"
    @add-upstream-submit="(form, selectedGroupNames) => emit('add-upstream-submit', form, selectedGroupNames)"
    @add-upstream-reset="emit('add-upstream-reset')"
    @route-groups-refresh="emit('route-groups-refresh')"
    @route-group-create="emit('route-group-create', $event)"
    @route-group-update="(group, payload) => emit('route-group-update', group, payload)"
    @route-group-delete="emit('route-group-delete', $event)"
    @route-group-assignment-save="emit('route-group-assignment-save')"
    @route-models-save="emit('route-models-save')"
    @open-log-error-detail="emit('open-log-error-detail', $event)"
    @copy-error-detail="emit('copy-error-detail', $event)"
  />
</template>
