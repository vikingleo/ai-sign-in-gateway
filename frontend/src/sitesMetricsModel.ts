import { formatBalance, normalizeBalanceUnit, parseGroupNames } from './format.ts'
import type { Site } from './types.ts'

export type SitesBalanceTone = 'positive' | 'negative' | 'zero' | 'empty'

export type BatchProgress = {
  total: number
  done: number
  success: number
  failed: number
}

export type SitesMetrics = {
  totalSiteCount: number
  enabledSiteCount: number
  groupedSiteCount: number
  readyGatewayCount: number
  successSiteCount: number
  failedSiteCount: number
  pendingSiteCount: number
  totalBalancesByUnit: Map<string, number>
  totalBalanceSummary: string
  totalBalanceTone: SitesBalanceTone
  quantifiedBalanceSiteCount: number
}

function hasQuantifiedBalance(site: Pick<Site, 'last_balance'>): boolean {
  return site.last_balance !== null && site.last_balance !== undefined && !Number.isNaN(site.last_balance)
}

function readBalanceUnit(site: Pick<Site, 'balance_display'>): string {
  const display = String(site.balance_display ?? '').trim()
  if (/^[\$¥€£]/.test(display)) {
    return display[0]
  }
  const match = display.match(/\s([^\s]+)$/)
  return match ? normalizeBalanceUnit(match[1]) : '$'
}

function hasGatewayCredential(site: Pick<Site, 'credentials'>): boolean {
  const credentials = site.credentials ?? {}
  const hasApiKey = Boolean(String(credentials.api_key ?? '').trim())
  const hasApiKeys = Array.isArray(credentials.api_keys) && credentials.api_keys.length > 0
  return hasApiKey || hasApiKeys
}

export function buildTotalBalancesByUnit(sites: readonly Site[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const site of sites) {
    if (!hasQuantifiedBalance(site)) {
      continue
    }
    const unit = readBalanceUnit(site)
    totals.set(unit, (totals.get(unit) ?? 0) + Number(site.last_balance))
  }
  return totals
}

export function formatTotalBalanceSummary(totals: ReadonlyMap<string, number>): string {
  if (!totals.size) {
    return '暂无'
  }
  return [...totals.entries()]
    .map(([unit, value]) => formatBalance(value, unit))
    .join(' / ')
}

export function readTotalBalanceTone(totals: ReadonlyMap<string, number>): SitesBalanceTone {
  if (!totals.size) {
    return 'empty'
  }
  let hasNegative = false
  let hasPositive = false
  for (const value of totals.values()) {
    if (value < 0) {
      hasNegative = true
    } else if (value > 0) {
      hasPositive = true
    }
  }
  if (hasNegative) {
    return 'negative'
  }
  return hasPositive ? 'positive' : 'zero'
}

export function buildSitesMetrics(sites: readonly Site[]): SitesMetrics {
  const totalBalancesByUnit = buildTotalBalancesByUnit(sites)
  return {
    totalSiteCount: sites.length,
    enabledSiteCount: sites.filter((site) => site.is_enabled).length,
    groupedSiteCount: sites.filter((site) => parseGroupNames(site.group_name).length).length,
    readyGatewayCount: sites.filter((site) => site.is_enabled && hasGatewayCredential(site)).length,
    successSiteCount: sites.filter((site) => site.connection_status === 'success').length,
    failedSiteCount: sites.filter((site) => site.connection_status === 'failed').length,
    pendingSiteCount: sites.filter((site) =>
      !site.connection_status || ['pending', 'active'].includes(String(site.connection_status)),
    ).length,
    totalBalancesByUnit,
    totalBalanceSummary: formatTotalBalanceSummary(totalBalancesByUnit),
    totalBalanceTone: readTotalBalanceTone(totalBalancesByUnit),
    quantifiedBalanceSiteCount: sites.filter(hasQuantifiedBalance).length,
  }
}

export function formatProgressLabel(progress: BatchProgress | null, idleLabel: string, activePrefix: string): string {
  if (!progress) {
    return idleLabel
  }
  return `${activePrefix} ${progress.done}/${progress.total}`
}
