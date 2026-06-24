import { computed, reactive, ref, type Ref } from 'vue'
import {
  getSite,
  updateSite,
} from '../api'
import {
  equivalentApiKeyEntryExists,
  mergeApiKeyEntries,
  removeSiteApiKeyCredential,
  setApiKeyImagePaths,
  setApiKeyRequestBaseURLs,
  setApiKeyRoutePath,
} from '../siteApiKeyCredentials'
import {
  buildManualApiKeyEntry,
  defaultRequestApiUrl,
  requestApiUrlText,
  resetManualApiKeyForm,
  siteApiKeyEntries,
  storedApiKeyEntriesForEdit,
  type ManualApiKeyForm,
  type SiteApiKeyEntry,
} from '../sitesApiKeyModel'
import {
  readApiKeyImageEditPathDraft,
  readApiKeyImageGenerationPathDraft,
  readApiKeyRequestUrlDraft,
  readApiKeyRoutePathDraft,
  removeApiKeyDrafts,
  resetApiKeyDraftState,
  setApiKeyImagePathDraft,
  setApiKeyRequestUrlDraft,
  setApiKeyRoutePathDraft,
  type SiteApiKeyDraftState,
} from '../sitesApiKeyDraftModel'
import { normalizeSupportedModels } from '../sitesEditorModel'
import type { useToast } from '../toast'
import type { Site, SitePayload } from '../types'
import { normalizeStringList } from '../viewUtils'

type Toast = ReturnType<typeof useToast>

type UseSitesApiKeyDialogOptions = {
  sites: Ref<Site[]>
  toast: Toast
  loadData: (preferredId?: number | null, options?: { preserveEditor?: boolean }) => Promise<void>
  syncRoutesAfterApiKeyUpdate: (successCount: number) => Promise<void>
}

