<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { GatewayIssueState } from '../../gatewayViewConfig'
import type { RouteBatchProgress } from '../../gatewayViewModel'
import type { GatewayRoute } from '../../types'
import GatewayRouteManagementTable from './GatewayRouteManagementTable.vue'
import GatewayRouteManagementToolbar from './GatewayRouteManagementToolbar.vue'

type SelectOption<T extends string = string> = {
  label: string
  value: T
}

type GatewayRouteDetailItem = {
  label: string
  value: string
}

const routeSearch = defineModel<string>('routeSearch', { required: true })
const selectedGroups = defineModel<string[]>('selectedGroups', { required: true })
const selectedIssueStates = defineModel<GatewayIssueState[]>('selectedIssueStates', { required: true })
const includeDisabled = defineModel<boolean>('includeDisabled', { required: true })

defineProps<{
  filteredRouteCount: number
  routeCount: number
  requestUrl: string
  codexTooltip: string
  maskedApiKey: string
  hasApiKey: boolean
  loading: boolean
  autoRefreshError: string | null
  probeLoading: boolean
  balanceProbeAllLoading: boolean
  probeAllProgress: RouteBatchProgress | null
  probeAllProgressPercent: number
  balanceProbeAllProgress: RouteBatchProgress | null
  balanceProbeAllProgressPercent: number
  columns: ColumnsType<GatewayRoute>
  routes: GatewayRoute[]
  pageSize: number
  tableY: number
  rowKey: (route: GatewayRoute) => string | number
  bindTableContainer: (element: Element | ComponentPublicInstance | null) => void
  selectedRouteTypes: Array<GatewayRoute['route_type']>
  groupOptions: SelectOption[]
  activeRouteFilterCount: number
  isRouteTypeFilterActive: (routeType: GatewayRoute['route_type']) => boolean
  asRoute: (record: unknown) => GatewayRoute
  loadRouteLabel: (route: GatewayRoute) => string
  routeDetailItems: (route: GatewayRoute) => GatewayRouteDetailItem[]
  routeIssueLabels: (route: GatewayRoute) => string[]
  supportedModelsPreview: (models: string[]) => string
  normalizeRoutePath: (routePath: unknown) => NonNullable<GatewayRoute['route_path']>
  balanceClass: (balance: number | null | undefined) => string
  formatGroupNames: (value: string | string[] | null | undefined) => string
  routeConcurrencyLimitLabel: string
  primaryLatency: (route: GatewayRoute) => number | null
  latencyClass: (latencyMs: number | null | undefined) => string
  formatLatency: (latencyMs: number | null | undefined) => string
  routeLatencyDetails: (route: GatewayRoute) => string[]
  routeErrorDetails: (route: GatewayRoute) => string[]
  isRouteProbing: (routeId: number) => boolean
  isRouteBalanceProbing: (routeId: number) => boolean
}>()

const emit = defineEmits<{
  (event: 'copy-request-url'): void
  (event: 'copy-api-key'): void
  (event: 'refresh'): void
  (event: 'sync'): void
  (event: 'probe-all'): void
  (event: 'update-all-balances'): void
  (event: 'disable-all'): void
  (event: 'manage-groups'): void
  (event: 'add-upstream'): void
  (event: 'open-settings'): void
  (event: 'clear-route-types'): void
  (event: 'toggle-route-type', value: GatewayRoute['route_type']): void
  (event: 'clear-filters'): void
  (event: 'include-disabled-change'): void
  (event: 'type-change', route: GatewayRoute, value: unknown): void
  (event: 'path-change', route: GatewayRoute, value: unknown): void
  (event: 'toggle', route: GatewayRoute): void
  (event: 'reset-circuit', route: GatewayRoute): void
  (event: 'probe', route: GatewayRoute): void
  (event: 'probe-balance', route: GatewayRoute): void
  (event: 'configure-models', route: GatewayRoute): void
  (event: 'assign-groups', route: GatewayRoute): void
  (event: 'enable-only', route: GatewayRoute): void
  (event: 'priority', route: GatewayRoute): void
  (event: 'diagnose', route: GatewayRoute): void
  (event: 'history', route: GatewayRoute): void
  (event: 'delete', route: GatewayRoute): void
}>()
</script>

