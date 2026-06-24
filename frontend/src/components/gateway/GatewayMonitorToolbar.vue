<script setup lang="ts">
import { ReloadOutlined, SettingOutlined } from '@ant-design/icons-vue'
import GatewayAccessBar from './GatewayAccessBar.vue'

defineProps<{
  requestUrl: string
  codexTooltip: string
  maskedApiKey: string
  hasApiKey: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  (event: 'copy-request-url'): void
  (event: 'copy-api-key'): void
  (event: 'refresh'): void
  (event: 'open-settings'): void
  (event: 'open-logs'): void
}>()
</script>

<template>
  <div class="page-toolbar page-toolbar--actions">
    <div class="gateway-monitor-toolbar">
      <GatewayAccessBar
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
      <a-button @click="emit('open-settings')">
        <template #icon>
          <SettingOutlined aria-hidden="true" />
        </template>
        网关策略
      </a-button>
      <a-button @click="emit('open-logs')">最近请求</a-button>
    </a-space>
  </div>
</template>
