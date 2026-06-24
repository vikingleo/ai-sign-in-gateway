import type { ColumnsType } from 'ant-design-vue/es/table'
import type { CCSwitchPreviewRow } from './sitesViewModel'
import type { CheckinRun, DuplicateSiteGroup, SettingsData, Site } from './types'

type SelectOption<T extends string> = {
  label: string
  value: T
}

export const emailPatternExamples = [
  '{n}@example.com',
  'user+{n}@example.com',
  'user+{n:03}@example.com',
  'user+{rand:[0-9]{6}}@example.com',
  'user+{rand:[a-z]{8}}@example.com',
  'user+{rand:[A-Z]{8}}@example.com',
  'user+{rand:[A-Za-z0-9]{10}}@example.com',
]

export function createDefaultCheckinConfig(): SettingsData {
  return {
    timezone: 'Asia/Shanghai',
    schedule_enabled: true,
    daily_run_time: '09:00',
    checkin_concurrency: 1,
    checkin_global_concurrency: 4,
    checkin_interval_seconds: 1,
    retry_count: 1,
    request_timeout: 20,
    only_enabled_sites: true,
    desktop_keep_running: false,
    database_backup_enabled: false,
    database_backup_dir: '',
    database_backup_interval_minutes: 1440,
    database_backup_retention: 7,
    log_retention_days: 5,
    gateway_pricing_active_scheme_id: 'official',
    gateway_pricing_schemes: [],
    feature_flags: {},
    features: [],
    desktop_frontend_default_port: 3721,
    desktop_frontend_port: 0,
    desktop_frontend_url: '',
    desktop_frontend_default_port_occupant: '',
    desktop_backend_default_port: 8972,
    desktop_backend_port: 0,
    desktop_backend_url: '',
    desktop_backend_default_port_occupant: '',
    desktop_gateway_url: '',
    runtime_config_dir: '',
    runtime_default_config_dir: '',
    runtime_database_path: '',
    runtime_pending_config_dir: '',
    security_warnings: [],
  }
}

type SiteColumnsDeps = {
  pluginNameFor: (pluginKey: string) => string
  visibleCheckinStatus: (site: Site) => string | null | undefined
  isIncludedInCheckin: (site: Site) => boolean
}

export function createSiteColumns({
  pluginNameFor,
  visibleCheckinStatus,
  isIncludedInCheckin,
}: SiteColumnsDeps): ColumnsType<Site> {
  return [
    { title: '站点', key: 'site', width: 280, sorter: (a, b) => a.name.localeCompare(b.name, 'zh-CN') },
    { title: '平台标签', key: 'plugin', width: 148, sorter: (a, b) => pluginNameFor(a.plugin_key).localeCompare(pluginNameFor(b.plugin_key), 'zh-CN') },
    { title: '余额', key: 'balance', width: 132, sorter: (a, b) => (a.last_balance ?? -Infinity) - (b.last_balance ?? -Infinity) },
    { title: '套餐', key: 'package', width: 144, sorter: (a, b) => String(a.package_display ?? '').localeCompare(String(b.package_display ?? ''), 'zh-CN') },
    { title: '签到状态', key: 'checkin_status', width: 116, sorter: (a, b) => String(visibleCheckinStatus(a) ?? '').localeCompare(String(visibleCheckinStatus(b) ?? ''), 'zh-CN') },
    { title: '分组', key: 'group', width: 150, sorter: (a, b) => String(a.group_name ?? '').localeCompare(String(b.group_name ?? ''), 'zh-CN') },
    { title: '连通状态', key: 'status', width: 112, sorter: (a, b) => String(a.connection_status ?? '').localeCompare(String(b.connection_status ?? ''), 'zh-CN') },
    { title: '启用', key: 'enabled', width: 84, sorter: (a, b) => Number(a.is_enabled) - Number(b.is_enabled) },
    { title: '可签到', key: 'participation', width: 100, sorter: (a, b) => Number(isIncludedInCheckin(b)) - Number(isIncludedInCheckin(a)) },
    { title: '操作', key: 'actions', width: 128, fixed: 'right' },
  ]
}

export const checkinRunColumns: ColumnsType<CheckinRun> = [
  { title: '站点', key: 'site', width: 260, sorter: (a, b) => String(a.site_name ?? '').localeCompare(String(b.site_name ?? ''), 'zh-CN') },
  { title: '结果', key: 'status', width: 120, sorter: (a, b) => a.status.localeCompare(b.status, 'zh-CN') },
  { title: '触发方式', key: 'trigger_type', width: 120, sorter: (a, b) => a.trigger_type.localeCompare(b.trigger_type, 'zh-CN') },
  { title: '消息', key: 'message' },
  { title: '开始时间', key: 'started_at', width: 190, sorter: (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime() },
]

export const ccSwitchPreviewColumns: ColumnsType<CCSwitchPreviewRow> = [
  { title: '应用', key: 'app', width: 90, sorter: (a, b) => a.app.localeCompare(b.app, 'zh-CN') },
  { title: '顺序', key: 'order', width: 80, sorter: (a, b) => a.order - b.order },
  { title: '默认', key: 'current', width: 80, sorter: (a, b) => Number(a.isCurrent) - Number(b.isCurrent) },
  { title: '名称', key: 'name', width: 180, sorter: (a, b) => a.name.localeCompare(b.name, 'zh-CN') },
  { title: '站点', key: 'website', width: 260, sorter: (a, b) => a.website.localeCompare(b.website, 'zh-CN') },
  { title: '认证', key: 'apiKeyStatus', width: 90, sorter: (a, b) => Number(a.hasAuth) - Number(b.hasAuth) },
  { title: '备注', key: 'note', sorter: (a, b) => a.note.localeCompare(b.note, 'zh-CN') },
]

export const duplicateColumns: ColumnsType<DuplicateSiteGroup> = [
  { title: '插件', key: 'plugin_key', width: 130, sorter: (a, b) => a.plugin_key.localeCompare(b.plugin_key, 'zh-CN') },
  { title: '基础 URL', key: 'base_url', width: 260, sorter: (a, b) => a.base_url.localeCompare(b.base_url, 'zh-CN') },
  { title: '账号', key: 'account', width: 160, sorter: (a, b) => a.account.localeCompare(b.account, 'zh-CN') },
  { title: '密码', key: 'password', width: 90, sorter: (a, b) => Number(a.password_present) - Number(b.password_present) },
  { title: '保留建议', key: 'suggested', width: 280 },
  { title: '重复记录', key: 'sites' },
]

export const apiKeyRouteTypeOptions: Array<SelectOption<string>> = [
  { label: '通用', value: 'general' },
  { label: 'GptChat', value: 'gpt' },
  { label: 'Codex', value: 'codex' },
  { label: 'Claude', value: 'claude' },
  { label: 'Gemini', value: 'gemini' },
]

export const apiKeyRoutePathOptions: Array<SelectOption<string>> = [
  { label: '跟随客户端', value: '' },
  { label: '/v1/chat/completions', value: 'chat/completions' },
  { label: '/v1/responses', value: 'responses' },
]
