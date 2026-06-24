<script setup lang="ts">
import type { RouteBatchProgress } from '../../gatewayViewModel'

withDefaults(
  defineProps<{
    label: string
    loading: boolean
    disabled: boolean
    progress: RouteBatchProgress | null
    progressPercent: number
    tone?: 'default' | 'balance'
  }>(),
  {
    tone: 'default',
  },
)

const emit = defineEmits<{
  (event: 'action'): void
}>()
</script>

<template>
  <div class="route-probe-control">
    <a-button :loading="loading" :disabled="disabled" @click="emit('action')">{{ label }}</a-button>
    <div
      v-if="progress"
      class="route-probe-progress"
      :class="{ 'route-probe-progress--balance': tone === 'balance' }"
    >
      <div class="route-probe-progress__meta">
        <span>{{ progress.done }}/{{ progress.total }}</span>
        <span>{{ progress.success }} 成功 / {{ progress.failed }} 失败</span>
      </div>
      <div class="route-probe-progress__bar" aria-hidden="true">
        <span :style="{ width: `${progressPercent}%` }"></span>
      </div>
    </div>
  </div>
</template>
