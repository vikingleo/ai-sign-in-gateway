<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { GatewayRoute } from '../../types'
import GatewayRouteTextCell from './GatewayRouteTextCell.vue'

const open = defineModel<boolean>('open', { required: true })
const insertIndex = defineModel<number | undefined>('insertIndex', { required: true })

defineProps<{
  loading: boolean
  columns: ColumnsType<GatewayRoute>
  routes: GatewayRoute[]
  selectedRoute: GatewayRoute | null
  rowKey: (record: GatewayRoute) => string | number
  rowClassName: (record: GatewayRoute) => string
  loadRouteLabel: (route: GatewayRoute) => string
  routePriorityLabel: (route: GatewayRoute | null) => string
  formatGroupNames: (value: string | string[] | null | undefined) => string
}>()

defineEmits<{
  move: []
  preset: [mode: 'package' | 'balance']
}>()

function asRoute(record: unknown) {
  return record as GatewayRoute
}
</script>

<template>
  <a-modal
    v-model:open="open"
    title="设置优先权"
    width="920px"
    :footer="null"
  >
    <a-spin :spinning="loading">
      <div class="priority-dialog">
        <a-table
          :columns="columns"
          :data-source="routes"
          :pagination="{ pageSize: 8 }"
          :row-key="rowKey"
          :row-class-name="rowClassName"
          size="small"
          :scroll="{ x: 760, y: 360 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'route'">
              <div class="priority-route-name">
                <a-tooltip placement="topLeft" :title="loadRouteLabel(asRoute(record))">
                  <strong>{{ loadRouteLabel(asRoute(record)) }}</strong>
                </a-tooltip>
                <a-tag v-if="asRoute(record).id === selectedRoute?.id" color="processing">当前</a-tag>
              </div>
            </template>
            <template v-else-if="column.key === 'priority'">
              <GatewayRouteTextCell mode="priority" :route="asRoute(record)" :format-group-names="formatGroupNames" value-class="priority-number" />
            </template>
            <template v-else-if="column.key === 'group'">
              <GatewayRouteTextCell mode="group" :route="asRoute(record)" :format-group-names="formatGroupNames" />
            </template>
          </template>
        </a-table>

        <div class="priority-editor">
          <div class="priority-editor__summary">
            <span>当前路由</span>
            <strong>{{ selectedRoute ? loadRouteLabel(selectedRoute) : '未选择' }}</strong>
            <span>当前优先级 {{ routePriorityLabel(selectedRoute) }}</span>
          </div>
          <div class="priority-editor__actions">
            <a-input-number
              v-model:value="insertIndex"
              class="priority-editor__input"
              :min="0"
              :max="Math.max(routes.length - 1, 0)"
              :precision="0"
              placeholder="目标优先级"
              aria-label="目标优先级"
            />
            <a-button type="primary" :disabled="!selectedRoute" @click="$emit('move')">
              移动到优先级
            </a-button>
            <a-button @click="$emit('preset', 'package')">优先套餐</a-button>
            <a-button @click="$emit('preset', 'balance')">优先余额</a-button>
          </div>
        </div>
      </div>
    </a-spin>
  </a-modal>
</template>
