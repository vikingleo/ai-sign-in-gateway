import { reactive, ref, type Ref } from 'vue'
import { getSite } from '../api'
import type { useToast } from '../toast'
import type { Site, SitePayload, SiteRegistrationBatchResult } from '../types'

type Toast = ReturnType<typeof useToast>

type TestFeedback = {
  type: 'success' | 'error'
  title: string
  message: string
}

type UseSitesEditorDrawerOptions = {
  editingId: Ref<number | null>
  drawerOpen: Ref<boolean>
  busy: Ref<boolean>
  batchRegisterEnabled: Ref<boolean>
  testFeedback: Ref<TestFeedback | null>
  saveFeedback: Ref<string | null>
  lastSavedEditorSnapshot: Ref<string>
  localStorageRawText: Ref<string>
  editor: SitePayload
  toast: Toast
  assignEditor: (site?: Site | null) => void
}

export function useSitesEditorDrawer(options: UseSitesEditorDrawerOptions) {
  const batchRegisterResult = ref<SiteRegistrationBatchResult | null>(null)
  const batchRegisterForm = reactive({
    email_pattern: '',
    password: '',
    count: 3,
    start_index: 1,
  })

  function resetBatchRegisterForm() {
    options.batchRegisterEnabled.value = false
    batchRegisterResult.value = null
    batchRegisterForm.email_pattern = ''
    batchRegisterForm.password = ''
    batchRegisterForm.count = 3
    batchRegisterForm.start_index = 1
  }

  function openCreateDrawer() {
    options.editingId.value = null
    options.assignEditor(null)
    options.localStorageRawText.value = ''
    options.testFeedback.value = null
    options.saveFeedback.value = null
    options.lastSavedEditorSnapshot.value = ''
    resetBatchRegisterForm()
    options.drawerOpen.value = true
  }

  async function openEditDrawer(site: Site) {
    options.busy.value = true
    options.editingId.value = site.id
    options.localStorageRawText.value = ''
    options.testFeedback.value = null
    options.saveFeedback.value = null
    try {
      const fullSite = await getSite(site.id)
      options.assignEditor(fullSite)
      options.lastSavedEditorSnapshot.value = JSON.stringify(options.editor)
      options.drawerOpen.value = true
    } catch (err) {
      options.editingId.value = null
      options.toast.error(err instanceof Error ? err.message : '站点详情加载失败')
    } finally {
      options.busy.value = false
    }
  }

  function closeDrawer() {
    options.drawerOpen.value = false
    options.testFeedback.value = null
    options.saveFeedback.value = null
    options.lastSavedEditorSnapshot.value = ''
  }

  return {
    batchRegisterResult,
    batchRegisterForm,
    resetBatchRegisterForm,
    openCreateDrawer,
    openEditDrawer,
    closeDrawer,
  }
}
