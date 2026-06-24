import { computed, ref, type Ref } from 'vue'
import {
  refreshOneSiteApiKeys,
  refreshSiteApiKeys,
} from '../api'
import { formatProgressLabel } from '../sitesMetricsModel'
import { mergeApiKeyRefreshResult } from '../sitesResultModel'
import type { useToast } from '../toast'
import type { Site, SiteApiKeyRefreshResult } from '../types'

type Toast = ReturnType<typeof useToast>

type UseSitesApiKeyRefreshOptions = {
  sites: Ref<Site[]>
  toast: Toast
  runSiteBatch: <T>(items: T[], worker: (item: T) => Promise<void>, concurrency?: number) => Promise<void>
  siteSupportsApiKeySync: (site: Pick<Site, 'plugin_key'>) => boolean
  syncRoutesAfterApiKeyUpdate: (successCount: number) => Promise<void>
}

export function useSitesApiKeyRefresh(options: UseSitesApiKeyRefreshOptions) {
  const apiKeyRefreshAllLoading = ref(false)
  const apiKeyRefreshingSiteIds = ref<number[]>([])
  const apiKeyRefreshProgress = ref<{ total: number; done: number; success: number; failed: number } | null>(null)
  const apiKeyRefreshAllLabel = computed(() => formatProgressLabel(apiKeyRefreshProgress.value, '更新全部 API Key', '更新中'))

  function isApiKeyRefreshing(siteId: number) {
    return apiKeyRefreshingSiteIds.value.includes(siteId)
  }

  function applyApiKeyRefreshResult(result: SiteApiKeyRefreshResult) {
    const target = options.sites.value.find((site) => site.id === result.site_id)
    if (!target) {
      return
    }
    Object.assign(target, mergeApiKeyRefreshResult(target, result))
  }

  async function refreshAllApiKeys() {
    const targets = options.sites.value.filter((site) => site.is_enabled && options.siteSupportsApiKeySync(site))
    if (!targets.length) {
      options.toast.error('当前没有可更新 API Key 的启用站点。')
      return
    }

    apiKeyRefreshAllLoading.value = true
    apiKeyRefreshProgress.value = { total: targets.length, done: 0, success: 0, failed: 0 }
    apiKeyRefreshingSiteIds.value = Array.from(new Set([...apiKeyRefreshingSiteIds.value, ...targets.map((site) => site.id)]))
    try {
      await options.runSiteBatch(targets, async (site) => {
        try {
          const result = await refreshOneSiteApiKeys(site.id)
          applyApiKeyRefreshResult(result)
          if (result.ok) {
            apiKeyRefreshProgress.value!.success += 1
          } else {
            apiKeyRefreshProgress.value!.failed += 1
          }
        } catch {
          apiKeyRefreshProgress.value!.failed += 1
        } finally {
          apiKeyRefreshProgress.value!.done += 1
          apiKeyRefreshingSiteIds.value = apiKeyRefreshingSiteIds.value.filter((siteId) => siteId !== site.id)
        }
      })
      if (apiKeyRefreshProgress.value.success > 0) {
        options.toast.success(`API Key 更新完成：成功 ${apiKeyRefreshProgress.value.success}，失败 ${apiKeyRefreshProgress.value.failed}。`)
        await options.syncRoutesAfterApiKeyUpdate(apiKeyRefreshProgress.value.success)
      } else {
        options.toast.error('未更新到可用 API Key。')
      }
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '批量更新 API Key 失败')
    } finally {
      const refreshedIds = new Set(targets.map((site) => site.id))
      apiKeyRefreshingSiteIds.value = apiKeyRefreshingSiteIds.value.filter((siteId) => !refreshedIds.has(siteId))
      apiKeyRefreshProgress.value = null
      apiKeyRefreshAllLoading.value = false
    }
  }

  async function handleRefreshSiteApiKeys(site: Site) {
    if (!options.siteSupportsApiKeySync(site)) {
      options.toast.error('当前插件不支持 API Key 同步。')
      return
    }
    apiKeyRefreshingSiteIds.value = Array.from(new Set([...apiKeyRefreshingSiteIds.value, site.id]))
    try {
      const result = await refreshSiteApiKeys({ site_ids: [site.id], only_enabled: false }).then((items) => items[0])
      if (!result) {
        throw new Error('站点未返回 API Key 更新结果。')
      }
      applyApiKeyRefreshResult(result)
      if (result.ok) {
        options.toast.success(`${site.name} ${result.message || `已更新 ${result.api_key_count} 个 API Key。`}`)
        await options.syncRoutesAfterApiKeyUpdate(1)
      } else {
        options.toast.error(`${site.name} ${result.message || '未更新到可用 API Key。'}`)
      }
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : 'API Key 更新失败')
    } finally {
      apiKeyRefreshingSiteIds.value = apiKeyRefreshingSiteIds.value.filter((item) => item !== site.id)
    }
  }

  return {
    apiKeyRefreshAllLoading,
    apiKeyRefreshAllLabel,
    isApiKeyRefreshing,
    refreshAllApiKeys,
    handleRefreshSiteApiKeys,
  }
}
