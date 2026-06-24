<script setup lang="ts">
import type { PluginMeta, SitePayload } from '../../types'

defineProps<{
  plugin: PluginMeta
  editor: SitePayload
  primaryFields: PluginMeta['credential_fields']
  manualLoginFields: PluginMeta['credential_fields']
  totpFields: PluginMeta['credential_fields']
  officialSiteUrl: string | null
  showAuthEntryButton: boolean
  authEntryUrl: string | null
  authEntryLabel: string
  editingId: number | null
  totpPreviewLoading: boolean
  credentialInputName: (name: string) => string
  credentialAutocomplete: (name: string, type: string) => string
}>()

const emit = defineEmits<{
  openOfficial: []
  openAuth: []
  previewTotp: []
}>()

const longCredentialFieldPattern = /(api_?key|access_?token|refresh_?token|secret|cookie|credential)/i

function credentialFieldSpan(field: PluginMeta['credential_fields'][number], fieldCount: number): number {
  if (
    fieldCount === 1
    || field.type === 'textarea'
    || field.type === 'password'
    || longCredentialFieldPattern.test(field.name)
  ) {
    return 24
  }
  return 12
}
</script>

<template>
  <section class="site-editor-card site-editor-card--wide site-editor-card--account">
    <div class="site-editor-card__content">
      <div class="site-editor-section-head site-editor-section-head--between">
        <div>
          <div class="site-editor-section-head">
            <h3>账号凭证</h3>
          </div>
          <p>{{ plugin.auth_hint || '可先在站点侧完成登录，再回到后台回填最终凭证。' }}</p>
        </div>
        <a-space wrap align="center">
          <a-button :disabled="!officialSiteUrl" @click="emit('openOfficial')">打开官网</a-button>
          <a-button
            v-if="showAuthEntryButton"
            type="primary"
            ghost
            :disabled="!authEntryUrl"
            @click="emit('openAuth')"
          >
            {{ authEntryLabel }}
          </a-button>
        </a-space>
      </div>

      <a-row :gutter="[18, 4]">
        <a-col
          v-for="field in primaryFields"
          :key="field.name"
          :xs="24"
          :md="credentialFieldSpan(field, primaryFields.length)"
        >
          <a-form-item :label="field.label">
            <a-textarea
              v-if="field.type === 'textarea'"
              v-model:value="editor.credentials[field.name]"
              :rows="3"
              :placeholder="field.placeholder"
              :name="credentialInputName(field.name)"
              :autocomplete="credentialAutocomplete(field.name, field.type)"
              :aria-label="field.label"
            />
            <a-input-password
              v-else-if="field.type === 'password'"
              v-model:value="editor.credentials[field.name]"
              :placeholder="field.placeholder"
              :name="credentialInputName(field.name)"
              :autocomplete="credentialAutocomplete(field.name, field.type)"
              :aria-label="field.label"
            />
            <a-input
              v-else
              v-model:value="editor.credentials[field.name]"
              :placeholder="field.placeholder"
              :name="credentialInputName(field.name)"
              :autocomplete="credentialAutocomplete(field.name, field.type)"
              :aria-label="field.label"
            />
            <small v-if="field.help_text" class="field-help">{{ field.help_text }}</small>
          </a-form-item>
        </a-col>
      </a-row>

      <div v-if="manualLoginFields.length" class="nested-form-block site-editor-subblock">
        <div class="site-editor-subblock__head">
          <h4>账号密码</h4>
        </div>
        <a-row :gutter="[18, 4]">
          <a-col
            v-for="field in manualLoginFields"
            :key="field.name"
            :xs="24"
            :md="credentialFieldSpan(field, manualLoginFields.length)"
          >
            <a-form-item :label="field.label">
              <a-input-password
                v-if="field.type === 'password'"
                v-model:value="editor.credentials[field.name]"
                :placeholder="field.placeholder"
                :name="credentialInputName(field.name)"
                :autocomplete="credentialAutocomplete(field.name, field.type)"
                :aria-label="field.label"
              />
              <a-input
                v-else
                v-model:value="editor.credentials[field.name]"
                :placeholder="field.placeholder"
                :name="credentialInputName(field.name)"
                :autocomplete="credentialAutocomplete(field.name, field.type)"
                :aria-label="field.label"
              />
              <small v-if="field.help_text" class="field-help">{{ field.help_text }}</small>
            </a-form-item>
          </a-col>
        </a-row>
      </div>

      <div v-if="totpFields.length" class="nested-form-block site-editor-subblock">
        <div class="site-editor-subblock__head site-editor-subblock__head--between">
          <h4>双重验证</h4>
          <a-button
            v-if="editingId"
            :loading="totpPreviewLoading"
            @click="emit('previewTotp')"
          >
            查看当前验证码
          </a-button>
        </div>
        <a-row :gutter="[18, 4]">
          <a-col
            v-for="field in totpFields"
            :key="field.name"
            :xs="24"
          >
            <a-form-item :label="field.label">
              <a-textarea
                v-model:value="editor.credentials[field.name]"
                :rows="3"
                :placeholder="field.placeholder"
                :name="credentialInputName(field.name)"
                :autocomplete="credentialAutocomplete(field.name, 'textarea')"
                :aria-label="field.label"
              />
              <small v-if="field.help_text" class="field-help">{{ field.help_text }}</small>
            </a-form-item>
          </a-col>
        </a-row>
      </div>
    </div>
  </section>
</template>
