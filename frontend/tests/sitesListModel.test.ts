import test from 'node:test'
import assert from 'node:assert/strict'

import {
  displayPluginLabel,
  duplicateGroupRowKey,
  duplicateSuggestedSiteName,
  filterDuplicateGroups,
  filterSites,
  isImportedSitePayload,
} from '../src/sitesListModel.ts'
import type { DuplicateSiteGroup, Site } from '../src/types.ts'

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

function duplicateGroup(overrides: Partial<DuplicateSiteGroup>): DuplicateSiteGroup {
  return {
    plugin_key: 'yellowpeach-newapi',
    base_url: 'https://example.com',
    account: 'user@example.com',
    password_present: true,
    suggested_keep_id: 1,
    site_ids: [1],
    sites: [
      {
        id: 1,
        name: 'Primary',
        plugin_key: 'yellowpeach-newapi',
        is_enabled: true,
        notes: '',
        plugin_config_count: 1,
        credentials_count: 1,
        suggested_keep: true,
      },
    ],
    ...overrides,
  }
}

test('labels imported api-supplier rows as imported records', () => {
  const imported = site({
    plugin_key: 'api-supplier',
    plugin_config: { cc_switch_source_version: '1' },
  })

  assert.equal(isImportedSitePayload(imported), true)
  assert.equal(displayPluginLabel(imported, () => 'API Supplier'), '导入记录')
  assert.equal(displayPluginLabel(site({ plugin_key: 'api-supplier' }), () => 'API Supplier'), 'API Supplier')
})

test('filters sites by display fields and injected labels', () => {
  const sites = [
    site({ id: 1, name: 'Alpha', group_name: 'team-a', notes: 'stable' }),
    site({ id: 2, name: 'Beta', base_url: 'https://beta.example', package_display: '套餐' }),
  ]
  const readers = {
    displayGroupName: (item: Pick<Site, 'group_name'>) => item.group_name || '未分组',
    displayPluginLabel: (item: Site) => item.plugin_key,
    siteApiKeyCountLabel: (item: Site) => (item.id === 2 ? '补充 apikey 接口路径' : '1 个'),
  }

  assert.deepEqual(filterSites(sites, 'TEAM-A', readers).map((item) => item.id), [1])
  assert.deepEqual(filterSites(sites, '补充 apikey', readers).map((item) => item.id), [2])
  assert.deepEqual(filterSites(sites, '', readers).map((item) => item.id), [1, 2])
})

test('filters duplicate groups and formats table helpers', () => {
  const groups = [
    duplicateGroup({ base_url: 'https://alpha.example', suggested_keep_id: 9 }),
    duplicateGroup({
      base_url: 'https://beta.example',
      account: 'beta@example.com',
      suggested_keep_id: 2,
      sites: [
        {
          id: 2,
          name: 'Beta Old',
          plugin_key: 'sub2api-platform',
          is_enabled: true,
          notes: 'legacy',
          plugin_config_count: 1,
          credentials_count: 1,
          suggested_keep: false,
        },
      ],
    }),
  ]

  assert.deepEqual(filterDuplicateGroups(groups, 'legacy').map((group) => group.account), ['beta@example.com'])
  assert.equal(duplicateGroupRowKey(groups[0]), 'yellowpeach-newapi:https://alpha.example:user@example.com:9')
  assert.equal(duplicateSuggestedSiteName(groups[0]), 'Primary')
  assert.equal(duplicateSuggestedSiteName(groups[1]), '-')
})
