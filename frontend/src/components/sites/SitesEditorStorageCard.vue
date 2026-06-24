<script setup lang="ts">
const rawText = defineModel<string>('rawText', { required: true })

defineProps<{
  collectorScript: string
  analyzing: boolean
}>()

const emit = defineEmits<{
  copyScript: []
  analyze: []
  pastePayload: []
}>()
</script>

<template>
  <section class="site-editor-card site-editor-card--wide">
    <div class="site-editor-card__content">
      <div class="site-editor-section-head site-editor-section-head--between">
        <div>
          <div class="site-editor-section-head">
            <h3>浏览器存储导入</h3>
          </div>
          <p>在目标站点控制台运行采集脚本，粘贴输出后自动识别插件类型并回填账号凭证。</p>
        </div>
        <a-space wrap align="center">
          <a-button @click="emit('copyScript')">复制脚本</a-button>
          <a-button
            type="primary"
            :loading="analyzing"
            @click="emit('analyze')"
          >
            分析并回填
          </a-button>
        </a-space>
      </div>

      <div class="site-editor-storage-grid">
        <a-form-item label="控制台函数">
          <a-textarea
            :value="collectorScript"
            :rows="8"
            readonly
            aria-label="站点存储分析脚本"
          />
          <small class="field-help">复制后到目标站点控制台执行；脚本会尝试把结果写入剪贴板，并输出 URL、可读 Cookie、localStorage、sessionStorage 和可识别 token payload。</small>
        </a-form-item>

        <a-form-item label="脚本输出 JSON">
          <a-textarea
            v-model:value="rawText"
            :rows="8"
            placeholder="粘贴控制台输出的 JSON；粘贴后会自动分析。"
            aria-label="站点存储原始 JSON"
            @paste="emit('pastePayload')"
          />
          <small class="field-help">系统会自动切换插件类型，再把 access_token、refresh_token、邮箱、用户 ID、User-Agent 等写入当前插件支持的字段。</small>
        </a-form-item>
      </div>
    </div>
  </section>
</template>
