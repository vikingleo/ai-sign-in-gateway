import type { LocalStorageAnalyzeResult } from './types.ts'

export const defaultCredentialKeys = [
  'account',
  'email',
  'username',
  'user_id',
  'access_token',
  'refresh_token',
  'api_key',
  'cookie',
  'user_agent',
]

export const consoleCollectorScript = `(() => {
  const pick = (storage) => Object.fromEntries(
    Array.from({ length: storage.length }, (_, index) => {
      const key = storage.key(index) || ''
      return [key, storage.getItem(key) || '']
    }),
  )
  const decodeJWT = (token) => {
    try {
      const raw = String(token || '').replace(/^Bearer\\s+/i, '').split('.')[1]
      if (!raw) return null
      return JSON.parse(decodeURIComponent(escape(atob(raw.replace(/-/g, '+').replace(/_/g, '/')))))
    } catch {
      return null
    }
  }
  const sanitizeConfig = (value) => {
    if (typeof value === 'string') {
      if (/^data:image\\//i.test(value)) return value.slice(0, 96) + '...[omitted]'
      if (value.length > 2000) return value.slice(0, 2000) + '...[truncated]'
      return value
    }
    if (Array.isArray(value)) return value.map(sanitizeConfig)
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeConfig(item)]))
    }
    return value
  }
  const local = pick(window.localStorage)
  const session = pick(window.sessionStorage)
  const tokenPayloads = {}
  Object.entries({ ...local, ...session }).forEach(([key, value]) => {
    if (/token|jwt/i.test(key)) {
      const decoded = decodeJWT(value)
      if (decoded) tokenPayloads[key] = decoded
    }
  })
  const appConfig = sanitizeConfig(window.__APP_CONFIG__ || window.APP_CONFIG || window.appConfig || null)
  const textForGuess = [location.href, document.title, JSON.stringify(appConfig || {}), Object.keys(local).join(' ')].join(' ').toLowerCase()
  const pluginKey = textForGuess.includes('sub2api') || textForGuess.includes('耀闪') || local.auth_token
    ? 'sub2api-platform'
    : (textForGuess.includes('newapi') || textForGuess.includes('oneapi') ? 'yellowpeach-newapi' : '')
  const payload = {
    url: location.href,
    title: document.title || '',
    pluginKey,
    appConfig,
    tokenPayloads,
    userAgent: navigator.userAgent,
    cookie: document.cookie || '',
    localStorage: local,
    sessionStorage: session,
    capturedAt: new Date().toISOString(),
  }
  const text = JSON.stringify(payload, null, 2)
  try {
    if (typeof copy === 'function') {
      copy(text)
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
    }
  } catch {}
  return text
})()`

export function ensureField(model: Record<string, any>, key: string, type: string) {
  if (model[key] === undefined) {
    model[key] = type === 'number' ? 0 : ''
  }
}

export function configTextValue(config: Record<string, unknown>, key: string): string | number | undefined {
  const value = config[key]
  if (value === undefined || value === null) {
    return undefined
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean).join('\n')
  }
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function configNumberValue(config: Record<string, unknown>, key: string): number | undefined {
  const value = config[key]
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value)
    if (Number.isFinite(numeric)) {
      return numeric
    }
  }
  return undefined
}

export function credentialAutocomplete(_fieldName: string, fieldType: string): string {
  if (fieldType === 'password') {
    return 'new-password'
  }
  return 'off'
}

export function credentialInputName(fieldName: string): string {
  return `site-credential-${fieldName}`
}

export function buildCredentialSuggestions(suggested: Record<string, string>): Map<string, string> {
  const entries = new Map<string, string>()
  const put = (key: string, value: unknown) => {
    const text = String(value ?? '').trim()
    if (key && text && !entries.has(key)) {
      entries.set(key, text)
    }
  }

  for (const [key, value] of Object.entries(suggested)) {
    put(key, value)
  }
  const account = suggested.account || suggested.email || suggested.username || suggested.user_id
  put('account', account)
  put('email', suggested.email || suggested.username || suggested.account)
  put('username', suggested.username || suggested.email || suggested.account)
  put('user_id', suggested.user_id)
  put('access_token', suggested.access_token || suggested.auth_token || suggested.token)
  put('refresh_token', suggested.refresh_token)
  put('cookie', suggested.cookie)
  put('user_agent', suggested.user_agent)
  return entries
}

export function summarizeStorageKeys(payload: LocalStorageAnalyzeResult): string[] {
  const localKeys = Object.keys(payload.local_storage)
  const sessionKeys = Object.keys(payload.session_storage)
  const localPreview = localKeys.length ? localKeys.slice(0, 8).join('，') : '无'
  return [
    `页面：${payload.page_title || payload.page_url || '未知页面'}`,
    `已解析：${payload.parsed_items} 项`,
    `Cookie：${payload.cookie_header ? '已包含可读 Cookie' : '无可读 Cookie'}`,
    `localStorage Key：${localPreview}${localKeys.length > 8 ? ' ...' : ''}`,
    `sessionStorage Key：${sessionKeys.length ? sessionKeys.slice(0, 8).join('，') : '无'}${sessionKeys.length > 8 ? ' ...' : ''}`,
  ]
}

export function isValidEmailPattern(value: string): boolean {
  return /\{n(?::0?\d+)?\}/.test(value) || /\{rand:\[[^\]]+\]\{\d+\}\}/.test(value)
}
