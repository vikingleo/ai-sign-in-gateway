export interface GatewaySettingsData {
  route_strategy: 'round_robin' | 'latency_first' | 'priority' | 'smart'
  failure_threshold: number
  cooldown_seconds: number
  request_timeout: number
  max_attempts: number
  failure_retry_mode: 'retryable' | 'all'
  route_concurrency_limit: number
  concurrency_transfer_strategy: 'limit_only' | 'balance'
  concurrency_overflow_strategy: 'latency_first' | 'sequential'
  smart_latency_bias: number
  smart_concurrency_bias: number
  smart_failure_bias: number
  smart_priority_bias: number
  gateway_api_key: string
}

export interface GatewayRoute {
  id: number
  site_id: number
  site_name: string
  base_url: string
  request_base_url: string
  request_base_urls?: string[]
  manual_request_base_urls?: string[]
  last_request_base_url?: string
  site_name_snapshot?: string
  site_base_url_snapshot?: string
  site_missing?: boolean
  has_api_key?: boolean
  group_name: string
  groups?: GatewayRouteGroup[]
  supported_models: string[]
  last_balance?: number | null
  balance_display?: string | null
  balance_unit?: string | null
  balance_probe_url?: string | null
  package_remaining?: number | null
  package_total?: number | null
  package_used?: number | null
  package_unit?: string | null
  package_display?: string | null
  checkin_status?: string | null
  key_name: string
  key_fingerprint: string
  key_source: string
  route_type: 'general' | 'claude' | 'gpt' | 'codex' | 'gemini'
  route_type_manual?: boolean
  route_path?: '' | 'chat/completions' | 'responses'
  route_path_manual?: boolean
  model_probe_status?: 'default' | 'key_metadata' | 'success' | 'failed' | ''
  model_probe_message?: string
  model_probe_updated_at?: string | null
  route_priority: number
  route_priority_manual?: boolean
  weight: number
  is_enabled: boolean
  is_enabled_manual?: boolean
  circuit_state: string
  consecutive_failures: number
  active_concurrency: number
  request_count: number
  success_count: number
  failure_count: number
  avg_latency_ms: number | null
  ewma_latency_ms: number | null
  last_latency_ms: number | null
  success_rate: number
  last_status_code: number | null
  last_error: string | null
  last_used_at: string | null
  last_success_at: string | null
  last_failure_at: string | null
  circuit_open_until: string | null
}

export interface GatewayRouteGroup {
  id: number
  name: string
  has_api_key?: boolean
  route_count: number
  created_at?: string
  updated_at?: string
}

export interface GatewayRouteDeleteResult {
  status: string
  message: string
  deleted_route_id: number
  site_id: number
  removed_api_key: boolean
}

export interface GatewayRouteProbeResult {
  id: number
  site_id: number
  site_name: string
  request_base_url?: string
  key_name: string
  key_fingerprint?: string
  ok: boolean
  status_code: number | null
  latency_ms: number | null
  message: string
  models: string[]
  supported_models?: string[]
  model_probe_status?: 'default' | 'key_metadata' | 'success' | 'failed' | ''
  model_probe_message?: string
  model_probe_updated_at?: string | null
  last_status_code: number | null
  last_error: string | null
  last_latency_ms: number | null
  last_success_at: string | null
  last_failure_at: string | null
  checked_at: string
}

export interface GatewayRouteUpdatePayload {
  route_type: 'general' | 'claude' | 'gpt' | 'codex' | 'gemini'
  route_path?: '' | 'chat/completions' | 'responses'
  supported_models?: string[]
  manual_request_base_urls?: string[]
}

export interface GatewayRouteDiagnosticItem {
  label: string
  ok: boolean
  severity: 'ok' | 'warning' | 'error'
  message: string
  detail: string
}

export interface GatewayRouteDiagnosis {
  id: number
  healthy: boolean
  route_label: string
  route: GatewayRoute
  diagnostics: GatewayRouteDiagnosticItem[]
  checked_at: string
  active_count: number
}
