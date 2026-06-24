import { computed, onBeforeUnmount, onMounted, reactive, ref, type ComponentPublicInstance } from 'vue'
import { useDebouncedTask } from './useDebouncedTask'
import { useSitesApiKeyDialog } from './useSitesApiKeyDialog'
import { useSitesApiKeyRefresh } from './useSitesApiKeyRefresh'
import { useSitesCCSwitch } from './useSitesCCSwitch'
import { useSitesCheckin } from './useSitesCheckin'
import { useSitesData } from './useSitesData'
import { useSitesDuplicates } from './useSitesDuplicates'
import { useSitesEditorActions } from './useSitesEditorActions'
import { useSitesEditorDrawer } from './useSitesEditorDrawer'
import { useSitesEditorState } from './useSitesEditorState'
import { useSitesInvites } from './useSitesInvites'
import { useSitesPageState } from './useSitesPageState'
import { useSitesQueue } from './useSitesQueue'
import { useSitesRouteSync } from './useSitesRouteSync'
import { useSitesRuntimeChecks } from './useSitesRuntimeChecks'
import { useSitesStorageAnalysis } from './useSitesStorageAnalysis'
import { useSitesTableState } from './useSitesTableState'
import { useSitesTotpPreview } from './useSitesTotpPreview'
import { useTableScrollHeights } from './useTableScrollHeights'
import { runSiteBatch } from '../siteBatchRunner'
import { useToast } from '../toast'
import {
  ccSwitchPreviewColumns,
  checkinRunColumns,
  duplicateColumns,
  emailPatternExamples,
} from '../sitesViewConfig'
import { consoleCollectorScript, credentialAutocomplete, credentialInputName } from '../sitesStorageModel'
import { displayGroupName, formatCheckinRunTime } from '../sitesViewModel'
import type { PluginMeta, Site, SiteGroup } from '../types'
import type { TestFeedback } from '../sitesEditorActionTypes'

