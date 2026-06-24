import { createSaveGatewaySettingsAction } from './gatewaySettingsController.ts'
import type { GatewaySettingsData } from './types.ts'

type GatewaySettingsNoticePlan = {
  notice: {
    tone: 'success' | 'error'
    message: string
  }
}

type GatewaySettingsPageOptions = {
  settingsForm: GatewaySettingsData
  requestSave: (settings: GatewaySettingsData) => Promise<GatewaySettingsData>
  setLoading: (loading: boolean) => void
  setSettings: (settings: GatewaySettingsData) => void
  closeAfterSuccess: () => void
  reloadGatewayData: () => Promise<void>
  showPlanNotice: (plan: GatewaySettingsNoticePlan) => void
}

export function useGatewaySettingsPageActions({
  settingsForm,
  requestSave,
  setLoading,
  setSettings,
  closeAfterSuccess,
  reloadGatewayData,
  showPlanNotice,
}: GatewaySettingsPageOptions) {
  const saveSettings = createSaveGatewaySettingsAction({
    getSettings: () => settingsForm,
    requestSave,
    setLoading,
    setSettings,
    closeAfterSuccess,
    reloadGatewayData,
    showPlanNotice,
  })

  return {
    saveSettings,
  }
}
