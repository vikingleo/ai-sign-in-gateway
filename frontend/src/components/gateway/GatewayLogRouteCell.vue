<script setup lang="ts">
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import type { GatewayLog } from '../../types'

defineProps<{
  log: GatewayLog
  logRouteLabel: (log: GatewayLog) => string
  logRouteMeta: (log: GatewayLog) => string
}>()
</script>

<template>
  <div class="table-cell-compact">
    <div class="table-cell-compact__head">
      <strong class="table-cell-compact__title">{{ logRouteLabel(log) }}</strong>
      <a-tooltip placement="right" :title="logRouteMeta(log)">
        <InfoCircleOutlined class="table-info-icon" aria-hidden="true" />
      </a-tooltip>
    </div>
  </div>
</template>
