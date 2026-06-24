<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import GatewayPageShell from '../components/gateway/GatewayPageShell.vue'
import {
  type GatewayPageControllerProps,
  useGatewayPageController,
} from '../gatewayPageController'
import { useToast } from '../toast'
import '../styles/management-surfaces.css'
import '../styles/management-responsive-surfaces.css'

const props = withDefaults(
  defineProps<GatewayPageControllerProps>(),
  {
    section: 'routes',
  },
)

const toast = useToast()
const {
  monitorPageProps,
  monitorPageHandlers,
  routeManagementPageProps,
  routeManagementPageHandlers,
  overlayPageProps,
  overlayPageHandlers,
  mount,
  unmount,
} = useGatewayPageController({
  props,
  toast,
  getApiBase: () => String(import.meta.env.VITE_API_BASE || '/api'),
  nowMs: Date.now,
  nowIso: () => new Date().toISOString(),
  platformWindow: window,
  platformDocument: document,
  platformNavigator: navigator,
})

onMounted(async () => {
  await mount()
})

onBeforeUnmount(() => {
  unmount()
})
</script>

<template>
  <GatewayPageShell
    :section="props.section"
    :monitor-page-props="monitorPageProps"
    :monitor-page-handlers="monitorPageHandlers"
    :route-management-page-props="routeManagementPageProps"
    :route-management-page-handlers="routeManagementPageHandlers"
    :overlay-page-props="overlayPageProps"
    :overlay-page-handlers="overlayPageHandlers"
  />
</template>

<style src="../styles/gateway-view.css"></style>
