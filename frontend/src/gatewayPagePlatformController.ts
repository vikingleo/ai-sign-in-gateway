import {
  createGatewayPageLifecycleEventPlatform,
  createGatewayVisibilityPlatform,
} from './gatewayVisibilityPlatformController.ts'

type GatewayPagePlatformWindow = {
  location: {
    origin: string
  }
  confirm: (message: string) => boolean
  addEventListener: (type: 'site-groups:changed', handler: () => void) => void
  removeEventListener: (type: 'site-groups:changed', handler: () => void) => void
  setInterval: (handler: () => void, timeout: number) => number
  clearInterval: (timer: number) => void
}

type GatewayPagePlatformDocument = {
  readonly visibilityState: string
  addEventListener: (type: 'visibilitychange', handler: () => void) => void
  removeEventListener: (type: 'visibilitychange', handler: () => void) => void
}

type GatewayPagePlatformNavigator = {
  clipboard: {
    writeText: (value: string) => Promise<void>
  }
}

type GatewayPagePlatformOptions = {
  platformWindow: GatewayPagePlatformWindow
  platformDocument: GatewayPagePlatformDocument
  platformNavigator: GatewayPagePlatformNavigator
}

export function createGatewayPagePlatform({
  platformWindow,
  platformDocument,
  platformNavigator,
}: GatewayPagePlatformOptions) {
  return {
    location: platformWindow.location,
    writeText: platformNavigator.clipboard.writeText.bind(platformNavigator.clipboard),
    confirmWindow: platformWindow,
    timerWindow: platformWindow,
    visibility: createGatewayVisibilityPlatform({
      visibilityDocument: platformDocument,
    }),
    lifecycle: createGatewayPageLifecycleEventPlatform({
      lifecycleWindow: platformWindow,
      lifecycleDocument: platformDocument,
    }),
  }
}

export type GatewayPagePlatform = ReturnType<typeof createGatewayPagePlatform>
