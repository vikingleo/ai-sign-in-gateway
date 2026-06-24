import test from 'node:test'
import assert from 'node:assert/strict'

import {
  readApiKeyImageEditPathDraft,
  readApiKeyImageGenerationPathDraft,
  readApiKeyRequestUrlDraft,
  readApiKeyRoutePathDraft,
  removeApiKeyDrafts,
  resetApiKeyDraftState,
  setApiKeyImagePathDraft,
  setApiKeyRequestUrlDraft,
  setApiKeyRoutePathDraft,
} from '../src/sitesApiKeyDraftModel.ts'
import type { SiteApiKeyEntry } from '../src/sitesApiKeyModel.ts'

function entry(overrides: Partial<SiteApiKeyEntry> = {}): SiteApiKeyEntry {
  return {
    id: 'entry-1',
    entryIndex: 0,
    name: 'Entry',
    key: 'key-entry',
    status: 'active',
    isPrimary: false,
    source: 'api',
    routeType: 'gpt',
    routePath: 'chat/completions',
    requestBaseURLs: ['https://api.example/v1', 'https://backup.example/v1'],
    imageGenerationPath: '/images/create',
    imageEditPath: '/images/edit',
    isManual: false,
    ...overrides,
  }
}

test('manages api key dialog draft maps by stable entry key', () => {
  const state = {
    requestUrls: { stale: 'value' },
    routePaths: { stale: 'value' },
    imageGenerationPaths: { stale: 'value' },
    imageEditPaths: { stale: 'value' },
  }
  const item = entry()

  resetApiKeyDraftState(state, [item])
  assert.deepEqual(state.requestUrls, { 'entry-1:0': 'https://api.example/v1\nhttps://backup.example/v1' })
  assert.deepEqual(state.routePaths, { 'entry-1:0': 'chat/completions' })
  assert.equal(readApiKeyRequestUrlDraft(state, item), 'https://api.example/v1\nhttps://backup.example/v1')
  assert.equal(readApiKeyRoutePathDraft(state, item), 'chat/completions')
  assert.equal(readApiKeyImageGenerationPathDraft(state, item), '/images/create')
  assert.equal(readApiKeyImageEditPathDraft(state, item), '/images/edit')

  setApiKeyRequestUrlDraft(state, item, 'https://new.example/v1')
  assert.equal(readApiKeyRequestUrlDraft(state, item), 'https://new.example/v1')
  assert.equal(setApiKeyRoutePathDraft(state, item, 'responses'), 'responses')
  assert.equal(readApiKeyRoutePathDraft(state, item), 'responses')
  assert.deepEqual(setApiKeyImagePathDraft(state, item, 'generation', '/v1/images'), {
    generationPath: '/v1/images',
    editPath: '/images/edit',
  })
  assert.deepEqual(setApiKeyImagePathDraft(state, item, 'edit', '/v1/edits'), {
    generationPath: '/v1/images',
    editPath: '/v1/edits',
  })

  removeApiKeyDrafts(state, item)
  assert.deepEqual(state, {
    requestUrls: {},
    routePaths: {},
    imageGenerationPaths: {},
    imageEditPaths: {},
  })
})
