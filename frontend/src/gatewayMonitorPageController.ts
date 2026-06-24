import { computed } from 'vue'
import type { GatewayErrorDetail } from './gatewayActivityDisplayModel.ts'
import type { GatewayActiveRequest, GatewayLog } from './types.ts'

type ReadonlyRef<T> = {
  readonly value: T
}

type GatewayMonitorSettingsFormLike = {
  gateway_api_key: string
}

type GatewayMonitorUsageRangeLike = {
  start: string
  end: string
}

export type GatewayMonitorPageBindingOptions<
  TMetricCards,
  TUsageSummaryCards,
  TUsageColumns,
  TGatewayUsage,
  TUsageRoute,
  TRouteActivityFeed,
  TActiveRequest,
  TRoutePoolStatusCards,
  TRoutePoolPreviewRoutes,
  TGatewayStrategyCards,
> = {
  gatewayRequestUrl: ReadonlyRef<string>
  codexGatewayTooltip: ReadonlyRef<string>
  maskedGatewayApiKey: ReadonlyRef<string>
  settingsForm: GatewayMonitorSettingsFormLike
  loading: ReadonlyRef<boolean>
  autoRefreshError: ReadonlyRef<string | null>
  metricCards: ReadonlyRef<TMetricCards>
  usageRange: GatewayMonitorUsageRangeLike
  usageSummaryCards: ReadonlyRef<TUsageSummaryCards>
  usageColumns: TUsageColumns
  gatewayUsage: ReadonlyRef<TGatewayUsage>
  usageLoading: ReadonlyRef<boolean>
  usageRowKey: (record: TUsageRoute) => string | number
  usageRouteLabel: (record: TUsageRoute) => string
  usageRouteMeta: (record: TUsageRoute) => string
  formatNumber: (value: number | null | undefined) => string
  formatUSD: (value: number | null | undefined) => string
  formatTime: (value: string | null) => string
  routeActivityFeed: ReadonlyRef<TRouteActivityFeed>
  activeRequests: ReadonlyRef<TActiveRequest[]>
  activityHasErrorDetail: (item: TRouteActivityFeed extends Array<infer TItem> ? TItem : never) => boolean
  buildLogErrorDetail: (log: GatewayLog) => GatewayErrorDetail
  buildActiveErrorDetail: (item: GatewayActiveRequest) => GatewayErrorDetail
  routePoolStatusCards: ReadonlyRef<TRoutePoolStatusCards>
  routePoolPreviewRoutes: ReadonlyRef<TRoutePoolPreviewRoutes>
  routeConcurrencyLimitLabel: ReadonlyRef<string>
  gatewayStrategyCards: ReadonlyRef<TGatewayStrategyCards>
  copyGatewayRequestUrl: () => void
  copyGatewayApiKey: () => void
  handleRefresh: () => void
  openSettings: () => void
  openLogs: () => void
  handleUsageToday: () => void
  handleUsageQuery: () => void
  copyGatewayActivityUrl: (value: string) => void
  openGatewayErrorDetail: (detail: GatewayErrorDetail) => void
}

export function useGatewayMonitorPageBindings<
  TMetricCards,
  TUsageSummaryCards,
  TUsageColumns,
  TGatewayUsage,
  TUsageRoute,
  TRouteActivityFeed,
  TActiveRequest,
  TRoutePoolStatusCards,
  TRoutePoolPreviewRoutes,
  TGatewayStrategyCards,
>({
  gatewayRequestUrl,
  codexGatewayTooltip,
  maskedGatewayApiKey,
  settingsForm,
  loading,
  autoRefreshError,
  metricCards,
  usageRange,
  usageSummaryCards,
  usageColumns,
  gatewayUsage,
  usageLoading,
  usageRowKey,
  usageRouteLabel,
  usageRouteMeta,
  formatNumber,
  formatUSD,
  formatTime,
  routeActivityFeed,
  activeRequests,
  activityHasErrorDetail,
  buildLogErrorDetail,
  buildActiveErrorDetail,
  routePoolStatusCards,
  routePoolPreviewRoutes,
  routeConcurrencyLimitLabel,
  gatewayStrategyCards,
  copyGatewayRequestUrl,
  copyGatewayApiKey,
  handleRefresh,
  openSettings,
  openLogs,
  handleUsageToday,
  handleUsageQuery,
  copyGatewayActivityUrl,
  openGatewayErrorDetail,
}: GatewayMonitorPageBindingOptions<
  TMetricCards,
  TUsageSummaryCards,
  TUsageColumns,
  TGatewayUsage,
  TUsageRoute,
  TRouteActivityFeed,
  TActiveRequest,
  TRoutePoolStatusCards,
  TRoutePoolPreviewRoutes,
  TGatewayStrategyCards
>) {
  const monitorPageProps = computed(() => ({
    requestUrl: gatewayRequestUrl.value,
    codexTooltip: codexGatewayTooltip.value,
    maskedApiKey: maskedGatewayApiKey.value,
    hasApiKey: Boolean(settingsForm.gateway_api_key),
    loading: loading.value,
    autoRefreshError: autoRefreshError.value,
    metricCards: metricCards.value,
    usageRange,
    usageSummaryCards: usageSummaryCards.value,
    usageColumns,
    usage: gatewayUsage.value,
    usageLoading: usageLoading.value,
    usageRowKey,
    usageRouteLabel,
    usageRouteMeta,
    formatNumber,
    formatUSD,
    formatTime,
    routeActivityFeed: routeActivityFeed.value,
    activeRequestCount: activeRequests.value.length,
    activityHasErrorDetail,
    buildLogErrorDetail,
    buildActiveErrorDetail,
    routePoolStatusCards: routePoolStatusCards.value,
    routePoolPreviewRoutes: routePoolPreviewRoutes.value,
    routeConcurrencyLimitLabel: routeConcurrencyLimitLabel.value,
    gatewayStrategyCards: gatewayStrategyCards.value,
  }))

  const monitorPageHandlers = {
    'copy-request-url': copyGatewayRequestUrl,
    'copy-api-key': copyGatewayApiKey,
    refresh: handleRefresh,
    'open-settings': openSettings,
    'open-logs': openLogs,
    'update:start': (value: string) => {
      usageRange.start = value
    },
    'update:end': (value: string) => {
      usageRange.end = value
    },
    today: handleUsageToday,
    query: handleUsageQuery,
    'copy-activity-url': copyGatewayActivityUrl,
    'open-error-detail': openGatewayErrorDetail,
  }

  return {
    monitorPageProps,
    monitorPageHandlers,
  }
}
