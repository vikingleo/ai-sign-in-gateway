import { computed } from 'vue'

import { createCopyGatewayActivityUrlAction, createCopyGatewayErrorDetailAction } from './gatewayActivityController.ts'
import {
  createCopyGatewayApiKeyAction,
  createCopyGatewayRequestUrlAction,
  createGatewayRequestUrlAction,
} from './gatewayAccessController.ts'
import {
  buildCodexGatewayRequestUrl,
  buildCodexGatewayTooltip,
  maskGatewayApiKey,
} from './gatewayAccessModel.ts'

type GatewayAccessNoticePlan = {
  notice: {
    tone: 'success' | 'error'
    message: string
  }
}

type GatewayAccessSettingsFormLike = {
  gateway_api_key: string
}

type GatewayAccessPageLocation = {
  origin: string
}

export type GatewayAccessPageStateOptions = {
  settingsForm: GatewayAccessSettingsFormLike
  getApiBase: () => string
  location: GatewayAccessPageLocation
  writeText: (value: string) => Promise<void>
  showPlanNotice: (plan: GatewayAccessNoticePlan) => void
}

export function useGatewayAccessPageState({
  settingsForm,
  getApiBase,
  location,
  writeText,
  showPlanNotice,
}: GatewayAccessPageStateOptions) {
  const gatewayRequestUrl = computed(createGatewayRequestUrlAction({
    getApiBase,
    location,
  }))
  const codexGatewayRequestUrl = computed(() => buildCodexGatewayRequestUrl(gatewayRequestUrl.value))
  const codexGatewayTooltip = computed(() => buildCodexGatewayTooltip(codexGatewayRequestUrl.value))
  const maskedGatewayApiKey = computed(() => maskGatewayApiKey(settingsForm.gateway_api_key))

  const copyGatewayRequestUrl = createCopyGatewayRequestUrlAction({
    getRequestUrl: () => gatewayRequestUrl.value,
    writeText,
    showPlanNotice,
  })
  const copyGatewayApiKey = createCopyGatewayApiKeyAction({
    getApiKey: () => settingsForm.gateway_api_key,
    writeText,
    showPlanNotice,
  })
  const copyGatewayActivityUrl = createCopyGatewayActivityUrlAction({
    writeText,
    showPlanNotice,
  })
  const copyGatewayErrorDetail = createCopyGatewayErrorDetailAction({
    writeText,
    showPlanNotice,
  })

  return {
    gatewayRequestUrl,
    codexGatewayRequestUrl,
    codexGatewayTooltip,
    maskedGatewayApiKey,
    copyGatewayRequestUrl,
    copyGatewayApiKey,
    copyGatewayActivityUrl,
    copyGatewayErrorDetail,
  }
}
