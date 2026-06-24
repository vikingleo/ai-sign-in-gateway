<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { SettingsData } from '../../types'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  form: SettingsData
  saving: boolean
  busy: boolean
}>()

const emit = defineEmits<{
  save: [form: SettingsData]
  runNow: []
}>()

const localForm = reactive<SettingsData>({ ...props.form })

watch(
  () => props.form,
  (value) => {
    Object.assign(localForm, value)
  },
  { deep: true },
)

function handleSave() {
  emit('save', { ...localForm })
}
</script>

<template>
  <a-modal
    v-model:open="open"
    title="签到配置"
    width="760px"
    :confirm-loading="saving"
    @ok="handleSave"
  >
    <a-form layout="vertical">
      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="时区">
            <a-input v-model:value="localForm.timezone" aria-label="签到时区" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item label="签到时间">
            <a-input v-model:value="localForm.daily_run_time" type="time" aria-label="签到时间" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="同站点 URL 并发数">
            <a-input-number v-model:value="localForm.checkin_concurrency" style="width: 100%" :min="1" :max="20" aria-label="同站点 URL 并发数" />
            <small class="field-help">同一 base_url 下多账号最多同时执行数，默认 1。</small>
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item label="不同站点总并发数">
            <a-input-number v-model:value="localForm.checkin_global_concurrency" style="width: 100%" :min="1" :max="50" aria-label="不同站点总并发数" />
            <small class="field-help">不同 base_url 之间可同时执行的总任务数。</small>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="站点间隔（秒）">
            <a-input-number v-model:value="localForm.checkin_interval_seconds" style="width: 100%" :min="0" :max="60" aria-label="站点间隔秒数" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item label="失败重试次数">
            <a-input-number v-model:value="localForm.retry_count" style="width: 100%" :min="0" :max="5" aria-label="失败重试次数" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="请求超时（秒）">
            <a-input-number v-model:value="localForm.request_timeout" style="width: 100%" :min="5" :max="120" aria-label="请求超时秒数" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item label="定时签到">
            <a-switch
              class="app-switch app-switch--text"
              v-model:checked="localForm.schedule_enabled"
              aria-label="启用定时签到"
              checked-children="启用"
              un-checked-children="关闭"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="仅执行启用站点">
            <a-switch
              class="app-switch app-switch--text"
              v-model:checked="localForm.only_enabled_sites"
              aria-label="仅执行启用站点"
              checked-children="是"
              un-checked-children="否"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 0"
        message="默认并发数为 1"
        description="同站点 URL 并发默认 1，避免同站多账号同时触发风控；不同站点总并发默认 4。默认站点间隔为 1 秒。"
      />
    </a-form>

    <template #footer>
      <a-space>
        <a-button :loading="busy" @click="emit('runNow')">立即执行计划任务</a-button>
        <a-button @click="open = false">取消</a-button>
        <a-button type="primary" :loading="saving" @click="handleSave">保存签到配置</a-button>
      </a-space>
    </template>
  </a-modal>
</template>
