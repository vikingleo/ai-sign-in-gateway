import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAvailableGroupNames,
  buildEditorAssignment,
  buildGroupOptions,
  buildPluginOptions,
  editableCredentialKeysForPlugin,
  groupCredentialFields,
  isRelayOnlySitePayload,
  normalizeSupportedModels,
  readSiteInviteInfo,
  readPrimaryActionLabel,
  readTestActionLabel,
  siteSupportsInvite,
  shouldShowAuthEntryButton,
} from '../src/sitesEditorModel.ts'
import type { PluginMeta, SitePayload } from '../src/types.ts'

function plugin(overrides: Partial<PluginMeta>): PluginMeta {
  return {
    key: 'example',
    name: 'Example',
    description: '',
    credential_fields: [],
    config_fields: [],
    capabilities: [],
    auth_entry_path: '',
    auth_entry_label: '',
    auth_hint: '',
    ...overrides,
  }
}

test('builds visible plugin options and preserves imported records while selected', () => {
  const plugins = [
    plugin({ key: 'api-supplier', name: 'API Supplier' }),
    plugin({ key: 'yellowpeach-newapi', name: 'Yellow Peach' }),
  ]

  assert.deepEqual(buildPluginOptions(plugins, 'yellowpeach-newapi'), [
    { label: 'Yellow Peach', value: 'yellowpeach-newapi' },
  ])
  assert.deepEqual(buildPluginOptions(plugins, 'api-supplier'), [
    { label: '导入记录', value: 'api-supplier' },
    { label: 'Yellow Peach', value: 'yellowpeach-newapi' },
  ])
})

test('hides auth entry when it duplicates the official site button', () => {
  assert.equal(shouldShowAuthEntryButton({
    authEntryLabel: '',
    authEntryUrl: 'https://example.com/login',
    officialSiteUrl: 'https://example.com',
  }), false)
  assert.equal(shouldShowAuthEntryButton({
    authEntryLabel: '打开官网',
    authEntryUrl: 'https://example.com',
    officialSiteUrl: 'https://example.com',
  }), false)
  assert.equal(shouldShowAuthEntryButton({
    authEntryLabel: '打开登录页',
    authEntryUrl: 'https://example.com/login',
    officialSiteUrl: 'https://example.com',
  }), true)
})

test('reads editor action labels from plugin capabilities and config', () => {
  assert.equal(readTestActionLabel(new Set(['relay_only'])), '验证出口')
  assert.equal(readTestActionLabel(new Set()), '测试连接')
  assert.equal(readPrimaryActionLabel({
    capabilities: new Set(['checkin']),
    pluginKey: 'yellowpeach-newapi',
    pluginConfig: {},
  }), '立即签到')
  assert.equal(readPrimaryActionLabel({
    capabilities: new Set(['checkin', 'api_key_sync']),
    pluginKey: 'sub2api-platform',
    pluginConfig: { disable_checkin: 'true' },
  }), '同步资料')
  assert.equal(readPrimaryActionLabel({
    capabilities: new Set(['checkin']),
    pluginKey: 'sub2api-platform',
    pluginConfig: { disable_checkin: 'true', checkin_url: 'https://example.com/checkin' },
  }), '立即签到')
  assert.equal(readPrimaryActionLabel({
    capabilities: new Set(),
    pluginKey: 'sub2api-platform',
    pluginConfig: {},
  }), '执行同步')
})

test('builds group options from catalog groups and current editor value', () => {
  const groups = [
    { name: 'beta', site_count: 1, in_catalog: true, in_use: true },
    { name: 'alpha', site_count: 2, in_catalog: true, in_use: true },
  ]
  const names = buildAvailableGroupNames(groups, 'gamma,beta')

  assert.deepEqual(names, ['alpha', 'beta', 'gamma'])
  assert.deepEqual(buildGroupOptions(names), [
    { label: 'alpha', value: 'alpha' },
    { label: 'beta', value: 'beta' },
    { label: 'gamma', value: 'gamma' },
  ])
})

