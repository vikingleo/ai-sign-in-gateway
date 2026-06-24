import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/gateway/GatewayRouteDiagnosisDrawer.vue', import.meta.url)
const hostPath = new URL('../src/components/gateway/GatewayOverlayHost.vue', import.meta.url)

test('gateway route diagnosis drawer declares the diagnosis UI contract', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /const open = defineModel<boolean>\('open'/)
  assert.match(source, /type GatewayRouteDiagnosisView = Pick<GatewayRouteDiagnosis, 'route_label' \| 'healthy' \| 'active_count' \| 'checked_at' \| 'diagnostics'>/)
  assert.match(source, /diagnosis: GatewayRouteDiagnosisView \| null/)
  assert.match(source, /loading: boolean/)
  assert.match(source, /formatTime: \(value: string \| null\) => string/)
  assert.match(source, /<a-drawer/)
  assert.match(source, /v-model:open="open"/)
  assert.match(source, /width="520px"/)
  assert.match(source, /placement="right"/)
  assert.match(source, /<a-spin :spinning="loading"/)
  assert.match(source, /v-if="diagnosis"/)
  assert.match(source, /class="route-diagnosis"/)
  assert.match(source, /diagnosis\.healthy \? 'success' : 'error'/)
  assert.match(source, /路由关键检查通过/)
  assert.match(source, /路由存在阻断项/)
  assert.match(source, /diagnosis\.active_count/)
  assert.match(source, /formatTime\(diagnosis\.checked_at\)/)
  assert.match(source, /v-for="item in diagnosis\.diagnostics"/)
  assert.match(source, /route-diagnosis__item--\$\{item\.severity\}/)
  assert.match(source, /diagnosisSeverityColor\(item\.severity\)/)
  assert.match(source, /diagnosisSeverityLabel\(item\.severity\)/)
})

test('GatewayOverlayHost delegates route diagnosis drawer rendering to the component boundary', async () => {
  const source = await readFile(hostPath, 'utf8')

  assert.match(source, /import GatewayRouteDiagnosisDrawer from '\.\/GatewayRouteDiagnosisDrawer\.vue'/)
  assert.match(source, /<GatewayRouteDiagnosisDrawer/)
  assert.match(source, /v-model:open="routeDiagnosisOpen"/)
  assert.match(source, /:diagnosis="routeDiagnosis"/)
  assert.match(source, /:loading="routeDiagnosisLoading"/)
  assert.match(source, /:format-time="formatTime"/)
  assert.doesNotMatch(source, /<a-drawer\s+v-model:open="routeDiagnosisOpen"/)
  assert.doesNotMatch(source, /<div v-if="routeDiagnosis" class="route-diagnosis">/)
  assert.doesNotMatch(source, /routeDiagnosis\.diagnostics/)
})
