<script setup lang="ts">
import type { GatewayRoute } from '../../types'

defineProps<{
  route: GatewayRoute
  primaryLatency: (route: GatewayRoute) => number | null
  latencyClass: (latencyMs: number | null | undefined) => string
  formatLatency: (latencyMs: number | null | undefined) => string
  routeLatencyDetails: (route: GatewayRoute) => string[]
}>()
</script>

<template>
  <a-tooltip v-if="routeLatencyDetails(route).length" placement="topLeft">
    <template #title>
      <div class="tooltip-detail-list">
        <div v-for="item in routeLatencyDetails(route)" :key="item">
          <span>{{ item }}</span>
        </div>
      </div>
    </template>
    <div class="participation-cell">
      <span :class="latencyClass(primaryLatency(route))">
        <span class="gateway-latency__dot"></span>
        <span class="gateway-latency__value">{{ formatLatency(primaryLatency(route)) }}</span>
      </span>
    </div>
  </a-tooltip>
  <div v-else class="participation-cell">
    <span :class="latencyClass(primaryLatency(route))">
      <span class="gateway-latency__dot"></span>
      <span class="gateway-latency__value">{{ formatLatency(primaryLatency(route)) }}</span>
    </span>
  </div>
</template>
