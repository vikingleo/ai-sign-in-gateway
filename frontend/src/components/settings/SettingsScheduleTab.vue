<script setup lang="ts">
import type { SettingsViewController } from '../../settingsViewController'

defineProps<{
  view: SettingsViewController
}>()
</script>

<template>
  <div class="card-form">
    <div class="card-scroll card-scroll--padded">
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="时区" html-for="settings-timezone">
              <a-input id="settings-timezone" v-model:value="view.form.timezone" aria-label="时区" name="settings_timezone" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="每日执行时间" html-for="settings-daily-run-time">
              <a-input
                id="settings-daily-run-time"
                v-model:value="view.form.daily_run_time"
                aria-label="每日执行时间"
                name="settings_daily_run_time"
                type="time"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="同站点 URL 并发数" html-for="settings-checkin-concurrency">
              <a-input-number
                id="settings-checkin-concurrency"
                v-model:value="view.form.checkin_concurrency"
                aria-label="同站点 URL 并发数"
                name="settings_checkin_concurrency"
                style="width: 100%"
                :min="1"
                :max="20"
              />
              <small class="field-help">限制同一 base_url 下多账号同时签到，默认 1 用于降低同站风控风险。</small>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="不同站点总并发数" html-for="settings-checkin-global-concurrency">
              <a-input-number
                id="settings-checkin-global-concurrency"
                v-model:value="view.form.checkin_global_concurrency"
                aria-label="不同站点总并发数"
                name="settings_checkin_global_concurrency"
                style="width: 100%"
                :min="1"
                :max="50"
              />
              <small class="field-help">控制不同 base_url 之间可同时执行的总任务数。</small>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="站点间隔（秒）" html-for="settings-checkin-interval-seconds">
              <a-input-number
                id="settings-checkin-interval-seconds"
                v-model:value="view.form.checkin_interval_seconds"
                aria-label="站点间隔秒数"
                name="settings_checkin_interval_seconds"
                style="width: 100%"
                :min="0"
                :max="60"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="失败重试次数" html-for="settings-retry-count">
              <a-input-number
                id="settings-retry-count"
                v-model:value="view.form.retry_count"
                aria-label="失败重试次数"
                name="settings_retry_count"
                style="width: 100%"
                :min="0"
                :max="5"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="请求超时（秒）" html-for="settings-request-timeout">
              <a-input-number
                id="settings-request-timeout"
                v-model:value="view.form.request_timeout"
                aria-label="请求超时秒数"
                name="settings_request_timeout"
                style="width: 100%"
                :min="5"
                :max="120"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <div class="settings-switch-grid">
          <div class="settings-switch-row">
            <span>
              <strong id="settings-schedule-enabled-label">启用计划任务</strong>
              <small id="settings-schedule-enabled-help">按每日执行时间自动运行签到计划。</small>
            </span>
            <a-switch
              id="settings-schedule-enabled"
              class="app-switch app-switch--text"
              v-model:checked="view.form.schedule_enabled"
              aria-labelledby="settings-schedule-enabled-label"
              aria-describedby="settings-schedule-enabled-help"
              checked-children="启用"
              un-checked-children="关闭"
            />
          </div>
          <div class="settings-switch-row">
            <span>
              <strong id="settings-only-enabled-sites-label">仅执行启用站点</strong>
              <small id="settings-only-enabled-sites-help">关闭后会包含所有站点。</small>
            </span>
            <a-switch
              id="settings-only-enabled-sites"
              class="app-switch app-switch--text"
              v-model:checked="view.form.only_enabled_sites"
              aria-labelledby="settings-only-enabled-sites-label"
              aria-describedby="settings-only-enabled-sites-help"
              checked-children="启用"
              un-checked-children="全部"
            />
          </div>
        </div>
      </a-form>

      <div class="card-actions card-actions--left">
        <a-space wrap>
          <a-button type="primary" :loading="view.loading" @click="view.save">保存设置</a-button>
          <a-button :loading="view.loading" @click="view.runNow">立即执行计划任务</a-button>
        </a-space>
      </div>
    </div>
  </div>
</template>
