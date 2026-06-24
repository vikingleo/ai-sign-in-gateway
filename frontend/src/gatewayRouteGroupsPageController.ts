import type { Ref } from 'vue'

import {
  assignGatewayRouteGroupsAction,
  createGatewayRouteGroupAction,
  deleteGatewayRouteGroupAction,
  loadGatewayRouteGroups,
  updateGatewayRouteGroupAction,
} from './gatewayRouteGroupsController.ts'
import type { GatewayRoute, GatewayRouteGroup } from './types.ts'

type GatewayRouteGroupNoticePlan = {
  notice: {
    tone: 'success' | 'error'
    message: string
  }
}

type GatewayRouteConfirmWindow = {
  confirm: (message: string) => boolean
}

type GatewayRouteGroupPayload = {
  name: string
  apiKey: string
  clearApiKey?: boolean
}

type GatewayRouteGroupsPageOptions = {
  routeGroups: Ref<GatewayRouteGroup[]>
  routeGroupAssignmentRoute: Ref<GatewayRoute | null>
  routeGroupAssignmentGroupIds: Ref<number[]>
  requestRouteGroups: () => Promise<GatewayRouteGroup[]>
  requestCreateRouteGroup: (payload: { name: string; api_key?: string }) => Promise<GatewayRouteGroup>
  requestUpdateRouteGroup: (id: number, payload: { name: string; api_key?: string; clear_api_key?: boolean }) => Promise<GatewayRouteGroup>
  requestDeleteRouteGroup: (id: number) => Promise<unknown>
  requestAssignRouteGroups: (routeId: number, groupIds: number[]) => Promise<GatewayRoute>
  reloadGatewayData: () => Promise<void>
  confirmWindow: GatewayRouteConfirmWindow
  setRouteGroupManagerLoading: (loading: boolean) => void
  openRouteGroupManagerDialog: () => void
  setRouteGroupAssignmentLoading: (loading: boolean) => void
  openRouteGroupAssignmentDialog: (route: GatewayRoute) => void
  closeRouteGroupAssignmentDialogAfterSuccess: () => void
  showPlanNotice: (plan: GatewayRouteGroupNoticePlan) => void
}

export function useGatewayRouteGroupsPageActions({
  routeGroups,
  routeGroupAssignmentRoute,
  routeGroupAssignmentGroupIds,
  requestRouteGroups,
  requestCreateRouteGroup,
  requestUpdateRouteGroup,
  requestDeleteRouteGroup,
  requestAssignRouteGroups,
  reloadGatewayData,
  confirmWindow,
  setRouteGroupManagerLoading,
  openRouteGroupManagerDialog,
  setRouteGroupAssignmentLoading,
  openRouteGroupAssignmentDialog,
  closeRouteGroupAssignmentDialogAfterSuccess,
  showPlanNotice,
}: GatewayRouteGroupsPageOptions) {
  const setRouteGroups = (groups: GatewayRouteGroup[]) => {
    routeGroups.value = groups
  }
  const commonGroupOptions = {
    setRouteGroups,
    requestRouteGroups,
    reloadGatewayData,
    showPlanNotice,
  }

  const refreshRouteGroups = () =>
    loadGatewayRouteGroups({
      ...commonGroupOptions,
      setLoading: setRouteGroupManagerLoading,
    })

  const openRouteGroupManager = async () => {
    openRouteGroupManagerDialog()
    await refreshRouteGroups()
  }

  const createRouteGroup = (payload: GatewayRouteGroupPayload) =>
    createGatewayRouteGroupAction({
      ...commonGroupOptions,
      payload,
      requestCreate: requestCreateRouteGroup,
      setLoading: setRouteGroupManagerLoading,
    })

  const updateRouteGroup = (group: GatewayRouteGroup, payload: GatewayRouteGroupPayload) =>
    updateGatewayRouteGroupAction({
      ...commonGroupOptions,
      group,
      payload,
      requestUpdate: requestUpdateRouteGroup,
      setLoading: setRouteGroupManagerLoading,
    })

  const deleteRouteGroup = (group: GatewayRouteGroup) =>
    deleteGatewayRouteGroupAction({
      ...commonGroupOptions,
      group,
      confirmWindow,
      requestDelete: requestDeleteRouteGroup,
      setLoading: setRouteGroupManagerLoading,
    })

  const openRouteGroupAssignment = (route: GatewayRoute) => openRouteGroupAssignmentDialog(route)

  const saveRouteGroupAssignment = () =>
    assignGatewayRouteGroupsAction({
      ...commonGroupOptions,
      route: routeGroupAssignmentRoute.value,
      groupIds: routeGroupAssignmentGroupIds.value,
      requestAssign: requestAssignRouteGroups,
      setLoading: setRouteGroupAssignmentLoading,
      closeAfterSuccess: closeRouteGroupAssignmentDialogAfterSuccess,
    })

  return {
    openRouteGroupManager,
    refreshRouteGroups,
    createRouteGroup,
    updateRouteGroup,
    deleteRouteGroup,
    openRouteGroupAssignment,
    saveRouteGroupAssignment,
  }
}
