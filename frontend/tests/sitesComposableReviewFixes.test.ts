import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sitesViewControllerPath = new URL('../src/composables/useSitesViewController.ts', import.meta.url)
const sitesApiKeyDialogPath = new URL('../src/composables/useSitesApiKeyDialog.ts', import.meta.url)
const sitesRuntimeChecksPath = new URL('../src/composables/useSitesRuntimeChecks.ts', import.meta.url)
const sitesDataPath = new URL('../src/composables/useSitesData.ts', import.meta.url)
const sitesInvitesPath = new URL('../src/composables/useSitesInvites.ts', import.meta.url)
const sitesCheckinConfigModalPath = new URL('../src/components/sites/SitesCheckinConfigModal.vue', import.meta.url)
const sitesApiKeyDialogComponentPath = new URL('../src/components/sites/SitesApiKeyDialog.vue', import.meta.url)
const sitesEditorCredentialsCardPath = new URL('../src/components/sites/SitesEditorCredentialsCard.vue', import.meta.url)
const sitesCCSwitchComposablePath = new URL('../src/composables/useSitesCCSwitch.ts', import.meta.url)
const sitesToolbarPath = new URL('../src/components/sites/SitesToolbar.vue', import.meta.url)
const sitesCheckinPath = new URL('../src/composables/useSitesCheckin.ts', import.meta.url)
const sitesEditorActionsPath = new URL('../src/composables/useSitesEditorActions.ts', import.meta.url)
const sitesQueuePath = new URL('../src/composables/useSitesQueue.ts', import.meta.url)
const sitesPageContentPath = new URL('../src/components/sites/SitesPageContent.vue', import.meta.url)
const sitesTableCardPath = new URL('../src/components/sites/SitesTableCard.vue', import.meta.url)
const apiSitesPath = new URL('../src/apiSites.ts', import.meta.url)
const apiOverviewPath = new URL('../src/apiOverview.ts', import.meta.url)
const apiSettingsPath = new URL('../src/apiSettings.ts', import.meta.url)

test('sites view controller reports site group reload errors from the event listener', async () => {
  const source = await readFile(sitesViewControllerPath, 'utf8')

  assert.match(source, /async function handleSiteGroupsChanged\(\)/)
  assert.match(source, /await loadData\(editingId\.value \?\? selectedId\.value, \{ preserveEditor: true \}\)/)
  assert.match(source, /catch \(err\)/)
  assert.match(source, /toast\.error\(err instanceof Error \? err\.message : '站点分组刷新失败'\)/)
})

test('sites api key dialog saves with object fallbacks for nullable config payloads', async () => {
  const source = await readFile(sitesApiKeyDialogPath, 'utf8')

  assert.match(source, /credentials: JSON\.parse\(JSON\.stringify\(site\.credentials \?\? \{\}\)\)/)
  assert.match(source, /plugin_config: JSON\.parse\(JSON\.stringify\(site\.plugin_config \?\? \{\}\)\)/)
  assert.match(source, /payload\.plugin_config\.api_request_urls = normalizeStringList/)
})

test('sites runtime checks prevent duplicate balance probes per site', async () => {
  const source = await readFile(sitesRuntimeChecksPath, 'utf8')

  assert.match(source, /if \(balanceProbeIds\.value\.includes\(site\.id\)\) \{\s+return\s+\}/)
  assert.match(source, /const nextProbeIds = \[\.\.\.balanceProbeIds\.value\]/)
  assert.match(source, /nextProbeIds\.splice\(probeIndex, 1\)/)
})

test('sites manual refresh reports success only after data and summary refresh succeed', async () => {
  const sitesView = await readFile(sitesViewControllerPath, 'utf8')
  const sitesData = await readFile(sitesDataPath, 'utf8')
  const runtimeChecks = await readFile(sitesRuntimeChecksPath, 'utf8')

  assert.match(sitesData, /throwOnError\?: boolean/)
  assert.match(sitesData, /if \(loadOptions\.throwOnError\) \{\s+throw err\s+\}/)
  assert.match(runtimeChecks, /type RefreshTableSummariesOptions = \{\s+throwOnError\?: boolean\s+\}/)
  assert.match(runtimeChecks, /if \(refreshOptions\.throwOnError\) \{\s+throw err\s+\}/)
  assert.match(sitesView, /await loadData\(preferredId, \{ throwOnError: true \}\)/)
  assert.match(sitesView, /await runtime\.refreshTableSummaries\(\{ throwOnError: true \}\)/)
  assert.match(sitesView, /try \{[\s\S]*toast\.success\('站点数据已刷新。'\)[\s\S]*\} catch \{\s+return\s+\}/)
})

