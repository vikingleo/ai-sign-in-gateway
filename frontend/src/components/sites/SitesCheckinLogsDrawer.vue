<script setup lang="ts">
import type { TableColumnsType } from 'ant-design-vue'
import StatusPill from '../StatusPill.vue'
import type { CheckinRun } from '../../types'

const open = defineModel<boolean>('open', { required: true })
const search = defineModel<string>('search', { required: true })

defineProps<{
  runs: CheckinRun[]
  columns: TableColumnsType
  pageSize: number
  tableY: number
  formatRunTime: (value: string) => string
}>()

function asRun(record: unknown): CheckinRun {
  return record as CheckinRun
}
</script>

<template>
  <a-drawer
    v-model:open="open"
    title="最近执行"
    width="min(1040px, 100vw)"
    placement="right"
  >
    <a-input
      v-model:value="search"
      allow-clear
      placeholder="搜索站点 / 结果 / 触发方式 / 消息"
      style="margin-bottom: 12px"
      aria-label="搜索签到日志"
    />
    <div class="table-fill table-fill--management table-fill--drawer">
      <a-table
        :columns="columns"
        :data-source="runs"
        :pagination="{ pageSize }"
        :row-key="(record: CheckinRun) => record.id"
        size="middle"
        :scroll="{ x: 880, y: tableY }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'site'">
            {{ asRun(record).site_name ?? '未知站点' }}
          </template>
          <template v-else-if="column.key === 'status'">
            <StatusPill :value="asRun(record).status" />
          </template>
          <template v-else-if="column.key === 'trigger_type'">
            {{ asRun(record).trigger_type }}
          </template>
          <template v-else-if="column.key === 'message'">
            {{ asRun(record).message }}
          </template>
          <template v-else-if="column.key === 'started_at'">
            {{ formatRunTime(asRun(record).started_at) }}
          </template>
        </template>
      </a-table>
    </div>
  </a-drawer>
</template>
