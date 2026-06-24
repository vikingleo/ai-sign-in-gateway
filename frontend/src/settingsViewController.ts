import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getSettings,
  runSchedulerNow,
  updateSettings,
} from './api'
import ShellLayout from './components/ShellLayout.vue'
import {
  adminRoleColor,
  adminRoleLabel,
  asAdminUser,
  clonePricingScheme,
  createPricingRow,
  createSettingsForm,
  formatBackupTime,
  formatFileSize,
  formatOptionalTime,
  priceRowKey,
  pricingProviderOptions,
  roleOptions,
  runtimeStopTagColor,
} from './settingsViewModel'
import { useSettingsAccountController } from './settingsAccountController'
import { useSettingsRuntimeController } from './settingsRuntimeController'
import { useToast } from './toast'
import type { SettingsData } from './types'

type SettingsTabKey = 'schedule' | 'runtime' | 'database' | 'pricing' | 'extensions' | 'config' | 'account'

export function useSettingsViewController() {
  const toast = useToast()
  const route = useRoute()
  const router = useRouter()
  const form = reactive<SettingsData>(createSettingsForm())
  const loading = ref(false)
  const activeTab = ref<SettingsTabKey>('schedule')
  const isDesktopEmbedded = computed(() => route.path === '/desktop')
  const settingsFrameComponent = computed(() => (isDesktopEmbedded.value ? 'div' : ShellLayout))
  const account = useSettingsAccountController({ toast })
  const pricingSchemeOptions = computed(() =>
    form.gateway_pricing_schemes.map((scheme) => ({
      label: scheme.readonly ? `${scheme.name}（只读）` : scheme.name,
      value: scheme.id,
    })),
  )
  const activePricingScheme = computed(() =>
    form.gateway_pricing_schemes.find((scheme) => scheme.id === form.gateway_pricing_active_scheme_id) ??
    form.gateway_pricing_schemes[0] ??
    null,
  )
  const activePricingEditable = computed(() => Boolean(activePricingScheme.value && !activePricingScheme.value.readonly))

  async function loadData() {
    loading.value = true
    try {
      const settings = await getSettings()
      Object.assign(form, settings)
      if (!form.gateway_pricing_active_scheme_id) {
        form.gateway_pricing_active_scheme_id = 'official'
      }
      if (!Array.isArray(form.gateway_pricing_schemes)) {
        form.gateway_pricing_schemes = []
      }
      runtime.runtimeConfigDirInput.value =
        settings.runtime_pending_config_dir || settings.runtime_config_dir || settings.runtime_default_config_dir || ''
      await runtime.loadDatabaseBackups(false)
      await account.loadCurrentAccount()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载失败')
    } finally {
      loading.value = false
    }
  }

  const runtime = useSettingsRuntimeController({
    form,
    toast,
    reloadData: loadData,
    goLogin: () => router.push('/login'),
  })

  function duplicateActivePricingScheme() {
    const source = activePricingScheme.value
    if (!source) {
      toast.error('当前没有可复制的价格方案。')
      return
    }
    const next = clonePricingScheme(source)
    next.id = `custom-${Date.now()}`
    next.name = source.readonly ? '官方价格副本' : `${source.name} 副本`
    next.readonly = false
    next.source = 'custom'
    form.gateway_pricing_schemes.push(next)
    form.gateway_pricing_active_scheme_id = next.id
    toast.success('已复制为自定义价格方案，保存设置后生效。')
  }

  function addPricingRow() {
    const scheme = activePricingScheme.value
    if (!scheme) {
      toast.error('当前没有可编辑的价格方案。')
      return
    }
    if (scheme.readonly) {
      toast.error('官方价格方案只读，请先复制为自定义方案。')
      return
    }
    scheme.prices.push(createPricingRow())
    toast.success('已添加价格行，保存设置后生效。')
  }

  function removePricingRow(index: number) {
    const scheme = activePricingScheme.value
    if (!scheme) {
      toast.error('当前没有可编辑的价格方案。')
      return
    }
    if (scheme.readonly) {
      toast.error('官方价格方案只读，请先复制为自定义方案。')
      return
    }
    scheme.prices.splice(index, 1)
    toast.success('已移除价格行，保存设置后生效。')
  }

  async function save() {
    loading.value = true
    try {
      Object.assign(form, await updateSettings(form))
      await runtime.loadDatabaseBackups(false)
      toast.success('系统设置已保存并重载调度器。')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      loading.value = false
    }
  }

  async function runNow() {
    loading.value = true
    try {
      const result = await runSchedulerNow()
      toast.success(result.message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '执行失败')
    } finally {
      loading.value = false
    }
  }

  onMounted(loadData)

  return reactive({
    form,
    loading,
    activeTab,
    isDesktopEmbedded,
    settingsFrameComponent,
    pricingSchemeOptions,
    activePricingScheme,
    activePricingEditable,
    pricingProviderOptions,
    roleOptions,
    asAdminUser,
    adminRoleLabel,
    adminRoleColor,
    formatBackupTime,
    formatFileSize,
    formatOptionalTime,
    priceRowKey,
    runtimeStopTagColor,
    loadData,
    duplicateActivePricingScheme,
    addPricingRow,
    removePricingRow,
    save,
    runNow,
    ...account,
    ...runtime,
  })
}

export type SettingsViewController = ReturnType<typeof useSettingsViewController>
