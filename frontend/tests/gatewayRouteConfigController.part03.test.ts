import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  changeGatewayRoutePath,
  changeGatewayRouteType,
  createChangeGatewayRoutePathAction,
  createChangeGatewayRouteTypeAction,
  createOpenGatewayRouteModelsDialogAction,
  createSaveGatewayRouteModelsAction,
  createSelectGatewayRoutePathAction,
  createSelectGatewayRouteTypeAction,
  saveGatewayRouteModels,
  selectGatewayRoutePath,
  selectGatewayRouteType,
  useGatewayRouteModelsDialog,
} from '../src/gatewayRouteConfigController.ts'
import type { GatewayRoute, GatewayRouteUpdatePayload } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageRouteActionsControllerPath = new URL('../src/gatewayPageRouteActionsController.ts', import.meta.url)
const routeConfigPageControllerPath = new URL('../src/gatewayRouteConfigPageController.ts', import.meta.url)
const routeOperationsPageControllerPath = new URL('../src/gatewayRouteOperationsPageController.ts', import.meta.url)

function route(overrides: Partial<GatewayRoute>): GatewayRoute {
  return {
    id: 1,
    site_id: 10,
    site_name: '主站',
    site_name_snapshot: '',
    site_base_url_snapshot: '',
    base_url: 'https://api.example',
    request_base_url: '',
    request_base_urls: [],
    manual_request_base_urls: [],
    group_name: '',
    supported_models: [],
    key_name: '',
    key_fingerprint: '',
    key_source: 'credential',
    route_type: 'codex',
    route_path: '',
    route_priority: 1,
    weight: 1,
    is_enabled: true,
    circuit_state: 'closed',
    consecutive_failures: 0,
    active_concurrency: 0,
    request_count: 0,
    success_count: 0,
    failure_count: 0,
    avg_latency_ms: null,
    ewma_latency_ms: null,
    last_latency_ms: null,
    success_rate: 0,
    last_status_code: null,
    last_error: '',
    last_used_at: null,
    last_success_at: null,
    last_failure_at: null,
    circuit_open_until: null,
    ...overrides,
  }
}

test('saveGatewayRouteModels ignores empty selected routes without side effects', async () => {
  let sideEffectCount = 0

  await saveGatewayRouteModels({
    route: null,
    supportedModels: [],
    requestURLs: '',
    getRoutes: () => [],
    setRoutes: () => {
      sideEffectCount += 1
    },
    getPriorityRoutes: () => [],
    setPriorityRoutes: () => {
      sideEffectCount += 1
    },
    requestUpdateRoute: async () => {
      sideEffectCount += 1
      return route({ id: 18 })
    },
    setSaving: () => {
      sideEffectCount += 1
    },
    closeAfterSuccess: () => {
      sideEffectCount += 1
    },
    showPlanNotice: () => {
      sideEffectCount += 1
    },
  })

  assert.equal(sideEffectCount, 0)
})

