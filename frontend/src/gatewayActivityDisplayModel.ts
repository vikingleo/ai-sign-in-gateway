import { shortFingerprint } from './viewUtils.ts'
import type { GatewayActiveRequest, GatewayLog } from './types.ts'
import type {
  GatewayErrorDetail,
  GatewayErrorDetailField,
  GatewayErrorDetailLine,
} from './gatewayErrorDetailTypes.ts'
import {
  activeRequestRouteLabel,
  activeRequestURL,
  logModelMeta,
  logRequestLabel,
  logUserAgent,
} from './gatewayActivityRequestModel.ts'

export {
  activeRequestMeta,
  activeRequestRouteLabel,
  activeRequestURL,
  logActualModel,
  logMethodLabel,
  logModelMeta,
  logRequestLabel,
  logRequestedModel,
  logRequestURL,
  logUserAgent,
  requestMethodColor,
} from './gatewayActivityRequestModel.ts'

export type {
  GatewayErrorDetail,
  GatewayErrorDetailField,
  GatewayErrorDetailLine,
} from './gatewayErrorDetailTypes.ts'

export function asGatewayLog(record: unknown) {
  return record as GatewayLog
}

export function gatewayLogRowKey(record: GatewayLog) {
  return record.id
}

export function normalizeGatewayActivityCopyUrl(value: string) {
  return value.trim()
}

export function buildGatewayActivityCopyErrorPlan() {
  return {
    notice: {
      tone: 'error' as const,
      message: '复制失败，请手动复制。',
    },
  }
}

export function buildGatewayActivityCopySuccessPlan() {
  return {
    notice: {
      tone: 'success' as const,
      message: '请求 URL 已复制。',
    },
  }
}

export function buildGatewayErrorDetailCopySuccessPlan() {
  return {
    notice: {
      tone: 'success' as const,
      message: '错误详情已复制。',
    },
  }
}

export function logRouteLabel(log: GatewayLog) {
  const label = String(log.route_label ?? '').trim()
  if (label) {
    return label
  }
  const parts = [
    log.route_id ? `#${log.route_id}` : '',
    log.site_name || (log.site_id ? `站点 #${log.site_id}` : ''),
    log.key_name,
  ].filter(Boolean)
  return parts.length ? parts.join(' / ') : '未知路由'
}

export function logRouteMeta(log: GatewayLog) {
  const values = [
    log.route_id ? `Route #${log.route_id}` : 'Route 未知',
    log.site_id ? `站点 #${log.site_id}` : '',
    log.key_fingerprint ? `Key ${shortFingerprint(log.key_fingerprint)}` : '',
  ].filter(Boolean)
  return values.join(' / ')
}

export function logAttemptRouteLabel(attempt: GatewayLog['transfer_to'] | GatewayActiveRequest['transfer_to']) {
  if (!attempt) {
    return ''
  }
  const label = String(attempt.route_label ?? '').trim()
  if (label) {
    return label
  }
  const parts = [
    attempt.route_id ? `#${attempt.route_id}` : '',
    attempt.site_name || (attempt.site_id ? `站点 #${attempt.site_id}` : ''),
    attempt.key_name,
  ].filter(Boolean)
  return parts.join(' · ')
}

export function logAttemptStatusLabel(attempt: GatewayLog['final_attempt'] | GatewayActiveRequest['final_attempt']) {
  if (!attempt) {
    return '未记录'
  }
  const status = attempt.status_code ? `HTTP ${attempt.status_code}` : ''
  const result = attempt.success ? '成功' : '失败'
  return [result, status].filter(Boolean).join(' ')
}

