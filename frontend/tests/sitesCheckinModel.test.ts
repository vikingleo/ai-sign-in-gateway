import test from 'node:test'
import assert from 'node:assert/strict'

import {
  availableCheckinSiteIds,
  batchCheckinTargetCount,
  batchCheckinTargetSites,
  filterCheckinRuns,
  includedCheckinCount,
  siteCanCheckin,
  siteCheckinActionLabel,
  siteIncludedInCheckin,
  siteRunnableForCheckin,
  syncSelectedCheckinIds,
  visibleCheckinStatus,
} from '../src/sitesCheckinModel.ts'
import type { CheckinRun, CheckinSite, Site } from '../src/types.ts'

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
    checkin_status: null,
    last_run_at: null,
    created_at: '2026-05-24T00:00:00Z',
    updated_at: null,
    ...overrides,
  }
}

function checkin(overrides: Partial<CheckinSite>): CheckinSite {
  return {
    id: 1,
    name: 'site',
    plugin_key: 'yellowpeach-newapi',
    group_name: '',
    base_url: 'https://example.com',
    is_enabled: true,
    can_checkin: true,
    include_in_checkin: true,
    checkin_label: '签到',
    reason: '',
    last_status: null,
    last_message: null,
    last_run_at: null,
    ...overrides,
  }
}

function run(overrides: Partial<CheckinRun>): CheckinRun {
  return {
    id: 1,
    site_id: 1,
    site_name: 'Alpha',
    trigger_type: 'manual',
    status: 'success',
    message: 'ok',
    response_excerpt: null,
    balance: null,
    attempt_count: 1,
    started_at: '2026-05-24T00:00:00Z',
    finished_at: null,
    ...overrides,
  }
}

test('reads checkin capability and visible status from metadata', () => {
  const enabledSite = site({ id: 1, checkin_status: 'success' })
  const excludedSite = site({ id: 2, checkin_status: 'success' })
  const meta = new Map([
    [1, checkin({ id: 1, checkin_label: '领取奖励' })],
    [2, checkin({ id: 2, include_in_checkin: false })],
  ])

  assert.equal(siteCanCheckin(enabledSite, meta), true)
  assert.equal(siteIncludedInCheckin(enabledSite, meta), true)
  assert.equal(siteRunnableForCheckin(enabledSite, meta), true)
  assert.equal(visibleCheckinStatus(enabledSite, meta), 'success')
  assert.equal(siteCheckinActionLabel(enabledSite, meta), '领取奖励')
  assert.equal(visibleCheckinStatus(excludedSite, meta), null)
  assert.equal(siteCheckinActionLabel(site({ id: 3 }), meta), '签到')
})

test('counts included checkin sites and syncs selected ids', () => {
  const sites = [
    site({ id: 1 }),
    site({ id: 2 }),
    site({ id: 3, is_enabled: false }),
  ]
  const meta = new Map([
    [1, checkin({ id: 1 })],
    [2, checkin({ id: 2, include_in_checkin: false })],
    [3, checkin({ id: 3 })],
  ])
  const available = availableCheckinSiteIds(sites, meta)

  assert.equal(includedCheckinCount(sites, meta), 2)
  assert.deepEqual([...available], [1])
  assert.deepEqual(syncSelectedCheckinIds([1, 2, 3], available), [1])
})

test('counts batch checkin targets using the saved include-all mode', () => {
  const sites = [
    site({ id: 1 }),
    site({ id: 2 }),
    site({ id: 3, is_enabled: false }),
  ]
  const meta = new Map([
    [1, checkin({ id: 1, include_in_checkin: false })],
    [2, checkin({ id: 2, include_in_checkin: false })],
    [3, checkin({ id: 3, include_in_checkin: false })],
  ])

  assert.equal(includedCheckinCount(sites, meta), 0)
  assert.equal(batchCheckinTargetCount(sites, meta, true), 0)
  assert.equal(batchCheckinTargetCount(sites, meta, false), 3)
  assert.deepEqual(batchCheckinTargetSites(sites, meta, false).map((item) => item.id), [1, 2, 3])
})

test('filters checkin runs by searchable fields', () => {
  const runs = [
    run({ id: 1, site_name: 'Alpha', status: 'success', message: 'claimed' }),
    run({ id: 2, site_name: 'Beta', trigger_type: 'scheduler', status: 'failed', message: 'timeout' }),
  ]

  assert.deepEqual(filterCheckinRuns(runs, 'SCHEDULER').map((item) => item.id), [2])
  assert.deepEqual(filterCheckinRuns(runs, 'claimed').map((item) => item.id), [1])
  assert.deepEqual(filterCheckinRuns(runs, '').map((item) => item.id), [1, 2])
})
