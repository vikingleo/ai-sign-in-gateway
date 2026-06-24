<script setup lang="ts">
import type { GatewayLog } from '../../types'

defineProps<{
  log: GatewayLog
  logModelMeta: (log: GatewayLog) => string
}>()
</script>

<template>
  <a-tooltip :title="logModelMeta(log)" placement="topLeft">
    <span class="gateway-log-model-line">{{ logModelMeta(log) }}</span>
  </a-tooltip>
</template>
