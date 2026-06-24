<script setup lang="ts">
import { DownloadOutlined, FolderOpenOutlined } from '@ant-design/icons-vue'
import type { SettingsViewController } from '../../settingsViewController'

defineProps<{
  view: SettingsViewController
}>()
</script>

<template>
  <div class="card-form runtime-tab-form">
    <div class="card-scroll card-scroll--padded">
      <a-form layout="vertical">
        <div class="runtime-config-panel">
          <a-row :gutter="16">
            <a-col :xs="24" :md="12">
              <a-form-item label="当前配置目录">
                <a-input :value="view.form.runtime_config_dir || '-'" aria-label="当前配置目录" readonly />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="默认配置目录">
                <a-input :value="view.form.runtime_default_config_dir || '-'" aria-label="默认配置目录" readonly />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="下次启动配置目录">
            <a-input :value="view.form.runtime_pending_config_dir || view.form.runtime_config_dir || '-'" aria-label="下次启动配置目录" readonly />
          </a-form-item>

          <a-form-item label="加载配置目录">
            <div class="runtime-config-loader">
              <a-input
                v-model:value="view.runtimeConfigDirInput"
                aria-label="加载配置目录"
                placeholder="~/.ai-sign-in-gateway"
              />
              <a-button type="primary" :loading="view.configDirLoading" @click="view.loadRuntimeConfigDir">
                <template #icon><FolderOpenOutlined /></template>
                加载配置目录
              </a-button>
            </div>
            <small class="field-help">
              仅保存目录指针，重启后从该目录加载数据库；不会复制、导入或覆盖当前目录数据。
            </small>
          </a-form-item>

          <a-form-item label="配置文件打包下载">
            <div class="runtime-config-loader">
              <a-input :value="view.form.runtime_config_dir || '-'" aria-label="配置文件打包下载目录" readonly />
              <a-button :loading="view.configArchiveDownloading" @click="view.downloadConfigArchive">
                <template #icon><DownloadOutlined /></template>
                打包下载
              </a-button>
            </div>
            <small class="field-help">
              下载当前配置目录下的数据库、日志和配置文件 ZIP 包；用于迁移或离线备份。
            </small>
          </a-form-item>
        </div>
      </a-form>
    </div>
  </div>
</template>
