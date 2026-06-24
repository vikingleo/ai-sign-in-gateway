import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCCSwitchExportFilename,
  detectRecommendedPluginKey,
  displayGroupName,
  isStorageJsonCandidate,
  normalizeSite,
  parseCCSwitchJsonPayload,
  parseCCSwitchPreview,
} from '../src/sitesViewModel.ts'
import {
  apiKeyDraftKey,
  apiKeyRoutePathLabel,
  apiKeyRouteTypeLabel,
  apiKeySourceLabel,
  defaultApiKeyRoutePath,
  defaultApiKeyRouteType,
  defaultRequestApiUrl,
  normalizeApiKeyRouteType,
  requestApiUrlText,
  siteApiKeyCount,
  siteApiKeyCountLabel,
  siteApiKeyCountTagColor,
  siteApiKeyEntries,
  storedApiKeyEntriesForEdit,
} from '../src/sitesApiKeyModel.ts'
import type { Site } from '../src/types.ts'

function site(overrides: Partial<Site>): Site {
  return {
    id: 1,
    name: 'site',
    base_url: 'https://example.com',
    plugin_key: 'yellowpeach-newapi',
    group_name: '',
    supported_models: null,
    is_enabled: true,
    notes: '',
    credentials: {},
    plugin_config: {},
    last_status: null,
    connection_status: null,
    last_message: null,
    last_balance: null,
    last_run_at: null,
    created_at: '2026-05-24T00:00:00Z',
    updated_at: null,
    ...overrides,
  }
}

test('parses cc-switch JSON payloads and preview rows', () => {
  const payload = parseCCSwitchJsonPayload(JSON.stringify({
    codex: {
      current: 'fast',
      providers: {
        fast: {
          name: 'Fast',
          websiteUrl: 'https://fast.example',
          notes: 'primary',
          settingsConfig: { env: { OPENAI_API_KEY: 'key-fast' } },
        },
        empty: { name: 'Empty', settingsConfig: { auth: {} } },
      },
    },
  }))

  assert.ok(payload)
  assert.deepEqual(parseCCSwitchPreview(payload).map((row) => ({
    key: row.key,
    app: row.app,
    isCurrent: row.isCurrent,
    apiKeyStatus: row.apiKeyStatus,
  })), [
    { key: 'codex:fast', app: 'Codex', isCurrent: true, apiKeyStatus: '已带入' },
    { key: 'codex:empty', app: 'Codex', isCurrent: false, apiKeyStatus: '留空' },
  ])
})

test('detects storage JSON candidates including string-wrapped objects', () => {
  assert.equal(isStorageJsonCandidate('{"localStorage":{}}'), true)
  assert.equal(isStorageJsonCandidate(JSON.stringify('{"sessionStorage":{}}')), true)
  assert.equal(isStorageJsonCandidate('"plain string"'), false)
  assert.equal(isStorageJsonCandidate('{bad json'), false)
})

test('normalizes site display fields without mutating source input', () => {
  const source = site({ group_name: 'alpha,beta', last_balance: 12.5, balance_unit: 'usd', package_unit: 'rmb' })
  const normalized = normalizeSite(source)

  assert.equal(displayGroupName(source), 'alpha / beta')
  assert.equal(normalized.balance_unit, '$')
  assert.equal(normalized.balance_display, '$12.5')
  assert.equal(normalized.package_unit, '¥')
  assert.equal(source.balance_unit, 'usd')
})

test('formats balance fallback with backend-compatible precision', () => {
  const normalized = normalizeSite(site({ last_balance: 12.3456, balance_unit: 'usd' }))

  assert.equal(normalized.balance_display, '$12.3456')
})

test('maps recommended plugins and api key route defaults', () => {
  assert.equal(detectRecommendedPluginKey('https://boxying.com/app'), 'yellowpeach-newapi')
  assert.equal(detectRecommendedPluginKey('https://demo.sub2api.example'), 'sub2api-platform')
  assert.equal(detectRecommendedPluginKey('https://example.com'), null)
  assert.equal(normalizeApiKeyRouteType('chat-completions'), 'gpt')
  assert.equal(defaultApiKeyRouteType(site({ plugin_config: { api_format: 'anthropic' } })), 'claude')
  assert.equal(defaultApiKeyRoutePath('gpt'), 'chat/completions')
  assert.equal(defaultApiKeyRoutePath('responses'), 'responses')
})