test('route model dialog action factories assemble runtime dependencies without changing behavior', async () => {
  const events: string[] = []
  const dialog = useGatewayRouteModelsDialog()
  const selectedRoute = route({
    id: 19,
    supported_models: ['old'],
    manual_request_base_urls: ['https://old.example'],
  })
  let routes = [selectedRoute]
  let priorityRoutes = [selectedRoute]
  const openDialog = createOpenGatewayRouteModelsDialogAction({
    openDialog: dialog.openDialog,
  })
  const saveDialog = createSaveGatewayRouteModelsAction({
    getRoute: () => dialog.route.value,
    getSupportedModels: () => dialog.supportedModels.value,
    getRequestURLs: () => dialog.requestURLs.value,
    getRoutes: () => routes,
    setRoutes: (nextRoutes) => {
      routes = nextRoutes
      events.push(`routes:${nextRoutes[0].supported_models.join(',')}`)
    },
    getPriorityRoutes: () => priorityRoutes,
    setPriorityRoutes: (nextRoutes) => {
      priorityRoutes = nextRoutes
      events.push(`priority:${nextRoutes[0].manual_request_base_urls?.join(',')}`)
    },
    requestUpdateRoute: async (routeId, payload) => {
      events.push(`request:${routeId}:${payload.supported_models?.join(',')}:${payload.manual_request_base_urls?.join('|')}`)
      return route({
        id: routeId,
        supported_models: payload.supported_models ?? [],
        manual_request_base_urls: payload.manual_request_base_urls ?? [],
      })
    },
    setSaving: (saving) => {
      dialog.setSaving(saving)
      events.push(`saving:${saving}`)
    },
    closeAfterSuccess: () => {
      dialog.closeAfterSuccess()
      events.push('close')
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  openDialog(route({
    ...selectedRoute,
    supported_models: ['gpt-4o', 'gpt-4o', 'claude-3'],
    manual_request_base_urls: ['https://a.example', 'https://a.example', 'https://b.example'],
  }))

  assert.equal(dialog.open.value, true)
  assert.deepEqual(dialog.supportedModels.value, ['gpt-4o', 'claude-3'])
  assert.equal(dialog.requestURLs.value, 'https://a.example\nhttps://b.example')

  await saveDialog()

  assert.deepEqual(events, [
    'saving:true',
    'request:19:gpt-4o,claude-3:https://a.example|https://b.example',
    'routes:gpt-4o,claude-3',
    'priority:https://a.example,https://b.example',
    'close',
    'notice:路由配置已更新。',
    'saving:false',
  ])
  assert.equal(dialog.open.value, false)
  assert.equal(dialog.route.value, null)
  assert.equal(dialog.saving.value, false)
})

test('GatewayView delegates route type and path changes through the route config controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const routeActionsControllerSource = await readFile(gatewayPageRouteActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageRouteActions"), "GatewayView delegates route type and path changes through the route config controller should keep useGatewayPageRouteActions in gateway page controller")
  assert.ok(routeActionsControllerSource.includes("requestUpdateRoute: gatewayPageRequests.updateGatewayRouteType"), "GatewayView delegates route type and path changes through the route config controller should keep requestUpdateRoute: gatewayPageRequests.updateGatewayRouteType in route actions controller")
})

test('GatewayView delegates route model dialog actions through the route config controller', async () => {
  const source = await readFile(gatewayPageControllerPath, 'utf8')
  const pageOperationsController = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const controller = await readFile(routeConfigPageControllerPath, 'utf8')
  const operationsController = await readFile(routeOperationsPageControllerPath, 'utf8')
  const openHandler = controller.slice(
    controller.indexOf('const openRouteModelsDialogAction = createOpenGatewayRouteModelsDialogAction({'),
    controller.indexOf('const saveRouteModelsDialog = createSaveGatewayRouteModelsAction({'),
  )
  const saveHandler = controller.slice(
    controller.indexOf('const saveRouteModelsDialog = createSaveGatewayRouteModelsAction({'),
    controller.indexOf('return {'),
  )

  assert.doesNotMatch(source, /from '(?:\.\.\/|\.\/)gatewayRouteConfigPageController(?:\.ts)?'/)
  assert.match(pageOperationsController, /import \{ useGatewayPageRouteActions \} from '(?:\.\.\/|\.\/)gatewayPageRouteActionsController(?:\.ts)?'/)
  assert.match(operationsController, /const routeConfigActions = useGatewayRouteConfigPageActions\(options\)/)
  assert.match(controller, /createOpenGatewayRouteModelsDialogAction/)
  assert.match(controller, /createSaveGatewayRouteModelsAction/)
  assert.match(source, /useGatewayPageFoundation\(\{/)
  assert.doesNotMatch(source, /useGatewayRouteModelsDialog\(\)/)
  assert.match(openHandler, /createOpenGatewayRouteModelsDialogAction\(\{/)
  assert.match(openHandler, /openDialog: openRouteModelsDialog/)
  assert.match(saveHandler, /createSaveGatewayRouteModelsAction\(\{/)
  assert.match(saveHandler, /getRoute: \(\) => routeModelsDialogRoute\.value/)
  assert.match(saveHandler, /getSupportedModels: \(\) => routeModelsDialogValue\.value/)
  assert.match(saveHandler, /getRequestURLs: \(\) => routeModelsDialogRequestURLs\.value/)
  assert.match(saveHandler, /requestUpdateRoute/)
  assert.match(saveHandler, /setSaving: setRouteModelsDialogSaving/)
  assert.match(saveHandler, /closeAfterSuccess: closeRouteModelsDialogAfterSuccess/)
  assert.doesNotMatch(source, /createOpenGatewayRouteModelsDialogAction/)
  assert.doesNotMatch(source, /createSaveGatewayRouteModelsAction/)
  assert.doesNotMatch(source, /function openRouteModelsDialog\(route: GatewayRoute\)/)
  assert.doesNotMatch(source, /async function saveRouteModelsDialog\(\)/)
  assert.doesNotMatch(saveHandler, /saveGatewayRouteModels\(\{/)
  assert.doesNotMatch(saveHandler, /buildGatewayRouteModelsPayload/)
  assert.doesNotMatch(saveHandler, /buildGatewayRouteModelsSaveSuccessPlan/)
  assert.doesNotMatch(saveHandler, /buildGatewayRouteModelsSaveErrorPlan/)
  assert.doesNotMatch(saveHandler, /replaceGatewayRoute/)
  assert.doesNotMatch(saveHandler, /routeModelsDialog\.setSaving\(true\)/)
})
