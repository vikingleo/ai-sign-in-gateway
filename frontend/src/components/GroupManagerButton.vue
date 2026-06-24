<script setup lang="ts">
import { computed, ref } from 'vue'
import { createSiteGroup, deleteSiteGroup, getSiteGroups, renameSiteGroup } from '../api'
import { useToast } from '../toast'
import type { SiteGroup } from '../types'

const toast = useToast()
const open = ref(false)
const loading = ref(false)
const groups = ref<SiteGroup[]>([])
const newName = ref('')
const editingName = ref<string | null>(null)
const editingDraft = ref('')

const sortedGroups = computed(() =>
  [...groups.value].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
)

function rowKey(record: SiteGroup) {
  return record.name
}

function emitChanged() {
  window.dispatchEvent(new CustomEvent('site-groups:changed'))
}

async function loadGroups() {
  loading.value = true
  try {
    groups.value = await getSiteGroups()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '分组加载失败')
  } finally {
    loading.value = false
  }
}

async function openManager() {
  open.value = true
  newName.value = ''
  editingName.value = null
  editingDraft.value = ''
  await loadGroups()
}

function startRename(name: string) {
  editingName.value = name
  editingDraft.value = name
}

function cancelRename() {
  editingName.value = null
  editingDraft.value = ''
}

async function handleCreate() {
  if (!newName.value.trim()) {
    toast.error('请先输入分组名称。')
    return
  }
  loading.value = true
  try {
    await createSiteGroup(newName.value)
    newName.value = ''
    await loadGroups()
    emitChanged()
    toast.success('分组已创建。')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '分组创建失败')
  } finally {
    loading.value = false
  }
}

async function handleRename() {
  if (!editingName.value || !editingDraft.value.trim()) {
    toast.error('分组名称不能为空。')
    return
  }
  loading.value = true
  try {
    await renameSiteGroup(editingName.value, editingDraft.value)
    cancelRename()
    await loadGroups()
    emitChanged()
    toast.success('分组已更新。')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '分组更新失败')
  } finally {
    loading.value = false
  }
}

async function handleDelete(name: string) {
  if (!window.confirm(`确认删除分组“${name}”吗？站点和路由上的该分组标签也会移除。`)) {
    return
  }
  loading.value = true
  try {
    await deleteSiteGroup(name)
    await loadGroups()
    emitChanged()
    toast.success('分组已删除。')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '分组删除失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <a-button @click="openManager">分组管理</a-button>

  <a-modal
    v-model:open="open"
    title="分组管理"
    width="760px"
    :footer="null"
  >
    <a-space direction="vertical" style="width: 100%">
      <div class="result-block">
        <strong>新增分组</strong>
        <a-space-compact style="width: 100%">
          <a-input
            v-model:value="newName"
            placeholder="输入新的分组名称"
            autocomplete="off"
            aria-label="新增分组名称"
            @press-enter="handleCreate"
          />
          <a-button type="primary" :loading="loading" @click="handleCreate">新增</a-button>
        </a-space-compact>
      </div>

      <a-table
        :data-source="sortedGroups"
        :pagination="false"
        size="small"
        :row-key="rowKey"
        :loading="loading"
        :scroll="{ x: 680, y: 420 }"
      >
        <a-table-column title="分组名" key="name" :width="300">
          <template #default="{ record }">
            <a-space v-if="editingName === record.name" style="width: 100%">
              <a-input
                v-model:value="editingDraft"
                size="small"
                autocomplete="off"
                aria-label="编辑分组名称"
                @press-enter="handleRename"
              />
              <a-button size="small" type="primary" :loading="loading" @click="handleRename">保存</a-button>
              <a-button size="small" @click="cancelRename">取消</a-button>
            </a-space>
            <strong v-else>{{ record.name }}</strong>
          </template>
        </a-table-column>
        <a-table-column title="站点数" key="site_count" :width="120">
          <template #default="{ record }">
            {{ record.site_count }}
          </template>
        </a-table-column>
        <a-table-column title="状态" key="status" :width="140">
          <template #default="{ record }">
            <a-tag :color="record.in_use ? 'processing' : 'default'">
              {{ record.in_use ? '使用中' : '未使用' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" key="actions" :width="160">
          <template #default="{ record }">
            <a-space size="small">
              <a-button
                v-if="editingName !== record.name"
                size="small"
                @click="startRename(record.name)"
              >
                重命名
              </a-button>
              <a-button size="small" danger :loading="loading" @click="handleDelete(record.name)">
                删除
              </a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-space>
  </a-modal>
</template>
