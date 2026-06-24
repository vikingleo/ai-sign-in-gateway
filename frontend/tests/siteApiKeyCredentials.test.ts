import test from 'node:test'
import assert from 'node:assert/strict'

import {
  apiKeyImageEditPath,
  apiKeyImageGenerationPath,
  apiKeyRequestBaseURLs,
  equivalentApiKeyEntryExists,
  mergeApiKeyEntries,
  removeSiteApiKeyCredential,
  setApiKeyImagePaths,
  setApiKeyRequestBaseURLs,
} from '../src/siteApiKeyCredentials.ts'

test('removes synced api key entries and promotes the next stored key', () => {
  const updated = removeSiteApiKeyCredential(
    {
      api_key: 'key-synced-primary',
      api_keys: [
        { id: 1, name: 'synced primary', key: 'key-synced-primary', source: 'api', status: 'active' },
        { id: 2, name: 'synced backup', key: 'key-synced-backup', source: 'api', status: 'active' },
        { id: 'manual-1', name: 'manual', key: 'key-manual', source: 'manual', status: 'active' },
      ],
    },
    'key-synced-primary',
  )

  assert.equal(updated.api_key, 'key-synced-backup')
  assert.deepEqual(
    (updated.api_keys as Array<Record<string, unknown>>).map((item) => item.key),
    ['key-synced-backup', 'key-manual'],
  )
})

test('clears primary api key when the last stored key is removed', () => {
  const updated = removeSiteApiKeyCredential(
    {
      api_key: 'key-only',
      api_keys: [{ id: 1, name: 'only', key: 'key-only', source: 'api', status: 'active' }],
    },
    'key-only',
  )

  assert.equal(updated.api_key, '')
  assert.deepEqual(updated.api_keys, [])
})

test('reads api key request base url aliases as a normalized list', () => {
  assert.deepEqual(
    apiKeyRequestBaseURLs({
      request_base_url: 'https://claude.example/v1',
      api_request_urls: 'https://gpt.example/v1\nhttps://gpt-backup.example/v1',
      endpoint_url: 'https://claude.example/v1',
    }),
    [
      'https://claude.example/v1',
      'https://gpt.example/v1',
      'https://gpt-backup.example/v1',
    ],
  )
})

test('updates one api key request base url without rewriting other entries', () => {
  const updated = setApiKeyRequestBaseURLs(
    {
      api_key: 'gpt-key',
      api_keys: [
        { id: 1, name: 'gpt', key: 'gpt-key', source: 'api', status: 'active', route_type: 'gpt' },
        { id: 2, name: 'claude', key: 'claude-key', source: 'api', status: 'active', route_type: 'claude' },
      ],
    },
    'claude-key',
    'https://claude.example/v1\nhttps://claude-backup.example/v1',
  )

  const entries = updated.api_keys as Array<Record<string, unknown>>
  assert.deepEqual(entries[0], { id: 1, name: 'gpt', key: 'gpt-key', source: 'api', status: 'active', route_type: 'gpt' })
  assert.deepEqual(entries[1].request_base_urls, [
    'https://claude.example/v1',
    'https://claude-backup.example/v1',
  ])
})

test('updates only the targeted duplicate api key request url by index', () => {
  const updated = setApiKeyRequestBaseURLs(
    {
      api_key: 'shared-key',
      api_keys: [
        { id: 'shared-gpt', name: 'gpt', key: 'shared-key', source: 'manual', status: 'active', route_type: 'gpt', request_base_urls: ['https://gpt.example/v1'] },
        { id: 'shared-claude', name: 'claude', key: 'shared-key', source: 'manual', status: 'active', route_type: 'claude', request_base_urls: ['https://old-claude.example/v1'] },
      ],
    },
    'shared-key',
    'https://claude.example/v1',
    1,
  )

  const entries = updated.api_keys as Array<Record<string, unknown>>
  assert.deepEqual(entries[0].request_base_urls, ['https://gpt.example/v1'])
  assert.deepEqual(entries[1].request_base_urls, ['https://claude.example/v1'])
})

