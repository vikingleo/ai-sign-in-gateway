import type { ColumnsType } from 'ant-design-vue/es/table'
import type { GatewayLog, GatewayRoute, GatewaySettingsData, GatewayUsageRoute } from './types'

type SelectOption<T extends string> = {
  label: string
  value: T
}

type DescribedSelectOption<T extends string> = SelectOption<T> & {
  description: string
}

export type GatewayIssueState = 'with_error' | 'without_error'

export function createDefaultGatewaySettings(): GatewaySettingsData {
  return {
    route_strategy: 'round_robin',
    failure_threshold: 3,
    cooldown_seconds: 180,
    request_timeout: 60,
    max_attempts: 0,
    failure_retry_mode: 'retryable',
    route_concurrency_limit: 5,
    concurrency_transfer_strategy: 'limit_only',
    concurrency_overflow_strategy: 'latency_first',
    smart_latency_bias: 1.0,
    smart_concurrency_bias: 1.5,
    smart_failure_bias: 1.0,
    smart_priority_bias: 0.5,
    gateway_api_key: '',
  }
}

export const routeTypeOptions: Array<SelectOption<GatewayRoute['route_type']>> = [
  { label: '通用', value: 'general' },
  { label: 'Claude', value: 'claude' },
  { label: 'GptChat', value: 'gpt' },
  { label: 'Codex', value: 'codex' },
  { label: 'Gemini', value: 'gemini' },
]

export const routeTypeFilterOptions = routeTypeOptions

export const routePathOptions: Array<SelectOption<NonNullable<GatewayRoute['route_path']>>> = [
  { label: '跟随客户端', value: '' },
  { label: '/v1/chat/completions', value: 'chat/completions' },
  { label: '/v1/responses', value: 'responses' },
]

export const issueStateOptions: Array<SelectOption<GatewayIssueState>> = [
  { label: '有异常', value: 'with_error' },
  { label: '无异常', value: 'without_error' },
]

export const gatewayRouteStrategyOptions: Array<DescribedSelectOption<GatewaySettingsData['route_strategy']>> = [
  { label: '智能综合评分', value: 'smart', description: '综合延迟、当前并发、失败记录、优先级和权重，自动挑选当前最合适的路由。' },
  { label: '轮询均衡', value: 'round_robin', description: '在健康路由之间按顺序轮换，并尊重权重，适合希望请求分散到多个上游的场景。' },
  { label: '低延迟优先', value: 'latency_first', description: '优先使用历史延迟更低的路由，适合更看重响应速度的场景。' },
  { label: '优先级优先', value: 'priority', description: '优先选择 priority 数值更小的路由，再结合权重和健康状态排序，适合固定主备线路。' },
]

export const gatewayOverflowStrategyOptions: Array<DescribedSelectOption<GatewaySettingsData['concurrency_overflow_strategy']>> = [
  { label: '低延迟优先', value: 'latency_first', description: '只有所有可用路由都达到转移阈值后才生效，溢出请求优先尝试延迟较低的路由。' },
  { label: '按顺序优先', value: 'sequential', description: '只有所有可用路由都达到转移阈值后才生效，溢出请求按当前策略顺序继续尝试。' },
]

export const gatewayConcurrencyTransferOptions: Array<DescribedSelectOption<GatewaySettingsData['concurrency_transfer_strategy']>> = [
  { label: '并发达阈值转移', value: 'limit_only', description: '保持当前策略排序；某条路由达到最大转移阈值后，新请求会优先转到其他未达阈值路由。' },
  { label: '并发均衡转移', value: 'balance', description: '在未达阈值的候选路由中，优先使用当前并发更低的路由，让请求更主动地摊开。' },
]

export const gatewayFailureRetryModeOptions: Array<DescribedSelectOption<GatewaySettingsData['failure_retry_mode']>> = [
  { label: '可重试错误', value: 'retryable', description: '网络错误、429、5xx 和首包前流式失败会切换路由；400/401/403 等参数或鉴权错误会在网关层停止。' },
  { label: '所有上游错误', value: 'all', description: '任意非 2xx 上游响应都会继续切换其他路由，适合希望最大化请求成功率的场景。' },
]

type RouteColumnsDeps = {
  loadRouteLabel: (route: GatewayRoute) => string
  routePathLabel: (routePath: unknown) => string
  routeLastUpdateTime: (route: GatewayRoute) => string | null
}

