import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = fileURLToPath(new URL('../src', import.meta.url))

function sourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...sourceFiles(path))
      continue
    }
    if (['.vue', '.ts', '.css'].includes(extname(entry.name))) {
      files.push(path)
    }
  }
  return files
}

function lineNumber(source: string, index: number): number {
  return source.slice(0, index).split('\n').length
}

function hasAttribute(tag: string, name: string): boolean {
  return new RegExp(`(?:^|\\s)(?::|v-bind:)?${name}\\s*=`).test(tag)
}

function classAttribute(tag: string): string {
  const match = tag.match(/\s(?:v-bind:|:)?class\s*=\s*(['"])(.*?)\1/)
  if (!match) {
    return ''
  }
  if (!/(?:^|\s)(?::|v-bind:)class\s*=/.test(match[0])) {
    return match[2]
  }

  const expression = match[2].trim()
  if (expression.startsWith('[')) {
    return Array.from(expression.matchAll(/['"]([^'"]+)['"]/g), (item) => item[1]).join(' ')
  }
  if (expression.startsWith('{')) {
    return Array.from(expression.matchAll(/(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$-]*))\s*:/g), (item) => item[1] ?? item[2]).join(' ')
  }
  // Complex computed bindings such as :class="computedClass" are unsupported by this static contract.
  return ''
}

test('all Ant Design switches use the shared visual contract', async () => {
  const failures: string[] = []
  for (const file of sourceFiles(frontendRoot)) {
    if (!file.endsWith('.vue')) {
      continue
    }
    const source = await readFile(file, 'utf8')
    const matches = source.matchAll(/<a-switch\b[^>]*>/g)
    for (const match of matches) {
      const tag = match[0]
      const classes = classAttribute(tag)
      if (!classes.split(/\s+/).includes('app-switch')) {
        failures.push(`${relative(frontendRoot, file)}:${lineNumber(source, match.index ?? 0)}`)
      }
      if (!hasAttribute(tag, 'aria-label') && !hasAttribute(tag, 'aria-labelledby')) {
        failures.push(`${relative(frontendRoot, file)}:${lineNumber(source, match.index ?? 0)} missing accessible name`)
      }
    }
  }

  assert.deepEqual(failures, [])
})

test('shared switch sizing keeps text lanes proportional to the handle', async () => {
  const rhythm = await readFile(join(frontendRoot, 'styles/app-visual-rhythm.css'), 'utf8')
  const switches = await readFile(join(frontendRoot, 'styles/app-switches.css'), 'utf8')

  assert.match(rhythm, /--switch-height: 28px;/)
  assert.match(rhythm, /--switch-handle-size: 20px;/)
  assert.match(rhythm, /--switch-width-compact: 62px;/)
  assert.match(rhythm, /--switch-width-text: 76px;/)
  assert.match(rhythm, /--switch-width-wide: 88px;/)
  assert.match(rhythm, /--switch-track-disabled-checked: #cbd5e1;/)
  assert.match(rhythm, /--switch-text-disabled: #475569;/)
  assert.match(rhythm, /--switch-text-on: var\(--accent-foreground\);/)
  assert.match(switches, /\.ant-switch\.app-switch \{/)
  assert.match(switches, /border-radius: var\(--radius-control\) !important;/)
  assert.match(switches, /\.ant-switch\.app-switch\.ant-switch-disabled \{/)
  assert.match(switches, /color: var\(--switch-text-on\) !important;/)
  assert.match(switches, /inset-inline-end: calc\(var\(--switch-handle-size\) \+ var\(--switch-handle-gap\)\) !important;/)
  assert.match(switches, /transition: opacity 0\.16s ease !important;/)
  assert.doesNotMatch(switches, /translateX/)
  assert.match(switches, /overflow: hidden !important;/)
  assert.match(switches, /text-overflow: ellipsis !important;/)
})

test('shared switch variables are loaded before responsive overrides', async () => {
  const appStyles = await readFile(join(frontendRoot, 'style.css'), 'utf8')
  const visualAlignment = await readFile(join(frontendRoot, 'styles/app-visual-alignment.css'), 'utf8')
  const responsive = await readFile(join(frontendRoot, 'styles/app-visual-responsive.css'), 'utf8')

  assert.match(appStyles, /@import '\.\/styles\/app-visual-alignment\.css';/)
  assert.match(visualAlignment, /@import '\.\/app-visual-rhythm\.css';\n@import '\.\/app-switches\.css';\n@import '\.\/app-visual-workbench\.css';\n@import '\.\/app-visual-responsive\.css';/)
  assert.match(responsive, /Baseline switch variables live in app-visual-rhythm\.css/)
  assert.match(responsive, /\.route-pool-filter-switch\.ant-switch \{[\s\S]*--switch-height: 34px;/)
})

test('shared input sizing does not collapse multiline textareas', async () => {
  const rhythm = await readFile(join(frontendRoot, 'styles/app-visual-rhythm.css'), 'utf8')
  const editorForms = await readFile(join(frontendRoot, 'styles/sites-view-editor-forms.css'), 'utf8')
  const apiKeyDialog = await readFile(join(frontendRoot, 'styles/sites-view-api-key-dialog.css'), 'utf8')
  const managementSiteEditor = await readFile(join(frontendRoot, 'styles/management-site-editor-overrides.css'), 'utf8')

  assert.match(rhythm, /\.ant-input:not\(textarea\),/)
  assert.match(rhythm, /textarea\.ant-input \{[\s\S]*height: auto !important;[\s\S]*min-height: 96px !important;/)
  assert.match(rhythm, /textarea\.ant-input\[rows='8'\] \{[\s\S]*min-height: 180px !important;/)
  assert.match(rhythm, /\.ant-input-password\.ant-input-affix-wrapper \{[\s\S]*display: inline-flex !important;[\s\S]*gap: 8px;/)
  assert.doesNotMatch(rhythm, /\.ant-input,\s*\n\.ant-input-affix-wrapper,[\s\S]*height: var\(--control-height\) !important;/)
  assert.match(editorForms, /\.site-editor-shell textarea\.ant-input \{[\s\S]*height: auto !important;[\s\S]*min-height: 124px !important;/)
  assert.match(editorForms, /\.site-editor-storage-grid textarea\.ant-input \{[\s\S]*min-height: 220px !important;/)
  assert.match(editorForms, /\.site-editor-grid--relay \.site-editor-column--config textarea\.ant-input \{[\s\S]*min-height: 188px !important;/)
  assert.match(apiKeyDialog, /\.api-key-dialog-modal textarea\.ant-input\[rows='8'\] \{[\s\S]*min-height: 220px !important;/)
  assert.match(managementSiteEditor, /\.site-editor-modal\.site-editor-modal \.site-editor-shell \.ant-input-affix-wrapper \.ant-input \{[\s\S]*min-height: 0 !important;/)
  assert.match(managementSiteEditor, /\.site-editor-modal\.site-editor-modal \.site-editor-column--config textarea\.ant-input \{[\s\S]*min-height: 168px !important;/)
  assert.match(managementSiteEditor, /\.site-editor-modal\.site-editor-modal \.site-editor-grid--relay \.site-editor-column--config textarea\.ant-input \{[\s\S]*min-height: 188px !important;/)
})

test('site editor long credential fields span the full form width', async () => {
  const source = await readFile(join(frontendRoot, 'components/sites/SitesEditorCredentialsCard.vue'), 'utf8')

  assert.match(source, /const longCredentialFieldPattern = \/\(api_\?key\|access_\?token\|refresh_\?token\|secret\|cookie\|credential\)\/i/)
  assert.match(source, /function credentialFieldSpan/)
  assert.match(source, /fieldCount === 1[\s\S]*\|\| field\.type === 'textarea'[\s\S]*\|\| field\.type === 'password'/)
  assert.match(source, /:md="credentialFieldSpan\(field, primaryFields\.length\)"/)
  assert.match(source, /:md="credentialFieldSpan\(field, manualLoginFields\.length\)"/)
})

test('site editor relay layout keeps long forms readable', async () => {
  const modal = await readFile(join(frontendRoot, 'components/sites/SitesEditorModal.vue'), 'utf8')
  const core = await readFile(join(frontendRoot, 'styles/sites-view-editor-core.css'), 'utf8')

  assert.match(modal, /:class="\{ 'site-editor-modal--relay': isRelayOnlyEditor \}"/)
  assert.match(modal, /:class="\{ 'site-editor-grid--relay': isRelayOnlyEditor \}"/)
  assert.match(modal, /site-editor-column site-editor-column--storage/)
  assert.match(core, /\.site-editor-grid--relay \{[\s\S]*grid-template-columns: minmax\(0, 0\.82fr\) minmax\(520px, 1fr\);/)
  assert.match(core, /\.site-editor-column--storage \{[\s\S]*grid-column: 1 \/ -1;/)
  assert.match(core, /\.site-editor-storage-grid \{[\s\S]*grid-template-columns: repeat\(2, minmax\(420px, 1fr\)\);/)
})

test('site dashboard metrics use real icons and consistent icon containers', async () => {
  const component = await readFile(join(frontendRoot, 'components/sites/SitesMetricsGrid.vue'), 'utf8')
  const styles = await readFile(join(frontendRoot, 'styles/sites-view-dashboard.css'), 'utf8')

  assert.match(component, /AppstoreOutlined/)
  assert.match(component, /SafetyCertificateOutlined/)
  assert.match(component, /ExclamationCircleOutlined/)
  assert.doesNotMatch(component, /sites-stat-card__icon--sheet/)
  assert.doesNotMatch(component, /sites-stat-card__icon--users/)
  assert.match(styles, /\.sites-stat-card__icon \{[\s\S]*width: 40px;[\s\S]*height: 40px;/)
  assert.match(styles, /\.sites-stat-card__icon--success \{[\s\S]*background: var\(--success-soft\);/)
  assert.match(styles, /\.sites-stat-card__icon--danger \{[\s\S]*background: var\(--danger-soft\);/)
})

test('header tags and sidebar navigation match the rectangular control style', async () => {
  const header = await readFile(join(frontendRoot, 'styles/shell-layout-header.css'), 'utf8')
  const navigation = await readFile(join(frontendRoot, 'styles/app-shell-navigation.css'), 'utf8')

  assert.match(header, /\.app-header__user\.app-header__user\.ant-tag \{[\s\S]*border-radius: var\(--radius-control\) !important;/)
  assert.match(navigation, /\.app-menu\.ant-menu-light \.ant-menu-item::after,[\s\S]*display: none !important;/)
  assert.match(navigation, /\.app-menu\.ant-menu-light \.ant-menu-item:not\(\.ant-menu-item-selected\):hover,[\s\S]*background-color: #dbeafe !important;/)
  assert.match(navigation, /transform: translateX\(1px\);/)
})

test('status markers preserve dot semantics without circular styling', async () => {
  const navigation = await readFile(join(frontendRoot, 'styles/app-shell-navigation.css'), 'utf8')
  const desktop = await readFile(join(frontendRoot, 'styles/desktop-service.css'), 'utf8')
  const gatewayFeed = await readFile(join(frontendRoot, 'styles/gateway-view-feed.css'), 'utf8')
  const gatewayRouteTable = await readFile(join(frontendRoot, 'styles/gateway-view-route-table.css'), 'utf8')
  const overviewFeed = await readFile(join(frontendRoot, 'styles/overview-feed.css'), 'utf8')
  const loginMetrics = await readFile(join(frontendRoot, 'styles/login-view-metrics.css'), 'utf8')
  const loginView = await readFile(join(frontendRoot, 'views/LoginView.vue'), 'utf8')
  const legacyScoreClass = ['score', 'ring'].join('-')
  const legacyRadiusToken = ['radius', 'pi' + 'll'].join('-')
  const circularRadiusPattern = new RegExp(`border-radius:\\s*(?:50%|999px|var\\(--${legacyRadiusToken}\\))`)

  for (const source of [navigation, desktop, gatewayFeed, gatewayRouteTable, overviewFeed]) {
    assert.doesNotMatch(source, circularRadiusPattern)
  }

  assert.match(navigation, /\.sider-footer__dot \{[\s\S]*width: 10px;[\s\S]*height: 10px;[\s\S]*border-radius: var\(--radius-xs\);/)
  assert.match(desktop, /\.service-line__dot \{[\s\S]*width: 10px;[\s\S]*height: 10px;[\s\S]*border-radius: var\(--radius-xs\);/)
  assert.match(gatewayFeed, /\.gateway-active-feed-panel__pulse::before \{[\s\S]*width: 10px;[\s\S]*height: 10px;[\s\S]*border-radius: var\(--radius-xs\);/)
  assert.match(gatewayFeed, /\.gateway-active-feed__dot \{[\s\S]*width: 10px;[\s\S]*height: 10px;[\s\S]*border-radius: var\(--radius-xs\);/)
  assert.match(gatewayRouteTable, /\.gateway-latency__dot \{[\s\S]*width: 10px;[\s\S]*height: 10px;[\s\S]*border-radius: var\(--radius-xs\);/)
  assert.match(overviewFeed, /\.overview-feed__dot \{[\s\S]*width: 10px;[\s\S]*height: 10px;[\s\S]*border-radius: var\(--radius-xs\);/)
  assert.match(loginMetrics, /\.score-frame \{[\s\S]*border-radius: var\(--radius-container\);/)
  assert.doesNotMatch(loginMetrics, new RegExp(legacyScoreClass))
  assert.match(loginView, /class="score-frame"/)
  assert.doesNotMatch(loginView, new RegExp(legacyScoreClass))
})

test('frontend source no longer references legacy circular control styling', async () => {
  const legacyScoreClass = ['score', 'ring'].join('-')
  const legacyRadiusToken = ['radius', 'pi' + 'll'].join('-')
  const circularRadiusPattern = new RegExp(`border-radius:\\s*(?:50%|999px|var\\(--${legacyRadiusToken}\\))`)
  const legacyTokenPattern = new RegExp(`${legacyScoreClass}|site-empty-pill|shape="circle"`)
  const failures: string[] = []

  for (const file of sourceFiles(frontendRoot)) {
    const source = await readFile(file, 'utf8')
    if (circularRadiusPattern.test(source) || legacyTokenPattern.test(source)) {
      failures.push(relative(frontendRoot, file))
    }
  }

  assert.deepEqual(failures, [])
})
