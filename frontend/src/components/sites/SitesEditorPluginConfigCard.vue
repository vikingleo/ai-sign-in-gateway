<script setup lang="ts">
import type { PluginMeta } from '../../types'

defineProps<{
  plugin: PluginMeta
  pluginKey: string
  configTextValue: (key: string) => string | number | undefined
  configNumberValue: (key: string) => number | undefined
}>()

const emit = defineEmits<{
  updateConfig: [key: string, value: string | number | null]
}>()
</script>

<template>
  <section class="site-editor-card site-editor-card--config site-editor-card--cloud">
    <div class="site-editor-card__content">
      <div class="site-editor-section-head">
        <h3>插件配置</h3>
      </div>
      <a-alert
        v-if="pluginKey === 'api-supplier'"
        type="info"
        show-icon
        message="此站点只用于网关转发，不参与签到 / 资料同步。"
        description="api_format 推荐填 codex / openai / anthropic / gemini / general（写错只会影响路由分类，不会影响转发）。Base URL 与 API Key 是必填项。"
        class="site-editor-config-alert"
      />
      <a-row :gutter="[0, 4]">
        <a-col
          v-for="field in plugin.config_fields"
          :key="field.name"
          :xs="24"
        >
          <a-form-item :label="field.label">
            <a-textarea
              v-if="field.type === 'textarea'"
              :value="configTextValue(field.name)"
              :rows="3"
              :placeholder="field.placeholder"
              :aria-label="field.label"
              @update:value="(value: string) => emit('updateConfig', field.name, value)"
            />
            <a-input-number
              v-else-if="field.type === 'number'"
              :value="configNumberValue(field.name)"
              style="width: 100%"
              :placeholder="field.placeholder"
              :aria-label="field.label"
              @update:value="(value: string | number | null) => emit('updateConfig', field.name, value)"
            />
            <a-input
              v-else
              :value="configTextValue(field.name)"
              :placeholder="field.placeholder"
              :aria-label="field.label"
              @update:value="(value: string) => emit('updateConfig', field.name, value)"
            />
            <small v-if="field.help_text" class="field-help">{{ field.help_text }}</small>
          </a-form-item>
        </a-col>
      </a-row>
    </div>
  </section>
</template>
