import { reactive, ref } from 'vue'

import {
  buildAddUpstreamErrorPlan,
  buildAddUpstreamPayload,
  buildAddUpstreamSuccessPlan,
  buildAddUpstreamValidationPlan,
  createDefaultAddUpstreamForm,
  type AddUpstreamForm,
} from './gatewayAddUpstreamModel.ts'
import type { SitePayload } from './types.ts'

type AddUpstreamNoticePlan =
  | ReturnType<typeof buildAddUpstreamErrorPlan>
  | ReturnType<typeof buildAddUpstreamSuccessPlan>
  | { notice: NonNullable<ReturnType<typeof buildAddUpstreamValidationPlan>['notice']> }

type SubmitGatewayAddUpstreamOptions = {
  form: AddUpstreamForm
  groupNames: string[]
  requestCreateSite: (payload: SitePayload) => Promise<unknown>
  setLoading: (loading: boolean) => void
  closeAfterSuccess: () => void
  syncGatewayRoutes: () => Promise<void>
  reloadGatewayData: () => Promise<void>
  showPlanNotice: (plan: AddUpstreamNoticePlan) => void
}

export async function submitGatewayAddUpstream({
  form,
  groupNames,
  requestCreateSite,
  setLoading,
  closeAfterSuccess,
  syncGatewayRoutes,
  reloadGatewayData,
  showPlanNotice,
}: SubmitGatewayAddUpstreamOptions) {
  const validationPlan = buildAddUpstreamValidationPlan(form)
  if (!validationPlan.isValid) {
    if (validationPlan.notice) {
      showPlanNotice({ notice: validationPlan.notice })
    }
    return
  }
  setLoading(true)
  try {
    const payload = buildAddUpstreamPayload(form, groupNames)
    await requestCreateSite(payload)
    showPlanNotice(buildAddUpstreamSuccessPlan(payload.name))
    closeAfterSuccess()
    await syncGatewayRoutes()
    await reloadGatewayData()
  } catch (err) {
    showPlanNotice(buildAddUpstreamErrorPlan(err))
  } finally {
    setLoading(false)
  }
}

type SubmitGatewayAddUpstreamActionDependencies =
  Omit<SubmitGatewayAddUpstreamOptions, 'form' | 'groupNames'> & {
    getForm: () => AddUpstreamForm
    getGroupNames: () => string[]
  }

export function createSubmitGatewayAddUpstreamAction({
  getForm,
  getGroupNames,
  ...dependencies
}: SubmitGatewayAddUpstreamActionDependencies) {
  return (form?: AddUpstreamForm, groupNames?: string[]) =>
    submitGatewayAddUpstream({
      ...dependencies,
      form: form ?? getForm(),
      groupNames: groupNames ?? getGroupNames(),
    })
}

export function useGatewayAddUpstreamDialog() {
  const open = ref(false)
  const loading = ref(false)
  const form = reactive(createDefaultAddUpstreamForm())
  const groupNames = ref<string[]>([])

  function openDialog() {
    open.value = true
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function reset() {
    Object.assign(form, createDefaultAddUpstreamForm())
    groupNames.value = []
  }

  function closeAfterSuccess() {
    open.value = false
    reset()
  }

  return {
    open,
    loading,
    form,
    groupNames,
    openDialog,
    setLoading,
    reset,
    closeAfterSuccess,
  }
}

export type GatewayAddUpstreamDialog = ReturnType<typeof useGatewayAddUpstreamDialog>
