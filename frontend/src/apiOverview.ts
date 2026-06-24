import { request, type RequestOptions } from './apiCore'
import type { OverviewData, PluginMeta } from './types'

export function getOverview(options: RequestOptions = {}): Promise<OverviewData> {
  return request('/overview', { signal: options.signal })
}

export function getPlugins(): Promise<PluginMeta[]> {
  return request('/plugins')
}
