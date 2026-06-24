<script setup lang="ts">
import {
  apiKeyRoutePathLabel,
  apiKeyRouteTypeLabel,
  apiKeySourceLabel,
  type SiteApiKeyEntry,
} from '../../sitesApiKeyModel'
import { apiKeyRoutePathOptions, apiKeyRouteTypeOptions } from '../../sitesViewConfig'

const open = defineModel<boolean>('open', { required: true })
const requestApiUrls = defineModel<string>('requestApiUrls', { required: true })
const imageGenerationPath = defineModel<string>('imageGenerationPath', { required: true })
const imageEditPath = defineModel<string>('imageEditPath', { required: true })
const manualName = defineModel<string>('manualName', { required: true })
const manualKey = defineModel<string>('manualKey', { required: true })
const manualRouteType = defineModel<string>('manualRouteType', { required: true })
const manualRoutePath = defineModel<string>('manualRoutePath', { required: true })
const manualRequestBaseUrls = defineModel<string>('manualRequestBaseUrls', { required: true })
const manualImageGenerationPath = defineModel<string>('manualImageGenerationPath', { required: true })
const manualImageEditPath = defineModel<string>('manualImageEditPath', { required: true })

defineProps<{
  siteName: string
  entries: SiteApiKeyEntry[]
  previewUrls: string[]
  saving: boolean
  requestUrlDraft: (entry: SiteApiKeyEntry) => string
  routePathDraft: (entry: SiteApiKeyEntry) => string
  imageGenerationPathDraft: (entry: SiteApiKeyEntry) => string
  imageEditPathDraft: (entry: SiteApiKeyEntry) => string
}>()

const emit = defineEmits<{
  ok: []
  copyPrimary: []
  copyKey: [value: string]
  removeKey: [entry: SiteApiKeyEntry]
  updateEntryRequestUrl: [entry: SiteApiKeyEntry, value: string]
  updateEntryRoutePath: [entry: SiteApiKeyEntry, value: unknown]
  updateEntryImagePath: [entry: SiteApiKeyEntry, field: 'generation' | 'edit', value: string]
  addManualKey: []
}>()
</script>

