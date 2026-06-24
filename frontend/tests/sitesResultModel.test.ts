import test from 'node:test'
import assert from 'node:assert/strict'

import {
  mergeApiKeyRefreshResult,
  mergeBalanceProbeResult,
  mergeCheckinResult,
  mergeInviteRefreshResult,
  mergeSiteHealthEditorPayload,
  mergeSiteHealthResult,
  mergeSiteSummary,
} from '../src/sitesResultModel.ts'
import type { Site, SiteApiKeyRefreshResult, SiteHealth, SiteInviteRefreshResult, SitePayload, SiteSummary } from '../src/types.ts'

function site(overrides: Partial<Site> = {}): Site {
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

test('merges invite refresh credentials, plugin config, invite data and package quota without mutating source', () => {
  const source = site({
    credentials: { session: 'old', keep: 'credential' },
    plugin_config: { invite_link: 'https://old.example', keep: 'config' },
    package_remaining: 1,
  })
  const result: SiteInviteRefreshResult = {
    site_id: 1,
    ok: true,
    message: 'ok',
    invite_link: 'https://new.example/register',
    invite_code: 'NEWCODE',
    package_remaining: 12,
    package_total: 20,
    package_used: 8,
    package_unit: 'rmb',
    package_display: '12 tokens',
    updated_credentials: { session: 'new', token: 'fresh' },
    updated_plugin_config: { csrf: 'abc' },
  }

  const merged = mergeInviteRefreshResult(source, result)

  assert.notStrictEqual(merged, source)
  assert.deepEqual(merged.credentials, { session: 'new', keep: 'credential', token: 'fresh' })
  assert.deepEqual(merged.plugin_config, {
    invite_link: 'https://new.example/register',
    keep: 'config',
    csrf: 'abc',
    invite_code: 'NEWCODE',
    package_display: '12 tokens',
  })
  assert.equal(merged.package_remaining, 12)
  assert.equal(merged.package_total, 20)
  assert.equal(merged.package_used, 8)
  assert.equal(merged.package_unit, '¥')
  assert.equal(merged.package_display, '12 tokens')
  assert.deepEqual(source.credentials, { session: 'old', keep: 'credential' })
  assert.deepEqual(source.plugin_config, { invite_link: 'https://old.example', keep: 'config' })
  assert.equal(source.package_remaining, 1)
})

test('merges api key refresh credentials only when updates are present', () => {
  const source = site({ credentials: { api_key: 'key-old', keep: 'yes' } })
  const result: SiteApiKeyRefreshResult = {
    site_id: 1,
    site_name: 'site',
    ok: true,
    message: 'ok',
    api_key_count: 2,
    primary_key_updated: true,
    updated_credentials: { api_key: 'key-new', api_keys: [{ key: 'key-new' }] },
  }

  const merged = mergeApiKeyRefreshResult(source, result)

  assert.deepEqual(merged.credentials, {
    api_key: 'key-new',
    keep: 'yes',
    api_keys: [{ key: 'key-new' }],
  })
  assert.deepEqual(source.credentials, { api_key: 'key-old', keep: 'yes' })
})

test('merges site summary status, quota and invite info', () => {
  const source = site({
    plugin_config: { keep: 'config' },
    package_remaining: 1,
    package_unit: '$',
  })
  const summary: SiteSummary = {
    site_id: 1,
    last_status: 'success',
    connection_status: 'success',
    last_message: 'ready',
    last_balance: 18.5,
    balance_display: '$18.5',
    package_remaining: 9,
    package_total: 10,
    package_used: 1,
    package_unit: 'cny',
    package_display: '9 credits',
    invite_link: 'https://new.example/invite',
    invite_code: 'CODE9',
    checkin_status: 'success',
    last_run_at: '2026-05-24T01:02:03Z',
  }

  const merged = mergeSiteSummary(source, summary)

  assert.equal(merged.last_status, 'success')
  assert.equal(merged.connection_status, 'success')
  assert.equal(merged.last_message, 'ready')
  assert.equal(merged.last_balance, 18.5)
  assert.equal(merged.balance_display, '$18.5')
  assert.equal(merged.package_remaining, 9)
  assert.equal(merged.package_total, 10)
  assert.equal(merged.package_used, 1)
  assert.equal(merged.package_unit, '¥')
  assert.equal(merged.package_display, '9 credits')
  assert.deepEqual(merged.plugin_config, {
    keep: 'config',
    invite_link: 'https://new.example/invite',
    invite_code: 'CODE9',
  })
  assert.equal(merged.checkin_status, 'success')
  assert.equal(merged.last_run_at, '2026-05-24T01:02:03Z')
  assert.equal(source.package_remaining, 1)
})

test('merges site health result credentials, quota, balance and invite info', () => {
  const source = site({
    credentials: { session: 'old', keep: 'credential' },
    plugin_config: { keep: 'config' },
  })
  const result: SiteHealth = {
    site_id: 1,
    logged_in: true,
    message: 'ok',
    balance: 4,
    balance_unit: 'usd',
    package_remaining: 5,
    package_total: 8,
    package_used: 3,
    package_unit: 'cny',
    package_display: '5 credits',
    account_name: 'demo',
    invite_link: 'https://new.example/invite',
    invite_code: 'HEALTH',
    updated_credentials: { session: 'new' },
    updated_plugin_config: { csrf: 'abc' },
  }

  const merged = mergeSiteHealthResult(source, result)

  assert.deepEqual(merged.credentials, { session: 'new', keep: 'credential' })
  assert.equal(merged.last_balance, 4)
  assert.equal(merged.balance_unit, '$')
  assert.equal(merged.balance_display, '$4')
  assert.equal(merged.package_remaining, 5)
  assert.equal(merged.package_total, 8)
  assert.equal(merged.package_used, 3)
  assert.equal(merged.package_unit, '¥')
  assert.equal(merged.package_display, '5 credits')
  assert.deepEqual(merged.plugin_config, {
    keep: 'config',
    csrf: 'abc',
    package_display: '5 credits',
    invite_link: 'https://new.example/invite',
    invite_code: 'HEALTH',
  })
})

test('merges site health result into editor payload without mutating source', () => {
  const source: SitePayload = {
    name: 'site',
    base_url: 'https://example.com',
    plugin_key: 'yellowpeach-newapi',
    group_name: '',
    supported_models: null,
    is_enabled: true,
    notes: '',
    credentials: { session: 'old', keep: 'credential' },
    plugin_config: { keep: 'config' },
  }
  const result: SiteHealth = {
    site_id: 1,
    logged_in: true,
    message: 'ok',
    balance: 4,
    balance_unit: 'usd',
    package_remaining: 5,
    package_total: 8,
    package_used: 3,
    package_unit: 'cny',
    package_display: '5 credits',
    account_name: 'demo',
    invite_link: 'https://new.example/invite',
    invite_code: 'HEALTH',
    updated_credentials: { session: 'new' },
    updated_plugin_config: { csrf: 'abc' },
  }

  const merged = mergeSiteHealthEditorPayload(source, result)

  assert.deepEqual(merged.credentials, { session: 'new', keep: 'credential' })
  assert.deepEqual(merged.plugin_config, {
    keep: 'config',
    csrf: 'abc',
    package_display: '5 credits',
    invite_link: 'https://new.example/invite',
    invite_code: 'HEALTH',
  })
  assert.deepEqual(source.credentials, { session: 'old', keep: 'credential' })
  assert.deepEqual(source.plugin_config, { keep: 'config' })
})

test('merges balance probe result using last balance before remaining value', () => {
  const source = site()
  const merged = mergeBalanceProbeResult(source, {
    last_balance: 3.25,
    remaining: 7,
    unit: 'usd',
  })

  assert.equal(merged.last_balance, 3.25)
  assert.equal(merged.balance_unit, '$')
  assert.equal(merged.balance_display, '$3.25')
})

test('merges checkin result while preserving previous balance when result has no numeric balance', () => {
  const source = site({
    last_balance: 6,
    balance_unit: '$',
    balance_display: '$6',
    package_remaining: 2,
  })
  const merged = mergeCheckinResult(source, {
    status: 'failed',
    connection_status: 'failed',
    checkin_status: 'failed',
    message: 'timeout',
    balance: Number.NaN,
    package_remaining: null,
    package_unit: 'usd',
  }, '2026-05-24T02:00:00Z')

  assert.equal(merged.last_status, 'failed')
  assert.equal(merged.connection_status, 'failed')
  assert.equal(merged.checkin_status, 'failed')
  assert.equal(merged.last_message, 'timeout')
  assert.equal(merged.last_balance, 6)
  assert.equal(merged.balance_display, '$6')
  assert.equal(merged.package_remaining, null)
  assert.equal(merged.package_unit, '$')
  assert.equal(merged.last_run_at, '2026-05-24T02:00:00Z')
})
