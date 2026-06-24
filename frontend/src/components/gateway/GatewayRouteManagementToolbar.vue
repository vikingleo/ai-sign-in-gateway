<script setup lang="ts">
import { PlusOutlined, ReloadOutlined, SettingOutlined, SyncOutlined } from '@ant-design/icons-vue'
import type { RouteBatchProgress } from '../../gatewayViewModel'
import GatewayAccessBar from './GatewayAccessBar.vue'
import GatewayRouteBatchAction from './GatewayRouteBatchAction.vue'

defineProps<{
  filteredRouteCount: number
  routeCount: number
  requestUrl: string
  codexTooltip: string
  maskedApiKey: string
  hasApiKey: boolean
  loading: boolean
  probeLoading: boolean
  balanceProbeAllLoading: boolean
  probeAllProgress: RouteBatchProgress | null
  probeAllProgressPercent: number
  balanceProbeAllProgress: RouteBatchProgress | null
  balanceProbeAllProgressPercent: number
}>()

const emit = defineEmits<{
  (event: 'copy-request-url'): void
  (event: 'copy-api-key'): void
  (event: 'refresh'): void
  (event: 'sync'): void
  (event: 'probe-all'): void
  (event: 'update-all-balances'): void
  (event: 'disable-all'): void
  (event: 'manage-groups'): void
  (event: 'add-upstream'): void
  (event: 'open-settings'): void
}>()
</script>

<template>
  <div class="page-toolbar page-toolbar--actions">
    <div class="route-management-toolbar">
      <div class="route-management-heading">
        <strong>路由池</strong>
        <span>{{ filteredRouteCount }} / {{ routeCount }}</span>
      </div>
      <GatewayAccessBar
        variant="route"
        :request-url="requestUrl"
        :codex-tooltip="codexTooltip"
        :masked-api-key="maskedApiKey"
        :has-api-key="hasApiKey"
        @copy-request-url="emit('copy-request-url')"
        @copy-api-key="emit('copy-api-key')"
      />
    </div>
    <a-space class="gateway-toolbar-actions">
      <a-button :loading="loading" @click="emit('refresh')">
        <template #icon>
          <ReloadOutlined aria-hidden="true" />
        </template>
        刷新
      </a-button>
      <a-button :loading="loading" :disabled="probeLoading || balanceProbeAllLoading" @click="emit('sync')">
        <template #icon>
          <SyncOutlined aria-hidden="true" />
        </template>
        同步路由
      </a-button>
      <GatewayRouteBatchAction
        label="探测全部"
        :loading="probeLoading"
        :disabled="!routeCount || balanceProbeAllLoading"
        :progress="probeAllProgress"
        :progress-percent="probeAllProgressPercent"
        @action="emit('probe-all')"
      />
      <GatewayRouteBatchAction
        label="更新余额"
        tone="balance"
        :loading="balanceProbeAllLoading"
        :disabled="!routeCount || probeLoading"
        :progress="balanceProbeAllProgress"
        :progress-percent="balanceProbeAllProgressPercent"
        @action="emit('update-all-balances')"
      />
      <a-button danger :disabled="!routeCount" @click="emit('disable-all')">禁用全部</a-button>
      <a-button @click="emit('manage-groups')">路由分组</a-button>
      <a-button type="primary" @click="emit('add-upstream')">
        <template #icon>
          <PlusOutlined aria-hidden="true" />
        </template>
        添加上游
      </a-button>
      <a-button @click="emit('open-settings')">
        <template #icon>
          <SettingOutlined aria-hidden="true" />
        </template>
        网关策略
      </a-button>
    </a-space>
  </div>
</template>
