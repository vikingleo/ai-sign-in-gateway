import {
  createRegistrationBatchSites,
  createSite,
  deleteSite,
  probeSiteBalance,
  testSite,
  testSiteDraft,
  toggleSite,
  updateSite,
} from '../api'
import { formatBalance } from '../format'
import { mergeSiteHealthEditorPayload } from '../sitesResultModel'
import { isValidEmailPattern } from '../sitesStorageModel'
import { normalizeSite } from '../sitesViewModel'
import type { PersistOptions, UseSitesEditorActionsOptions } from '../sitesEditorActionTypes'
import type { Site, SitePayload } from '../types'

export function useSitesEditorActions(options: UseSitesEditorActionsOptions) {
  function editorPayload(): SitePayload {
    return {
      ...JSON.parse(JSON.stringify(options.editor)),
      supported_models: null,
    }
  }

  function upsertSite(savedSite: Site, upsertOptions: { edit?: boolean } = {}) {
    const saved = normalizeSite(savedSite)
    const index = options.sites.value.findIndex((site) => site.id === saved.id)
    if (index >= 0) {
      options.sites.value[index] = saved
    } else {
      options.sites.value = [saved, ...options.sites.value]
    }
    options.selectedId.value = saved.id
    options.editingId.value = upsertOptions.edit === false ? null : saved.id
  }

  async function persistEditor(persistOptions: PersistOptions = {}) {
    if (options.pluginMismatch.value && !options.mismatchAcknowledged.value) {
      options.mismatchAcknowledged.value = true
      options.toast.error(
        `检测到当前站点更适合使用“${options.recommendedPlugin.value?.name ?? options.recommendedPluginKey.value}”。如仍要继续当前插件，请再次点击保存。`,
      )
      return null
    }

    const activeEditingId = options.editingId.value
    const payload = editorPayload()
    const isUpdate = activeEditingId !== null
    const saved = activeEditingId !== null
      ? await updateSite(activeEditingId, payload)
      : await createSite(payload)
    upsertSite(saved)
    options.assignEditor(saved)
    if (persistOptions.keepDrawerOpen !== undefined) {
      options.drawerOpen.value = persistOptions.keepDrawerOpen
    } else {
      options.drawerOpen.value = isUpdate
    }
    options.saveFeedback.value = isUpdate ? '更改已保存，可继续编辑当前站点。' : null
    options.lastSavedEditorSnapshot.value = JSON.stringify(options.editor)
    if (persistOptions.showToast !== false) {
      options.toast.success(isUpdate ? '站点信息已更新。' : '站点已创建。')
    }
    return saved
  }

  async function saveBatchRegisteredSites() {
    if (!options.canBatchRegisterEditor.value) {
      options.toast.error('当前插件不支持批量注册账号。')
      return
    }
    const emailPattern = options.batchRegisterForm.email_pattern.trim()
    if (!isValidEmailPattern(emailPattern)) {
      options.toast.error('邮箱规则必须包含 {n}、{n:03} 或 {rand:[字符集]{位数}}。')
      return
    }
    if (!options.batchRegisterForm.password.trim()) {
      options.toast.error('请填写注册密码。')
      return
    }
    await options.ensureStorageAnalysisFinished()
    const payload = {
      ...editorPayload(),
      email_pattern: emailPattern,
      password: options.batchRegisterForm.password,
      count: Number(options.batchRegisterForm.count) || 1,
      start_index: Number(options.batchRegisterForm.start_index) || 1,
    }
    const result = await createRegistrationBatchSites(payload)
    options.batchRegisterResult.value = result
    const firstCreated = result.items.find((item) => item.ok && item.site)?.site
    if (firstCreated) {
      upsertSite(firstCreated, { edit: false })
    }
    await options.syncRoutesAfterSiteChange()
    await options.reloadDataWithCheckinExtras(firstCreated?.id ?? options.selectedId.value)
    options.drawerOpen.value = true
    const failedText = result.failed_count ? `，失败 ${result.failed_count}` : ''
    options.toast.success(`批量注册完成：创建 ${result.created_count}${failedText}。`)
  }

  async function saveSite() {
    options.busy.value = true
    try {
      if (!options.editingId.value && options.batchRegisterEnabled.value) {
        await saveBatchRegisteredSites()
        return
      }
      await options.ensureStorageAnalysisFinished()
      const saved = await persistEditor()
      if (saved) {
        await options.syncRoutesAfterSiteChange()
        await options.reloadDataWithCheckinExtras(saved.id)
      }
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      options.busy.value = false
    }
  }

  async function handleRelayOnlyTest(activeSite: Site, drawerTest: boolean) {
    const result = await probeSiteBalance(activeSite.id)
    options.applyBalanceProbeResult(result)
    const balanceText = formatBalance(result.remaining, result.unit)
    options.testFeedback.value = {
      type: result.ok ? 'success' : 'error',
      title: result.ok ? '模型出口验证成功' : '模型出口验证失败',
      message: `${result.message}${balanceText ? `\n当前余额：${balanceText}` : ''}${result.base_url ? `\n当前出口：${result.base_url}` : ''}${result.latency_ms !== null ? `\n延迟：${Math.round(result.latency_ms)} ms` : ''}`,
    }
    if (!result.ok) {
      throw new Error(result.message)
    }
    options.toast.success(`${activeSite.name} 模型出口验证成功：${balanceText || result.base_url}`)
    await options.reloadDataWithCheckinExtras(activeSite.id, { preserveEditor: drawerTest })
  }

  async function handleDrawerSiteTest(activeSite: Site) {
    const result = await testSiteDraft({
      ...editorPayload(),
      site_id: activeSite.id,
    })
    Object.assign(options.editor, mergeSiteHealthEditorPayload(options.editor, result))
    const balanceText = formatBalance(result.balance, result.balance_unit)
    const packageText = result.package_display ? `\n当前套餐：${result.package_display}` : ''
    options.testFeedback.value = {
      type: result.logged_in ? 'success' : 'error',
      title: result.logged_in ? '站内授权测试成功' : '站内授权测试失败',
      message: `${result.message}${balanceText ? `\n当前余额：${balanceText}` : ''}${packageText}${result.account_name ? `\n当前账号：${result.account_name}` : ''}`,
    }
    options.lastSavedEditorSnapshot.value = JSON.stringify(options.editor)
    options.saveFeedback.value = result.logged_in ? '草稿测试通过，回填信息已写入当前表单。' : '草稿测试完成，回填信息已写入当前表单。'
    if (!result.logged_in) {
      options.toast.error(result.message)
      return
    }
    options.toast.success(`${result.message}${balanceText ? ` 当前余额 ${balanceText}` : ''}`)
  }

  async function handleListSiteTest(activeSite: Site) {
    const result = await testSite(activeSite.id)
    const balanceText = formatBalance(result.balance, result.balance_unit)
    const packageText = result.package_display ? `\n当前套餐：${result.package_display}` : ''
    options.testFeedback.value = {
      type: result.logged_in ? 'success' : 'error',
      title: result.logged_in ? '站内授权测试成功' : '站内授权测试失败',
      message: `${result.message}${balanceText ? `\n当前余额：${balanceText}` : ''}${packageText}${result.account_name ? `\n当前账号：${result.account_name}` : ''}`,
    }
    if (!result.logged_in) {
      throw new Error(result.message)
    }
    options.toast.success(`${result.message}${balanceText ? ` 当前余额 ${balanceText}` : ''}`)
    await options.reloadDataWithCheckinExtras(activeSite.id)
  }

  async function handleTest(targetSite = options.selectedSite.value) {
    if (!targetSite) {
      return
    }
    options.busy.value = true
    let activeSite = targetSite
    const drawerTest = options.drawerOpen.value && options.editingId.value === targetSite.id
    try {
      if (drawerTest) await options.ensureStorageAnalysisFinished()

      const relayOnlyTarget =
        options.isRelayOnlySitePayload(activeSite) || (drawerTest && options.isRelayOnlyEditor.value)
      if (relayOnlyTarget) {
        await handleRelayOnlyTest(activeSite, drawerTest)
        return
      }
      if (drawerTest) {
        await handleDrawerSiteTest(activeSite)
        return
      }
      await handleListSiteTest(activeSite)
    } catch (err) {
      const message = err instanceof Error ? err.message : '测试失败'
      options.testFeedback.value = {
        type: 'error',
        title:
          options.isRelayOnlySitePayload(activeSite) || (drawerTest && options.isRelayOnlyEditor.value)
            ? '模型出口验证失败'
            : '站内授权测试失败',
        message,
      }
      options.toast.error(message)
      if (drawerTest) {
        await options.reloadDataWithCheckinExtras(activeSite.id, { preserveEditor: true })
      } else if (!options.isRelayOnlySitePayload(activeSite)) {
        await options.reloadDataWithCheckinExtras(activeSite.id)
      }
    } finally {
      options.busy.value = false
    }
  }

  async function handleToggle(site: Site) {
    options.busy.value = true
    try {
      await toggleSite(site.id)
      await options.syncRoutesAfterSiteChange()
      await options.loadData(options.selectedSite.value?.id ?? site.id)
      options.toast.success(site.is_enabled ? '站点已停用。' : '站点已启用。')
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '切换失败')
    } finally {
      options.busy.value = false
    }
  }

  async function handleDelete(targetSite = options.selectedSite.value) {
    if (!targetSite) {
      return
    }
    const confirmed = window.confirm(`确认删除站点“${targetSite.name}”吗？此操作不可恢复。`)
    if (!confirmed) {
      return
    }

    options.busy.value = true
    try {
      await deleteSite(targetSite.id)
      await options.syncRoutesAfterSiteChange()
      options.drawerOpen.value = false
      options.editingId.value = null
      await options.loadData(null)
      options.toast.success('站点已删除。')
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '删除失败')
    } finally {
      options.busy.value = false
    }
  }

  return {
    saveSite,
    handleTest,
    handleToggle,
    handleDelete,
  }
}
