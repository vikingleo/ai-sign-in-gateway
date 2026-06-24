<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { AddUpstreamForm } from '../../gatewayAddUpstreamModel'

type SelectOption = {
  label: string
  value: string
}

const open = defineModel<boolean>('open', { required: true })
const groupNames = defineModel<string[]>('groupNames', { required: true })

const props = defineProps<{
  form: AddUpstreamForm
  groupOptions: SelectOption[]
  loading: boolean
}>()

const emit = defineEmits<{
  submit: [form: AddUpstreamForm, groupNames: string[]]
  reset: []
}>()

const localForm = reactive<AddUpstreamForm>({ ...props.form })
const localGroupNames = ref([...groupNames.value])

watch(
  () => props.form,
  (value) => {
    Object.assign(localForm, value)
  },
  { deep: true },
)

watch(open, (value) => {
  if (value) {
    localGroupNames.value = [...groupNames.value]
  }
})

function handleSubmit() {
  emit('submit', { ...localForm }, [...localGroupNames.value])
}

function handleCancel() {
  Object.assign(localForm, props.form)
  localGroupNames.value = [...groupNames.value]
  emit('reset')
}

const apiFormatOptions = [
  { label: 'Codex', value: 'codex' },
  { label: 'OpenAI / GPT', value: 'openai' },
  { label: 'Anthropic / Claude', value: 'anthropic' },
  { label: 'Gemini', value: 'gemini' },
  { label: '通用 (general)', value: 'general' },
] satisfies Array<{ label: string; value: AddUpstreamForm['api_format'] }>
</script>

<template>
  <a-modal
    v-model:open="open"
    title="添加上游 (api-supplier)"
    :confirm-loading="loading"
    ok-text="保存并加入路由池"
    cancel-text="取消"
    width="640px"
    wrap-class-name="gateway-add-upstream-modal-wrap"
    class="gateway-add-upstream-modal"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-alert
      type="info"
      show-icon
      message="该上游仅参与网关转发，不参与签到 / 同步。"
      description="保存后会作为 api-supplier 站点写入数据库，自动出现在路由池中，可独立启用/禁用、调整 priority/weight 与 route type。"
      style="margin-bottom: 12px"
    />
    <a-form layout="vertical">
      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="名称" required>
            <a-input
              v-model:value="localForm.name"
              placeholder="便于识别，例如 acme-anthropic-1"
              autocomplete="off"
              aria-label="上游名称"
            />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item label="API 格式" required>
            <a-select
              v-model:value="localForm.api_format"
              :options="apiFormatOptions"
              aria-label="上游 API 格式"
            />
            <small class="field-help">
              决定路由分类（claude / gpt / codex / gemini），请求路径在路由表“请求格式”列单独设置。
            </small>
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Base URL" required>
        <a-input
          v-model:value="localForm.base_url"
          placeholder="https://example.com 或 https://example.com/v1"
          autocomplete="off"
          aria-label="上游 Base URL"
        />
        <small class="field-help">
          上游入口的根地址。如果上游需要带 /v1 前缀，可直接写在这里。
        </small>
      </a-form-item>
      <a-form-item label="API Key" required>
        <a-input-password
          v-model:value="localForm.api_key"
          placeholder="sk-..."
          autocomplete="off"
          aria-label="上游 API Key"
        />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="分组（可选）">
            <a-select
              v-model:value="localGroupNames"
              mode="multiple"
              :options="groupOptions"
              :max-tag-count="4"
              placeholder="选择分组"
              aria-label="上游分组"
            />
            <small class="field-help">
              分组在全局 header 右上角维护，这里只选择。
            </small>
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item label="默认模型（可选）">
            <a-input
              v-model:value="localForm.preferred_model"
              placeholder="claude-sonnet-4-6 / gemini-2.5-pro"
              autocomplete="off"
              aria-label="上游默认模型"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="支持模型（可选）">
        <a-select
          v-model:value="localForm.supported_models"
          mode="tags"
          :token-separators="[',', '，', '\n', '\t']"
          placeholder="留空表示该路由不会接收带 model 的精确匹配请求"
          aria-label="上游支持模型"
        />
        <small class="field-help">用于声明这个上游明确支持的模型 ID。请求体带 `model` 时，网关只会把请求发给这里精确声明过该模型的路由。</small>
      </a-form-item>
    </a-form>
  </a-modal>
</template>
