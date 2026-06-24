<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { GatewayErrorDetail } from '../../gatewayActivityDisplayModel'
import type { GatewayUsageRange } from '../../gatewayUsageRangeController'
import type { GatewayActivityFeedItem, MetricTone } from '../../gatewayViewModel'
import type { GatewayActiveRequest, GatewayLog, GatewayRoute, GatewayUsage, GatewayUsageRoute } from '../../types'
import GatewayActivityPanel from './GatewayActivityPanel.vue'
import GatewayMetricCards from './GatewayMetricCards.vue'
import GatewayRouteStatusPanel from './GatewayRouteStatusPanel.vue'
import GatewayStrategyPanel from './GatewayStrategyPanel.vue'
import GatewayUsagePanel from './GatewayUsagePanel.vue'

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
  (event: 'update:start', value: string): void
  (event: 'update:end', value: string): void
  (event: 'today'): void
  (event: 'query'): void
  (event: 'copy-activity-url', value: string): void
  (event: 'open-error-detail', detail: GatewayErrorDetail): void
}>()
</script>

<template>
  <GatewayMetricCards :cards="metricCards" />

  <div class="gateway-fill">
    <a-card
      :bordered="false"
      class="admin-card gateway-overview-shell"
    >
      <div class="gateway-overview-grid">
        <GatewayUsagePanel
          :usage-range="usageRange"
          :summary-cards="usageSummaryCards"
          :columns="usageColumns"
          :usage="usage"
          :loading="usageLoading"
          :row-key="usageRowKey"
          :usage-route-label="usageRouteLabel"
          :usage-route-meta="usageRouteMeta"
          :format-number="formatNumber"
          :format-u-s-d="formatUSD"
          :format-time="formatTime"
          @update:start="emit('update:start', $event)"
          @update:end="emit('update:end', $event)"
          @today="emit('today')"
          @query="emit('query')"
        />

        <GatewayActivityPanel
          :items="routeActivityFeed"
          :active-count="activeRequestCount"
          :activity-has-error-detail="activityHasErrorDetail"
          :build-log-error-detail="buildLogErrorDetail"
          :build-active-error-detail="buildActiveErrorDetail"
          @copy="emit('copy-activity-url', $event)"
          @open-error-detail="emit('open-error-detail', $event)"
        />

        <GatewayRouteStatusPanel
          :status-cards="routePoolStatusCards"
          :preview-routes="routePoolPreviewRoutes"
          :route-concurrency-limit-label="routeConcurrencyLimitLabel"
        />

        <GatewayStrategyPanel :cards="gatewayStrategyCards" />
      </div>
    </a-card>
  </div>
</template>
