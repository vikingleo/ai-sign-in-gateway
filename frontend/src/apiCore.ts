import { clearToken, getToken } from './session'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export type RequestOptions = {
  signal?: AbortSignal
}

export type GatewayLogStatusFilter = 'all' | 'error' | 'success'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function extractErrorMessage(data: unknown): string {
  if (typeof data !== 'object' || data === null) {
    return '请求失败'
  }

  const candidate = data as { detail?: unknown; message?: unknown }
  const value = candidate.detail ?? candidate.message
  if (typeof value === 'string') {
    return value
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return '请求失败'
    }
  }
  return '请求失败'
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')

  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  if (response.status === 401) {
    clearToken()
    throw new ApiError('登录状态失效，请重新登录。', 401)
  }

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data), response.status)
  }

  return data as T
}

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError'
}

export async function requestForm<T>(path: string, body: FormData): Promise<T> {
  const headers = new Headers()

  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body,
  })

  if (response.status === 401) {
    clearToken()
    throw new ApiError('登录状态失效，请重新登录。', 401)
  }

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data), response.status)
  }

  return data as T
}

function filenameFromDisposition(disposition: string | null, fallback: string): string {
  if (!disposition) {
    return fallback
  }
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }
  const match = disposition.match(/filename="?([^";]+)"?/i)
  return match?.[1] || fallback
}

export async function requestDownload(path: string, fallbackFilename: string): Promise<{ blob: Blob; filename: string }> {
  const headers = new Headers()
  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers,
  })

  if (response.status === 401) {
    clearToken()
    throw new ApiError('登录状态失效，请重新登录。', 401)
  }

  if (!response.ok) {
    const text = await response.text()
    let data: unknown = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { message: text }
      }
    }
    throw new ApiError(extractErrorMessage(data), response.status)
  }

  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get('Content-Disposition'), fallbackFilename),
  }
}
