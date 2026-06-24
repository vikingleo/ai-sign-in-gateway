<script setup lang="ts">
import { CheckOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import type { QueueTask } from '../../types'

const open = defineModel<boolean>('open', { required: true })

defineProps<{
  siteName: string
  tasks: QueueTask[]
  loading: boolean
  activatingTaskKey: string
  rowKey: (record: QueueTask) => string
}>()

const emit = defineEmits<{
  refresh: []
  activate: [task: QueueTask]
}>()

function taskStatusColor(status: string) {
  switch (status) {
    case 'done':
      return 'success'
    case 'failed':
      return 'error'
    default:
      return 'processing'
  }
}

function taskStatusLabel(status: string) {
  switch (status) {
    case 'done':
      return '已完成'
    case 'failed':
      return '失败'
    default:
      return '待处理'
  }
}

function emitActivate(record: unknown) {
  emit('activate', record as QueueTask)
}
</script>

<template>
  <a-modal
    v-model:open="open"
    :title="`队列任务 - ${siteName || '站点'}`"
    width="820px"
    :footer="null"
    destroy-on-close
  >
    <div class="queue-dialog">
      <div class="queue-dialog__toolbar">
        <a-button :loading="loading" @click="emit('refresh')">
          <template #icon>
            <ReloadOutlined aria-hidden="true" />
          </template>
          刷新
        </a-button>
      </div>
      <a-table
        :columns="[
          { title: '任务', key: 'task', dataIndex: 'title' },
          { title: '状态', key: 'status', width: 96 },
          { title: '更新时间', key: 'updated_at', dataIndex: 'updated_at', width: 180 },
          { title: '操作', key: 'actions', width: 120 },
        ]"
        :data-source="tasks"
        :loading="loading"
        :pagination="{ pageSize: 8 }"
        :row-key="rowKey"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'task'">
            <div class="queue-dialog__task">
              <strong>{{ record.title || record.task_key }}</strong>
              <span>{{ record.detail || record.last_message || '-' }}</span>
              <span v-if="record.last_error" class="queue-dialog__error">{{ record.last_error }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="taskStatusColor(record.status)">
              {{ taskStatusLabel(record.status) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'updated_at'">
            <span>{{ record.updated_at || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button
              size="small"
              :disabled="record.status === 'done'"
              :loading="activatingTaskKey === record.task_key"
              @click="emitActivate(record)"
            >
              <template #icon>
                <CheckOutlined aria-hidden="true" />
              </template>
              完成
            </a-button>
          </template>
        </template>
      </a-table>
      <a-empty v-if="!loading && !tasks.length" description="暂无队列任务" />
    </div>
  </a-modal>
</template>