test('sites invites prevent duplicate invite loads per site', async () => {
  const source = await readFile(sitesInvitesPath, 'utf8')

  assert.match(source, /if \(inviteLoadingSiteIds\.value\.includes\(targetSite\.id\)\) \{\s+return\s+\}/)
  assert.match(source, /inviteLoadingSiteIds\.value = \[\.\.\.inviteLoadingSiteIds\.value, targetSite\.id\]/)
})

test('sites checkin config modal edits a local form and emits an explicit save payload', async () => {
  const source = await readFile(sitesCheckinConfigModalPath, 'utf8')

  assert.match(source, /const localForm = reactive<SettingsData>\(\{ \.\.\.props\.form \}\)/)
  assert.match(source, /Object\.assign\(localForm, value\)/)
  assert.match(source, /emit\('save', \{ \.\.\.localForm \}\)/)
  assert.match(source, /@ok="handleSave"/)
  assert.match(source, /v-model:value="localForm\.timezone"/)
  assert.doesNotMatch(source, /v-model:[^=]+="form\./)
})

test('sites api key dialog passes Ant Design password visibility prop in camelCase', async () => {
  const source = await readFile(sitesApiKeyDialogComponentPath, 'utf8')

  assert.match(source, /visibilityToggle/)
  assert.doesNotMatch(source, /visibility-toggle/)
})

test('sites api key dialog does not report success when manual key already exists', async () => {
  const source = await readFile(sitesApiKeyDialogPath, 'utf8')

  assert.match(source, /let apiKeyAdded = false/)
  assert.match(source, /apiKeyAdded = true/)
  assert.match(source, /if \(!apiKeyAdded\) \{\s+return\s+\}/)
  assert.match(source, /resetManualApiKeyForm\(manualApiKeyForm, site\)[\s\S]*options\.toast\.success\('自定义 API Key 已加入本地配置，保存后生效。'\)/)
})

test('sites editor totp textarea uses centralized autocomplete helper', async () => {
  const source = await readFile(sitesEditorCredentialsCardPath, 'utf8')

  assert.match(source, /:autocomplete="credentialAutocomplete\(field\.name, 'textarea'\)"/)
  assert.doesNotMatch(source, /autocomplete="off"/)
})

test('cc-switch ui is disabled while Go backend has no active implementation route', async () => {
  const composable = await readFile(sitesCCSwitchComposablePath, 'utf8')
  const toolbar = await readFile(sitesToolbarPath, 'utf8')

  assert.match(composable, /const ccSwitchAvailable = false/)
  assert.match(composable, /options\.toast\.info\(ccSwitchDisabledReason\)/)
  assert.match(toolbar, /ccSwitchAvailable: boolean/)
  assert.match(toolbar, /:disabled="!ccSwitchAvailable"/)
})

test('sites queue backend endpoints are exposed through the sites page', async () => {
  const queue = await readFile(sitesQueuePath, 'utf8')
  const page = await readFile(sitesPageContentPath, 'utf8')
  const table = await readFile(sitesTableCardPath, 'utf8')

  assert.match(queue, /getSiteQueue\(site\.id\)/)
  assert.match(queue, /activateSiteQueueTask\(queueSite\.value\.id, task\.task_key\)/)
  assert.match(page, /<SitesQueueDialog/)
  assert.match(page, /@open-queue="view\.openQueue"/)
  assert.match(table, /'open-queue': \[site: Site\]/)
  assert.match(table, /<span>队列任务<\/span>/)
})

test('sites editor draft test uses backend draft endpoint without saving first', async () => {
  const source = await readFile(sitesEditorActionsPath, 'utf8')

  assert.match(source, /testSiteDraft\(\{\s+\.\.\.editorPayload\(\),\s+site_id: activeSite\.id,/)
  assert.doesNotMatch(source, /const finalSaved = await updateSite\(activeSite\.id, editorPayload\(\)\)/)
  assert.doesNotMatch(source, /测试前已保存当前表单/)
})

test('sites batch checkin uses backend batch endpoint', async () => {
  const source = await readFile(sitesCheckinPath, 'utf8')

  assert.match(source, /runBatch\(siteIds, onlyEnabled\)/)
  assert.doesNotMatch(source, /for \(const site of targets\) \{\s+try \{\s+const result = await runSiteCheckin\(site\.id\)/)
})

test('sites batch checkin preserves backend only-enabled defaults', async () => {
  const sitesApi = await readFile(apiSitesPath, 'utf8')
  const sitesCheckin = await readFile(sitesCheckinPath, 'utf8')

  assert.match(sitesApi, /runBatch\(siteIds: number\[\] = \[\], onlyEnabled\?: boolean\)/)
  assert.match(sitesApi, /const payload: \{ site_ids: number\[\]; only_enabled\?: boolean \} = \{ site_ids: siteIds \}/)
  assert.match(sitesApi, /if \(onlyEnabled !== undefined\) \{\s+payload\.only_enabled = onlyEnabled\s+\}/)
  assert.match(sitesCheckin, /const checkinConfigForm = reactive<SettingsData>\(createDefaultCheckinConfig\(\)\)/)
  assert.match(sitesCheckin, /const savedCheckinOnlyEnabledSites = ref\(checkinConfigForm\.only_enabled_sites\)/)
  assert.doesNotMatch(sitesCheckin, /const defaultCheckinConfig =/)
  assert.match(sitesCheckin, /savedCheckinOnlyEnabledSites\.value = settingsData\.only_enabled_sites/)
  assert.match(sitesCheckin, /savedCheckinOnlyEnabledSites\.value = savedSettings\.only_enabled_sites/)
  assert.match(sitesCheckin, /const effectiveOnlyEnabled = onlyEnabled \?\? savedCheckinOnlyEnabledSites\.value/)
  assert.match(sitesCheckin, /readBatchCheckinTargetSites\(options\.sites\.value, checkinMeta\.value, effectiveOnlyEnabled\)/)
  assert.match(sitesCheckin, /checkinBatchTargetCount = computed/)
  assert.match(sitesCheckin, /readBatchCheckinTargetCount\(options\.sites\.value, checkinMeta\.value, savedCheckinOnlyEnabledSites\.value\)/)
  assert.match(sitesCheckin, /executeCheckinBatch\(\[\], undefined\)/)
  assert.match(sitesCheckin, /executeCheckinBatch\(\[\.\.\.selectedCheckinIds\.value\], false\)/)
})

test('sites toolbar enables the batch checkin button from the resolved target count', async () => {
  const toolbar = await readFile(sitesToolbarPath, 'utf8')
  const page = await readFile(sitesPageContentPath, 'utf8')

  assert.match(toolbar, /checkinBatchTargetCount: number/)
  assert.match(toolbar, /:disabled="!checkinBatchTargetCount"/)
  assert.match(page, /:checkin-batch-target-count="view\.checkinBatchTargetCount"/)
  assert.doesNotMatch(toolbar, /includedCheckinCount/)
  assert.doesNotMatch(page, /included-checkin-count/)
})

test('unused frontend wrappers are not reintroduced', async () => {
  const overviewApi = await readFile(apiOverviewPath, 'utf8')
  const settingsApi = await readFile(apiSettingsPath, 'utf8')
  const sitesApi = await readFile(apiSitesPath, 'utf8')

  assert.doesNotMatch(overviewApi, /export function getFeatures/)
  assert.doesNotMatch(settingsApi, /export function importRuntimeDatabase/)
  assert.doesNotMatch(sitesApi, /export function importCCSwitchConfig/)
  assert.doesNotMatch(sitesApi, /export function convertCCSwitchSql/)
  assert.doesNotMatch(sitesApi, /export function importCCSwitchSql/)
  assert.doesNotMatch(sitesApi, /export function exportCCSwitchConfig/)
})
