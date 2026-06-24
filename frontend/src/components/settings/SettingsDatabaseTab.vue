<script setup lang="ts">
import { DatabaseOutlined, DownloadOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons-vue'
import type { SettingsViewController } from '../../settingsViewController'

defineProps<{
  view: SettingsViewController
}>()
</script>

<template>
  <div class="card-form runtime-tab-form">
    <div class="card-scroll card-scroll--padded">
      <a-form layout="vertical">
        <a-form-item label="当前数据库文件">
          <a-input :value="view.form.runtime_database_path || '-'" aria-label="当前数据库文件" readonly />
        </a-form-item>

        <a-form-item label="加载数据库">
          <input
            :ref="view.bindRuntimeDatabaseFileInput"
            class="runtime-database-file"
            type="file"
            accept=".db,.sqlite,.sqlite3,application/vnd.sqlite3,application/x-sqlite3"
            hidden
            tabindex="-1"
            @change="view.loadRuntimeDatabase"
          >
          <a-button danger :loading="view.databaseImportLoading" @click="view.selectRuntimeDatabase">
            <template #icon><DatabaseOutlined /></template>
            选择并加载数据库
          </a-button>
          <small class="field-help">
            选择 SQLite 数据库文件后会复制到当前配置目录并备份现有数据库；完成后会退出登录，请重新登录后生效。
          </small>
        </a-form-item>

        <a-form-item label="日志配置">
          <a-space direction="vertical" size="middle" class="runtime-backup-settings">
            <a-row :gutter="16">
              <a-col :xs="24" :md="12">
                <a-form-item label="日志保留天数" html-for="settings-log-retention-days">
                  <a-input-number
                    id="settings-log-retention-days"
                    v-model:value="view.form.log_retention_days"
                    name="settings_log_retention_days"
                    style="width: 100%"
                    :min="1"
                    :max="365"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-space>
          <small class="field-help">
            默认保留 5 天；保存后会立即清理更早的签到运行日志和网关请求日志，后台也会每小时自动清理一次。
          </small>
        </a-form-item>

        <a-form-item label="自动备份数据库">
          <a-space direction="vertical" size="middle" class="runtime-backup-settings">
            <a-switch
              class="app-switch app-switch--wide"
              v-model:checked="view.form.database_backup_enabled"
              aria-label="自动备份数据库"
              checked-children="已启用"
              un-checked-children="已关闭"
            />
            <a-input
              v-model:value="view.form.database_backup_dir"
              aria-label="数据库备份目录"
              placeholder="~/ai-sign-in-gateway-backups"
            />
            <a-row :gutter="16">
              <a-col :xs="24" :md="12">
                <a-form-item label="备份间隔（分钟）">
                  <a-input-number
                    v-model:value="view.form.database_backup_interval_minutes"
                    aria-label="备份间隔分钟"
                    style="width: 100%"
                    :min="5"
                    :max="10080"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item label="保留份数">
                  <a-input-number
                    v-model:value="view.form.database_backup_retention"
                    aria-label="备份保留份数"
                    style="width: 100%"
                    :min="1"
                    :max="365"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-space>
          <small class="field-help">
            保存设置后，只要服务进程还在，就会按间隔备份到该目录；目录需对当前运行用户可写。
          </small>
        </a-form-item>

        <div class="card-actions card-actions--space">
          <span class="backup-dir-label">备份目录：{{ view.databaseBackupDir || view.form.database_backup_dir || '未设置' }}</span>
          <a-space wrap>
            <a-button type="primary" :loading="view.loading" @click="view.save">
              <template #icon><SaveOutlined /></template>
              保存设置
            </a-button>
            <a-button :loading="view.databaseBackupLoading" @click="view.backupDatabaseNow">
              立即备份
            </a-button>
            <a-button :loading="view.databaseBackupLoading" @click="() => view.loadDatabaseBackups()">
              <template #icon><ReloadOutlined /></template>
              刷新备份
            </a-button>
          </a-space>
        </div>

        <a-table
          class="backup-table"
          size="small"
          :data-source="view.databaseBackups"
          :loading="view.databaseBackupLoading"
          :pagination="{ pageSize: 8, size: 'small' }"
          row-key="name"
        >
          <a-table-column title="备份时间" key="created_at">
            <template #default="{ record }">
              {{ view.formatBackupTime(record.created_at) }}
            </template>
          </a-table-column>
          <a-table-column title="文件名" data-index="name" key="name" />
          <a-table-column title="大小" key="size" :width="110">
            <template #default="{ record }">
              {{ view.formatFileSize(record.size) }}
            </template>
          </a-table-column>
          <a-table-column title="操作" key="actions" :width="160">
            <template #default="{ record }">
              <a-space size="small">
                <a-button
                  size="small"
                  :loading="view.databaseBackupDownloadName === record.name"
                  @click="view.downloadDatabaseBackup(record.name)"
                >
                  <template #icon><DownloadOutlined /></template>
                  下载
                </a-button>
                <a-popconfirm
                  title="确认删除这个备份？"
                  ok-text="删除"
                  cancel-text="取消"
                  @confirm="view.removeDatabaseBackup(record.name)"
                >
                  <a-button danger size="small">删除</a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </a-table>
      </a-form>
    </div>
  </div>
</template>
