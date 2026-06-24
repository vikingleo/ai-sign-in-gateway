import test from 'node:test'
import assert from 'node:assert/strict'

import { disableAllGatewayRoutesWithConfirmation } from '../src/gatewayRouteDisableController.ts'

test('disableAllGatewayRoutesWithConfirmation stops when confirmation is rejected', async () => {
  let requestCount = 0
  let reloadCount = 0
  const notices: string[] = []

  await disableAllGatewayRoutesWithConfirmation({
    confirmDisableAll: () => false,
    requestDisableAll: async () => {
      requestCount += 1
      return { disabled_count: 1 }
    },
    reloadGatewayData: async () => {
      reloadCount += 1
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.equal(requestCount, 0)
  assert.equal(reloadCount, 0)
  assert.deepEqual(notices, [])
})

test('disableAllGatewayRoutesWithConfirmation disables routes, reports success, and reloads data', async () => {
  const events: string[] = []

  await disableAllGatewayRoutesWithConfirmation({
    confirmDisableAll: () => {
      events.push('confirm')
      return true
    },
    requestDisableAll: async () => {
      events.push('request')
      return { disabled_count: 4 }
    },
    reloadGatewayData: async () => {
      events.push('reload')
    },
    showPlanNotice: (plan) => {
      events.push(`notice:${plan.notice.message}`)
    },
  })

  assert.deepEqual(events, [
    'confirm',
    'request',
    'notice:已禁用 4 条路由。',
    'reload',
  ])
})

test('disableAllGatewayRoutesWithConfirmation reports request errors without reloading data', async () => {
  const notices: string[] = []
  let reloadCount = 0

  await disableAllGatewayRoutesWithConfirmation({
    confirmDisableAll: () => true,
    requestDisableAll: async () => {
      throw new Error('disable timeout')
    },
    reloadGatewayData: async () => {
      reloadCount += 1
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.deepEqual(notices, ['disable timeout'])
  assert.equal(reloadCount, 0)
})

test('disableAllGatewayRoutesWithConfirmation preserves the existing success then reload error notice order', async () => {
  const notices: string[] = []

  await disableAllGatewayRoutesWithConfirmation({
    confirmDisableAll: () => true,
    requestDisableAll: async () => ({ disabled_count: 2 }),
    reloadGatewayData: async () => {
      throw new Error('reload failed')
    },
    showPlanNotice: (plan) => {
      notices.push(plan.notice.message)
    },
  })

  assert.deepEqual(notices, ['已禁用 2 条路由。', 'reload failed'])
})
