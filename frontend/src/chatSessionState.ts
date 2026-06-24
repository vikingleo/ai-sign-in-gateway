import type { ChatImageReference, ChatSessionMessage, ChatSessionMessagePayload } from './types'

export type ChatSessionViewRole = 'system' | 'user' | 'assistant'
export type ChatSessionViewStatus = 'idle' | 'sending' | 'done' | 'error'
export type ChatSessionViewMode = 'chat' | 'image'

export interface ChatSessionViewMessage {
  id: string
  role: ChatSessionViewRole
  content: string
  createdAt: string
  status: ChatSessionViewStatus
  latencyMs?: number | null
  statusCode?: number | null
  error?: string
  references?: ChatImageReference[]
  images?: ChatImageReference[]
  mode?: ChatSessionViewMode
}

export function normalizeChatSessionTitle(value: string, fallback = '新会话') {
  const title = value.trim().replace(/\s+/g, ' ')
  const safe = title || fallback
  return safe.length > 48 ? `${safe.slice(0, 45)}...` : safe
}

export function chatSessionPreview(value: string, fallback = '暂无消息') {
  const preview = value.trim().replace(/\s+/g, ' ')
  return preview || fallback
}

export function chatSessionMessageToView(message: ChatSessionMessage): ChatSessionViewMessage {
  return {
    id: `stored-${message.id}`,
    role: normalizeRole(message.role),
    content: message.content,
    createdAt: message.created_at,
    status: normalizeStatus(message.status),
    latencyMs: message.latency_ms,
    statusCode: message.status_code,
    error: message.error || undefined,
    references: message.reference_images ?? [],
    images: message.images ?? [],
    mode: normalizeMode(message.mode),
  }
}

export function viewMessageToChatSessionPayload(message: ChatSessionViewMessage): ChatSessionMessagePayload {
  return {
    role: normalizeRole(message.role),
    content: message.content,
    status: normalizeStatus(message.status),
    mode: message.mode ?? '',
    latency_ms: message.latencyMs ?? null,
    status_code: message.statusCode ?? null,
    error: message.error ?? '',
    reference_images: message.references ?? [],
    images: message.images ?? [],
    created_at: message.createdAt,
  }
}

function normalizeRole(value: string): ChatSessionViewRole {
  if (value === 'system' || value === 'assistant' || value === 'user') return value
  return 'user'
}

function normalizeStatus(value: string): ChatSessionViewStatus {
  if (value === 'idle' || value === 'sending' || value === 'done' || value === 'error') return value
  return 'done'
}

function normalizeMode(value: string): ChatSessionViewMode | undefined {
  if (value === 'chat' || value === 'image') return value
  return undefined
}
