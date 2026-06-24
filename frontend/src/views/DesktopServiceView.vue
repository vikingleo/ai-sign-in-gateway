<script setup lang="ts">
import {
  ApiOutlined,
  CopyOutlined,
  GlobalOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getGatewayOverview,
  getOverview,
  getSettings,
  isAbortError,
  logout,
  openRuntimeUrl,
} from '../api'
import {
  buildDesktopServiceItems,
  buildDesktopSummaryItems,
  buildRuntimeProblems,
  createDesktopSettings,
  joinAppPath,
} from '../desktopServiceModel'
import { useToast } from '../toast'
import type { GatewayOverview, OverviewData, SettingsData } from '../types'
import SettingsView from './SettingsView.vue'
import '../styles/workspace-surfaces.css'
import '../styles/desktop-service.css'

const toast = useToast()
const router = useRouter()

const loading = ref(false)
const overview = ref<OverviewData | null>(null)
const gatewayOverview = ref<GatewayOverview | null>(null)
let refreshTimer: number | null = null
let mounted = false
let refreshController: AbortController | null = null
let refreshInFlight = false

const settings = reactive<SettingsData>(createDesktopSettings())
const adminUrl = computed(() => joinAppPath(settings.desktop_frontend_url || window.location.origin, '/overview'))
const gatewayApiUrl = computed(() => settings.desktop_gateway_url || joinAppPath(settings.desktop_backend_url || window.location.origin, '/api/gateway'))
const serviceItems = computed(() => buildDesktopServiceItems(settings, gatewayApiUrl.value, gatewayOverview.value))
const summaryItems = computed(() => buildDesktopSummaryItems(overview.value, gatewayOverview.value))
const runtimeProblems = computed(() => buildRuntimeProblems(settings, overview.value, gatewayOverview.value))

async function openUrl(url: string) {
  if (!url || url === '-') {
    toast.error('地址暂不可用。')
    return
  }
  try {
    await openRuntimeUrl(url)
  } catch (err) {
    if (url.startsWith(window.location.origin)) {
      window.location.href = url
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
    toast.error(err instanceof Error ? err.message : '系统浏览器打开失败')
  }
}

async function copyUrl(url: string) {
  if (!url || url === '-') {
    toast.error('地址暂不可用。')
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    toast.success('地址已复制。')
  } catch {
    toast.error('复制失败。')
  }
}

async function refreshAll(showToast = false) {
  if (refreshInFlight || !mounted) {
    return
  }
  refreshInFlight = true
  refreshController?.abort()
  const controller = new AbortController()
  refreshController = controller
  loading.value = true
  try {
    const [settingsData, overviewData, gatewayData] = await Promise.all([
      getSettings({ signal: controller.signal }),
      getOverview({ signal: controller.signal }),
      getGatewayOverview({ signal: controller.signal }),
    ])
    if (!mounted || controller.signal.aborted) {
      return
    }
    Object.assign(settings, settingsData)
    overview.value = overviewData
    gatewayOverview.value = gatewayData
    if (showToast) {
      toast.success('服务状态已刷新。')
    }
  } catch (err) {
    if (isAbortError(err) || !mounted) {
      return
    }
    toast.error(err instanceof Error ? err.message : '刷新失败')
  } finally {
    if (refreshController === controller) {
      refreshController = null
    }
    refreshInFlight = false
    if (mounted) {
      loading.value = false
    }
  }
}

function signOut() {
  logout()
  router.push('/login')
}

onMounted(async () => {
  mounted = true
  await refreshAll()
  if (!mounted) {
    return
  }
  refreshTimer = window.setInterval(() => refreshAll(), 30_000)
})

onBeforeUnmount(() => {
  mounted = false
  refreshController?.abort()
  refreshController = null
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>

<template>
  <div class="desktop-console">
    <header class="desktop-topbar">
      <div class="desktop-brand">
        <div class="desktop-brand__mark">签</div>
        <div>
          <strong>爱签网关服务控制台</strong>
          <span>ai-sign-in-gateway</span>
        </div>
      </div>

      <a-space wrap class="desktop-actions">
        <a-button type="primary" @click="openUrl(adminUrl)">
          <template #icon><GlobalOutlined /></template>
          打开管理中心
        </a-button>
        <a-button @click="openUrl(gatewayApiUrl)">
          <template #icon><ApiOutlined /></template>
          打开网关
        </a-button>
        <a-button :loading="loading" @click="refreshAll(true)">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button @click="signOut">
          <template #icon><PoweroffOutlined /></template>
          退出登录
        </a-button>
      </a-space>
    </header>

    <main class="desktop-main">
      <section class="desktop-hero">
        <div class="summary-grid">
          <div
            v-for="item in summaryItems"
            :key="item.key"
            class="summary-tile"
            :class="`summary-tile--${item.tone}`"
          >
            <span class="summary-tile__icon">
              <component :is="item.icon" />
            </span>
            <span class="summary-tile__label">{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>

        <div class="service-strip">
          <div
            v-for="item in serviceItems"
            :key="item.key"
            class="service-line"
            :class="{ 'service-line--ok': item.ok }"
          >
            <span class="service-line__dot"></span>
            <div>
              <strong>{{ item.label }}</strong>
              <p>{{ item.value }}</p>
            </div>
            <em>{{ item.meta }}</em>
            <a-button
              v-if="item.key === 'gateway'"
              class="service-line__copy"
              size="small"
              type="text"
              title="复制网关地址"
              @click="copyUrl(gatewayApiUrl)"
            >
              <template #icon><CopyOutlined /></template>
            </a-button>
          </div>
        </div>
      </section>

      <section v-if="runtimeProblems.length" class="desktop-alerts">
        <a-alert
          type="warning"
          show-icon
          :message="runtimeProblems.join(' / ')"
        />
      </section>

      <section class="desktop-settings-section">
        <div class="section-heading">
          <SettingOutlined />
          <div>
            <strong>服务设置</strong>
            <span>调度、运行、数据库、配置目录与账号</span>
          </div>
        </div>
        <SettingsView />
      </section>
    </main>
  </div>
</template>
