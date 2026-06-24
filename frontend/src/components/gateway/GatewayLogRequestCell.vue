<script setup lang="ts">
import type { GatewayLog } from '../../types'

defineProps<{
  log: GatewayLog
  requestMethodColor: (method: string) => string
  logMethodLabel: (log: GatewayLog) => string
  logRequestLabel: (log: GatewayLog) => string
  logRequestURL: (log: GatewayLog) => string
}>()
</script>

<template>
  <div class="gateway-log-request">
    <a-tag class="gateway-log-method" :color="requestMethodColor(log.method)">{{ logMethodLabel(log) }}</a-tag>
    <a-tooltip :title="logRequestLabel(log)" placement="topLeft">
      <span class="table-ellipsis gateway-log-request-url">{{ logRequestURL(log) }}</span>
    </a-tooltip>
  </div>
  <a-tag v-if="log.is_stream" color="processing" class="stream-tag">流式</a-tag>
</template>
