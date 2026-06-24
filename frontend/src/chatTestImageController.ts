import { computed, ref, type ComponentPublicInstance } from 'vue'
import {
  clampImageDimension,
  imageRatioPresets,
  maxReferenceImages,
  normalizedRatioLabel,
  type ChatMode,
} from './chatTestModel'
import type { ChatImageReference } from './types'

type ChatImageForm = {
  image_size: string
  image_width: number
  image_height: number
}

type Toast = {
  error: (message: string) => void
  info: (message: string) => void
}

type ChatImageControllerOptions = {
  form: ChatImageForm
  activeMode: { readonly value: ChatMode }
  toast: Toast
}

export function useChatTestImageController({ form, activeMode, toast }: ChatImageControllerOptions) {
  const referenceImages = ref<ChatImageReference[]>([])
  const fileInput = ref<HTMLInputElement | null>(null)
  const imageRatioLocked = ref(false)
  const imageAspectRatio = ref(1)
  const detectedImageRatio = ref('1:1')
  const lockedImageRatio = ref('')
  const imageRatioTooltip = computed(() =>
    imageRatioLocked.value ? `已锁定 ${form.image_width}:${form.image_height}` : '锁定当前宽高比',
  )
  const activeImageRatio = computed(() => (imageRatioLocked.value ? lockedImageRatio.value : detectedImageRatio.value))

  function syncImageSizeFromDimensions() {
    form.image_width = clampImageDimension(form.image_width)
    form.image_height = clampImageDimension(form.image_height)
    form.image_size = `${form.image_width}x${form.image_height}`
  }

  function detectImageRatio() {
    const label = normalizedRatioLabel(form.image_width, form.image_height)
    const preset = imageRatioPresets.find((item) => item.label === label)
    detectedImageRatio.value = preset ? preset.label : ''
  }

  function applyImageRatioPreset(preset: (typeof imageRatioPresets)[number]) {
    const ratioUnit = 100
    form.image_width = clampImageDimension(preset.width * ratioUnit)
    form.image_height = clampImageDimension(preset.height * ratioUnit)
    imageAspectRatio.value = preset.width / preset.height
    imageRatioLocked.value = true
    lockedImageRatio.value = preset.label
    detectedImageRatio.value = preset.label
    syncImageSizeFromDimensions()
  }

  function toggleImageRatioLock() {
    if (!imageRatioLocked.value) {
      syncImageSizeFromDimensions()
      imageAspectRatio.value = form.image_width / form.image_height
      lockedImageRatio.value = detectedImageRatio.value
    } else {
      lockedImageRatio.value = ''
    }
    imageRatioLocked.value = !imageRatioLocked.value
    detectImageRatio()
  }

  function handleImageWidthChange(value: unknown) {
    form.image_width = clampImageDimension(value)
    if (imageRatioLocked.value) {
      form.image_height = clampImageDimension(form.image_width / imageAspectRatio.value)
    }
    syncImageSizeFromDimensions()
    detectImageRatio()
    if (imageRatioLocked.value) {
      lockedImageRatio.value = detectedImageRatio.value
    }
  }

  function handleImageHeightChange(value: unknown) {
    form.image_height = clampImageDimension(value)
    if (imageRatioLocked.value) {
      form.image_width = clampImageDimension(form.image_height * imageAspectRatio.value)
    }
    syncImageSizeFromDimensions()
    detectImageRatio()
    if (imageRatioLocked.value) {
      lockedImageRatio.value = detectedImageRatio.value
    }
  }

  function bindFileInput(element: Element | ComponentPublicInstance | null) {
    fileInput.value = element instanceof HTMLInputElement ? element : null
  }

  function triggerImagePicker() {
    if (activeMode.value !== 'image') {
      toast.error('当前模型不支持图片输入，请选择图片生成模型后再添加参考图。')
      return
    }
    fileInput.value?.click()
  }

  function addReferenceImages(event: Event) {
    const input = event.target as HTMLInputElement
    if (activeMode.value !== 'image') {
      input.value = ''
      toast.error('当前模型不支持图片输入，请选择图片生成模型后再添加参考图。')
      return
    }
    const files = Array.from(input.files ?? [])
    input.value = ''
    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length !== files.length) {
      toast.error('只能添加图片文件。')
    }
    const remaining = Math.max(0, maxReferenceImages - referenceImages.value.length)
    imageFiles.slice(0, remaining).forEach((file) => {
      void fileToDataURL(file)
        .then((url) => {
          referenceImages.value.push({ name: file.name, url })
        })
        .catch((err) => toast.error(err instanceof Error ? err.message : '图片读取失败'))
    })
    if (imageFiles.length > remaining) {
      toast.info(`最多保留 ${maxReferenceImages} 张参考图。`)
    }
  }

  function removeReferenceImage(index: number) {
    referenceImages.value.splice(index, 1)
  }

  return {
    referenceImages,
    imageRatioLocked,
    detectedImageRatio,
    lockedImageRatio,
    imageRatioTooltip,
    activeImageRatio,
    syncImageSizeFromDimensions,
    detectImageRatio,
    applyImageRatioPreset,
    toggleImageRatioLock,
    handleImageWidthChange,
    handleImageHeightChange,
    bindFileInput,
    triggerImagePicker,
    addReferenceImages,
    removeReferenceImage,
  }
}

function fileToDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error ?? new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}
