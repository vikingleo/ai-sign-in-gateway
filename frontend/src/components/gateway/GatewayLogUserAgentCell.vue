<script setup lang="ts">
import type { GatewayLog } from '../../types'

defineProps<{
  log: GatewayLog
  logUserAgent: (log: GatewayLog) => string
}>()
</script>

<template>
  <a-tooltip v-if="logUserAgent(log)" placement="topLeft" :title="logUserAgent(log)">
    <span class="table-ellipsis gateway-log-user-agent">{{ logUserAgent(log) }}</span>
  </a-tooltip>
  <span v-else>暂无</span>
</template>
