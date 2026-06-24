<script setup lang="ts">
import {
  DeleteOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  ReloadOutlined,
  SettingOutlined,
  SyncOutlined,
  ToolOutlined,
} from '@ant-design/icons-vue'
import type { GatewayRoute } from '../../types'

defineProps<{
  route: GatewayRoute
  routeProbing: boolean
  balanceProbing: boolean
}>()

const emit = defineEmits<{
  (event: 'toggle', route: GatewayRoute): void
  (event: 'reset-circuit', route: GatewayRoute): void
  (event: 'probe', route: GatewayRoute): void
  (event: 'probe-balance', route: GatewayRoute): void
  (event: 'configure-models', route: GatewayRoute): void
  (event: 'assign-groups', route: GatewayRoute): void
  (event: 'enable-only', route: GatewayRoute): void
  (event: 'priority', route: GatewayRoute): void
  (event: 'diagnose', route: GatewayRoute): void
  (event: 'history', route: GatewayRoute): void
  (event: 'delete', route: GatewayRoute): void
}>()
</script>

<template>
  <a-space size="small" class="gateway-actions-cell">
    <a-button size="small" :danger="route.is_enabled" @click.stop="emit('toggle', route)">
      {{ route.is_enabled ? '禁用' : '启用' }}
    </a-button>
    <a-dropdown :trigger="['click']">
      <a-tooltip title="更多操作">
        <a-button
          size="small"
          class="gateway-actions-menu-button"
          :aria-label="`${route.site_name || route.base_url}更多操作`"
          :loading="routeProbing || balanceProbing"
          @click.stop
        >
          <template #icon><MoreOutlined aria-hidden="true" /></template>
        </a-button>
      </a-tooltip>
      <template #overlay>
        <a-menu>
          <a-menu-item
            key="reset-circuit"
            :disabled="route.circuit_state === 'closed'"
            @click="emit('reset-circuit', route)"
          >
            <ReloadOutlined aria-hidden="true" />
            <span>重置熔断</span>
          </a-menu-item>
          <a-menu-item key="probe" :disabled="routeProbing" @click="emit('probe', route)">
            <SyncOutlined aria-hidden="true" />
            <span>探测</span>
          </a-menu-item>
          <a-menu-item key="balance" :disabled="balanceProbing" @click="emit('probe-balance', route)">
            <InfoCircleOutlined aria-hidden="true" />
            <span>余额</span>
          </a-menu-item>
          <a-menu-item key="supported-models" @click="emit('configure-models', route)">
            <ToolOutlined aria-hidden="true" />
            <span>路由配置</span>
          </a-menu-item>
          <a-menu-item key="assign-groups" @click="emit('assign-groups', route)">
            <SettingOutlined aria-hidden="true" />
            <span>分组</span>
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="enable-only" @click="emit('enable-only', route)">
            <SettingOutlined aria-hidden="true" />
            <span>禁用其他</span>
          </a-menu-item>
          <a-menu-item key="priority" @click="emit('priority', route)">
            <SettingOutlined aria-hidden="true" />
            <span>优先权</span>
          </a-menu-item>
          <a-menu-item key="diagnosis" @click="emit('diagnose', route)">
            <ToolOutlined aria-hidden="true" />
            <span>诊断</span>
          </a-menu-item>
          <a-menu-item key="history" @click="emit('history', route)">
            <HistoryOutlined aria-hidden="true" />
            <span>历史</span>
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="delete" danger @click="emit('delete', route)">
            <DeleteOutlined aria-hidden="true" />
            <span>删除</span>
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </a-space>
</template>
