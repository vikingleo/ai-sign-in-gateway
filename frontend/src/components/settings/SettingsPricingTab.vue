<script setup lang="ts">
import { CopyOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons-vue'
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
          type="info"
          show-icon
          message="价格按上游返回的 usage token 计算"
          description="官方价格方案不可修改；复制为自定义方案后可调整模型前缀和每 100 万 token 单价。未返回 usage 或未匹配价格的请求会计为未知费用。"
          class="settings-security-alert"
        />

        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="当前价格方案">
              <a-select
                v-model:value="view.form.gateway_pricing_active_scheme_id"
                aria-label="当前价格方案"
                :options="view.pricingSchemeOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="方案操作">
              <a-space wrap>
                <a-button @click="view.duplicateActivePricingScheme">
                  <template #icon><CopyOutlined /></template>
                  复制当前方案
                </a-button>
                <a-tag v-if="view.activePricingScheme?.readonly">官方只读</a-tag>
                <a-tag v-else color="processing">自定义可编辑</a-tag>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>

        <template v-if="view.activePricingScheme">
          <a-row :gutter="16">
            <a-col :xs="24" :md="12">
              <a-form-item label="方案名称">
                <a-input
                  v-model:value="view.activePricingScheme.name"
                  aria-label="方案名称"
                  :readonly="!view.activePricingEditable"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="来源">
                <a-input
                  v-model:value="view.activePricingScheme.source"
                  aria-label="来源"
                  :readonly="!view.activePricingEditable"
                />
              </a-form-item>
            </a-col>
          </a-row>

          <div class="pricing-grid pricing-grid--head">
            <span>提供方</span>
            <span>模型前缀</span>
            <span>显示名称</span>
            <span>输入 / MTok</span>
            <span>缓存读 / MTok</span>
            <span>缓存写 / MTok</span>
            <span>输出 / MTok</span>
            <span>操作</span>
          </div>
          <div
            v-for="(price, index) in view.activePricingScheme.prices"
            :key="view.priceRowKey(price, index)"
            class="pricing-grid"
          >
            <a-select
              v-if="view.activePricingEditable"
              v-model:value="price.provider"
              :aria-label="`第 ${index + 1} 行提供方`"
              :options="view.pricingProviderOptions"
            />
            <a-tag v-else>{{ price.provider }}</a-tag>
            <a-input
              v-model:value="price.model_prefix"
              :aria-label="`第 ${index + 1} 行模型前缀`"
              :readonly="!view.activePricingEditable"
              placeholder="gpt-5.5"
            />
            <a-input
              v-model:value="price.display_name"
              :aria-label="`第 ${index + 1} 行显示名称`"
              :readonly="!view.activePricingEditable"
              placeholder="显示名称"
            />
            <a-input-number
              v-model:value="price.input_per_mtok"
              :aria-label="`第 ${index + 1} 行输入每百万 token 单价`"
              style="width: 100%"
              :min="0"
              :step="0.001"
              :disabled="!view.activePricingEditable"
            />
            <a-input-number
              v-model:value="price.cached_input_per_mtok"
              :aria-label="`第 ${index + 1} 行缓存读每百万 token 单价`"
              style="width: 100%"
              :min="0"
              :step="0.001"
              :disabled="!view.activePricingEditable"
            />
            <a-input-number
              v-model:value="price.cache_write_per_mtok"
              :aria-label="`第 ${index + 1} 行缓存写每百万 token 单价`"
              style="width: 100%"
              :min="0"
              :step="0.001"
              :disabled="!view.activePricingEditable"
            />
            <a-input-number
              v-model:value="price.output_per_mtok"
              :aria-label="`第 ${index + 1} 行输出每百万 token 单价`"
              style="width: 100%"
              :min="0"
              :step="0.001"
              :disabled="!view.activePricingEditable"
            />
            <a-button
              danger
              size="small"
              :disabled="!view.activePricingEditable"
              @click="view.removePricingRow(index)"
            >
              删除
            </a-button>
          </div>

          <div class="card-actions card-actions--left">
            <a-space wrap>
              <a-button :disabled="!view.activePricingEditable" @click="view.addPricingRow">
                <template #icon><PlusOutlined /></template>
                添加价格
              </a-button>
              <a-button type="primary" :loading="view.loading" @click="view.save">
                <template #icon><SaveOutlined /></template>
                保存设置
              </a-button>
            </a-space>
          </div>
        </template>
      </a-form>
    </div>
  </div>
</template>