export function useSitesApiKeyDialog(options: UseSitesApiKeyDialogOptions) {
  const apiKeyDialogOpen = ref(false)
  const apiKeyDialogSaving = ref(false)
  const apiKeyDialogSiteId = ref<number | null>(null)
  const apiKeyDialogForm = reactive({
    site_name: '',
    request_api_urls: '',
    endpoint_hint: '',
    image_generation_path: '',
    image_edit_path: '',
  })
  const apiKeyDraftState: SiteApiKeyDraftState = {
    requestUrls: reactive<Record<string, string>>({}),
    routePaths: reactive<Record<string, string>>({}),
    imageGenerationPaths: reactive<Record<string, string>>({}),
    imageEditPaths: reactive<Record<string, string>>({}),
  }
  const manualApiKeyForm = reactive<ManualApiKeyForm>({
    name: '',
    key: '',
    route_type: 'codex',
    route_path: 'responses',
    request_base_urls: '',
    image_generation_path: '',
    image_edit_path: '',
  })

  const apiKeyDialogSite = computed(() =>
    apiKeyDialogSiteId.value !== null ? options.sites.value.find((site) => site.id === apiKeyDialogSiteId.value) ?? null : null,
  )

  const apiKeyDialogPreviewUrls = computed(() => {
    const edited = normalizeStringList(apiKeyDialogForm.request_api_urls)
    if (edited.length) {
      return edited
    }
    const fallback = apiKeyDialogForm.endpoint_hint.trim()
    return fallback ? [fallback] : []
  })

  const apiKeyDialogEntries = computed(() => {
    const site = apiKeyDialogSite.value
    return site ? siteApiKeyEntries(site) : []
  })

  const manualApiKeyEntries = computed(() => apiKeyDialogEntries.value.filter((entry) => entry.isManual))

  function resetApiKeyRequestUrlDrafts(entries: SiteApiKeyEntry[]) {
    resetApiKeyDraftState(apiKeyDraftState, entries)
  }

  function apiKeyRequestUrlDraft(entry: SiteApiKeyEntry): string {
    return readApiKeyRequestUrlDraft(apiKeyDraftState, entry)
  }

  function updateApiKeyRequestUrlDraft(entry: SiteApiKeyEntry, value: string) {
    setApiKeyRequestUrlDraft(apiKeyDraftState, entry, value)
    upsertApiKeyDialogSiteCredentials((site, credentials) => setApiKeyRequestBaseURLs({
      ...credentials,
      api_keys: mergeApiKeyEntries(storedApiKeyEntriesForEdit({ ...site, credentials })),
    }, entry.key, value, entry.entryIndex))
  }

  function apiKeyRoutePathDraft(entry: SiteApiKeyEntry): string {
    return readApiKeyRoutePathDraft(apiKeyDraftState, entry)
  }

  function updateApiKeyRoutePathDraft(entry: SiteApiKeyEntry, value: unknown) {
    const routePath = setApiKeyRoutePathDraft(apiKeyDraftState, entry, value)
    upsertApiKeyDialogSiteCredentials((site, credentials) => setApiKeyRoutePath({
      ...credentials,
      api_keys: mergeApiKeyEntries(storedApiKeyEntriesForEdit({ ...site, credentials })),
    }, entry.key, routePath, entry.entryIndex))
  }

  function apiKeyImageGenerationPathDraft(entry: SiteApiKeyEntry): string {
    return readApiKeyImageGenerationPathDraft(apiKeyDraftState, entry)
  }

  function apiKeyImageEditPathDraft(entry: SiteApiKeyEntry): string {
    return readApiKeyImageEditPathDraft(apiKeyDraftState, entry)
  }

  function updateApiKeyImagePathDraft(entry: SiteApiKeyEntry, field: 'generation' | 'edit', value: string) {
    const paths = setApiKeyImagePathDraft(apiKeyDraftState, entry, field, value)
    upsertApiKeyDialogSiteCredentials((site, credentials) => setApiKeyImagePaths({
      ...credentials,
      api_keys: mergeApiKeyEntries(storedApiKeyEntriesForEdit({ ...site, credentials })),
    }, entry.key, paths.generationPath, paths.editPath, entry.entryIndex))
  }

  async function openApiKeyDialog(site: Site) {
    apiKeyDialogSaving.value = true
    try {
      const fullSite = await getSite(site.id)
      const index = options.sites.value.findIndex((item) => item.id === fullSite.id)
      if (index >= 0) {
        options.sites.value[index] = fullSite
      }
      apiKeyDialogSiteId.value = fullSite.id
      apiKeyDialogForm.site_name = fullSite.name
      apiKeyDialogForm.request_api_urls = requestApiUrlText(fullSite)
      apiKeyDialogForm.endpoint_hint = defaultRequestApiUrl(fullSite)
      apiKeyDialogForm.image_generation_path = String(fullSite.plugin_config?.image_generation_path ?? '').trim()
      apiKeyDialogForm.image_edit_path = String(fullSite.plugin_config?.image_edit_path ?? '').trim()
      resetManualApiKeyForm(manualApiKeyForm, fullSite)
      resetApiKeyRequestUrlDrafts(siteApiKeyEntries(fullSite))
      apiKeyDialogOpen.value = true
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : 'API Key 配置加载失败')
    } finally {
      apiKeyDialogSaving.value = false
    }
  }

  async function copyApiKeyFromDialog(value: string) {
    const normalized = value.trim()
    if (!normalized) {
      options.toast.error('当前 API Key 为空。')
      return
    }
    try {
      await navigator.clipboard.writeText(normalized)
      options.toast.success('API Key 已复制。')
    } catch {
      options.toast.error('复制失败，请手动复制。')
    }
  }

  async function copyPrimaryApiKeyFromDialog() {
    const primary = apiKeyDialogEntries.value.find((item) => item.isPrimary) ?? apiKeyDialogEntries.value[0]
    const value = primary?.key ?? ''
    if (!value) {
      options.toast.error('当前站点未配置 API Key。')
      return
    }
    await copyApiKeyFromDialog(value)
  }

  function upsertApiKeyDialogSiteCredentials(updater: (site: Site, credentials: Record<string, unknown>) => Record<string, unknown>) {
    const site = apiKeyDialogSite.value
    if (!site) {
      return
    }
    const credentials = updater(site, { ...(site.credentials as Record<string, unknown>) })
    site.credentials = credentials as Site['credentials']
    const index = options.sites.value.findIndex((item) => item.id === site.id)
    if (index >= 0) {
      options.sites.value[index] = {
        ...options.sites.value[index],
        credentials: credentials as Site['credentials'],
      }
    }
  }

  function addManualApiKey() {
    const key = manualApiKeyForm.key.trim()
    if (!key) {
      options.toast.error('请先填写自定义 API Key。')
      return
    }
    const site = apiKeyDialogSite.value
    if (!site) {
      return
    }
    const entry = buildManualApiKeyEntry(manualApiKeyForm, site, manualApiKeyEntries.value.length)
    let apiKeyAdded = false
    upsertApiKeyDialogSiteCredentials((currentSite, credentials) => {
      const entries = storedApiKeyEntriesForEdit({ ...currentSite, credentials })
      if (equivalentApiKeyEntryExists(entries, entry)) {
        options.toast.info('已存在相同 API Key 配置。')
        return credentials
      }
      const next = mergeApiKeyEntries([...entries, entry])
      apiKeyAdded = true
      return {
        ...credentials,
        api_keys: next,
        api_key: String(credentials.api_key ?? '').trim() || key,
      }
    })
    if (!apiKeyAdded) {
      return
    }
    resetManualApiKeyForm(manualApiKeyForm, site)
    resetApiKeyRequestUrlDrafts(siteApiKeyEntries(site))
    options.toast.success('自定义 API Key 已加入本地配置，保存后生效。')
  }

  function removeApiKey(entry: SiteApiKeyEntry) {
    upsertApiKeyDialogSiteCredentials((_site, credentials) => removeSiteApiKeyCredential(credentials, entry.key, entry.entryIndex))
    removeApiKeyDrafts(apiKeyDraftState, entry)
    options.toast.success('API Key 已从本地配置移除，保存后生效。')
  }

  async function saveApiKeyDialog() {
    const site = apiKeyDialogSite.value
    if (!site) {
      return
    }
    apiKeyDialogSaving.value = true
    try {
      const payload: SitePayload = {
        name: site.name,
        base_url: site.base_url,
        plugin_key: site.plugin_key,
        group_name: site.group_name,
        supported_models: normalizeSupportedModels(site.supported_models),
        is_enabled: site.is_enabled,
        notes: site.notes,
        credentials: JSON.parse(JSON.stringify(site.credentials ?? {})),
        plugin_config: JSON.parse(JSON.stringify(site.plugin_config ?? {})),
      }
      payload.plugin_config.api_request_urls = normalizeStringList(apiKeyDialogForm.request_api_urls).join('\n')
      payload.plugin_config.image_generation_path = apiKeyDialogForm.image_generation_path.trim()
      payload.plugin_config.image_edit_path = apiKeyDialogForm.image_edit_path.trim()
      const credentials = payload.credentials as Record<string, unknown>
      credentials.api_keys = mergeApiKeyEntries(storedApiKeyEntriesForEdit({
        credentials,
        plugin_config: payload.plugin_config,
      }))
      await updateSite(site.id, payload)
      apiKeyDialogOpen.value = false
      options.toast.success(`${site.name} API Key 配置已保存。`)
      await options.syncRoutesAfterApiKeyUpdate(1)
      await options.loadData(site.id)
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      apiKeyDialogSaving.value = false
    }
  }

  return {
    apiKeyDialogOpen,
    apiKeyDialogSaving,
    apiKeyDialogForm,
    manualApiKeyForm,
    apiKeyDialogPreviewUrls,
    apiKeyDialogEntries,
    apiKeyRequestUrlDraft,
    apiKeyRoutePathDraft,
    apiKeyImageGenerationPathDraft,
    apiKeyImageEditPathDraft,
    updateApiKeyRequestUrlDraft,
    updateApiKeyRoutePathDraft,
    updateApiKeyImagePathDraft,
    openApiKeyDialog,
    copyApiKeyFromDialog,
    copyPrimaryApiKeyFromDialog,
    addManualApiKey,
    removeApiKey,
    saveApiKeyDialog,
  }
}
