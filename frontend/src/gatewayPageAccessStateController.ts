import { useGatewayAccessPageState } from './gatewayAccessPageController.ts'
import type { GatewayNoticeActions } from './gatewayNoticeController.ts'
import type { GatewayPagePlatform } from './gatewayPagePlatformController.ts'
import type { GatewayPageState } from './gatewayPageStateController.ts'

type GatewayPageAccessStateOptions = {
  state: GatewayPageState
  getApiBase: () => string
  gatewayPagePlatform: GatewayPagePlatform
  showPlanNotice: GatewayNoticeActions['showPlanNotice']
}

export function useGatewayPageAccessState({
  state,
  getApiBase,
  gatewayPagePlatform,
  showPlanNotice,
}: GatewayPageAccessStateOptions) {
  return useGatewayAccessPageState({
    settingsForm: state.settingsDialog.form,
    getApiBase,
    location: gatewayPagePlatform.location,
    writeText: gatewayPagePlatform.writeText,
    showPlanNotice,
  })
}
