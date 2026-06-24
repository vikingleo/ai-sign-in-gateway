type UsageLoadPlanOptions = {
  isMonitor: boolean
  start: string
  end: string
  silent: boolean
}

type UsageLoadPlan = {
  shouldLoad: true
  clearUsage: false
  showInvalidRangeError: false
  invalidRangeNotice: null
  requestRange: {
    start: string
    end: string
  }
} | {
  shouldLoad: false
  clearUsage: boolean
  showInvalidRangeError: boolean
  invalidRangeNotice: {
    tone: 'error'
    message: string
  } | null
  requestRange: null
}

type UsageLoadResultPlanOptions = {
  mounted: boolean
  aborted: boolean
}

type UsageLoadErrorPlanOptions = UsageLoadResultPlanOptions & {
  silent: boolean
  errorMessage: string | null
}

type UsageLoadErrorPlan = {
  showError: true
  errorMessage: string
  notice: {
    tone: 'error'
    message: string
  }
} | {
  showError: false
  errorMessage: null
}

const gatewayUsageLoadFailureMessage = '网关消耗加载失败'
const gatewayUsageInvalidRangeMessage = '请选择有效的开始和结束时间'

export function buildGatewayUsageLoadPlan({
  isMonitor,
  start,
  end,
  silent,
}: UsageLoadPlanOptions): UsageLoadPlan {
  if (!isMonitor) {
    return {
      shouldLoad: false,
      clearUsage: true,
      showInvalidRangeError: false,
      invalidRangeNotice: null,
      requestRange: null,
    }
  }
  if (!start || !end) {
    return {
      shouldLoad: false,
      clearUsage: false,
      showInvalidRangeError: !silent,
      invalidRangeNotice: silent ? null : {
        tone: 'error',
        message: gatewayUsageInvalidRangeMessage,
      },
      requestRange: null,
    }
  }
  return {
    shouldLoad: true,
    clearUsage: false,
    showInvalidRangeError: false,
    invalidRangeNotice: null,
    requestRange: { start, end },
  }
}

export function buildGatewayUsageLoadResultPlan({ mounted, aborted }: UsageLoadResultPlanOptions) {
  return {
    applyUsage: mounted && !aborted,
  }
}

export function buildGatewayUsageLoadErrorPlan({
  aborted,
  mounted,
  silent,
  errorMessage,
}: UsageLoadErrorPlanOptions): UsageLoadErrorPlan {
  if (aborted || !mounted || silent) {
    return {
      showError: false,
      errorMessage: null,
    }
  }
  const message = errorMessage ?? gatewayUsageLoadFailureMessage
  return {
    showError: true,
    errorMessage: message,
    notice: {
      tone: 'error',
      message,
    },
  }
}
