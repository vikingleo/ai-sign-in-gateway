import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/settings/SettingsAccountTab.vue', import.meta.url)
const controllerPath = new URL('../src/settingsAccountController.ts', import.meta.url)

test('settings account tab validates password confirmation before submit', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /import \{ computed \} from 'vue'/)
  assert.match(source, /const isPasswordMismatch = computed\(\(\) =>/)
  assert.match(source, /view\.accountForm\.new_password\.length > 0/)
  assert.match(source, /view\.accountForm\.new_password !== props\.view\.accountForm\.confirm_password/)
  assert.match(source, /:validate-status="isPasswordMismatch \? 'error' : undefined"/)
  assert.match(source, /:help="isPasswordMismatch \? '两次输入的新密码不一致。' : undefined"/)
  assert.match(source, /:disabled="isPasswordMismatch"/)
})

test('settings account tab names admin user management controls', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /aria-label="新管理员用户名"/)
  assert.match(source, /aria-label="新管理员初始密码"/)
  assert.match(source, /aria-label="新管理员角色"/)
  assert.match(source, /aria-label="新管理员启用状态"/)
  assert.match(source, /:aria-label="`\$\{view\.asAdminUser\(record\)\.username \|\| '管理员'\}用户名`"/)
  assert.match(source, /:aria-label="`\$\{view\.asAdminUser\(record\)\.username \|\| '管理员'\}角色`"/)
  assert.match(source, /:aria-label="`\$\{view\.asAdminUser\(record\)\.username \|\| '管理员'\}启用状态`"/)
  assert.match(source, /:aria-label="`\$\{view\.asAdminUser\(record\)\.username \|\| '管理员'\}新密码`"/)
})

test('settings account tab prevents editing the current admin sensitive fields inline', async () => {
  const source = await readFile(componentPath, 'utf8')

  const usernameColumn = source.slice(source.indexOf('<a-table-column title="用户名"'), source.indexOf('<a-table-column title="角色"'))
  assert.match(usernameColumn, /:disabled="view\.asAdminUser\(record\)\.id === view\.currentAdmin\?\.id"/)

  const roleColumn = source.slice(source.indexOf('<a-table-column title="角色"'), source.indexOf('<a-table-column title="状态"'))
  assert.match(roleColumn, /:disabled="view\.asAdminUser\(record\)\.id === view\.currentAdmin\?\.id"/)

  const statusColumn = source.slice(source.indexOf('<a-table-column title="状态"'), source.indexOf('<a-table-column title="新密码"'))
  assert.match(statusColumn, /:disabled="view\.asAdminUser\(record\)\.id === view\.currentAdmin\?\.id"/)

  const passwordColumn = source.slice(source.indexOf('<a-table-column title="新密码"'), source.indexOf('<a-table-column title="最后登录"'))
  assert.match(passwordColumn, /:disabled="view\.asAdminUser\(record\)\.id === view\.currentAdmin\?\.id"/)
})

test('settings account controller refreshes current admin after saving self', async () => {
  const source = await readFile(controllerPath, 'utf8')
  const saveAdminUserSource = source.slice(source.indexOf('async function saveAdminUser'), source.indexOf('async function removeAdminUser'))

  assert.match(saveAdminUserSource, /if \(user\.id === currentAdmin\.value\?\.id\) \{/)
  assert.match(saveAdminUserSource, /await loadCurrentAccount\(\)/)
})

test('settings account controller does not rename self through admin user endpoint', async () => {
  const source = await readFile(controllerPath, 'utf8')
  const saveAdminUserSource = source.slice(source.indexOf('async function saveAdminUser'), source.indexOf('async function removeAdminUser'))

  assert.match(saveAdminUserSource, /user\.id === currentAdmin\.value\?\.id && username !== currentUsername\.value/)
  assert.match(saveAdminUserSource, /toast\.error\('请使用上方账号表单修改当前登录用户名。'\)/)
  assert.match(saveAdminUserSource, /user\.username = currentUsername\.value/)
  assert.match(saveAdminUserSource, /return/)
})

test('settings account controller does not change self password through admin user endpoint', async () => {
  const source = await readFile(controllerPath, 'utf8')
  const saveAdminUserSource = source.slice(source.indexOf('async function saveAdminUser'), source.indexOf('async function removeAdminUser'))

  assert.match(saveAdminUserSource, /user\.id === currentAdmin\.value\?\.id && newPassword/)
  assert.match(saveAdminUserSource, /toast\.error\('请使用上方账号表单修改当前登录密码。'\)/)
  assert.match(saveAdminUserSource, /adminUserPasswordEdits\[user\.id\] = ''/)
  assert.match(saveAdminUserSource, /return/)
})
