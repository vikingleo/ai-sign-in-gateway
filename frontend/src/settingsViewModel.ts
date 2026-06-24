import type { AdminUser, GatewayModelPrice, GatewayPricingScheme, RuntimeStopPortResult, SettingsData } from './types'

export const pricingProviderOptions = [
  { label: 'Codex / OpenAI', value: 'codex' },
  { label: 'Claude', value: 'claude' },
  { label: 'Gemini', value: 'gemini' },
]

export function createSettingsForm(): SettingsData {
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

export function clonePricingScheme(source: GatewayPricingScheme): GatewayPricingScheme {
  return {
    ...source,
    prices: source.prices.map((price) => ({ ...price })),
  }
}

export function createPricingRow(): GatewayModelPrice {
  return {
    provider: 'codex',
    model_prefix: '',
    display_name: '',
    input_per_mtok: 0,
    cached_input_per_mtok: 0,
    cache_write_per_mtok: 0,
    output_per_mtok: 0,
  }
}

export function priceRowKey(price: GatewayModelPrice, index: number) {
  return `${price.provider}-${price.model_prefix}-${index}`
}

export function runtimeStopTagColor(item: RuntimeStopPortResult) {
  if (item.stopped) return 'success'
  if (item.skipped) return 'default'
  return 'error'
}

export function formatBackupTime(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function formatOptionalTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
}

export const roleOptions = [
  { label: '管理员', value: 'admin' },
  { label: '超级管理员', value: 'super_admin' },
]

export function createAdminUserForm() {
  return {
    username: '',
    password: '',
    role: 'admin',
    is_enabled: true,
  }
}

export function asAdminUser(record: unknown) {
  return record as AdminUser
}

export function adminRoleLabel(role: string) {
  return role === 'super_admin' ? '超级管理员' : '管理员'
}

export function adminRoleColor(role: string) {
  return role === 'super_admin' ? 'gold' : 'processing'
}
