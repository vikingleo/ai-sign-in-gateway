import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sourceFiles = [
  '../src/gatewayViewModel.ts',
  '../src/gatewayRouteBalanceProbeModel.ts',
  '../src/gatewayManualRouteBalanceProbeModel.ts',
  '../src/gatewayUsageRangeModel.ts',
] as const

async function readSource(filePath: typeof sourceFiles[number]) {
  return readFile(new URL(filePath, import.meta.url), 'utf8')
}

test('gateway page model files stay within the planned split boundary', async () => {
  for (const filePath of sourceFiles) {
    const source = await readSource(filePath)
    const lineCount = source.split('\n').length

    assert.ok(lineCount <= 300, `${filePath} has ${lineCount} lines`)
  }
})

test('gateway usage range state owns date request range helpers', async () => {
  const controllerSource = await readSource('../src/gatewayUsageRangeController.ts')
  const usageRangeSource = await readSource('../src/gatewayUsageRangeModel.ts')
  const viewModelSource = await readSource('../src/gatewayViewModel.ts')

  assert.match(controllerSource, /from '\.\/gatewayUsageRangeModel\.ts'/)
  assert.match(usageRangeSource, /export function buildGatewayUsageTodayRange/)
  assert.match(usageRangeSource, /export function datetimeLocalToISOString/)
  assert.doesNotMatch(viewModelSource, /export function buildGatewayUsageTodayRange/)
  assert.doesNotMatch(viewModelSource, /export function datetimeLocalToISOString/)
})

test('manual balance probing is isolated from batch balance probing', async () => {
  const controllerSource = await readSource('../src/gatewayRouteBalanceProbeController.ts')
  const flowSource = await readSource('../src/gatewayRouteBalanceProbeFlowController.ts')
  const batchModelSource = await readSource('../src/gatewayRouteBalanceProbeModel.ts')
  const manualModelSource = await readSource('../src/gatewayManualRouteBalanceProbeModel.ts')

  assert.match(controllerSource, /from '\.\/gatewayManualRouteBalanceProbeModel\.ts'/)
  assert.match(flowSource, /from '\.\/gatewayManualRouteBalanceProbeModel\.ts'/)
  assert.match(manualModelSource, /export function buildManualGatewayRouteBalanceProbeCompletionPlan/)
  assert.match(manualModelSource, /export function validateManualGatewayRouteBalanceProbeURL/)
  assert.doesNotMatch(batchModelSource, /buildManualGatewayRouteBalance/)
  assert.doesNotMatch(batchModelSource, /validateManualGatewayRouteBalanceProbeURL/)
})
