<script setup lang="ts">
import { computed } from 'vue'
import type { GatewayRoute } from '../../types'

const props = defineProps<{
  route: GatewayRoute
  mode: 'group' | 'priority' | 'weight' | 'successRate'
  formatGroupNames: (value: string | string[] | null | undefined) => string
  valueClass?: string
}>()

const displayText = computed(() => {
  if (props.mode === 'group') {
    return props.formatGroupNames(props.route.group_name) || '未分组'
  }
  if (props.mode === 'priority') {
    return String(props.route.route_priority)
  }
  if (props.mode === 'weight') {
    return String(props.route.weight)
  }
  return props.route.success_rate != null ? `${props.route.success_rate}%` : '暂无'
})
</script>

<template>
  <span :class="valueClass">{{ displayText }}</span>
</template>
