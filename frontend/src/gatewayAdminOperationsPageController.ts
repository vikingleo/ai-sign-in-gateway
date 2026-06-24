import { useGatewaySettingsPageActions } from './gatewaySettingsPageController.ts'
import { useGatewayUpstreamPageActions } from './gatewayUpstreamPageController.ts'

type GatewayAdminOperationsPageOptions =
  Omit<Parameters<typeof useGatewaySettingsPageActions>[0], 'requestSave' | 'setLoading' | 'closeAfterSuccess'> &
  Omit<Parameters<typeof useGatewayUpstreamPageActions>[0], 'showPlanNotice'> & {
    requestSaveSettings: Parameters<typeof useGatewaySettingsPageActions>[0]['requestSave']
    setSettingsLoading: Parameters<typeof useGatewaySettingsPageActions>[0]['setLoading']
    closeSettingsAfterSuccess: Parameters<typeof useGatewaySettingsPageActions>[0]['closeAfterSuccess']
  }

export function useGatewayAdminOperationsPageActions({
  requestSaveSettings,
  setSettingsLoading,
  closeSettingsAfterSuccess,
  ...options
}: GatewayAdminOperationsPageOptions) {
  const upstreamActions = useGatewayUpstreamPageActions(options)
  const settingsActions = useGatewaySettingsPageActions({
    ...options,
    requestSave: requestSaveSettings,
    setLoading: setSettingsLoading,
    closeAfterSuccess: closeSettingsAfterSuccess,
  })

  return {
    ...upstreamActions,
    ...settingsActions,
  }
}