test('reads and updates api key image paths', () => {
  const updated = setApiKeyImagePaths(
    {
      api_key: 'image-key',
      api_keys: [
        { id: 1, name: 'image', key: 'image-key', source: 'api', status: 'active', route_type: 'gpt' },
      ],
    },
    'image-key',
    '/custom/images/create',
    '/custom/images/edit',
  )

  const entry = (updated.api_keys as Array<Record<string, unknown>>)[0]
  assert.equal(apiKeyImageGenerationPath(entry), '/custom/images/create')
  assert.equal(apiKeyImageEditPath(entry), '/custom/images/edit')
})

test('updates only the targeted duplicate api key image paths by index', () => {
  const updated = setApiKeyImagePaths(
    {
      api_key: 'shared-key',
      api_keys: [
        { id: 'shared-gpt', name: 'gpt image', key: 'shared-key', source: 'manual', status: 'active', route_type: 'gpt', image_generation_path: '/gpt/images/create' },
        { id: 'shared-claude', name: 'claude image', key: 'shared-key', source: 'manual', status: 'active', route_type: 'claude' },
      ],
    },
    'shared-key',
    '/claude/images/create',
    '/claude/images/edit',
    1,
  )

  const entries = updated.api_keys as Array<Record<string, unknown>>
  assert.equal(entries[0].image_generation_path, '/gpt/images/create')
  assert.equal(entries[0].image_edit_path, undefined)
  assert.equal(entries[1].image_generation_path, '/claude/images/create')
  assert.equal(entries[1].image_edit_path, '/claude/images/edit')
})

test('removes only the targeted duplicate api key entry by index', () => {
  const updated = removeSiteApiKeyCredential(
    {
      api_key: 'shared-key',
      api_keys: [
        { id: 'shared-gpt', name: 'gpt', key: 'shared-key', source: 'manual', status: 'active', route_type: 'gpt' },
        { id: 'shared-claude', name: 'claude', key: 'shared-key', source: 'manual', status: 'active', route_type: 'claude' },
      ],
    },
    'shared-key',
    1,
  )

  const entries = updated.api_keys as Array<Record<string, unknown>>
  assert.deepEqual(entries.map((item) => item.id), ['shared-gpt'])
  assert.equal(updated.api_key, 'shared-key')
})

test('keeps same api key entries when their entry ids differ', () => {
  assert.deepEqual(
    mergeApiKeyEntries([
      { id: 'shared-gpt', name: 'gpt', key: 'shared-key', source: 'manual', status: 'active', route_type: 'gpt' },
      { id: 'shared-claude', name: 'claude', key: 'shared-key', source: 'manual', status: 'active', route_type: 'claude' },
    ]).map((item) => item.id),
    ['shared-gpt', 'shared-claude'],
  )
})

test('merges no-id api key entries by config signature', () => {
  assert.deepEqual(
    mergeApiKeyEntries([
      { name: 'gpt', key: 'shared-key', source: 'manual', status: 'active', route_type: 'gpt', request_base_urls: ['https://gpt.example/v1'] },
      { name: 'gpt copy', key: 'shared-key', source: 'manual', status: 'active', route_type: 'gpt', request_base_urls: ['https://gpt.example/v1'] },
      { name: 'claude', key: 'shared-key', source: 'manual', status: 'active', route_type: 'claude', request_base_urls: ['https://claude.example/v1'] },
    ]).map((item) => item.name),
    ['gpt', 'claude'],
  )
})

test('detects only fully equivalent api key configs as duplicates', () => {
  const entries = [
    { id: 'shared-gpt', name: 'gpt', key: 'shared-key', source: 'manual', status: 'active', route_type: 'gpt', request_base_urls: ['https://gpt.example/v1'] },
  ]

  assert.equal(equivalentApiKeyEntryExists(entries, {
    id: 'shared-claude',
    name: 'claude',
    key: 'shared-key',
    source: 'manual',
    status: 'active',
    route_type: 'claude',
    request_base_urls: ['https://claude.example/v1'],
  }), false)
  assert.equal(equivalentApiKeyEntryExists(entries, {
    id: 'shared-gpt-copy',
    name: 'gpt copy',
    key: 'shared-key',
    source: 'manual',
    status: 'active',
    route_type: 'gpt',
    request_base_urls: ['https://gpt.example/v1'],
  }), true)
})