export function useSitesViewController() {
  const toast = useToast()
  const plugins = ref<PluginMeta[]>([])
  const sites = ref<Site[]>([])
  const siteGroups = ref<SiteGroup[]>([])
  const selectedId = ref<number | null>(null)
  const busy = ref(false)
  const testFeedback = ref<TestFeedback | null>(null)
  const saveFeedback = ref<string | null>(null)
  const lastSavedEditorSnapshot = ref('')
  const drawerOpen = ref(false)
  const editingId = ref<number | null>(null)
  const ccSwitchFileInput = ref<HTMLInputElement | null>(null)
  const siteSearch = ref('')
  const batchRegisterEnabled = ref(false)
  const tablePageSize = 20
  const table = useTableScrollHeights()

  const editorState = useSitesEditorState({
    plugins,
    siteGroups,
    saveFeedback,
    lastSavedEditorSnapshot,
    batchRegisterEnabled,
    toast,
  })

  const tableState = useSitesTableState({
    sites,
    selectedId,
    clearTestFeedback: () => {
      testFeedback.value = null
    },
  })
  const editingSite = computed(() =>
    editingId.value !== null ? sites.value.find((item) => item.id === editingId.value) ?? null : null,
  )
  const totp = useSitesTotpPreview({ editingId, toast })
  const { syncRoutesAfterSiteChange, syncRoutesAfterApiKeyUpdate } = useSitesRouteSync({ toast })
  const { loadData } = useSitesData({
    plugins,
    sites,
    siteGroups,
    selectedId,
    editingId,
    busy,
    toast,
    assignEditor: editorState.assignEditor,
  })

  async function reloadDataWithCheckinExtras(
    preferredId: number | null = selectedId.value,
    options: { preserveEditor?: boolean } = {},
  ) {
    await Promise.all([loadData(preferredId, options), checkin.loadCheckinExtras()])
  }

  const checkin = useSitesCheckin({ sites, selectedId, busy, toast, loadData })
  const pageState = useSitesPageState({
    plugins,
    sites,
    siteSearch,
    siteSupportsApiKeySync: editorState.siteSupportsApiKeySync,
    visibleCheckinStatus: checkin.visibleCheckinStatus,
    siteIncludedInCheckin: checkin.siteIncludedInCheckin,
  })
  const invites = useSitesInvites({ sites, toast, runSiteBatch })
  const apiKeyRefresh = useSitesApiKeyRefresh({
    sites,
    toast,
    runSiteBatch,
    siteSupportsApiKeySync: editorState.siteSupportsApiKeySync,
    syncRoutesAfterApiKeyUpdate,
  })
  const apiKeyDialog = useSitesApiKeyDialog({ sites, toast, loadData, syncRoutesAfterApiKeyUpdate })
  const runtime = useSitesRuntimeChecks({ sites, busy, toast, runSiteBatch })
  const queue = useSitesQueue({ toast })
  const { schedule: scheduleSummaryRefresh } = useDebouncedTask(() => runtime.refreshTableSummaries())
  const ccSwitch = useSitesCCSwitch({
    fileInput: ccSwitchFileInput,
    selectedId,
    testFeedback,
    toast,
    loadData,
    scheduleSummaryRefresh,
  })
  const duplicates = useSitesDuplicates({ selectedId, toast, loadData })
  const storage = useSitesStorageAnalysis({
    editor: editorState.editor,
    drawerOpen,
    editingId,
    testFeedback,
    saveFeedback,
    toast,
    pluginForKey: editorState.pluginForKey,
    applyPluginConfigDefaults: editorState.applyPluginConfigDefaults,
    editableCredentialKeys: editorState.editableCredentialKeys,
  })
  const drawer = useSitesEditorDrawer({
    editingId,
    drawerOpen,
    busy,
    testFeedback,
    saveFeedback,
    lastSavedEditorSnapshot,
    localStorageRawText: storage.localStorageRawText,
    editor: editorState.editor,
    toast,
    assignEditor: editorState.assignEditor,
    batchRegisterEnabled,
  })
  const actions = useSitesEditorActions({
    sites,
    selectedId,
    selectedSite: tableState.selectedSite,
    editingId,
    drawerOpen,
    busy,
    editor: editorState.editor,
    batchRegisterEnabled,
    batchRegisterForm: drawer.batchRegisterForm,
    batchRegisterResult: drawer.batchRegisterResult,
    testFeedback,
    saveFeedback,
    lastSavedEditorSnapshot,
    canBatchRegisterEditor: editorState.canBatchRegisterEditor,
    isRelayOnlyEditor: editorState.isRelayOnlyEditor,
    pluginMismatch: editorState.pluginMismatch,
    mismatchAcknowledged: editorState.mismatchAcknowledged,
    recommendedPluginKey: editorState.recommendedPluginKey,
    recommendedPlugin: editorState.recommendedPlugin,
    toast,
    assignEditor: editorState.assignEditor,
    ensureStorageAnalysisFinished: storage.ensureStorageAnalysisFinished,
    syncRoutesAfterSiteChange,
    loadData,
    reloadDataWithCheckinExtras,
    isRelayOnlySitePayload: editorState.isRelayOnlySitePayload,
    applyBalanceProbeResult: runtime.applyBalanceProbeResult,
  })

  function bindPageTableContainer(element: Element | ComponentPublicInstance | null) {
    table.pageTableContainer.value = element instanceof HTMLElement ? element : null
  }

  function bindCCSwitchFileInput(element: Element | ComponentPublicInstance | null) {
    ccSwitchFileInput.value = element instanceof HTMLInputElement ? element : null
  }

  async function handleRefresh(preferredId: number | null = selectedId.value) {
    try {
      await loadData(preferredId, { throwOnError: true })
      await runtime.refreshTableSummaries({ throwOnError: true })
      toast.success('站点数据已刷新。')
    } catch {
      return
    }
  }

  async function handleSiteGroupsChanged() {
    try {
      await loadData(editingId.value ?? selectedId.value, { preserveEditor: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '站点分组刷新失败')
    }
  }

  onMounted(async () => {
    window.addEventListener('site-groups:changed', handleSiteGroupsChanged)
    await loadData(null)
    await checkin.loadCheckinExtras()
    scheduleSummaryRefresh()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('site-groups:changed', handleSiteGroupsChanged)
  })

  return reactive({
    busy,
    selectedId,
    siteSearch,
    drawerOpen,
    editingId,
    testFeedback,
    saveFeedback,
    batchRegisterEnabled,
    tablePageSize,
    editingSite,
    ccSwitchFileInput,
    ccSwitchPreviewColumns,
    checkinRunColumns,
    duplicateColumns,
    emailPatternExamples,
    consoleCollectorScript,
    credentialInputName,
    credentialAutocomplete,
    displayGroupName,
    formatCheckinRunTime,
    bindPageTableContainer,
    bindCCSwitchFileInput,
    handleRefresh,
    ...table,
    ...editorState,
    ...tableState,
    ...totp,
    ...checkin,
    ...pageState,
    ...invites,
    ...apiKeyRefresh,
    ...apiKeyDialog,
    ...runtime,
    ...queue,
    ...ccSwitch,
    ...duplicates,
    ...storage,
    ...drawer,
    ...actions,
  })
}
