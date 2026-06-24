import type { CheckinRun, CheckinSite, Site } from './types.ts'

export function checkinMetaFor(site: Pick<Site, 'id'>, checkinMeta: ReadonlyMap<number, CheckinSite>): CheckinSite | undefined {
  return checkinMeta.get(site.id)
}

export function siteCanCheckin(site: Pick<Site, 'id'>, checkinMeta: ReadonlyMap<number, CheckinSite>): boolean {
  return Boolean(checkinMetaFor(site, checkinMeta)?.can_checkin)
}

export function siteIncludedInCheckin(site: Pick<Site, 'id'>, checkinMeta: ReadonlyMap<number, CheckinSite>): boolean {
  return Boolean(checkinMetaFor(site, checkinMeta)?.include_in_checkin)
}

export function visibleCheckinStatus(site: Site, checkinMeta: ReadonlyMap<number, CheckinSite>): string | null {
  if (!siteCanCheckin(site, checkinMeta) || !siteIncludedInCheckin(site, checkinMeta)) {
    return null
  }
  return site.checkin_status ?? null
}

export function siteRunnableForCheckin(site: Site, checkinMeta: ReadonlyMap<number, CheckinSite>): boolean {
  return site.is_enabled && siteCanCheckin(site, checkinMeta) && siteIncludedInCheckin(site, checkinMeta)
}

export function siteCheckinActionLabel(site: Pick<Site, 'id'>, checkinMeta: ReadonlyMap<number, CheckinSite>): string {
  return checkinMetaFor(site, checkinMeta)?.checkin_label || '签到'
}

export function includedCheckinCount(sites: readonly Site[], checkinMeta: ReadonlyMap<number, CheckinSite>): number {
  return sites.filter((site) => siteIncludedInCheckin(site, checkinMeta)).length
}

export function batchCheckinTargetSites(
  sites: readonly Site[],
  checkinMeta: ReadonlyMap<number, CheckinSite>,
  onlyEnabled: boolean,
): Site[] {
  return sites.filter((site) => (onlyEnabled ? siteRunnableForCheckin(site, checkinMeta) : siteCanCheckin(site, checkinMeta)))
}

export function batchCheckinTargetCount(
  sites: readonly Site[],
  checkinMeta: ReadonlyMap<number, CheckinSite>,
  onlyEnabled: boolean,
): number {
  return batchCheckinTargetSites(sites, checkinMeta, onlyEnabled).length
}

export function availableCheckinSiteIds(sites: readonly Site[], checkinMeta: ReadonlyMap<number, CheckinSite>): Set<number> {
  return new Set(sites.filter((site) => siteRunnableForCheckin(site, checkinMeta)).map((site) => site.id))
}

export function syncSelectedCheckinIds(selectedIds: readonly number[], availableIds: ReadonlySet<number>): number[] {
  return selectedIds.filter((id) => availableIds.has(id))
}

export function filterCheckinRuns(runs: readonly CheckinRun[], search: string): CheckinRun[] {
  const keyword = search.trim().toLowerCase()
  if (!keyword) {
    return [...runs]
  }
  return runs.filter((run) =>
    [run.site_name, run.status, run.trigger_type, run.message]
      .some((value) => String(value ?? '').toLowerCase().includes(keyword)),
  )
}
