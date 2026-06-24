<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { GatewayErrorDetail, GatewayErrorDetailLine } from '../../gatewayActivityDisplayModel'
import type { AddUpstreamForm } from '../../gatewayAddUpstreamModel'
import type { GatewayPriorityPresetMode } from '../../gatewayPriorityModel'
import type { GatewayLog, GatewayRoute, GatewayRouteDiagnosis, GatewayRouteGroup, GatewaySettingsData } from '../../types'
import GatewayAddUpstreamDialog from './GatewayAddUpstreamDialog.vue'
import GatewayLogsDrawer from './GatewayLogsDrawer.vue'
import GatewayPriorityDialog from './GatewayPriorityDialog.vue'
import GatewayRouteBalanceManualDialog from './GatewayRouteBalanceManualDialog.vue'
import GatewayRouteDiagnosisDrawer from './GatewayRouteDiagnosisDrawer.vue'
import GatewayRouteGroupAssignmentDialog from './GatewayRouteGroupAssignmentDialog.vue'
import GatewayRouteGroupsDialog from './GatewayRouteGroupsDialog.vue'
import GatewayRouteModelsDialog from './GatewayRouteModelsDialog.vue'
import GatewaySettingsDialog from './GatewaySettingsDialog.vue'

type SelectOption = {
  label: string
  value: string
}

type GatewayRouteDiagnosisView = Pick<GatewayRouteDiagnosis, 'route_label' | 'healthy' | 'active_count' | 'checked_at' | 'diagnostics'>

const priorityOpen = defineModel<boolean>('priorityOpen', { required: true })
const priorityInsertIndex = defineModel<number | undefined>('priorityInsertIndex', { required: true })
const balanceProbeManualOpen = defineModel<boolean>('balanceProbeManualOpen', { required: true })
const balanceProbeManualURL = defineModel<string>('balanceProbeManualURL', { required: true })
const settingsOpen = defineModel<boolean>('settingsOpen', { required: true })
const addUpstreamOpen = defineModel<boolean>('addUpstreamOpen', { required: true })
const addUpstreamGroupNames = defineModel<string[]>('addUpstreamGroupNames', { required: true })
const routeGroupManagerOpen = defineModel<boolean>('routeGroupManagerOpen', { required: true })
const routeGroupAssignmentOpen = defineModel<boolean>('routeGroupAssignmentOpen', { required: true })
const routeGroupAssignmentIds = defineModel<number[]>('routeGroupAssignmentIds', { required: true })
const routeModelsOpen = defineModel<boolean>('routeModelsOpen', { required: true })
const routeModelsRequestUrls = defineModel<string>('routeModelsRequestUrls', { required: true })
const routeModelsSupportedModels = defineModel<string[]>('routeModelsSupportedModels', { required: true })
const logsDrawerOpen = defineModel<boolean>('logsDrawerOpen', { required: true })
const errorDetailOpen = defineModel<boolean>('errorDetailOpen', { required: true })
const logSearch = defineModel<string>('logSearch', { required: true })
const routeLogsDrawerOpen = defineModel<boolean>('routeLogsDrawerOpen', { required: true })
const routeLogSearch = defineModel<string>('routeLogSearch', { required: true })
const routeDiagnosisOpen = defineModel<boolean>('routeDiagnosisOpen', { required: true })

