<script setup lang="ts">
import { CopyOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'

withDefaults(
  defineProps<{
    requestUrl: string
    codexTooltip: string
    maskedApiKey: string
    hasApiKey: boolean
    variant?: 'default' | 'route'
  }>(),
  {
    variant: 'default',
  },
)

const emit = defineEmits<{
  (event: 'copy-request-url'): void
  (event: 'copy-api-key'): void
}>()
</script>

<template>
  <div class="gateway-access" :class="{ 'gateway-access--route': variant === 'route' }">
    <code>地址 {{ requestUrl }}</code>
    <a-tooltip placement="bottom" :title="codexTooltip">
      <span class="gateway-access__hint">
        <InfoCircleOutlined aria-hidden="true" />
        Codex /v1
      </span>
    </a-tooltip>
    <a-button size="small" aria-label="复制网关地址" @click="emit('copy-request-url')">
      <template #icon>
        <CopyOutlined />
      </template>
      复制
    </a-button>
    <code>Key {{ maskedApiKey }}</code>
    <a-button size="small" aria-label="复制网关 API Key" :disabled="!hasApiKey" @click="emit('copy-api-key')">
      <template #icon>
        <CopyOutlined />
      </template>
      复制
    </a-button>
  </div>
</template>
