export interface SitePayload {
  name: string
  base_url: string
  plugin_key: string
  group_name: string
  supported_models: string[] | null
  is_enabled: boolean
  notes: string
  credentials: Record<string, any>
  plugin_config: Record<string, any>
}

export interface Site extends SitePayload {
  id: number
  last_status: string | null
  connection_status?: string | null
  last_message: string | null
  last_balance: number | null
  balance_display?: string | null
  balance_unit?: string | null
  package_remaining?: number | null
  package_total?: number | null
  package_used?: number | null
  package_unit?: string | null
  package_display?: string | null
  checkin_status?: string | null
  last_run_at: string | null
  created_at: string
  updated_at: string | null
}

export interface SiteRegistrationBatchPayload extends SitePayload {
  email_pattern: string
  password: string
  count: number
  start_index: number
}

export interface SiteRegistrationBatchItem {
  index: number
  email: string
  ok: boolean
  message: string
  site?: Site
  api_key_count: number
}

export interface SiteRegistrationBatchResult {
  created_count: number
  failed_count: number
  items: SiteRegistrationBatchItem[]
}

export interface SiteSummary {
  site_id: number
  last_status: string | null
  connection_status?: string | null
  last_message: string | null
  last_balance: number | null
  balance_display?: string | null
  balance_unit?: string | null
  package_remaining?: number | null
  package_total?: number | null
  package_used?: number | null
  package_unit?: string | null
  package_display?: string | null
  invite_link?: string | null
  invite_code?: string | null
  checkin_status?: string | null
  last_run_at: string | null
}

export interface SiteInviteRefreshResult {
  site_id: number
  ok: boolean
  message: string
  invite_link?: string | null
  invite_code?: string | null
  package_remaining?: number | null
  package_total?: number | null
  package_used?: number | null
  package_unit?: string | null
  package_display?: string | null
  updated_credentials: Record<string, any>
  updated_plugin_config: Record<string, any>
}

export interface SiteApiKeyRefreshResult {
  site_id: number
  site_name: string
  ok: boolean
  message: string
  api_key_count: number
  primary_key_updated: boolean
  updated_credentials: Record<string, unknown>
}

export interface DuplicateSiteItem {
  id: number
  name: string
  plugin_key: string
  is_enabled: boolean
  notes: string
  plugin_config_count: number
  credentials_count: number
  suggested_keep: boolean
}

export interface DuplicateSiteGroup {
  plugin_key: string
  base_url: string
  account: string
  password_present: boolean
  suggested_keep_id: number
  site_ids: number[]
  sites: DuplicateSiteItem[]
}

export interface DuplicateSiteMergeResult {
  merged_group_count: number
  deleted_site_count: number
  remaining_group_count: number
  kept_site_ids: number[]
  deleted_site_ids: number[]
}

export interface SiteHealth {
  site_id: number
  logged_in: boolean
  message: string
  balance: number | null
  balance_unit?: string | null
  package_remaining?: number | null
  package_total?: number | null
  package_used?: number | null
  package_unit?: string | null
  package_display?: string | null
  account_name: string | null
  invite_link?: string | null
  invite_code?: string | null
  updated_credentials?: Record<string, any>
  updated_plugin_config?: Record<string, any>
}

export interface PublicInvite {
  site_id: number
  site_name: string
  base_url: string
  group_name: string
  plugin_key: string
  invite_link: string
  invite_code: string
  package_name?: string | null
}

export interface BalanceProbeResult {
  site_id: number
  route_id: number
  ok: boolean
  status_code: number | null
  latency_ms: number | null
  remaining: number | null
  unit: string
  base_url: string
  balance_probe_url?: string | null
  message: string
  checked_at: string
  last_balance: number | null
  balance_display?: string | null
}

export interface LocalStorageAnalyzeResult {
  parsed_items: number
  page_url: string
  page_title: string
  cookie_header: string
  local_storage: Record<string, string>
  session_storage: Record<string, string>
  suggested_credentials: Record<string, string>
  suggested_plugin_key?: string
  suggested_site_name?: string
  suggested_base_url?: string
  suggested_plugin_config?: Record<string, any>
  matched_keys: string[]
  message: string
}

export interface SiteGroup {
  name: string
  site_count: number
  in_catalog: boolean
  in_use: boolean
}

export interface QueueTask {
  id: number
  task_key: string
  title: string
  detail: string
  status: string
  sort_order: number
  action_key: string
  action_label: string
  last_message: string | null
  last_error: string | null
  completed_at: string | null
  updated_at: string | null
}

export interface TotpPreview {
  code: string
  expires_in: number
}
