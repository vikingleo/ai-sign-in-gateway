<script setup lang="ts">
import type { GatewayRoute } from '../../types'

defineProps<{
  route: GatewayRoute
  balanceClass: (balance: number | null | undefined) => string
}>()
</script>

<template>
  <span :class="balanceClass(route.last_balance)">
    {{ route.balance_display || '暂无' }}
  </span>
</template>
