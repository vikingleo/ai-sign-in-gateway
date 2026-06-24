import test from 'node:test'
import assert from 'node:assert/strict'

import { buildGatewayRouteLogsErrorPlan } from '../src/gatewayRouteLogsModel.ts'

test('builds route logs error plans from thrown values', () => {
  assert.deepEqual(buildGatewayRouteLogsErrorPlan(new Error('logs timeout')), {
    notice: {
      tone: 'error',
      message: 'logs timeout',
    },
    shouldClearLogs: true,
  })

  assert.deepEqual(buildGatewayRouteLogsErrorPlan('bad gateway'), {
    notice: {
      tone: 'error',
      message: '路由请求历史加载失败',
    },
    shouldClearLogs: true,
  })
})
