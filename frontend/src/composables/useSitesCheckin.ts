import { computed, reactive, ref, type Ref } from 'vue'
import {
  getCheckinSites,
  getRuns,
  getSettings,
  runSchedulerNow,
  runBatch,
  runSiteCheckin,
  updateCheckinParticipation,
  updateSettings,
} from '../api'
import { formatBalance } from '../format'
import {
  availableCheckinSiteIds,
  batchCheckinTargetCount as readBatchCheckinTargetCount,
  batchCheckinTargetSites as readBatchCheckinTargetSites,
  filterCheckinRuns,
  siteCanCheckin as readSiteCanCheckin,
  siteCheckinActionLabel as readSiteCheckinActionLabel,
  siteIncludedInCheckin as readSiteIncludedInCheckin,
  siteRunnableForCheckin as readSiteRunnableForCheckin,
  syncSelectedCheckinIds as readSyncedSelectedCheckinIds,
  visibleCheckinStatus as readVisibleCheckinStatus,
} from '../sitesCheckinModel'
import { formatProgressLabel } from '../sitesMetricsModel'
import { mergeCheckinResult, type CheckinResultUpdate } from '../sitesResultModel'
import { createDefaultCheckinConfig } from '../sitesViewConfig'
import type { useToast } from '../toast'
import type { CheckinRun, CheckinSite, SettingsData, Site } from '../types'

type Toast = ReturnType<typeof useToast>

type UseSitesCheckinOptions = {
  sites: Ref<Site[]>
  selectedId: Ref<number | null>
  busy: Ref<boolean>
  toast: Toast
  loadData: (preferredId?: number | null, options?: { preserveEditor?: boolean }) => Promise<void>
}

