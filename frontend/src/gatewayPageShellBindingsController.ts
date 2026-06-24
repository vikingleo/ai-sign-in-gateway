import { useGatewayPageBindings } from './gatewayPageBindingsController.ts'
import type { useGatewayAccessPageState } from './gatewayAccessPageController.ts'
import type { useGatewayAdminOperationsPageActions } from './gatewayAdminOperationsPageController.ts'
import type { GatewayDisplayPageState } from './gatewayDisplayPageController.ts'
import type { GatewayPageDisplayHelpers } from './gatewayPageDisplayHelpersController.ts'
import type { useGatewayPageState } from './gatewayPageStateController.ts'
import type { useGatewayPageTableLayout } from './gatewayPageTableLayoutController.ts'
import type { useGatewayRefreshOperationsPageActions } from './gatewayRefreshOperationsPageController.ts'
import type { useGatewayRouteManagementOperationsPageActions } from './gatewayRouteManagementOperationsPageController.ts'
import type { useGatewayRuntimeOperationsPageActions } from './gatewayRuntimeOperationsPageController.ts'

type GatewayPageShellBindingsOptions = {
  gatewayPageDisplayHelpers: GatewayPageDisplayHelpers
  accessState: ReturnType<typeof useGatewayAccessPageState>
  state: ReturnType<typeof useGatewayPageState>
  displayState: GatewayDisplayPageState
  tableLayout: ReturnType<typeof useGatewayPageTableLayout>
  refreshActions: ReturnType<typeof useGatewayRefreshOperationsPageActions>
  runtimeActions: ReturnType<typeof useGatewayRuntimeOperationsPageActions>
  routeActions: ReturnType<typeof useGatewayRouteManagementOperationsPageActions>
  adminActions: ReturnType<typeof useGatewayAdminOperationsPageActions>
}

