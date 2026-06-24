import { computed, reactive, ref, watch, type Ref } from 'vue'
import { buildExternalUrl } from '../viewUtils'
import { normalizeGroupNames, parseGroupNames } from '../format'
import { configNumberValue, configTextValue, defaultCredentialKeys, ensureField } from '../sitesStorageModel'
import {
  buildAvailableGroupNames,
  buildEditorAssignment,
  buildGroupOptions,
  buildPluginOptions,
  editableCredentialKeysForPlugin,
  groupCredentialFields,
  isRelayOnlySitePayload as readIsRelayOnlySitePayload,
  readPrimaryActionLabel,
  readTestActionLabel,
  shouldShowAuthEntryButton,
  siteSupportsInvite as readSiteSupportsInvite,
} from '../sitesEditorModel'
import { detectRecommendedPluginKey, isBoxyingSite } from '../sitesViewModel'
import type { useToast } from '../toast'
import type { PluginMeta, Site, SiteGroup, SitePayload } from '../types'

type Toast = ReturnType<typeof useToast>

type UseSitesEditorStateOptions = {
  plugins: Ref<PluginMeta[]>
  siteGroups: Ref<SiteGroup[]>
  saveFeedback: Ref<string | null>
  lastSavedEditorSnapshot: Ref<string>
  batchRegisterEnabled?: Ref<boolean>
  toast: Toast
}

