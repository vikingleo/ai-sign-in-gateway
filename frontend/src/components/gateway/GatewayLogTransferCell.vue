<script setup lang="ts">
import { EyeOutlined } from '@ant-design/icons-vue'
import type { GatewayErrorDetail, GatewayErrorDetailLine } from '../../gatewayActivityDisplayModel'
import type { GatewayLog } from '../../types'

defineProps<{
  log: GatewayLog
  logTransferLines: (log: GatewayLog) => GatewayErrorDetailLine[]
  gatewayLogHasErrorDetail: (log: GatewayLog) => boolean
  buildLogErrorDetail: (log: GatewayLog) => GatewayErrorDetail
}>()

const emit = defineEmits<{
  (event: 'open-error-detail', detail: GatewayErrorDetail): void
}>()
</script>

<template>
  <div class="gateway-log-transfer-cell">
    <div v-if="logTransferLines(log).length" class="gateway-log-transfer">
      <div
        v-for="line in logTransferLines(log)"
        :key="`${line.label}:${line.value}`"
        class="gateway-log-transfer__line"
      >
        <a-tag
          class="gateway-log-transfer__tag"
          :color="line.tone === 'error' ? 'error' : line.tone === 'success' ? 'success' : 'processing'"
        >
          {{ line.label }}
        </a-tag>
        <a-tooltip :title="line.value" placement="topLeft">
          <span class="table-ellipsis gateway-log-transfer__text">{{ line.value }}</span>
        </a-tooltip>
      </div>
    </div>
    <span v-else class="muted-inline">无转移</span>
    <a-button
      v-if="gatewayLogHasErrorDetail(log)"
      class="gateway-log-transfer__detail"
      type="link"
      size="small"
      title="查看完整错误信息"
      @click="emit('open-error-detail', buildLogErrorDetail(log))"
    >
      <template #icon><EyeOutlined /></template>
      详情
    </a-button>
  </div>
</template>
