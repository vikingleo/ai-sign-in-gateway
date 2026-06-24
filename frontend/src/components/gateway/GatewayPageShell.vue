<script setup lang="ts">
import { computed } from 'vue'
import type { GatewayPageSection } from '../../gatewayPageSectionController'
import ShellLayout from '../ShellLayout.vue'
import GatewayMonitorPage from './GatewayMonitorPage.vue'
import GatewayOverlayPageHost from './GatewayOverlayPageHost.vue'
import GatewayRouteManagementPage from './GatewayRouteManagementPage.vue'

type GatewayMonitorPageProps = InstanceType<typeof GatewayMonitorPage>['$props']
type GatewayRouteManagementPageProps = InstanceType<typeof GatewayRouteManagementPage>['$props']
type GatewayOverlayPageHostProps = InstanceType<typeof GatewayOverlayPageHost>['$props']
type GatewayPageHandlers = Record<string, (...args: any[]) => unknown>

const props = defineProps<{
  section: GatewayPageSection
  monitorPageProps: GatewayMonitorPageProps
  monitorPageHandlers: GatewayPageHandlers
  routeManagementPageProps: GatewayRouteManagementPageProps
  routeManagementPageHandlers: GatewayPageHandlers
  overlayPageProps: GatewayOverlayPageHostProps
  overlayPageHandlers: GatewayPageHandlers
}>()

const pageStackClass = computed(() =>
  props.section === 'monitor'
    ? 'page-stack--dashboard gateway-monitor-page'
    : 'page-stack--fit gateway-route-page',
)
</script>

<template>
  <ShellLayout>
    <div
      class="page-stack"
      :class="pageStackClass"
    >
      <GatewayMonitorPage
        v-if="section === 'monitor'"
        v-bind="monitorPageProps"
        v-on="monitorPageHandlers"
      />

      <GatewayRouteManagementPage
        v-else
        v-bind="routeManagementPageProps"
        v-on="routeManagementPageHandlers"
      />

      <GatewayOverlayPageHost
        v-bind="overlayPageProps"
        v-on="overlayPageHandlers"
      />
    </div>
  </ShellLayout>
</template>
