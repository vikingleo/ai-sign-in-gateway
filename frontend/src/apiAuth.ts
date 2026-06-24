import { clearToken, setToken } from './session'
import { request, type RequestOptions } from './apiCore'
import type { AdminUser, PublicInvite } from './types'

export async function login(username: string, password: string): Promise<void> {
  const data = await request<{ access_token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setToken(data.access_token)
}

export function logout(): void {
  clearToken()
}

export function getMe(options: RequestOptions = {}): Promise<AdminUser> {
  return request('/auth/me', { signal: options.signal })
}

export function getAdminUsers(): Promise<AdminUser[]> {
  return request('/auth/admin-users')
}

export interface AdminUserCreatePayload {
  username: string
  password: string
  role?: string
  is_enabled?: boolean
}

export interface AdminUserUpdatePayload {
  username?: string
  role?: string
  is_enabled?: boolean
  new_password?: string
}

export function createAdminUser(payload: AdminUserCreatePayload): Promise<AdminUser> {
  return request('/auth/admin-users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminUser(id: number, payload: AdminUserUpdatePayload): Promise<AdminUser> {
  return request(`/auth/admin-users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteAdminUser(id: number): Promise<{ deleted: boolean }> {
  return request(`/auth/admin-users/${id}`, {
    method: 'DELETE',
  })
}

export function getPublicInvites(): Promise<PublicInvite[]> {
  return request('/public/invites')
}

export interface AdminAccountUpdatePayload {
  current_password: string
  new_username?: string
  new_password?: string
}

export interface AdminAccountUpdateResult {
  user: AdminUser
  access_token: string
  token_type: string
}

export async function updateAdminAccount(
  payload: AdminAccountUpdatePayload,
): Promise<AdminAccountUpdateResult> {
  const result = await request<AdminAccountUpdateResult>('/auth/account', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  if (result?.access_token) {
    setToken(result.access_token)
  }
  return result
}
