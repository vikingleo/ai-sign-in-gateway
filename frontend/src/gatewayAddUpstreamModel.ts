import { normalizeGroupNames } from './format.ts'
import type { SitePayload } from './types.ts'
import { normalizeStringList as normalizeModelList } from './viewUtils.ts'

export type ApiFormatOption = 'codex' | 'openai' | 'anthropic' | 'gemini' | 'general'

export type AddUpstreamForm = {
  name: string
  base_url: string
  api_key: string
  api_format: ApiFormatOption
  group_name: string
  preferred_model: string
  supported_models: string[]
}

type AddUpstreamErrorPlan = {
  notice: {
    tone: 'error'
    message: string
  }
}

type AddUpstreamSuccessPlan = {
  notice: {
    tone: 'success'
    message: string
  }
}

type AddUpstreamValidationPlan = {
  isValid: boolean
  validationMessage: string
  notice: {
    tone: 'error'
    message: string
  } | null
}

export function createDefaultAddUpstreamForm(): AddUpstreamForm {
  return {
    name: '',
    base_url: '',
    api_key: '',
    api_format: 'codex',
    group_name: '',
    preferred_model: '',
    supported_models: [],
  }
}

export function validateAddUpstreamForm(form: AddUpstreamForm) {
  const name = form.name.trim()
  const baseUrl = form.base_url.trim()
  const apiKey = form.api_key.trim()
  if (!name || !baseUrl || !apiKey) {
    return '名称 / Base URL / API Key 都需要填写。'
  }
  if (!/^https?:\/\//i.test(baseUrl)) {
    return 'Base URL 必须以 http:// 或 https:// 开头。'
  }
  return ''
}

export function buildAddUpstreamValidationPlan(form: AddUpstreamForm): AddUpstreamValidationPlan {
  const validationMessage = validateAddUpstreamForm(form)
  return {
    isValid: !validationMessage,
    validationMessage,
    notice: validationMessage ? {
      tone: 'error',
      message: validationMessage,
    } : null,
  }
}

export function buildAddUpstreamPayload(form: AddUpstreamForm, selectedGroupNames: string[]): SitePayload {
  return {
    name: form.name.trim(),
    base_url: form.base_url.trim(),
    plugin_key: 'api-supplier',
    group_name: normalizeGroupNames(selectedGroupNames.length ? selectedGroupNames : form.group_name),
    supported_models: normalizeModelList(form.supported_models),
    is_enabled: true,
    notes: '',
    credentials: {
      account: '',
      api_key: form.api_key.trim(),
    },
    plugin_config: {
      api_format: form.api_format,
      endpoint_url: '',
      preferred_model: form.preferred_model.trim(),
    },
  }
}

export function buildAddUpstreamSuccessMessage(name: string) {
  return `已添加上游「${name}」，可在路由池中调整 priority/weight。`
}

export function buildAddUpstreamSuccessPlan(name: string): AddUpstreamSuccessPlan {
  return {
    notice: {
      tone: 'success',
      message: buildAddUpstreamSuccessMessage(name),
    },
  }
}

export function buildAddUpstreamErrorPlan(error: unknown): AddUpstreamErrorPlan {
  return {
    notice: {
      tone: 'error',
      message: error instanceof Error ? error.message : '添加失败',
    },
  }
}