defineProps<{
  priorityLoading: boolean
  priorityColumns: ColumnsType<GatewayRoute>
  priorityRoutes: GatewayRoute[]
  prioritySelectedRoute: GatewayRoute | null
  routeRowKey: (record: GatewayRoute) => string | number
  priorityRowClassName: (record: GatewayRoute) => string
  loadRouteLabel: (route: GatewayRoute) => string
  routePriorityLabel: (route: GatewayRoute | null) => string
  formatGroupNames: (value: string | string[] | null | undefined) => string
  balanceRoute: GatewayRoute | null
  balanceMessage: string
  balanceLoading: boolean
  settingsForm: GatewaySettingsData
  settingsLoading: boolean
  addUpstreamForm: AddUpstreamForm
  groupOptions: SelectOption[]
  addUpstreamLoading: boolean
  routeGroupManagerLoading: boolean
  routeGroupAssignmentLoading: boolean
  routeGroupAssignmentRoute: GatewayRoute | null
  routeGroups: GatewayRouteGroup[]
  routeModelsRoute: GatewayRoute | null
  routeModelsSaving: boolean
  logColumns: ColumnsType<GatewayLog>
  logs: GatewayLog[]
  errorDetail: GatewayErrorDetail | null
  routeLogs: GatewayLog[]
  routeLogsLoading: boolean
  routeLogsTitle: string
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
  routeDiagnosis: GatewayRouteDiagnosisView | null
  routeDiagnosisLoading: boolean
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
</script>

<template>
  <GatewayPriorityDialog
    v-model:open="priorityOpen"
    v-model:insert-index="priorityInsertIndex"
    :loading="priorityLoading"
    :columns="priorityColumns"
    :routes="priorityRoutes"
    :selected-route="prioritySelectedRoute"
    :row-key="routeRowKey"
    :row-class-name="priorityRowClassName"
    :load-route-label="loadRouteLabel"
    :route-priority-label="routePriorityLabel"
    :format-group-names="formatGroupNames"
    @move="emit('priority-move')"
    @preset="emit('priority-preset', $event)"
  />

  <GatewayRouteBalanceManualDialog
    v-model:open="balanceProbeManualOpen"
    v-model:url="balanceProbeManualURL"
    :route="balanceRoute"
    :message="balanceMessage"
    :loading="balanceLoading"
    :load-route-label="loadRouteLabel"
    @submit="emit('balance-submit')"
  />

  <GatewaySettingsDialog
    v-model:open="settingsOpen"
    :form="settingsForm"
    :loading="settingsLoading"
    @save="emit('settings-save', $event)"
  />

  <GatewayAddUpstreamDialog
    v-model:open="addUpstreamOpen"
    v-model:group-names="addUpstreamGroupNames"
    :form="addUpstreamForm"
    :group-options="groupOptions"
    :loading="addUpstreamLoading"
    @submit="(form, selectedGroupNames) => emit('add-upstream-submit', form, selectedGroupNames)"
    @reset="emit('add-upstream-reset')"
  />

  <GatewayRouteGroupsDialog
    v-model:open="routeGroupManagerOpen"
    :groups="routeGroups"
    :loading="routeGroupManagerLoading"
    @refresh="emit('route-groups-refresh')"
    @create="emit('route-group-create', $event)"
    @update="(group, payload) => emit('route-group-update', group, payload)"
    @delete="emit('route-group-delete', $event)"
  />

  <GatewayRouteGroupAssignmentDialog
    v-model:open="routeGroupAssignmentOpen"
    v-model:group-ids="routeGroupAssignmentIds"
    :route="routeGroupAssignmentRoute"
    :groups="routeGroups"
    :loading="routeGroupAssignmentLoading"
    :load-route-label="loadRouteLabel"
    @save="emit('route-group-assignment-save')"
  />

  <GatewayRouteModelsDialog
    v-model:open="routeModelsOpen"
    v-model:request-u-r-ls="routeModelsRequestUrls"
    v-model:supported-models="routeModelsSupportedModels"
    :route="routeModelsRoute"
    :saving="routeModelsSaving"
    :load-route-label="loadRouteLabel"
    @save="emit('route-models-save')"
  />

  <GatewayLogsDrawer
    v-model:open="logsDrawerOpen"
    v-model:search="logSearch"
    title="最近请求"
    placeholder="搜索路由 / 路径 / 失败原因"
    :columns="logColumns"
    :logs="logs"
    :page-size="pageSize"
    :drawer-table-y="drawerTableY"
    :row-key="logRowKey"
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
    @open-error-detail="emit('open-log-error-detail', $event)"
  />

  <GatewayLogsDrawer
    v-model:open="routeLogsDrawerOpen"
    v-model:search="routeLogSearch"
    :title="routeLogsTitle"
    placeholder="搜索路径 / 失败原因 / 路由"
    :columns="logColumns"
    :logs="routeLogs"
    :loading="routeLogsLoading"
    :page-size="pageSize"
    :drawer-table-y="drawerTableY"
    :row-key="logRowKey"
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
    @open-error-detail="emit('open-log-error-detail', $event)"
  />

  <a-drawer
    v-model:open="errorDetailOpen"
    title="错误详情"
    width="min(960px, 100vw)"
    placement="right"
  >
    <div v-if="errorDetail" class="gateway-error-detail">
      <div class="gateway-error-detail__head">
        <div class="gateway-error-detail__title">
          <strong>{{ errorDetail.title }}</strong>
          <span>{{ errorDetail.sourceLabel }}</span>
        </div>
        <a-space size="small" wrap>
          <a-tag :color="errorDetail.success ? 'success' : 'error'">{{ errorDetail.statusLabel }}</a-tag>
          <a-button size="small" @click="emit('copy-error-detail', errorDetail.fullText)">
            复制
          </a-button>
        </a-space>
      </div>
      <div class="gateway-error-detail__meta">
        <div
          v-for="field in errorDetail.fields"
          :key="`${field.label}:${field.value}`"
          class="gateway-error-detail__meta-item"
        >
          <span>{{ field.label }}</span>
          <strong>{{ field.value }}</strong>
        </div>
      </div>
      <div class="gateway-error-detail__lines">
        <div
          v-for="line in errorDetail.lines"
          :key="`${line.label}:${line.value}`"
          class="gateway-error-detail__line"
        >
          <a-tag :color="line.tone === 'error' ? 'error' : line.tone === 'success' ? 'success' : 'processing'">{{ line.label }}</a-tag>
          <pre>{{ line.value }}</pre>
        </div>
      </div>
      <div class="gateway-error-detail__raw">
        <span>完整错误文本</span>
        <pre>{{ errorDetail.fullText }}</pre>
      </div>
    </div>
  </a-drawer>

  <GatewayRouteDiagnosisDrawer
    v-model:open="routeDiagnosisOpen"
    :diagnosis="routeDiagnosis"
    :loading="routeDiagnosisLoading"
    :format-time="formatTime"
  />
</template>
