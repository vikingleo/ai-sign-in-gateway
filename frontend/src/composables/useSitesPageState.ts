import { computed, type Ref } from 'vue'
import { siteApiKeyCountLabel } from '../sitesApiKeyModel'
import { displayPluginLabel as readDisplayPluginLabel, filterSites } from '../sitesListModel'
import { buildSitesMetrics } from '../sitesMetricsModel'
import { createSiteColumns } from '../sitesViewConfig'
import { displayGroupName } from '../sitesViewModel'
import type { PluginMeta, Site } from '../types'

type UseSitesPageStateOptions = {
  plugins: Ref<PluginMeta[]>
  sites: Ref<Site[]>
  siteSearch: Ref<string>
  siteSupportsApiKeySync: (site: Pick<Site, 'plugin_key'>) => boolean
  visibleCheckinStatus: (site: Site) => string
  siteIncludedInCheckin: (site: Site) => boolean
}

export function useSitesPageState(options: UseSitesPageStateOptions) {
  function pluginNameFor(pluginKey: string) {
    return options.plugins.value.find((plugin) => plugin.key === pluginKey)?.name ?? pluginKey
  }

  function displayPluginLabel(site: Site) {
    return readDisplayPluginLabel(site, pluginNameFor)
  }

  const siteMetrics = computed(() => buildSitesMetrics(options.sites.value))
  const totalSiteCount = computed(() => siteMetrics.value.totalSiteCount)
  const enabledSiteCount = computed(() => siteMetrics.value.enabledSiteCount)
  const groupedSiteCount = computed(() => siteMetrics.value.groupedSiteCount)
  const readyGatewayCount = computed(() => siteMetrics.value.readyGatewayCount)
  const successSiteCount = computed(() => siteMetrics.value.successSiteCount)
  const failedSiteCount = computed(() => siteMetrics.value.failedSiteCount)
  const pendingSiteCount = computed(() => siteMetrics.value.pendingSiteCount)
  const totalBalanceSummary = computed(() => siteMetrics.value.totalBalanceSummary)
  const totalBalanceTone = computed(() => siteMetrics.value.totalBalanceTone)
  const quantifiedBalanceSiteCount = computed(() => siteMetrics.value.quantifiedBalanceSiteCount)

  const filteredSites = computed(() => filterSites(options.sites.value, options.siteSearch.value, {
    displayGroupName,
    displayPluginLabel,
    siteApiKeyCountLabel: (site) => siteApiKeyCountLabel(site, options.siteSupportsApiKeySync),
  }))

  const siteColumns = createSiteColumns({
    pluginNameFor,
    visibleCheckinStatus: options.visibleCheckinStatus,
    isIncludedInCheckin: options.siteIncludedInCheckin,
  })

  return {
    totalSiteCount,
    enabledSiteCount,
    groupedSiteCount,
    readyGatewayCount,
    successSiteCount,
    failedSiteCount,
    pendingSiteCount,
    totalBalanceSummary,
    totalBalanceTone,
    quantifiedBalanceSiteCount,
    filteredSites,
    siteColumns,
    displayPluginLabel,
  }
}
