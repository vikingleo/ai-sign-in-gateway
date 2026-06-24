import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, type ComponentPublicInstance } from 'vue'
import {
  appendChatSessionMessages,
  testChat,
} from './api'
import { chatSessionPreview } from './chatSessionState'
import { useChatTestImageController } from './chatTestImageController'
import { useChatTestModelSelectionController } from './chatTestModelSelectionController'
import { useChatTestSessionController } from './chatTestSessionController'
import {
  activitySteps,
  createChatAssistantMessage,
  createChatUserMessage,
  formatSessionTime,
  imageRatioPresets,
  imageSource,
  maxReferenceImages,
  readableLatency,
  resultImages,
  toRequestMessages,
  type ChatMessage,
  type ChatMode,
} from './chatTestModel'
import { useToast } from './toast'
import type { ChatImageReference, ModelListItem } from './types'

export function useChatTestController() {
  const toast = useToast()
  const form = reactive({
    input: '',
    model_key: undefined as string | undefined,
    image_size: '1024x1024',
    image_width: 1024,
    image_height: 1024,
  })
  const loading = ref(false)
  const messages = ref<ChatMessage[]>([])
  const scrollBody = ref<HTMLElement | null>(null)
  const activityTimers = new Map<string, number>()
  const visibleMessages = computed(() => messages.value.filter((item) => item.role !== 'system'))

  const modelSelection = useChatTestModelSelectionController({ form, toast })
  const imageControls = useChatTestImageController({
    form,
    activeMode: modelSelection.activeMode,
    toast,
  })
  const sessions = useChatTestSessionController({
    form,
    messages,
    loading,
    referenceImages: imageControls.referenceImages,
    selectedSiteId: modelSelection.selectedSiteId,
    selectedSite: modelSelection.selectedSite,
    selectedModel: modelSelection.selectedModel,
    activeMode: modelSelection.activeMode,
    toast,
    scrollToBottom,
    stopAllActivityTimers,
    syncImageSizeFromDimensions: imageControls.syncImageSizeFromDimensions,
    detectImageRatio: imageControls.detectImageRatio,
    applySelectedSite: modelSelection.applySelectedSite,
  })

  function setScrollBody(element: Element | ComponentPublicInstance | null) {
    scrollBody.value = element instanceof HTMLElement ? element : null
  }

  async function scrollToBottom() {
    await nextTick()
    if (scrollBody.value) {
      scrollBody.value.scrollTop = scrollBody.value.scrollHeight
    }
  }

  function clearConversation() {
    if (!messages.value.length && !imageControls.referenceImages.value.length) {
      toast.info('当前会话已为空。')
      return
    }
    stopAllActivityTimers()
    messages.value = []
    imageControls.referenceImages.value = []
    toast.success('会话内容已清空。')
  }

  function stopActivityTimer(messageID: string) {
    const timer = activityTimers.get(messageID)
    if (timer !== undefined) {
      window.clearInterval(timer)
      activityTimers.delete(messageID)
    }
  }

  function stopAllActivityTimers() {
    activityTimers.forEach((timer) => window.clearInterval(timer))
    activityTimers.clear()
  }

  function startMessageActivity(message: ChatMessage, steps: string[]) {
    stopActivityTimer(message.id)
    const labels = steps.length ? steps : ['Thinking']
    let index = 0
    message.activity = { label: labels[index], active: true }
    if (labels.length <= 1) {
      return
    }
    activityTimers.set(message.id, window.setInterval(() => {
      index = (index + 1) % labels.length
      message.activity = { label: labels[index], active: true }
    }, 1800))
  }

  function finishMessageActivity(message: ChatMessage, label: string) {
    stopActivityTimer(message.id)
    message.activity = { label, active: false }
  }

  async function sendMessage() {
    const content = form.input.trim()
    if (!content && !imageControls.referenceImages.value.length) {
      toast.error('请输入消息或添加参考图。')
      return
    }
    const model = modelSelection.selectedModel.value
    if (!modelSelection.selectedSiteId.value || !model) {
      toast.error('请先选择站点和模型。')
      return
    }
    const requestMode: ChatMode = model.mode === 'image' ? 'image' : 'chat'
    const refs = imageControls.referenceImages.value.map((item) => ({ ...item }))
    const sessionID = await createOrReportSession(content || '图片会话')
    if (!sessionID) return

    const userMessage = createChatUserMessage(content, refs)
    const assistantMessage = reactive<ChatMessage>(createChatAssistantMessage(requestMode))
    messages.value.push(userMessage, assistantMessage)
    startMessageActivity(assistantMessage, activitySteps(requestMode, refs))
    form.input = ''
    imageControls.referenceImages.value = []
    await scrollToBottom()
    loading.value = true

    try {
      await executeRequest({ content, model, requestMode, refs, assistantMessage })
    } finally {
      await persistMessages(sessionID, userMessage, assistantMessage)
      loading.value = false
      await scrollToBottom()
    }
  }

  async function createOrReportSession(titleSeed: string) {
    try {
      const sessionID = await sessions.ensureActiveSession(titleSeed)
      await sessions.refreshActiveSessionMeta()
      return sessionID
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '会话创建失败')
      return null
    }
  }

  async function executeRequest(options: {
    content: string
    model: ModelListItem
    requestMode: ChatMode
    refs: ChatImageReference[]
    assistantMessage: ChatMessage
  }) {
    const requestMessages = options.requestMode === 'chat' ? toRequestMessages(messages.value) : undefined
    try {
      const result = await testChat({
        site_id: Number(modelSelection.selectedSiteId.value),
        route_type: options.model.route_type,
        key_fingerprint: options.model.key_fingerprint,
        model: options.model.id,
        mode: 'auto',
        prompt: options.content,
        messages: requestMessages,
        reference_images: options.refs,
        image_size: options.requestMode === 'image' ? form.image_size : undefined,
        image_generation_path: options.requestMode === 'image' ? options.model.image_generation_path : undefined,
        image_edit_path: options.requestMode === 'image' ? options.model.image_edit_path : undefined,
      })
      applyResult(options.assistantMessage, options.requestMode, result)
      toast.success(result.ok ? '请求完成。' : result.message)
    } catch (err) {
      options.assistantMessage.status = 'error'
      options.assistantMessage.content = err instanceof Error ? err.message : '请求失败'
      options.assistantMessage.error = options.assistantMessage.content
      finishMessageActivity(options.assistantMessage, 'Error')
      toast.error(options.assistantMessage.content)
    }
  }

  function applyResult(message: ChatMessage, requestMode: ChatMode, result: Awaited<ReturnType<typeof testChat>>) {
    message.status = result.ok ? 'done' : 'error'
    message.statusCode = result.status_code
    message.latencyMs = result.latency_ms
    message.error = result.ok ? undefined : result.message
    if (requestMode === 'image') {
      message.images = resultImages(result)
      message.content = message.images.length
        ? (result.revised_prompt ? `已生成图片。优化提示词：${result.revised_prompt}` : '已生成图片。')
        : result.message
    } else {
      message.content = result.output || result.message || '接口未返回可读文本。'
    }
    finishMessageActivity(message, result.ok ? 'Done' : 'Error')
  }

  async function persistMessages(sessionID: number, userMessage: ChatMessage, assistantMessage: ChatMessage) {
    try {
      const persisted = await appendChatSessionMessages(sessionID, {
        messages: [
          sessions.viewMessageToChatSessionPayload(userMessage),
          sessions.viewMessageToChatSessionPayload(assistantMessage),
        ],
      })
      const { messages: _messages, ...session } = persisted
      sessions.appendPersistedSession(session)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '会话保存失败')
    }
  }

  function handleEditorKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!loading.value) {
        void sendMessage()
      }
    }
  }

  onMounted(() => {
    void modelSelection.loadSites()
    void sessions.loadChatSessions()
  })

  onBeforeUnmount(() => {
    stopAllActivityTimers()
  })

  return reactive({
    form,
    loading,
    messages,
    visibleMessages,
    imageRatioPresets,
    maxReferenceImages,
    readableLatency,
    imageSource,
    chatSessionPreview,
    formatSessionTime,
    setScrollBody,
    clearConversation,
    sendMessage,
    handleEditorKeydown,
    ...modelSelection,
    ...imageControls,
    ...sessions,
  })
}

export type ChatTestController = ReturnType<typeof useChatTestController>
