import type { ComputedRef, Ref } from 'vue'
import type { useToast } from './toast'
import type {
  BalanceProbeResult,
  PluginMeta,
  Site,
  SitePayload,
  SiteRegistrationBatchResult,
} from './types'

export type Toast = ReturnType<typeof useToast>
export type ReadableRef<T> = Ref<T> | ComputedRef<T>

export type TestFeedback = {
  type: 'success' | 'error'
  title: string
  message: string
}

export type BatchRegisterForm = {
  email_pattern: string
  password: string
  count: number
  start_index: number
}

export type PersistOptions = {
  keepDrawerOpen?: boolean
  showToast?: boolean
}

export type LoadOptions = {
  preserveEditor?: boolean
}

export type UseSitesEditorActionsOptions = {
  sites: Ref<Site[]>
  selectedId: Ref<number | null>
  selectedSite: ReadableRef<Site | null>
  editingId: Ref<number | null>
  drawerOpen: Ref<boolean>
  busy: Ref<boolean>
  editor: SitePayload
  batchRegisterEnabled: Ref<boolean>
  batchRegisterForm: BatchRegisterForm
  batchRegisterResult: Ref<SiteRegistrationBatchResult | null>
  testFeedback: Ref<TestFeedback | null>
  saveFeedback: Ref<string | null>
  lastSavedEditorSnapshot: Ref<string>
  canBatchRegisterEditor: ReadableRef<boolean>
  isRelayOnlyEditor: ReadableRef<boolean>
  pluginMismatch: ReadableRef<boolean>
  mismatchAcknowledged: Ref<boolean>
  recommendedPluginKey: ReadableRef<string | null>
  recommendedPlugin: ReadableRef<PluginMeta | null>
  toast: Toast
  assignEditor: (site?: Site | null) => void
  ensureStorageAnalysisFinished: () => Promise<void>
  syncRoutesAfterSiteChange: () => Promise<void>
  loadData: (preferredId?: number | null, options?: LoadOptions) => Promise<void>
  reloadDataWithCheckinExtras: (preferredId?: number | null, options?: LoadOptions) => Promise<void>
  isRelayOnlySitePayload: (payload: { plugin_key: string }) => boolean
  applyBalanceProbeResult: (result: BalanceProbeResult) => void
}
