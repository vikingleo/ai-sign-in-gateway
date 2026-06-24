<script setup lang="ts">
import {
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons-vue'

defineProps<{
  busy: boolean
  checkinBatchTargetCount: number
  checkinAllIncludedLabel: string
  connectivitySweepLabel: string
  duplicateCheckLoading: boolean
  inviteRefreshAllLoading: boolean
  inviteRefreshAllLabel: string
  apiKeyRefreshAllLoading: boolean
  apiKeyRefreshAllLabel: string
  ccSwitchExportLoading: boolean
  ccSwitchAvailable: boolean
  ccSwitchDisabledReason: string
}>()

const emit = defineEmits<{
  'open-checkin-config': []
  'open-checkin-logs': []
  'checkin-all-included': []
  refresh: []
  'connectivity-sweep': []
  'duplicate-check': []
  'refresh-all-invites': []
  'refresh-all-api-keys': []
  'export-cc-switch': []
  'import-cc-switch': []
  'create-site': []
}>()
</script>

<template>
  <div class="sites-toolbar">
    <div class="sites-toolbar__segment">
      <a-button class="sites-toolbar__seg-btn" @click="emit('open-checkin-config')">签到配置</a-button>
      <a-button class="sites-toolbar__seg-btn" @click="emit('open-checkin-logs')">最近执行</a-button>
      <a-button
        type="primary"
        class="sites-toolbar__seg-btn sites-toolbar__seg-btn--primary"
        :loading="busy"
        :disabled="!checkinBatchTargetCount"
        @click="emit('checkin-all-included')"
      >
        {{ checkinAllIncludedLabel }}
      </a-button>
    </div>

    <div class="sites-toolbar__actions">
      <a-button class="sites-toolbar__ghost-btn" :loading="busy" @click="emit('refresh')">
        <template #icon>
          <ReloadOutlined aria-hidden="true" />
        </template>
        刷新
      </a-button>
      <a-button class="sites-toolbar__ghost-btn" :loading="busy" @click="emit('connectivity-sweep')">
        {{ connectivitySweepLabel }}
      </a-button>
      <a-button class="sites-toolbar__ghost-btn" :loading="duplicateCheckLoading" @click="emit('duplicate-check')">
        清理检测
      </a-button>
      <a-button class="sites-toolbar__ghost-btn" :loading="inviteRefreshAllLoading" @click="emit('refresh-all-invites')">
        <template #icon>
          <ShareAltOutlined aria-hidden="true" />
        </template>
        {{ inviteRefreshAllLabel }}
      </a-button>
      <a-button
        type="primary"
        class="sites-toolbar__ghost-btn sites-toolbar__ghost-btn--strong"
        :loading="apiKeyRefreshAllLoading"
        @click="emit('refresh-all-api-keys')"
      >
        <template #icon>
          <KeyOutlined aria-hidden="true" />
        </template>
        {{ apiKeyRefreshAllLabel }}
      </a-button>
      <a-tooltip :title="ccSwitchAvailable ? '' : ccSwitchDisabledReason">
        <span>
          <a-button
            class="sites-toolbar__ghost-btn"
            :loading="ccSwitchExportLoading"
            :disabled="!ccSwitchAvailable"
            @click="emit('export-cc-switch')"
          >
            导出供应商
          </a-button>
        </span>
      </a-tooltip>
      <a-tooltip :title="ccSwitchAvailable ? '' : ccSwitchDisabledReason">
        <span>
          <a-button
            class="sites-toolbar__ghost-btn"
            :disabled="!ccSwitchAvailable"
            @click="emit('import-cc-switch')"
          >
            导入供应商
          </a-button>
        </span>
      </a-tooltip>
      <a-button type="primary" class="sites-toolbar__create-btn" @click="emit('create-site')">
        <template #icon>
          <PlusOutlined aria-hidden="true" />
        </template>
        新建站点
      </a-button>
    </div>
  </div>
</template>
