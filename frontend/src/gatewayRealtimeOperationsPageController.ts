import {
  type GatewayAutoRefreshPageOptions,
  useGatewayAutoRefreshPageActions,
} from './gatewayAutoRefreshPageController.ts'
import {
  type AbortControllerLike,
  type GatewayRealtimePageOptions,
  useGatewayRealtimePageActions,
} from './gatewayRealtimePageController.ts'

export type GatewayRealtimeOperationsPageOptions<
  TController extends AbortControllerLike = AbortController,
> =
  Omit<GatewayRealtimePageOptions<TController>, 'startAutoRefresh'> &
  Omit<GatewayAutoRefreshPageOptions, 'refreshRealtimeData' | 'refreshActiveRequests'> & {
    startAutoRefreshRuntime: GatewayRealtimePageOptions<TController>['startAutoRefresh']
  }

export function useGatewayRealtimeOperationsPageActions<
  TController extends AbortControllerLike = AbortController,
>({
  startAutoRefreshRuntime,
  ...options
}: GatewayRealtimeOperationsPageOptions<TController>) {
  const realtimeActions = useGatewayRealtimePageActions({
    ...options,
    startAutoRefresh: startAutoRefreshRuntime,
  })
  const autoRefreshActions = useGatewayAutoRefreshPageActions({
    ...options,
    refreshRealtimeData: realtimeActions.refreshRealtimeData,
    refreshActiveRequests: realtimeActions.refreshActiveRequests,
  })

  return {
    ...realtimeActions,
    ...autoRefreshActions,
  }
}
