<script setup lang="ts">
import type { GatewayRoute } from '../../types'

defineProps<{
  route: GatewayRoute
  routeConcurrencyLimitLabel: string
}>()
</script>

<template>
  <a-tooltip :title="`当前并发 ${route.active_concurrency} / 最大转移 ${routeConcurrencyLimitLabel}；达到后优先转发，不是硬上限`">
    <span :class="['gateway-concurrency', { 'gateway-concurrency--active': route.active_concurrency > 0 }]">
      <span class="gateway-concurrency__current">{{ route.active_concurrency }}</span>
      <span class="gateway-concurrency__separator">/</span>
      <span class="gateway-concurrency__limit">{{ routeConcurrencyLimitLabel }}</span>
    </span>
  </a-tooltip>
</template>
