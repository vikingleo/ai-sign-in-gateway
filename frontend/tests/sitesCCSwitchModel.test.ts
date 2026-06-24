import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCCSwitchSectionOptions,
  ccSwitchFileButtonLabel,
  ccSwitchImportOkText,
  ccSwitchImportPlaceholder,
  ccSwitchUnavailableMessage,
  filterCCSwitchPreviewRows,
  readCCSwitchPreviewError,
  readCCSwitchPreviewPayload,
} from '../src/sitesCCSwitchModel.ts'
import type { CCSwitchPreviewRow } from '../src/sitesViewModel.ts'

function row(overrides: Partial<CCSwitchPreviewRow>): CCSwitchPreviewRow {
  return {
    key: 'codex:fast',
    sectionKey: 'codex',
    app: 'Codex',
    order: 1,
    isCurrent: false,
    name: 'Fast',
    website: 'https://fast.example',
    apiKeyStatus: '已带入',
    hasAuth: true,
    note: '',
    ...overrides,
  }
}

test('builds cc-switch section options in preview order with counts', () => {
  assert.deepEqual(buildCCSwitchSectionOptions([
    row({ key: 'codex:a', sectionKey: 'codex', app: 'Codex' }),
    row({ key: 'codex:b', sectionKey: 'codex', app: 'Codex' }),
    row({ key: 'gemini:a', sectionKey: 'gemini', app: 'Gemini' }),
  ]), [
    { label: 'Codex (2)', value: 'codex' },
    { label: 'Gemini (1)', value: 'gemini' },
  ])
})

test('filters cc-switch preview rows by selected section and search text', () => {
  const rows = [
    row({ key: 'codex:fast', sectionKey: 'codex', app: 'Codex', name: 'Fast', note: 'primary' }),
    row({ key: 'gemini:slow', sectionKey: 'gemini', app: 'Gemini', name: 'Slow', apiKeyStatus: '留空' }),
  ]

  assert.deepEqual(filterCCSwitchPreviewRows(rows, [], 'PRIMARY').map((item) => item.key), ['codex:fast'])
  assert.deepEqual(filterCCSwitchPreviewRows(rows, ['gemini'], '').map((item) => item.key), ['gemini:slow'])
  assert.deepEqual(filterCCSwitchPreviewRows(rows, ['gemini'], '已带入').map((item) => item.key), [])
})

test('resolves cc-switch preview payload and error text by import mode', () => {
  const payload = { codex: { providers: {} } }

  assert.deepEqual(readCCSwitchPreviewPayload('json', JSON.stringify(payload), null), payload)
  assert.equal(readCCSwitchPreviewPayload('json', '{bad', null), null)
  assert.equal(readCCSwitchPreviewPayload('sql', '{bad', payload), payload)
  assert.equal(readCCSwitchPreviewError({
    mode: 'json',
    importText: '{bad',
    previewPayload: null,
    resolveError: '',
  }), '当前内容不是有效 JSON。')
  assert.equal(readCCSwitchPreviewError({
    mode: 'sql',
    importText: 'insert into providers',
    previewPayload: null,
    resolveError: 'SQL 解析失败',
  }), 'SQL 解析失败')
  assert.equal(readCCSwitchPreviewError({
    mode: 'json',
    importText: '',
    previewPayload: null,
    resolveError: 'ignored',
  }), '')
})

test('formats cc-switch import controls by mode', () => {
  assert.equal(ccSwitchImportPlaceholder('json'), '粘贴 .web.json 内容，导入后会完整替换当前供应商列表')
  assert.equal(ccSwitchImportPlaceholder('sql'), '粘贴 cc-switch 桌面版 SQL 备份内容，解析后会转换为可导入的供应商配置')
  assert.equal(ccSwitchFileButtonLabel('json'), '选择 JSON 文件')
  assert.equal(ccSwitchFileButtonLabel('sql'), '选择 SQL 文件')
  assert.equal(ccSwitchImportOkText('json'), '开始替换')
  assert.equal(ccSwitchImportOkText('sql'), '解析并替换')
})

test('documents cc-switch unavailable state while Go handlers are not registered', () => {
  assert.equal(ccSwitchUnavailableMessage, 'CC-Switch 导入导出功能尚未接入 Go 后端。')
})
