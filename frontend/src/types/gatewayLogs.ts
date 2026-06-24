export interface GatewayLog {
  id: number
  request_id: string
  route_id: number | null
  route_label: string
  site_id: number | null
  site_name: string | null
  key_name: string
  key_fingerprint: string
  group_name: string
  route_type?: string
  target_path: string
  request_url: string
  user_agent: string
  method: string
  route_strategy: string
  attempt_index: number
  status_code: number | null
  success: boolean
  latency_ms: number | null
  prompt_tokens: number | null
  cached_input_tokens: number | null
  cache_read_tokens?: number | null
  cache_write_tokens?: number | null
  completion_tokens: number | null
  total_tokens: number | null
  usage_cost: number | null
  model: string
  requested_model?: string
  actual_model?: string
  circuit_state_before: string
  failure_reason: string | null
  is_stream: boolean
  created_at: string
  related_attempt_count?: number
  transfer_to?: GatewayLogAttempt | null
  final_attempt?: GatewayLogAttempt | null
  previous_error?: GatewayLogAttempt | null
}

export interface GatewayLogAttempt {
  id: number
  request_id: string
  route_id: number | null
  route_label: string
  site_id: number | null
  site_name: string | null
  key_name: string
  key_fingerprint: string
  route_type?: string
  target_path: string
  request_url: string
  method: string
  attempt_index: number
  status_code: number | null
  success: boolean
  failure_reason: string | null
  created_at: string
}

export interface GatewayActiveRequest {
  id: string
  request_id: string
  route_id: number
  site_id: number
  route_label: string
  site_name: string
  key_name: string
  key_fingerprint: string
  group_name: string
  target_path: string
  request_url: string
  method: string
  route_strategy: string
  attempt_index: number
  is_stream: boolean
  route_type: 'claude' | 'gpt' | 'codex' | 'gemini' | string
  requested_model?: string
  actual_model?: string
  request_base_url: string
  active_concurrency: number
  started_at: string
  elapsed_ms: number
  finished_at?: string
  recent: boolean
  success?: boolean | null
  status_code?: number | null
  failure_kind?: string
  failure_reason?: string | null
  related_attempt_count?: number
  transfer_to?: GatewayLogAttempt | null
  final_attempt?: GatewayLogAttempt | null
  previous_error?: GatewayLogAttempt | null
}
