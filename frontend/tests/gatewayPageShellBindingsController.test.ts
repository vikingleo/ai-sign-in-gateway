import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const shellBindingsControllerPath = new URL('../src/gatewayPageShellBindingsController.ts', import.meta.url)

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

test('gateway page shell bindings controller owns shell binding option wiring', async () => {
  const pageController = await readFile(gatewayPageControllerPath, 'utf8')
  const shellBindingsController = await readOptionalSource(shellBindingsControllerPath)

  assert.notEqual(shellBindingsController, '')
  assert.match(shellBindingsController, /export function useGatewayPageShellBindings\(/)
  assert.match(shellBindingsController, /useGatewayPageBindings\(\{/)
  assert.match(pageController, /useGatewayPageShellBindings\(\{/)
  assert.doesNotMatch(pageController, /from '(?:\.\.\/|\.\/)gatewayPageBindingsController(?:\.ts)?'/)
  assert.doesNotMatch(pageController, /useGatewayPageBindings\(\{/)
})
