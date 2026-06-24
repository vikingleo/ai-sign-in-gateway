import {
  ApiOutlined,
  ClusterOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  FundProjectionScreenOutlined,
  MessageOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getGatewayOverview, getMe, isAbortError, logout } from './api'
import { onGatewayOverviewChanged } from './gatewayOverviewEvents'
import type { AdminUser, GatewayOverview } from './types'

const mobileNavigationQuery = '(max-width: 900px)'

const enabledFeatureKeys = new Set([
  'overview',
  'sites',
  'gateway-routes',
  'gateway-monitor',
  'chat-test',
  'settings',
])

const navigation = [
  { key: 'overview', label: '总览', to: '/overview', icon: DashboardOutlined, description: '关键指标、执行状态与异常站点。' },
  { key: 'sites', label: '站点中心', to: '/sites', icon: ClusterOutlined, description: '站点授权、批量签到与状态巡检。' },
  { key: 'gateway-routes', label: '路由管理', to: '/gateway/routes', icon: DeploymentUnitOutlined, description: '统一出口路由池、熔断状态与上游维护。' },
  { key: 'gateway-monitor', label: '网关监控', to: '/gateway/monitor', icon: FundProjectionScreenOutlined, description: '请求趋势、策略统计与网关访问配置。' },
  { key: 'chat-test', label: '对话', to: '/chat-test', icon: MessageOutlined, description: '按站点读取模型并发起对话或图片生成。' },
  { key: 'settings', label: '设置', to: '/settings', icon: SettingOutlined, description: '调度计划、超时与执行策略。' },
]

export function useShellLayoutController() {
  const route = useRoute()
  const router = useRouter()
  const admin = ref<AdminUser | null>(null)
  const collapsed = ref(false)
  const gatewayOverview = ref<GatewayOverview | null>(null)
  let kpiTimer: number | null = null
  let stopGatewayOverviewListener: (() => void) | null = null
  let mounted = false
  let mobileQuery: MediaQueryList | null = null
  let stopMobileQueryListener: (() => void) | null = null
  let adminController: AbortController | null = null
  let kpiController: AbortController | null = null
  let kpiLoading = false

  const visibleNavigation = computed(() => navigation.filter((item) => enabledFeatureKeys.has(item.key)))
  const selectedNavigationKeys = computed(() => {
    const matched = visibleNavigation.value.find((item) => route.path === item.to || route.path.startsWith(`${item.to}/`))
    return [matched?.to ?? route.path]
  })
  const activeNavigation = computed(() =>
    visibleNavigation.value.find((item) => route.path === item.to || route.path.startsWith(`${item.to}/`)) ??
    visibleNavigation.value[0] ??
    navigation[0],
  )
  const headerKpis = computed(() => {
    const ov = gatewayOverview.value
    if (!ov) return []
    return [
      { key: 'balance', label: '总额度', value: ov.total_balance_display || '暂无', tone: 'info' as const },
      { key: 'requests', label: '24h 请求', value: String(ov.request_count_24h ?? 0), tone: 'primary' as const },
      { key: 'success', label: '成功率', value: `${ov.success_rate_24h ?? 0}%`, tone: 'success' as const },
      { key: 'concurrency', label: '当前并发', value: String(ov.active_concurrency ?? 0), tone: 'neutral' as const },
      { key: 'today-peak-concurrency', label: '今日峰值', value: String(ov.max_concurrency_today ?? 0), tone: 'warning' as const },
      { key: 'all-time-peak-concurrency', label: '历史峰值', value: String(ov.max_concurrency_all_time ?? 0), tone: 'info' as const },
    ]
  })

  async function loadAdmin() {
    adminController?.abort()
    const controller = new AbortController()
    adminController = controller
    try {
      const adminData = await getMe({ signal: controller.signal })
      if (!mounted || controller.signal.aborted) return
      admin.value = adminData
    } catch (err) {
      if (isAbortError(err) || !mounted) return
      logout()
      router.push('/login')
    } finally {
      if (adminController === controller) {
        adminController = null
      }
    }
  }

  async function loadGatewayKpi() {
    if (kpiLoading || !mounted) return
    kpiLoading = true
    kpiController?.abort()
    const controller = new AbortController()
    kpiController = controller
    try {
      const overview = await getGatewayOverview({ signal: controller.signal })
      if (mounted && !controller.signal.aborted) {
        gatewayOverview.value = overview
      }
    } catch (err) {
      if (!isAbortError(err)) {
        console.warn('网关概览刷新失败', err)
      }
    } finally {
      if (kpiController === controller) {
        kpiController = null
      }
      kpiLoading = false
    }
  }

  function navigate(to: string) {
    router.push(to)
  }

  function signOut() {
    logout()
    router.push('/login')
  }

  function adminRoleLabel(role?: string) {
    return role === 'super_admin' ? '超级管理员' : '管理员'
  }

  function adminRoleColor(role?: string) {
    return role === 'super_admin' ? 'gold' : 'default'
  }

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  onMounted(async () => {
    mounted = true
    mobileQuery = window.matchMedia(mobileNavigationQuery)
    collapsed.value = mobileQuery.matches
    const handleMobileQueryChange = (event: MediaQueryListEvent) => {
      collapsed.value = event.matches
    }
    mobileQuery.addEventListener('change', handleMobileQueryChange)
    stopMobileQueryListener = () => mobileQuery?.removeEventListener('change', handleMobileQueryChange)
    await loadAdmin()
    if (!mounted) return
    await loadGatewayKpi()
    if (!mounted) return
    stopGatewayOverviewListener = onGatewayOverviewChanged(loadGatewayKpi)
    kpiTimer = window.setInterval(loadGatewayKpi, 30_000)
  })

  onBeforeUnmount(() => {
    mounted = false
    stopMobileQueryListener?.()
    stopMobileQueryListener = null
    mobileQuery = null
    stopGatewayOverviewListener?.()
    stopGatewayOverviewListener = null
    adminController?.abort()
    adminController = null
    kpiController?.abort()
    kpiController = null
    if (kpiTimer !== null) {
      window.clearInterval(kpiTimer)
      kpiTimer = null
    }
  })

  return reactive({
    admin,
    collapsed,
    visibleNavigation,
    selectedNavigationKeys,
    activeNavigation,
    headerKpis,
    navigate,
    signOut,
    adminRoleLabel,
    adminRoleColor,
    toggleCollapsed,
    ApiOutlined,
  })
}
