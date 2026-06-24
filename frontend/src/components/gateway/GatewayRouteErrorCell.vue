<script setup lang="ts">
import type { GatewayRoute } from '../../types'
import { compactText } from '../../viewUtils'

defineProps<{
  route: GatewayRoute
  routeErrorDetails: (route: GatewayRoute) => string[]
}>()
</script>

<template>
  <a-tooltip v-if="routeErrorDetails(route).length" placement="topLeft">
    <template #title>
      <div class="tooltip-detail-list">
        <div v-for="item in routeErrorDetails(route)" :key="item">
          <span>{{ item }}</span>
        </div>
      </div>
    </template>
    <span class="table-ellipsis">{{ compactText(route.last_error, 42) || '-' }}</span>
  </a-tooltip>
  <span v-else>-</span>
</template>
