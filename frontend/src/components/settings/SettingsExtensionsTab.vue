<script setup lang="ts">
import { SaveOutlined } from '@ant-design/icons-vue'
import type { SettingsViewController } from '../../settingsViewController'

defineProps<{
  view: SettingsViewController
}>()
</script>

<template>
  <div class="card-form runtime-tab-form">
    <div class="card-scroll card-scroll--padded">
      <a-form layout="vertical">
        <a-list :data-source="view.form.features" item-layout="horizontal" class="extension-settings-list">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta :title="item.name" :description="item.description || item.key" />
              <a-switch
                class="app-switch app-switch--text"
                :checked="Boolean(view.form.feature_flags[item.key] ?? item.default_enabled)"
                :aria-label="`切换${item.name}`"
                checked-children="启用"
                un-checked-children="关闭"
                @change="(checked) => { view.form.feature_flags[item.key] = checked === true }"
              />
            </a-list-item>
          </template>
        </a-list>
        <a-empty v-if="!view.form.features.length" description="未安装扩展" />
        <div class="card-actions card-actions--left">
          <a-button type="primary" :loading="view.loading" @click="view.save">
            <template #icon><SaveOutlined /></template>
            保存设置
          </a-button>
        </div>
      </a-form>
    </div>
  </div>
</template>
