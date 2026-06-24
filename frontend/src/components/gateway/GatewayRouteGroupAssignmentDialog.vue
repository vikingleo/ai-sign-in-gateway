<script setup lang="ts">
import type { GatewayRoute, GatewayRouteGroup } from '../../types'

type SelectOption = {
  label: string
  value: number
}

const open = defineModel<boolean>('open', { required: true })
const groupIds = defineModel<number[]>('groupIds', { required: true })

defineProps<{
  route: GatewayRoute | null
  groups: GatewayRouteGroup[]
  loading: boolean
  loadRouteLabel: (route: GatewayRoute) => string
}>()

const emit = defineEmits<{
  save: []
}>()

function groupOptions(groups: GatewayRouteGroup[]): SelectOption[] {
  return groups
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN') || a.id - b.id)
    .map((group) => ({
      label: `${group.name} (${group.route_count})`,
      value: group.id,
    }))
}
</script>

<template>
  <a-modal
    v-model:open="open"
    title="路由分组"
    ok-text="保存"
    cancel-text="取消"
    :confirm-loading="loading"
    @ok="emit('save')"
  >
    <a-form layout="vertical">
      <a-form-item label="路由">
        <strong>{{ route ? loadRouteLabel(route) : '未选择' }}</strong>
      </a-form-item>
      <a-form-item label="分组">
        <a-select
          v-model:value="groupIds"
          mode="multiple"
          :options="groupOptions(groups)"
          :max-tag-count="4"
          placeholder="选择路由分组"
          aria-label="选择路由分组"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
