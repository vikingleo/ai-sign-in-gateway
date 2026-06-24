import {
  ApiOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons-vue'

export const capabilityCards = [
  {
    icon: ApiOutlined,
    title: '统一管理多家中转站点的签到与额度',
    description: '集中维护授权信息、签到任务、额度状态与账号可用性，减少重复操作和人工巡检成本。',
  },
  {
    icon: NodeIndexOutlined,
    title: '智能路由 + 流式转发，自动熔断与切换',
    description: '支持策略分流、故障隔离与自动切换，提升上游可用性与请求转发稳定性。',
  },
  {
    icon: BarChartOutlined,
    title: '实时观测：策略对比、5 分钟趋势、TTFB',
    description: '以分钟级趋势和响应指标快速定位异常，帮助你持续优化策略、延迟与成功率表现。',
  },
]

export const metricCards = [
  {
    icon: ApiOutlined,
    label: '在线站点数',
    value: '28',
    unit: '个',
    trend: '+3',
    caption: '较昨日 25 个',
    waveform: 'M0 48 L24 38 L48 44 L72 30 L96 42 L120 34 L144 21 L168 35 L192 25 L216 29',
  },
  {
    icon: CheckCircleOutlined,
    label: '今日签到成功率',
    value: '98.62',
    unit: '%',
    trend: '+1.24%',
    caption: '成功 1,285 / 1,303',
    progress: 92,
  },
  {
    icon: DashboardOutlined,
    label: '平均 TTFB',
    value: '312',
    unit: 'ms',
    trend: '-28ms',
    caption: '较昨日 340 ms',
    waveform: 'M0 44 L20 32 L40 39 L60 24 L80 41 L100 29 L120 18 L140 38 L160 27 L180 36 L200 26 L220 40',
  },
]
