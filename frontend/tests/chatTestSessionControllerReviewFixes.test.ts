import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const chatTestSessionControllerPath = new URL('../src/chatTestSessionController.ts', import.meta.url)

test('deleting active chat session resets state without new-session success toast', async () => {
  const source = await readFile(chatTestSessionControllerPath, 'utf8')

  assert.match(source, /function resetCurrentSessionState\(\) \{[\s\S]*activeSessionId\.value = null[\s\S]*options\.form\.input = ''[\s\S]*\}/)
  assert.match(source, /function startNewSession\(\) \{[\s\S]*resetCurrentSessionState\(\)[\s\S]*options\.toast\.success\('已新建空白会话。'\)/)
  assert.match(source, /if \(activeSessionId\.value === session\.id\) \{\s+resetCurrentSessionState\(\)\s+\}\s+options\.toast\.success\('会话已删除。'\)/)
  assert.doesNotMatch(source, /if \(activeSessionId\.value === session\.id\) \{\s+startNewSession\(\)\s+\}/)
})
