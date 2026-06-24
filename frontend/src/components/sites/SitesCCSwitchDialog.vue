<script setup lang="ts">
import type { SelectProps, TableColumnsType } from 'ant-design-vue'
import type { CCSwitchPreviewRow } from '../../sitesViewModel'

const open = defineModel<boolean>('open', { required: true })
const tab = defineModel<'import' | 'export'>('tab', { required: true })
const mode = defineModel<'json' | 'sql'>('mode', { required: true })
const importText = defineModel<string>('importText', { required: true })
const selectedSections = defineModel<string[]>('selectedSections', { required: true })
const search = defineModel<string>('search', { required: true })

defineProps<{
  importLoading: boolean
  exportLoading: boolean
  sqlPreviewLoading: boolean
  okText: string
  fileButtonLabel: string
  importPlaceholder: string
  previewError: string
  previewRows: CCSwitchPreviewRow[]
  filteredPreviewRows: CCSwitchPreviewRow[]
  sectionOptions: SelectProps['options']
  columns: TableColumnsType
  pageSize: number
  tableY: number
  exportText: string
  rowKey: (record: CCSwitchPreviewRow) => string
}>()

const emit = defineEmits<{
  submitImport: []
  openFile: []
  resolveSql: []
  generateExport: []
  downloadExport: []
}>()

function optionKey(value: unknown): string {
  return String(value ?? '')
}
</script>

<template>
  <a-modal
    v-model:open="open"
    title="供应商配置"
    width="820px"
    :confirm-loading="importLoading"
    :ok-text="okText"
    :footer="tab === 'import' ? undefined : null"
    @ok="emit('submitImport')"
  >
    <a-tabs v-model:active-key="tab" :animated="false">
      <a-tab-pane key="import" tab="导入">
        <a-space style="margin-bottom: 12px">
          <a-radio-group v-model:value="mode" button-style="solid" aria-label="导入格式">
            <a-radio-button value="json">JSON</a-radio-button>
            <a-radio-button value="sql">SQL</a-radio-button>
          </a-radio-group>
          <a-button @click="emit('openFile')">{{ fileButtonLabel }}</a-button>
          <a-button
            v-if="mode === 'sql'"
            :loading="sqlPreviewLoading"
            @click="emit('resolveSql')"
          >
            解析 SQL
          </a-button>
        </a-space>
        <a-textarea
          v-model:value="importText"
          :rows="12"
          :placeholder="importPlaceholder"
          aria-label="供应商导入内容"
        />
        <a-alert
          v-if="previewError"
          type="error"
          show-icon
          style="margin-top: 12px"
          :message="previewError"
        />
        <div v-else-if="previewRows.length" class="result-block" style="margin-top: 12px">
          <a-space>
            <a-select
              v-model:value="selectedSections"
              mode="multiple"
              :options="sectionOptions"
              placeholder="选择要导入的供应商分类"
              style="min-width: 260px"
              aria-label="供应商分类"
            />
            <a-input
              v-model:value="search"
              allow-clear
              placeholder="搜索名称 / 站点 / 备注"
              style="width: 240px"
              aria-label="搜索供应商预览"
            />
          </a-space>
          <a-space wrap>
            <a-tag
              v-for="item in sectionOptions"
              :key="optionKey(item.value)"
              :color="selectedSections.includes(String(item.value)) ? 'processing' : 'default'"
            >
              {{ item.label }}
            </a-tag>
            <a-tag color="red">
              缺认证 {{ filteredPreviewRows.filter((item) => !item.hasAuth).length }}
            </a-tag>
            <a-tag>合计 {{ filteredPreviewRows.length }}</a-tag>
          </a-space>
          <div class="table-fill table-fill--management table-fill--modal">
            <a-table
              :columns="columns"
              :data-source="filteredPreviewRows"
              :loading="sqlPreviewLoading"
              :pagination="{ pageSize }"
              :row-key="rowKey"
              size="small"
              :scroll="{ x: 860, y: tableY }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'current'">
                  <a-tag v-if="record.isCurrent" color="processing">默认</a-tag>
                  <span v-else>-</span>
                </template>
                <template v-else-if="column.key === 'name'">
                  <a-space size="small">
                    <a-tag v-if="!record.hasAuth" color="error">缺认证</a-tag>
                    <span>{{ record.name }}</span>
                  </a-space>
                </template>
                <template v-else-if="column.key === 'website'">
                  <span>{{ record.website || '未填写' }}</span>
                </template>
                <template v-else-if="column.key === 'apiKeyStatus'">
                  <a-tag :color="record.hasAuth ? 'green' : 'red'">
                    {{ record.apiKeyStatus }}
                  </a-tag>
                </template>
              </template>
            </a-table>
          </div>
        </div>
      </a-tab-pane>
      <a-tab-pane key="export" tab="导出">
        <a-space style="margin-bottom: 12px">
          <a-button :loading="exportLoading" @click="emit('generateExport')">重新生成</a-button>
          <a-button type="primary" :disabled="!exportText.trim()" @click="emit('downloadExport')">下载 JSON</a-button>
        </a-space>
        <a-textarea
          :value="exportText"
          :rows="20"
          readonly
          placeholder="点击重新生成后显示导出内容"
          aria-label="供应商导出内容"
        />
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>