<template>
  <a-modal
    v-model:open="open"
    title="查看 API Key 与请求 URL"
    width="820px"
    class="api-key-dialog-modal"
    :confirm-loading="saving"
    ok-text="保存配置"
    @ok="emit('ok')"
  >
    <a-form layout="vertical">
      <a-form-item label="站点">
        <a-input :value="siteName" readonly aria-label="站点名称" />
      </a-form-item>
      <a-form-item label="API Key">
        <a-space direction="vertical" style="width: 100%">
          <a-space>
            <a-button
              type="primary"
              ghost
              :disabled="!entries.length"
              @click="emit('copyPrimary')"
            >
              复制主 Key
            </a-button>
            <span class="table-subtitle">可删除接口同步或自定义 Key，保存后同步到本地配置。</span>
          </a-space>
          <div v-if="entries.length" class="api-key-dialog-list">
            <div
              v-for="entry in entries"
              :key="entry.id"
              class="api-key-dialog-item"
            >
              <div class="api-key-dialog-item__head">
                <a-space>
                  <strong>{{ entry.name }}</strong>
                  <a-tag v-if="entry.isPrimary" color="processing">主 Key</a-tag>
                  <a-tag :color="entry.isManual ? 'blue' : 'purple'">{{ apiKeySourceLabel(entry) }}</a-tag>
                  <a-tag v-if="entry.routeType">{{ apiKeyRouteTypeLabel(entry.routeType) }}</a-tag>
                  <a-tag>{{ apiKeyRoutePathLabel(entry.routePath) }}</a-tag>
                  <a-tag :color="entry.status === 'active' ? 'green' : 'default'">{{ entry.status }}</a-tag>
                </a-space>
                <a-space size="small">
                  <a-button size="small" @click="emit('copyKey', entry.key)">复制</a-button>
                  <a-button size="small" danger @click="emit('removeKey', entry)">删除</a-button>
                </a-space>
              </div>
              <div class="api-key-dialog-field">
                <div class="api-key-dialog-field__label">API Key</div>
                <a-input-password
                  :value="entry.key"
                  readonly
                  visibilityToggle
                  placeholder="当前 API Key 为空"
                  :aria-label="`${entry.name} API Key`"
                />
              </div>
              <div class="api-key-dialog-field">
                <div class="api-key-dialog-field__label">专用请求 URL</div>
                <a-textarea
                  class="api-key-dialog-item__urls"
                  :value="requestUrlDraft(entry)"
                  :rows="2"
                  placeholder="当前 Key 专用请求 URL，每行一个；留空使用下方站点级 URL"
                  :aria-label="`${entry.name} 专用请求 URL`"
                  @update:value="(value: string) => emit('updateEntryRequestUrl', entry, value)"
                />
              </div>
              <div class="api-key-dialog-field">
                <div class="api-key-dialog-field__label">请求路径</div>
                <a-select
                  :value="routePathDraft(entry)"
                  :options="apiKeyRoutePathOptions"
                  :aria-label="`${entry.name} 请求路径`"
                  @update:value="(value: unknown) => emit('updateEntryRoutePath', entry, value)"
                />
              </div>
              <div class="api-key-dialog-item__paths">
                <div class="api-key-dialog-field">
                  <div class="api-key-dialog-field__label">图片生成 Path</div>
                  <a-input
                    :value="imageGenerationPathDraft(entry)"
                    placeholder="当前 Key 生图 Path，可留空"
                    :aria-label="`${entry.name} 图片生成 Path`"
                    @update:value="(value: string) => emit('updateEntryImagePath', entry, 'generation', value)"
                  />
                </div>
                <div class="api-key-dialog-field">
                  <div class="api-key-dialog-field__label">图片编辑 Path</div>
                  <a-input
                    :value="imageEditPathDraft(entry)"
                    placeholder="当前 Key 编辑 Path，可留空"
                    :aria-label="`${entry.name} 图片编辑 Path`"
                    @update:value="(value: string) => emit('updateEntryImagePath', entry, 'edit', value)"
                  />
                </div>
              </div>
            </div>
          </div>
          <a-empty v-else description="当前站点未配置 API Key" />
        </a-space>
      </a-form-item>
      <a-form-item label="添加自定义 API Key">
        <div class="manual-api-key-editor">
          <div class="api-key-dialog-field manual-api-key-editor__name">
            <div class="api-key-dialog-field__label">名称</div>
            <a-input
              v-model:value="manualName"
              placeholder="名称，例如 Claude 备用"
              aria-label="自定义 Key 名称"
            />
          </div>
          <div class="api-key-dialog-field manual-api-key-editor__type">
            <div class="api-key-dialog-field__label">路由类型</div>
            <a-select
              v-model:value="manualRouteType"
              :options="apiKeyRouteTypeOptions"
              aria-label="自定义 Key 路由类型"
            />
          </div>
          <div class="api-key-dialog-field manual-api-key-editor__path">
            <div class="api-key-dialog-field__label">请求路径</div>
            <a-select
              v-model:value="manualRoutePath"
              :options="apiKeyRoutePathOptions"
              aria-label="自定义 Key 请求路径"
            />
          </div>
          <div class="api-key-dialog-field manual-api-key-editor__key">
            <div class="api-key-dialog-field__label">API Key</div>
            <a-input-password
              v-model:value="manualKey"
              placeholder="sk-..."
              autocomplete="new-password"
              aria-label="自定义 API Key"
              @press-enter="emit('addManualKey')"
            />
          </div>
          <div class="api-key-dialog-field manual-api-key-editor__urls">
            <div class="api-key-dialog-field__label">专用请求 URL</div>
            <a-textarea
              v-model:value="manualRequestBaseUrls"
              :rows="2"
              placeholder="当前 Key 专用请求 URL，可留空"
              aria-label="自定义 Key 专用请求 URL"
            />
          </div>
          <div class="api-key-dialog-field manual-api-key-editor__generation">
            <div class="api-key-dialog-field__label">图片生成 Path</div>
            <a-input
              v-model:value="manualImageGenerationPath"
              placeholder="生图 Path，可留空"
              aria-label="自定义 Key 图片生成 Path"
            />
          </div>
          <div class="api-key-dialog-field manual-api-key-editor__edit">
            <div class="api-key-dialog-field__label">图片编辑 Path</div>
            <a-input
              v-model:value="manualImageEditPath"
              placeholder="编辑 Path，可留空"
              aria-label="自定义 Key 图片编辑 Path"
            />
          </div>
          <div class="api-key-dialog-field manual-api-key-editor__action">
            <div class="api-key-dialog-field__label api-key-dialog-field__label--spacer" aria-hidden="true">操作</div>
            <a-button type="primary" @click="emit('addManualKey')">添加</a-button>
          </div>
        </div>
        <small class="field-help">保存后自定义 Key 会与接口同步 Key 同时存在；专用 URL 优先于站点级 URL，适合同一站点 Claude/GPT 走不同 API URL。</small>
      </a-form-item>
      <a-form-item label="请求 API URL 列表">
        <a-textarea
          v-model:value="requestApiUrls"
          :rows="8"
          placeholder="每行一个 URL。网关会按顺序回退，全部失败后再轮转下一个路由。"
          aria-label="请求 API URL 列表"
        />
        <small class="field-help">留空时会继续使用当前默认出口或站点 Base URL。</small>
      </a-form-item>
      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-form-item label="图片生成 Path">
            <a-input
              v-model:value="imageGenerationPath"
              placeholder="/images/generations"
              aria-label="站点图片生成 Path"
            />
            <small class="field-help">纯文本生图接口路径，留空使用默认值。</small>
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item label="图片编辑 Path">
            <a-input
              v-model:value="imageEditPath"
              placeholder="/images/edits"
              aria-label="站点图片编辑 Path"
            />
            <small class="field-help">参考图编辑/融合接口路径，留空使用默认值。</small>
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="当前生效顺序">
        <div class="tag-list">
          <a-tag v-for="url in previewUrls" :key="url" color="processing">
            {{ url }}
          </a-tag>
          <a-tag v-if="!previewUrls.length">暂无可用请求 URL</a-tag>
        </div>
      </a-form-item>
    </a-form>
  </a-modal>
</template>
