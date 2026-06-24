import { computed } from 'vue'

export type GatewayPageSection = 'routes' | 'monitor'

export function useGatewayPageSectionState(props: {
  section?: GatewayPageSection
}) {
  const isRouteManagement = computed(() => props.section === 'routes')
  const isGatewayMonitor = computed(() => props.section === 'monitor')

  return {
    isRouteManagement,
    isGatewayMonitor,
  }
}