test('builds deterministic cc-switch export filenames when date is supplied', () => {
  assert.equal(
    buildCCSwitchExportFilename(new Date('2026-05-24T03:04:05')),
    'cc-switch-export-20260524_030405.web.json',
  )
})

test('maps stored api keys into dialog entries', () => {
  const entries = siteApiKeyEntries(site({
    credentials: {
      api_key: 'key-primary',
      api_keys: [
        {
          id: 'synced-1',
          name: 'Synced',
          key: 'key-synced',
          status: 'active',
          route_type: 'chat-completions',
          source: 'api',
          request_base_urls: ['https://api.example/v1'],
          image_generation_path: '/images/create',
          image_edit_path: '/images/edit',
        },
        {
          key: 'key-primary',
          source: 'manual',
          is_primary: true,
        },
      ],
    },
  }))

  assert.deepEqual(entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    routeType: entry.routeType,
    routePath: entry.routePath,
    isPrimary: entry.isPrimary,
    isManual: entry.isManual,
    requestBaseURLs: entry.requestBaseURLs,
    imageGenerationPath: entry.imageGenerationPath,
  })), [
    {
      id: 'synced-1',
      name: 'Synced',
      routeType: 'gpt',
      routePath: '',
      isPrimary: false,
      isManual: false,
      requestBaseURLs: ['https://api.example/v1'],
      imageGenerationPath: '/images/create',
    },
    {
      id: 'manual-1',
      name: 'Key 2',
      routeType: '',
      routePath: '',
      isPrimary: true,
      isManual: true,
      requestBaseURLs: [],
      imageGenerationPath: '',
    },
  ])
})

test('adds primary api key entry for edit when only legacy api_key is stored', () => {
  const entries = storedApiKeyEntriesForEdit(site({
    credentials: { api_key: 'key-legacy' },
    plugin_config: { api_format: 'gemini' },
  }))

  assert.deepEqual(entries, [
    {
      id: 'primary',
      name: '默认 Key',
      key: 'key-legacy',
      status: 'active',
      source: 'manual',
      route_type: 'gemini',
      api_type: 'gemini',
    },
  ])
  assert.equal(siteApiKeyCount(site({ credentials: { api_key: 'key-legacy' } })), 1)
})

test('formats api key labels and default endpoint hints', () => {
  const syncSupported = () => true
  const syncUnsupported = () => false
  const emptySite = site({ credentials: {}, plugin_key: 'yellowpeach-newapi' })

  assert.equal(siteApiKeyCountLabel(emptySite, syncSupported), '补充 apikey 接口路径')
  assert.equal(siteApiKeyCountTagColor(emptySite, syncSupported), 'warning')
  assert.equal(siteApiKeyCountLabel(emptySite, syncUnsupported), '0')
  assert.equal(siteApiKeyCountTagColor(site({ credentials: { api_key: 'sk' } }), syncUnsupported), 'green')
  assert.equal(apiKeyDraftKey({ id: '', key: 'sk', entryIndex: 2 }), 'sk:2')
  assert.equal(apiKeyRouteTypeLabel('claude'), 'Claude')
  assert.equal(apiKeyRouteTypeLabel('unknown'), '默认类型')
  assert.equal(apiKeyRoutePathLabel('responses'), '/v1/responses')
  assert.equal(apiKeyRoutePathLabel('unknown'), '跟随客户端')
  assert.equal(apiKeySourceLabel({
    id: '1',
    entryIndex: 0,
    name: '',
    key: '',
    status: '',
    isPrimary: false,
    source: 'api',
    routeType: '',
    routePath: '',
    requestBaseURLs: [],
    imageGenerationPath: '',
    imageEditPath: '',
    isManual: false,
  }), '接口')
})

test('formats request api urls and endpoint fallback order', () => {
  assert.equal(
    requestApiUrlText(site({ plugin_config: { api_request_urls: 'https://a.example/v1\nhttps://b.example/v1' } })),
    'https://a.example/v1\nhttps://b.example/v1',
  )
  assert.equal(
    defaultRequestApiUrl(site({
      base_url: 'https://base.example',
      plugin_config: {
        gateway_request_urls: ['https://gateway-a.example', 'https://gateway-b.example'],
        endpoint_url: 'https://endpoint.example',
      },
    })),
    'https://gateway-a.example',
  )
  assert.equal(defaultRequestApiUrl(site({ base_url: 'https://base.example', plugin_config: {} })), 'https://base.example')
})
