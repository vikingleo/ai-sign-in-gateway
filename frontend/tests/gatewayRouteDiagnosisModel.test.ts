import test from 'node:test'
import assert from 'node:assert/strict'

import { buildGatewayRouteDiagnosisErrorPlan } from '../src/gatewayRouteDiagnosisModel.ts'

test('builds route diagnosis error plans from thrown values', () => {
  assert.deepEqual(buildGatewayRouteDiagnosisErrorPlan(new Error('diagnosis timeout')), {
    notice: {
      tone: 'error',
      message: 'diagnosis timeout',
    },
  })

  assert.deepEqual(buildGatewayRouteDiagnosisErrorPlan('bad gateway'), {
    notice: {
      tone: 'error',
      message: '路由诊断失败',
    },
  })
})