export function useSitesCheckin(options: UseSitesCheckinOptions) {
  const checkinMeta = ref(new Map<number, CheckinSite>())
  const checkinRuns = ref<CheckinRun[]>([])
  const selectedCheckinIds = ref<number[]>([])
  const checkinConfigOpen = ref(false)
  const checkinLogsOpen = ref(false)
  const checkinSettingsBusy = ref(false)
  const checkinRunSearch = ref('')
  const checkinBatchProgress = ref<{ total: number; done: number; success: number; failed: number } | null>(null)
  const checkinConfigForm = reactive<SettingsData>(createDefaultCheckinConfig())
  const savedCheckinOnlyEnabledSites = ref(checkinConfigForm.only_enabled_sites)

  function siteCanCheckin(site: Site) {
    return readSiteCanCheckin(site, checkinMeta.value)
  }

  function siteIncludedInCheckin(site: Site) {
    return readSiteIncludedInCheckin(site, checkinMeta.value)
  }

  function visibleCheckinStatus(site: Site) {
    return readVisibleCheckinStatus(site, checkinMeta.value) ?? ''
  }

  function siteRunnableForCheckin(site: Site) {
    return readSiteRunnableForCheckin(site, checkinMeta.value)
  }

  function siteCheckinActionLabel(site: Site) {
    return readSiteCheckinActionLabel(site, checkinMeta.value)
  }

  const checkinBatchTargetCount = computed(() =>
    readBatchCheckinTargetCount(options.sites.value, checkinMeta.value, savedCheckinOnlyEnabledSites.value),
  )
  const checkinAllIncludedLabel = computed(() => formatProgressLabel(checkinBatchProgress.value, '签到全部已加入', '签到中'))
  const checkinSelectedLabel = computed(() => formatProgressLabel(checkinBatchProgress.value, '签到选中', '签到中'))
  const filteredCheckinRuns = computed(() => filterCheckinRuns(checkinRuns.value, checkinRunSearch.value))

  const checkinRowSelection = computed(() => ({
    selectedRowKeys: selectedCheckinIds.value,
    onChange: (keys: Array<string | number>) => {
      selectedCheckinIds.value = keys
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item))
    },
    getCheckboxProps: (record: Site) => ({
      disabled: !siteRunnableForCheckin(record),
    }),
  }))

  function syncSelectedCheckinIds() {
    selectedCheckinIds.value = readSyncedSelectedCheckinIds(
      selectedCheckinIds.value,
      availableCheckinSiteIds(options.sites.value, checkinMeta.value),
    )
  }

  async function loadCheckinExtras() {
    try {
      const [siteMeta, runs, settingsData] = await Promise.all([getCheckinSites(), getRuns(60), getSettings()])
      const map = new Map<number, CheckinSite>()
      siteMeta.forEach((item) => map.set(item.id, item))
      checkinMeta.value = map
      checkinRuns.value = runs
      Object.assign(checkinConfigForm, settingsData)
      savedCheckinOnlyEnabledSites.value = settingsData.only_enabled_sites
      syncSelectedCheckinIds()
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '签到信息加载失败')
    }
  }

  async function handleParticipationToggle(site: Site, checked: boolean | string | number) {
    const include = checked === true || checked === 'true' || checked === 1
    try {
      await updateCheckinParticipation(site.id, include)
      options.toast.success(include ? '已加入签到任务。' : '已移出签到任务。')
      await loadCheckinExtras()
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '更新失败')
    }
  }

  function applyCheckinResultForSite(siteId: number, result: CheckinResultUpdate) {
    const target = options.sites.value.find((site) => site.id === siteId)
    if (!target) {
      return
    }
    Object.assign(target, mergeCheckinResult(target, result))
  }

  async function executeCheckinBatch(siteIds: number[], onlyEnabled?: boolean) {
    const effectiveOnlyEnabled = onlyEnabled ?? savedCheckinOnlyEnabledSites.value
    const targets = siteIds.length
      ? options.sites.value.filter((site) => siteIds.includes(site.id))
      : readBatchCheckinTargetSites(options.sites.value, checkinMeta.value, effectiveOnlyEnabled)

    if (!targets.length) {
      options.toast.error('当前没有可执行的站点。')
      return
    }

    options.busy.value = true
    checkinBatchProgress.value = { total: targets.length, done: 0, success: 0, failed: 0 }
    try {
      const results = await runBatch(siteIds, onlyEnabled)
      const resultBySiteId = new Map(results.map((result) => [result.site_id, result]))
      for (const site of targets) {
        const result = resultBySiteId.get(site.id)
        if (result) {
          applyCheckinResultForSite(site.id, result)
          if (result.status === 'success') {
            checkinBatchProgress.value.success += 1
          } else {
            checkinBatchProgress.value.failed += 1
          }
        } else {
          checkinBatchProgress.value.failed += 1
        }
        checkinBatchProgress.value.done += 1
      }
      options.toast.success(`签到完成：成功 ${checkinBatchProgress.value.success}，失败 ${checkinBatchProgress.value.failed}。`)
      await loadCheckinExtras()
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '签到执行失败')
    } finally {
      checkinBatchProgress.value = null
      options.busy.value = false
    }
  }

  async function handleCheckinAllIncluded() {
    await executeCheckinBatch([], undefined)
  }

  async function handleCheckinSelected() {
    if (!selectedCheckinIds.value.length) {
      return
    }
    await executeCheckinBatch([...selectedCheckinIds.value], false)
  }

  async function handleRunSchedulerNow() {
    options.busy.value = true
    try {
      const result = await runSchedulerNow()
      options.toast.success(result.message)
      await Promise.all([options.loadData(options.selectedId.value), loadCheckinExtras()])
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '执行失败')
    } finally {
      options.busy.value = false
    }
  }

  async function saveCheckinConfig(form?: SettingsData) {
    checkinSettingsBusy.value = true
    try {
      const savedSettings = await updateSettings(form ?? checkinConfigForm)
      Object.assign(checkinConfigForm, savedSettings)
      savedCheckinOnlyEnabledSites.value = savedSettings.only_enabled_sites
      options.toast.success('签到配置已保存。')
      checkinConfigOpen.value = false
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      checkinSettingsBusy.value = false
    }
  }

  async function handleCheckin(targetSite?: Site | null) {
    const activeSite = targetSite ?? options.sites.value.find((site) => site.id === options.selectedId.value) ?? null
    if (!activeSite) {
      return
    }
    options.busy.value = true
    try {
      const result = await runSiteCheckin(activeSite.id)
      const balanceText = formatBalance(result.balance, result.balance_unit)
      options.toast.success(`${result.message}${balanceText ? ` 当前余额 ${balanceText}` : ''}`)
      await Promise.all([options.loadData(activeSite.id), loadCheckinExtras()])
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '执行失败')
      await Promise.all([options.loadData(activeSite.id), loadCheckinExtras()])
    } finally {
      options.busy.value = false
    }
  }

  return {
    selectedCheckinIds,
    checkinConfigOpen,
    checkinLogsOpen,
    checkinSettingsBusy,
    checkinRunSearch,
    checkinConfigForm,
    checkinBatchTargetCount,
    checkinAllIncludedLabel,
    checkinSelectedLabel,
    filteredCheckinRuns,
    checkinRowSelection,
    siteCanCheckin,
    siteIncludedInCheckin,
    visibleCheckinStatus,
    siteRunnableForCheckin,
    siteCheckinActionLabel,
    loadCheckinExtras,
    handleParticipationToggle,
    handleCheckinAllIncluded,
    handleCheckinSelected,
    handleRunSchedulerNow,
    saveCheckinConfig,
    handleCheckin,
  }
}
