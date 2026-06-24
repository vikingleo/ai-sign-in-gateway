import { computed } from 'vue'
import type { ComponentPublicInstance, Ref } from 'vue'

import type { GatewayIssueState } from './gatewayViewConfig.ts'
import type { RouteBatchProgress } from './gatewayViewModel.ts'
import type { GatewayRoute } from './types.ts'

type ReadonlyRef<T> = {
  readonly value: T
}

type SelectOption<T extends string = string> = {
  label: string
  value: T
}

type GatewayRouteDetailItem = {
  label: string
  value: string
}

type GatewaySettingsFormLike = {
  gateway_api_key: string
}

export type GatewayRouteManagementPageBindingOptions<TRouteColumns> = {
  routeSearch: Ref<string>
  selectedGroups: Ref<string[]>
  selectedIssueStates: Ref<GatewayIssueState[]>
  includeDisabled: Ref<boolean>
  filteredRoutes: ReadonlyRef<GatewayRoute[]>
  routes: ReadonlyRef<GatewayRoute[]>
  gatewayRequestUrl: ReadonlyRef<string>
  codexGatewayTooltip: ReadonlyRef<string>
  maskedGatewayApiKey: ReadonlyRef<string>
  settingsForm: GatewaySettingsFormLike
  loading: ReadonlyRef<boolean>
  autoRefreshError: ReadonlyRef<string | null>
  probeLoading: ReadonlyRef<boolean>
  balanceProbeAllLoading: ReadonlyRef<boolean>
  probeAllProgress: ReadonlyRef<RouteBatchProgress | null>
  probeAllProgressPercent: ReadonlyRef<number>
  balanceProbeAllProgress: ReadonlyRef<RouteBatchProgress | null>
  balanceProbeAllProgressPercent: ReadonlyRef<number>
  routeColumns: TRouteColumns
  pageSize: number
  tableY: ReadonlyRef<number>
  rowKey: (route: GatewayRoute) => string | number
  bindTableContainer: (element: Element | ComponentPublicInstance | null) => void
  selectedRouteTypes: ReadonlyRef<Array<GatewayRoute['route_type']>>
  groupOptions: ReadonlyRef<SelectOption[]>
  activeRouteFilterCount: ReadonlyRef<number>
  isRouteTypeFilterActive: (routeType: GatewayRoute['route_type']) => boolean
  asRoute: (record: unknown) => GatewayRoute
  loadRouteLabel: (route: GatewayRoute) => string
  routeDetailItems: (route: GatewayRoute) => GatewayRouteDetailItem[]
  routeIssueLabels: (route: GatewayRoute) => string[]
  supportedModelsPreview: (models: string[]) => string
  normalizeRoutePath: (routePath: unknown) => NonNullable<GatewayRoute['route_path']>
  balanceClass: (balance: number | null | undefined) => string
  formatGroupNames: (value: string | string[] | null | undefined) => string
  routeConcurrencyLimitLabel: ReadonlyRef<string>
  primaryLatency: (route: GatewayRoute) => number | null
  latencyClass: (latencyMs: number | null | undefined) => string
  formatLatency: (latencyMs: number | null | undefined) => string
  routeLatencyDetails: (route: GatewayRoute) => string[]
  routeErrorDetails: (route: GatewayRoute) => string[]
  isRouteProbing: (routeId: number) => boolean
  isRouteBalanceProbing: (routeId: number) => boolean
  copyGatewayRequestUrl: () => void
  copyGatewayApiKey: () => void
  handleRefresh: () => void
  handleSync: () => void
  handleProbeAll: () => void
  handleUpdateAllBalances: () => void
  handleDisableAllRoutes: () => void
  openRouteGroupManager: () => void
  openAddUpstream: () => void
  openSettings: () => void
  clearRouteTypeFilter: () => void
  toggleRouteTypeFilter: (routeType: GatewayRoute['route_type']) => void
  clearRouteFilters: () => void
  loadData: () => void
  handleRouteTypeSelect: (route: GatewayRoute, value: unknown) => void
  handleRoutePathSelect: (route: GatewayRoute, value: unknown) => void
  handleToggle: (route: GatewayRoute) => void
  handleResetCircuit: (route: GatewayRoute) => void
  handleProbeRoute: (route: GatewayRoute) => void
  handleProbeRouteBalance: (route: GatewayRoute) => void
  openRouteModelsDialog: (route: GatewayRoute) => void
  openRouteGroupAssignment: (route: GatewayRoute) => void
  handleEnableOnlyRoute: (route: GatewayRoute) => void
  openPriorityDialog: (route: GatewayRoute) => void
  openRouteDiagnosis: (route: GatewayRoute) => void
  openRouteLogs: (route: GatewayRoute) => void
  handleDeleteRoute: (route: GatewayRoute) => void
}

