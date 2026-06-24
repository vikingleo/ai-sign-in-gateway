import { formatBalance, normalizeBalanceUnit } from './format.ts'
import type { Site, SiteApiKeyRefreshResult, SiteHealth, SiteInviteRefreshResult, SitePayload, SiteSummary } from './types.ts'

export type PackageQuotaSource = {
  package_remaining?: number | null
  package_total?: number | null
  package_used?: number | null
  package_unit?: string | null
}

export type BalanceProbeUpdate = {
  last_balance: number | null
  remaining: number | null
  unit?: string | null
}

export type CheckinResultUpdate = PackageQuotaSource & {
  status: string
  message: string
  balance: number | null
  balance_unit?: string | null
  balance_display?: string | null
  package_display?: string | null
  checkin_status?: string | null
  connection_status?: string | null
}

export function mergePackageQuota(site: Site, source: PackageQuotaSource): Site {
  return {
    ...site,
    package_remaining: source.package_remaining !== undefined ? source.package_remaining : site.package_remaining,
    package_total: source.package_total !== undefined ? source.package_total : site.package_total,
    package_used: source.package_used !== undefined ? source.package_used : site.package_used,
    package_unit: source.package_unit !== undefined ? normalizeBalanceUnit(source.package_unit, '') : site.package_unit,
  }
}

export function mergeBalanceProbeResult(site: Site, result: BalanceProbeUpdate): Site {
  const balance = result.last_balance ?? result.remaining
  return {
    ...site,
    last_balance: balance,
    balance_unit: normalizeBalanceUnit(result.unit),
    balance_display: formatBalance(balance, result.unit),
  }
}

export function mergeInvitePluginConfig(site: Site, updates?: Record<string, unknown>): Site {
  if (!updates) {
    return site
  }
  return {
    ...site,
    plugin_config: {
      ...site.plugin_config,
      ...updates,
    },
  }
}

export function mergeInviteRefreshResult(site: Site, result: SiteInviteRefreshResult): Site {
  let next = mergePackageQuota(mergeInvitePluginConfig(site, result.updated_plugin_config), result)
  if (Object.keys(result.updated_credentials).length > 0) {
    next = {
      ...next,
      credentials: {
        ...(next.credentials as Record<string, unknown>),
        ...result.updated_credentials,
      },
    }
  }
  if (result.invite_link) {
    next = {
      ...next,
      plugin_config: {
        ...next.plugin_config,
        invite_link: result.invite_link,
      },
    }
  }
  if (result.invite_code) {
    next = {
      ...next,
      plugin_config: {
        ...next.plugin_config,
        invite_code: result.invite_code,
      },
    }
  }
  if (result.package_display) {
    next = {
      ...next,
      package_display: result.package_display,
      plugin_config: {
        ...next.plugin_config,
        package_display: result.package_display,
      },
    }
  }
  return next
}

export function mergeApiKeyRefreshResult(site: Site, result: SiteApiKeyRefreshResult): Site {
  const updatedCredentials = result.updated_credentials
  if (!updatedCredentials) {
    return site
  }
  return {
    ...site,
    credentials: {
      ...(site.credentials as Record<string, unknown>),
      ...updatedCredentials,
    },
  }
}

export function mergeSiteHealthResult(site: Site, result: SiteHealth): Site {
  let next = mergeApiKeyRefreshResult(site, {
    site_id: result.site_id,
    site_name: site.name,
    ok: result.logged_in,
    message: result.message,
    api_key_count: 0,
    primary_key_updated: false,
    updated_credentials: result.updated_credentials ?? {},
  })
  next = mergeInviteRefreshResult(next, {
    site_id: result.site_id,
    ok: result.logged_in,
    message: result.message,
    invite_link: result.invite_link,
    invite_code: result.invite_code,
    package_remaining: result.package_remaining,
    package_total: result.package_total,
    package_used: result.package_used,
    package_unit: result.package_unit,
    package_display: result.package_display,
    updated_credentials: {},
    updated_plugin_config: result.updated_plugin_config ?? {},
  })
  if (result.balance !== null && result.balance !== undefined && !Number.isNaN(result.balance)) {
    next = {
      ...next,
      last_balance: result.balance,
      balance_unit: normalizeBalanceUnit(result.balance_unit),
      balance_display: formatBalance(result.balance, result.balance_unit),
    }
  }
  return next
}

export function mergeSiteHealthEditorPayload(payload: SitePayload, result: SiteHealth): SitePayload {
  let next: SitePayload = {
    ...payload,
    credentials: {
      ...payload.credentials,
      ...(result.updated_credentials ?? {}),
    },
    plugin_config: {
      ...payload.plugin_config,
      ...(result.updated_plugin_config ?? {}),
    },
  }
  if (result.package_display) {
    next = {
      ...next,
      plugin_config: {
        ...next.plugin_config,
        package_display: result.package_display,
      },
    }
  }
  if (result.invite_link) {
    next = {
      ...next,
      plugin_config: {
        ...next.plugin_config,
        invite_link: result.invite_link,
      },
    }
  }
  if (result.invite_code) {
    next = {
      ...next,
      plugin_config: {
        ...next.plugin_config,
        invite_code: result.invite_code,
      },
    }
  }
  return next
}

export function mergeSiteSummary(site: Site, summary: SiteSummary): Site {
  let next = mergePackageQuota({
    ...site,
    last_status: summary.last_status,
    connection_status: summary.connection_status,
    last_message: summary.last_message,
    last_balance: summary.last_balance,
    balance_display: summary.balance_display,
    package_display: summary.package_display,
    checkin_status: summary.checkin_status,
    last_run_at: summary.last_run_at,
  }, summary)
  if (summary.invite_link) {
    next = {
      ...next,
      plugin_config: {
        ...next.plugin_config,
        invite_link: summary.invite_link,
      },
    }
  }
  if (summary.invite_code) {
    next = {
      ...next,
      plugin_config: {
        ...next.plugin_config,
        invite_code: summary.invite_code,
      },
    }
  }
  return next
}

export function mergeCheckinResult(site: Site, result: CheckinResultUpdate, now = new Date().toISOString()): Site {
  let next: Site = {
    ...site,
    last_status: result.status,
    connection_status: result.connection_status ?? result.status,
    checkin_status: result.checkin_status ?? result.status,
    last_message: result.message,
    last_run_at: now,
  }
  if (result.balance !== null && result.balance !== undefined && !Number.isNaN(result.balance)) {
    next = {
      ...next,
      last_balance: result.balance,
      balance_unit: normalizeBalanceUnit(result.balance_unit),
      balance_display: result.balance_display || formatBalance(result.balance, result.balance_unit),
    }
  }
  next = mergePackageQuota(next, result)
  if (result.package_display) {
    next = {
      ...next,
      package_display: result.package_display,
    }
  }
  return next
}
