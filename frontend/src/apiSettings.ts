import { request, requestDownload, requestForm, type RequestOptions } from './apiCore'
import type {
  RuntimeConfigDirResult,
  RuntimeDatabaseBackupNowResult,
  RuntimeDatabaseBackupsResult,
  RuntimeDatabaseImportResult,
  RuntimeStopStalePortsResult,
  SettingsData,
} from './types'

export function getSettings(options: RequestOptions = {}): Promise<SettingsData> {
  return request('/settings', { signal: options.signal })
}

export function updateSettings(payload: SettingsData): Promise<SettingsData> {
  return request('/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function runSchedulerNow(): Promise<{ status: string; message: string }> {
  return request('/settings/scheduler/run-now', {
    method: 'POST',
  })
}

export function openRuntimeUrl(url: string): Promise<{ status: string; message: string }> {
  return request('/settings/runtime/open-url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}

export function stopStaleRuntimePorts(): Promise<RuntimeStopStalePortsResult> {
  return request('/settings/runtime/stop-stale-ports', {
    method: 'POST',
  })
}

export function setRuntimeConfigDir(configDir: string): Promise<RuntimeConfigDirResult> {
  return request('/settings/runtime/config-dir', {
    method: 'POST',
    body: JSON.stringify({ config_dir: configDir }),
  })
}

export function uploadRuntimeDatabase(file: File): Promise<RuntimeDatabaseImportResult> {
  const form = new FormData()
  form.append('database', file)
  return requestForm('/settings/runtime/database', form)
}

export function getRuntimeDatabaseBackups(): Promise<RuntimeDatabaseBackupsResult> {
  return request('/settings/runtime/database/backups')
}

export function backupRuntimeDatabaseNow(): Promise<RuntimeDatabaseBackupNowResult> {
  return request('/settings/runtime/database/backups', {
    method: 'POST',
  })
}

export function deleteRuntimeDatabaseBackup(name: string): Promise<RuntimeDatabaseBackupsResult> {
  return request(`/settings/runtime/database/backups/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
}

export function downloadRuntimeDatabaseBackup(name: string): Promise<{ blob: Blob; filename: string }> {
  return requestDownload(`/settings/runtime/database/backups/${encodeURIComponent(name)}/download`, name)
}

export function downloadRuntimeConfigArchive(): Promise<{ blob: Blob; filename: string }> {
  return requestDownload('/settings/runtime/config-dir/archive', 'ai-sign-in-gateway-config.zip')
}
