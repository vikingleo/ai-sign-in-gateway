import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildGatewayPriorityDialogDraft,
  buildGatewayPriorityListLoadErrorPlan,
  buildGatewayPriorityMoveRequest,
  buildGatewayPriorityMoveErrorPlan,
  buildGatewayPriorityMoveSuccessPlan,
  buildGatewayPriorityPresetErrorPlan,
  buildGatewayPriorityPresetPayload,
  buildGatewayPriorityPresetSuccessPlan,
  gatewayPriorityPresetSuccessMessage,
  gatewayPriorityRouteRowClassName,
  selectGatewayPriorityRoute,
} from '../src/gatewayPriorityModel.ts'
import type { GatewayRoute } from '../src/types.ts'

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

test('builds priority dialog draft from the current route list', () => {
  const item = route({ id: 2 })
  const routes = [route({ id: 1 }), item]

  assert.deepEqual(buildGatewayPriorityDialogDraft(item, routes), {
    route: item,
    insertIndex: undefined,
    open: true,
    routes,
  })
})

test('builds priority move payloads and validates missing targets', () => {
  assert.deepEqual(buildGatewayPriorityMoveRequest(route({ id: 7 }), undefined), {
    error: '请输入目标优先级。',
    validationNotice: {
      tone: 'error',
      message: '请输入目标优先级。',
    },
    payload: null,
  })
  assert.deepEqual(buildGatewayPriorityMoveRequest(route({ id: 7 }), 3.8), {
    error: '',
    validationNotice: null,
    payload: {
      route_id: 7,
      mode: 'move',
      index: 3,
    },
  })
})

test('builds priority preset payloads and success messages', () => {
  assert.deepEqual(buildGatewayPriorityPresetPayload('package'), { mode: 'package' })
  assert.deepEqual(buildGatewayPriorityPresetPayload('balance'), { mode: 'balance' })
  assert.equal(gatewayPriorityPresetSuccessMessage('package'), '已按套餐优先重排。')
  assert.equal(gatewayPriorityPresetSuccessMessage('balance'), '已按余额优先重排。')
})

test('builds priority preset success plans', () => {
  assert.deepEqual(buildGatewayPriorityPresetSuccessPlan('package'), {
    notice: {
      tone: 'success',
      message: '已按套餐优先重排。',
    },
  })
  assert.deepEqual(buildGatewayPriorityPresetSuccessPlan('balance'), {
    notice: {
      tone: 'success',
      message: '已按余额优先重排。',
    },
  })
})

test('keeps the selected priority route after reordered data is applied', () => {
  const current = route({ id: 2, route_priority: 9 })
  const updated = route({ id: 2, route_priority: 1 })

  assert.equal(selectGatewayPriorityRoute([route({ id: 1 }), updated], current), updated)
  assert.equal(selectGatewayPriorityRoute([route({ id: 1 })], current), current)
  assert.equal(selectGatewayPriorityRoute([route({ id: 1 })], null), null)
})

test('builds priority route row classes from the selected route', () => {
  assert.equal(
    gatewayPriorityRouteRowClassName(route({ id: 2 }), route({ id: 2 })),
    'priority-route-row priority-route-row--current',
  )
  assert.equal(gatewayPriorityRouteRowClassName(route({ id: 3 }), route({ id: 2 })), 'priority-route-row')
  assert.equal(gatewayPriorityRouteRowClassName(route({ id: 3 }), null), 'priority-route-row')
})

test('builds priority list load error plans from thrown values', () => {
  assert.deepEqual(buildGatewayPriorityListLoadErrorPlan(new Error('列表加载超时')), {
    notice: {
      tone: 'error',
      message: '列表加载超时',
    },
  })

  assert.deepEqual(buildGatewayPriorityListLoadErrorPlan('bad gateway'), {
    notice: {
      tone: 'error',
      message: '优先级列表加载失败',
    },
  })
})

test('builds priority move error plans from thrown values', () => {
  assert.deepEqual(buildGatewayPriorityMoveErrorPlan(new Error('优先级接口超时')), {
    notice: {
      tone: 'error',
      message: '优先级接口超时',
    },
  })

  assert.deepEqual(buildGatewayPriorityMoveErrorPlan('bad gateway'), {
    notice: {
      tone: 'error',
      message: '优先级更新失败',
    },
  })
})

test('builds priority move success plans', () => {
  assert.deepEqual(buildGatewayPriorityMoveSuccessPlan(), {
    notice: {
      tone: 'success',
      message: '优先级已更新。',
    },
  })
})

test('builds priority preset error plans from thrown values', () => {
  assert.deepEqual(buildGatewayPriorityPresetErrorPlan(new Error('重排接口超时')), {
    notice: {
      tone: 'error',
      message: '重排接口超时',
    },
  })

  assert.deepEqual(buildGatewayPriorityPresetErrorPlan('bad gateway'), {
    notice: {
      tone: 'error',
      message: '优先级重排失败',
    },
  })
})
