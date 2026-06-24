<script setup lang="ts">
import {
  DeleteOutlined,
  DollarCircleOutlined,
  ExperimentOutlined,
  ExportOutlined,
  KeyOutlined,
  MoreOutlined,
  OrderedListOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons-vue'
import type { TableColumnsType } from 'ant-design-vue'
import PluginTag from '../PluginTag.vue'
import StatusPill from '../StatusPill.vue'
import {
  siteApiKeyCount,
  siteApiKeyCountLabel,
  siteApiKeyCountTagColor,
} from '../../sitesApiKeyModel'
import type { Site } from '../../types'
import { supportedModelsPreview } from '../../viewUtils'

const search = defineModel<string>('search', { required: true })

defineProps<{
  groupedSiteCount: number
  selectedCount: number
  busy: boolean
  checkinSelectedLabel: string
  columns: TableColumnsType
  sites: Site[]
  pageSize: number
  tableY: number
  rowSelection: Record<string, unknown>
  rowKey: (record: Site) => number
  customRow: (record: Site) => Record<string, unknown>
  rowClassName: (record: Site) => string
  displayPluginLabel: (site: Site) => string
  balanceClass: (balance: number | null | undefined) => string
  visibleCheckinStatus: (site: Site) => string
  displayGroupName: (site: Site) => string
  siteSupportsApiKeySync: (site: Pick<Site, 'plugin_key'>) => boolean
  siteIncludedInCheckin: (site: Site) => boolean
  siteCanCheckin: (site: Site) => boolean
  isRelayOnlySitePayload: (site: Site) => boolean
  siteCheckinActionLabel: (site: Site) => string
  isInviteLoading: (siteId: number) => boolean
  isBalanceProbing: (siteId: number) => boolean
  isApiKeyRefreshing: (siteId: number) => boolean
  siteSupportsInvite: (site: Site) => boolean
}>()

const emit = defineEmits<{
  'run-selected': []
  'clear-selected': []
  'open-site': [site: Site]
  edit: [site: Site]
  toggle: [site: Site]
  'update-participation': [site: Site, checked: boolean | string | number]
  test: [site: Site]
  checkin: [site: Site]
  'open-api-key': [site: Site]
  'probe-balance': [site: Site]
  'refresh-api-keys': [site: Site]
  'load-invite': [site: Site]
  'open-queue': [site: Site]
  'delete-site': [site: Site]
}>()

function asSite(record: unknown): Site {
  return record as Site
}
</script>

<template>
  <a-card :bordered="false" class="admin-card admin-card--fill site-list-card sites-list-card">
    <template #title>站点列表</template>
    <template #extra>
      <div class="sites-list-toolbar">
        <a-input
          id="sites-list-search"
          v-model:value="search"
          allow-clear
          class="sites-list-toolbar__search"
          name="sites_list_search"
          aria-label="搜索站点"
          placeholder="搜索站点 / 标签 / 分组"
        />
        <span class="sites-list-toolbar__meta">{{ groupedSiteCount }} 个已分组</span>
        <span class="sites-list-toolbar__meta">已选 {{ selectedCount }} 个</span>
        <a-button
          type="primary"
          class="sites-list-toolbar__btn"
          :disabled="!selectedCount || busy"
          @click="emit('run-selected')"
        >
          {{ checkinSelectedLabel }}
        </a-button>
        <a-button class="sites-list-toolbar__btn" :disabled="!selectedCount" @click="emit('clear-selected')">
          清空选择
        </a-button>
      </div>
    </template>

    <div class="card-shell sites-list-shell">
      <div class="table-fill table-fill--management">
        <a-table
          :columns="columns"
          :data-source="sites"
          :pagination="{ pageSize }"
          :row-key="rowKey"
          :row-selection="rowSelection"
          size="small"
          :custom-row="customRow"
          :row-class-name="rowClassName"
          :scroll="{ x: 1480, y: tableY }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'site'">
              <div class="site-table-cell">
                <div class="site-name-cell">
                  <strong>{{ asSite(record).name }}</strong>
                  <a-tooltip title="新标签页打开站点">
                    <a-button
                      type="text"
                      size="small"
                      class="site-name-open-btn"
                      :aria-label="`新标签页打开${asSite(record).name}`"
                      @click.stop="emit('open-site', asSite(record))"
                    >
                      <template #icon>
                        <ExportOutlined aria-hidden="true" />
                      </template>
                    </a-button>
                  </a-tooltip>
                </div>
                <div class="site-subline">
                  <span class="site-subline__label">{{ asSite(record).base_url }}</span>
                </div>
                <div class="site-subline site-subline--secondary">
                  <span>{{ supportedModelsPreview(asSite(record).supported_models) }}</span>
                  <a-tag class="site-inline-badge" :color="siteApiKeyCountTagColor(asSite(record), siteSupportsApiKeySync)">
                    {{ siteApiKeyCountLabel(asSite(record), siteSupportsApiKeySync) }}
                  </a-tag>
                </div>
              </div>
            </template>
            <template v-else-if="column.key === 'plugin'">
              <PluginTag class="site-platform-tag" :plugin-key="asSite(record).plugin_key" :label="displayPluginLabel(asSite(record))" />
            </template>
            <template v-else-if="column.key === 'balance'">
              <div class="site-balance-cell">
                <span :class="balanceClass(asSite(record).last_balance)">
                  {{ asSite(record).balance_display || '暂无' }}
                </span>
                <span class="site-balance-cell__meta">{{ siteApiKeyCount(asSite(record)) ? `${siteApiKeyCount(asSite(record))} 个 Key` : '无 Key' }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'package'">
              <a-tooltip v-if="asSite(record).package_display" :title="asSite(record).package_display">
                <span class="site-package-cell">{{ asSite(record).package_display }}</span>
              </a-tooltip>
              <span v-else class="site-package-cell site-package-cell--empty">暂无</span>
            </template>
            <template v-else-if="column.key === 'checkin_status'">
              <StatusPill v-if="visibleCheckinStatus(asSite(record))" :value="visibleCheckinStatus(asSite(record))" />
              <span v-else class="site-empty-badge">未加入</span>
            </template>
            <template v-else-if="column.key === 'group'">
              <span class="site-group-text">{{ displayGroupName(asSite(record)) }}</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <StatusPill :value="asSite(record).connection_status" />
            </template>
            <template v-else-if="column.key === 'enabled'">
              <a-switch
                class="app-switch app-switch--compact"
                :checked="asSite(record).is_enabled"
                :aria-label="`${asSite(record).name}启用状态`"
                checked-children="开"
                un-checked-children="关"
                @click.stop
                @change="() => emit('toggle', asSite(record))"
              />
            </template>
            <template v-else-if="column.key === 'participation'">
              <a-switch
                class="app-switch app-switch--text"
                :checked="siteIncludedInCheckin(asSite(record))"
                :disabled="!siteCanCheckin(asSite(record))"
                :aria-label="`${asSite(record).name}签到参与状态`"
                checked-children="可以"
                un-checked-children="禁止"
                @click.stop
                @change="(checked: boolean | string | number) => emit('update-participation', asSite(record), checked)"
              />
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="site-actions-cell">
                <a-button size="small" class="site-action-btn site-action-btn--edit" @click.stop="emit('edit', asSite(record))">
                  编辑
                </a-button>
                <a-dropdown :trigger="['click']">
                  <a-button
                    size="small"
                    class="site-actions-menu-button"
                    :aria-label="`${asSite(record).name}更多操作`"
                    :loading="isInviteLoading(asSite(record).id) || isBalanceProbing(asSite(record).id) || isApiKeyRefreshing(asSite(record).id)"
                    @click.stop
                  >
                    <template #icon><MoreOutlined aria-hidden="true" /></template>
                  </a-button>
                  <template #overlay>
                    <a-menu class="site-actions-menu">
                      <a-menu-item key="test" @click="emit('test', asSite(record))">
                        <ExperimentOutlined aria-hidden="true" />
                        <span>{{ isRelayOnlySitePayload(asSite(record)) ? '验证出口' : '测试连接' }}</span>
                      </a-menu-item>
                      <a-menu-item
                        v-if="siteCanCheckin(asSite(record)) && !isRelayOnlySitePayload(asSite(record))"
                        key="checkin"
                        @click="emit('checkin', asSite(record))"
                      >
                        <ReloadOutlined aria-hidden="true" />
                        <span>{{ siteCheckinActionLabel(asSite(record)) }}</span>
                      </a-menu-item>
                      <a-menu-item key="api-key" @click="emit('open-api-key', asSite(record))">
                        <KeyOutlined aria-hidden="true" />
                        <span>API Key</span>
                      </a-menu-item>
                      <a-menu-item
                        key="balance"
                        :disabled="isBalanceProbing(asSite(record).id)"
                        @click="emit('probe-balance', asSite(record))"
                      >
                        <DollarCircleOutlined aria-hidden="true" />
                        <span>{{ isBalanceProbing(asSite(record).id) ? '余额读取中' : '读取余额' }}</span>
                      </a-menu-item>
                      <a-menu-item
                        v-if="siteSupportsApiKeySync(asSite(record))"
                        key="api-key-refresh"
                        :disabled="isApiKeyRefreshing(asSite(record).id)"
                        @click="emit('refresh-api-keys', asSite(record))"
                      >
                        <ReloadOutlined aria-hidden="true" />
                        <span>{{ isApiKeyRefreshing(asSite(record).id) ? '更新中' : '更新 API Key' }}</span>
                      </a-menu-item>
                      <a-menu-item
                        v-if="siteSupportsInvite(asSite(record))"
                        key="invite"
                        :disabled="isInviteLoading(asSite(record).id)"
                        @click="emit('load-invite', asSite(record))"
                      >
                        <ShareAltOutlined aria-hidden="true" />
                        <span>{{ isInviteLoading(asSite(record).id) ? '邀请读取中' : '邀请信息' }}</span>
                      </a-menu-item>
                      <a-menu-item key="queue" @click="emit('open-queue', asSite(record))">
                        <OrderedListOutlined aria-hidden="true" />
                        <span>队列任务</span>
                      </a-menu-item>
                      <a-menu-item key="delete" danger @click="emit('delete-site', asSite(record))">
                        <DeleteOutlined aria-hidden="true" />
                        <span>删除站点</span>
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </div>
            </template>
          </template>
        </a-table>
      </div>
    </div>
  </a-card>
</template>
