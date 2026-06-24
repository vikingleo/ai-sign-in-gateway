export function buildGatewayRequestUrl(apiBase: string, origin: string) {
  const fallback = `${origin}/api/gateway`
  const normalizedBase = apiBase.trim()
  if (!normalizedBase) {
    return fallback
  }

  try {
    const absoluteBase = normalizedBase.startsWith('http')
      ? normalizedBase
      : new URL(normalizedBase, origin).toString()
    const baseWithSlash = absoluteBase.endsWith('/') ? absoluteBase : `${absoluteBase}/`
    return new URL('./gateway', baseWithSlash).toString()
  } catch {
    return fallback
  }
}

export function buildCodexGatewayRequestUrl(gatewayUrl: string) {
  return `${gatewayUrl.replace(/\/$/, '')}/v1`
}

export function buildCodexGatewayTooltip(codexGatewayUrl: string) {
  return `Codex CLI 的 Base URL 需要使用 ${codexGatewayUrl}，也就是在网关地址后追加 /v1。`
}

export function buildGatewayRequestUrlCopyErrorPlan() {
  return {
    notice: {
      tone: 'error' as const,
      message: '复制失败，请手动复制。',
    },
  }
}

export function buildGatewayRequestUrlCopySuccessPlan() {
  return {
    notice: {
      tone: 'success' as const,
      message: '网关请求地址已复制。',
    },
  }
}

export function buildGatewayApiKeyCopyErrorPlan() {
  return {
    notice: {
      tone: 'error' as const,
      message: '复制失败，请手动复制。',
    },
  }
}

export function buildGatewayApiKeyCopySuccessPlan() {
  return {
    notice: {
      tone: 'success' as const,
      message: '网关 API Key 已复制。',
    },
  }
}

export function buildGatewayApiKeyMissingPlan(apiKey: string) {
  const isMissing = !apiKey
  return {
    isMissing,
    notice: isMissing ? {
      tone: 'error' as const,
      message: '后端未配置 GATEWAY_API_KEY。',
    } : null,
  }
}

export function normalizeGatewayApiKeyCopyValue(apiKey: string) {
  return apiKey.trim()
}

export function maskGatewayApiKey(apiKey: string) {
  const value = apiKey.trim()
  if (!value) {
    return '未配置 GATEWAY_API_KEY'
  }
  if (value.length <= 12) {
    return '*'.repeat(value.length)
  }
  return `${value.slice(0, 6)}...${value.slice(-6)}`
}
