import {
  type GatewayMonitorPageBindingOptions,
  useGatewayMonitorPageBindings,
} from './gatewayMonitorPageController.ts'
import {
  type GatewayOverlayPageBindingOptions,
  useGatewayOverlayPageBindings,
} from './gatewayOverlayPageController.ts'
import {
  type GatewayRouteManagementPageBindingOptions,
  useGatewayRouteManagementPageBindings,
} from './gatewayRouteManagementPageController.ts'

type GatewayPageBindingsOptions<
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
  TRouteColumns,
> =
  GatewayMonitorPageBindingOptions<
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
  > &
  GatewayRouteManagementPageBindingOptions<TRouteColumns> &
  GatewayOverlayPageBindingOptions

export function useGatewayPageBindings<
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
  TRouteColumns,
>(
  options: GatewayPageBindingsOptions<
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
    TRouteColumns
  >,
) {
  const monitorPageBindings = useGatewayMonitorPageBindings(options)
  const routeManagementPageBindings = useGatewayRouteManagementPageBindings(options)
  const overlayPageBindings = useGatewayOverlayPageBindings(options)

  return {
    ...monitorPageBindings,
    ...routeManagementPageBindings,
    ...overlayPageBindings,
  }
}
