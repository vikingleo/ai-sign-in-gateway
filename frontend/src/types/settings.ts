import type { FeatureMeta } from './core'

export interface SettingsData {
  timezone: string
  schedule_enabled: boolean
  daily_run_time: string
  checkin_concurrency: number
  checkin_global_concurrency: number
  checkin_interval_seconds: number
  retry_count: number
  request_timeout: number
  only_enabled_sites: boolean
  desktop_keep_running: boolean
  database_backup_enabled: boolean
  database_backup_dir: string
  database_backup_interval_minutes: number
  database_backup_retention: number
  log_retention_days: number
  gateway_pricing_active_scheme_id: string
  gateway_pricing_schemes: GatewayPricingScheme[]
  feature_flags: Record<string, boolean>
  features: FeatureMeta[]
  desktop_frontend_default_port: number
  desktop_frontend_port: number
  desktop_frontend_url: string
  desktop_frontend_default_port_occupant: string
  desktop_backend_default_port: number
  desktop_backend_port: number
  desktop_backend_url: string
  desktop_backend_default_port_occupant: string
  desktop_gateway_url: string
  runtime_config_dir: string
  runtime_default_config_dir: string
  runtime_database_path: string
  runtime_pending_config_dir: string
  security_warnings: string[]
}

export interface GatewayPricingScheme {
  id: string
  name: string
  currency: string
  readonly: boolean
  source: string
  prices: GatewayModelPrice[]
}

export interface GatewayModelPrice {
  provider: 'codex' | 'claude' | 'gemini' | string
  model_prefix: string
  display_name: string
  input_per_mtok: number
  cached_input_per_mtok: number
  cache_write_per_mtok: number
  output_per_mtok: number
}

export interface RuntimeStopPortResult {
  port: number
  pid?: number
  command?: string
  stopped: boolean
  skipped: boolean
  message: string
}

export interface RuntimeStopStalePortsResult {
  results: RuntimeStopPortResult[]
}

export interface RuntimeConfigDirResult {
  config_dir: string
  database_path: string
  restart_required: boolean
  message: string
}

export interface RuntimeDatabaseImportResult {
  database_path: string
  backup_path: string
  relogin_required: boolean
  restart_required: boolean
  message: string
}

export interface RuntimeDatabaseBackupFile {
  name: string
  path: string
  size: number
  created_at: string
}

export interface RuntimeDatabaseBackupsResult {
  backup_dir: string
  backups: RuntimeDatabaseBackupFile[]
}

export interface RuntimeDatabaseBackupNowResult extends RuntimeDatabaseBackupsResult {
  backup: RuntimeDatabaseBackupFile
  message: string
}
