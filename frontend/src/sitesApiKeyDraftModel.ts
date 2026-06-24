import { apiKeyDraftKey, type SiteApiKeyEntry } from './sitesApiKeyModel.ts'

export type SiteApiKeyDraftState = {
  requestUrls: Record<string, string>
  routePaths: Record<string, string>
  imageGenerationPaths: Record<string, string>
  imageEditPaths: Record<string, string>
}

export function resetApiKeyDraftState(state: SiteApiKeyDraftState, entries: readonly SiteApiKeyEntry[]): void {
  clearApiKeyDraftState(state)
  entries.forEach((entry) => {
    const key = apiKeyDraftKey(entry)
    state.requestUrls[key] = entry.requestBaseURLs.join('\n')
    state.routePaths[key] = entry.routePath
    state.imageGenerationPaths[key] = entry.imageGenerationPath
    state.imageEditPaths[key] = entry.imageEditPath
  })
}

export function clearApiKeyDraftState(state: SiteApiKeyDraftState): void {
  ;[state.requestUrls, state.routePaths, state.imageGenerationPaths, state.imageEditPaths].forEach((drafts) => {
    Object.keys(drafts).forEach((key) => delete drafts[key])
  })
}

export function removeApiKeyDrafts(state: SiteApiKeyDraftState, entry: SiteApiKeyEntry): void {
  const key = apiKeyDraftKey(entry)
  delete state.requestUrls[key]
  delete state.routePaths[key]
  delete state.imageGenerationPaths[key]
  delete state.imageEditPaths[key]
}

export function readApiKeyRequestUrlDraft(state: SiteApiKeyDraftState, entry: SiteApiKeyEntry): string {
  return state.requestUrls[apiKeyDraftKey(entry)] ?? entry.requestBaseURLs.join('\n')
}

export function readApiKeyRoutePathDraft(state: SiteApiKeyDraftState, entry: SiteApiKeyEntry): string {
  return state.routePaths[apiKeyDraftKey(entry)] ?? entry.routePath
}

export function readApiKeyImageGenerationPathDraft(state: SiteApiKeyDraftState, entry: SiteApiKeyEntry): string {
  return state.imageGenerationPaths[apiKeyDraftKey(entry)] ?? entry.imageGenerationPath
}

export function readApiKeyImageEditPathDraft(state: SiteApiKeyDraftState, entry: SiteApiKeyEntry): string {
  return state.imageEditPaths[apiKeyDraftKey(entry)] ?? entry.imageEditPath
}

export function setApiKeyRequestUrlDraft(state: SiteApiKeyDraftState, entry: SiteApiKeyEntry, value: string): string {
  state.requestUrls[apiKeyDraftKey(entry)] = value
  return value
}

export function setApiKeyRoutePathDraft(state: SiteApiKeyDraftState, entry: SiteApiKeyEntry, value: unknown): string {
  const routePath = typeof value === 'string' ? value : ''
  state.routePaths[apiKeyDraftKey(entry)] = routePath
  return routePath
}

export function setApiKeyImagePathDraft(
  state: SiteApiKeyDraftState,
  entry: SiteApiKeyEntry,
  field: 'generation' | 'edit',
  value: string,
): { generationPath: string; editPath: string } {
  const key = apiKeyDraftKey(entry)
  if (field === 'generation') {
    state.imageGenerationPaths[key] = value
  } else {
    state.imageEditPaths[key] = value
  }
  return {
    generationPath: state.imageGenerationPaths[key] ?? entry.imageGenerationPath,
    editPath: state.imageEditPaths[key] ?? entry.imageEditPath,
  }
}
