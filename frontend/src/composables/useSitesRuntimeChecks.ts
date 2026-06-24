import { computed, ref, type Ref } from 'vue'
import {
  probeSiteBalance,
  refreshSiteSummaries,
} from '../api'
import { formatBalance } from '../format'
import { formatProgressLabel } from '../sitesMetricsModel'
import {
  mergeBalanceProbeResult,
  mergeSiteSummary,
  type BalanceProbeUpdate,
} from '../sitesResultModel'
import type { useToast } from '../toast'
import type { Site, SiteSummary } from '../types'

type Toast = ReturnType<typeof useToast>

type UseSitesRuntimeChecksOptions = {
  sites: Ref<Site[]>
  busy: Ref<boolean>
  toast: Toast
  runSiteBatch: <T>(items: T[], worker: (item: T) => Promise<void>, concurrency?: number) => Promise<void>
}

type RefreshTableSummariesOptions = {
  throwOnError?: boolean
}

export function useSitesRuntimeChecks(options: UseSitesRuntimeChecksOptions) {
  const connectivitySweepProgress = ref<{ total: number; done: number; success: number; failed: number } | null>(null)
  const balanceProbeIds = ref<number[]>([])
  const connectivitySweepLabel = computed(() => formatProgressLabel(connectivitySweepProgress.value, '连通测试', '连通中'))

  function applySiteSummary(summary: SiteSummary) {
    const target = options.sites.value.find((site) => site.id === summary.site_id)
    if (!target) {
      return
    }
    Object.assign(target, mergeSiteSummary(target, summary))
  }

  function applyBalanceProbeResult(result: { site_id: number } & BalanceProbeUpdate) {
    const target = options.sites.value.find((site) => site.id === result.site_id)
    if (!target) {
      return
    }
    Object.assign(target, mergeBalanceProbeResult(target, result))
  }

  async function refreshTableSummaries(refreshOptions: RefreshTableSummariesOptions = {}) {
    if (!options.sites.value.length) {
      return
    }
    try {
      const summaries = await refreshSiteSummaries()
      summaries.forEach(applySiteSummary)
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '站点摘要刷新失败')
      if (refreshOptions.throwOnError) {
        throw err
      }
    }
  }

  async function handleConnectivitySweep() {
    const targets = options.sites.value.filter((site) => site.is_enabled)
    if (!targets.length) {
      options.toast.error('当前没有启用站点可测试。')
      return
    }

    options.busy.value = true
    connectivitySweepProgress.value = { total: targets.length, done: 0, success: 0, failed: 0 }
    try {
      await options.runSiteBatch(targets, async (site) => {
        try {
          const summaries = await refreshSiteSummaries({ site_ids: [site.id] })
          const summary = summaries[0]
          if (summary) {
            applySiteSummary(summary)
            if (summary.connection_status === 'success') {
              connectivitySweepProgress.value!.success += 1
            } else {
              connectivitySweepProgress.value!.failed += 1
            }
          } else {
            connectivitySweepProgress.value!.failed += 1
          }
        } catch (err) {
          connectivitySweepProgress.value!.failed += 1
          const target = options.sites.value.find((item) => item.id === site.id)
          if (target) {
            target.last_status = 'failed'
            target.connection_status = 'failed'
            target.last_message = err instanceof Error ? err.message : '连通测试失败'
            target.last_run_at = new Date().toISOString()
          }
        } finally {
          connectivitySweepProgress.value!.done += 1
        }
      })
      options.toast.success(
        `连通测试完成：成功 ${connectivitySweepProgress.value!.success}，失败 ${connectivitySweepProgress.value!.failed}。`,
      )
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '连通测试失败')
    } finally {
      connectivitySweepProgress.value = null
      options.busy.value = false
    }
  }

  function isBalanceProbing(siteId: number) {
    return balanceProbeIds.value.includes(siteId)
  }

  async function handleProbeSiteBalance(site: Site) {
    if (balanceProbeIds.value.includes(site.id)) {
      return
    }
    balanceProbeIds.value = [...balanceProbeIds.value, site.id]
    try {
      const result = await probeSiteBalance(site.id)
      applyBalanceProbeResult(result)
      if (result.ok) {
        options.toast.success(`${site.name} 余额读取成功：${formatBalance(result.remaining, result.unit)}（${result.base_url}）`)
      } else {
        options.toast.error(`${site.name} 余额读取失败：${result.message}`)
      }
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '余额读取失败')
    } finally {
      const nextProbeIds = [...balanceProbeIds.value]
      const probeIndex = nextProbeIds.indexOf(site.id)
      if (probeIndex !== -1) {
        nextProbeIds.splice(probeIndex, 1)
        balanceProbeIds.value = nextProbeIds
      }
    }
  }

  return {
    connectivitySweepLabel,
    refreshTableSummaries,
    handleConnectivitySweep,
    isBalanceProbing,
    handleProbeSiteBalance,
    applyBalanceProbeResult,
  }
}
