import {
  apiKeyEntryValue,
  apiKeyImageEditPath,
  apiKeyImageGenerationPath,
  apiKeyRequestBaseURLs,
  apiKeyRoutePath,
  apiKeyValue,
  isManualApiKeyEntry,
  storedApiKeyEntries,
  type SiteApiKeyRecord,
} from './siteApiKeyCredentials.ts'
import type { Site } from './types.ts'
import { normalizeStringList } from './viewUtils.ts'

export type SiteApiKeyEntry = {
  id: string
  entryIndex: number
  name: string
  key: string
  status: string
  isPrimary: boolean
  source: string
  routeType: string
  routePath: string
  requestBaseURLs: string[]
  imageGenerationPath: string
  imageEditPath: string
  isManual: boolean
}

export type ManualApiKeyForm = {
  name: string
  key: string
  route_type: string
  route_path: string
  request_base_urls: string
  image_generation_path: string
  image_edit_path: string
}

export function normalizeApiKeyRouteType(value: unknown): string {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (['general', 'auto', 'any', 'none', 'default'].includes(normalized)) {
    return 'general'
  }
  if (normalized === 'claude' || normalized === 'anthropic') {
    return 'claude'
  }
  if (normalized === 'gemini' || normalized === 'google') {
    return 'gemini'
  }
  if (['gpt', 'openai', 'chatgpt', 'chat', 'chat_completions', 'chat-completions'].includes(normalized)) {
    return 'gpt'
  }
  if (['codex', 'response', 'responses'].includes(normalized)) {
    return 'codex'
  }
  return ''
}

export function defaultApiKeyRouteType(site: Pick<Site, 'plugin_config'>): string {
  const config = site.plugin_config as Record<string, unknown>
  return normalizeApiKeyRouteType(config?.gateway_route_type) || normalizeApiKeyRouteType(config?.api_format) || 'codex'
}

export function defaultApiKeyRoutePath(routeType: string): string {
  const normalized = normalizeApiKeyRouteType(routeType)
  if (normalized === 'gpt') {
    return 'chat/completions'
  }
  if (normalized === 'codex') {
    return 'responses'
  }
  return ''
}

export function resetManualApiKeyForm(form: ManualApiKeyForm, site: Pick<Site, 'plugin_config'>) {
  form.name = ''
  form.key = ''
  form.route_type = defaultApiKeyRouteType(site)
  form.route_path = defaultApiKeyRoutePath(form.route_type)
  form.request_base_urls = ''
  form.image_generation_path = ''
  form.image_edit_path = ''
}

export function buildManualApiKeyEntry(form: ManualApiKeyForm, site: Pick<Site, 'plugin_config'>, manualCount: number) {
  const key = form.key.trim()
  const routeType = normalizeApiKeyRouteType(form.route_type) || defaultApiKeyRouteType(site)
  const routePath = apiKeyRoutePath({ route_path: form.route_path })
  const name = form.name.trim() || `自定义 Key ${manualCount + 1}`
  const entry = {
    id: `manual-${Date.now()}`,
    name,
    key,
    status: 'active',
    source: 'manual',
    route_type: routeType,
    api_type: routeType,
    request_base_urls: normalizeStringList(form.request_base_urls),
    image_generation_path: form.image_generation_path.trim(),
    image_edit_path: form.image_edit_path.trim(),
  }
  if (routePath) {
    Object.assign(entry, { route_path: routePath })
  }
  return entry
}

export function apiKeyDraftKey(entry: Pick<SiteApiKeyEntry, 'id' | 'entryIndex' | 'key'>): string {
  return `${entry.id || entry.key}:${entry.entryIndex}`
}

export function storedApiKeyEntriesForEdit(site: Pick<Site, 'credentials' | 'plugin_config'>): SiteApiKeyRecord[] {
  const credentials = site.credentials as Record<string, unknown>
  const entries = storedApiKeyEntries(credentials)
  const primaryKey = String(credentials?.api_key ?? '').trim()
  if (primaryKey && !entries.some((item) => apiKeyEntryValue(item, 'key') === primaryKey)) {
    return [
      {
        id: 'primary',
        name: '默认 Key',
        key: primaryKey,
        status: 'active',
        source: 'manual',
        route_type: defaultApiKeyRouteType(site),
        api_type: defaultApiKeyRouteType(site),
      },
      ...entries,
    ]
  }
  return entries
}

