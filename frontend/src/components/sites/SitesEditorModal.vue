<script setup lang="ts">
import { CloseOutlined } from '@ant-design/icons-vue'
import type { SelectProps } from 'ant-design-vue'
import SitesEditorBasicCard from './SitesEditorBasicCard.vue'
import SitesEditorCredentialsCard from './SitesEditorCredentialsCard.vue'
import SitesEditorPluginConfigCard from './SitesEditorPluginConfigCard.vue'
import SitesEditorStorageCard from './SitesEditorStorageCard.vue'
import type { PluginMeta, Site, SitePayload, SiteRegistrationBatchResult } from '../../types'

type BatchRegisterForm = {
  email_pattern: string
  password: string
  count: number
  start_index: number
}

type TestFeedback = {
  type: 'success' | 'error'
  title: string
  message: string
}

const open = defineModel<boolean>('open', { required: true })
const groupNames = defineModel<string[]>('groupNames', { required: true })
const batchRegisterEnabled = defineModel<boolean>('batchRegisterEnabled', { required: true })
const rawText = defineModel<string>('rawText', { required: true })

defineProps<{
  editingId: number | null
  editingSite: Site | null
  saveFeedback: string | null
  pluginMismatch: boolean
  recommendedPlugin: PluginMeta | null
  testFeedback: TestFeedback | null
  canBatchRegister: boolean
  batchForm: BatchRegisterForm
  batchResult: SiteRegistrationBatchResult | null
  editor: SitePayload
  pluginOptions: SelectProps['options']
  groupOptions: SelectProps['options']
  emailPatternExamples: string[]
  collectorScript: string
  analyzingStorage: boolean
  currentPlugin: PluginMeta | null
  primaryCredentialFields: PluginMeta['credential_fields']
  manualLoginFields: PluginMeta['credential_fields']
  totpCredentialFields: PluginMeta['credential_fields']
  officialSiteUrl: string | null
  showAuthEntryButton: boolean
  authEntryUrl: string | null
  authEntryLabel: string
  totpPreviewLoading: boolean
  credentialInputName: (name: string) => string
  credentialAutocomplete: (name: string, type: string) => string
  configTextValue: (key: string) => string | number | undefined
  configNumberValue: (key: string) => number | undefined
  busy: boolean
  testActionLabel: string
  isRelayOnlyEditor: boolean
  primaryActionLabel: string
}>()

const emit = defineEmits<{
  close: []
  applyRecommendedPlugin: []
  copyScript: []
  analyzeStorage: []
  pastePayload: []
  openOfficial: []
  openAuth: []
  previewTotp: []
  updateConfig: [key: string, value: string | number | null]
  test: [site: Site]
  checkin: [site: Site]
  save: []
  deleteSite: [site: Site]
}>()
</script>

<template>
  <a-modal
    v-model:open="open"
    :title="null"
    width="1280px"
    centered
    :mask-closable="false"
    :destroy-on-close="false"
    wrap-class-name="site-editor-modal-wrap"
    class="site-editor-modal"
    :class="{ 'site-editor-modal--relay': isRelayOnlyEditor }"
  >
    <template #closeIcon>
      <span class="site-editor-modal__close"><CloseOutlined /></span>
    </template>
    <div class="site-editor-modal__frame">
      <div class="site-editor-modal__header">
        <div class="site-editor-modal__title">
          {{ editingId ? `编辑站点 - ${editingSite?.name ?? ''}` : '新建站点' }}
        </div>
      </div>

      <div class="site-editor-modal__body">
        <div class="drawer-form-shell site-editor-shell">
          <a-alert
            v-if="saveFeedback"
            type="success"
            show-icon
            :message="saveFeedback"
            class="site-editor-alert"
          />

          <a-alert
            v-if="pluginMismatch && recommendedPlugin"
            type="warning"
            show-icon
            class="site-editor-alert"
            :message="`当前域名更适合使用 ${recommendedPlugin.name}`"
          >
            <template #description>
              <a-button type="link" style="padding: 0" @click="emit('applyRecommendedPlugin')">
                切换到推荐插件
              </a-button>
            </template>
          </a-alert>

          <a-alert
            v-if="testFeedback"
            :type="testFeedback.type"
            show-icon
            :message="testFeedback.title"
            class="site-editor-alert"
          >
            <template #description>
              <pre class="feedback-pre">{{ testFeedback.message }}</pre>
            </template>
          </a-alert>

          <a-form layout="vertical">
            <div class="site-editor-grid" :class="{ 'site-editor-grid--relay': isRelayOnlyEditor }">
              <div class="site-editor-column site-editor-column--basic">
                <SitesEditorBasicCard
                  v-model:group-names="groupNames"
                  v-model:batch-register-enabled="batchRegisterEnabled"
                  :editing-id="editingId"
                  :can-batch-register="canBatchRegister"
                  :batch-form="batchForm"
                  :batch-result="batchResult"
                  :editor="editor"
                  :plugin-options="pluginOptions"
                  :group-options="groupOptions"
                  :email-pattern-examples="emailPatternExamples"
                />

                <SitesEditorCredentialsCard
                  v-if="currentPlugin"
                  :plugin="currentPlugin"
                  :editor="editor"
                  :primary-fields="primaryCredentialFields"
                  :manual-login-fields="manualLoginFields"
                  :totp-fields="totpCredentialFields"
                  :official-site-url="officialSiteUrl"
                  :show-auth-entry-button="showAuthEntryButton"
                  :auth-entry-url="authEntryUrl"
                  :auth-entry-label="authEntryLabel"
                  :editing-id="editingId"
                  :totp-preview-loading="totpPreviewLoading"
                  :credential-input-name="credentialInputName"
                  :credential-autocomplete="credentialAutocomplete"
                  @open-official="emit('openOfficial')"
                  @open-auth="emit('openAuth')"
                  @preview-totp="emit('previewTotp')"
                />
              </div>

              <div class="site-editor-column site-editor-column--config">
                <SitesEditorPluginConfigCard
                  v-if="currentPlugin"
                  :plugin="currentPlugin"
                  :plugin-key="editor.plugin_key"
                  :config-text-value="configTextValue"
                  :config-number-value="configNumberValue"
                  @update-config="(key, value) => emit('updateConfig', key, value)"
                />
              </div>

              <div class="site-editor-column site-editor-column--storage">
                <SitesEditorStorageCard
                  v-model:raw-text="rawText"
                  :collector-script="collectorScript"
                  :analyzing="analyzingStorage"
                  @copy-script="emit('copyScript')"
                  @analyze="emit('analyzeStorage')"
                  @paste-payload="emit('pastePayload')"
                />
              </div>
            </div>
          </a-form>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer site-editor-modal__footer">
        <a-space wrap>
          <a-button @click="emit('close')">取消</a-button>
          <a-button v-if="editingSite" :loading="busy" @click="emit('test', editingSite)">{{ testActionLabel }}</a-button>
          <a-button
            v-if="editingSite && !isRelayOnlyEditor"
            :loading="busy"
            @click="emit('checkin', editingSite)"
          >
            {{ primaryActionLabel }}
          </a-button>
          <a-button type="primary" :loading="busy" @click="emit('save')">
            {{ editingSite ? '保存修改' : (batchRegisterEnabled ? '批量注册并创建' : '创建站点') }}
          </a-button>
          <a-button v-if="editingSite" danger :loading="busy" @click="emit('deleteSite', editingSite)">删除站点</a-button>
        </a-space>
      </div>
    </template>
  </a-modal>
</template>
