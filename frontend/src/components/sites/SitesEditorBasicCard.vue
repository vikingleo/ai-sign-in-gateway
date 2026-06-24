<script setup lang="ts">
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import type { SelectProps } from 'ant-design-vue'
import type { SitePayload, SiteRegistrationBatchResult } from '../../types'

type BatchRegisterForm = {
  email_pattern: string
  password: string
  count: number
  start_index: number
}

const groupNames = defineModel<string[]>('groupNames', { required: true })
const batchRegisterEnabled = defineModel<boolean>('batchRegisterEnabled', { required: true })

defineProps<{
  editingId: number | null
  canBatchRegister: boolean
  batchForm: BatchRegisterForm
  batchResult: SiteRegistrationBatchResult | null
  editor: SitePayload
  pluginOptions: SelectProps['options']
  groupOptions: SelectProps['options']
  emailPatternExamples: string[]
}>()
</script>

<template>
  <section class="site-editor-card site-editor-card--info site-editor-card--gateway">
    <div class="site-editor-card__content">
      <div class="site-editor-section-head">
        <h3>基础信息</h3>
      </div>

      <div v-if="!editingId && canBatchRegister" class="nested-form-block site-editor-subblock">
        <div class="site-editor-subblock__head site-editor-subblock__head--between">
          <h4>批量注册生成账号</h4>
          <a-switch
            class="app-switch app-switch--text"
            v-model:checked="batchRegisterEnabled"
            aria-label="启用批量注册生成账号"
            checked-children="启用"
            un-checked-children="关闭"
          />
        </div>
        <a-alert
          type="warning"
          show-icon
          message="仅用于对注册邮箱验证不敏感、且你确认允许批量注册的站点。"
          description="保存时会按邮箱规则循环请求注册接口，登录新账号，同步 API Key，并把每个账号创建为一个站点。"
          class="site-editor-config-alert"
        />
        <a-row v-if="batchRegisterEnabled" :gutter="[18, 4]">
          <a-col :xs="24" :md="12">
            <a-form-item>
              <template #label>
                <span class="field-label-help">
                  邮箱规则
                  <a-tooltip placement="right">
                    <template #title>
                      <div class="email-pattern-tooltip">
                        <div v-for="example in emailPatternExamples" :key="example">{{ example }}</div>
                      </div>
                    </template>
                    <QuestionCircleOutlined class="field-help-icon" aria-hidden="true" />
                  </a-tooltip>
                </span>
              </template>
            <a-input
              v-model:value="batchForm.email_pattern"
              placeholder="user+{n}@example.com"
              aria-label="批量注册邮箱规则"
            />
              <small class="field-help">支持序号和随机字符，例如 user+{n:03}@example.com。</small>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="注册密码">
              <a-input-password v-model:value="batchForm.password" placeholder="所有账号使用同一密码" aria-label="批量注册密码" />
            </a-form-item>
          </a-col>
          <a-col :xs="12" :md="6">
            <a-form-item label="请求次数">
              <a-input-number v-model:value="batchForm.count" :min="1" :max="100" style="width: 100%" aria-label="批量注册请求次数" />
            </a-form-item>
          </a-col>
          <a-col :xs="12" :md="6">
            <a-form-item label="起始序号">
              <a-input-number v-model:value="batchForm.start_index" :min="1" style="width: 100%" aria-label="批量注册起始序号" />
            </a-form-item>
          </a-col>
        </a-row>
        <div v-if="batchResult" class="result-block">
          <p>创建 {{ batchResult.created_count }} 个，失败 {{ batchResult.failed_count }} 个。</p>
          <p v-for="item in batchResult.items.slice(0, 5)" :key="`${item.index}-${item.email}`">
            {{ item.ok ? '成功' : '失败' }} #{{ item.index }} {{ item.email }}：{{ item.message }}
          </p>
        </div>
      </div>

      <a-row :gutter="[18, 4]">
        <a-col :xs="24" :md="12">
          <a-form-item label="站点名称">
            <a-input v-model:value="editor.name" aria-label="站点名称" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item label="基础 URL">
            <a-input v-model:value="editor.base_url" aria-label="基础 URL" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item label="插件类型">
            <a-select v-model:value="editor.plugin_key" :options="pluginOptions" aria-label="插件类型" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item label="分组标签">
            <a-select
              v-model:value="groupNames"
              mode="multiple"
              :options="groupOptions"
              :max-tag-count="4"
              placeholder="选择分组"
              aria-label="分组标签"
            />
            <small class="field-help">分组请在站点中心顶部“分组管理”里单独维护；这里仅负责选择。</small>
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="站点备注">
        <a-textarea v-model:value="editor.notes" :rows="3" placeholder="请输入站点备注（选填）" aria-label="站点备注" />
      </a-form-item>

      <a-form-item label="启用状态" class="site-editor-switch-item">
        <a-switch
          class="app-switch app-switch--text"
          v-model:checked="editor.is_enabled"
          aria-label="启用站点"
          checked-children="启用"
          un-checked-children="停用"
        />
      </a-form-item>
    </div>
  </section>
</template>
