export type SearchValue = string | number | boolean | null | undefined

export function formatNumber(value: number | null | undefined): string {
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? numeric.toLocaleString('zh-CN') : '0'
}

export function normalizeStringList(values: unknown): string[] {
  const raw = Array.isArray(values)
    ? values.map((item) => String(item ?? ''))
    : String(values ?? '').split(/[\n\r,，\t]+/)
  return raw
    .map((item) => item.trim())
    .filter((item, index, source) => item && source.indexOf(item) === index)
}

export function supportedModelsPreview(values: unknown, limit = 2): string {
  const normalized = normalizeStringList(values)
  if (!normalized.length) {
    return '未声明'
  }
  const preview = normalized.slice(0, limit).join(' / ')
  return normalized.length > limit ? `${preview} 等 ${normalized.length} 个` : preview
}

export function shortFingerprint(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return ''
  }
  return raw.length <= 10 ? raw : `${raw.slice(0, 6)}...${raw.slice(-4)}`
}

export function compactText(value: string | null | undefined, limit = 36): string {
  const text = String(value ?? '').trim()
  if (!text) {
    return ''
  }
  return text.length > limit ? `${text.slice(0, limit)}...` : text
}

export function includesSearch(values: SearchValue[], keyword: string): boolean {
  if (!keyword) {
    return true
  }
  return values.some((value) => String(value ?? '').toLowerCase().includes(keyword))
}

export function formatElapsed(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) {
    return '0 ms'
  }
  if (ms < 1000) {
    return `${ms} ms`
  }
  if (ms < 60_000) {
    return `${Math.round(ms / 100) / 10} s`
  }
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  return `${minutes}m ${seconds}s`
}

export function buildExternalUrl(baseUrl: string, path = ''): string | null {
  const normalized = baseUrl.trim()
  if (!normalized) {
    return null
  }
  try {
    const target = new URL(normalized)
    if (!path.trim()) {
      return target.toString()
    }
    return new URL(path, target.toString()).toString()
  } catch {
    return null
  }
}
