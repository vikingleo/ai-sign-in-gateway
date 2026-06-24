<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { GatewayErrorDetail } from '../../gatewayActivityDisplayModel'
import type { GatewayUsageRange } from '../../gatewayUsageRangeController'
import type { GatewayActivityFeedItem, MetricTone } from '../../gatewayViewModel'
import type { GatewayActiveRequest, GatewayLog, GatewayRoute, GatewayUsage, GatewayUsageRoute } from '../../types'
import GatewayMonitorDashboard from './GatewayMonitorDashboard.vue'
import GatewayMonitorToolbar from './GatewayMonitorToolbar.vue'

type GatewayMetricCard = {
  title: string
  value: string | number
  tone: MetricTone
}

type GatewayUsageSummaryCard = {
  title: string
  value: string
  tone: MetricTone
}

type GatewayRoutePoolStatusCard = {
  key: string
  label: string
  value: number
  tone: 'success' | 'warning' | 'danger' | 'neutral'
  ratio: number
}

type GatewayStrategyCard = {
  key: string
  title: string
  value: string
  width: string
  tone: MetricTone
}

defineProps<{
  requestUrl: string
  codexTooltip: string
  maskedApiKey: string
  hasApiKey: boolean
  loading: boolean
  autoRefreshError: string | null
  metricCards: GatewayMetricCard[]
  usageRange: GatewayUsageRange
  usageSummaryCards: GatewayUsageSummaryCard[]
  usageColumns: ColumnsType<GatewayUsageRoute>
  usage: GatewayUsage | null
  usageLoading: boolean
  usageRowKey: (record: GatewayUsageRoute) => string | number
  usageRouteLabel: (record: GatewayUsageRoute) => string
  usageRouteMeta: (record: GatewayUsageRoute) => string
  formatNumber: (value: number | null | undefined) => string
  formatUSD: (value: number | null | undefined) => string
  formatTime: (value: string | null) => string
  routeActivityFeed: GatewayActivityFeedItem[]
  activeRequestCount: number
  activityHasErrorDetail: (item: GatewayActivityFeedItem) => boolean
  buildLogErrorDetail: (log: GatewayLog) => GatewayErrorDetail
  buildActiveErrorDetail: (item: GatewayActiveRequest) => GatewayErrorDetail
  routePoolStatusCards: GatewayRoutePoolStatusCard[]
  routePoolPreviewRoutes: GatewayRoute[]
  routeConcurrencyLimitLabel: string
  gatewayStrategyCards: GatewayStrategyCard[]
}>()

const emit = defineEmits<{
  (event: 'copy-request-url'): void
  (event: 'copy-api-key'): void
  (event: 'refresh'): void
  (event: 'open-settings'): void
  (event: 'open-logs'): void
  (event: 'update:start', value: string): void
  (event: 'update:end', value: string): void
  (event: 'today'): void
  (event: 'query'): void
  (event: 'copy-activity-url', value: string): void
  (event: 'open-error-detail', detail: GatewayErrorDetail): void
}>()
</script>

<template>
  <GatewayMonitorToolbar
    :request-url="requestUrl"
    :codex-tooltip="codexTooltip"
    :masked-api-key="maskedApiKey"
    :has-api-key="hasApiKey"
    :loading="loading"
    @copy-request-url="emit('copy-request-url')"
    @copy-api-key="emit('copy-api-key')"
    @refresh="emit('refresh')"
    @open-settings="emit('open-settings')"
    @open-logs="emit('open-logs')"
  />

  <a-alert
    v-if="autoRefreshError"
    class="gateway-auto-refresh-alert"
    type="warning"
    show-icon
    :message="autoRefreshError"
  />

  <GatewayMonitorDashboard
    :metric-cards="metricCards"
    :usage-range="usageRange"
    :usage-summary-cards="usageSummaryCards"
    :usage-columns="usageColumns"
    :usage="usage"
    :usage-loading="usageLoading"
    :usage-row-key="usageRowKey"
    :usage-route-label="usageRouteLabel"
    :usage-route-meta="usageRouteMeta"
    :format-number="formatNumber"
    :format-u-s-d="formatUSD"
    :format-time="formatTime"
    :route-activity-feed="routeActivityFeed"
    :active-request-count="activeRequestCount"
    :activity-has-error-detail="activityHasErrorDetail"
    :build-log-error-detail="buildLogErrorDetail"
    :build-active-error-detail="buildActiveErrorDetail"
    :route-pool-status-cards="routePoolStatusCards"
    :route-pool-preview-routes="routePoolPreviewRoutes"
    :route-concurrency-limit-label="routeConcurrencyLimitLabel"
    :gateway-strategy-cards="gatewayStrategyCards"
    @update:start="emit('update:start', $event)"
    @update:end="emit('update:end', $event)"
    @today="emit('today')"
    @query="emit('query')"
    @copy-activity-url="emit('copy-activity-url', $event)"
    @open-error-detail="emit('open-error-detail', $event)"
  />
</template>
