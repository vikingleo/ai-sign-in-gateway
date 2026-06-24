import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { analyzeLocalStorage } from '../api'
import {
  buildCredentialSuggestions,
  consoleCollectorScript,
  summarizeStorageKeys,
} from '../sitesStorageModel'
import { isStorageJsonCandidate } from '../sitesViewModel'
import type { useToast } from '../toast'
import type { SitePayload } from '../types'

type Toast = ReturnType<typeof useToast>

type TestFeedback = {
  type: 'success' | 'error'
  title: string
  message: string
}

type UseSitesStorageAnalysisOptions = {
  editor: SitePayload
  drawerOpen: Ref<boolean>
  editingId: Ref<number | null>
  testFeedback: Ref<TestFeedback | null>
  saveFeedback: Ref<string | null>
  toast: Toast
  pluginForKey: (pluginKey: string) => unknown
  applyPluginConfigDefaults: () => void
  editableCredentialKeys: (pluginKey?: string) => Set<string>
}

export function useSitesStorageAnalysis(options: UseSitesStorageAnalysisOptions) {
  const localStorageAnalyzeLoading = ref(false)
  const localStorageRawText = ref('')
  const storageAnalyzeTimer = ref<ReturnType<typeof window.setTimeout> | null>(null)
  const lastAutoAnalyzedStorageRaw = ref('')
  const storageManagedTimers = new Set<ReturnType<typeof window.setTimeout>>()
  const storageDelayResolvers = new Set<() => void>()
  let mounted = true

  function scheduleManagedTimeout(callback: () => void, delay = 0) {
    const timer = window.setTimeout(() => {
      storageManagedTimers.delete(timer)
      if (mounted) {
        callback()
      }
    }, delay)
    storageManagedTimers.add(timer)
    return timer
  }

  function clearManagedTimeout(timer: ReturnType<typeof window.setTimeout> | null) {
    if (!timer) {
      return
    }
    window.clearTimeout(timer)
    storageManagedTimers.delete(timer)
  }

  function waitStorageDelay(ms: number) {
    return new Promise<void>((resolve) => {
      let timer: ReturnType<typeof window.setTimeout>
      const done = () => {
        storageManagedTimers.delete(timer)
        storageDelayResolvers.delete(done)
        resolve()
      }
      timer = window.setTimeout(done, ms)
      storageManagedTimers.add(timer)
      storageDelayResolvers.add(done)
    })
  }

  async function handleCopyConsoleScript() {
    try {
      await navigator.clipboard.writeText(consoleCollectorScript)
      options.toast.success('控制台脚本已复制。')
    } catch {
      options.toast.error('复制失败，请手动复制脚本内容。')
    }
  }

  async function handleAnalyzeLocalStorage() {
    if (localStorageAnalyzeLoading.value) {
      return
    }
    const rawText = localStorageRawText.value.trim()
    if (!rawText) {
      options.toast.error('请先粘贴 localStorage 内容。')
      return
    }

    localStorageAnalyzeLoading.value = true
    try {
      const result = await analyzeLocalStorage(rawText)
      lastAutoAnalyzedStorageRaw.value = rawText
      if (result.suggested_plugin_key && options.pluginForKey(result.suggested_plugin_key)) {
        options.editor.plugin_key = result.suggested_plugin_key
        options.applyPluginConfigDefaults()
        await nextTick()
      }
      if (result.suggested_site_name && !options.editingId.value) {
        options.editor.name = result.suggested_site_name
      }
      if (result.suggested_base_url) {
        options.editor.base_url = result.suggested_base_url
      }
      if (result.suggested_plugin_config) {
        options.editor.plugin_config = {
          ...options.editor.plugin_config,
          ...result.suggested_plugin_config,
        }
      }
      const editableKeys = options.editableCredentialKeys(result.suggested_plugin_key || options.editor.plugin_key)
      const suggestions = buildCredentialSuggestions(result.suggested_credentials)
      const appliedEntries = [...suggestions.entries()].filter(([key]) => editableKeys.has(key))

      for (const [key, value] of appliedEntries) {
        options.editor.credentials[key] = value
      }

      if (appliedEntries.length) {
        options.saveFeedback.value = '已从 localStorage 分析结果回填凭证，请确认内容后保存站点。'
      }

      const appliedLabels = appliedEntries.length
        ? appliedEntries.map(([key]) => key).join('、')
        : '无可直接写入当前插件字段的凭证'
      const matchedPreview = result.matched_keys.length ? result.matched_keys.slice(0, 8).join('，') : '无'
      options.testFeedback.value = {
        type: appliedEntries.length ? 'success' : 'error',
        title: appliedEntries.length ? 'localStorage 分析完成' : 'localStorage 已解析，但未自动回填',
        message: [
          result.message,
          ...summarizeStorageKeys(result),
          `回填字段：${appliedLabels}`,
          `命中线索：${matchedPreview}${result.matched_keys.length > 8 ? ' ...' : ''}`,
        ].join('\n'),
      }
      options.toast.success(appliedEntries.length ? `已回填 ${appliedEntries.length} 个字段。` : '分析完成，请查看结果。')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'localStorage 分析失败'
      options.testFeedback.value = {
        type: 'error',
        title: 'localStorage 分析失败',
        message,
      }
      options.toast.error(message)
    } finally {
      localStorageAnalyzeLoading.value = false
    }
  }

  function handleStoragePayloadPaste() {
    scheduleManagedTimeout(() => {
      if (localStorageRawText.value.trim()) {
        void handleAnalyzeLocalStorage()
      }
    }, 0)
  }

  async function ensureStorageAnalysisFinished() {
    const rawText = localStorageRawText.value.trim()
    if (storageAnalyzeTimer.value) {
      clearManagedTimeout(storageAnalyzeTimer.value)
      storageAnalyzeTimer.value = null
    }
    if (options.drawerOpen.value && rawText && rawText !== lastAutoAnalyzedStorageRaw.value && isStorageJsonCandidate(rawText)) {
      await handleAnalyzeLocalStorage()
    }
    while (localStorageAnalyzeLoading.value) {
      await waitStorageDelay(50)
      if (!mounted) {
        return
      }
    }
  }

  watch(localStorageRawText, (value) => {
    if (storageAnalyzeTimer.value) {
      clearManagedTimeout(storageAnalyzeTimer.value)
      storageAnalyzeTimer.value = null
    }
    const rawText = value.trim()
    if (!options.drawerOpen.value || !rawText || rawText === lastAutoAnalyzedStorageRaw.value || !isStorageJsonCandidate(rawText)) {
      return
    }
    storageAnalyzeTimer.value = scheduleManagedTimeout(() => {
      storageAnalyzeTimer.value = null
      const latest = localStorageRawText.value.trim()
      if (latest && latest !== lastAutoAnalyzedStorageRaw.value && !localStorageAnalyzeLoading.value) {
        void handleAnalyzeLocalStorage()
      }
    }, 350)
  })

  onBeforeUnmount(() => {
    mounted = false
    if (storageAnalyzeTimer.value) {
      clearManagedTimeout(storageAnalyzeTimer.value)
      storageAnalyzeTimer.value = null
    }
    storageManagedTimers.forEach((timer) => window.clearTimeout(timer))
    storageManagedTimers.clear()
    storageDelayResolvers.forEach((resolve) => resolve())
    storageDelayResolvers.clear()
  })

  return {
    localStorageAnalyzeLoading,
    localStorageRawText,
    handleCopyConsoleScript,
    handleAnalyzeLocalStorage,
    handleStoragePayloadPaste,
    ensureStorageAnalysisFinished,
  }
}
