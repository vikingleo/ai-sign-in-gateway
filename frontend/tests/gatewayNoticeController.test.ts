import test from 'node:test'
import assert from 'node:assert/strict'
import { stat } from 'node:fs/promises'

const noticeControllerPath = new URL('../src/gatewayNoticeController.ts', import.meta.url)

test('createGatewayNoticeActions routes notices through injected toast methods', async () => {
  const controllerExists = await stat(noticeControllerPath).then(
    () => true,
    () => false,
  )

  assert.equal(controllerExists, true, 'gateway notice controller should exist')

  const { createGatewayNoticeActions } = await import('../src/gatewayNoticeController.ts')
  assert.equal(typeof createGatewayNoticeActions, 'function')

  const calls: Array<{ tone: string, message: string }> = []
  const { showNotice, showPlanNotice } = createGatewayNoticeActions({
    toast: {
      success: (message) => calls.push({ tone: 'success', message }),
      error: (message) => calls.push({ tone: 'error', message }),
      info: (message) => calls.push({ tone: 'info', message }),
    },
  })

  showNotice({ tone: 'success', message: '保存成功' })
  showPlanNotice({ notice: { tone: 'error', message: '保存失败' } })
  showNotice({ tone: 'info', message: '正在检查' })

  assert.deepEqual(calls, [
    { tone: 'success', message: '保存成功' },
    { tone: 'error', message: '保存失败' },
    { tone: 'info', message: '正在检查' },
  ])
})