export function siteApiKeyEntries(site: Pick<Site, 'credentials'>): SiteApiKeyEntry[] {
  const credentials = site.credentials as Record<string, unknown>
  const raw = storedApiKeyEntries(credentials)
  if (raw.length) {
    return raw
      .map((item, index) => siteApiKeyEntryFromRecord(item, index, credentials))
      .filter((item): item is SiteApiKeyEntry => Boolean(item))
  }

  const fallback = apiKeyValue(site.credentials as Record<string, unknown>)
  if (!fallback) {
    return []
  }
  return [
    {
      id: 'primary',
      entryIndex: 0,
      name: '默认 Key',
      key: fallback,
      status: 'active',
      isPrimary: true,
      source: '',
      routeType: '',
      routePath: '',
      requestBaseURLs: [],
      imageGenerationPath: '',
      imageEditPath: '',
      isManual: false,
    },
  ]
}

function siteApiKeyEntryFromRecord(
  entry: SiteApiKeyRecord,
  index: number,
  credentials: Record<string, unknown>,
): SiteApiKeyEntry | null {
  const key = apiKeyEntryValue(entry, 'key')
  if (!key) {
    return null
  }
  const source = apiKeyEntryValue(entry, 'source')
  const routeType = normalizeApiKeyRouteType(
    entry?.route_type ?? entry?.api_type ?? entry?.api_format ?? entry?.type,
  )
  return {
    id: apiKeyEntryValue(entry, 'id') || `${source || 'api-key'}-${index}`,
    entryIndex: index,
    name: apiKeyEntryValue(entry, 'name') || `Key ${index + 1}`,
    key,
    status: apiKeyEntryValue(entry, 'status') || 'unknown',
    isPrimary: Boolean(entry?.is_primary) || key === apiKeyValue(credentials),
    source,
    routeType,
    routePath: apiKeyRoutePath(entry),
    requestBaseURLs: apiKeyRequestBaseURLs(entry),
    imageGenerationPath: apiKeyImageGenerationPath(entry),
    imageEditPath: apiKeyImageEditPath(entry),
    isManual: isManualApiKeyEntry(entry),
  }
}

export function siteApiKeyCount(site: Pick<Site, 'credentials'>): number {
  return siteApiKeyEntries(site).length
}

export function siteApiKeyCountNeedsEndpoint(
  site: Pick<Site, 'credentials' | 'plugin_key'>,
  supportsApiKeySync: (site: Pick<Site, 'plugin_key'>) => boolean,
): boolean {
  return siteApiKeyCount(site) === 0 && supportsApiKeySync(site)
}

export function siteApiKeyCountLabel(
  site: Pick<Site, 'credentials' | 'plugin_key'>,
  supportsApiKeySync: (site: Pick<Site, 'plugin_key'>) => boolean,
): string {
  const count = siteApiKeyCount(site)
  if (count > 0) {
    return `${count} 个`
  }
  if (siteApiKeyCountNeedsEndpoint(site, supportsApiKeySync)) {
    return '补充 apikey 接口路径'
  }
  return '0'
}

export function siteApiKeyCountTagColor(
  site: Pick<Site, 'credentials' | 'plugin_key'>,
  supportsApiKeySync: (site: Pick<Site, 'plugin_key'>) => boolean,
): string {
  if (siteApiKeyCount(site) > 0) {
    return 'green'
  }
  return siteApiKeyCountNeedsEndpoint(site, supportsApiKeySync) ? 'warning' : 'default'
}

export function requestApiUrlText(site: Pick<Site, 'plugin_config'>): string {
  const raw = (site.plugin_config as Record<string, unknown>)?.api_request_urls
  return normalizeStringList(raw).join('\n')
}

export function defaultRequestApiUrl(site: Pick<Site, 'base_url' | 'plugin_config'>): string {
  const pluginConfig = site.plugin_config as Record<string, unknown>
  return normalizeStringList([
    ...normalizeStringList(pluginConfig?.gateway_request_urls),
    String(pluginConfig?.gateway_request_url ?? '').trim(),
    String(pluginConfig?.endpoint_url ?? '').trim(),
    String(site.base_url ?? '').trim(),
  ])[0] ?? ''
}

export function apiKeyRouteTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    general: '通用',
    gpt: 'GptChat',
    codex: 'Codex',
    claude: 'Claude',
    gemini: 'Gemini',
  }
  return labels[value] ?? '默认类型'
}

export function apiKeyRoutePathLabel(value: string): string {
  const labels: Record<string, string> = {
    '': '跟随客户端',
    'chat/completions': '/v1/chat/completions',
    responses: '/v1/responses',
  }
  return labels[value] ?? '跟随客户端'
}

export function apiKeySourceLabel(entry: SiteApiKeyEntry): string {
  if (entry.isManual) {
    return '自定义'
  }
  return entry.source ? '接口' : '默认'
}
