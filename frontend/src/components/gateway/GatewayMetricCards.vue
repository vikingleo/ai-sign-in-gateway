<script setup lang="ts">
import type { MetricTone } from '../../gatewayViewModel'

type GatewayMetricCard = {
  title: string
  value: string | number
  tone: MetricTone
}

defineProps<{
  cards: GatewayMetricCard[]
}>()
</script>

<template>
  <div class="gateway-metrics">
    <a-card
      v-for="item in cards"
      :key="item.title"
      :bordered="false"
      class="admin-card gateway-metric-card"
      :class="`gateway-metric-card--${item.tone}`"
    >
      <div class="gateway-metric-card__label">{{ item.title }}</div>
      <div class="gateway-metric-card__value">{{ item.value }}</div>
    </a-card>
  </div>
</template>
