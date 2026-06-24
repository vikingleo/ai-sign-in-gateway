<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import {
  buildGatewaySelectedStrategyDescriptions,
  buildGatewayStrategyDescriptionItems,
} from '../../gatewaySettingsModel'
import {
  gatewayConcurrencyTransferOptions,
  gatewayFailureRetryModeOptions,
  gatewayOverflowStrategyOptions,
  gatewayRouteStrategyOptions,
} from '../../gatewayViewConfig'
import type { GatewaySettingsData } from '../../types'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  form: GatewaySettingsData
  loading: boolean
}>()

const emit = defineEmits<{
  save: [form: GatewaySettingsData]
}>()

const localForm = reactive<GatewaySettingsData>({ ...props.form })
const loading = computed(() => props.loading)
const selectedStrategyDescriptions = computed(() => buildGatewaySelectedStrategyDescriptions(localForm))
const gatewayStrategyDescriptionItems = computed(() => buildGatewayStrategyDescriptionItems(localForm))

watch(
  () => props.form,
  (value) => {
    Object.assign(localForm, value)
  },
  { deep: true },
)

function handleSave() {
  emit('save', { ...localForm })
}
</script>

<template>
  <a-modal
    v-model:open="open"
    title="网关策略"
    width="980px"
    wrap-class-name="gateway-settings-modal-wrap"
    class="gateway-settings-modal"
    :confirm-loading="loading"
    ok-text="确定"
    cancel-text="取消"
    @ok="handleSave"
  >
    <a-form layout="vertical">
      <div class="gateway-policy-settings-layout">
        <div class="gateway-policy-settings-layout__main">
          <a-row :gutter="16">
            <a-col :xs="24" :md="12">
              <a-form-item label="路由策略">
                <a-select
                  v-model:value="localForm.route_strategy"
                  :options="gatewayRouteStrategyOptions.map(({ label, value }) => ({ label, value }))"
                  aria-label="路由策略"
                />
                <small class="field-help">{{ selectedStrategyDescriptions.routeStrategy }}</small>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="最大尝试次数">
                <a-input-number
                  v-model:value="localForm.max_attempts"
                  style="width: 100%"
                  :min="0"
                  :max="50"
                  aria-label="最大尝试次数"
                />
                <small class="field-help">填 0 表示当前池里所有健康路由都可参与失败切换。</small>
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :xs="24" :md="12">
              <a-form-item label="熔断阈值">
                <a-input-number
                  v-model:value="localForm.failure_threshold"
                  style="width: 100%"
                  :min="1"
                  :max="20"
                  aria-label="熔断阈值"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="熔断冷却时间（秒）">
                <a-input-number
                  v-model:value="localForm.cooldown_seconds"
                  style="width: 100%"
                  :min="10"
                  :max="3600"
                  aria-label="熔断冷却时间"
                />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="网关请求超时（秒）">
            <a-input-number
              v-model:value="localForm.request_timeout"
              style="width: 100%"
              :min="5"
              :max="180"
              aria-label="网关请求超时"
            />
          </a-form-item>

          <a-form-item label="上游错误切换">
            <a-select
              v-model:value="localForm.failure_retry_mode"
              :options="gatewayFailureRetryModeOptions.map(({ label, value }) => ({ label, value }))"
              aria-label="上游错误切换"
            />
            <small class="field-help">{{ selectedStrategyDescriptions.failureRetryMode }}</small>
          </a-form-item>

          <a-row :gutter="16">
            <a-col :xs="24" :md="12">
              <a-form-item label="单路由最大转移">
                <a-input-number
                  v-model:value="localForm.route_concurrency_limit"
                  style="width: 100%"
                  :min="0"
                  :max="1000"
                  aria-label="单路由最大转移"
                />
                <small class="field-help">例如填 5，某条路由达到 5 个当前并发后，新请求会优先转到其他未达阈值路由；如果所有路由都已达到阈值，仍会继续选择并累加并发。填 0 表示不主动转移。</small>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="并发转移策略">
                <a-select
                  v-model:value="localForm.concurrency_transfer_strategy"
                  :options="gatewayConcurrencyTransferOptions.map(({ label, value }) => ({ label, value }))"
                  aria-label="并发转移策略"
                />
                <small class="field-help">{{ selectedStrategyDescriptions.concurrencyTransfer }}</small>
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :xs="24" :md="12">
              <a-form-item label="并发溢出优先级">
                <a-select
                  v-model:value="localForm.concurrency_overflow_strategy"
                  :options="gatewayOverflowStrategyOptions.map(({ label, value }) => ({ label, value }))"
                  aria-label="并发溢出优先级"
                />
                <small class="field-help">{{ selectedStrategyDescriptions.overflowStrategy }}</small>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-alert
                type="info"
                show-icon
                message="策略关系"
                description="并发转移策略决定未达到阈值时是否主动均衡；并发溢出优先级只在所有可用路由都达到转移阈值后参与排序。"
              />
            </a-col>
          </a-row>

          <div v-if="localForm.route_strategy === 'smart'" class="smart-bias-panel">
            <div class="smart-bias-panel__title">Smart 评分权重</div>
            <a-row :gutter="16">
              <a-col :xs="24" :md="12">
                <a-form-item label="延迟敏感度">
                  <a-input-number
                    v-model:value="localForm.smart_latency_bias"
                    style="width: 100%"
                    :min="0"
                    :max="5"
                    :step="0.1"
                    aria-label="延迟敏感度"
                  />
                  <small class="field-help">越大越偏向选择 EWMA 延迟更低的路由（默认 1.0）。</small>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item label="并发敏感度">
                  <a-input-number
                    v-model:value="localForm.smart_concurrency_bias"
                    style="width: 100%"
                    :min="0"
                    :max="5"
                    :step="0.1"
                    aria-label="并发敏感度"
                  />
                  <small class="field-help">越大越偏向当前空闲的路由（默认 1.5）。</small>
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col :xs="24" :md="12">
                <a-form-item label="失败惩罚强度">
                  <a-input-number
                    v-model:value="localForm.smart_failure_bias"
                    style="width: 100%"
                    :min="0"
                    :max="5"
                    :step="0.1"
                    aria-label="失败惩罚强度"
                  />
                  <small class="field-help">控制连续失败 / 最近失败 / 失败率三类信号的权重（默认 1.0）。</small>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item label="优先级 / 权重偏好">
                  <a-input-number
                    v-model:value="localForm.smart_priority_bias"
                    style="width: 100%"
                    :min="0"
                    :max="5"
                    :step="0.1"
                    aria-label="优先级权重偏好"
                  />
                  <small class="field-help">越大越遵循路由的 priority / weight 设置（默认 0.5）。</small>
                </a-form-item>
              </a-col>
            </a-row>
          </div>

          <a-form-item label="GATEWAY_API_KEY">
            <a-input-password
              v-model:value="localForm.gateway_api_key"
              placeholder="用于 cc-switch / OpenAI 客户端请求网关的 Bearer Key"
              allow-clear
              aria-label="GATEWAY API Key"
            />
            <small class="field-help">保存后客户端需使用 Authorization: Bearer 这个 Key；留空时公开网关会被禁用。</small>
          </a-form-item>
        </div>

        <aside class="gateway-policy-settings-layout__side">
          <div class="gateway-policy-help">
            <div class="gateway-policy-help__title">策略说明</div>
            <div class="gateway-policy-help__grid">
              <div
                v-for="item in gatewayRouteStrategyOptions"
                :key="item.value"
                class="gateway-policy-help__item"
                :class="{ 'gateway-policy-help__item--active': item.value === localForm.route_strategy }"
              >
                <strong>{{ item.label }}</strong>
                <span>{{ item.description }}</span>
              </div>
            </div>
            <div class="gateway-policy-help__notes">
              <div v-for="item in gatewayStrategyDescriptionItems" :key="item.label">
                <strong>{{ item.label }}</strong>
                <span>{{ item.value }}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </a-form>
  </a-modal>
</template>