export function useSitesEditorState(options: UseSitesEditorStateOptions) {
  const editorGroupNames = ref<string[]>([])
  const mismatchAcknowledged = ref(false)
  const editor = reactive<SitePayload>({
    name: '',
    base_url: '',
    plugin_key: '',
    group_name: '',
    supported_models: null,
    is_enabled: true,
    notes: '',
    credentials: {},
    plugin_config: {},
  })

  const currentPlugin = computed(
    () => options.plugins.value.find((item) => item.key === editor.plugin_key) ?? null,
  )
  const pluginOptions = computed(() => buildPluginOptions(options.plugins.value, editor.plugin_key))
  const availableGroupNames = computed(() => buildAvailableGroupNames(options.siteGroups.value, editor.group_name))
  const groupOptions = computed(() => buildGroupOptions(availableGroupNames.value))
  const credentialFieldGroups = computed(() => groupCredentialFields(currentPlugin.value))
  const primaryCredentialFields = computed(() => credentialFieldGroups.value.primary)
  const manualLoginFields = computed(() => credentialFieldGroups.value.manualLogin)
  const totpCredentialFields = computed(() => credentialFieldGroups.value.totp)
  const recommendedPluginKey = computed(() => detectRecommendedPluginKey(editor.base_url))
  const recommendedPlugin = computed(
    () => options.plugins.value.find((item) => item.key === recommendedPluginKey.value) ?? null,
  )
  const pluginMismatch = computed(
    () =>
      Boolean(recommendedPluginKey.value) &&
      Boolean(editor.plugin_key) &&
      recommendedPluginKey.value !== editor.plugin_key,
  )
  const officialSiteUrl = computed(() => buildExternalUrl(editor.base_url))
  const authEntryUrl = computed(() =>
    buildExternalUrl(editor.base_url, currentPlugin.value?.auth_entry_path ?? ''),
  )
  const authEntryLabel = computed(() => (currentPlugin.value?.auth_entry_label || '').trim())
  const showAuthEntryButton = computed(() => shouldShowAuthEntryButton({
    authEntryLabel: authEntryLabel.value,
    authEntryUrl: authEntryUrl.value,
    officialSiteUrl: officialSiteUrl.value,
  }))
  const currentPluginCapabilities = computed(() => new Set(currentPlugin.value?.capabilities ?? []))
  const isRelayOnlyEditor = computed(() => currentPluginCapabilities.value.has('relay_only'))
  const canBatchRegisterEditor = computed(() => currentPluginCapabilities.value.has('account_registration'))
  const testActionLabel = computed(() => readTestActionLabel(currentPluginCapabilities.value))
  const primaryActionLabel = computed(() => readPrimaryActionLabel({
    capabilities: currentPluginCapabilities.value,
    pluginKey: editor.plugin_key,
    pluginConfig: editor.plugin_config,
  }))

  function pluginForKey(pluginKey: string) {
    return options.plugins.value.find((plugin) => plugin.key === pluginKey) ?? null
  }

  function applyPluginConfigDefaults(defaultOptions?: { force?: boolean }) {
    const force = defaultOptions?.force ?? false
    const isTargetPlugin = editor.plugin_key === 'yellowpeach-newapi'
    if (!isTargetPlugin || !isBoxyingSite(editor.base_url)) {
      return
    }

    const defaults: Record<string, string> = {
      checkin_mode: 'reward_center',
      reward_calendar_scope: 'gift_calendar_v2',
      reward_claim_action_code: 'daily_gift_claim_v2',
    }

    for (const [key, value] of Object.entries(defaults)) {
      const current = String(editor.plugin_config[key] ?? '').trim()
      if (force || !current) {
        editor.plugin_config[key] = value
      }
    }
  }

  function assignEditor(site?: Site | null) {
    const fallbackPlugin = options.plugins.value[0]?.key ?? ''
    const assignment = buildEditorAssignment({
      site,
      fallbackPluginKey: fallbackPlugin,
      recommendedPluginKey: detectRecommendedPluginKey(site?.base_url ?? ''),
    })
    Object.assign(editor, assignment.payload)
    editorGroupNames.value = assignment.groupNames
    applyPluginConfigDefaults()
    mismatchAcknowledged.value = false
  }

  function siteSupportsInvite(site: Site) {
    return readSiteSupportsInvite(site, options.plugins.value)
  }

  function siteSupportsApiKeySync(site: Pick<Site, 'plugin_key'>): boolean {
    return Boolean(pluginForKey(site.plugin_key)?.capabilities.includes('api_key_sync'))
  }

  function isRelayOnlySitePayload(payload: { plugin_key: string }) {
    return readIsRelayOnlySitePayload(payload, options.plugins.value)
  }

  function editableCredentialKeys(pluginKey = editor.plugin_key) {
    const plugin = pluginForKey(pluginKey) ?? currentPlugin.value
    return editableCredentialKeysForPlugin(plugin, defaultCredentialKeys)
  }

  function readConfigTextValue(key: string): string | number | undefined {
    return configTextValue(editor.plugin_config, key)
  }

  function readConfigNumberValue(key: string): number | undefined {
    return configNumberValue(editor.plugin_config, key)
  }

  function updateConfigField(key: string, value: string | number | null) {
    editor.plugin_config[key] = value ?? ''
  }

  function applyRecommendedPlugin() {
    if (recommendedPluginKey.value) {
      editor.plugin_key = recommendedPluginKey.value
      applyPluginConfigDefaults()
      mismatchAcknowledged.value = false
      options.toast.info(`已切换为推荐插件：${recommendedPlugin.value?.name ?? recommendedPluginKey.value}`)
    }
  }

  async function openExternalUrl(url: string | null, fallbackLabel: string) {
    if (!url) {
      options.toast.error('请先填写有效的基础 URL。')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
    options.toast.info(`已打开${fallbackLabel}。`)
  }

  function handleOpenOfficialSite() {
    openExternalUrl(officialSiteUrl.value, '官网')
  }

  function handleOpenSiteInNewTab(site: Pick<Site, 'base_url' | 'name'>) {
    openExternalUrl(buildExternalUrl(site.base_url), site.name || '站点')
  }

  function handleOpenAuthSite() {
    openExternalUrl(authEntryUrl.value, currentPlugin.value?.auth_entry_label || '授权站点')
  }

  watch(
    () => [editor.base_url, editor.plugin_key],
    () => {
      applyPluginConfigDefaults()
      mismatchAcknowledged.value = false
      if (!canBatchRegisterEditor.value && options.batchRegisterEnabled) {
        options.batchRegisterEnabled.value = false
      }
    },
  )

  watch(
    () => editor.group_name,
    (value) => {
      const nextGroupNames = parseGroupNames(value)
      if (JSON.stringify(nextGroupNames) !== JSON.stringify(editorGroupNames.value)) {
        editorGroupNames.value = nextGroupNames
      }
    },
    { immediate: true },
  )

  watch(
    editorGroupNames,
    (value) => {
      const normalized = normalizeGroupNames(value)
      if (normalized !== editor.group_name) {
        editor.group_name = normalized
      }
    },
    { deep: true },
  )

  watch(
    () => currentPlugin.value,
    (plugin) => {
      if (!plugin) return
      plugin.credential_fields.forEach((field) => ensureField(editor.credentials, field.name, field.type))
      plugin.config_fields.forEach((field) => ensureField(editor.plugin_config, field.name, field.type))
    },
    { immediate: true },
  )

  watch(
    () => JSON.stringify(editor),
    (value) => {
      if (options.saveFeedback.value && value !== options.lastSavedEditorSnapshot.value) {
        options.saveFeedback.value = null
      }
    },
  )

  return {
    editor,
    editorGroupNames,
    mismatchAcknowledged,
    currentPlugin,
    pluginOptions,
    groupOptions,
    primaryCredentialFields,
    manualLoginFields,
    totpCredentialFields,
    recommendedPluginKey,
    recommendedPlugin,
    pluginMismatch,
    officialSiteUrl,
    authEntryUrl,
    authEntryLabel,
    showAuthEntryButton,
    isRelayOnlyEditor,
    canBatchRegisterEditor,
    testActionLabel,
    primaryActionLabel,
    pluginForKey,
    applyPluginConfigDefaults,
    assignEditor,
    siteSupportsInvite,
    siteSupportsApiKeySync,
    isRelayOnlySitePayload,
    editableCredentialKeys,
    configTextValue: readConfigTextValue,
    configNumberValue: readConfigNumberValue,
    updateConfigField,
    applyRecommendedPlugin,
    handleOpenOfficialSite,
    handleOpenSiteInNewTab,
    handleOpenAuthSite,
  }
}
