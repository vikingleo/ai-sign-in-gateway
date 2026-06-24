import { computed, ref, watch, type Ref } from 'vue'
import {
  buildCCSwitchSectionOptions,
  ccSwitchFileButtonLabel as readCCSwitchFileButtonLabel,
  ccSwitchImportOkText as readCCSwitchImportOkText,
  ccSwitchImportPlaceholder as readCCSwitchImportPlaceholder,
  ccSwitchUnavailableMessage,
  filterCCSwitchPreviewRows,
  readCCSwitchPreviewError,
  readCCSwitchPreviewPayload,
} from '../sitesCCSwitchModel'
import {
  buildCCSwitchExportFilename,
  parseCCSwitchPreview,
  type CCSwitchPreviewRow,
} from '../sitesViewModel'
import type { useToast } from '../toast'

type Toast = ReturnType<typeof useToast>

type UseSitesCCSwitchOptions = {
  fileInput: Ref<HTMLInputElement | null>
  selectedId: Ref<number | null>
  testFeedback: Ref<{ type: 'success' | 'error'; title: string; message: string } | null>
  toast: Toast
  loadData: (preferredId?: number | null, options?: { preserveEditor?: boolean }) => Promise<void>
  scheduleSummaryRefresh: () => void
}

export function useSitesCCSwitch(options: UseSitesCCSwitchOptions) {
  const ccSwitchConfigOpen = ref(false)
  const ccSwitchConfigTab = ref<'import' | 'export'>('import')
  const ccSwitchImportLoading = ref(false)
  const ccSwitchExportLoading = ref(false)
  const ccSwitchSqlPreviewLoading = ref(false)
  const ccSwitchImportMode = ref<'json' | 'sql'>('json')
  const ccSwitchImportText = ref('')
  const ccSwitchExportText = ref('')
  const ccSwitchSelectedSections = ref<string[]>([])
  const ccSwitchPreviewSearch = ref('')
  const ccSwitchResolvedPayload = ref<Record<string, unknown> | null>(null)
  const ccSwitchResolveError = ref('')
  const ccSwitchAvailable = false
  const ccSwitchDisabledReason = ccSwitchUnavailableMessage

  const ccSwitchPreviewPayload = computed<Record<string, unknown> | null>(() =>
    readCCSwitchPreviewPayload(ccSwitchImportMode.value, ccSwitchImportText.value, ccSwitchResolvedPayload.value),
  )

  const ccSwitchPreviewError = computed(() => readCCSwitchPreviewError({
    mode: ccSwitchImportMode.value,
    importText: ccSwitchImportText.value,
    previewPayload: ccSwitchPreviewPayload.value,
    resolveError: ccSwitchResolveError.value,
  }))

  const ccSwitchPreviewRows = computed<CCSwitchPreviewRow[]>(() => {
    const payload = ccSwitchPreviewPayload.value
    return payload ? parseCCSwitchPreview(payload) : []
  })

  const ccSwitchSectionOptions = computed(() => buildCCSwitchSectionOptions(ccSwitchPreviewRows.value))
  const ccSwitchFilteredPreviewRows = computed(() =>
    filterCCSwitchPreviewRows(ccSwitchPreviewRows.value, ccSwitchSelectedSections.value, ccSwitchPreviewSearch.value),
  )
  const ccSwitchImportPlaceholder = computed(() => readCCSwitchImportPlaceholder(ccSwitchImportMode.value))
  const ccSwitchFileButtonLabel = computed(() => readCCSwitchFileButtonLabel(ccSwitchImportMode.value))
  const ccSwitchImportOkText = computed(() => readCCSwitchImportOkText(ccSwitchImportMode.value))

  function ccSwitchPreviewRowKey(record: CCSwitchPreviewRow) {
    return record.key
  }

  function openCCSwitchFilePicker() {
    if (!ccSwitchAvailable) {
      options.toast.info(ccSwitchDisabledReason)
      return
    }
    options.fileInput.value?.click()
  }

  function resetCCSwitchSqlPreview() {
    ccSwitchResolvedPayload.value = null
    ccSwitchResolveError.value = ''
  }

  function openCCSwitchConfig(tab: 'import' | 'export' = 'import') {
    if (!ccSwitchAvailable) {
      options.toast.info(ccSwitchDisabledReason)
      return
    }
    ccSwitchConfigTab.value = tab
    ccSwitchConfigOpen.value = true
    if (tab === 'export' && !ccSwitchExportText.value.trim() && !ccSwitchExportLoading.value) {
      void handleCCSwitchExport()
    }
  }

  async function handleCCSwitchFileChange(event: Event) {
    if (!ccSwitchAvailable) {
      options.toast.info(ccSwitchDisabledReason)
      return
    }
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) {
      return
    }
    ccSwitchImportMode.value = file.name.toLowerCase().endsWith('.sql') ? 'sql' : 'json'
    ccSwitchImportText.value = await file.text()
    openCCSwitchConfig('import')
    input.value = ''
    if (ccSwitchImportMode.value === 'sql') {
      await resolveCCSwitchSqlPreview()
    }
  }

  async function resolveCCSwitchSqlPreview() {
    if (!ccSwitchAvailable) {
      options.toast.info(ccSwitchDisabledReason)
      return false
    }
    const sqlText = ccSwitchImportText.value.trim()
    if (!sqlText) {
      resetCCSwitchSqlPreview()
      options.toast.error('请先提供 SQL 内容。')
      return false
    }

    ccSwitchSqlPreviewLoading.value = true
    ccSwitchResolveError.value = ''
    try {
      ccSwitchResolveError.value = ccSwitchDisabledReason
      options.toast.info(ccSwitchDisabledReason)
      return false
    } catch (err) {
      resetCCSwitchSqlPreview()
      ccSwitchResolveError.value = err instanceof Error ? err.message : 'SQL 解析失败'
      options.toast.error(ccSwitchResolveError.value)
      return false
    } finally {
      ccSwitchSqlPreviewLoading.value = false
    }
  }

  async function submitCCSwitchImport() {
    if (!ccSwitchAvailable) {
      options.toast.info(ccSwitchDisabledReason)
      return
    }
    let payload: Record<string, unknown> | null = null
    if (ccSwitchImportMode.value === 'json') {
      payload = ccSwitchPreviewPayload.value
      if (!payload) {
        options.toast.error('导入内容不是有效 JSON。')
        return
      }
    } else {
      const resolved = ccSwitchPreviewPayload.value || (await resolveCCSwitchSqlPreview() ? ccSwitchResolvedPayload.value : null)
      if (!resolved) {
        return
      }
    }
    if (!ccSwitchSelectedSections.value.length) {
      options.toast.error('请至少选择一个供应商分类。')
      return
    }

    ccSwitchImportLoading.value = true
    try {
      options.toast.info(ccSwitchDisabledReason)
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '供应商导入失败')
    } finally {
      ccSwitchImportLoading.value = false
    }
  }

  function downloadCCSwitchExport() {
    if (!ccSwitchExportText.value.trim()) {
      return
    }
    const blob = new Blob([ccSwitchExportText.value], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = buildCCSwitchExportFilename()
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function handleCCSwitchExport() {
    if (!ccSwitchAvailable) {
      options.toast.info(ccSwitchDisabledReason)
      return
    }
    ccSwitchExportLoading.value = true
    try {
      options.toast.info(ccSwitchDisabledReason)
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '供应商导出失败')
    } finally {
      ccSwitchExportLoading.value = false
    }
  }

  watch(
    () => ccSwitchSectionOptions.value.map((item) => item.value).join('|'),
    () => {
      const available = new Set(ccSwitchSectionOptions.value.map((item) => item.value))
      const filtered = ccSwitchSelectedSections.value.filter((item) => available.has(item))
      ccSwitchSelectedSections.value = filtered.length ? filtered : [...available]
    },
    { immediate: true },
  )

  watch(
    () => [ccSwitchImportMode.value, ccSwitchImportText.value],
    ([mode]) => {
      if (mode === 'sql') {
        resetCCSwitchSqlPreview()
        return
      }
      ccSwitchResolveError.value = ''
    },
  )

  return {
    ccSwitchConfigOpen,
    ccSwitchConfigTab,
    ccSwitchImportLoading,
    ccSwitchExportLoading,
    ccSwitchSqlPreviewLoading,
    ccSwitchImportMode,
    ccSwitchImportText,
    ccSwitchExportText,
    ccSwitchAvailable,
    ccSwitchDisabledReason,
    ccSwitchSelectedSections,
    ccSwitchPreviewSearch,
    ccSwitchPreviewRows,
    ccSwitchFilteredPreviewRows,
    ccSwitchSectionOptions,
    ccSwitchImportPlaceholder,
    ccSwitchFileButtonLabel,
    ccSwitchImportOkText,
    ccSwitchPreviewError,
    ccSwitchPreviewRowKey,
    openCCSwitchConfig,
    openCCSwitchFilePicker,
    handleCCSwitchFileChange,
    resolveCCSwitchSqlPreview,
    submitCCSwitchImport,
    handleCCSwitchExport,
    downloadCCSwitchExport,
  }
}
