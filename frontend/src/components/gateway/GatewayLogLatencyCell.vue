<script setup lang="ts">
import type { GatewayLog } from '../../types'

defineProps<{
  log: GatewayLog
}>()
</script>

<template>
  {{ log.latency_ms != null ? `${log.latency_ms} ms` : '暂无' }}
</template>
