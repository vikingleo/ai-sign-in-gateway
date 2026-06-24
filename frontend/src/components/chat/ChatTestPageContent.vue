<script setup lang="ts">
import {
  ClearOutlined,
  DeleteOutlined,
  DownOutlined,
  LockOutlined,
  PaperClipOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  UnlockOutlined,
} from '@ant-design/icons-vue'
import type { ChatTestController } from '../../chatTestController'

defineProps<{
  view: ChatTestController
}>()
</script>

<template>
  <div class="chat-workbench">
    <main class="session-main">
      <div :ref="view.setScrollBody" class="session-history">
        <div v-if="view.visibleMessages.length" class="session-message-list">
          <article
            v-for="message in view.visibleMessages"
            :key="message.id"
            class="session-message"
            :class="[`session-message--${message.role}`, `session-message--${message.status}`]"
          >
            <div v-if="message.role === 'assistant' && message.activity" class="session-message__thought">
              处理耗时 {{ view.readableLatency(message.latencyMs) || '...' }}
            </div>

            <div class="session-message__bubble">
              <p v-if="message.content" class="session-message__text">{{ message.content }}</p>
              <div v-if="message.references?.length" class="session-reference-strip">
                <div v-for="image in message.references" :key="image.url" class="session-reference-card">
                  <img :src="view.imageSource(image)" :alt="image.name" />
                </div>
              </div>
              <div v-if="message.images?.length" class="session-generated-grid">
                <a v-for="image in message.images" :key="image.url" :href="view.imageSource(image)" target="_blank" rel="noopener noreferrer">
                  <img :src="view.imageSource(image)" :alt="image.name" />
                </a>
              </div>
              <div v-if="message.error" class="session-message__error">{{ message.error }}</div>
            </div>
          </article>
        </div>

        <div v-else class="session-empty">
          <div class="session-empty__copy">
            <h1>选择站点与模型后开始使用</h1>
            <p>文本对话与图片生成能力将根据所选模型自动启用。</p>
          </div>
        </div>
      </div>

      <footer class="session-composer">
        <a-alert
          v-if="view.modelLoadMessage && (!view.selectedModelMeta || view.modelLoadError)"
          class="session-composer__alert"
          :type="view.modelLoadAlertType"
          show-icon
          :message="view.modelLoadMessage"
        />

        <div class="session-composer__controls">
          <a-select
            v-model:value="view.selectedSiteId"
            class="session-toolbar__select"
            :options="view.siteOptions"
            aria-label="选择站点"
            allow-clear
            show-search
            option-filter-prop="label"
            placeholder="选择站点"
            @change="view.handleSiteChange"
          >
            <template #suffixIcon><DownOutlined aria-hidden="true" /></template>
          </a-select>

          <a-select
            v-model:value="view.form.model_key"
            class="session-toolbar__select session-toolbar__select--model"
            :options="view.modelOptions"
            aria-label="选择模型"
            :loading="view.modelsLoading"
            :disabled="!view.selectedSite || view.modelsLoading"
            allow-clear
            show-search
            option-filter-prop="label"
            placeholder="选择模型"
          >
            <template #suffixIcon><DownOutlined aria-hidden="true" /></template>
          </a-select>

          <div v-if="view.activeMode === 'image'" class="image-size-editor session-composer__image-size">
            <div class="image-ratio-presets" aria-label="图片比例快捷设置">
              <button
                v-for="preset in view.imageRatioPresets"
                :key="preset.label"
                type="button"
                class="image-ratio-preset"
                :class="{
                  'is-active': view.activeImageRatio === preset.label,
                  'is-detected': !view.imageRatioLocked && view.detectedImageRatio === preset.label,
                  'is-locked': view.imageRatioLocked && view.lockedImageRatio === preset.label,
                }"
                @click="view.applyImageRatioPreset(preset)"
              >
                <span class="image-ratio-preset__box" :style="{ aspectRatio: `${preset.width} / ${preset.height}` }"></span>
                <span>{{ preset.label }}</span>
              </button>
            </div>
            <a-input-number
              :value="view.form.image_width"
              :min="100"
              :max="4096"
              :step="1"
              addon-before="宽"
              aria-label="图片宽度"
              @change="view.handleImageWidthChange"
            />
            <a-input-number
              :value="view.form.image_height"
              :min="100"
              :max="4096"
              :step="1"
              addon-before="高"
              aria-label="图片高度"
              @change="view.handleImageHeightChange"
            />
            <a-tooltip :title="view.imageRatioTooltip">
              <a-button
                class="image-size-editor__lock"
                :type="view.imageRatioLocked ? 'primary' : 'default'"
                :aria-label="view.imageRatioLocked ? '解除图片比例锁定' : '锁定图片比例'"
                @click="view.toggleImageRatioLock"
              >
                <template #icon>
                  <LockOutlined v-if="view.imageRatioLocked" aria-hidden="true" />
                  <UnlockOutlined v-else aria-hidden="true" />
                </template>
              </a-button>
            </a-tooltip>
          </div>

          <button
            type="button"
            class="session-clear-button"
            aria-label="清空会话"
            :disabled="!view.visibleMessages.length && !view.referenceImages.length"
            @click="view.clearConversation"
          >
            <ClearOutlined aria-hidden="true" />
            <span class="session-clear-button__text">清空会话</span>
          </button>
        </div>

        <div v-if="view.referenceImages.length" class="session-attachments">
          <div v-for="(image, index) in view.referenceImages" :key="image.url" class="session-attachment">
            <img :src="view.imageSource(image)" :alt="image.name" />
            <span>{{ image.name }}</span>
            <button type="button" title="移除参考图" aria-label="移除参考图" @click="view.removeReferenceImage(index)">
              <DeleteOutlined aria-hidden="true" />
            </button>
          </div>
        </div>

        <input
          id="chat-reference-images"
          :ref="view.bindFileInput"
          class="chat-file-input"
          type="file"
          name="chat_reference_images"
          accept="image/*"
          multiple
          hidden
          tabindex="-1"
          @change="view.addReferenceImages"
        >

        <div class="session-composer__frame">
          <button type="button" class="session-tool-button" :disabled="view.loading" title="添加参考图" aria-label="添加参考图" @click="view.triggerImagePicker">
            <PaperClipOutlined aria-hidden="true" />
          </button>

          <a-textarea
            id="chat-message-input"
            v-model:value="view.form.input"
            class="session-composer__input"
            name="chat_message_input"
            aria-label="聊天消息输入"
            :auto-size="{ minRows: 2, maxRows: 5 }"
            :placeholder="view.sendPlaceholder"
            @keydown="view.handleEditorKeydown"
          />

          <div class="session-composer__side">
            <button type="button" class="session-send-button" :disabled="view.loading" @click="view.sendMessage">
              <SendOutlined aria-hidden="true" />
              <span>{{ view.loading ? '发送中' : '发送请求' }}</span>
            </button>
            <span class="session-footnote">{{ view.referenceImages.length }}/{{ view.maxReferenceImages }} 张参考图</span>
          </div>
        </div>
      </footer>
    </main>

    <aside class="session-sidebar">
      <div class="session-sidebar__header">
        <div>
          <strong>会话历史</strong>
          <span>{{ view.chatSessions.length }} 条记录</span>
        </div>
        <div class="session-sidebar__actions">
          <button type="button" title="新建会话" aria-label="新建会话" @click="view.startNewSession">
            <PlusOutlined aria-hidden="true" />
          </button>
          <button type="button" title="刷新历史" aria-label="刷新历史" :disabled="view.sessionsLoading" @click="view.loadChatSessions">
            <ReloadOutlined aria-hidden="true" />
          </button>
        </div>
      </div>

      <div class="session-sidebar__list" :class="{ 'is-loading': view.sessionsLoading || view.restoringSession }">
        <div
          v-for="session in view.chatSessions"
          :key="session.id"
          class="session-history-item"
          :class="{ 'is-active': session.id === view.activeSessionId }"
        >
          <button type="button" class="session-history-item__main" @click="view.restoreChatSession(session.id)">
            <span class="session-history-item__title">{{ session.title }}</span>
            <span class="session-history-item__preview">{{ view.chatSessionPreview(session.last_message_text) }}</span>
            <span class="session-history-item__meta">
              <span>{{ session.model || '未选模型' }}</span>
              <span>{{ view.formatSessionTime(session.updated_at) }}</span>
            </span>
          </button>
          <a-popconfirm
            title="确认删除该会话？"
            ok-text="删除"
            cancel-text="保留"
            @confirm="view.removeChatSession(session)"
          >
            <button
              type="button"
              class="session-history-delete"
              :disabled="view.deletingSessionIds.includes(session.id)"
              title="删除会话"
              aria-label="删除会话"
            >
              <DeleteOutlined aria-hidden="true" />
            </button>
          </a-popconfirm>
        </div>

        <a-empty v-if="!view.chatSessions.length && !view.sessionsLoading" description="暂无会话" />
      </div>
    </aside>
  </div>
</template>
