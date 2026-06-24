import { parseGroupNames } from './format.ts'
import { normalizeStringList } from './viewUtils.ts'
import type { FieldDescriptor, PluginMeta, SitePayload, SiteGroup } from './types.ts'

export type PluginOption = {
  label: string
  value: string
}

export type AuthEntryVisibilityInput = {
  authEntryLabel: string
  authEntryUrl: string | null
  officialSiteUrl: string | null
}

export type PrimaryActionLabelInput = {
  capabilities: ReadonlySet<string>
  pluginKey: string
  pluginConfig: Record<string, unknown>
}

export type CredentialFieldGroups = {
  primary: FieldDescriptor[]
  manualLogin: FieldDescriptor[]
  totp: FieldDescriptor[]
}

export type CapabilityPlugin = Pick<PluginMeta, 'key' | 'capabilities'>
export type CredentialPlugin = Pick<PluginMeta, 'credential_fields'>
export type EditorAssignmentInput = {
  site?: Partial<SitePayload> | null
  fallbackPluginKey: string
  recommendedPluginKey?: string | null
}

export type EditorAssignment = {
  payload: SitePayload
  groupNames: string[]
}

const disabledCheckinValues = new Set(['1', 'true', 'yes', 'on'])
const manualLoginFieldNames = new Set(['username', 'email', 'password'])
const totpFieldNames = new Set(['totp_secret', 'totp_otpauth_url'])

export function buildPluginOptions(plugins: readonly PluginMeta[], selectedPluginKey: string): PluginOption[] {
  const visibleOptions = plugins
    .filter((plugin) => plugin.key !== 'api-supplier')
    .map((plugin) => ({
      label: plugin.name,
      value: plugin.key,
    }))

  if (selectedPluginKey === 'api-supplier') {
    return [
      { label: '导入记录', value: 'api-supplier' },
      ...visibleOptions,
    ]
  }
  return visibleOptions
}

export function shouldShowAuthEntryButton(input: AuthEntryVisibilityInput): boolean {
  if (!input.authEntryLabel || !input.authEntryUrl) {
    return false
  }
  return !(input.authEntryUrl === input.officialSiteUrl && input.authEntryLabel === '打开官网')
}

export function readTestActionLabel(capabilities: ReadonlySet<string>): string {
  return capabilities.has('relay_only') ? '验证出口' : '测试连接'
}

export function readPrimaryActionLabel(input: PrimaryActionLabelInput): string {
  const customCheckinUrl = String(input.pluginConfig.checkin_url ?? '').trim()
  const disableSub2ApiCheckin =
    input.pluginKey === 'sub2api-platform' &&
    !customCheckinUrl &&
    disabledCheckinValues.has(String(input.pluginConfig.disable_checkin ?? '').trim().toLowerCase())

  if (input.capabilities.has('checkin') && !disableSub2ApiCheckin) {
    return '立即签到'
  }
  if (input.capabilities.has('api_key_sync')) {
    return '同步资料'
  }
  return '执行同步'
}

export function buildAvailableGroupNames(siteGroups: readonly SiteGroup[], editorGroupName: string): string[] {
  const labels = new Set<string>()
  siteGroups.forEach((group) => labels.add(group.name))
  parseGroupNames(editorGroupName).forEach((groupName) => labels.add(groupName))
  return [...labels].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

export function buildGroupOptions(groupNames: readonly string[]): PluginOption[] {
  return groupNames.map((groupName) => ({
    label: groupName,
    value: groupName,
  }))
}

export function buildEditorAssignment(input: EditorAssignmentInput): EditorAssignment {
  const site = input.site
  const groupName = site?.group_name ?? ''
  const payload = {
    name: site?.name ?? '',
    base_url: site?.base_url ?? '',
    plugin_key: site?.plugin_key ?? input.recommendedPluginKey ?? input.fallbackPluginKey,
    group_name: groupName,
    supported_models: normalizeSupportedModels(site?.supported_models ?? null),
    is_enabled: site?.is_enabled ?? true,
    notes: site?.notes ?? '',
    credentials: { ...(site?.credentials ?? {}) },
    plugin_config: { ...(site?.plugin_config ?? {}) },
  }
  return {
    payload,
    groupNames: parseGroupNames(groupName),
  }
}

export function groupCredentialFields(plugin: Pick<PluginMeta, 'credential_fields'> | null): CredentialFieldGroups {
  const fields = plugin?.credential_fields ?? []
  return {
    primary: fields.filter((field) => !manualLoginFieldNames.has(field.name) && !totpFieldNames.has(field.name)),
    manualLogin: fields.filter((field) => manualLoginFieldNames.has(field.name)),
    totp: fields.filter((field) => totpFieldNames.has(field.name)),
  }
}

export function normalizeSupportedModels(values: unknown): string[] | null {
  const normalized = normalizeStringList(values)
  return normalized.length ? normalized : null
}

export function pluginHasCapability(
  plugins: readonly CapabilityPlugin[],
  pluginKey: string,
  capability: string,
): boolean {
  return Boolean(plugins.find((plugin) => plugin.key === pluginKey)?.capabilities.includes(capability))
}

export function isRelayOnlySitePayload(
  payload: Pick<SitePayload, 'plugin_key'>,
  plugins: readonly CapabilityPlugin[],
): boolean {
  return pluginHasCapability(plugins, payload.plugin_key, 'relay_only')
}

export function siteSupportsInvite(
  site: Pick<SitePayload, 'plugin_key'>,
  plugins: readonly CapabilityPlugin[],
): boolean {
  return !isRelayOnlySitePayload(site, plugins) && pluginHasCapability(plugins, site.plugin_key, 'account_status')
}

export function readSiteInviteInfo(site: Pick<SitePayload, 'plugin_config'>): { link: string; code: string } {
  return {
    link: String(site.plugin_config?.invite_link ?? '').trim(),
    code: String(site.plugin_config?.invite_code ?? '').trim(),
  }
}

export function editableCredentialKeysForPlugin(
  plugin: CredentialPlugin | null,
  fallbackKeys: readonly string[],
): Set<string> {
  const keys = new Set((plugin?.credential_fields ?? []).map((field) => field.name))
  if (keys.size === 0) {
    fallbackKeys.forEach((key) => keys.add(key))
  }
  return keys
}
