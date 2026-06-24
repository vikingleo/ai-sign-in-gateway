<script setup lang="ts">
import SettingsAccountTab from './SettingsAccountTab.vue'
import SettingsConfigTab from './SettingsConfigTab.vue'
import SettingsDatabaseTab from './SettingsDatabaseTab.vue'
import SettingsExtensionsTab from './SettingsExtensionsTab.vue'
import SettingsPricingTab from './SettingsPricingTab.vue'
import SettingsRuntimeTab from './SettingsRuntimeTab.vue'
import SettingsScheduleTab from './SettingsScheduleTab.vue'
import type { SettingsViewController } from '../../settingsViewController'

defineProps<{
  view: SettingsViewController
}>()
</script>

<template>
  <component :is="view.settingsFrameComponent" :class="{ 'settings-embedded-frame': view.isDesktopEmbedded }">
    <div class="page-stack page-stack--fit settings-page">
      <a-row :gutter="[16, 16]" class="page-grid-fill">
        <a-col :xs="24">
          <a-card :bordered="false" class="admin-card admin-card--fill settings-tab-card">
            <a-tabs
              v-model:active-key="view.activeTab"
              aria-label="设置分类"
              class="settings-tabs"
              :animated="false"
            >
              <a-tab-pane key="schedule" tab="调度与执行">
                <SettingsScheduleTab :view="view" />
              </a-tab-pane>
              <a-tab-pane key="runtime" tab="程序运行状况">
                <SettingsRuntimeTab :view="view" />
              </a-tab-pane>
              <a-tab-pane key="database" tab="数据库">
                <SettingsDatabaseTab :view="view" />
              </a-tab-pane>
              <a-tab-pane key="pricing" tab="价格">
                <SettingsPricingTab :view="view" />
              </a-tab-pane>
              <a-tab-pane key="extensions" tab="扩展">
                <SettingsExtensionsTab :view="view" />
              </a-tab-pane>
              <a-tab-pane key="config" tab="配置文件">
                <SettingsConfigTab :view="view" />
              </a-tab-pane>
              <a-tab-pane key="account" tab="账号与密码">
                <SettingsAccountTab :view="view" />
              </a-tab-pane>
            </a-tabs>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </component>
</template>
