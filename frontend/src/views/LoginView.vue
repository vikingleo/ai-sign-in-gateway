<script setup lang="ts">
import { CheckCircleOutlined, CopyOutlined, ExportOutlined, LinkOutlined, LockOutlined, LoginOutlined, ReloadOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons-vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getPublicInvites, login } from '../api'
import { capabilityCards, metricCards } from '../loginViewContent'
import { useToast } from '../toast'
import type { PublicInvite } from '../types'
import '../styles/workspace-surfaces.css'
import '../styles/login-view.css'
import '../styles/login-workspace-surfaces.css'

const router = useRouter()
const toast = useToast()
const rememberedUsername = localStorage.getItem('ai-sign-in-gateway-login-name') ?? ''
const username = ref(rememberedUsername || 'admin')
const password = ref('')
const rememberMe = ref(Boolean(rememberedUsername))
const loading = ref(false)
const invites = ref<PublicInvite[]>([])
const invitesLoading = ref(false)
const inviteModalOpen = ref(false)

async function loadInvites() {
  invitesLoading.value = true
  try {
    invites.value = await getPublicInvites()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '邀请码加载失败')
  } finally {
    invitesLoading.value = false
  }
}

async function submit() {
  loading.value = true
  try {
    await login(username.value, password.value)
    if (rememberMe.value) {
      localStorage.setItem('ai-sign-in-gateway-login-name', username.value.trim())
    } else {
      localStorage.removeItem('ai-sign-in-gateway-login-name')
    }
    toast.success('登录成功。')
    router.push('/overview')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '登录失败')
  } finally {
    loading.value = false
  }
}

async function copyText(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) {
    toast.error(`${label}为空。`)
    return
  }
  try {
    await navigator.clipboard.writeText(normalized)
    toast.success(`${label}已复制。`)
  } catch {
    toast.error('复制失败，请手动复制。')
  }
}

function copyInviteBundle(invite: PublicInvite) {
  const parts = [
    invite.invite_link ? `邀请链接：${invite.invite_link}` : '',
    invite.invite_code ? `邀请码：${invite.invite_code}` : '',
  ].filter(Boolean)
  void copyText(parts.join('\n'), '邀请信息')
}

function inviteUrl(invite: PublicInvite) {
  return String(invite.invite_link || invite.base_url || '').trim()
}

async function openInviteModal() {
  inviteModalOpen.value = true
  if (!invites.value.length) {
    await loadInvites()
  }
}

