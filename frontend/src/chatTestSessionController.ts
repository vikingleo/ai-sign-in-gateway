import { computed, ref, type ComputedRef, type Ref } from 'vue'
import {
  createChatSession,
  deleteChatSession,
  getChatSession,
  listChatSessions,
  updateChatSession,
} from './api'
import {
  chatSessionMessageToView,
  viewMessageToChatSessionPayload,
} from './chatSessionState'
import {
  buildChatSessionPayload,
  type ChatMessage,
  type ChatMode,
} from './chatTestModel'
import type { ChatImageReference, ChatSession, ModelListItem, Site } from './types'

type ChatSessionForm = {
  input: string
  image_size: string
  image_width: number
  image_height: number
}

type Toast = {
  error: (message: string) => void
  success: (message: string) => void
  info: (message: string) => void
}

type ChatTestSessionOptions = {
  form: ChatSessionForm
  messages: Ref<ChatMessage[]>
  loading: Ref<boolean>
  referenceImages: Ref<ChatImageReference[]>
  selectedSiteId: Ref<string | undefined>
  selectedSite: ComputedRef<Site | null>
  selectedModel: ComputedRef<ModelListItem | null>
  activeMode: ComputedRef<ChatMode>
  toast: Toast
  scrollToBottom: () => Promise<void>
  stopAllActivityTimers: () => void
  syncImageSizeFromDimensions: () => void
  detectImageRatio: () => void
  applySelectedSite: (preferredModel?: Pick<ModelListItem, 'id' | 'route_type' | 'key_fingerprint'>) => Promise<void>
}

export function useChatTestSessionController(options: ChatTestSessionOptions) {
  const sessionsLoading = ref(false)
  const restoringSession = ref(false)
  const deletingSessionIds = ref<number[]>([])
  const chatSessions = ref<ChatSession[]>([])
  const activeSessionId = ref<number | null>(null)
  const activeSession = computed(() => chatSessions.value.find((item) => item.id === activeSessionId.value) ?? null)

  function currentSessionPayload(title?: string) {
    return buildChatSessionPayload({
      title,
      messages: options.messages.value,
      input: options.form.input,
      selectedSiteId: options.selectedSiteId.value,
      site: options.selectedSite.value,
      model: options.selectedModel.value,
      mode: options.activeMode.value,
      imageSize: options.form.image_size,
      imageWidth: options.form.image_width,
      imageHeight: options.form.image_height,
    })
  }

  async function loadChatSessions() {
    sessionsLoading.value = true
    try {
      const result = await listChatSessions(80)
      chatSessions.value = result.items
      if (activeSessionId.value && !chatSessions.value.some((item) => item.id === activeSessionId.value)) {
        activeSessionId.value = null
      }
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '会话历史加载失败')
    } finally {
      sessionsLoading.value = false
    }
  }

  async function ensureActiveSession(titleSeed: string) {
    if (activeSessionId.value) {
      return activeSessionId.value
    }
    const session = await createChatSession(currentSessionPayload(titleSeed))
    activeSessionId.value = session.id
    chatSessions.value = [session, ...chatSessions.value.filter((item) => item.id !== session.id)]
    return session.id
  }

  async function refreshActiveSessionMeta() {
    if (!activeSessionId.value) return
    try {
      const session = await updateChatSession(activeSessionId.value, currentSessionPayload(activeSession.value?.title))
      chatSessions.value = [session, ...chatSessions.value.filter((item) => item.id !== session.id)]
    } catch {
      await loadChatSessions()
    }
  }

  function resetCurrentSessionState() {
    options.stopAllActivityTimers()
    activeSessionId.value = null
    options.messages.value = []
    options.referenceImages.value = []
    options.form.input = ''
  }

  function startNewSession() {
    if (!options.messages.value.length && !options.referenceImages.value.length && !options.form.input.trim() && !activeSessionId.value) {
      options.toast.info('当前已经是新会话。')
      return
    }
    resetCurrentSessionState()
    options.toast.success('已新建空白会话。')
  }

  async function restoreChatSession(id: number) {
    if (options.loading.value) {
      options.toast.error('请求发送中，稍后再切换会话。')
      return
    }
    restoringSession.value = true
    try {
      const detail = await getChatSession(id)
      options.stopAllActivityTimers()
      activeSessionId.value = detail.id
      options.messages.value = detail.messages.map((item) => chatSessionMessageToView(item))
      options.referenceImages.value = []
      if (detail.image_width > 0) options.form.image_width = detail.image_width
      if (detail.image_height > 0) options.form.image_height = detail.image_height
      options.syncImageSizeFromDimensions()
      options.detectImageRatio()
      if (detail.site_id) {
        options.selectedSiteId.value = String(detail.site_id)
        const preferredModel = detail.model
          ? {
            id: detail.model,
            route_type: detail.route_type,
            key_fingerprint: detail.key_fingerprint,
          }
          : undefined
        await options.applySelectedSite(preferredModel)
      }
      await options.scrollToBottom()
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '会话恢复失败')
    } finally {
      restoringSession.value = false
    }
  }

  async function removeChatSession(session: ChatSession) {
    if (options.loading.value && activeSessionId.value === session.id) {
      options.toast.error('当前会话请求发送中，稍后再删除。')
      return
    }
    deletingSessionIds.value = [...deletingSessionIds.value, session.id]
    try {
      await deleteChatSession(session.id)
      chatSessions.value = chatSessions.value.filter((item) => item.id !== session.id)
      if (activeSessionId.value === session.id) {
        resetCurrentSessionState()
      }
      options.toast.success('会话已删除。')
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '会话删除失败')
    } finally {
      deletingSessionIds.value = deletingSessionIds.value.filter((id) => id !== session.id)
    }
  }

  function appendPersistedSession(session: ChatSession) {
    chatSessions.value = [session, ...chatSessions.value.filter((item) => item.id !== session.id)]
  }

  return {
    sessionsLoading,
    restoringSession,
    deletingSessionIds,
    chatSessions,
    activeSessionId,
    activeSession,
    currentSessionPayload,
    loadChatSessions,
    ensureActiveSession,
    refreshActiveSessionMeta,
    startNewSession,
    restoreChatSession,
    removeChatSession,
    appendPersistedSession,
    viewMessageToChatSessionPayload,
  }
}
