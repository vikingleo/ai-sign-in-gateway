<script setup lang="ts">
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import type { ComponentPublicInstance } from 'vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import { routePathOptions, routeTypeOptions, type GatewayIssueState } from '../../gatewayViewConfig'
import type { GatewayRoute } from '../../types'
import GatewayRouteActionsMenu from './GatewayRouteActionsMenu.vue'
import GatewayRouteBalanceCell from './GatewayRouteBalanceCell.vue'
import GatewayRouteConcurrencyCell from './GatewayRouteConcurrencyCell.vue'
import GatewayRouteConfigCell from './GatewayRouteConfigCell.vue'
import GatewayRouteErrorCell from './GatewayRouteErrorCell.vue'
import GatewayRouteFiltersBar from './GatewayRouteFiltersBar.vue'
import GatewayRouteLatencyCell from './GatewayRouteLatencyCell.vue'
import GatewayRouteSummaryCell from './GatewayRouteSummaryCell.vue'
import GatewayRouteTextCell from './GatewayRouteTextCell.vue'

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
  <a-card :bordered="false" class="admin-card admin-card--fill route-pool-card route-pool-card--standalone">
    <div class="card-shell">
      <GatewayRouteFiltersBar
        :route-search="routeSearch"
        :selected-groups="selectedGroups"
        :selected-route-types="selectedRouteTypes"
        :selected-issue-states="selectedIssueStates"
        :include-disabled="includeDisabled"
        :group-options="groupOptions"
        :active-route-filter-count="activeRouteFilterCount"
        :is-route-type-filter-active="isRouteTypeFilterActive"
        @update:route-search="routeSearch = $event"
        @update:selected-groups="selectedGroups = $event"
        @update:selected-issue-states="selectedIssueStates = $event"
        @update:include-disabled="includeDisabled = $event"
        @clear-route-types="emit('clear-route-types')"
        @toggle-route-type="emit('toggle-route-type', $event)"
        @clear-filters="emit('clear-filters')"
        @include-disabled-change="emit('include-disabled-change')"
      />
      <div :ref="bindTableContainer" class="table-fill table-fill--management">
        <a-table
          :columns="columns"
          :data-source="routes"
          :pagination="{ pageSize }"
          :row-key="rowKey"
          size="middle"
          :scroll="{ x: 1760, y: tableY }"
        >
          <template #headerCell="{ column }">
            <template v-if="column.key === 'weight'">
              <span class="table-header-help">
                <span>权重</span>
                <a-tooltip
                  placement="top"
                  title="用于加权轮询和智能评分。权重越大，在健康且满足并发/熔断条件时获得请求的概率越高；智能策略还会结合延迟、并发、失败记录和优先级共同计算。"
                >
                  <QuestionCircleOutlined class="table-info-icon" aria-hidden="true" />
                </a-tooltip>
              </span>
            </template>
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'route'">
              <GatewayRouteSummaryCell
                :route="asRoute(record)"
                :load-route-label="loadRouteLabel"
                :route-detail-items="routeDetailItems"
                :route-issue-labels="routeIssueLabels"
                :supported-models-preview="supportedModelsPreview"
              />
            </template>
            <template v-else-if="column.key === 'type'">
              <GatewayRouteConfigCell
                mode="type"
                :route="asRoute(record)"
                :route-type-options="routeTypeOptions"
                :route-path-options="routePathOptions"
                :normalize-route-path="normalizeRoutePath"
                @type-change="(route, value) => emit('type-change', route, value)"
                @path-change="(route, value) => emit('path-change', route, value)"
              />
            </template>
            <template v-else-if="column.key === 'path'">
              <GatewayRouteConfigCell
                mode="path"
                :route="asRoute(record)"
                :route-type-options="routeTypeOptions"
                :route-path-options="routePathOptions"
                :normalize-route-path="normalizeRoutePath"
                @type-change="(route, value) => emit('type-change', route, value)"
                @path-change="(route, value) => emit('path-change', route, value)"
              />
            </template>
            <template v-else-if="column.key === 'balance'">
              <GatewayRouteBalanceCell :route="asRoute(record)" :balance-class="balanceClass" />
            </template>
            <template v-else-if="column.key === 'group'">
              <GatewayRouteTextCell mode="group" :route="asRoute(record)" :format-group-names="formatGroupNames" />
            </template>
            <template v-else-if="column.key === 'priority'">
              <GatewayRouteTextCell mode="priority" :route="asRoute(record)" :format-group-names="formatGroupNames" />
            </template>
            <template v-else-if="column.key === 'weight'">
              <GatewayRouteTextCell mode="weight" :route="asRoute(record)" :format-group-names="formatGroupNames" />
            </template>
            <template v-else-if="column.key === 'concurrency'">
              <GatewayRouteConcurrencyCell :route="asRoute(record)" :route-concurrency-limit-label="routeConcurrencyLimitLabel" />
            </template>
            <template v-else-if="column.key === 'success_rate'">
              <GatewayRouteTextCell mode="successRate" :route="asRoute(record)" :format-group-names="formatGroupNames" />
            </template>
            <template v-else-if="column.key === 'latency'">
              <GatewayRouteLatencyCell
                :route="asRoute(record)"
                :primary-latency="primaryLatency"
                :latency-class="latencyClass"
                :format-latency="formatLatency"
                :route-latency-details="routeLatencyDetails"
              />
            </template>
            <template v-else-if="column.key === 'error'">
              <GatewayRouteErrorCell
                :route="asRoute(record)"
                :route-error-details="routeErrorDetails"
              />
            </template>
            <template v-else-if="column.key === 'actions'">
              <GatewayRouteActionsMenu
                :route="asRoute(record)"
                :route-probing="isRouteProbing(asRoute(record).id)"
                :balance-probing="isRouteBalanceProbing(asRoute(record).id)"
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
            </template>
          </template>
        </a-table>
      </div>
    </div>
  </a-card>
</template>
