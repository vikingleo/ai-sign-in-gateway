export interface ModelListItem {
  id: string
  route_type: 'claude' | 'gpt' | 'codex' | 'gemini' | string
  mode: 'chat' | 'image' | string
  base_url: string
  key_fingerprint: string
  key_name: string
  image_generation_path?: string
  image_edit_path?: string
}

export interface ModelListResult {
  ok: boolean
  status_code: number | null
  latency_ms: number | null
  message: string
  models: string[]
  items: ModelListItem[]
  base_url: string
  route_type: string
  key_fingerprint: string
  key_name: string
}

export interface ChatResult {
  ok: boolean
  status_code: number | null
  latency_ms: number | null
  message: string
  output: string
  images?: ChatImageOutput[]
  revised_prompt?: string
}

export interface ChatImageReference {
  name: string
  url: string
}

export interface ChatRequestMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  reference_images?: ChatImageReference[]
}

export interface ChatImageOutput {
  url: string
  b64_json: string
  revised_prompt: string
}

export interface ChatSession {
  id: number
  title: string
  site_id?: number | null
  site_name: string
  model: string
  mode: 'chat' | 'image' | string
  route_type: string
  key_fingerprint: string
  key_name: string
  image_size: string
  image_width: number
  image_height: number
  message_count: number
  last_message_text: string
  created_at: string
  updated_at: string
}

export interface ChatSessionMessage {
  id: number
  session_id: number
  seq: number
  role: 'system' | 'user' | 'assistant' | string
  content: string
  status: 'idle' | 'sending' | 'done' | 'error' | string
  mode: 'chat' | 'image' | string
  latency_ms: number | null
  status_code: number | null
  error: string
  reference_images: ChatImageReference[]
  images: ChatImageReference[]
  created_at: string
  updated_at: string
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatSessionMessage[]
}

export interface ChatSessionListResult {
  items: ChatSession[]
  count: number
}

export interface ChatSessionCreatePayload {
  title?: string
  site_id?: number | null
  site_name?: string
  model?: string
  mode?: 'chat' | 'image' | string
  route_type?: string
  key_fingerprint?: string
  key_name?: string
  image_size?: string
  image_width?: number
  image_height?: number
}

export type ChatSessionUpdatePayload = Partial<ChatSessionCreatePayload>

export interface ChatSessionMessagePayload {
  role: 'system' | 'user' | 'assistant'
  content: string
  status: 'idle' | 'sending' | 'done' | 'error'
  mode?: 'chat' | 'image' | ''
  latency_ms?: number | null
  status_code?: number | null
  error?: string
  reference_images?: ChatImageReference[]
  images?: ChatImageReference[]
  created_at?: string
}

export interface ChatSessionAppendPayload {
  messages: ChatSessionMessagePayload[]
}

export interface McpTestResult {
  ok: boolean
  status_code: number | null
  latency_ms: number | null
  message: string
  output: string
  raw_excerpt: string
  tool_events: string[]
}
