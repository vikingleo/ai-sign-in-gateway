export interface CheckinSite {
  id: number
  name: string
  plugin_key: string
  group_name: string
  base_url: string
  is_enabled: boolean
  can_checkin: boolean
  include_in_checkin: boolean
  checkin_label: string
  reason: string
  last_status: string | null
  connection_status?: string | null
  last_message: string | null
  last_balance?: number | null
  balance_display?: string | null
  package_remaining?: number | null
  package_total?: number | null
  package_used?: number | null
  package_unit?: string | null
  package_display?: string | null
  checkin_status?: string | null
  last_run_at: string | null
}

export interface CheckinRun {
  id: number
  site_id: number | null
  site_name: string | null
  trigger_type: string
  status: string
  message: string
  response_excerpt: string | null
  balance: number | null
  balance_unit?: string | null
  attempt_count: number
  started_at: string
  finished_at: string | null
}

export interface OverviewAttentionSite {
  id: number
  name: string
  last_status: string | null
  last_message: string | null
  last_run_at: string | null
}

export interface OverviewData {
  site_count: number
  enabled_site_count: number
  today_success: number
  today_failed: number
  next_run_at: string | null
  latest_sync: string | null
  recent_runs: CheckinRun[]
  attention_sites: OverviewAttentionSite[]
}
