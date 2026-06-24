import { formatBalance, formatGroupNames, normalizeBalanceUnit } from './format.ts'
import type { Site } from './types.ts'

export type CCSwitchPreviewRow = {
  key: string
  sectionKey: string
  app: string
  order: number
  isCurrent: boolean
  name: string
  website: string
  apiKeyStatus: string
  hasAuth: boolean
  note: string
}

const recommendedPluginHosts = [
  { fragments: ['yellowpeachxgp.com', 'aifamily.vip', 'boxying.com'], pluginKey: 'yellowpeach-newapi' },
  { fragments: ['sub2api'], pluginKey: 'sub2api-platform' },
]

export function parseCCSwitchJsonPayload(text: string): Record<string, unknown> | null {
  const normalized = text.trim()
  if (!normalized) {
    return null
  }
  try {
    const payload = JSON.parse(normalized) as Record<string, unknown>
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

export function isStorageJsonCandidate(text: string): boolean {
  const normalized = text.trim()
  if (!normalized) {
    return false
  }
  try {
    const parsed = JSON.parse(normalized)
    if (parsed && typeof parsed === 'object') {
      return true
    }
    if (typeof parsed === 'string') {
      const inner = JSON.parse(parsed.trim())
      return Boolean(inner && typeof inner === 'object')
    }
  } catch {
    return false
  }
  return false
}

export function ccSwitchSectionLabel(section: string): string {
  if (section === 'codex' || section === 'openai' || section === 'opencode' || section === 'openclaw' || section === 'hermes') {
    return section === 'codex' ? 'Codex' : section.charAt(0).toUpperCase() + section.slice(1)
  }
  if (section === 'claude') return 'Claude'
  if (section === 'gemini') return 'Gemini'
  return section.charAt(0).toUpperCase() + section.slice(1)
}

function readProviderAuth(provider: Record<string, unknown>): Record<string, unknown> {
  const settingsConfig = typeof provider.settingsConfig === 'object' && provider.settingsConfig !== null
    ? provider.settingsConfig as Record<string, unknown>
    : {}
  const env = typeof settingsConfig.env === 'object' && settingsConfig.env !== null
    ? settingsConfig.env as Record<string, unknown>
    : {}
  const auth = typeof settingsConfig.auth === 'object' && settingsConfig.auth !== null
    ? settingsConfig.auth as Record<string, unknown>
    : {}
  return { ...env, ...auth }
}

export function parseCCSwitchPreview(payload: Record<string, unknown>): CCSwitchPreviewRow[] {
  const rows: CCSwitchPreviewRow[] = []
  for (const [sectionKey, section] of Object.entries(payload)) {
    if (!section || typeof section !== 'object') {
      continue
    }
    const current = String((section as { current?: unknown }).current ?? '').trim()
    const providers = (section as { providers?: unknown }).providers
    if (!providers || typeof providers !== 'object') {
      continue
    }
    let order = 0
    for (const [providerId, rawProvider] of Object.entries(providers)) {
      if (!rawProvider || typeof rawProvider !== 'object') {
        continue
      }
      order += 1
      const provider = rawProvider as Record<string, unknown>
      const auth = readProviderAuth(provider)
      const hasApiKey = Boolean(String(auth.OPENAI_API_KEY ?? auth.ANTHROPIC_AUTH_TOKEN ?? auth.GEMINI_API_KEY ?? '').trim())
      rows.push({
        key: `${sectionKey}:${providerId}`,
        sectionKey,
        app: ccSwitchSectionLabel(sectionKey),
        order,
        isCurrent: providerId === current,
        name: String(provider.name ?? providerId),
        website: String(provider.websiteUrl ?? ''),
        apiKeyStatus: hasApiKey ? '已带入' : '留空',
        hasAuth: hasApiKey,
        note: String(provider.notes ?? ''),
      })
    }
  }
  return rows
}

export function displayGroupName(site: Pick<Site, 'group_name'>): string {
  const groupName = formatGroupNames(site.group_name)
  return groupName || '未分组'
}

export function normalizeSite(site: Site): Site {
  const balanceUnit = normalizeBalanceUnit(site.balance_unit)
  return {
    ...site,
    balance_unit: balanceUnit,
    balance_display: site.balance_display || formatBalance(site.last_balance, balanceUnit),
    package_unit: normalizeBalanceUnit(site.package_unit, ''),
  }
}

export function isBoxyingSite(baseUrl: string): boolean {
  return baseUrl.trim().toLowerCase().includes('boxying.com')
}

export function detectRecommendedPluginKey(baseUrl: string): string | null {
  const normalized = baseUrl.trim().toLowerCase()
  if (!normalized) {
    return null
  }
  const matched = recommendedPluginHosts.find((item) => item.fragments.some((fragment) => normalized.includes(fragment)))
  return matched?.pluginKey ?? null
}

export function formatCheckinRunTime(value: string | null): string {
  if (!value) return '暂无'
  return new Date(value).toLocaleString('zh-CN')
}

export function buildCCSwitchExportFilename(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `cc-switch-export-${stamp}.web.json`
}
