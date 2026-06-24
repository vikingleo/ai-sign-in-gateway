import { computed, ref, type Ref } from 'vue'
import {
  refreshSiteInvites,
  testSite,
} from '../api'
import { readSiteInviteInfo } from '../sitesEditorModel'
import { formatProgressLabel } from '../sitesMetricsModel'
import {
  mergeInviteRefreshResult,
  mergeSiteHealthResult,
} from '../sitesResultModel'
import type { useToast } from '../toast'
import type { Site, SiteInviteRefreshResult } from '../types'

type Toast = ReturnType<typeof useToast>

type UseSitesInvitesOptions = {
  sites: Ref<Site[]>
  toast: Toast
  runSiteBatch: <T>(items: T[], worker: (item: T) => Promise<void>, concurrency?: number) => Promise<void>
}

export function useSitesInvites(options: UseSitesInvitesOptions) {
  const inviteDialogOpen = ref(false)
  const inviteDialogLoading = ref(false)
  const inviteRefreshAllLoading = ref(false)
  const inviteLoadingSiteIds = ref<number[]>([])
  const inviteDialogSiteId = ref<number | null>(null)
  const inviteDialogSiteName = ref('')
  const inviteDialogLink = ref('')
  const inviteDialogCode = ref('')
  const inviteRefreshProgress = ref<{ total: number; done: number; success: number; failed: number } | null>(null)

  const inviteRefreshAllLabel = computed(() => formatProgressLabel(inviteRefreshProgress.value, '刷新邀请', '邀请中'))

  function isInviteLoading(siteId: number) {
    return inviteLoadingSiteIds.value.includes(siteId)
  }

  function applyInviteRefreshResult(result: SiteInviteRefreshResult) {
    const target = options.sites.value.find((site) => site.id === result.site_id)
    if (!target) {
      return
    }
    Object.assign(target, mergeInviteRefreshResult(target, result))
  }

  async function refreshAllInvites() {
    const targets = options.sites.value.filter((site) => site.is_enabled)
    if (!targets.length) {
      options.toast.error('当前没有启用站点可刷新邀请。')
      return
    }

    inviteRefreshAllLoading.value = true
    inviteRefreshProgress.value = { total: targets.length, done: 0, success: 0, failed: 0 }
    inviteLoadingSiteIds.value = Array.from(new Set([...inviteLoadingSiteIds.value, ...targets.map((site) => site.id)]))
    try {
      await options.runSiteBatch(targets, async (site) => {
        try {
          const results = await refreshSiteInvites({ site_ids: [site.id], only_enabled: true })
          const result = results[0]
          if (result) {
            applyInviteRefreshResult(result)
          }
          if (result?.ok) {
            inviteRefreshProgress.value!.success += 1
          } else {
            inviteRefreshProgress.value!.failed += 1
          }
        } catch {
          inviteRefreshProgress.value!.failed += 1
        } finally {
          inviteRefreshProgress.value!.done += 1
          inviteLoadingSiteIds.value = inviteLoadingSiteIds.value.filter((siteId) => siteId !== site.id)
        }
      })
      if (inviteRefreshProgress.value.success > 0) {
        options.toast.success(`邀请刷新完成：成功 ${inviteRefreshProgress.value.success}，失败 ${inviteRefreshProgress.value.failed}。`)
      } else {
        options.toast.error('未刷新到可用邀请信息。')
      }
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '批量刷新邀请失败')
    } finally {
      const refreshedIds = new Set(targets.map((site) => site.id))
      inviteLoadingSiteIds.value = inviteLoadingSiteIds.value.filter((siteId) => !refreshedIds.has(siteId))
      inviteRefreshProgress.value = null
      inviteRefreshAllLoading.value = false
    }
  }

  async function loadInviteInfo(targetSite: Site, optionsOverride: { openWhenReady?: boolean; force?: boolean } = {}) {
    const { openWhenReady = true, force = false } = optionsOverride
    inviteDialogSiteId.value = targetSite.id
    inviteDialogSiteName.value = targetSite.name

    if (!force) {
      const cached = readSiteInviteInfo(targetSite)
      if (cached.link || cached.code) {
        inviteDialogLink.value = cached.link
        inviteDialogCode.value = cached.code
        if (openWhenReady) {
          inviteDialogOpen.value = true
        }
        return
      }
    }

    if (inviteLoadingSiteIds.value.includes(targetSite.id)) {
      return
    }
    inviteLoadingSiteIds.value = [...inviteLoadingSiteIds.value, targetSite.id]
    inviteDialogLoading.value = openWhenReady
    try {
      const result = await testSite(targetSite.id)
      Object.assign(targetSite, mergeSiteHealthResult(targetSite, result))
      inviteDialogLink.value = String(result.invite_link ?? targetSite.plugin_config?.invite_link ?? '').trim()
      inviteDialogCode.value = String(result.invite_code ?? targetSite.plugin_config?.invite_code ?? '').trim()
      if (!inviteDialogLink.value && !inviteDialogCode.value) {
        throw new Error('未从站点账号读取到邀请链接或邀请码。')
      }
      if (openWhenReady) {
        inviteDialogOpen.value = true
      }
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '邀请信息读取失败')
    } finally {
      inviteLoadingSiteIds.value = inviteLoadingSiteIds.value.filter((item) => item !== targetSite.id)
      inviteDialogLoading.value = false
    }
  }

  async function copyInviteValue(value: string, emptyMessage: string, successMessage: string) {
    const normalized = value.trim()
    if (!normalized) {
      options.toast.error(emptyMessage)
      return
    }
    try {
      await navigator.clipboard.writeText(normalized)
      options.toast.success(successMessage)
    } catch {
      options.toast.error('复制失败，请手动复制。')
    }
  }

  async function copyInviteLink() {
    await copyInviteValue(inviteDialogLink.value, '当前站点未返回邀请链接。', '邀请链接已复制。')
  }

  async function copyInviteCode() {
    await copyInviteValue(inviteDialogCode.value, '当前站点未返回邀请码。', '邀请码已复制。')
  }

  async function copyInviteBundle() {
    const parts = [
      inviteDialogLink.value.trim() ? `邀请链接：${inviteDialogLink.value.trim()}` : '',
      inviteDialogCode.value.trim() ? `邀请码：${inviteDialogCode.value.trim()}` : '',
    ].filter(Boolean)
    if (!parts.length) {
      options.toast.error('当前站点没有可复制的邀请信息。')
      return
    }
    try {
      await navigator.clipboard.writeText(parts.join('\n'))
      options.toast.success('邀请信息已复制。')
    } catch {
      options.toast.error('复制失败，请手动复制。')
    }
  }

  function refreshInviteDialog() {
    if (inviteDialogSiteId.value === null) {
      return
    }
    const site = options.sites.value.find((item) => item.id === inviteDialogSiteId.value)
    if (!site) {
      options.toast.error('当前站点不存在。')
      return
    }
    void loadInviteInfo(site, { force: true })
  }

  return {
    inviteDialogOpen,
    inviteDialogLoading,
    inviteRefreshAllLoading,
    inviteDialogSiteName,
    inviteDialogLink,
    inviteDialogCode,
    inviteRefreshAllLabel,
    isInviteLoading,
    refreshAllInvites,
    loadInviteInfo,
    copyInviteLink,
    copyInviteCode,
    copyInviteBundle,
    refreshInviteDialog,
  }
}
