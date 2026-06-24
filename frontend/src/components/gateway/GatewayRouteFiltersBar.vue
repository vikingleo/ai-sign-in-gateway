<script setup lang="ts">
import {
  issueStateOptions,
  routeTypeFilterOptions,
  type GatewayIssueState,
} from '../../gatewayViewConfig'
import type { GatewayRoute } from '../../types'

type SelectOption<T extends string = string> = {
  label: string
  value: T
}

defineProps<{
  routeSearch: string
  selectedGroups: string[]
  selectedRouteTypes: Array<GatewayRoute['route_type']>
  selectedIssueStates: GatewayIssueState[]
  includeDisabled: boolean
  groupOptions: SelectOption[]
  activeRouteFilterCount: number
  isRouteTypeFilterActive: (routeType: GatewayRoute['route_type']) => boolean
}>()

const emit = defineEmits<{
  (event: 'update:routeSearch', value: string): void
  (event: 'update:selectedGroups', value: string[]): void
  (event: 'update:selectedIssueStates', value: GatewayIssueState[]): void
  (event: 'update:includeDisabled', value: boolean): void
  (event: 'clear-route-types'): void
  (event: 'toggle-route-type', value: GatewayRoute['route_type']): void
  (event: 'clear-filters'): void
  (event: 'include-disabled-change'): void
}>()

function updateIncludeDisabled(value: boolean) {
  emit('update:includeDisabled', value)
  emit('include-disabled-change')
}
</script>

<template>
  <div class="route-pool-filters">
    <div class="route-pool-type-tabs">
      <a-button
        size="small"
        :type="selectedRouteTypes.length === 0 ? 'primary' : 'default'"
        @click="emit('clear-route-types')"
      >
        全部
      </a-button>
      <a-button
        v-for="item in routeTypeFilterOptions"
        :key="item.value"
        size="small"
        :type="isRouteTypeFilterActive(item.value) ? 'primary' : 'default'"
        @click="emit('toggle-route-type', item.value)"
      >
        {{ item.label }}
      </a-button>
    </div>
    <div class="route-pool-searchbar">
      <a-input
        id="route-pool-search"
        :value="routeSearch"
        class="route-pool-filter route-pool-filter--search"
        name="route_pool_search"
        aria-label="搜索路由"
        placeholder="搜索路由 / 域名 / 分组"
        allow-clear
        @update:value="emit('update:routeSearch', String($event ?? ''))"
      />
      <a-select
        :value="selectedGroups"
        class="route-pool-filter route-pool-filter--group"
        aria-label="按分组筛选"
        mode="multiple"
        allow-clear
        :options="groupOptions"
        placeholder="按分组筛选"
        @update:value="emit('update:selectedGroups', $event as string[])"
      />
      <a-select
        :value="selectedIssueStates"
        class="route-pool-filter route-pool-filter--compact"
        aria-label="按异常筛选"
        mode="multiple"
        allow-clear
        :options="issueStateOptions"
        placeholder="按异常"
        @update:value="emit('update:selectedIssueStates', $event as GatewayIssueState[])"
      />
      <div class="route-pool-switch-field">
        <span>停用</span>
        <a-switch
          :checked="includeDisabled"
          class="app-switch app-switch--text route-pool-filter-switch"
          aria-label="包含停用路由"
          checked-children="含"
          un-checked-children="不含"
          @change="updateIncludeDisabled($event as boolean)"
        />
      </div>
      <a-button class="route-pool-clear" size="small" :disabled="!activeRouteFilterCount" @click="emit('clear-filters')">
        清空筛选
      </a-button>
    </div>
  </div>
</template>
