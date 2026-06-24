import { includesSearch } from './viewUtils.ts'
import { parseCCSwitchJsonPayload, type CCSwitchPreviewRow } from './sitesViewModel.ts'

export type CCSwitchImportMode = 'json' | 'sql'

export type CCSwitchSectionOption = {
  label: string
  value: string
}

export const ccSwitchUnavailableMessage = 'CC-Switch 导入导出功能尚未接入 Go 后端。'

export function buildCCSwitchSectionOptions(rows: readonly CCSwitchPreviewRow[]): CCSwitchSectionOption[] {
  const seen = new Set<string>()
  return rows
    .filter((row) => {
      if (seen.has(row.sectionKey)) {
        return false
      }
      seen.add(row.sectionKey)
      return true
    })
    .map((row) => ({
      label: `${row.app} (${rows.filter((item) => item.sectionKey === row.sectionKey).length})`,
      value: row.sectionKey,
    }))
}

export function filterCCSwitchPreviewRows(
  rows: readonly CCSwitchPreviewRow[],
  selectedSections: readonly string[],
  search: string,
): CCSwitchPreviewRow[] {
  const keyword = search.trim().toLowerCase()
  if (!selectedSections.length) {
    return rows.filter((row) =>
      includesSearch([row.app, row.name, row.website, row.note, row.apiKeyStatus], keyword),
    )
  }
  const selected = new Set(selectedSections)
  return rows.filter(
    (row) =>
      selected.has(row.sectionKey) &&
      includesSearch([row.app, row.name, row.website, row.note, row.apiKeyStatus], keyword),
  )
}

export function readCCSwitchPreviewPayload(
  mode: CCSwitchImportMode,
  importText: string,
  resolvedPayload: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (mode === 'sql') {
    return resolvedPayload
  }
  return parseCCSwitchJsonPayload(importText)
}

export function readCCSwitchPreviewError(input: {
  mode: CCSwitchImportMode
  importText: string
  previewPayload: Record<string, unknown> | null
  resolveError: string
}): string {
  if (!input.importText.trim()) {
    return ''
  }
  if (input.mode === 'sql') {
    return input.resolveError
  }
  return input.previewPayload ? '' : '当前内容不是有效 JSON。'
}

export function ccSwitchImportPlaceholder(mode: CCSwitchImportMode): string {
  return mode === 'sql'
    ? '粘贴 cc-switch 桌面版 SQL 备份内容，解析后会转换为可导入的供应商配置'
    : '粘贴 .web.json 内容，导入后会完整替换当前供应商列表'
}

export function ccSwitchFileButtonLabel(mode: CCSwitchImportMode): string {
  return mode === 'sql' ? '选择 SQL 文件' : '选择 JSON 文件'
}

export function ccSwitchImportOkText(mode: CCSwitchImportMode): string {
  return mode === 'sql' ? '解析并替换' : '开始替换'
}