test('groups credential fields by editor section', () => {
  const groups = groupCredentialFields(plugin({
    credential_fields: [
      { name: 'api_key', label: 'API Key', type: 'password', placeholder: '', required: false, help_text: '' },
      { name: 'email', label: 'Email', type: 'text', placeholder: '', required: false, help_text: '' },
      { name: 'password', label: 'Password', type: 'password', placeholder: '', required: false, help_text: '' },
      { name: 'totp_secret', label: 'TOTP', type: 'text', placeholder: '', required: false, help_text: '' },
    ],
  }))

  assert.deepEqual(groups.primary.map((field) => field.name), ['api_key'])
  assert.deepEqual(groups.manualLogin.map((field) => field.name), ['email', 'password'])
  assert.deepEqual(groups.totp.map((field) => field.name), ['totp_secret'])
  assert.deepEqual(groupCredentialFields(null), { primary: [], manualLogin: [], totp: [] })
})

test('normalizes supported models from strings and arrays', () => {
  assert.deepEqual(normalizeSupportedModels('gpt-4o, gpt-4o\nclaude-3'), ['gpt-4o', 'claude-3'])
  assert.deepEqual(normalizeSupportedModels([' gemini ', 'gemini', '']), ['gemini'])
  assert.equal(normalizeSupportedModels(''), null)
})

test('reads invite support and cached invite fields from site payload', () => {
  const plugins = [
    plugin({ key: 'relay', capabilities: ['relay_only', 'account_status'] }),
    plugin({ key: 'account', capabilities: ['account_status'] }),
    plugin({ key: 'plain', capabilities: [] }),
  ]

  assert.equal(isRelayOnlySitePayload({ plugin_key: 'relay' }, plugins), true)
  assert.equal(siteSupportsInvite({ plugin_key: 'relay' }, plugins), false)
  assert.equal(siteSupportsInvite({ plugin_key: 'account' }, plugins), true)
  assert.equal(siteSupportsInvite({ plugin_key: 'plain' }, plugins), false)
  assert.deepEqual(readSiteInviteInfo({
    plugin_config: {
      invite_link: ' https://example.com/invite ',
      invite_code: ' CODE ',
    },
  }), {
    link: 'https://example.com/invite',
    code: 'CODE',
  })
})

test('builds editable credential keys from plugin fields or fallback list', () => {
  assert.deepEqual([...editableCredentialKeysForPlugin(plugin({
    credential_fields: [
      { name: 'email', label: 'Email', type: 'text', placeholder: '', required: false, help_text: '' },
      { name: 'password', label: 'Password', type: 'password', placeholder: '', required: false, help_text: '' },
    ],
  }), ['account', 'api_key'])], ['email', 'password'])
  assert.deepEqual([...editableCredentialKeysForPlugin(null, ['account', 'api_key'])], ['account', 'api_key'])
})

test('builds editor assignment from existing site or fallback plugin', () => {
  const source: SitePayload = {
    name: 'Alpha',
    base_url: 'https://alpha.example',
    plugin_key: 'yellowpeach-newapi',
    group_name: 'east,west',
    supported_models: 'gpt-4o,gpt-4o-mini',
    is_enabled: false,
    notes: 'note',
    credentials: { api_key: 'key-old' },
    plugin_config: { invite_code: 'CODE' },
  }
  const fromSite = buildEditorAssignment({
    site: source,
    fallbackPluginKey: 'fallback-plugin',
    recommendedPluginKey: 'recommended-plugin',
  })

  assert.deepEqual(fromSite.payload, {
    name: 'Alpha',
    base_url: 'https://alpha.example',
    plugin_key: 'yellowpeach-newapi',
    group_name: 'east,west',
    supported_models: ['gpt-4o', 'gpt-4o-mini'],
    is_enabled: false,
    notes: 'note',
    credentials: { api_key: 'key-old' },
    plugin_config: { invite_code: 'CODE' },
  })
  assert.deepEqual(fromSite.groupNames, ['east', 'west'])
  assert.notStrictEqual(fromSite.payload.credentials, source.credentials)
  assert.notStrictEqual(fromSite.payload.plugin_config, source.plugin_config)

  const blank = buildEditorAssignment({
    fallbackPluginKey: 'fallback-plugin',
    recommendedPluginKey: 'recommended-plugin',
  })
  assert.equal(blank.payload.plugin_key, 'recommended-plugin')
  assert.equal(blank.payload.is_enabled, true)
  assert.deepEqual(blank.groupNames, [])
})
