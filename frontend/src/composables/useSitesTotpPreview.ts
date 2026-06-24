import { ref, type Ref } from 'vue'
import { previewSiteTotp } from '../api'
import type { useToast } from '../toast'
import type { TotpPreview } from '../types'

type Toast = ReturnType<typeof useToast>

type UseSitesTotpPreviewOptions = {
  editingId: Ref<number | null>
  toast: Toast
}

export function useSitesTotpPreview(options: UseSitesTotpPreviewOptions) {
  const totpPreviewOpen = ref(false)
  const totpPreviewLoading = ref(false)
  const totpPreview = ref<TotpPreview | null>(null)

  async function handlePreviewTotp() {
    if (!options.editingId.value) {
      return
    }
    totpPreviewLoading.value = true
    try {
      totpPreview.value = await previewSiteTotp(options.editingId.value)
      totpPreviewOpen.value = true
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '验证码生成失败')
    } finally {
      totpPreviewLoading.value = false
    }
  }

  return {
    totpPreviewOpen,
    totpPreviewLoading,
    totpPreview,
    handlePreviewTotp,
  }
}