export function useGatewayPageShellBindings({
  gatewayPageDisplayHelpers,
  accessState,
  state,
  displayState,
  tableLayout,
  refreshActions,
  runtimeActions,
  routeActions,
  adminActions,
}: GatewayPageShellBindingsOptions) {
  return useGatewayPageBindings({
    ...gatewayPageDisplayHelpers,
    ...accessState,
    settingsForm: state.settingsDialog.form,
    loading: state.loading,
    autoRefreshError: state.gatewayRuntime.lastAutoRefreshError,
    metricCards: displayState.metricCards,
    usageRange: state.usageRange,
    usageSummaryCards: displayState.usageSummaryCards,
    usageColumns: displayState.usageColumns,
    gatewayUsage: state.gatewayUsage,
    usageLoading: state.usageLoading,
    formatTime: displayState.formatTime,
    routeActivityFeed: displayState.routeActivityFeed,
    activeRequests: state.activeRequests,
    activityHasErrorDetail: gatewayPageDisplayHelpers.gatewayActivityHasErrorDetail,
    buildLogErrorDetail: gatewayPageDisplayHelpers.buildLogErrorDetail,
    buildActiveErrorDetail: gatewayPageDisplayHelpers.buildActiveErrorDetail,
    routePoolStatusCards: displayState.routePoolStatusCards,
    routePoolPreviewRoutes: displayState.routePoolPreviewRoutes,
    routeConcurrencyLimitLabel: displayState.routeConcurrencyLimitLabel,
    gatewayStrategyCards: displayState.gatewayStrategyCards,
    handleRefresh: refreshActions.handleRefresh,
    openSettings: state.settingsDialog.openDialog,
    openLogs: state.logsDrawer.openDrawer,
    handleUsageToday: runtimeActions.handleUsageToday,
    handleUsageQuery: runtimeActions.handleUsageQuery,
    routeSearch: state.routeSearch,
    selectedGroups: state.selectedGroups,
    selectedIssueStates: state.selectedIssueStates,
    includeDisabled: state.includeDisabled,
    filteredRoutes: displayState.filteredRoutes,
    routes: state.routes,
    probeLoading: state.probeLoading,
    balanceProbeAllLoading: state.balanceProbeAllLoading,
    probeAllProgress: state.probeAllProgress,
    probeAllProgressPercent: state.routeProbeState.progressPercent,
    balanceProbeAllProgress: state.balanceProbeAllProgress,
    balanceProbeAllProgressPercent: state.routeBalanceProbeState.progressPercent,
    routeColumns: displayState.routeColumns,
    pageSize: state.gatewayTablePageSize,
    tableY: tableLayout.pageTableY,
    bindTableContainer: tableLayout.bindPageTableContainer,
    selectedRouteTypes: state.selectedRouteTypes,
    groupOptions: displayState.groupOptions,
    activeRouteFilterCount: state.routeFilters.activeCount,
    isRouteTypeFilterActive: state.routeFilters.isRouteTypeActive,
    isRouteProbing: state.routeProbeState.isRouteProbing,
    isRouteBalanceProbing: state.routeBalanceProbeState.isRouteBalanceProbing,
    handleSync: adminActions.handleSync,
    handleProbeAll: routeActions.handleProbeAll,
    handleUpdateAllBalances: routeActions.handleUpdateAllBalances,
    handleDisableAllRoutes: routeActions.handleDisableAllRoutes,
    openRouteGroupManager: routeActions.openRouteGroupManager,
    openAddUpstream: state.addUpstreamDialog.openDialog,
    clearRouteTypeFilter: state.routeFilters.clearRouteTypes,
    toggleRouteTypeFilter: state.routeFilters.toggleRouteType,
    clearRouteFilters: state.routeFilters.clearFilters,
    loadData: runtimeActions.loadData,
    handleRouteTypeSelect: routeActions.handleRouteTypeSelect,
    handleRoutePathSelect: routeActions.handleRoutePathSelect,
    handleToggle: routeActions.handleToggle,
    handleResetCircuit: routeActions.handleResetCircuit,
    handleProbeRoute: routeActions.handleProbeRoute,
    handleProbeRouteBalance: routeActions.handleProbeRouteBalance,
    openRouteModelsDialog: routeActions.openRouteModelsDialog,
    openRouteGroupAssignment: routeActions.openRouteGroupAssignment,
    handleEnableOnlyRoute: routeActions.handleEnableOnlyRoute,
    openPriorityDialog: routeActions.openPriorityDialog,
    openRouteDiagnosis: routeActions.openRouteDiagnosis,
    openRouteLogs: routeActions.openRouteLogs,
    handleDeleteRoute: routeActions.handleDeleteRoute,
    priorityDialog: state.priorityDialog,
    balanceManualDialog: state.balanceProbeManualDialog,
    settingsDialog: state.settingsDialog,
    addUpstreamDialog: state.addUpstreamDialog,
    siteGroupOptions: displayState.siteGroupOptions,
    routeGroupManagerDialog: state.routeGroupManagerDialog,
    routeGroupAssignmentDialog: state.routeGroupAssignmentDialog,
    routeGroups: state.routeGroups,
    routeModelsDialog: state.routeModelsDialog,
    logsDrawer: state.logsDrawer,
    errorDetailDrawer: state.errorDetailDrawer,
    routeLogsDrawer: state.routeLogsDrawer,
    routeDiagnosisDrawer: state.routeDiagnosisDrawer,
    priorityColumns: displayState.priorityDialogColumns,
    logColumns: displayState.logColumns,
    logs: displayState.filteredLogs,
    routeLogs: displayState.filteredRouteLogs,
    drawerTableY: tableLayout.drawerTableY,
    handlePriorityMove: routeActions.handlePriorityMove,
    handlePriorityPreset: routeActions.handlePriorityPreset,
    submitManualRouteBalanceProbe: routeActions.submitManualRouteBalanceProbe,
    refreshRouteGroups: routeActions.refreshRouteGroups,
    createRouteGroup: routeActions.createRouteGroup,
    updateRouteGroup: routeActions.updateRouteGroup,
    deleteRouteGroup: routeActions.deleteRouteGroup,
    saveRouteGroupAssignment: routeActions.saveRouteGroupAssignment,
    saveSettings: adminActions.saveSettings,
    submitAddUpstream: adminActions.submitAddUpstream,
    resetAddUpstreamForm: state.resetAddUpstreamForm,
    saveRouteModelsDialog: routeActions.saveRouteModelsDialog,
    openGatewayErrorDetail: state.errorDetailDrawer.openDetail,
    copyGatewayErrorDetail: accessState.copyGatewayErrorDetail,
  })
}
