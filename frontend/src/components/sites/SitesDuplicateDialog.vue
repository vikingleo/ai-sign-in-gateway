<script setup lang="ts">
import type { TableColumnsType } from 'ant-design-vue'
import type { DuplicateSiteGroup } from '../../types'

const open = defineModel<boolean>('open', { required: true })
const search = defineModel<string>('search', { required: true })

defineProps<{
  checked: boolean
  groups: DuplicateSiteGroup[]
  loading: boolean
  merging: boolean
  columns: TableColumnsType
  pageSize: number
  tableY: number
  rowKey: (record: unknown) => string
  suggestedSiteName: (record: unknown) => string
}>()

const emit = defineEmits<{
  merge: []
}>()
</script>

<template>
  <a-modal
    v-model:open="open"
    title="清理检测"
    width="1080px"
  >
    <a-alert
      v-if="checked && !groups.length"
      type="success"
      show-icon
      message="未发现需要合并的重复站点。"
      style="margin-bottom: 12px"
    />
    <a-input
      v-model:value="search"
      allow-clear
      placeholder="搜索基础 URL / 账号 / 站点名"
      style="margin-bottom: 12px"
      aria-label="搜索重复站点"
    />
    <div class="table-fill table-fill--management table-fill--modal">
      <a-table
        :columns="columns"
        :data-source="groups"
        :loading="loading"
        :pagination="{ pageSize }"
        :row-key="rowKey"
        size="small"
        :scroll="{ x: 1040, y: tableY }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'password'">
            <a-tag :color="record.password_present ? 'processing' : 'default'">
              {{ record.password_present ? '已填写' : '留空' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'suggested'">
            <div class="result-block">
              <span>ID {{ record.suggested_keep_id }}</span>
              <span>{{ suggestedSiteName(record) }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'sites'">
            <div class="tag-list">
              <a-tag
                v-for="site in record.sites"
                :key="site.id"
                :color="site.suggested_keep ? 'processing' : 'default'"
              >
                {{ site.suggested_keep ? `保留 ${site.name}#${site.id}` : `${site.name}#${site.id}` }}
              </a-tag>
            </div>
          </template>
        </template>
      </a-table>
    </div>
    <template #footer>
      <a-space>
        <a-button @click="open = false">关闭</a-button>
        <a-button type="primary" :loading="merging" @click="emit('merge')">
          按建议合并
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>
