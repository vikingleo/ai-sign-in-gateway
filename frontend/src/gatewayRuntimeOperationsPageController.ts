import type { AbortControllerLike } from './gatewayInitialDataPageController.ts'
import {
  type GatewayDataOperationsPageOptions,
  useGatewayDataOperationsPageActions,
} from './gatewayDataOperationsPageController.ts'
import {
  type GatewayRealtimeOperationsPageOptions,
  useGatewayRealtimeOperationsPageActions,
} from './gatewayRealtimeOperationsPageController.ts'

export type GatewayRuntimeOperationsPageOptions<
  TController extends AbortControllerLike = AbortController,
> =
  GatewayDataOperationsPageOptions<TController> &
  GatewayRealtimeOperationsPageOptions<TController>

export function useGatewayRuntimeOperationsPageActions<
  TController extends AbortControllerLike = AbortController,
>(
  options: GatewayRuntimeOperationsPageOptions<TController>,
) {
  const dataActions = useGatewayDataOperationsPageActions(options)
  const realtimeActions = useGatewayRealtimeOperationsPageActions(options)

  return {
    ...dataActions,
    ...realtimeActions,
  }
}
