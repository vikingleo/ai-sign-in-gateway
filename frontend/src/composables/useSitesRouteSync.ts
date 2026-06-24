import { syncGatewayRoutes } from '../api'
import type { useToast } from '../toast'

type Toast = ReturnType<typeof useToast>

type UseSitesRouteSyncOptions = {
  toast: Toast
}

export function useSitesRouteSync(options: UseSitesRouteSyncOptions) {
  async function syncRoutesAfterSiteChange() {
    try {
      const result = await syncGatewayRoutes()
      options.toast.success(`路由池已同步：${result.route_count} 条路由。`)
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '路由池同步失败')
    }
  }

  async function syncRoutesAfterApiKeyUpdate(successCount: number) {
    if (successCount <= 0) {
      return
    }
    await syncRoutesAfterSiteChange()
  }

  return {
    syncRoutesAfterSiteChange,
    syncRoutesAfterApiKeyUpdate,
  }
}
