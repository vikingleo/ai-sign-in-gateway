<script setup lang="ts">
import { computed } from 'vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { GatewayErrorDetail, GatewayErrorDetailLine } from '../../gatewayActivityDisplayModel'
import type { GatewayLog } from '../../types'
import GatewayLogLatencyCell from './GatewayLogLatencyCell.vue'
import GatewayLogModelCell from './GatewayLogModelCell.vue'
import GatewayLogRequestCell from './GatewayLogRequestCell.vue'
import GatewayLogRouteCell from './GatewayLogRouteCell.vue'
import GatewayLogStatusCell from './GatewayLogStatusCell.vue'
import GatewayLogTransferCell from './GatewayLogTransferCell.vue'
import GatewayLogUserAgentCell from './GatewayLogUserAgentCell.vue'

const open = defineModel<boolean>('open', { required: true })
const search = defineModel<string>('search', { required: true })

const props = withDefaults(defineProps<{
  title: string
  placeholder: string
  columns: ColumnsType<GatewayLog>
  logs: GatewayLog[]
  loading?: boolean
  pageSize: number
  drawerTableY: number
  rowKey: (record: GatewayLog) => string | number
  formatTime: (value: string | null) => string
  requestMethodColor: (method: string) => string
  logMethodLabel: (log: GatewayLog) => string
  logRequestLabel: (log: GatewayLog) => string
  logRequestURL: (log: GatewayLog) => string
  logRouteLabel: (log: GatewayLog) => string
  logRouteMeta: (log: GatewayLog) => string
  logTransferLines: (log: GatewayLog) => GatewayErrorDetailLine[]
  gatewayLogHasErrorDetail: (log: GatewayLog) => boolean
  logModelMeta: (log: GatewayLog) => string
  logUserAgent: (log: GatewayLog) => string
  buildLogErrorDetail: (log: GatewayLog) => GatewayErrorDetail
}>(), {
  loading: false,
})

const emit = defineEmits<{
  (event: 'open-error-detail', detail: GatewayErrorDetail): void
}>()

function asLog(record: unknown) {
  return record as GatewayLog
}

function logMatchesSearch(log: GatewayLog, keyword: string) {
  return [
    props.logMethodLabel(log),
    props.logRequestLabel(log),
    props.logRequestURL(log),
    props.logRouteLabel(log),
    props.logRouteMeta(log),
    props.logModelMeta(log),
    props.logUserAgent(log),
    log.site_name,
    log.model,
    log.requested_model,
    log.actual_model,
    log.route_id,
    log.route_label,
    log.key_name,
    log.key_fingerprint,
    log.site_id,
    log.target_path,
    log.request_url,
    log.user_agent,
    log.method,
    log.failure_reason,
    log.route_strategy,
  ].some((value) => String(value ?? '').toLowerCase().includes(keyword))
}

const filteredLogs = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  if (!keyword) {
    return props.logs
  }
  return props.logs.filter((log) => logMatchesSearch(log, keyword))
})
</script>

<template>
  <a-drawer
    v-model:open="open"
    :title="title"
    width="min(1280px, 100vw)"
    placement="right"
  >
    <a-input
      v-model:value="search"
      allow-clear
      :placeholder="placeholder"
      style="margin-bottom: 12px"
      aria-label="搜索网关请求日志"
    />
    <div class="table-fill table-fill--management table-fill--drawer">
      <a-table
        :columns="columns"
        :data-source="filteredLogs"
        :loading="loading"
        :pagination="{ pageSize }"
        :row-key="rowKey"
        size="small"
        :scroll="{ x: 1600, y: drawerTableY }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'created_at'">
            {{ formatTime(asLog(record).created_at) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <GatewayLogStatusCell :log="asLog(record)" />
          </template>
          <template v-else-if="column.key === 'request'">
            <GatewayLogRequestCell
              :log="asLog(record)"
              :request-method-color="requestMethodColor"
              :log-method-label="logMethodLabel"
              :log-request-label="logRequestLabel"
              :log-request-u-r-l="logRequestURL"
            />
          </template>
          <template v-else-if="column.key === 'route'">
            <GatewayLogRouteCell :log="asLog(record)" :log-route-label="logRouteLabel" :log-route-meta="logRouteMeta" />
          </template>
          <template v-else-if="column.key === 'transfer'">
            <GatewayLogTransferCell
              :log="asLog(record)"
              :log-transfer-lines="logTransferLines"
              :gateway-log-has-error-detail="gatewayLogHasErrorDetail"
              :build-log-error-detail="buildLogErrorDetail"
              @open-error-detail="emit('open-error-detail', $event)"
            />
          </template>
          <template v-else-if="column.key === 'model'">
            <GatewayLogModelCell :log="asLog(record)" :log-model-meta="logModelMeta" />
          </template>
          <template v-else-if="column.key === 'user_agent'">
            <GatewayLogUserAgentCell :log="asLog(record)" :log-user-agent="logUserAgent" />
          </template>
          <template v-else-if="column.key === 'latency'">
            <GatewayLogLatencyCell :log="asLog(record)" />
          </template>
          <template v-else-if="column.key === 'attempt'">
            {{ asLog(record).attempt_index }}
          </template>
        </template>
      </a-table>
    </div>
  </a-drawer>
</template>
