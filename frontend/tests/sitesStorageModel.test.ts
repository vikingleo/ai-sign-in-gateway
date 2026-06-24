import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCredentialSuggestions,
  configNumberValue,
  configTextValue,
  consoleCollectorScript,
  credentialAutocomplete,
  credentialInputName,
  ensureField,
  isValidEmailPattern,
  summarizeStorageKeys,
} from '../src/sitesStorageModel.ts'

test('formats plugin config values for editor fields', () => {
  const config: Record<string, unknown> = {
    list: [' a ', '', 'b'],
    count: '42',
    object: { mode: 'daily' },
    enabled: true,
  }

  assert.equal(configTextValue(config, 'list'), 'a\nb')
  assert.equal(configTextValue(config, 'object'), '{"mode":"daily"}')
  assert.equal(configTextValue(config, 'enabled'), 'true')
  assert.equal(configNumberValue(config, 'count'), 42)
  assert.equal(configNumberValue(config, 'missing'), undefined)

  ensureField(config, 'new_number', 'number')
  ensureField(config, 'new_text', 'text')
  assert.equal(config.new_number, 0)
  assert.equal(config.new_text, '')
})

test('builds credential field helpers and suggestions', () => {
  const suggestions = buildCredentialSuggestions({
    email: ' user@example.com ',
    auth_token: 'token-1',
    token: 'token-2',
    cookie: 'sid=1',
  })

  assert.equal(credentialInputName('access_token'), 'site-credential-access_token')
  assert.equal(credentialAutocomplete('password', 'password'), 'new-password')
  assert.equal(credentialAutocomplete('email', 'text'), 'off')
  assert.deepEqual([...suggestions.entries()], [
    ['email', 'user@example.com'],
    ['auth_token', 'token-1'],
    ['token', 'token-2'],
    ['cookie', 'sid=1'],
    ['account', 'user@example.com'],
    ['username', 'user@example.com'],
    ['access_token', 'token-1'],
  ])
})

test('summarizes browser storage analysis result', () => {
  const lines = summarizeStorageKeys({
    parsed_items: 3,
    page_url: 'https://example.com',
    page_title: '',
    cookie_header: 'sid=1',
    local_storage: Object.fromEntries(Array.from({ length: 9 }, (_, index) => [`local_${index}`, String(index)])),
    session_storage: { session: '1' },
    suggested_credentials: {},
    matched_keys: [],
    message: 'ok',
  })

  assert.deepEqual(lines, [
    '页面：https://example.com',
    '已解析：3 项',
    'Cookie：已包含可读 Cookie',
    'localStorage Key：local_0，local_1，local_2，local_3，local_4，local_5，local_6，local_7 ...',
    'sessionStorage Key：session',
  ])
})

test('validates batch registration email patterns and exposes console collector', () => {
  assert.equal(isValidEmailPattern('user+{n}@example.com'), true)
  assert.equal(isValidEmailPattern('user+{n:03}@example.com'), true)
  assert.equal(isValidEmailPattern('user+{rand:[a-z]{8}}@example.com'), true)
  assert.equal(isValidEmailPattern('plain@example.com'), false)
  assert.equal(consoleCollectorScript.includes('localStorage'), true)
  assert.equal(consoleCollectorScript.includes('tokenPayloads'), true)
  assert.equal(consoleCollectorScript.includes('console.log'), false)
})
