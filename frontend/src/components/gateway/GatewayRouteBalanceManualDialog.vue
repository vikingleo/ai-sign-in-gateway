<script setup lang="ts">
import type { GatewayRoute } from '../../types'

const open = defineModel<boolean>('open', { required: true })
const url = defineModel<string>('url', { required: true })

defineProps<{
  route: GatewayRoute | null
  message: string
  loading: boolean
  loadRouteLabel: (route: GatewayRoute) => string
}>()

defineEmits<{
  submit: []
}>()
</script>

<template>
  <a-modal
    v-model:open="open"
    title="余额探测接口"
    width="640px"
    :confirm-loading="loading"
    ok-text="重试探测"
    @ok="$emit('submit')"
  >
    <a-form layout="vertical">
      <a-alert
        v-if="message"
        type="warning"
        show-icon
        :message="message"
        style="margin-bottom: 12px"
      />
      <a-form-item :label="route ? loadRouteLabel(route) : '当前路由'">
        <a-input
          v-model:value="url"
          placeholder="https://example.com/v1/usage 或 /api/usage/token/"
          autocomplete="off"
          aria-label="手动余额接口地址"
        />
        <small class="field-help">成功后会保存到当前路由，后续余额探测优先使用这个接口，并使用该路由自己的 API Key。</small>
      </a-form-item>
    </a-form>
  </a-modal>
</template>
