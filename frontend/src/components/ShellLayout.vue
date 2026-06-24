<script setup lang="ts">
import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { useShellLayoutController } from '../shellLayoutController'
import GroupManagerButton from './GroupManagerButton.vue'
import '../styles/shell-layout-header.css'

const view = useShellLayoutController()
</script>

<template>
  <a-layout class="app-shell">
    <a-layout-sider
      v-model:collapsed="view.collapsed"
      class="app-sider"
      :width="248"
      :collapsed-width="88"
      breakpoint="lg"
      theme="light"
    >
      <div class="brand-panel">
        <div class="brand-mark" aria-hidden="true">
          <ThunderboltOutlined />
        </div>
        <div v-if="!view.collapsed">
          <strong>爱签网关</strong>
          <p>签到与网关管理后台</p>
        </div>
      </div>

      <a-menu :selected-keys="view.selectedNavigationKeys" mode="inline" class="app-menu">
        <a-menu-item
          v-for="item in view.visibleNavigation"
          :key="item.to"
          @click="view.navigate(item.to)"
        >
          <template #icon>
            <component :is="item.icon" aria-hidden="true" />
          </template>
          <span>{{ item.label }}</span>
        </a-menu-item>
      </a-menu>

      <div v-if="!view.collapsed" class="sider-footer">
        <div class="sider-footer__panel">
          <div class="sider-footer__head">
            <span>系统状态</span>
            <span class="sider-footer__badge">稳定</span>
          </div>
          <div class="sider-footer__status">
            <span class="sider-footer__dot"></span>
            <strong>网关运行中</strong>
          </div>
          <div class="sider-footer__meta">
            <span>当前用户</span>
            <strong>{{ view.admin?.username ?? 'admin' }}</strong>
          </div>
          <div class="sider-footer__meta">
            <span>权限</span>
            <strong>{{ view.adminRoleLabel(view.admin?.role) }}</strong>
          </div>
          <a-button class="sider-footer__button" block @click="view.navigate('/gateway/monitor')">
            <template #icon>
              <component :is="view.ApiOutlined" aria-hidden="true" />
            </template>
            网关监控
          </a-button>
        </div>
        <a-button class="sider-collapse-button" block @click="view.toggleCollapsed">
          <template #icon>
            <MenuFoldOutlined aria-hidden="true" />
          </template>
          收起导航
        </a-button>
      </div>

      <div v-else class="sider-footer sider-footer--collapsed">
        <a-button class="sider-collapse-button" @click="view.toggleCollapsed" aria-label="展开导航">
          <template #icon>
            <MenuUnfoldOutlined aria-hidden="true" />
          </template>
        </a-button>
      </div>
    </a-layout-sider>

    <a-layout class="app-main">
      <a-layout-header class="app-header">
        <div class="app-header__page">
          <span class="app-header__page-icon" aria-hidden="true">
            <component :is="view.activeNavigation.icon" />
          </span>
          <div>
            <strong>{{ view.activeNavigation.label }}</strong>
            <p>{{ view.activeNavigation.description }}</p>
          </div>
        </div>

        <div v-if="view.headerKpis.length" class="app-header__summary">
          <div
            v-for="kpi in view.headerKpis"
            :key="kpi.key"
            class="header-status"
            :class="`header-status--${kpi.tone}`"
          >
            <span class="header-status__label">{{ kpi.label }}</span>
            <span class="header-status__value">{{ kpi.value }}</span>
          </div>
        </div>

        <a-space class="app-header__actions">
          <GroupManagerButton />
          <a-tag color="processing" class="app-header__user">
            <UserOutlined aria-hidden="true" />
            {{ view.admin?.username ?? 'admin' }}
          </a-tag>
          <a-tag :color="view.adminRoleColor(view.admin?.role)" class="app-header__user">
            {{ view.adminRoleLabel(view.admin?.role) }}
          </a-tag>
          <a-button @click="view.signOut">
            <template #icon>
              <LogoutOutlined aria-hidden="true" />
            </template>
            退出
          </a-button>
        </a-space>
      </a-layout-header>

      <a-layout-content class="app-content">
        <slot />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>
