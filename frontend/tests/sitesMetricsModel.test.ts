import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildSitesMetrics,
  buildTotalBalancesByUnit,
  formatProgressLabel,
  formatTotalBalanceSummary,
  readTotalBalanceTone,
  type BatchProgress,
} from '../src/sitesMetricsModel.ts'
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

test('builds site KPI counts from current site records', () => {
  const metrics = buildSitesMetrics([
    site({
      id: 1,
      group_name: 'alpha,beta',
      credentials: { api_key: 'key-a' },
      connection_status: 'success',
    }),
    site({
      id: 2,
      is_enabled: false,
      group_name: '',
      credentials: { api_keys: [{ key: 'key-b' }] },
      connection_status: 'failed',
    }),
    site({
      id: 3,
      group_name: 'gamma',
      credentials: { api_keys: [{ key: 'key-c' }] },
      connection_status: 'active',
    }),
  ])

  assert.equal(metrics.totalSiteCount, 3)
  assert.equal(metrics.enabledSiteCount, 2)
  assert.equal(metrics.groupedSiteCount, 2)
  assert.equal(metrics.readyGatewayCount, 2)
  assert.equal(metrics.successSiteCount, 1)
  assert.equal(metrics.failedSiteCount, 1)
  assert.equal(metrics.pendingSiteCount, 1)
})

test('summarizes quantified balances by display unit', () => {
  const totals = buildTotalBalancesByUnit([
    site({ id: 1, last_balance: 10, balance_display: '$10' }),
    site({ id: 2, last_balance: 5, balance_display: '5 usd' }),
    site({ id: 3, last_balance: 7, balance_display: '7 RMB' }),
    site({ id: 4, last_balance: Number.NaN, balance_display: '$0' }),
    site({ id: 5, last_balance: null, balance_display: '$0' }),
  ])

  assert.deepEqual([...totals.entries()], [
    ['$', 15],
    ['¥', 7],
  ])
  assert.equal(formatTotalBalanceSummary(totals), '$15 / ¥7')
  assert.equal(readTotalBalanceTone(totals), 'positive')
})

test('marks total balance tone as negative when any unit is below zero', () => {
  assert.equal(readTotalBalanceTone(new Map([['$', 0]])), 'zero')
  assert.equal(readTotalBalanceTone(new Map([['$', 5], ['¥', -1]])), 'negative')
  assert.equal(readTotalBalanceTone(new Map()), 'empty')
})

test('includes balance summary and quantified count in metrics', () => {
  const metrics = buildSitesMetrics([
    site({ id: 1, last_balance: 0, balance_display: '$0' }),
    site({ id: 2, last_balance: undefined as unknown as number | null, balance_display: '$1' }),
  ])

  assert.equal(metrics.totalBalanceSummary, '$0')
  assert.equal(metrics.totalBalanceTone, 'zero')
  assert.equal(metrics.quantifiedBalanceSiteCount, 1)
})

test('formats batch progress labels', () => {
  const progress: BatchProgress = { total: 8, done: 3, success: 2, failed: 1 }

  assert.equal(formatProgressLabel(null, '连通测试', '连通中'), '连通测试')
  assert.equal(formatProgressLabel(progress, '连通测试', '连通中'), '连通中 3/8')
})
