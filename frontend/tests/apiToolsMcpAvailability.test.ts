import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const apiToolsPath = new URL('../src/apiTools.ts', import.meta.url)

test('api tools do not call the MCP placeholder endpoint from the frontend API client', async () => {
  const source = await readFile(apiToolsPath, 'utf8')

  assert.match(source, /export const mcpTestUnavailableMessage = 'MCP 测试功能尚未接入 Go 后端。'/)
  assert.match(source, /return Promise\.reject\(new Error\(mcpTestUnavailableMessage\)\)/)
  assert.doesNotMatch(source, /request\(['"]\/tools\/mcp-test/)
})