export function useGatewayRouteManagementPageBindings<TRouteColumns>({
  routeSearch,
  selectedGroups,
  selectedIssueStates,
  includeDisabled,
  filteredRoutes,
  routes,
  gatewayRequestUrl,
  codexGatewayTooltip,
  maskedGatewayApiKey,
  settingsForm,
  loading,
  autoRefreshError,
  probeLoading,
  balanceProbeAllLoading,
  probeAllProgress,
  probeAllProgressPercent,
  balanceProbeAllProgress,
  balanceProbeAllProgressPercent,
  routeColumns,
  pageSize,
  tableY,
  rowKey,
  bindTableContainer,
  selectedRouteTypes,
  groupOptions,
  activeRouteFilterCount,
  isRouteTypeFilterActive,
  asRoute,
  loadRouteLabel,
  routeDetailItems,
  routeIssueLabels,
  supportedModelsPreview,
  normalizeRoutePath,
  balanceClass,
  formatGroupNames,
  routeConcurrencyLimitLabel,
  primaryLatency,
  latencyClass,
  formatLatency,
  routeLatencyDetails,
  routeErrorDetails,
  isRouteProbing,
  isRouteBalanceProbing,
  copyGatewayRequestUrl,
  copyGatewayApiKey,
  handleRefresh,
  handleSync,
  handleProbeAll,
  handleUpdateAllBalances,
  handleDisableAllRoutes,
  openRouteGroupManager,
  openAddUpstream,
  openSettings,
  clearRouteTypeFilter,
  toggleRouteTypeFilter,
  clearRouteFilters,
  loadData,
  handleRouteTypeSelect,
  handleRoutePathSelect,
  handleToggle,
  handleResetCircuit,
  handleProbeRoute,
  handleProbeRouteBalance,
  openRouteModelsDialog,
  openRouteGroupAssignment,
  handleEnableOnlyRoute,
  openPriorityDialog,
  openRouteDiagnosis,
  openRouteLogs,
  handleDeleteRoute,
}: GatewayRouteManagementPageBindingOptions<TRouteColumns>) {
  const routeManagementPageProps = computed(() => ({
    routeSearch: routeSearch.value,
    selectedGroups: selectedGroups.value,
    selectedIssueStates: selectedIssueStates.value,
    includeDisabled: includeDisabled.value,
    filteredRouteCount: filteredRoutes.value.length,
    routeCount: routes.value.length,
    requestUrl: gatewayRequestUrl.value,
    codexTooltip: codexGatewayTooltip.value,
    maskedApiKey: maskedGatewayApiKey.value,
    hasApiKey: Boolean(settingsForm.gateway_api_key),
    loading: loading.value,
    autoRefreshError: autoRefreshError.value,
    probeLoading: probeLoading.value,
    balanceProbeAllLoading: balanceProbeAllLoading.value,
    probeAllProgress: probeAllProgress.value,
    probeAllProgressPercent: probeAllProgressPercent.value,
    balanceProbeAllProgress: balanceProbeAllProgress.value,
    balanceProbeAllProgressPercent: balanceProbeAllProgressPercent.value,
    columns: routeColumns,
    routes: filteredRoutes.value,
    pageSize,
    tableY: tableY.value,
    rowKey,
    bindTableContainer,
    selectedRouteTypes: selectedRouteTypes.value,
    groupOptions: groupOptions.value,
    activeRouteFilterCount: activeRouteFilterCount.value,
    isRouteTypeFilterActive,
    asRoute,
    loadRouteLabel,
    routeDetailItems,
    routeIssueLabels,
    supportedModelsPreview,
    normalizeRoutePath,
    balanceClass,
    formatGroupNames,
    routeConcurrencyLimitLabel: routeConcurrencyLimitLabel.value,
    primaryLatency,
    latencyClass,
    formatLatency,
    routeLatencyDetails,
    routeErrorDetails,
    isRouteProbing,
    isRouteBalanceProbing,
  }))

  const routeManagementPageHandlers = {
    'update:routeSearch': (value: string) => {
      routeSearch.value = value
    },
    'update:selectedGroups': (value: string[]) => {
      selectedGroups.value = value
    },
    'update:selectedIssueStates': (value: GatewayIssueState[]) => {
      selectedIssueStates.value = value
    },
    'update:includeDisabled': (value: boolean) => {
      includeDisabled.value = value
    },
    'copy-request-url': copyGatewayRequestUrl,
    'copy-api-key': copyGatewayApiKey,
    refresh: handleRefresh,
    sync: handleSync,
    'probe-all': handleProbeAll,
    'update-all-balances': handleUpdateAllBalances,
    'disable-all': handleDisableAllRoutes,
    'manage-groups': openRouteGroupManager,
    'add-upstream': openAddUpstream,
    'open-settings': openSettings,
    'clear-route-types': clearRouteTypeFilter,
    'toggle-route-type': toggleRouteTypeFilter,
    'clear-filters': clearRouteFilters,
    'include-disabled-change': loadData,
    'type-change': handleRouteTypeSelect,
    'path-change': handleRoutePathSelect,
    toggle: handleToggle,
    'reset-circuit': handleResetCircuit,
    probe: handleProbeRoute,
    'probe-balance': handleProbeRouteBalance,
    'configure-models': openRouteModelsDialog,
    'assign-groups': openRouteGroupAssignment,
    'enable-only': handleEnableOnlyRoute,
    priority: openPriorityDialog,
    diagnose: openRouteDiagnosis,
    history: openRouteLogs,
    delete: handleDeleteRoute,
  }

  return {
    routeManagementPageProps,
    routeManagementPageHandlers,
  }
}
