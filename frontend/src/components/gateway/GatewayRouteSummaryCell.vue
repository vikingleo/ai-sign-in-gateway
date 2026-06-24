<script setup lang="ts">
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import type { GatewayRoute } from '../../types'

type GatewayRouteDetailItem = {
  label: string
  value: string
}

defineProps<{
  route: GatewayRoute
  loadRouteLabel: (route: GatewayRoute) => string
  routeDetailItems: (route: GatewayRoute) => GatewayRouteDetailItem[]
  routeIssueLabels: (route: GatewayRoute) => string[]
  supportedModelsPreview: (models: string[]) => string
}>()
</script>

<template>
  <div class="table-cell-compact">
    <div class="table-cell-compact__head">
      <a-tooltip placement="topLeft" :title="loadRouteLabel(route)">
        <strong class="table-cell-compact__title">{{ loadRouteLabel(route) }}</strong>
      </a-tooltip>
      <a-tooltip placement="right">
        <template #title>
          <div class="tooltip-detail-list">
            <div v-for="item in routeDetailItems(route)" :key="item.label">
              <strong>{{ item.label }}</strong>
              <span>{{ item.value }}</span>
            </div>
          </div>
        </template>
        <InfoCircleOutlined class="table-info-icon" aria-hidden="true" />
      </a-tooltip>
    </div>
    <div class="table-cell-compact__meta">
      <span class="table-cell-compact__meta-label">模型能力</span>
      <span>{{ supportedModelsPreview(route.supported_models) }}</span>
    </div>
    <div v-if="routeIssueLabels(route).length" class="table-cell-compact__tags">
      <a-tag
        v-for="label in routeIssueLabels(route)"
        :key="label"
        color="error"
        class="route-issue-tag"
      >
        {{ label }}
      </a-tag>
    </div>
  </div>
</template>
