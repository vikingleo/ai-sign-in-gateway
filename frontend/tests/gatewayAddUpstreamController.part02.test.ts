import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createSubmitGatewayAddUpstreamAction,
  submitGatewayAddUpstream,
  useGatewayAddUpstreamDialog,
} from '../src/gatewayAddUpstreamController.ts'
import { createDefaultAddUpstreamForm, type AddUpstreamForm } from '../src/gatewayAddUpstreamModel.ts'
import type { SitePayload } from '../src/types.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageOperationsControllerPath = new URL('../src/gatewayPageOperationsController.ts', import.meta.url)
const gatewayPageAdminActionsControllerPath = new URL(
  '../src/gatewayPageAdminActionsController.ts',
  import.meta.url,
)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)
const adminOperationsPageControllerPath = new URL('../src/gatewayAdminOperationsPageController.ts', import.meta.url)
const upstreamPageControllerPath = new URL('../src/gatewayUpstreamPageController.ts', import.meta.url)

test('createSubmitGatewayAddUpstreamAction reads latest form and groups when invoked', async () => {
  const firstForm: AddUpstreamForm = {
    ...createDefaultAddUpstreamForm(),
    name: '上游 A',
    base_url: 'https://a.example.com',
    api_key: 'key-a',
  }
  const secondForm: AddUpstreamForm = {
    ...createDefaultAddUpstreamForm(),
    name: '上游 B',
    base_url: 'https://b.example.com',
    api_key: 'key-b',
    api_format: 'openai',
  }
  let currentForm = firstForm
  let currentGroups = ['默认']
  const payloads: SitePayload[] = []
  const events: string[] = []
  const submitAddUpstream = createSubmitGatewayAddUpstreamAction({
    getForm: () => currentForm,
    getGroupNames: () => currentGroups,
    requestCreateSite: async (payload) => {
      payloads.push(payload)
      events.push(`create:${payload.name}:${payload.group_name}`)
    },
    setLoading: (loading) => {
      events.push(`loading:${loading}`)
    },
    closeAfterSuccess: () => {
      events.push('close')
    },
    syncGatewayRoutes: async () => {
      events.push('sync')
    },
    reloadGatewayData: async () => {
      events.push('reload')
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  await submitAddUpstream()
  currentForm = secondForm
  currentGroups = ['生产', '华东']
  await submitAddUpstream()

  assert.deepEqual(payloads.map((payload) => ({
    name: payload.name,
    base_url: payload.base_url,
    group_name: payload.group_name,
    api_format: payload.plugin_config.api_format,
  })), [
    {
      name: '上游 A',
      base_url: 'https://a.example.com',
      group_name: '默认',
      api_format: 'codex',
    },
    {
      name: '上游 B',
      base_url: 'https://b.example.com',
      group_name: '生产,华东',
      api_format: 'openai',
    },
  ])
  assert.deepEqual(events, [
    'loading:true',
    'create:上游 A:默认',
    'notice:已添加上游「上游 A」，可在路由池中调整 priority/weight。',
    'close',
    'sync',
    'reload',
    'loading:false',
    'loading:true',
    'create:上游 B:生产,华东',
    'notice:已添加上游「上游 B」，可在路由池中调整 priority/weight。',
    'close',
    'sync',
    'reload',
    'loading:false',
  ])
})

test('createSubmitGatewayAddUpstreamAction submits explicit dialog form and groups when provided', async () => {
  const fallbackForm: AddUpstreamForm = {
    ...createDefaultAddUpstreamForm(),
    name: 'fallback',
    base_url: 'https://fallback.example.com',
    api_key: 'key-fallback',
  }
  const dialogForm: AddUpstreamForm = {
    ...createDefaultAddUpstreamForm(),
    name: '上游 C',
    base_url: 'https://c.example.com',
    api_key: 'key-c',
  }
  const payloads: SitePayload[] = []

  const submitAddUpstream = createSubmitGatewayAddUpstreamAction({
    getForm: () => fallbackForm,
    getGroupNames: () => ['fallback'],
    requestCreateSite: async (payload) => {
      payloads.push(payload)
    },
    setLoading: () => {},
    closeAfterSuccess: () => {},
    syncGatewayRoutes: async () => {},
    reloadGatewayData: async () => {},
    showPlanNotice: () => {},
  })

  await submitAddUpstream(dialogForm, ['默认', '华东'])

  assert.equal(payloads[0].name, '上游 C')
  assert.equal(payloads[0].group_name, '默认,华东')
})

test('GatewayView delegates add upstream reset through the add upstream dialog controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const foundationControllerSource = await readFile(
    new URL('../src/gatewayPageFoundationController.ts', import.meta.url),
    'utf8',
  )
  const shellBindingsControllerSource = await readFile(shellBindingsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(pageControllerSource.includes("useGatewayPageFoundation"), "GatewayView delegates add upstream reset through the page foundation controller")
  assert.ok(foundationControllerSource.includes("useGatewayPageState"), "GatewayView delegates add upstream reset through the add upstream dialog controller should keep useGatewayPageState in gateway page foundation controller")
  assert.ok(shellBindingsControllerSource.includes("useGatewayPageBindings"), "GatewayView delegates add upstream reset through the add upstream dialog controller should keep useGatewayPageBindings in gateway page controller")
  assert.ok(shellBindingsControllerSource.includes("resetAddUpstreamForm"), "GatewayView delegates add upstream reset through the add upstream dialog controller should keep resetAddUpstreamForm in gateway page controller")
})

test('GatewayView delegates add upstream submission through the add upstream controller', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const operationsControllerSource = await readFile(gatewayPageOperationsControllerPath, 'utf8')
  const pageAdminActionsControllerSource = await readFile(gatewayPageAdminActionsControllerPath, 'utf8')

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayPageState\(\)/)
  assert.doesNotMatch(viewSource, /useGatewayRuntimeOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayRouteManagementOperationsPageActions\(\{/)
  assert.doesNotMatch(viewSource, /useGatewayAdminOperationsPageActions\(\{/)
  assert.ok(operationsControllerSource.includes("useGatewayPageAdminActions"), "GatewayView delegates add upstream submission through the page admin actions controller should keep useGatewayPageAdminActions in gateway page controller")
  assert.ok(pageAdminActionsControllerSource.includes("useGatewayAdminOperationsPageActions"), "GatewayView delegates add upstream submission through the add upstream controller should keep useGatewayAdminOperationsPageActions in gateway page admin actions controller")
  assert.ok(pageAdminActionsControllerSource.includes("addUpstreamForm"), "GatewayView delegates add upstream submission through the add upstream controller should keep addUpstreamForm in gateway page admin actions controller")
  assert.ok(pageAdminActionsControllerSource.includes("requestCreateSite: gatewayPageRequests.createSite"), "GatewayView delegates add upstream submission through the add upstream controller should keep requestCreateSite: gatewayPageRequests.createSite in gateway page admin actions controller")
})