export function createRouteColumns({
  loadRouteLabel,
  routePathLabel,
  routeLastUpdateTime,
}: RouteColumnsDeps): ColumnsType<GatewayRoute> {
  return [
    { title: '路由', key: 'route', width: 240, sorter: (a, b) => loadRouteLabel(a).localeCompare(loadRouteLabel(b), 'zh-CN') },
    { title: '类型', key: 'type', width: 130, sorter: (a, b) => a.route_type.localeCompare(b.route_type, 'zh-CN') },
    { title: '请求格式', key: 'path', width: 178, sorter: (a, b) => routePathLabel(a.route_path).localeCompare(routePathLabel(b.route_path), 'zh-CN') },
    { title: '余额', key: 'balance', width: 160, sorter: (a, b) => (a.last_balance ?? -Infinity) - (b.last_balance ?? -Infinity) },
    { title: '分组', key: 'group', width: 110, sorter: (a, b) => String(a.group_name ?? '').localeCompare(String(b.group_name ?? ''), 'zh-CN') },
    { title: '优先级', key: 'priority', width: 90, sorter: (a, b) => a.route_priority - b.route_priority },
    { title: '权重', key: 'weight', width: 80, sorter: (a, b) => a.weight - b.weight },
    { title: '并发/最大转移', key: 'concurrency', width: 150, sorter: (a, b) => a.active_concurrency - b.active_concurrency },
    { title: '成功率', key: 'success_rate', width: 110, sorter: (a, b) => a.success_rate - b.success_rate },
    { title: '延迟', key: 'latency', width: 138, sorter: (a, b) => (a.last_latency_ms ?? a.avg_latency_ms ?? Infinity) - (b.last_latency_ms ?? b.avg_latency_ms ?? Infinity) },
    { title: '最后异常', key: 'error', width: 220, sorter: (a, b) => new Date(routeLastUpdateTime(a) ?? 0).getTime() - new Date(routeLastUpdateTime(b) ?? 0).getTime() },
    { title: '操作', key: 'actions', width: 136, fixed: 'right' },
  ]
}

export const priorityDialogColumns: ColumnsType<GatewayRoute> = [
  { title: '路由名称', key: 'route', width: 280 },
  { title: '优先级', key: 'priority', width: 90 },
  { title: '分组', key: 'group', width: 170 },
]

type LogColumnsDeps = {
  logRequestLabel: (log: GatewayLog) => string
  logRouteLabel: (log: GatewayLog) => string
  logModelMeta: (log: GatewayLog) => string
  logUserAgent: (log: GatewayLog) => string
}

export function createLogColumns({
  logRequestLabel,
  logRouteLabel,
  logModelMeta,
  logUserAgent,
}: LogColumnsDeps): ColumnsType<GatewayLog> {
  return [
    { title: '时间', key: 'created_at', width: 180, sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() },
    { title: '状态', key: 'status', width: 92, sorter: (a, b) => Number(a.success) - Number(b.success) },
    { title: '请求', key: 'request', width: 360, sorter: (a, b) => logRequestLabel(a).localeCompare(logRequestLabel(b), 'zh-CN') },
    { title: '路由', key: 'route', width: 300, sorter: (a, b) => logRouteLabel(a).localeCompare(logRouteLabel(b), 'zh-CN') },
    { title: '错误链路', key: 'transfer', width: 420 },
    { title: '模型', key: 'model', width: 300, sorter: (a, b) => logModelMeta(a).localeCompare(logModelMeta(b), 'zh-CN') },
    { title: 'UA', key: 'user_agent', width: 240, sorter: (a, b) => logUserAgent(a).localeCompare(logUserAgent(b), 'zh-CN') },
    { title: '延迟', key: 'latency', width: 100, sorter: (a, b) => (a.latency_ms ?? Infinity) - (b.latency_ms ?? Infinity) },
    { title: '尝试', key: 'attempt', width: 90, sorter: (a, b) => a.attempt_index - b.attempt_index },
  ]
}

type UsageColumnsDeps = {
  usageRouteLabel: (route: GatewayUsageRoute) => string
}

export function createUsageColumns({ usageRouteLabel }: UsageColumnsDeps): ColumnsType<GatewayUsageRoute> {
  return [
    { title: '路由', key: 'route', width: 300, sorter: (a, b) => usageRouteLabel(a).localeCompare(usageRouteLabel(b), 'zh-CN') },
    { title: '请求', key: 'requests', width: 90, sorter: (a, b) => a.request_count - b.request_count },
    { title: '成功率', key: 'success_rate', width: 100, sorter: (a, b) => a.success_rate - b.success_rate },
    { title: '流式', key: 'stream', width: 80, sorter: (a, b) => a.stream_request_count - b.stream_request_count },
    { title: '输入', key: 'prompt_tokens', width: 110, sorter: (a, b) => a.prompt_tokens - b.prompt_tokens },
    { title: '缓存输入', key: 'cached_input_tokens', width: 110, sorter: (a, b) => a.cached_input_tokens - b.cached_input_tokens },
    { title: '输出', key: 'completion_tokens', width: 130, sorter: (a, b) => a.completion_tokens - b.completion_tokens },
    { title: '总消耗', key: 'total_tokens', width: 120, sorter: (a, b) => a.total_tokens - b.total_tokens },
    { title: '模型费用', key: 'computed_total_cost', width: 120, sorter: (a, b) => a.computed_total_cost - b.computed_total_cost },
    { title: '平均延迟', key: 'avg_latency', width: 110, sorter: (a, b) => (a.avg_latency_ms ?? Infinity) - (b.avg_latency_ms ?? Infinity) },
    { title: '最后使用', key: 'last_used_at', width: 170, sorter: (a, b) => new Date(a.last_used_at ?? 0).getTime() - new Date(b.last_used_at ?? 0).getTime() },
  ]
}
