import { getPlugins, getSite, getSiteGroups, getSites } from '../api'
import { normalizeSite } from '../sitesViewModel'
import type { useToast } from '../toast'
import type { PluginMeta, Site, SiteGroup } from '../types'
import type { Ref } from 'vue'

type Toast = ReturnType<typeof useToast>

type LoadDataOptions = {
  preserveEditor?: boolean
  throwOnError?: boolean
}

type UseSitesDataOptions = {
  plugins: Ref<PluginMeta[]>
  sites: Ref<Site[]>
  siteGroups: Ref<SiteGroup[]>
  selectedId: Ref<number | null>
  editingId: Ref<number | null>
  busy: Ref<boolean>
  toast: Toast
  assignEditor: (site?: Site | null) => void
}

export function useSitesData(options: UseSitesDataOptions) {
  async function loadData(
    preferredId: number | null = options.selectedId.value,
    loadOptions: LoadDataOptions = {},
  ) {
    options.busy.value = true
    try {
      const [pluginData, siteData, groupData] = await Promise.all([getPlugins(), getSites(), getSiteGroups()])
      options.plugins.value = pluginData
      options.sites.value = siteData.map(normalizeSite)
      options.siteGroups.value = groupData

      const nextSelected =
        preferredId !== null
          ? options.sites.value.find((item) => item.id === preferredId) ?? options.sites.value[0] ?? null
          : options.sites.value[0] ?? null

      options.selectedId.value = nextSelected?.id ?? null

      if (options.editingId.value !== null && !loadOptions.preserveEditor) {
        const refreshedEditing = siteData.find((item) => item.id === options.editingId.value) ?? null
        if (refreshedEditing) {
          const fullSite = await getSite(refreshedEditing.id)
          options.assignEditor(fullSite)
        }
      }
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '加载失败')
      if (loadOptions.throwOnError) {
        throw err
      }
    } finally {
      options.busy.value = false
    }
  }

  return { loadData }
}
