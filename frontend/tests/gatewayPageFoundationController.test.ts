import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const pageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const foundationControllerPath = new URL('../src/gatewayPageFoundationController.ts', import.meta.url)

async function readOptionalSource(path: URL) {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return ''
    }
    throw error
  }
}

test('gateway page foundation controller owns base page wiring', async () => {
  const pageController = await readFile(pageControllerPath, 'utf8')
  const foundationController = await readOptionalSource(foundationControllerPath)

  assert.notEqual(foundationController, '')
  assert.match(foundationController, /export function useGatewayPageFoundation\(/)
  assert.match(foundationController, /useGatewayPageSectionState\(props\)/)
  assert.match(foundationController, /createGatewayNoticeActions\(\{ toast \}\)/)
  assert.match(foundationController, /requests \?\? createGatewayPageRequests\(\)/)
  assert.match(foundationController, /createGatewayPageDisplayHelpers\(\)/)
  assert.match(foundationController, /createGatewayPagePlatform\(\{/)
  assert.match(foundationController, /useGatewayPageState\(\)/)
  assert.match(foundationController, /useGatewayPageTableLayout\(\)/)
  assert.match(foundationController, /setMounted: \(nextMounted(?:: boolean)?\) => \{/)
  assert.match(foundationController, /isMounted: \(\) => mounted/)

  assert.match(pageController, /useGatewayPageFoundation\(\{/)
  assert.doesNotMatch(pageController, /useGatewayPageSectionState\(props\)/)
  assert.doesNotMatch(pageController, /createGatewayNoticeActions\(\{ toast \}\)/)
  assert.doesNotMatch(pageController, /createGatewayPageRequests\(\)/)
  assert.doesNotMatch(pageController, /createGatewayPagePlatform\(\{/)
  assert.doesNotMatch(pageController, /useGatewayPageState\(\)/)
  assert.doesNotMatch(pageController, /useGatewayPageTableLayout\(\)/)
})
