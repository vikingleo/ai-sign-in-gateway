type GatewayVisibilityDocument = {
  readonly visibilityState: string
}

type GatewayPageLifecycleEventHandler = () => void

type GatewayPageLifecycleWindow = {
  addEventListener: (type: 'site-groups:changed', handler: GatewayPageLifecycleEventHandler) => void
  removeEventListener: (type: 'site-groups:changed', handler: GatewayPageLifecycleEventHandler) => void
}

type GatewayPageLifecycleDocument = {
  addEventListener: (type: 'visibilitychange', handler: GatewayPageLifecycleEventHandler) => void
  removeEventListener: (type: 'visibilitychange', handler: GatewayPageLifecycleEventHandler) => void
}

export type GatewayVisibilityPlatformOptions = {
  visibilityDocument: GatewayVisibilityDocument
}

export type GatewayPageLifecycleEventPlatformOptions = {
  lifecycleWindow: GatewayPageLifecycleWindow
  lifecycleDocument: GatewayPageLifecycleDocument
}

export type GatewayPageLifecycleEventHandlers = {
  handleSiteGroupsChanged: GatewayPageLifecycleEventHandler
  handleVisibilityChange: GatewayPageLifecycleEventHandler
}

export function createGatewayVisibilityPlatform({
  visibilityDocument,
}: GatewayVisibilityPlatformOptions) {
  return {
    isVisible: () => visibilityDocument.visibilityState === 'visible',
  }
}

export function createGatewayPageLifecycleEventPlatform({
  lifecycleWindow,
  lifecycleDocument,
}: GatewayPageLifecycleEventPlatformOptions) {
  return {
    addPageListeners: ({
      handleSiteGroupsChanged,
      handleVisibilityChange,
    }: GatewayPageLifecycleEventHandlers) => {
      lifecycleWindow.addEventListener('site-groups:changed', handleSiteGroupsChanged)
      lifecycleDocument.addEventListener('visibilitychange', handleVisibilityChange)
    },
    removePageListeners: ({
      handleSiteGroupsChanged,
      handleVisibilityChange,
    }: GatewayPageLifecycleEventHandlers) => {
      lifecycleWindow.removeEventListener('site-groups:changed', handleSiteGroupsChanged)
      lifecycleDocument.removeEventListener('visibilitychange', handleVisibilityChange)
    },
  }
}
