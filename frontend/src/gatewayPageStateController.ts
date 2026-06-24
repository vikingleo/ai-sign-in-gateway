import { ref } from 'vue'

import { useGatewayAddUpstreamDialog } from './gatewayAddUpstreamController.ts'
import { useGatewayErrorDetailDrawer, useGatewayLogsDrawer } from './gatewayLogsController.ts'
import { useGatewayPriorityDialog } from './gatewayPriorityController.ts'
import {
  useGatewayRouteBalanceManualDialog,
  useGatewayRouteBalanceProbeState,
} from './gatewayRouteBalanceProbeController.ts'
import { useGatewayRouteDiagnosisDrawer } from './gatewayRouteDiagnosisController.ts'
import { useGatewayRouteFilters } from './gatewayRouteFilterController.ts'
import {
  useGatewayRouteGroupAssignmentDialog,
  useGatewayRouteGroupManagerDialog,
} from './gatewayRouteGroupsController.ts'
import { useGatewayRouteLogsDrawer } from './gatewayRouteLogsController.ts'
import { useGatewayRouteModelsDialog } from './gatewayRouteConfigController.ts'
import { useGatewayRouteProbeState } from './gatewayRouteProbeController.ts'
import { useGatewayRuntimeController } from './gatewayRuntimeController.ts'
import { useGatewaySettingsDialog } from './gatewaySettingsController.ts'
import { useGatewayUsageRangeState } from './gatewayUsageRangeController.ts'
import type { GatewayActiveRequest, GatewayOverview, GatewayRoute, GatewayRouteGroup, GatewayUsage, SiteGroup } from './types.ts'

export function useGatewayPageState() {
  const gatewayRuntime = useGatewayRuntimeController()
  const routeProbeState = useGatewayRouteProbeState()
  const routeBalanceProbeState = useGatewayRouteBalanceProbeState()
  const settingsDialog = useGatewaySettingsDialog()
  const logsDrawer = useGatewayLogsDrawer()
  const errorDetailDrawer = useGatewayErrorDetailDrawer()
  const addUpstreamDialog = useGatewayAddUpstreamDialog()
  const priorityDialog = useGatewayPriorityDialog()
  const routeModelsDialog = useGatewayRouteModelsDialog()
  const routeGroupManagerDialog = useGatewayRouteGroupManagerDialog()
  const routeGroupAssignmentDialog = useGatewayRouteGroupAssignmentDialog()
  const routeLogsDrawer = useGatewayRouteLogsDrawer()
  const routeDiagnosisDrawer = useGatewayRouteDiagnosisDrawer()
  const usageRangeState = useGatewayUsageRangeState()
  const routeFilters = useGatewayRouteFilters()

  const routes = ref<GatewayRoute[]>([])
  const balanceProbeManualDialog = useGatewayRouteBalanceManualDialog({ routes })

  return {
    gatewayRuntime,
    loading: gatewayRuntime.loading,
    usageLoading: gatewayRuntime.usageLoading,
    routeProbeState,
    routeBalanceProbeState,
    probeLoading: routeProbeState.loading,
    settingsDialog,
    logsDrawer,
    errorDetailDrawer,
    addUpstreamDialog,
    priorityDialog,
    priorityRoutes: priorityDialog.routes,
    priorityRoute: priorityDialog.route,
    priorityInsertIndex: priorityDialog.insertIndex,
    addUpstreamForm: addUpstreamDialog.form,
    addUpstreamGroupNames: addUpstreamDialog.groupNames,
    resetAddUpstreamForm: addUpstreamDialog.reset,
    routeModelsDialog,
    routeModelsDialogRoute: routeModelsDialog.route,
    routeModelsDialogValue: routeModelsDialog.supportedModels,
    routeModelsDialogRequestURLs: routeModelsDialog.requestURLs,
    routeGroupManagerDialog,
    routeGroupAssignmentDialog,
    overview: ref<GatewayOverview | null>(null),
    routes,
    logs: logsDrawer.logs,
    activeRequests: ref<GatewayActiveRequest[]>([]),
    routeLogsDrawer,
    routeLogs: routeLogsDrawer.logs,
    gatewayUsage: ref<GatewayUsage | null>(null),
    usageRangeState,
    usageRange: usageRangeState.range,
    routeDiagnosisDrawer,
    routeGroups: ref<GatewayRouteGroup[]>([]),
    siteGroups: ref<SiteGroup[]>([]),
    includeDisabled: ref(false),
    autoRefreshTimers: {
      autoRefreshTimer: null as number | null,
      activeRequestRefreshTimer: null as number | null,
    },
    gatewayTablePageSize: 20,
    gatewayRouteAutoRefreshMs: 180_000,
    gatewayMonitorAutoRefreshMs: 30_000,
    gatewayActiveRequestRefreshMs: 1_000,
    routeFilters,
    selectedGroups: routeFilters.selectedGroups,
    selectedRouteTypes: routeFilters.selectedRouteTypes,
    selectedIssueStates: routeFilters.selectedIssueStates,
    probeAllProgress: routeProbeState.progress,
    balanceProbeAllLoading: routeBalanceProbeState.loading,
    balanceProbeAllProgress: routeBalanceProbeState.progress,
    balanceProbeManualDialog,
    balanceProbeManualRoute: balanceProbeManualDialog.route,
    balanceProbeManualURL: balanceProbeManualDialog.url,
    routeSearch: routeFilters.routeSearch,
    logSearch: logsDrawer.search,
    routeLogSearch: routeLogsDrawer.search,
  }
}

export type GatewayPageState = ReturnType<typeof useGatewayPageState>
