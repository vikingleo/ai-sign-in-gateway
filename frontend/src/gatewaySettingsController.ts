import { reactive, ref } from 'vue'

import {
  buildGatewaySettingsSaveErrorPlan,
  buildGatewaySettingsSaveSuccessPlan,
} from './gatewaySettingsModel.ts'
import { createDefaultGatewaySettings } from './gatewayViewConfig.ts'
import type { GatewaySettingsData } from './types.ts'

type GatewaySettingsSaveNoticePlan =
  | ReturnType<typeof buildGatewaySettingsSaveErrorPlan>
  | ReturnType<typeof buildGatewaySettingsSaveSuccessPlan>

export type SaveGatewaySettingsOptions = {
  settings: GatewaySettingsData
  requestSave: (settings: GatewaySettingsData) => Promise<GatewaySettingsData>
  setLoading: (value: boolean) => void
  setSettings: (settings: GatewaySettingsData) => void
  closeAfterSuccess: () => void
  reloadGatewayData: () => Promise<void>
  showPlanNotice: (plan: GatewaySettingsSaveNoticePlan) => void
}

export async function saveGatewaySettings({
  settings,
  requestSave,
  setLoading,
  setSettings,
  closeAfterSuccess,
  reloadGatewayData,
  showPlanNotice,
}: SaveGatewaySettingsOptions) {
  setLoading(true)
  try {
    setSettings(await requestSave(settings))
    closeAfterSuccess()
    showPlanNotice(buildGatewaySettingsSaveSuccessPlan())
    await reloadGatewayData()
  } catch (err) {
    showPlanNotice(buildGatewaySettingsSaveErrorPlan(err))
  } finally {
    setLoading(false)
  }
}

type SaveGatewaySettingsActionDependencies =
  Omit<SaveGatewaySettingsOptions, 'settings'> & {
    getSettings: () => GatewaySettingsData
  }

export function createSaveGatewaySettingsAction({
  getSettings,
  ...dependencies
}: SaveGatewaySettingsActionDependencies) {
  return (settings?: GatewaySettingsData) =>
    saveGatewaySettings({
      ...dependencies,
      settings: settings ?? getSettings(),
    })
}

export function useGatewaySettingsDialog() {
  const open = ref(false)
  const loading = ref(false)
  const form = reactive<GatewaySettingsData>(createDefaultGatewaySettings())

  function openDialog() {
    open.value = true
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setSettings(value: GatewaySettingsData) {
    Object.assign(form, value)
  }

  function closeAfterSuccess() {
    open.value = false
  }

  return {
    open,
    loading,
    form,
    openDialog,
    setLoading,
    setSettings,
    closeAfterSuccess,
  }
}

export type GatewaySettingsDialog = ReturnType<typeof useGatewaySettingsDialog>
