<script setup lang="ts">
import type { GatewayLog } from '../../types'

defineProps<{
  log: GatewayLog
}>()
</script>

<template>
  <a-tooltip :title="log.success ? '请求成功' : (log.failure_reason || '请求失败')">
    <a-tag :color="log.success ? 'success' : 'error'">{{ log.success ? '成功' : '失败' }}</a-tag>
  </a-tooltip>
</template>
