import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageFoundationControllerPath = new URL('../src/gatewayPageFoundationController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const gatewayPageTableLayoutControllerPath = new URL(
  '../src/gatewayPageTableLayoutController.ts',
  import.meta.url,
)

test('GatewayView delegates table layout wiring to gateway page table layout controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const foundationControllerSource = await readFile(gatewayPageFoundationControllerPath, 'utf8')
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(pageControllerSource.includes("useGatewayPageFoundation"), "GatewayView delegates table layout wiring through the page foundation controller")
  assert.ok(foundationControllerSource.includes("useGatewayPageTableLayout"), "GatewayView delegates table layout wiring to gateway page table layout controller should keep useGatewayPageTableLayout in gateway page foundation controller")
  assert.ok(shellBindingsControllerSource.includes("tableLayout.pageTableY"), "GatewayView delegates table layout wiring to gateway page table layout controller should keep tableLayout.pageTableY in gateway page controller")
})

test('gateway page table layout controller owns helper binding and exposes page table values', async () => {
  const source = await readFile(gatewayPageTableLayoutControllerPath, 'utf8')

  assert.match(source, /import type \{ ComponentPublicInstance \} from 'vue'/)
  assert.match(source, /import \{ createBindPageTableContainerAction, useTableScrollHeights \} from '\.\/composables\/useTableScrollHeights'/)
  assert.match(source, /export function useGatewayPageTableLayout\(/)
  assert.match(source, /useTableScrollHeightsImpl = useTableScrollHeights/)
  assert.match(source, /createBindPageTableContainerActionImpl = createBindPageTableContainerAction/)
  assert.match(source, /const \{ pageTableY, pageTableContainer, drawerTableY \} = useTableScrollHeightsImpl\(\)/)
  assert.match(source, /const bindPageTableContainer = createBindPageTableContainerActionImpl\(\{[\s\S]*pageTableContainer\.value = element[\s\S]*\}\)/)
  assert.match(source, /return \{[\s\S]*pageTableY,[\s\S]*drawerTableY,[\s\S]*bindPageTableContainer,[\s\S]*\}/)
  assert.doesNotMatch(source, /instanceof HTMLElement/)
})
