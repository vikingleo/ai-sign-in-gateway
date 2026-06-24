import type { DuplicateSiteGroup, Site } from './types.ts'
import { includesSearch } from './viewUtils.ts'

export type SiteApiKeyCountLabelReader = (site: Site) => string
export type SitePluginNameReader = (pluginKey: string) => string
export type SiteGroupNameReader = (site: Pick<Site, 'group_name'>) => string

export function isImportedSitePayload(payload: { plugin_config?: Record<string, unknown> }): boolean {
  return payload.plugin_config?.cc_switch_source_version !== undefined
}

export function displayPluginLabel(site: Site, pluginNameFor: SitePluginNameReader): string {
  if (site.plugin_key === 'api-supplier' && isImportedSitePayload(site)) {
    return '导入记录'
  }
  return pluginNameFor(site.plugin_key)
}

export function filterSites(
  sites: readonly Site[],
  keyword: string,
  readers: {
    displayGroupName: SiteGroupNameReader
    displayPluginLabel: (site: Site) => string
    siteApiKeyCountLabel: SiteApiKeyCountLabelReader
  },
): Site[] {
  const normalized = keyword.trim().toLowerCase()
  return sites.filter((site) =>
    includesSearch(
      [
        site.name,
        site.base_url,
        readers.displayGroupName(site),
        site.group_name,
        readers.displayPluginLabel(site),
        site.notes,
        site.last_message,
        site.balance_display,
        site.package_display,
        readers.siteApiKeyCountLabel(site),
      ],
      normalized,
    ),
  )
}

export function filterDuplicateGroups(groups: readonly DuplicateSiteGroup[], keyword: string): DuplicateSiteGroup[] {
  const normalized = keyword.trim().toLowerCase()
  return groups.filter((group) =>
    includesSearch(
      [
        group.base_url,
        group.plugin_key,
        group.account,
        group.sites.map((site) => site.name).join(' '),
        group.sites.map((site) => site.plugin_key).join(' '),
        group.sites.map((site) => site.notes).join(' '),
      ],
      normalized,
    ),
  )
}

export function duplicateGroupRowKey(group: DuplicateSiteGroup): string {
  return `${group.plugin_key}:${group.base_url}:${group.account}:${group.suggested_keep_id}`
}

export function duplicateSuggestedSiteName(group: DuplicateSiteGroup): string {
  return group.sites.find((site) => site.suggested_keep)?.name || '-'
}
