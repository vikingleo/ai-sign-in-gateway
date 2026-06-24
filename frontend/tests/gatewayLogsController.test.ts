import test from 'node:test'
import assert from 'node:assert/strict'

import { useGatewayLogsDrawer } from '../src/gatewayLogsController.ts'
import type { GatewayLog } from '../src/types.ts'

function log(overrides: Partial<GatewayLog>): GatewayLog {
  return {
    id: 1,
    request_id: 'req-1',
    created_at: '2026-05-25T00:00:00Z',
    route_id: 1,
    site_id: 10,
    site_name: '主站',
    route_label: '主站 / Key',
    key_name: 'Key',
    key_fingerprint: '',
    group_name: '',
    route_type: 'codex',
    method: 'POST',
    request_url: '/v1/responses',
    target_path: '/v1/responses',
    route_strategy: 'priority',
    model: '',
    requested_model: '',
    actual_model: '',
    user_agent: '',
    status_code: 200,
    success: true,
    failure_reason: '',
    latency_ms: 120,
    prompt_tokens: null,
    cached_input_tokens: null,
    completion_tokens: null,
    total_tokens: null,
    usage_cost: null,
    circuit_state_before: 'closed',
    is_stream: false,
    attempt_index: 1,
    ...overrides,
  }
}

test('opens gateway logs drawer without clearing search or logs', () => {
  const drawer = useGatewayLogsDrawer()
  const previousLogs = [log({ id: 7, request_url: '/old' })]
  drawer.logs.value = previousLogs
  drawer.search.value = '失败'

  drawer.openDrawer()

  assert.equal(drawer.open.value, true)
  assert.equal(drawer.search.value, '失败')
  assert.deepEqual(drawer.logs.value, previousLogs)
})

test('updates gateway logs drawer log result state', () => {
  const drawer = useGatewayLogsDrawer()
  const logs = [log({ id: 8, request_url: '/new' })]

  drawer.setLogs(logs)

  assert.deepEqual(drawer.logs.value, logs)
})
