import {
  buildGatewayActivityCopyErrorPlan,
  buildGatewayActivityCopySuccessPlan,
  buildGatewayErrorDetailCopySuccessPlan,
  normalizeGatewayActivityCopyUrl,
} from './gatewayActivityDisplayModel.ts'

type GatewayActivityNoticePlan =
  | ReturnType<typeof buildGatewayActivityCopyErrorPlan>
  | ReturnType<typeof buildGatewayActivityCopySuccessPlan>
  | ReturnType<typeof buildGatewayErrorDetailCopySuccessPlan>

export type CopyGatewayActivityUrlToClipboardOptions = {
  value: string
  writeText: (value: string) => Promise<void>
  showPlanNotice: (plan: GatewayActivityNoticePlan) => void
}

export type CopyGatewayActivityUrlActionOptions = Omit<CopyGatewayActivityUrlToClipboardOptions, 'value'>

export function createCopyGatewayActivityUrlAction(options: CopyGatewayActivityUrlActionOptions) {
  return (value: string) =>
    copyGatewayActivityUrlToClipboard({
      ...options,
      value,
    })
}

export function createCopyGatewayErrorDetailAction(options: CopyGatewayActivityUrlActionOptions) {
  return async (value: string) => {
    const normalized = String(value ?? '').trim()
    if (!normalized) {
      return
    }
    try {
      await options.writeText(normalized)
      options.showPlanNotice(buildGatewayErrorDetailCopySuccessPlan())
    } catch {
      options.showPlanNotice(buildGatewayActivityCopyErrorPlan())
    }
  }
}

export async function copyGatewayActivityUrlToClipboard({
  value,
  writeText,
  showPlanNotice,
}: CopyGatewayActivityUrlToClipboardOptions) {
  const normalized = normalizeGatewayActivityCopyUrl(value)
  if (!normalized) {
    return
  }
  try {
    await writeText(normalized)
    showPlanNotice(buildGatewayActivityCopySuccessPlan())
  } catch {
    showPlanNotice(buildGatewayActivityCopyErrorPlan())
  }
}
