<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

defineProps<{
  siteName: string
  loading: boolean
  link: string
  code: string
}>()

const emit = defineEmits<{
  refresh: []
  copyLink: []
  copyCode: []
  copyBundle: []
}>()
</script>

<template>
  <a-modal
    v-model:open="open"
    :title="`邀请信息 - ${siteName}`"
    width="720px"
    :footer="null"
    destroy-on-close
  >
    <div class="invite-dialog">
      <a-alert
        type="info"
        show-icon
        message="邀请信息来自当前站点账号资料读取结果。"
      />
      <a-spin :spinning="loading">
        <div class="invite-dialog__grid">
          <div class="invite-dialog__field">
            <div class="invite-dialog__label">邀请链接</div>
            <div class="invite-dialog__control">
              <a-input :value="link" readonly placeholder="未读取到邀请链接" aria-label="邀请链接" />
              <a-button :disabled="!link" @click="emit('copyLink')">复制链接</a-button>
            </div>
          </div>
          <div class="invite-dialog__field">
            <div class="invite-dialog__label">邀请码</div>
            <div class="invite-dialog__control invite-dialog__control--code">
              <a-input :value="code" readonly placeholder="未读取到邀请码" aria-label="邀请码" />
              <a-button :disabled="!code" @click="emit('copyCode')">复制邀请码</a-button>
            </div>
          </div>
        </div>
      </a-spin>
      <div class="invite-dialog__actions">
        <a-space wrap>
          <a-button :loading="loading" @click="emit('refresh')">
            刷新读取
          </a-button>
          <a-button type="primary" :disabled="!link && !code" @click="emit('copyBundle')">
            复制全部
          </a-button>
          <a-button @click="open = false">关闭</a-button>
        </a-space>
      </div>
    </div>
  </a-modal>
</template>
