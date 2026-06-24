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

test('opens add upstream dialog with default form state', () => {
  const dialog = useGatewayAddUpstreamDialog()

  dialog.openDialog()

  assert.equal(dialog.open.value, true)
  assert.equal(dialog.loading.value, false)
  assert.deepEqual(dialog.form, {
    name: '',
    base_url: '',
    api_key: '',
    api_format: 'codex',
    group_name: '',
    preferred_model: '',
    supported_models: [],
  })
  assert.deepEqual(dialog.groupNames.value, [])
})

test('resets add upstream dialog form and closes after success', () => {
  const dialog = useGatewayAddUpstreamDialog()
  dialog.openDialog()
  dialog.form.name = '上游 A'
  dialog.form.base_url = 'https://api.example.com'
  dialog.form.api_key = 'key-test'
  dialog.form.supported_models = ['gpt-4o']
  dialog.groupNames.value = ['生产']

  dialog.setLoading(true)
  dialog.reset()
  dialog.closeAfterSuccess()
  dialog.setLoading(false)

  assert.equal(dialog.open.value, false)
  assert.equal(dialog.loading.value, false)
  assert.deepEqual(dialog.form, {
    name: '',
    base_url: '',
    api_key: '',
    api_format: 'codex',
    group_name: '',
    preferred_model: '',
    supported_models: [],
  })
  assert.deepEqual(dialog.groupNames.value, [])
})

test('submitGatewayAddUpstream creates the upstream, closes the dialog, syncs, and reloads data', async () => {
  const events: string[] = []
  const payloads: SitePayload[] = []
  const form: AddUpstreamForm = {
    ...createDefaultAddUpstreamForm(),
    name: ' 上游 A ',
    base_url: ' https://api.example.com ',
    api_key: ' key-test ',
    api_format: 'openai',
    group_name: '默认',
    preferred_model: ' gpt-4o ',
    supported_models: ['gpt-4o', 'gpt-4o', 'claude-3'],
  }

  await submitGatewayAddUpstream({
    form,
    groupNames: ['生产', '华东'],
    requestCreateSite: async (payload) => {
      payloads.push(payload)
      events.push(`create:${payload.name}`)
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

  assert.deepEqual(payloads, [{
    name: '上游 A',
    base_url: 'https://api.example.com',
    plugin_key: 'api-supplier',
    group_name: '生产,华东',
    supported_models: ['gpt-4o', 'claude-3'],
    is_enabled: true,
    notes: '',
    credentials: {
      account: '',
      api_key: 'key-test',
    },
    plugin_config: {
      api_format: 'openai',
      endpoint_url: '',
      preferred_model: 'gpt-4o',
    },
  }])
  assert.deepEqual(events, [
    'loading:true',
    'create:上游 A',
    'notice:已添加上游「上游 A」，可在路由池中调整 priority/weight。',
    'close',
    'sync',
    'reload',
    'loading:false',
  ])
})

test('submitGatewayAddUpstream reports validation errors without touching loading or requests', async () => {
  const events: string[] = []

  await submitGatewayAddUpstream({
    form: createDefaultAddUpstreamForm(),
    groupNames: [],
    requestCreateSite: async () => {
      events.push('create')
    },
    setLoading: () => {
      events.push('loading')
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

  assert.deepEqual(events, ['notice:名称 / Base URL / API Key 都需要填写。'])
})

test('submitGatewayAddUpstream reports create errors without closing, syncing, or reloading', async () => {
  const events: string[] = []

  await submitGatewayAddUpstream({
    form: {
      ...createDefaultAddUpstreamForm(),
      name: '上游 B',
      base_url: 'https://b.example.com',
      api_key: 'key-b',
    },
    groupNames: [],
    requestCreateSite: async () => {
      events.push('create')
      throw new Error('创建失败')
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

  assert.deepEqual(events, [
    'loading:true',
    'create',
    'notice:创建失败',
    'loading:false',
  ])
})
