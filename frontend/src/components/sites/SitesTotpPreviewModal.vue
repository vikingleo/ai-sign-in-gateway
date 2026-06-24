<script setup lang="ts">
import type { TotpPreview } from '../../types'

const open = defineModel<boolean>('open', { required: true })

defineProps<{
  preview: TotpPreview | null
}>()
</script>

<template>
  <a-modal
    v-model:open="open"
    title="当前 TOTP 验证码"
    :footer="null"
  >
    <div v-if="preview" class="result-block">
      <p><strong>验证码：</strong><span class="totp-code">{{ preview.code }}</span></p>
      <p><strong>剩余有效期：</strong>{{ preview.expires_in }} 秒</p>
    </div>
  </a-modal>
</template>
