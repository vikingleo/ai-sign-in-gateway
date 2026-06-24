<script setup lang="ts">
import { DeleteOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons-vue'
import type { SettingsViewController } from '../../settingsViewController'

defineProps<{
  view: SettingsViewController
}>()
</script>

<template>
  <div class="card-form runtime-tab-form">
    <div class="card-scroll card-scroll--padded">
      <a-form layout="vertical">
        <a-alert
          v-if="view.form.security_warnings.length"
          type="warning"
          show-icon
          message="安全与运维提醒"
          :description="view.form.security_warnings.join('；')"
          class="settings-security-alert"
        />
        <a-form-item label="关闭桌面后保留本地服务">
          <a-switch
            class="app-switch app-switch--wide"
            v-model:checked="view.form.desktop_keep_running"
            aria-label="关闭桌面后保留本地服务"
            checked-children="保留"
            un-checked-children="停止"
          />
          <small class="field-help">启用后关闭桌面窗口时，本地后端服务仍会继续运行。</small>
        </a-form-item>

        <a-row :gutter="16" class="desktop-runtime-row">
          <a-col :xs="24" :md="12">
            <a-form-item label="前端默认端口">
              <a-input :value="String(view.form.desktop_frontend_default_port || 3721)" aria-label="前端默认端口" readonly />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="前端当前端口">
              <a-input :value="view.form.desktop_frontend_port ? String(view.form.desktop_frontend_port) : '-'" aria-label="前端当前端口" readonly />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="前端地址">
              <a-input :value="view.form.desktop_frontend_url || '-'" aria-label="前端地址" readonly />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="前端默认端口占用">
              <a-input :value="view.form.desktop_frontend_default_port_occupant || '未占用'" aria-label="前端默认端口占用" readonly />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16" class="desktop-runtime-row">
          <a-col :xs="24" :md="12">
            <a-form-item label="后端默认端口">
              <a-input :value="String(view.form.desktop_backend_default_port || 8972)" aria-label="后端默认端口" readonly />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="后端当前端口">
              <a-input :value="view.form.desktop_backend_port ? String(view.form.desktop_backend_port) : '-'" aria-label="后端当前端口" readonly />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="后端地址">
              <a-input :value="view.form.desktop_backend_url || '-'" aria-label="后端地址" readonly />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="后端默认端口占用">
              <a-input :value="view.form.desktop_backend_default_port_occupant || '未占用'" aria-label="后端默认端口占用" readonly />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :xs="24">
            <a-form-item label="网关地址">
              <a-input :value="view.form.desktop_gateway_url || '-'" aria-label="网关地址" readonly />
            </a-form-item>
          </a-col>
        </a-row>

        <div class="card-actions card-actions--left">
          <a-space wrap>
            <a-button type="primary" :loading="view.loading" @click="view.save">
              <template #icon><SaveOutlined /></template>
              保存设置
            </a-button>
            <a-button :loading="view.loading" @click="view.loadData">
              <template #icon><ReloadOutlined /></template>
              刷新运行状况
            </a-button>
            <a-button danger :loading="view.runtimeStopLoading" @click="view.stopOldPorts">
              <template #icon><DeleteOutlined /></template>
              停止旧版本端口
            </a-button>
          </a-space>
        </div>

        <div v-if="view.runtimeStopResults.length" class="runtime-stop-results">
          <a-tag
            v-for="item in view.runtimeStopResults"
            :key="`${item.port}-${item.pid || 'none'}`"
            :color="view.runtimeStopTagColor(item)"
          >
            {{ item.port }}：{{ item.message }}<span v-if="item.pid">（pid:{{ item.pid }}）</span>
          </a-tag>
        </div>
      </a-form>
    </div>
  </div>
</template>
