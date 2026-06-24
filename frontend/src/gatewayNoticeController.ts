export type GatewayNotice = {
  tone: 'success' | 'error' | 'info'
  message: string
}

export type GatewayNoticePlan = {
  notice: GatewayNotice
}

type GatewayNoticeToast = {
  [Tone in GatewayNotice['tone']]: (message: string) => void
}

export function createGatewayNoticeActions({
  toast,
}: {
  toast: GatewayNoticeToast
}) {
  function showNotice(notice: GatewayNotice) {
    toast[notice.tone](notice.message)
  }

  return {
    showNotice,
    showPlanNotice(plan: GatewayNoticePlan) {
      showNotice(plan.notice)
    },
  }
}

export type GatewayNoticeActions = ReturnType<typeof createGatewayNoticeActions>
