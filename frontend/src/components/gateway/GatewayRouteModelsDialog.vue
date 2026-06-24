<script setup lang="ts">
import type { GatewayRoute } from '../../types'

const open = defineModel<boolean>('open', { required: true })
const requestURLs = defineModel<string>('requestURLs', { required: true })
const supportedModels = defineModel<string[]>('supportedModels', { required: true })

defineProps<{
  route: GatewayRoute | null
  saving: boolean
  loadRouteLabel: (route: GatewayRoute) => string
}>()

defineEmits<{
  save: []
}>()
</script>

<template>
  <a-modal
    v-model:open="open"
    title="编辑路由配置"
    width="640px"
    :confirm-loading="saving"
    @ok="$emit('save')"
  >
    <a-form layout="vertical">
      <a-form-item label="路由 API URL">
        <a-textarea
          v-model:value="requestURLs"
          :rows="4"
          placeholder="每行一个 URL。留空时使用站点管理中的 API URL 或 Base URL。"
          aria-label="路由 API URL"
        />
        <small class="field-help">这里配置的是当前单条路由的请求入口，优先级高于站点级 API URL；适合同一个 Key 的 GPT 和 Claude 走不同 URL。</small>
      </a-form-item>
      <a-form-item :label="route ? loadRouteLabel(route) : '当前路由'">
        <a-select
          v-model:value="supportedModels"
          mode="tags"
          :token-separators="[',', '，', '\n', '\t']"
          placeholder="留空表示该路由不会接收带 model 的精确匹配请求"
          aria-label="路由支持模型"
        />
        <small class="field-help">这里配置的是路由当前生效的模型能力。请求体带 `model` 时，只有精确包含该模型 ID 的同类型路由会参与调度。</small>
      </a-form-item>
    </a-form>
  </a-modal>
</template>
