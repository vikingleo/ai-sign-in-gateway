<script setup lang="ts">
import type { MetricTone } from '../../gatewayViewModel'

type GatewayStrategyCard = {
  key: string
  title: string
  value: string
  width: string
  tone: MetricTone
}

defineProps<{
  cards: GatewayStrategyCard[]
}>()
</script>

<template>
  <section class="gateway-panel gateway-panel--strategy">
    <div class="gateway-panel__head">
      <div>
        <div class="gateway-panel__title">策略分布</div>
      </div>
    </div>
    <div class="gateway-strategy-board">
      <div
        v-for="item in cards"
        :key="item.key"
        class="gateway-strategy-board__item"
        :class="`gateway-strategy-board__item--${item.tone}`"
      >
        <div class="gateway-strategy-board__summary">
          <span>{{ item.title }}</span>
          <strong>{{ item.value }}</strong>
        </div>
        <div class="gateway-strategy-board__track">
          <span :style="{ width: item.width }" />
        </div>
      </div>
      <a-empty v-if="!cards.length" description="暂无策略统计数据" />
    </div>
  </section>
</template>
