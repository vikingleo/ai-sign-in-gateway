import {
  buildGatewayApiKeyCopyErrorPlan,
  buildGatewayApiKeyCopySuccessPlan,
  buildGatewayApiKeyMissingPlan,
  buildGatewayRequestUrl,
  buildGatewayRequestUrlCopyErrorPlan,
  buildGatewayRequestUrlCopySuccessPlan,
  normalizeGatewayApiKeyCopyValue,
} from './gatewayAccessModel.ts'

type GatewayAccessNoticePlan = {
  notice: {
    tone: 'success' | 'error'
    message: string
  }
}

export type CopyGatewayRequestUrlToClipboardOptions = {
  requestUrl: string
  writeText: (value: string) => Promise<void>
  showPlanNotice: (plan: GatewayAccessNoticePlan) => void
}

export type CopyGatewayApiKeyToClipboardOptions = {
  apiKey: string
  writeText: (value: string) => Promise<void>
  showPlanNotice: (plan: GatewayAccessNoticePlan) => void
}

export type CopyGatewayRequestUrlActionOptions = Omit<CopyGatewayRequestUrlToClipboardOptions, 'requestUrl'> & {
  getRequestUrl: () => string
}

export type CopyGatewayApiKeyActionOptions = Omit<CopyGatewayApiKeyToClipboardOptions, 'apiKey'> & {
  getApiKey: () => string
}

type GatewayRequestUrlLocation = {
  origin: string
}

export type GatewayRequestUrlActionOptions = {
  getApiBase: () => string
  location: GatewayRequestUrlLocation
}

export function createGatewayRequestUrlAction({
  getApiBase,
  location,
}: GatewayRequestUrlActionOptions) {
  return () => buildGatewayRequestUrl(getApiBase(), location.origin)
}

export function createCopyGatewayRequestUrlAction({
  getRequestUrl,
  writeText,
  showPlanNotice,
}: CopyGatewayRequestUrlActionOptions) {
  return () =>
    copyGatewayRequestUrlToClipboard({
      requestUrl: getRequestUrl(),
      writeText,
      showPlanNotice,
    })
}

export function createCopyGatewayApiKeyAction({
  getApiKey,
  writeText,
  showPlanNotice,
}: CopyGatewayApiKeyActionOptions) {
  return () =>
    copyGatewayApiKeyToClipboard({
      apiKey: getApiKey(),
      writeText,
      showPlanNotice,
    })
}

export async function copyGatewayRequestUrlToClipboard({
  requestUrl,
  writeText,
  showPlanNotice,
}: CopyGatewayRequestUrlToClipboardOptions) {
  try {
    await writeText(requestUrl)
    showPlanNotice(buildGatewayRequestUrlCopySuccessPlan())
  } catch {
    showPlanNotice(buildGatewayRequestUrlCopyErrorPlan())
  }
}

export async function copyGatewayApiKeyToClipboard({
  apiKey,
  writeText,
  showPlanNotice,
}: CopyGatewayApiKeyToClipboardOptions) {
  const value = normalizeGatewayApiKeyCopyValue(apiKey)
  const missingPlan = buildGatewayApiKeyMissingPlan(value)
  if (missingPlan.isMissing) {
    if (missingPlan.notice) {
      showPlanNotice({ notice: missingPlan.notice })
    }
    return
  }
  try {
    await writeText(value)
    showPlanNotice(buildGatewayApiKeyCopySuccessPlan())
  } catch {
    showPlanNotice(buildGatewayApiKeyCopyErrorPlan())
  }
}
