<script setup lang="ts">
import { formatGroupNames } from '../../format'
import {
  formatLatency,
  latencyClass,
  loadRouteLabel,
  primaryLatency,
  routeTypeLabel,
} from '../../gatewayRouteDisplayModel'
import type { GatewayRoute } from '../../types'

type GatewayRoutePoolStatusCard = {
  key: string
  label: string
  value: number
  tone: 'success' | 'warning' | 'danger' | 'neutral'
  ratio: number
}

defineProps<{
  statusCards: GatewayRoutePoolStatusCard[]
  previewRoutes: GatewayRoute[]
  routeConcurrencyLimitLabel: string
}>()
</script>

<template>
  <section class="gateway-panel gateway-panel--route-status">
    <div class="gateway-panel__head">
      <div>
        <div class="gateway-panel__title">路由池状态</div>
      </div>
    </div>
    <div class="route-pool-status">
      <div
        v-for="item in statusCards"
        :key="item.key"
        class="route-pool-status__card"
        :class="`route-pool-status__card--${item.tone}`"
      >
        <div class="route-pool-status__head">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
        <div class="route-pool-status__bar">
          <span :style="{ width: `${Math.max(8, item.ratio * 100)}%` }" />
        </div>
      </div>
    </div>

    <div class="route-pool-preview">
      <div
        v-for="route in previewRoutes"
        :key="route.id"
        class="route-pool-preview__row"
      >
        <div class="route-pool-preview__main">
          <strong>{{ loadRouteLabel(route) }}</strong>
          <span>{{ formatGroupNames(route.group_name) || '未分组' }} / {{ routeTypeLabel(route.route_type) }}</span>
        </div>
        <div class="route-pool-preview__meta">
          <span :class="latencyClass(primaryLatency(route))">
            <span class="gateway-latency__dot"></span>
            <span class="gateway-latency__value">{{ formatLatency(primaryLatency(route)) }}</span>
          </span>
          <span :class="['gateway-concurrency', { 'gateway-concurrency--active': route.active_concurrency > 0 }]">
            <span class="gateway-concurrency__current">{{ route.active_concurrency }}</span>
            <span class="gateway-concurrency__separator">/</span>
            <span class="gateway-concurrency__limit">{{ routeConcurrencyLimitLabel }}</span>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