export function logTransferLines(log: GatewayLog) {
  const lines: GatewayErrorDetailLine[] = []
  const failureReason = String(log.failure_reason ?? '').trim()
  if (failureReason) {
    lines.push({ label: '报错', value: failureReason, tone: 'error' })
  }
  if (log.transfer_to) {
    const route = logAttemptRouteLabel(log.transfer_to) || '未知路由'
    lines.push({ label: '转移到', value: `${route} · 尝试 ${log.transfer_to.attempt_index} · ${logAttemptStatusLabel(log.transfer_to)}`, tone: log.transfer_to.success ? 'success' : 'info' })
  }
  if (log.final_attempt && log.final_attempt.id !== log.id && log.final_attempt.id !== log.transfer_to?.id) {
    const route = logAttemptRouteLabel(log.final_attempt) || '未知路由'
    lines.push({ label: '最终', value: `${route} · 尝试 ${log.final_attempt.attempt_index} · ${logAttemptStatusLabel(log.final_attempt)}`, tone: log.final_attempt.success ? 'success' : 'error' })
  }
  if (log.previous_error?.failure_reason && log.success) {
    const route = logAttemptRouteLabel(log.previous_error) || '上一条路由'
    lines.push({ label: '上次失败', value: `${route} · ${log.previous_error.failure_reason}`, tone: 'error' })
  }
  return lines
}

export function activeRequestTransferLines(item: GatewayActiveRequest) {
  const lines: GatewayErrorDetailLine[] = []
  const failureReason = String(item.failure_reason ?? '').trim()
  if (failureReason) {
    lines.push({ label: '报错', value: failureReason, tone: 'error' })
  }
  if (item.previous_error?.failure_reason) {
    const route = logAttemptRouteLabel(item.previous_error) || '上一条路由'
    lines.push({ label: '上次失败', value: `${route} · ${item.previous_error.failure_reason}`, tone: 'error' })
  }
  if (item.transfer_to) {
    const route = logAttemptRouteLabel(item.transfer_to) || '未知路由'
    lines.push({ label: '转移到', value: `${route} · 尝试 ${item.transfer_to.attempt_index} · ${logAttemptStatusLabel(item.transfer_to)}`, tone: item.transfer_to.success ? 'success' : 'info' })
  }
  if (item.final_attempt && item.final_attempt.id !== item.transfer_to?.id) {
    const route = logAttemptRouteLabel(item.final_attempt) || '未知路由'
    lines.push({ label: '最终', value: `${route} · 尝试 ${item.final_attempt.attempt_index} · ${logAttemptStatusLabel(item.final_attempt)}`, tone: item.final_attempt.success ? 'success' : 'error' })
  }
  return lines
}

export function gatewayLogHasErrorDetail(log: GatewayLog) {
  return !log.success ||
    Boolean(String(log.failure_reason ?? '').trim()) ||
    Boolean(String(log.previous_error?.failure_reason ?? '').trim()) ||
    Boolean(String(log.transfer_to?.failure_reason ?? '').trim()) ||
    Boolean(String(log.final_attempt?.failure_reason ?? '').trim())
}

export function gatewayActivityHasErrorDetail(item: {
  success?: boolean | null
  failure_reason?: string | null
  previous_error?: { failure_reason?: string | null } | null
  transfer_to?: { failure_reason?: string | null } | null
  final_attempt?: { failure_reason?: string | null } | null
  transferLines?: GatewayErrorDetailLine[]
}) {
  if (item.success === false) return true
  if (String(item.failure_reason ?? '').trim()) return true
  if (String(item.previous_error?.failure_reason ?? '').trim()) return true
  if (String(item.transfer_to?.failure_reason ?? '').trim()) return true
  if (String(item.final_attempt?.failure_reason ?? '').trim()) return true
  return Boolean(item.transferLines?.some((line) => line.tone === 'error'))
}

function detailField(label: string, value: string | number | boolean | null | undefined): GatewayErrorDetailField | null {
  const normalized = String(value ?? '').trim()
  if (!normalized) {
    return null
  }
  return { label, value: normalized }
}

function compactDetailFields(fields: Array<GatewayErrorDetailField | null>) {
  return fields.filter((field): field is GatewayErrorDetailField => Boolean(field))
}

function gatewayDetailStatus(success: boolean | null | undefined, statusCode: number | null | undefined) {
  const result = success === true ? '成功' : success === false ? '失败' : '进行中'
  const status = statusCode ? `HTTP ${statusCode}` : ''
  return [result, status].filter(Boolean).join(' · ')
}

