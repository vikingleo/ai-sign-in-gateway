<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { GatewayRouteGroup } from '../../types'

type RouteGroupForm = {
  name: string
  apiKey: string
  clearApiKey?: boolean
}

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  groups: GatewayRouteGroup[]
  loading: boolean
}>()

const emit = defineEmits<{
  refresh: []
  create: [payload: RouteGroupForm]
  update: [group: GatewayRouteGroup, payload: RouteGroupForm]
  delete: [group: GatewayRouteGroup]
}>()

const newGroup = reactive<RouteGroupForm>({ name: '', apiKey: '' })
const newGroupError = ref('')
const editingId = ref<number | null>(null)
const editingDraft = reactive<RouteGroupForm>({ name: '', apiKey: '', clearApiKey: false })

const sortedGroups = computed(() =>
  [...props.groups].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN') || a.id - b.id),
)

function rowKey(record: GatewayRouteGroup) {
  return record.id
}

function resetNewGroup() {
  newGroup.name = ''
  newGroup.apiKey = ''
  newGroupError.value = ''
}

function handleCreate() {
  const name = newGroup.name.trim()
  if (!name) {
    newGroupError.value = '请输入分组名称'
    return
  }
  emit('create', { name, apiKey: newGroup.apiKey.trim() })
  resetNewGroup()
}

function startEdit(group: GatewayRouteGroup) {
  editingId.value = group.id
  editingDraft.name = group.name
  editingDraft.apiKey = ''
  editingDraft.clearApiKey = false
}

function cancelEdit() {
  editingId.value = null
  editingDraft.name = ''
  editingDraft.apiKey = ''
  editingDraft.clearApiKey = false
}

function handleUpdate(group: GatewayRouteGroup) {
  emit('update', group, { ...editingDraft })
  cancelEdit()
}
</script>

<template>
  <a-modal
    v-model:open="open"
    title="路由分组"
    width="820px"
    :footer="null"
    @after-open-change="(visible: boolean) => visible && emit('refresh')"
  >
    <a-space direction="vertical" style="width: 100%">
      <div class="result-block">
        <strong>新增路由分组</strong>
        <a-row :gutter="8">
          <a-col :xs="24" :md="9">
            <a-input
              v-model:value="newGroup.name"
              placeholder="分组名称"
              autocomplete="off"
              aria-label="新增路由分组名称"
              :status="newGroupError ? 'error' : undefined"
              @change="newGroupError = ''"
              @press-enter="handleCreate"
            />
          </a-col>
          <a-col :xs="24" :md="11">
            <a-input-password
              v-model:value="newGroup.apiKey"
              placeholder="分组 API Key，可留空"
              autocomplete="off"
              aria-label="新增路由分组 API Key"
              @press-enter="handleCreate"
            />
          </a-col>
          <a-col :xs="24" :md="4">
            <a-button block type="primary" :loading="loading" @click="handleCreate">新增</a-button>
          </a-col>
        </a-row>
        <a-typography-text v-if="newGroupError" type="danger">{{ newGroupError }}</a-typography-text>
      </div>

      <a-table
        :data-source="sortedGroups"
        :pagination="false"
        size="small"
        :row-key="rowKey"
        :loading="loading"
        :scroll="{ x: 760, y: 420 }"
      >
        <a-table-column title="分组名" key="name" :width="220">
          <template #default="{ record }">
            <a-input
              v-if="editingId === record.id"
              v-model:value="editingDraft.name"
              size="small"
              autocomplete="off"
              aria-label="编辑路由分组名称"
              @press-enter="handleUpdate(record)"
            />
            <strong v-else>{{ record.name }}</strong>
          </template>
        </a-table-column>
        <a-table-column title="API Key" key="api_key" :width="220">
          <template #default="{ record }">
            <a-input-password
              v-if="editingId === record.id"
              v-model:value="editingDraft.apiKey"
              size="small"
              autocomplete="off"
              :disabled="editingDraft.clearApiKey"
              :placeholder="record.has_api_key ? '留空保留现有 API Key' : '设置分组 API Key，可留空'"
              aria-label="编辑路由分组 API Key"
              @press-enter="handleUpdate(record)"
            />
            <a-tag v-else :color="record.has_api_key ? 'processing' : 'default'">
              {{ record.has_api_key ? '已设置' : '未设置' }}
            </a-tag>
            <a-checkbox
              v-if="editingId === record.id && record.has_api_key"
              v-model:checked="editingDraft.clearApiKey"
              :disabled="Boolean(editingDraft.apiKey.trim())"
            >
              清空现有 Key
            </a-checkbox>
          </template>
        </a-table-column>
        <a-table-column title="路由数" key="route_count" :width="100">
          <template #default="{ record }">
            {{ record.route_count }}
          </template>
        </a-table-column>
        <a-table-column title="操作" key="actions" :width="220">
          <template #default="{ record }">
            <a-space size="small">
              <template v-if="editingId === record.id">
                <a-button size="small" type="primary" :loading="loading" @click="handleUpdate(record)">保存</a-button>
                <a-button size="small" @click="cancelEdit">取消</a-button>
              </template>
              <template v-else>
                <a-button size="small" @click="startEdit(record)">编辑</a-button>
                <a-button size="small" danger :loading="loading" @click="emit('delete', record)">删除</a-button>
              </template>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-space>
  </a-modal>
</template>
