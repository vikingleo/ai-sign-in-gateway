<script setup lang="ts">
import SitesApiKeyDialog from './SitesApiKeyDialog.vue'
import SitesCCSwitchDialog from './SitesCCSwitchDialog.vue'
import SitesCheckinConfigModal from './SitesCheckinConfigModal.vue'
import SitesCheckinLogsDrawer from './SitesCheckinLogsDrawer.vue'
import SitesDuplicateDialog from './SitesDuplicateDialog.vue'
import SitesEditorModal from './SitesEditorModal.vue'
import SitesInviteDialog from './SitesInviteDialog.vue'
import SitesMetricsGrid from './SitesMetricsGrid.vue'
import SitesQueueDialog from './SitesQueueDialog.vue'
import SitesTableCard from './SitesTableCard.vue'
import SitesToolbar from './SitesToolbar.vue'
import SitesTotpPreviewModal from './SitesTotpPreviewModal.vue'
import type { useSitesViewController } from '../../composables/useSitesViewController'

defineProps<{
  view: ReturnType<typeof useSitesViewController>
}>()
</script>

<template>
  <div class="sites-page page-stack page-stack--dashboard">
    <SitesToolbar
      :busy="view.busy"
      :checkin-batch-target-count="view.checkinBatchTargetCount"
      :checkin-all-included-label="view.checkinAllIncludedLabel"
      :connectivity-sweep-label="view.connectivitySweepLabel"
      :duplicate-check-loading="view.duplicateCheckLoading"
      :invite-refresh-all-loading="view.inviteRefreshAllLoading"
      :invite-refresh-all-label="view.inviteRefreshAllLabel"
      :api-key-refresh-all-loading="view.apiKeyRefreshAllLoading"
      :api-key-refresh-all-label="view.apiKeyRefreshAllLabel"
      :cc-switch-export-loading="view.ccSwitchExportLoading"
      :cc-switch-available="view.ccSwitchAvailable"
      :cc-switch-disabled-reason="view.ccSwitchDisabledReason"
      @open-checkin-config="view.checkinConfigOpen = true"
      @open-checkin-logs="view.checkinLogsOpen = true"
      @checkin-all-included="view.handleCheckinAllIncluded"
      @refresh="view.handleRefresh(view.selectedId)"
      @connectivity-sweep="view.handleConnectivitySweep"
      @duplicate-check="view.handleDuplicateCheck"
      @refresh-all-invites="view.refreshAllInvites"
      @refresh-all-api-keys="view.refreshAllApiKeys"
      @export-cc-switch="view.openCCSwitchConfig('export')"
      @import-cc-switch="view.openCCSwitchConfig('import')"
      @create-site="view.openCreateDrawer"
    />

    <input
      id="cc-switch-import-file"
      :ref="view.bindCCSwitchFileInput"
      type="file"
      name="cc_switch_import_file"
      accept=".json,.sql,application/json,text/plain"
      style="display: none"
      @change="view.handleCCSwitchFileChange"
    >

    <SitesMetricsGrid
      :total-site-count="view.totalSiteCount"
      :enabled-site-count="view.enabledSiteCount"
      :ready-gateway-count="view.readyGatewayCount"
      :total-balance-summary="view.totalBalanceSummary"
      :total-balance-tone="view.totalBalanceTone"
      :quantified-balance-site-count="view.quantifiedBalanceSiteCount"
      :success-site-count="view.successSiteCount"
      :failed-site-count="view.failedSiteCount"
      :pending-site-count="view.pendingSiteCount"
    />

    <div :ref="view.bindPageTableContainer">
      <SitesTableCard
        v-model:search="view.siteSearch"
        :grouped-site-count="view.groupedSiteCount"
        :selected-count="view.selectedCheckinIds.length"
        :busy="view.busy"
        :checkin-selected-label="view.checkinSelectedLabel"
        :columns="view.siteColumns"
        :sites="view.filteredSites"
        :page-size="view.tablePageSize"
        :table-y="view.pageTableY"
        :row-selection="view.checkinRowSelection"
        :row-key="view.rowKey"
        :custom-row="view.siteCustomRow"
        :row-class-name="view.siteRowClassName"
        :display-plugin-label="view.displayPluginLabel"
        :balance-class="view.balanceClass"
        :visible-checkin-status="view.visibleCheckinStatus"
        :display-group-name="view.displayGroupName"
        :site-supports-api-key-sync="view.siteSupportsApiKeySync"
        :site-included-in-checkin="view.siteIncludedInCheckin"
        :site-can-checkin="view.siteCanCheckin"
        :is-relay-only-site-payload="view.isRelayOnlySitePayload"
        :site-checkin-action-label="view.siteCheckinActionLabel"
        :is-invite-loading="view.isInviteLoading"
        :is-balance-probing="view.isBalanceProbing"
        :is-api-key-refreshing="view.isApiKeyRefreshing"
        :site-supports-invite="view.siteSupportsInvite"
        @run-selected="view.handleCheckinSelected"
        @clear-selected="view.selectedCheckinIds = []"
        @open-site="view.handleOpenSiteInNewTab"
        @edit="view.openEditDrawer"
        @toggle="view.handleToggle"
        @update-participation="view.handleParticipationToggle"
        @test="view.handleTest"
        @checkin="view.handleCheckin"
        @open-api-key="view.openApiKeyDialog"
        @probe-balance="view.handleProbeSiteBalance"
        @refresh-api-keys="view.handleRefreshSiteApiKeys"
        @load-invite="view.loadInviteInfo"
        @open-queue="view.openQueue"
        @delete-site="view.handleDelete"
      />
    </div>

    <SitesEditorModal
      v-model:open="view.drawerOpen"
      v-model:group-names="view.editorGroupNames"
      v-model:batch-register-enabled="view.batchRegisterEnabled"
      v-model:raw-text="view.localStorageRawText"
      :editing-id="view.editingId"
      :editing-site="view.editingSite"
      :save-feedback="view.saveFeedback"
      :plugin-mismatch="view.pluginMismatch"
      :recommended-plugin="view.recommendedPlugin"
      :test-feedback="view.testFeedback"
      :can-batch-register="view.canBatchRegisterEditor"
      :batch-form="view.batchRegisterForm"
      :batch-result="view.batchRegisterResult"
      :editor="view.editor"
      :plugin-options="view.pluginOptions"
      :group-options="view.groupOptions"
      :email-pattern-examples="view.emailPatternExamples"
      :collector-script="view.consoleCollectorScript"
      :analyzing-storage="view.localStorageAnalyzeLoading"
      :current-plugin="view.currentPlugin"
      :primary-credential-fields="view.primaryCredentialFields"
      :manual-login-fields="view.manualLoginFields"
      :totp-credential-fields="view.totpCredentialFields"
      :official-site-url="view.officialSiteUrl"
      :show-auth-entry-button="view.showAuthEntryButton"
      :auth-entry-url="view.authEntryUrl"
      :auth-entry-label="view.authEntryLabel"
      :totp-preview-loading="view.totpPreviewLoading"
      :credential-input-name="view.credentialInputName"
      :credential-autocomplete="view.credentialAutocomplete"
      :config-text-value="view.configTextValue"
      :config-number-value="view.configNumberValue"
      :busy="view.busy"
      :test-action-label="view.testActionLabel"
      :is-relay-only-editor="view.isRelayOnlyEditor"
      :primary-action-label="view.primaryActionLabel"
      @close="view.closeDrawer"
      @apply-recommended-plugin="view.applyRecommendedPlugin"
      @copy-script="view.handleCopyConsoleScript"
      @analyze-storage="view.handleAnalyzeLocalStorage"
      @paste-payload="view.handleStoragePayloadPaste"
      @open-official="view.handleOpenOfficialSite"
      @open-auth="view.handleOpenAuthSite"
      @preview-totp="view.handlePreviewTotp"
      @update-config="view.updateConfigField"
      @test="view.handleTest"
      @checkin="view.handleCheckin"
      @save="view.saveSite"
      @delete-site="view.handleDelete"
    />

    <SitesCCSwitchDialog
      v-model:open="view.ccSwitchConfigOpen"
      v-model:tab="view.ccSwitchConfigTab"
      v-model:mode="view.ccSwitchImportMode"
      v-model:import-text="view.ccSwitchImportText"
      v-model:selected-sections="view.ccSwitchSelectedSections"
      v-model:search="view.ccSwitchPreviewSearch"
      :import-loading="view.ccSwitchImportLoading"
      :export-loading="view.ccSwitchExportLoading"
      :sql-preview-loading="view.ccSwitchSqlPreviewLoading"
      :ok-text="view.ccSwitchImportOkText"
      :file-button-label="view.ccSwitchFileButtonLabel"
      :import-placeholder="view.ccSwitchImportPlaceholder"
      :preview-error="view.ccSwitchPreviewError"
      :preview-rows="view.ccSwitchPreviewRows"
      :filtered-preview-rows="view.ccSwitchFilteredPreviewRows"
      :section-options="view.ccSwitchSectionOptions"
      :columns="view.ccSwitchPreviewColumns"
      :page-size="view.tablePageSize"
      :table-y="view.modalTableY"
      :export-text="view.ccSwitchExportText"
      :row-key="view.ccSwitchPreviewRowKey"
      @submit-import="view.submitCCSwitchImport"
      @open-file="view.openCCSwitchFilePicker"
      @resolve-sql="view.resolveCCSwitchSqlPreview"
      @generate-export="view.handleCCSwitchExport"
      @download-export="view.downloadCCSwitchExport"
    />

    <SitesDuplicateDialog
      v-model:open="view.duplicateCheckOpen"
      v-model:search="view.duplicateSearch"
      :checked="view.duplicateChecked"
      :groups="view.filteredDuplicateGroups"
      :loading="view.duplicateCheckLoading"
      :merging="view.duplicateMergeLoading"
      :columns="view.duplicateColumns"
      :page-size="view.tablePageSize"
      :table-y="view.modalTableY"
      :row-key="view.duplicateGroupRowKey"
      :suggested-site-name="view.duplicateSuggestedSiteName"
      @merge="view.handleSuggestedDuplicateMerge"
    />

    <SitesTotpPreviewModal
      v-model:open="view.totpPreviewOpen"
      :preview="view.totpPreview"
    />

    <SitesInviteDialog
      v-model:open="view.inviteDialogOpen"
      :site-name="view.inviteDialogSiteName"
      :loading="view.inviteDialogLoading"
      :link="view.inviteDialogLink"
      :code="view.inviteDialogCode"
      @refresh="view.refreshInviteDialog"
      @copy-link="view.copyInviteLink"
      @copy-code="view.copyInviteCode"
      @copy-bundle="view.copyInviteBundle"
    />

    <SitesQueueDialog
      v-model:open="view.queueOpen"
      :site-name="view.queueSiteName"
      :tasks="view.queueTasks"
      :loading="view.queueLoading"
      :activating-task-key="view.queueActivatingTaskKey"
      :row-key="view.queueTaskRowKey"
      @refresh="view.refreshQueue"
      @activate="view.activateQueueTask"
    />

    <SitesApiKeyDialog
      v-model:open="view.apiKeyDialogOpen"
      v-model:request-api-urls="view.apiKeyDialogForm.request_api_urls"
      v-model:image-generation-path="view.apiKeyDialogForm.image_generation_path"
      v-model:image-edit-path="view.apiKeyDialogForm.image_edit_path"
      v-model:manual-name="view.manualApiKeyForm.name"
      v-model:manual-key="view.manualApiKeyForm.key"
      v-model:manual-route-type="view.manualApiKeyForm.route_type"
      v-model:manual-route-path="view.manualApiKeyForm.route_path"
      v-model:manual-request-base-urls="view.manualApiKeyForm.request_base_urls"
      v-model:manual-image-generation-path="view.manualApiKeyForm.image_generation_path"
      v-model:manual-image-edit-path="view.manualApiKeyForm.image_edit_path"
      :site-name="view.apiKeyDialogForm.site_name"
      :entries="view.apiKeyDialogEntries"
      :preview-urls="view.apiKeyDialogPreviewUrls"
      :saving="view.apiKeyDialogSaving"
      :request-url-draft="view.apiKeyRequestUrlDraft"
      :route-path-draft="view.apiKeyRoutePathDraft"
      :image-generation-path-draft="view.apiKeyImageGenerationPathDraft"
      :image-edit-path-draft="view.apiKeyImageEditPathDraft"
      @ok="view.saveApiKeyDialog"
      @copy-primary="view.copyPrimaryApiKeyFromDialog"
      @copy-key="view.copyApiKeyFromDialog"
      @remove-key="view.removeApiKey"
      @update-entry-request-url="view.updateApiKeyRequestUrlDraft"
      @update-entry-route-path="view.updateApiKeyRoutePathDraft"
      @update-entry-image-path="view.updateApiKeyImagePathDraft"
      @add-manual-key="view.addManualApiKey"
    />

    <SitesCheckinConfigModal
      v-model:open="view.checkinConfigOpen"
      :form="view.checkinConfigForm"
      :saving="view.checkinSettingsBusy"
      :busy="view.busy"
      @save="view.saveCheckinConfig"
      @run-now="view.handleRunSchedulerNow"
    />

    <SitesCheckinLogsDrawer
      v-model:open="view.checkinLogsOpen"
      v-model:search="view.checkinRunSearch"
      :runs="view.filteredCheckinRuns"
      :columns="view.checkinRunColumns"
      :page-size="view.tablePageSize"
      :table-y="view.drawerTableY"
      :format-run-time="view.formatCheckinRunTime"
    />
  </div>
</template>
