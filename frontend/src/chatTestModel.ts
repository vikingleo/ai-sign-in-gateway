import { ApiError } from './api'
import { normalizeChatSessionTitle } from './chatSessionState'
import type { ChatImageReference, ChatRequestMessage, ChatResult, ChatSessionCreatePayload, ModelListItem, Site } from './types'

export type MessageRole = 'system' | 'user' | 'assistant'
export type MessageStatus = 'idle' | 'sending' | 'done' | 'error'
export type ChatMode = 'chat' | 'image'

export interface ChatActivity {
  label: string
  active: boolean
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  status: MessageStatus
  latencyMs?: number | null
  statusCode?: number | null
  error?: string
  references?: ChatImageReference[]
  images?: ChatImageReference[]
  mode?: ChatMode
  activity?: ChatActivity
}

export const maxReferenceImages = 5

export const imageRatioPresets = [
  { label: '1:1', width: 1, height: 1 },
  { label: '3:4', width: 3, height: 4 },
  { label: '4:3', width: 4, height: 3 },
  { label: '16:9', width: 16, height: 9 },
  { label: '9:16', width: 9, height: 16 },
]

export function newID(prefix = 'msg') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function modelOptionValue(model: ModelListItem) {
  return `${model.id}\u0000${model.route_type}\u0000${model.key_fingerprint}\u0000${model.base_url}`
}

export function modelOptionLabel(model: ModelListItem) {
  const mode = model.mode === 'image' ? '图片' : '对话'
  const key = model.key_name || shortFingerprint(model.key_fingerprint)
  return [model.id, mode, routeTypeLabel(model.route_type), key].filter(Boolean).join(' / ')
}

export function routeTypeLabel(routeType: string) {
  if (routeType === 'claude') return 'Claude'
  if (routeType === 'gpt') return 'GptChat'
  if (routeType === 'codex') return 'Codex Responses'
  if (routeType === 'gemini') return 'Gemini'
  return 'OpenAI'
}

export function shortFingerprint(value: string) {
  return value ? `Key ${value.slice(0, 8)}` : ''
}

export function formatSessionTime(value: string) {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function clampImageDimension(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 100
  }
  return Math.min(4096, Math.max(100, Math.round(parsed)))
}

export function normalizedRatioLabel(width: number, height: number) {
  width = clampImageDimension(width)
  height = clampImageDimension(height)
  const divisor = gcd(width, height)
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`
}

export function chooseDefaultModel(items: ModelListItem[]) {
  return (
    items.find((item) => item.id === 'gpt-4o-mini') ??
    items.find((item) => item.id === 'gpt-image-2') ??
    items.find((item) => item.mode !== 'image') ??
    items[0] ??
    null
  )
}

export function modelListMessage(message: string, statusCode?: number | null) {
  const text = message || '模型列表加载失败'
  if (statusCode === 404) {
    return `${text}。上游模型列表接口返回 404，请检查站点的 API 请求 URL 是否是模型请求根地址，例如 https://example.com/v1 或 https://example.com。`
  }
  return text
}

export function modelListExceptionMessage(err: unknown) {
  if (err instanceof ApiError && err.status === 404) {
    return '模型列表接口 404：当前运行的后端尚未包含 /api/tools/models，或前端 API_BASE 指向了旧实例。请重启最新后端/二进制后再试。'
  }
  return err instanceof Error ? err.message : '模型列表加载失败'
}

export function readableLatency(value: number | null | undefined) {
  return value === null || value === undefined ? '' : `${Math.round(value)} ms`
}

export function imageSource(image: ChatImageReference) {
  return image.url
}

export function resultImages(result: ChatResult): ChatImageReference[] {
  return (result.images ?? [])
    .map((item, index) => ({
      name: `生成图 ${index + 1}`,
      url: item.url || (item.b64_json ? `data:image/png;base64,${item.b64_json}` : ''),
    }))
    .filter((item) => item.url)
}

export function createChatUserMessage(content: string, refs: ChatImageReference[]): ChatMessage {
  return {
    id: newID('user'),
    role: 'user',
    content,
    references: refs,
    createdAt: new Date().toISOString(),
    status: 'done',
  }
}

export function createChatAssistantMessage(mode: ChatMode): ChatMessage {
  return {
    id: newID('assistant'),
    role: 'assistant',
    content: mode === 'image' ? '正在生成图片...' : '正在思考...',
    createdAt: new Date().toISOString(),
    status: 'sending',
    mode,
  }
}

export function toRequestMessages(messages: ChatMessage[]): ChatRequestMessage[] {
  return messages
    .filter((item) => item.role === 'user' || item.role === 'assistant')
    .filter((item) => item.status === 'done' && (item.content.trim() || item.references?.length))
    .map((item) => ({
      role: item.role,
      content: item.content,
      reference_images: item.references ?? [],
    }))
}

export function buildChatSessionPayload(options: {
  title?: string
  messages: ChatMessage[]
  input: string
  selectedSiteId?: string
  site: Site | null
  model: ModelListItem | null
  mode: ChatMode
  imageSize: string
  imageWidth: number
  imageHeight: number
}): ChatSessionCreatePayload {
  const titleSeed =
    options.title ??
    options.messages.find((item) => item.role === 'user' && item.content.trim())?.content ??
    options.input
  return {
    title: normalizeChatSessionTitle(titleSeed),
    site_id: options.selectedSiteId ? Number(options.selectedSiteId) : null,
    site_name: options.site?.name ?? '',
    model: options.model?.id ?? '',
    mode: options.mode,
    route_type: options.model?.route_type ?? '',
    key_fingerprint: options.model?.key_fingerprint ?? '',
    key_name: options.model?.key_name ?? '',
    image_size: options.imageSize,
    image_width: options.imageWidth,
    image_height: options.imageHeight,
  }
}

export function activitySteps(mode: ChatMode, refs: ChatImageReference[]) {
  if (mode === 'image') {
    return refs.length ? ['Read', 'Edit', 'Generate'] : ['Thinking', 'Generate']
  }
  return refs.length ? ['Read', 'Thinking', 'Respond'] : ['Thinking', 'Respond']
}

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a))
  b = Math.abs(Math.round(b))
  while (b) {
    const next = a % b
    a = b
    b = next
  }
  return a || 1
}
