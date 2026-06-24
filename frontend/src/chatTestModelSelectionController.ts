import { computed, ref } from 'vue'
import { getSites, listToolModels } from './api'
import {
  chooseDefaultModel,
  modelListExceptionMessage,
  modelListMessage,
  modelOptionLabel,
  modelOptionValue,
  routeTypeLabel,
  shortFingerprint,
} from './chatTestModel'
import type { ModelListItem, Site } from './types'

type ChatModelForm = {
  model_key?: string
}

type Toast = {
  error: (message: string) => void
}

export function useChatTestModelSelectionController({ form, toast }: { form: ChatModelForm; toast: Toast }) {
  const sites = ref<Site[]>([])
  const selectedSiteId = ref<string>()
  const modelsLoading = ref(false)
  const modelItems = ref<ModelListItem[]>([])
  const modelLoadMessage = ref('')
  const modelLoadError = ref(false)
  let siteModelLoadRequest = 0

  const selectedSite = computed(() =>
    sites.value.find((item) => String(item.id) === selectedSiteId.value) ?? null,
  )
  const siteOptions = computed(() =>
    sites.value.map((site) => ({
      label: `${site.name} / ${site.plugin_key}`,
      value: String(site.id),
    })),
  )
  const modelOptions = computed(() =>
    modelItems.value.map((model) => ({
      label: modelOptionLabel(model),
      value: modelOptionValue(model),
    })),
  )
  const selectedModel = computed(() => modelItems.value.find((model) => modelOptionValue(model) === form.model_key) ?? null)
  const activeMode = computed(() => selectedModel.value?.mode === 'image' ? 'image' : 'chat')
  const sendPlaceholder = computed(() =>
    activeMode.value === 'image'
      ? '描述你想生成的图片，或结合参考图说明要保留和改变的部分。'
      : '输入消息，Enter 发送，Shift + Enter 换行。',
  )
  const selectedModelMeta = computed(() => {
    const model = selectedModel.value
    if (!model) return ''
    return [routeTypeLabel(model.route_type), model.key_name || shortFingerprint(model.key_fingerprint), model.base_url]
      .filter(Boolean)
      .join(' / ')
  })
  const modelLoadAlertType = computed(() => (modelLoadError.value ? 'error' : 'info'))

  async function applySelectedSite(preferredModel?: Pick<ModelListItem, 'id' | 'route_type' | 'key_fingerprint'>) {
    const requestID = ++siteModelLoadRequest
    const site = selectedSite.value
    modelItems.value = []
    form.model_key = undefined
    modelLoadMessage.value = ''
    modelLoadError.value = false
    if (!site) {
      modelsLoading.value = false
      return
    }
    modelsLoading.value = true
    try {
      const result = await listToolModels(Number(site.id))
      if (requestID !== siteModelLoadRequest || String(site.id) !== selectedSiteId.value) {
        return
      }
      modelItems.value = result.items ?? []
      modelLoadMessage.value = modelListMessage(result.message, result.status_code)
      const restored = preferredModel
        ? modelItems.value.find((item) =>
          item.id === preferredModel.id &&
          item.route_type === preferredModel.route_type &&
          item.key_fingerprint === preferredModel.key_fingerprint)
        : null
      const preferred = chooseDefaultModel(modelItems.value)
      form.model_key = restored
        ? modelOptionValue(restored)
        : (preferred ? modelOptionValue(preferred) : undefined)
      if (!result.ok) {
        modelLoadError.value = true
        toast.error(modelLoadMessage.value || '模型列表加载失败')
      }
    } catch (err) {
      if (requestID !== siteModelLoadRequest) {
        return
      }
      modelLoadError.value = true
      modelLoadMessage.value = modelListExceptionMessage(err)
      toast.error(modelLoadMessage.value)
    } finally {
      if (requestID === siteModelLoadRequest) {
        modelsLoading.value = false
      }
    }
  }

  function handleSiteChange() {
    void applySelectedSite()
  }

  async function loadSites() {
    try {
      sites.value = await getSites()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '站点加载失败')
    }
  }

  return {
    sites,
    selectedSiteId,
    modelsLoading,
    modelItems,
    modelLoadMessage,
    modelLoadError,
    selectedSite,
    siteOptions,
    modelOptions,
    selectedModel,
    activeMode,
    sendPlaceholder,
    selectedModelMeta,
    modelLoadAlertType,
    applySelectedSite,
    handleSiteChange,
    loadSites,
  }
}