<template>
  <GatewayRouteManagementToolbar
    :filtered-route-count="filteredRouteCount"
    :route-count="routeCount"
    :request-url="requestUrl"
    :codex-tooltip="codexTooltip"
    :masked-api-key="maskedApiKey"
    :has-api-key="hasApiKey"
    :loading="loading"
    :probe-loading="probeLoading"
    :balance-probe-all-loading="balanceProbeAllLoading"
    :probe-all-progress="probeAllProgress"
    :probe-all-progress-percent="probeAllProgressPercent"
    :balance-probe-all-progress="balanceProbeAllProgress"
    :balance-probe-all-progress-percent="balanceProbeAllProgressPercent"
    @copy-request-url="emit('copy-request-url')"
    @copy-api-key="emit('copy-api-key')"
    @refresh="emit('refresh')"
    @sync="emit('sync')"
    @probe-all="emit('probe-all')"
    @update-all-balances="emit('update-all-balances')"
    @disable-all="emit('disable-all')"
    @manage-groups="emit('manage-groups')"
    @add-upstream="emit('add-upstream')"
    @open-settings="emit('open-settings')"
  />

  <a-alert
    v-if="autoRefreshError"
    class="gateway-auto-refresh-alert"
    type="warning"
    show-icon
    :message="autoRefreshError"
  />

  <div class="gateway-fill">
    <GatewayRouteManagementTable
      v-model:route-search="routeSearch"
      v-model:selected-groups="selectedGroups"
      v-model:selected-issue-states="selectedIssueStates"
      v-model:include-disabled="includeDisabled"
      :columns="columns"
      :routes="routes"
      :page-size="pageSize"
      :table-y="tableY"
      :row-key="rowKey"
      :bind-table-container="bindTableContainer"
      :selected-route-types="selectedRouteTypes"
      :group-options="groupOptions"
      :active-route-filter-count="activeRouteFilterCount"
      :is-route-type-filter-active="isRouteTypeFilterActive"
      :as-route="asRoute"
      :load-route-label="loadRouteLabel"
      :route-detail-items="routeDetailItems"
      :route-issue-labels="routeIssueLabels"
      :supported-models-preview="supportedModelsPreview"
      :normalize-route-path="normalizeRoutePath"
      :balance-class="balanceClass"
      :format-group-names="formatGroupNames"
      :route-concurrency-limit-label="routeConcurrencyLimitLabel"
      :primary-latency="primaryLatency"
      :latency-class="latencyClass"
      :format-latency="formatLatency"
      :route-latency-details="routeLatencyDetails"
      :route-error-details="routeErrorDetails"
      :is-route-probing="isRouteProbing"
      :is-route-balance-probing="isRouteBalanceProbing"
      @clear-route-types="emit('clear-route-types')"
      @toggle-route-type="emit('toggle-route-type', $event)"
      @clear-filters="emit('clear-filters')"
      @include-disabled-change="emit('include-disabled-change')"
      @type-change="(route, value) => emit('type-change', route, value)"
      @path-change="(route, value) => emit('path-change', route, value)"
      @toggle="emit('toggle', $event)"
      @reset-circuit="emit('reset-circuit', $event)"
      @probe="emit('probe', $event)"
      @probe-balance="emit('probe-balance', $event)"
      @configure-models="emit('configure-models', $event)"
      @assign-groups="emit('assign-groups', $event)"
      @enable-only="emit('enable-only', $event)"
      @priority="emit('priority', $event)"
      @diagnose="emit('diagnose', $event)"
      @history="emit('history', $event)"
      @delete="emit('delete', $event)"
    />
  </div>
</template>
