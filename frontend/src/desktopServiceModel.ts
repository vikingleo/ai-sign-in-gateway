import {
  ApiOutlined,
  DashboardOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue'
import type { GatewayOverview, OverviewData, SettingsData } from './types'

export function createDesktopSettings(): SettingsData {
  return {
    timezone: 'Asia/Shanghai',
    schedule_enabled: true,
    daily_run_time: '09:00',
    checkin_concurrency: 1,
    checkin_global_concurrency: 4,
    checkin_interval_seconds: 1,
    retry_count: 1,
    request_timeout: 20,
    only_enabled_sites: true,
    desktop_keep_running: false,
    database_backup_enabled: false,
    database_backup_dir: '',
    database_backup_interval_minutes: 1440,
    database_backup_retention: 7,
    log_retention_days: 5,
    gateway_pricing_active_scheme_id: 'official',
    gateway_pricing_schemes: [],
    feature_flags: {},
    features: [],
    desktop_frontend_default_port: 3721,
    desktop_frontend_port: 0,
    desktop_frontend_url: '',
    desktop_frontend_default_port_occupant: '',
    desktop_backend_default_port: 8972,
    desktop_backend_port: 0,
    desktop_backend_url: '',
    desktop_backend_default_port_occupant: '',
    desktop_gateway_url: '',
    runtime_config_dir: '',
    runtime_default_config_dir: '',
    runtime_database_path: '',
    runtime_pending_config_dir: '',
    security_warnings: [],
  }
}

export function joinAppPath(base: string, path: string) {
  try {
    return new URL(path, base.endsWith('/') ? base : `${base}/`).toString()
  } catch {
    return path
  }
}

export function buildDesktopServiceItems(
  settings: SettingsData,
  gatewayApiUrl: string,
  gatewayOverview: GatewayOverview | null,
) {
  return [
    {
      key: 'frontend',
      label: '管理前端',
      value: settings.desktop_frontend_url || '-',
      meta: settings.desktop_frontend_port ? `:${settings.desktop_frontend_port}` : '未监听',
      ok: Boolean(settings.desktop_frontend_url),
    },
    {
      key: 'backend',
      label: '后台服务',
      value: settings.desktop_backend_url || '-',
      meta: settings.desktop_backend_port ? `:${settings.desktop_backend_port}` : '未监听',
      ok: Boolean(settings.desktop_backend_url),
    },
    {
      key: 'gateway',
      label: '网关出口',
      value: gatewayApiUrl || '-',
      meta: gatewayOverview ? `${gatewayOverview.healthy_routes}/${gatewayOverview.total_routes} 可用` : '待刷新',
      ok: Boolean(settings.desktop_gateway_url),
    },
  ]
}

export function buildDesktopSummaryItems(overview: OverviewData | null, gatewayOverview: GatewayOverview | null) {
  return [
    {
      key: 'balance',
      label: '总余额',
      value: gatewayOverview?.total_balance_display || '暂无',
      icon: DashboardOutlined,
      tone: 'blue',
    },
    {
      key: 'routes',
      label: '可用路由',
      value: gatewayOverview ? `${gatewayOverview.healthy_routes}/${gatewayOverview.total_routes}` : '-',
      icon: ApiOutlined,
      tone: 'green',
    },
    {
      key: 'sites',
      label: '启用站点',
      value: overview ? `${overview.enabled_site_count}/${overview.site_count}` : '-',
      icon: GlobalOutlined,
      tone: 'slate',
    },
    {
      key: 'runs',
      label: '今日执行',
      value: overview ? `${overview.today_success}/${overview.today_failed}` : '-',
      icon: ThunderboltOutlined,
      tone: 'amber',
    },
  ]
}

export function buildRuntimeProblems(
  settings: SettingsData,
  overview: OverviewData | null,
  gatewayOverview: GatewayOverview | null,
) {
  return [
    meaningfulPortOccupant(settings.desktop_frontend_default_port_occupant)
      ? `前端默认端口占用：${settings.desktop_frontend_default_port_occupant}`
      : '',
    meaningfulPortOccupant(settings.desktop_backend_default_port_occupant)
      ? `后端默认端口占用：${settings.desktop_backend_default_port_occupant}`
      : '',
    gatewayOverview?.open_circuit_routes ? `熔断路由：${gatewayOverview.open_circuit_routes}` : '',
    overview?.today_failed ? `今日失败：${overview.today_failed}` : '',
  ].filter(Boolean)
}

function meaningfulPortOccupant(value: string) {
  const normalized = value.trim()
  return Boolean(normalized && normalized !== '当前程序' && normalized !== '未占用')
}