function appendAttemptFailureLine(
  lines: GatewayErrorDetailLine[],
  label: string,
  attempt: GatewayLog['final_attempt'] | GatewayActiveRequest['final_attempt'],
) {
  const reason = String(attempt?.failure_reason ?? '').trim()
  if (!attempt || !reason) {
    return
  }
  const route = logAttemptRouteLabel(attempt) || '未知路由'
  lines.push({
    label,
    value: `${route} · 尝试 ${attempt.attempt_index} · ${gatewayDetailStatus(attempt.success, attempt.status_code)}\n${reason}`,
    tone: 'error',
  })
}

function gatewayErrorDetailText(fields: GatewayErrorDetailField[], lines: GatewayErrorDetailLine[]) {
  const meta = fields.map((field) => `${field.label}: ${field.value}`)
  const details = lines.map((line) => `[${line.label}]\n${line.value}`)
  return [...meta, details.length ? ['错误信息', ...details].join('\n\n') : '错误信息\n未记录具体错误原因'].join('\n\n')
}

export function buildLogErrorDetail(log: GatewayLog): GatewayErrorDetail {
  const lines = [...logTransferLines(log)]
  appendAttemptFailureLine(lines, '转移错误', log.transfer_to)
  if (log.final_attempt?.id !== log.transfer_to?.id) {
    appendAttemptFailureLine(lines, '最终错误', log.final_attempt)
  }
  if (!lines.length && !log.success) {
    lines.push({ label: '报错', value: '未记录具体错误原因', tone: 'error' })
  }
  const fields = compactDetailFields([
    detailField('请求 ID', log.request_id),
    detailField('状态', gatewayDetailStatus(log.success, log.status_code)),
    detailField('路由', logRouteLabel(log)),
    detailField('站点', log.site_name || (log.site_id ? `#${log.site_id}` : '')),
    detailField('Key', log.key_name || shortFingerprint(log.key_fingerprint)),
    detailField('分组', log.group_name),
    detailField('请求', logRequestLabel(log)),
    detailField('模型', logModelMeta(log)),
    detailField('策略', log.route_strategy),
    detailField('尝试', log.attempt_index),
    detailField('延迟', log.latency_ms !== null ? `${log.latency_ms} ms` : ''),
    detailField('User-Agent', logUserAgent(log)),
    detailField('记录时间', log.created_at),
  ])
  return {
    title: logRouteLabel(log),
    sourceLabel: '最近请求',
    statusLabel: gatewayDetailStatus(log.success, log.status_code),
    success: log.success,
    lines,
    fields,
    fullText: gatewayErrorDetailText(fields, lines),
  }
}

export function buildActiveErrorDetail(item: GatewayActiveRequest): GatewayErrorDetail {
  const lines = [...activeRequestTransferLines(item)]
  appendAttemptFailureLine(lines, '转移错误', item.transfer_to)
  if (item.final_attempt?.id !== item.transfer_to?.id) {
    appendAttemptFailureLine(lines, '最终错误', item.final_attempt)
  }
  if (!lines.length && item.success === false) {
    lines.push({ label: '报错', value: '未记录具体错误原因', tone: 'error' })
  }
  const fields = compactDetailFields([
    detailField('请求 ID', item.request_id),
    detailField('状态', gatewayDetailStatus(item.success ?? null, item.status_code ?? null)),
    detailField('路由', activeRequestRouteLabel(item)),
    detailField('站点', item.site_name || (item.site_id ? `#${item.site_id}` : '')),
    detailField('Key', item.key_name || shortFingerprint(item.key_fingerprint)),
    detailField('分组', item.group_name),
    detailField('请求', `${item.method} ${activeRequestURL(item)}`),
    detailField('模型', `请求 ${String(item.requested_model || '').trim() || '未声明'} / 命中 ${String(item.actual_model || item.requested_model || '').trim() || '待返回'}`),
    detailField('策略', item.route_strategy),
    detailField('尝试', item.attempt_index),
    detailField('耗时', `${item.elapsed_ms} ms`),
    detailField('开始时间', item.started_at),
    detailField('完成时间', item.finished_at ?? ''),
  ])
  return {
    title: activeRequestRouteLabel(item),
    sourceLabel: item.recent ? '实时调用 · 刚完成' : '实时调用',
    statusLabel: gatewayDetailStatus(item.success ?? null, item.status_code ?? null),
    success: item.success === true,
    lines,
    fields,
    fullText: gatewayErrorDetailText(fields, lines),
  }
}
