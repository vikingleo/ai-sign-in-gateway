export interface GatewayStrategyStat {
  route_strategy: 'round_robin' | 'latency_first' | 'priority' | 'smart'
  request_count: number
  success_rate: number
  avg_latency_ms: number | null
  stream_request_count: number
  stream_success_rate: number
  avg_stream_ttfb_ms: number | null
}

export interface GatewayOverview {
  total_routes: number
  healthy_routes: number
  open_circuit_routes: number
  half_open_routes: number
  disabled_routes: number
  total_balance_display: string | null
  quantified_balance_site_count: number
  active_concurrency: number
  max_concurrency_all_time: number
  max_concurrency_today: number
  request_count_24h: number
  success_rate_24h: number
  avg_latency_ms_24h: number | null
  usage_cost_24h: GatewayUsageCostSummary
  strategy_breakdown_24h: GatewayStrategyStat[]
  route_strategy: 'round_robin' | 'latency_first' | 'priority' | 'smart'
  failure_threshold: number
  cooldown_seconds: number
  request_timeout: number
  max_attempts: number
  failure_retry_mode: 'retryable' | 'all'
  route_concurrency_limit: number
  concurrency_transfer_strategy: 'limit_only' | 'balance'
  concurrency_overflow_strategy: 'latency_first' | 'sequential'
}

export interface GatewayUsageCostSummary {
  input_cost: number
  cached_cost: number
  output_cost: number
  total_cost: number
  upstream_cost: number
  prompt_tokens: number
  cached_tokens: number
  output_tokens: number
  total_tokens: number
  known_requests: number
  unknown_requests: number
  upstream_requests: number
  currency: string
  window_seconds: number
  top_models: Array<{
    model: string
    requests: number
    total_cost: number
    known_price: boolean
  }>
}

export interface GatewayUsageRoute {
  route_id: number | null
  route_label: string
  site_id: number | null
  site_name: string | null
  key_name: string
  key_fingerprint: string
  group_name: string
  route_type: string
  model: string
  request_count: number
  success_count: number
  failure_count: number
  success_rate: number
  stream_request_count: number
  prompt_tokens: number
  cached_input_tokens: number
  completion_tokens: number
  total_tokens: number
  usage_cost: number | null
  computed_input_cost: number
  computed_cached_cost: number
  computed_output_cost: number
  computed_total_cost: number
  computed_cost_known: boolean
  computed_cost_mixed: boolean
  avg_latency_ms: number | null
  last_used_at: string | null
}

export interface GatewayUsage extends GatewayUsageRoute {
  start: string
  end: string
  routes: GatewayUsageRoute[]
}
