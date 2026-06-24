<script setup lang="ts">
import { CopyOutlined } from '@ant-design/icons-vue'
import type { GatewayErrorDetail } from '../../gatewayActivityDisplayModel'
import type { GatewayActiveRequest, GatewayLog } from '../../types'
import type { GatewayActivityFeedItem } from '../../gatewayViewModel'

const props = defineProps<{
  items: GatewayActivityFeedItem[]
  activeCount: number
  activityHasErrorDetail: (item: GatewayActivityFeedItem) => boolean
  buildLogErrorDetail: (log: GatewayLog) => GatewayErrorDetail
  buildActiveErrorDetail: (item: GatewayActiveRequest) => GatewayErrorDetail
}>()

const emit = defineEmits<{
  (event: 'copy', value: string): void
  (event: 'open-error-detail', detail: GatewayErrorDetail): void
}>()

function openActivityErrorDetail(item: GatewayActivityFeedItem) {
  if (item.sourceLog) {
    emit('open-error-detail', props.buildLogErrorDetail(item.sourceLog))
    return
  }
  if (item.sourceActive) {
    emit('open-error-detail', props.buildActiveErrorDetail(item.sourceActive))
  }
}
</script>

<template>
  <section class="gateway-panel gateway-panel--activity">
    <div class="gateway-panel__head">
      <div>
        <div class="gateway-panel__title">实时调用</div>
      </div>
      <span class="gateway-active-feed-panel__pulse" :class="{ 'gateway-active-feed-panel__pulse--active': activeCount > 0 }">
        {{ activeCount > 0 ? '运行中' : '空闲' }}
      </span>
    </div>
    <div v-if="items.length" class="gateway-active-feed gateway-active-feed--embedded">
      <div
        v-for="item in items"
        :key="item.id"
        class="gateway-active-feed__item"
        :class="{ 'gateway-active-feed__item--completed': item.kind === 'completed' }"
      >
        <div class="gateway-active-feed__rail">
          <span class="gateway-active-feed__dot" />
        </div>
        <div class="gateway-active-feed__main">
          <strong class="gateway-active-feed__route">{{ item.label }}</strong>
          <a-space size="small" wrap class="gateway-active-feed__badges">
            <a-tag :color="item.primaryBadgeColor">{{ item.primaryBadge }}</a-tag>
            <a-tag>{{ item.secondaryBadge }}</a-tag>
            <a-tag v-if="item.is_stream" color="blue">流式</a-tag>
          </a-space>
          <div class="gateway-active-feed__url-row">
            <a-tag class="gateway-active-feed__method">{{ item.methodLabel }}</a-tag>
            <a-tooltip :title="item.requestURL" placement="topLeft">
              <code class="gateway-active-feed__url">{{ item.requestURL }}</code>
            </a-tooltip>
            <a-button
              class="gateway-active-feed__copy"
              type="text"
              size="small"
              :title="`复制 ${item.methodLabel} 请求 URL`"
              @click="emit('copy', item.requestURL)"
            >
              <template #icon><CopyOutlined /></template>
            </a-button>
          </div>
          <div class="gateway-active-feed__request">
            <span>请求 {{ item.requestedModelLabel }}</span>
            <span>命中 {{ item.actualModelLabel }}</span>
            <span v-if="item.routeTypeLabel">{{ item.routeTypeLabel }}</span>
            <span>{{ item.groupLabel }}</span>
            <span>{{ item.strategyLabel }}</span>
            <span>{{ item.attemptLabel }}</span>
          </div>
          <div class="gateway-active-feed__meta">
            <span v-for="(meta, index) in item.meta" :key="`${meta}-${index}`">{{ meta }}</span>
            <span>{{ item.timeLabel }}</span>
          </div>
          <div v-if="item.transferLines?.length || activityHasErrorDetail(item)" class="gateway-active-feed__errors">
            <a-tag
              v-for="line in item.transferLines"
              :key="`${line.label}:${line.value}`"
              :color="line.tone === 'error' ? 'error' : line.tone === 'success' ? 'success' : 'processing'"
            >
              {{ line.label }}
            </a-tag>
            <a-button
              v-if="activityHasErrorDetail(item)"
              type="link"
              size="small"
              @click="openActivityErrorDetail(item)"
            >
              错误详情
            </a-button>
          </div>
        </div>
      </div>
    </div>
    <a-empty v-else description="等待网关请求进入路由池。" />
  </section>
</template>
