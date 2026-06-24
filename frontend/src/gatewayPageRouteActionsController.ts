import { notifyGatewayOverviewChanged } from './gatewayOverviewEvents.ts'
import type { GatewayNoticeActions } from './gatewayNoticeController.ts'
import type { GatewayPageDisplayHelpers } from './gatewayPageDisplayHelpersController.ts'
import type { GatewayPagePlatform } from './gatewayPagePlatformController.ts'
import type { GatewayPageRequests } from './gatewayPageRequestsController.ts'
import type { useGatewayPageRefreshActions } from './gatewayPageRefreshActionsController.ts'
import type { useGatewayPageRuntimeActions } from './gatewayPageRuntimeActionsController.ts'
import type { GatewayPageState } from './gatewayPageStateController.ts'
import { useGatewayRouteManagementOperationsPageActions } from './gatewayRouteManagementOperationsPageController.ts'
import type { GatewayRouteMutationActions } from './gatewayRouteMutationActionsController.ts'

type GatewayPageRouteActionsOptions = {
  state: GatewayPageState
  gatewayPageRequests: GatewayPageRequests
  gatewayPageDisplayHelpers: GatewayPageDisplayHelpers
  gatewayPagePlatform: GatewayPagePlatform
  routeMutationActions: GatewayRouteMutationActions
  refreshActions: ReturnType<typeof useGatewayPageRefreshActions>
  runtimeActions: ReturnType<typeof useGatewayPageRuntimeActions>
  nowIso: () => string
  showNotice: GatewayNoticeActions['showNotice']
  showPlanNotice: GatewayNoticeActions['showPlanNotice']
}

export function useGatewayPageRouteActions({
  state,
  gatewayPageRequests,
  gatewayPageDisplayHelpers,
  gatewayPagePlatform,
  routeMutationActions,
  refreshActions,
  runtimeActions,
  nowIso,
  showNotice,
  showPlanNotice,
}: GatewayPageRouteActionsOptions) {
  return useGatewayRouteManagementOperationsPageActions({
    routes: state.routes,
    overview: state.overview,
    probeLoading: state.probeLoading,
    balanceProbeAllProgress: state.balanceProbeAllProgress,
    balanceProbeManualRoute: state.balanceProbeManualRoute,
    balanceProbeManualURL: state.balanceProbeManualURL,
    routeProbeState: state.routeProbeState,
    routeBalanceProbeState: state.routeBalanceProbeState,
    requestProbeBatch: gatewayPageRequests.probeGatewayRoutes,
    requestProbe: gatewayPageRequests.probeGatewayRoute,
    requestBalance: gatewayPageRequests.probeGatewayRouteBalance,
    requestOverview: gatewayPageRequests.getGatewayOverview,
    applyProbeResult: routeMutationActions.applyProbeResult,
    applyBalanceResult: routeMutationActions.applyRouteBalanceResult,
    refreshRouteSummaries: refreshActions.refreshRouteSummaries,
    notifyOverviewChanged: notifyGatewayOverviewChanged,
    openManualDialog: state.balanceProbeManualDialog.openDialog,
    setManualDialogLoading: state.balanceProbeManualDialog.setLoading,
    closeManualDialogAfterSuccess: state.balanceProbeManualDialog.closeAfterSuccess,
    setManualFailureMessage: state.balanceProbeManualDialog.setFailureMessage,
    now: nowIso,
    showNotice,
    showPlanNotice,
    priorityRoutes: state.priorityRoutes,
    priorityRoute: state.priorityRoute,
    priorityInsertIndex: state.priorityInsertIndex,
    requestRoutes: gatewayPageRequests.getGatewayRoutes,
    requestReorder: gatewayPageRequests.reorderGatewayRoutePriorities,
    normalizeRoute: gatewayPageDisplayHelpers.normalizeGatewayRoute,
    openPriorityDialog: state.priorityDialog.openDialog,
    setPriorityDialogLoading: state.priorityDialog.setLoading,
    setPriorityRoutes: (routeData) => {
      state.priorityRoutes.value = routeData
    },
    selectPriorityRoute: state.priorityDialog.selectRoute,
    clearPriorityInsertIndex: state.priorityDialog.clearInsertIndex,
    applyReorderedRoutes: routeMutationActions.applyReorderedRoutes,
    confirmWindow: gatewayPagePlatform.confirmWindow,
    requestToggle: gatewayPageRequests.toggleGatewayRoute,
    requestDisableAll: gatewayPageRequests.disableAllGatewayRoutes,
    requestEnableOnly: gatewayPageRequests.enableOnlyGatewayRoute,
    requestReset: gatewayPageRequests.resetGatewayRouteCircuit,
    requestRouteGroups: gatewayPageRequests.getGatewayRouteGroups,
    requestCreateRouteGroup: gatewayPageRequests.createGatewayRouteGroup,
    requestUpdateRouteGroup: gatewayPageRequests.updateGatewayRouteGroup,
    requestDeleteRouteGroup: gatewayPageRequests.deleteGatewayRouteGroup,
    requestAssignRouteGroups: gatewayPageRequests.updateGatewayRouteGroups,
    requestDeleteRoute: gatewayPageRequests.deleteGatewayRoute,
    reloadGatewayData: runtimeActions.reloadGatewayDataAfterAction,
    routeLabel: gatewayPageDisplayHelpers.loadRouteLabel,
    routeGroups: state.routeGroups,
    setRouteGroupManagerLoading: state.routeGroupManagerDialog.setLoading,
    openRouteGroupManagerDialog: state.routeGroupManagerDialog.openDialog,
    routeGroupAssignmentRoute: state.routeGroupAssignmentDialog.route,
    routeGroupAssignmentGroupIds: state.routeGroupAssignmentDialog.groupIds,
    setRouteGroupAssignmentLoading: state.routeGroupAssignmentDialog.setLoading,
    openRouteGroupAssignmentDialog: state.routeGroupAssignmentDialog.openDialog,
    closeRouteGroupAssignmentDialogAfterSuccess: state.routeGroupAssignmentDialog.closeAfterSuccess,
    routeModelsDialogRoute: state.routeModelsDialogRoute,
    routeModelsDialogValue: state.routeModelsDialogValue,
    routeModelsDialogRequestURLs: state.routeModelsDialogRequestURLs,
    requestUpdateRoute: gatewayPageRequests.updateGatewayRouteType,
    routeTypeLabel: gatewayPageDisplayHelpers.routeTypeLabel,
    routePathLabel: gatewayPageDisplayHelpers.routePathLabel,
    openRouteModelsDialog: state.routeModelsDialog.openDialog,
    setRouteModelsDialogSaving: state.routeModelsDialog.setSaving,
    closeRouteModelsDialogAfterSuccess: state.routeModelsDialog.closeAfterSuccess,
    requestDiagnosis: gatewayPageRequests.diagnoseGatewayRoute,
    openDiagnosisDrawer: state.routeDiagnosisDrawer.openDrawer,
    setDiagnosisLoading: state.routeDiagnosisDrawer.setLoading,
    setDiagnosis: state.routeDiagnosisDrawer.setDiagnosis,
    requestLogs: gatewayPageRequests.getGatewayRouteLogs,
    openLogsDrawer: state.routeLogsDrawer.openDrawer,
    setLogsLoading: state.routeLogsDrawer.setLoading,
    setLogs: state.routeLogsDrawer.setLogs,
    clearLogs: state.routeLogsDrawer.clearLogs,
  })
}
