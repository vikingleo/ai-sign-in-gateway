import {
  type AbortControllerLike,
  type GatewayInitialDataPageOptions,
  useGatewayInitialDataPageActions,
} from './gatewayInitialDataPageController.ts'
import {
  type GatewayUsagePageOptions,
  useGatewayUsagePageActions,
} from './gatewayUsagePageController.ts'

export type GatewayDataOperationsPageOptions<
  TController extends AbortControllerLike = AbortController,
> =
  Omit<GatewayInitialDataPageOptions<TController>, 'controllerSlot'> &
  Omit<GatewayUsagePageOptions<TController>, 'controllerSlot'> & {
    loadDataControllerSlot: GatewayInitialDataPageOptions<TController>['controllerSlot']
    gatewayUsageControllerSlot: GatewayUsagePageOptions<TController>['controllerSlot']
  }

export function useGatewayDataOperationsPageActions<
  TController extends AbortControllerLike = AbortController,
>({
  loadDataControllerSlot,
  gatewayUsageControllerSlot,
  ...options
}: GatewayDataOperationsPageOptions<TController>) {
  const initialDataActions = useGatewayInitialDataPageActions({
    ...options,
    controllerSlot: loadDataControllerSlot,
  })
  const usageActions = useGatewayUsagePageActions({
    ...options,
    controllerSlot: gatewayUsageControllerSlot,
  })

  return {
    ...usageActions,
    ...initialDataActions,
  }
}
