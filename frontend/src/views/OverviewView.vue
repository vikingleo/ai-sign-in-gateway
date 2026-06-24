<script setup lang="ts">
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ClusterOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  ScheduleOutlined,
} from '@ant-design/icons-vue'
import { computed, onMounted, ref } from 'vue'
import { getOverview } from '../api'
import ShellLayout from '../components/ShellLayout.vue'
import StatusPill from '../components/StatusPill.vue'
import { useToast } from '../toast'
import type { OverviewData } from '../types'
import '../styles/overview.css'
import '../styles/overview-feed.css'

const toast = useToast()
const data = ref<OverviewData | null>(null)
const loading = ref(false)

type MetricTone = 'primary' | 'info' | 'success' | 'warning'

const metrics = computed<Array<{
  key: string
  title: string
  value: number
  tone: MetricTone
  caption: string
  icon: typeof ClusterOutlined
}>>(() => {
  if (!data.value) {
    return []
  }
  const d = data.value
  const totalRuns = d.today_success + d.today_failed
  const enabledRatio = d.site_count > 0 ? Math.round((d.enabled_site_count / d.site_count) * 100) : 0
  return [
    {
      key: 'sites',
      title: '站点总数',
      value: d.site_count,
      tone: 'primary',
      caption: `${d.enabled_site_count} 个启用`,
      icon: ClusterOutlined,
    },
    {
      key: 'enabled',
      title: '启用站点',
      value: d.enabled_site_count,
      tone: 'info',
      caption: d.site_count > 0 ? `${enabledRatio}% 已启用` : '暂无站点',
      icon: ScheduleOutlined,
    },
    {
      key: 'success',
      title: '今日成功',
      value: d.today_success,
      tone: 'success',
      caption: `共执行 ${totalRuns} 次`,
      icon: CheckCircleOutlined,
    },
    {
      key: 'failed',
      title: '今日失败',
      value: d.today_failed,
      tone: 'warning',
      caption: d.today_failed > 0 ? '需要排查' : '暂无失败',
      icon: ExclamationCircleOutlined,
    },
  ]
})

const scheduleRows = computed(() => {
  const d = data.value
  if (!d) {
    return []
  }
  return [
    {
      key: 'latest-sync',
      label: '最新同步',
      value: formatTime(d.latest_sync),
      icon: ClockCircleOutlined,
    },
    {
      key: 'next-run',
      label: '下次计划',
      value: formatTime(d.next_run_at),
      icon: CalendarOutlined,
    },
    {
      key: 'today-runs',
      label: '今日执行',
      value: `${d.today_success + d.today_failed} 次`,
      icon: ScheduleOutlined,
    },
  ]
})

function formatTime(value: string | null) {
  if (!value) return '暂无'
  return new Date(value).toLocaleString('zh-CN')
}

async function loadData() {
  loading.value = true
  try {
    data.value = await getOverview()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <ShellLayout>
    <div class="overview-screen">
      <section class="overview-page-head">
        <div>
          <h2>概览</h2>
          <p>站点签到、任务执行和异常状态一览。</p>
        </div>
        <a-button :loading="loading" type="primary" @click="loadData">
          <template #icon>
            <ReloadOutlined aria-hidden="true" />
          </template>
          刷新数据
        </a-button>
      </section>

      <div class="overview-metrics">
        <a-card
          v-for="metric in metrics"
          :key="metric.key"
          :bordered="false"
          class="admin-card overview-metric-card"
          :class="`overview-metric-card--${metric.tone}`"
        >
          <div class="overview-metric-card__head">
            <span class="overview-metric-card__icon">
              <component :is="metric.icon" aria-hidden="true" />
            </span>
            <span class="overview-metric-card__title">{{ metric.title }}</span>
          </div>
          <div class="overview-metric-card__value">
            <a-statistic :value="metric.value" :value-style="{ fontSize: 'inherit', color: 'inherit', fontWeight: 700 }" />
          </div>
          <p>{{ metric.caption }}</p>
        </a-card>
      </div>

      <div v-if="data" class="overview-main-grid">
        <a-card :bordered="false" class="admin-card overview-panel overview-panel--runs">
          <div class="overview-panel__head">
            <div>
              <h3>最近任务</h3>
              <p>最近站点签到结果和执行消息。</p>
            </div>
            <span>最新同步: {{ formatTime(data.latest_sync) }}</span>
          </div>
          <div class="overview-panel__body">
            <div class="overview-list-scroll">
              <ul v-if="data.recent_runs.length" class="overview-feed">
                <li
                  v-for="run in data.recent_runs"
                  :key="run.id"
                  class="overview-feed__row"
                  :class="`overview-feed__row--${run.status === 'success' ? 'success' : run.status === 'failed' ? 'failed' : 'neutral'}`"
                >
                  <span class="overview-feed__dot" />
                  <div class="overview-feed__main">
                    <div class="overview-feed__title">
                      <strong>{{ run.site_name ?? '未知站点' }}</strong>
                      <StatusPill :value="run.status" />
                    </div>
                    <p class="overview-feed__text">{{ run.message || '暂无消息' }}</p>
                  </div>
                  <span class="overview-feed__time">{{ formatTime(run.started_at) }}</span>
                </li>
              </ul>
              <a-empty v-else description="暂无最近任务记录。" />
            </div>
          </div>
        </a-card>

        <div class="overview-side-stack">
          <a-card :bordered="false" class="admin-card overview-panel overview-panel--schedule">
            <div class="overview-panel__head">
              <div>
                <h3>运行计划</h3>
                <p>同步节奏和今日执行概况。</p>
              </div>
            </div>
            <div class="overview-schedule-list">
              <div v-for="item in scheduleRows" :key="item.key" class="overview-schedule-item">
                <span class="overview-schedule-item__icon">
                  <component :is="item.icon" aria-hidden="true" />
                </span>
                <div>
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </div>
          </a-card>

          <a-card :bordered="false" class="admin-card overview-panel overview-panel--attention">
            <div class="overview-panel__head">
              <div>
                <h3>待处理站点</h3>
                <p>失败、停用或需要关注的站点。</p>
              </div>
              <span>下次计划: {{ formatTime(data.next_run_at) }}</span>
            </div>
            <div class="overview-panel__body">
              <div class="overview-list-scroll">
                <ul v-if="data.attention_sites.length" class="overview-feed">
                  <li
                    v-for="site in data.attention_sites"
                    :key="site.id"
                    class="overview-feed__row overview-feed__row--attention"
                  >
                    <span class="overview-feed__dot" />
                    <div class="overview-feed__main">
                      <div class="overview-feed__title">
                        <strong>{{ site.name }}</strong>
                        <StatusPill :value="site.last_status" />
                      </div>
                      <p class="overview-feed__text">{{ site.last_message || '暂无异常说明' }}</p>
                    </div>
                    <span class="overview-feed__time">{{ formatTime(site.last_run_at) }}</span>
                  </li>
                </ul>
                <a-empty v-else description="当前没有失败或停用站点。" />
              </div>
            </div>
          </a-card>
        </div>
      </div>
    </div>
  </ShellLayout>
</template>
