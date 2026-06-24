import { request } from './apiCore'
import type {
  ChatImageReference,
  ChatRequestMessage,
  ChatResult,
  ChatSession,
  ChatSessionAppendPayload,
  ChatSessionCreatePayload,
  ChatSessionDetail,
  ChatSessionListResult,
  ChatSessionUpdatePayload,
  McpTestResult,
  ModelListResult,
} from './types'

export const mcpTestUnavailableMessage = 'MCP 测试功能尚未接入 Go 后端。'

export function listToolModels(siteId: number): Promise<ModelListResult> {
  return request('/tools/models', {
    method: 'POST',
    body: JSON.stringify({ site_id: siteId }),
  })
}

export function testChat(payload: {
  base_url?: string
  api_key?: string
  site_id?: number
  route_type?: string
  key_fingerprint?: string
  model: string
  prompt?: string
  mode?: 'chat' | 'image' | 'auto'
  messages?: ChatRequestMessage[]
  reference_images?: ChatImageReference[]
  image_size?: string
  image_generation_path?: string
  image_edit_path?: string
}): Promise<ChatResult> {
  return request('/tools/chat-test', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function listChatSessions(limit = 50): Promise<ChatSessionListResult> {
  return request(`/tools/chat-sessions?limit=${encodeURIComponent(String(limit))}`)
}

export function createChatSession(payload: ChatSessionCreatePayload): Promise<ChatSession> {
  return request('/tools/chat-sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getChatSession(id: number): Promise<ChatSessionDetail> {
  return request(`/tools/chat-sessions/${encodeURIComponent(String(id))}`)
}

export function updateChatSession(id: number, payload: ChatSessionUpdatePayload): Promise<ChatSession> {
  return request(`/tools/chat-sessions/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteChatSession(id: number): Promise<{ status: string }> {
  return request(`/tools/chat-sessions/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  })
}

export function appendChatSessionMessages(id: number, payload: ChatSessionAppendPayload): Promise<ChatSessionDetail> {
  return request(`/tools/chat-sessions/${encodeURIComponent(String(id))}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function testMcp(payload: {
  base_url: string
  api_key: string
  model: string
  prompt: string
  server_label: string
  server_url: string
  allowed_tools: string[]
  require_approval: 'never' | 'always'
}): Promise<McpTestResult> {
  void payload
  return Promise.reject(new Error(mcpTestUnavailableMessage))
}
