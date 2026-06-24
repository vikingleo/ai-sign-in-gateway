<script setup lang="ts">
import type { GatewayRouteDiagnosis, GatewayRouteDiagnosticItem } from '../../types'

const open = defineModel<boolean>('open', { required: true })

type GatewayRouteDiagnosisView = Pick<GatewayRouteDiagnosis, 'route_label' | 'healthy' | 'active_count' | 'checked_at' | 'diagnostics'>

defineProps<{
  diagnosis: GatewayRouteDiagnosisView | null
  loading: boolean
  formatTime: (value: string | null) => string
}>()

function diagnosisSeverityColor(severity: GatewayRouteDiagnosticItem['severity']) {
  if (severity === 'ok') return 'success'
  if (severity === 'warning') return 'warning'
  return 'error'
}

function diagnosisSeverityLabel(severity: GatewayRouteDiagnosticItem['severity']) {
  if (severity === 'ok') return '正常'
  if (severity === 'warning') return '注意'
  return '异常'
}
</script>

<template>
  <a-drawer
    v-model:open="open"
    :title="`路由诊断 - ${diagnosis?.route_label || ''}`"
    width="520px"
    placement="right"
  >
    <a-spin :spinning="loading">
      <div v-if="diagnosis" class="route-diagnosis">
        <a-alert
          :type="diagnosis.healthy ? 'success' : 'error'"
          show-icon
          :message="diagnosis.healthy ? '路由关键检查通过' : '路由存在阻断项'"
          :description="`当前并发 ${diagnosis.active_count}，检查时间 ${formatTime(diagnosis.checked_at)}`"
        />
        <div class="route-diagnosis__list">
          <div
            v-for="item in diagnosis.diagnostics"
            :key="item.label"
            class="route-diagnosis__item"
            :class="`route-diagnosis__item--${item.severity}`"
          >
            <div class="route-diagnosis__head">
              <strong>{{ item.label }}</strong>
              <a-tag :color="diagnosisSeverityColor(item.severity)">
                {{ diagnosisSeverityLabel(item.severity) }}
              </a-tag>
            </div>
            <div class="route-diagnosis__message">{{ item.message }}</div>
            <div class="route-diagnosis__detail">{{ item.detail }}</div>
          </div>
        </div>
      </div>
    </a-spin>
  </a-drawer>
</template>
