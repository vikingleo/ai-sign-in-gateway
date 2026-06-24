import { request, type RequestOptions } from './apiCore'
import type {
  BalanceProbeResult,
  CheckinRun,
  CheckinSite,
  DuplicateSiteGroup,
  DuplicateSiteMergeResult,
  LocalStorageAnalyzeResult,
  QueueTask,
  Site,
  SiteApiKeyRefreshResult,
  SiteGroup,
  SiteHealth,
  SiteInviteRefreshResult,
  SitePayload,
  SiteRegistrationBatchPayload,
  SiteRegistrationBatchResult,
  SiteSummary,
  TotpPreview,
} from './types'

export function getSites(): Promise<Site[]> {
  return request('/sites')
}

export function getSite(id: number): Promise<Site> {
  return request(`/sites/${id}`)
}

export function getDuplicateSites(): Promise<DuplicateSiteGroup[]> {
  return request('/sites/cleanup-duplicates')
}

export function mergeDuplicateSites(): Promise<DuplicateSiteMergeResult> {
  return request('/sites/cleanup-duplicates/merge', {
    method: 'POST',
  })
}

export function refreshSiteSummaries(payload: { site_ids?: number[]; only_enabled?: boolean } = {}): Promise<SiteSummary[]> {
  return request('/sites/refresh-summaries', {
    method: 'POST',
    body: JSON.stringify({
      site_ids: payload.site_ids ?? [],
      only_enabled: payload.only_enabled ?? false,
    }),
  })
}

export function refreshSiteInvites(payload: { site_ids?: number[]; only_enabled?: boolean } = {}): Promise<SiteInviteRefreshResult[]> {
  return request('/sites/invites/refresh', {
    method: 'POST',
    body: JSON.stringify({
      site_ids: payload.site_ids ?? [],
      only_enabled: payload.only_enabled ?? false,
    }),
  })
}

export function refreshSiteApiKeys(payload: { site_ids?: number[]; only_enabled?: boolean } = {}): Promise<SiteApiKeyRefreshResult[]> {
  return request('/sites/api-keys/refresh', {
    method: 'POST',
    body: JSON.stringify({
      site_ids: payload.site_ids ?? [],
      only_enabled: payload.only_enabled ?? false,
    }),
  })
}

export function refreshOneSiteApiKeys(id: number): Promise<SiteApiKeyRefreshResult> {
  return request(`/sites/${id}/api-keys/refresh`, {
    method: 'POST',
  })
}

export function createSite(payload: SitePayload): Promise<Site> {
  return request('/sites', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createRegistrationBatchSites(
  payload: SiteRegistrationBatchPayload,
): Promise<SiteRegistrationBatchResult> {
  return request('/sites/register-batch', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateSite(id: number, payload: SitePayload): Promise<Site> {
  return request(`/sites/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function toggleSite(id: number): Promise<Site> {
  return request(`/sites/${id}/toggle`, {
    method: 'POST',
  })
}

export function deleteSite(id: number): Promise<void> {
  return request(`/sites/${id}`, {
    method: 'DELETE',
  })
}

export function testSite(id: number): Promise<SiteHealth> {
  return request(`/sites/${id}/test`, {
    method: 'POST',
  })
}

export function probeSiteBalance(id: number): Promise<BalanceProbeResult> {
  return request(`/sites/${id}/balance-probe`, {
    method: 'POST',
  })
}

export function testSiteDraft(payload: SitePayload & { site_id?: number | null }): Promise<SiteHealth> {
  return request('/sites/test-draft', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function analyzeLocalStorage(raw_text: string): Promise<LocalStorageAnalyzeResult> {
  return request('/sites/storage/analyze', {
    method: 'POST',
    body: JSON.stringify({ raw_text }),
  })
}

export function getSiteGroups(options: RequestOptions = {}): Promise<SiteGroup[]> {
  return request('/sites/groups', { signal: options.signal })
}

export function createSiteGroup(name: string): Promise<SiteGroup> {
  return request('/sites/groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function renameSiteGroup(old_name: string, new_name: string): Promise<SiteGroup> {
  return request('/sites/groups', {
    method: 'PUT',
    body: JSON.stringify({ old_name, new_name }),
  })
}

export function deleteSiteGroup(name: string): Promise<{ status: string; message: string }> {
  return request('/sites/groups', {
    method: 'DELETE',
    body: JSON.stringify({ name }),
  })
}

export function getSiteQueue(id: number): Promise<QueueTask[]> {
  return request(`/sites/${id}/queue`)
}

export function activateSiteQueueTask(id: number, taskKey: string, message = ''): Promise<QueueTask> {
  return request(`/sites/${id}/queue/${taskKey}/activate`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export function previewSiteTotp(id: number): Promise<TotpPreview> {
  return request(`/sites/${id}/totp-preview`)
}

export function runSiteCheckin(
  id: number,
): Promise<{
  run: number
  status: string
  message: string
  balance: number | null
  balance_unit?: string | null
  balance_display?: string | null
  package_display?: string | null
  checkin_status?: string | null
  connection_status?: string | null
}> {
  return request(`/sites/${id}/checkin`, {
    method: 'POST',
  })
}

export function getRuns(limit = 50): Promise<CheckinRun[]> {
  return request(`/checkins/runs?limit=${limit}`)
}

export function getCheckinSites(): Promise<CheckinSite[]> {
  return request('/checkins/sites')
}

export function updateCheckinParticipation(
  id: number,
  includeInCheckin: boolean,
): Promise<CheckinSite> {
  return request(`/checkins/sites/${id}/participation`, {
    method: 'POST',
    body: JSON.stringify({ include_in_checkin: includeInCheckin }),
  })
}

export function runBatch(siteIds: number[] = [], onlyEnabled?: boolean): Promise<CheckinRun[]> {
  const payload: { site_ids: number[]; only_enabled?: boolean } = { site_ids: siteIds }
  if (onlyEnabled !== undefined) {
    payload.only_enabled = onlyEnabled
  }
  return request('/checkins/batch', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
