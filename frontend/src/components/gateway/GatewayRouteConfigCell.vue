<script setup lang="ts">
import type { GatewayRoute } from '../../types'

type SelectOption<T extends string = string> = {
  label: string
  value: T
}

defineProps<{
  route: GatewayRoute
  mode: 'type' | 'path'
  routeTypeOptions: Array<SelectOption<GatewayRoute['route_type']>>
  routePathOptions: Array<SelectOption<NonNullable<GatewayRoute['route_path']>>>
  normalizeRoutePath: (routePath: unknown) => NonNullable<GatewayRoute['route_path']>
}>()

const emit = defineEmits<{
  typeChange: [route: GatewayRoute, value: unknown]
  pathChange: [route: GatewayRoute, value: unknown]
}>()
</script>

<template>
  <a-select
    v-if="mode === 'type'"
    :value="route.route_type"
    :class="['route-type-select', `route-type-select--${route.route_type}`]"
    size="small"
    :options="routeTypeOptions"
    style="width: 104px"
    aria-label="路由类型"
    @change="(value) => emit('typeChange', route, value)"
  >
    <template #option="{ label, value }">
      <span :class="['route-type-option', `route-type-option--${value}`]">{{ label }}</span>
    </template>
  </a-select>
  <a-select
    v-else
    :value="normalizeRoutePath(route.route_path)"
    size="small"
    :options="routePathOptions"
    style="width: 148px"
    aria-label="请求格式"
    @change="(value) => emit('pathChange', route, value)"
  />
</template>
