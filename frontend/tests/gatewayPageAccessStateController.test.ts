import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const pageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const viewStateControllerPath = new URL('../src/gatewayPageViewStateController.ts', import.meta.url)
const accessStateControllerPath = new URL('../src/gatewayPageAccessStateController.ts', import.meta.url)

test('gateway page access state controller owns access page wiring', async () => {
  const pageController = await readFile(pageControllerPath, 'utf8')
  const viewStateController = await readFile(viewStateControllerPath, 'utf8')
  const accessStateController = await readFile(accessStateControllerPath, 'utf8')

  assert.match(pageController, /useGatewayPageViewState\(\{/)
  assert.doesNotMatch(pageController, /useGatewayPageAccessState\(\{/)
  assert.match(viewStateController, /useGatewayPageAccessState\(\{/)
  assert.doesNotMatch(pageController, /useGatewayAccessPageState\(\{/)
  assert.match(accessStateController, /useGatewayAccessPageState\(\{/)
  assert.match(accessStateController, /settingsForm: state\.settingsDialog\.form/)
  assert.match(accessStateController, /location: gatewayPagePlatform\.location/)
  assert.match(accessStateController, /writeText: gatewayPagePlatform\.writeText/)
  assert.match(accessStateController, /showPlanNotice/)
})
