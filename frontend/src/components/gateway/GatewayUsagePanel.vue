<script setup lang="ts">
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { GatewayUsageRange } from '../../gatewayUsageRangeController'
import type { MetricTone } from '../../gatewayViewModel'
import type { GatewayUsage, GatewayUsageRoute } from '../../types'

defineProps<{
  usageRange: GatewayUsageRange
  summaryCards: Array<{ title: string; value: string; tone: MetricTone }>
  columns: ColumnsType<GatewayUsageRoute>
  usage: GatewayUsage | null
  loading: boolean
  rowKey: (record: GatewayUsageRoute) => string | number
  usageRouteLabel: (record: GatewayUsageRoute) => string
  usageRouteMeta: (record: GatewayUsageRoute) => string
  formatNumber: (value: number | null | undefined) => string
  formatUSD: (value: number | null | undefined) => string
  formatTime: (value: string | null) => string
}>()

const emit = defineEmits<{
  (event: 'update:start', value: string): void
  (event: 'update:end', value: string): void
  (event: 'today'): void
  (event: 'query'): void
}>()

function readInputValue(event: Event) {
  return event.target instanceof HTMLInputElement ? event.target.value : ''
}
</script>

<template>
  <section class="gateway-panel gateway-panel--usage">
    <div class="gateway-panel__head">
      <div>
        <div class="gateway-panel__title">时间段消耗</div>
      </div>
      <a-space class="gateway-usage-range-controls" wrap>
        <input
          :value="usageRange.start"
          class="gateway-usage-input"
          type="datetime-local"
          aria-label="用量开始时间"
          @input="emit('update:start', readInputValue($event))"
        />
        <span class="gateway-usage-card__sep">至</span>
        <input
          :value="usageRange.end"
          class="gateway-usage-input"
          type="datetime-local"
          aria-label="用量结束时间"
          @input="emit('update:end', readInputValue($event))"
        />
        <a-button @click="emit('today')">今日</a-button>
        <a-button type="primary" :loading="loading" @click="emit('query')">查询</a-button>
      </a-space>
    </div>
    <div v-if="summaryCards.length" class="gateway-usage-summary">
      <div
        v-for="item in summaryCards"
        :key="item.title"
        class="gateway-usage-summary__item"
        :class="`gateway-usage-summary__item--${item.tone}`"
      >
        <span>{{ item.title }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>
    <a-table
      class="gateway-usage-table"
      :columns="columns"
      :data-source="usage?.routes ?? []"
      :pagination="{ pageSize: 6, showSizeChanger: false }"
      :row-key="rowKey"
      size="small"
      :loading="loading"
      :scroll="{ x: 1210 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'route'">
          <div class="table-cell-compact">
            <div class="table-cell-compact__head">
              <strong class="table-cell-compact__title">{{ usageRouteLabel(record as GatewayUsageRoute) }}</strong>
              <a-tooltip placement="right" :title="usageRouteMeta(record as GatewayUsageRoute)">
                <InfoCircleOutlined class="table-info-icon" aria-hidden="true" />
              </a-tooltip>
            </div>
          </div>
        </template>
        <template v-else-if="column.key === 'requests'">
          {{ formatNumber((record as GatewayUsageRoute).request_count) }}
        </template>
        <template v-else-if="column.key === 'success_rate'">
          {{ (record as GatewayUsageRoute).success_rate }}%
        </template>
        <template v-else-if="column.key === 'stream'">
          {{ formatNumber((record as GatewayUsageRoute).stream_request_count) }}
        </template>
        <template v-else-if="column.key === 'prompt_tokens'">
          {{ formatNumber((record as GatewayUsageRoute).prompt_tokens) }}
        </template>
        <template v-else-if="column.key === 'cached_input_tokens'">
          {{ formatNumber((record as GatewayUsageRoute).cached_input_tokens) }}
        </template>
        <template v-else-if="column.key === 'completion_tokens'">
          {{ formatNumber((record as GatewayUsageRoute).completion_tokens) }}
        </template>
        <template v-else-if="column.key === 'total_tokens'">
          <strong>{{ formatNumber((record as GatewayUsageRoute).total_tokens) }}</strong>
        </template>
        <template v-else-if="column.key === 'computed_total_cost'">
          <a-tooltip :title="`输入 ${formatUSD((record as GatewayUsageRoute).computed_input_cost)} / 缓存 ${formatUSD((record as GatewayUsageRoute).computed_cached_cost)} / 输出 ${formatUSD((record as GatewayUsageRoute).computed_output_cost)}`">
            <strong>{{ formatUSD((record as GatewayUsageRoute).computed_total_cost) }}</strong>
          </a-tooltip>
        </template>
        <template v-else-if="column.key === 'avg_latency'">
          {{ (record as GatewayUsageRoute).avg_latency_ms !== null ? `${(record as GatewayUsageRoute).avg_latency_ms} ms` : '暂无' }}
        </template>
        <template v-else-if="column.key === 'last_used_at'">
          {{ formatTime((record as GatewayUsageRoute).last_used_at) }}
        </template>
      </template>
    </a-table>
  </section>
</template>