function openInviteURL(invite: PublicInvite) {
  const url = inviteUrl(invite)
  if (!url) {
    toast.error('邀请链接为空。')
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

function inviteMeta(invite: PublicInvite) {
  return [invite.package_name, invite.group_name]
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .join(' / ') || '公开邀请'
}

onMounted(loadInvites)
</script>

<template>
  <div class="login-screen">
    <div class="login-page">
      <header class="login-header">
        <div class="brand-lockup">
          <span class="brand-badge">爱签</span>
          <strong>爱签<span>网关</span></strong>
          <em>运维控制台</em>
        </div>
        <div class="security-line">
          <SafetyCertificateOutlined aria-hidden="true" />
          <span>安全 / 稳定 / 高效 / 可观测</span>
        </div>
      </header>

      <main class="login-main">
        <section class="login-story" aria-label="产品能力">
          <div class="login-copy">
            <h1>爱签网关管理后台</h1>
            <p>面向 API 中转站的授权管理、自动签到、网关转发、接口连通性验证和运营巡检统一入口。</p>
          </div>

          <div class="capability-list">
            <article v-for="item in capabilityCards" :key="item.title" class="capability-item">
              <span class="capability-icon" aria-hidden="true">
                <component :is="item.icon" />
              </span>
              <div>
                <h2>{{ item.title }}</h2>
                <p>{{ item.description }}</p>
              </div>
            </article>
          </div>

          <div class="metric-panel">
            <article v-for="item in metricCards" :key="item.label" class="metric-card">
              <div class="metric-head">
                <span class="metric-icon" aria-hidden="true">
                  <component :is="item.icon" />
                </span>
                <strong>{{ item.label }}</strong>
              </div>
              <div class="metric-value">
                <span>{{ item.value }}</span>
                <small>{{ item.unit }}</small>
                <em>{{ item.trend }}</em>
              </div>
              <div v-if="item.progress" class="metric-progress">
                <span :style="{ width: `${item.progress}%` }"></span>
              </div>
              <svg v-else viewBox="0 0 220 60" class="metric-wave" aria-hidden="true">
                <path :d="item.waveform" />
              </svg>
              <p>{{ item.caption }}</p>
            </article>

            <article class="metric-card metric-card--score">
              <div class="metric-head">
                <span class="metric-icon" aria-hidden="true">
                  <SafetyCertificateOutlined />
                </span>
                <strong>路由健康度</strong>
              </div>
              <div class="score-frame">
                <span>96</span>
                <small>分</small>
              </div>
              <p><CheckCircleOutlined aria-hidden="true" /> 状态良好</p>
            </article>
          </div>
        </section>

        <div class="login-side">
          <section class="login-card" aria-label="管理员登录">
            <div class="login-card__head">
              <span class="brand-badge brand-badge--large">爱签</span>
              <div>
                <h2>欢迎登录</h2>
                <p>登录后进入爱签网关管理后台，查看站点状态、路由策略与连通性巡检结果。</p>
              </div>
            </div>

            <a-form class="login-form" layout="vertical" @submit.prevent="submit">
              <a-form-item label="账号" html-for="login-username">
                <a-input
                  id="login-username"
                  v-model:value="username"
                  name="username"
                  size="large"
                  autocomplete="username"
                  placeholder="请输入邮箱 / 用户名"
                >
                  <template #prefix>
                    <UserOutlined aria-hidden="true" />
                  </template>
                </a-input>
              </a-form-item>

              <a-form-item label="密码" html-for="login-password">
                <a-input-password
                  id="login-password"
                  v-model:value="password"
                  name="password"
                  size="large"
                  autocomplete="current-password"
                  placeholder="请输入登录密码"
                >
                  <template #prefix>
                    <LockOutlined aria-hidden="true" />
                  </template>
                </a-input-password>
              </a-form-item>

              <div class="login-options">
                <a-checkbox v-model:checked="rememberMe">记住我</a-checkbox>
              </div>

              <a-button class="login-submit" block type="primary" html-type="submit" size="large" :loading="loading">
                <template #icon><LoginOutlined aria-hidden="true" /></template>
                登录后台
              </a-button>
            </a-form>
          </section>

          <button class="invite-entry" type="button" @click="openInviteModal">
            <span>
              <strong>公开邀请入口</strong>
              <small>查看可注册站点与邀请链接</small>
            </span>
            <LinkOutlined aria-hidden="true" />
          </button>
        </div>
      </main>

      <footer class="login-footer">
        <span>爱签网关 / 统一授权 / 策略路由 / 健康巡检 / 数据观测</span>
        <span>Copyright 2025 爱签网关 版权所有</span>
        <span>版本 v2.1.0</span>
      </footer>
    </div>

    <a-modal
      v-model:open="inviteModalOpen"
      class="invite-modal"
      width="min(920px, calc(100vw - 32px))"
      title="公开邀请站点"
      :footer="null"
    >
      <div class="invite-modal__body">
        <div class="invite-modal__toolbar">
          <span>{{ invites.length ? `共 ${invites.length} 个公开邀请站点` : '暂无公开邀请站点' }}</span>
          <a-button size="small" :loading="invitesLoading" @click="loadInvites">
            <template #icon><ReloadOutlined aria-hidden="true" /></template>
            刷新
          </a-button>
        </div>

        <a-spin :spinning="invitesLoading">
          <div v-if="invites.length" class="invite-list">
            <div v-for="invite in invites" :key="invite.site_id" class="invite-item">
              <div class="invite-item__main">
                <strong>{{ invite.site_name }}</strong>
                <span>{{ inviteMeta(invite) }}</span>
                <a :href="inviteUrl(invite)" target="_blank" rel="noopener noreferrer">
                  <LinkOutlined aria-hidden="true" />
                  {{ inviteUrl(invite) }}
                </a>
              </div>
              <div class="invite-item__actions">
                <a-tag v-if="invite.invite_code" color="processing">{{ invite.invite_code }}</a-tag>
                <a-button size="small" :disabled="!inviteUrl(invite)" @click="copyText(inviteUrl(invite), '邀请链接')">
                  <template #icon><CopyOutlined aria-hidden="true" /></template>
                  链接
                </a-button>
                <a-button
                  size="small"
                  :disabled="!invite.invite_code && !inviteUrl(invite)"
                  @click="copyInviteBundle(invite)"
                >
                  <template #icon><CopyOutlined aria-hidden="true" /></template>
                  信息
                </a-button>
                <a-button size="small" type="primary" :disabled="!inviteUrl(invite)" @click="openInviteURL(invite)">
                  <template #icon><ExportOutlined aria-hidden="true" /></template>
                  打开
                </a-button>
              </div>
            </div>
          </div>
          <a-empty v-else description="暂无公开邀请码" />
        </a-spin>
      </div>
    </a-modal>
  </div>
</template>
