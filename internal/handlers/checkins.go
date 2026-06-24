package handlers

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"ai-sign-in-gateway/internal/httpx"
	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/plugins"
	"ai-sign-in-gateway/internal/schemas"
	"ai-sign-in-gateway/internal/services"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func (a *App) CheckinRoutes(r chi.Router) {
	r.Post("/batch", a.RunBatchCheckin)
	r.Get("/runs", a.CheckinRuns)
	r.Get("/sites", a.CheckinSites)
	r.Post("/sites/{siteID}/participation", a.UpdateCheckinParticipation)
}

func (a *App) CheckinRuns(w http.ResponseWriter, r *http.Request) {
	limit := checkinRunsLimit(r)
	var runs []models.CheckinRun
	a.DB.Preload("Site").Order("started_at desc").Limit(limit).Find(&runs)
	out := make([]schemas.CheckinRunResponse, 0, len(runs))
	for _, run := range runs {
		out = append(out, checkinRunResponse(run))
	}
	writeJSON(w, http.StatusOK, out)
}

func checkinRunsLimit(r *http.Request) int {
	raw := strings.TrimSpace(r.URL.Query().Get("limit"))
	if raw == "" {
		return 80
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 80
	}
	return clampInt(value, 1, 500, 80)
}

func (a *App) CheckinSites(w http.ResponseWriter, r *http.Request) {
	var sites []models.Site
	a.DB.Order("name asc").Find(&sites)
	out := make([]map[string]any, 0, len(sites))
	for _, site := range sites {
		canCheckin, reason := a.siteCanCheckin(site)
		item := map[string]any{
			"id": site.ID, "name": site.Name, "plugin_key": site.PluginKey, "group_name": site.GroupName,
			"base_url": site.BaseURL, "is_enabled": site.IsEnabled, "can_checkin": canCheckin,
			"include_in_checkin": canCheckin && includeInCheckin(site), "checkin_label": "签到", "reason": reason,
			"last_status": site.LastStatus, "connection_status": site.LastStatus, "last_message": site.LastMessage,
			"last_balance": site.LastBalance, "balance_display": balanceDisplayWithUnit(site.LastBalance, jsonMapString(site.PluginConfig, "balance_unit")),
			"package_display": packageDisplay(site), "checkin_status": site.LastStatus, "last_run_at": site.LastRunAt,
		}
		for key, value := range packageQuotaMap(site) {
			item[key] = value
		}
		out = append(out, item)
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) RunBatchCheckin(w http.ResponseWriter, r *http.Request) {
	var payload schemas.BatchCheckinRequest
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	settings, err := a.checkinBatchSettings()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	onlyEnabled := settings.OnlyEnabledSites
	if payload.OnlyEnabled != nil {
		onlyEnabled = *payload.OnlyEnabled
	}
	out, err := a.runCheckinBatch(manualCheckinContext(r.Context()), payload.SiteIDs, onlyEnabled, "manual", settings)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) runCheckinBatch(ctx context.Context, siteIDs []uint, onlyEnabled bool, triggerType string, settings models.SystemSetting) ([]schemas.CheckinRunResponse, error) {
	return a.runCheckinBatchAt(ctx, siteIDs, onlyEnabled, triggerType, settings, time.Time{})
}

func (a *App) runCheckinBatchAt(ctx context.Context, siteIDs []uint, onlyEnabled bool, triggerType string, settings models.SystemSetting, runAt time.Time) ([]schemas.CheckinRunResponse, error) {
	query := a.DB.Model(&models.Site{})
	if len(siteIDs) > 0 {
		query = query.Where("id IN ?", siteIDs)
	}
	if onlyEnabled {
		query = query.Where("is_enabled = ?", true)
	}
	var sites []models.Site
	if err := query.Order("name asc").Find(&sites).Error; err != nil {
		return nil, err
	}
	targets := make([]models.Site, 0, len(sites))
	for _, site := range sites {
		if canCheckin, _ := a.siteCanCheckin(site); !canCheckin {
			continue
		}
		if onlyEnabled && !includeInCheckin(site) {
			continue
		}
		targets = append(targets, site)
	}
	return a.executeCheckinTargetsAt(ctx, targets, triggerType, settings, runAt), nil
}

func (a *App) executeCheckinTargets(ctx context.Context, sites []models.Site, triggerType string, settings models.SystemSetting) []schemas.CheckinRunResponse {
	return a.executeCheckinTargetsAt(ctx, sites, triggerType, settings, time.Time{})
}

func (a *App) executeCheckinTargetsAt(ctx context.Context, sites []models.Site, triggerType string, settings models.SystemSetting, runAt time.Time) []schemas.CheckinRunResponse {
	out := make([]schemas.CheckinRunResponse, len(sites))
	if len(sites) == 0 {
		return out
	}
	limits := normalizeCheckinExecutionSettings(settings)
	limiter := checkinLimiterForDB(a.DB)
	limiter.UpdateLimits(limits)
	var wg sync.WaitGroup
	for index, site := range sites {
		if index > 0 && limits.Interval > 0 {
			if !sleepWithContext(ctx, limits.Interval) {
				break
			}
		}
		if ctx.Err() != nil {
			break
		}
		wg.Add(1)
		go func(index int, site models.Site) {
			defer wg.Done()
			slotKey := checkinSlotKey(site)
			if !limiter.Acquire(ctx, slotKey) {
				return
			}
			defer limiter.Release(slotKey)
			out[index] = checkinRunResponse(a.executeSiteCheckinWithRetryAt(ctx, site, triggerType, limits.RetryCount, settings.RequestTimeout, runAt))
		}(index, site)
	}
	wg.Wait()
	return filterEmptyCheckinResponses(out)
}

type checkinExecutionSettings struct {
	SiteConcurrency   int
	GlobalConcurrency int
	Interval          time.Duration
	RetryCount        int
}

func normalizeCheckinExecutionSettings(settings models.SystemSetting) checkinExecutionSettings {
	return checkinExecutionSettings{
		SiteConcurrency:   clampInt(settings.CheckinConcurrency, 1, 20, 1),
		GlobalConcurrency: clampInt(settings.CheckinGlobalConcurrency, 1, 50, 4),
		Interval:          time.Duration(clampCheckinNonNegative(settings.CheckinIntervalSeconds, 60)) * time.Second,
		RetryCount:        clampCheckinNonNegative(settings.RetryCount, 5),
	}
}

func clampCheckinNonNegative(value int, max int) int {
	if value < 0 {
		return 0
	}
	if value > max {
		return max
	}
	return value
}

func defaultCheckinBatchSettings() models.SystemSetting {
	return models.SystemSetting{
		CheckinConcurrency:       1,
		CheckinGlobalConcurrency: 4,
		CheckinIntervalSeconds:   1,
		RetryCount:               1,
		RequestTimeout:           20,
		OnlyEnabledSites:         true,
	}
}

func (a *App) checkinBatchSettings() (models.SystemSetting, error) {
	settings, err := a.systemSettings()
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return defaultCheckinBatchSettings(), nil
	}
	return settings, err
}

func manualCheckinContext(parent context.Context) context.Context {
	return context.WithoutCancel(parent)
}

func checkinSlotKey(site models.Site) string {
	key := normalizeDuplicateBaseURL(site.BaseURL)
	if key != "" {
		return key
	}
	return "site:" + strconv.FormatUint(uint64(site.ID), 10)
}

func sleepWithContext(ctx context.Context, duration time.Duration) bool {
	timer := time.NewTimer(duration)
	defer timer.Stop()
	select {
	case <-timer.C:
		return true
	case <-ctx.Done():
		return false
	}
}

func filterEmptyCheckinResponses(items []schemas.CheckinRunResponse) []schemas.CheckinRunResponse {
	out := make([]schemas.CheckinRunResponse, 0, len(items))
	for _, item := range items {
		if item.ID == 0 && item.Status == "" && item.Message == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}

func (a *App) executeSiteCheckinWithRetry(ctx context.Context, site models.Site, triggerType string, retryCount int, timeoutSeconds int) models.CheckinRun {
	return a.executeSiteCheckinWithRetryAt(ctx, site, triggerType, retryCount, timeoutSeconds, time.Time{})
}

func (a *App) executeSiteCheckinWithRetryAt(ctx context.Context, site models.Site, triggerType string, retryCount int, timeoutSeconds int, runAt time.Time) models.CheckinRun {
	attempts := retryCount + 1
	var run models.CheckinRun
	for attempt := 1; attempt <= attempts; attempt++ {
		run = a.executeSiteCheckinAttemptAt(ctx, site, triggerType, timeoutSeconds, attempt, runAt)
		if run.ID == 0 || strings.EqualFold(strings.TrimSpace(run.Status), "success") || ctx.Err() != nil {
			return run
		}
	}
	return run
}

func checkinRunStatusCounts(runs []schemas.CheckinRunResponse) (int, int) {
	successCount := 0
	failedCount := 0
	for _, run := range runs {
		if strings.EqualFold(strings.TrimSpace(run.Status), "success") {
			successCount++
			continue
		}
		failedCount++
	}
	return successCount, failedCount
}

func (a *App) UpdateCheckinParticipation(w http.ResponseWriter, r *http.Request) {
	site, ok := a.getSite(w, chi.URLParam(r, "siteID"))
	if !ok {
		return
	}
	var payload struct {
		IncludeInCheckin bool `json:"include_in_checkin"`
	}
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	if canCheckin, reason := a.siteCanCheckin(site); !canCheckin {
		writeError(w, http.StatusBadRequest, reason)
		return
	}
	site.PluginConfig = mergeJSON(site.PluginConfig, models.JSONMap{
		"include_in_checkin": payload.IncludeInCheckin,
	})
	if err := a.DB.Model(&site).Update("plugin_config", site.PluginConfig).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := map[string]any{
		"id": site.ID, "name": site.Name, "plugin_key": site.PluginKey, "group_name": site.GroupName,
		"base_url": site.BaseURL, "is_enabled": site.IsEnabled, "can_checkin": true,
		"include_in_checkin": includeInCheckin(site), "checkin_label": "签到", "reason": "",
		"last_status": site.LastStatus, "connection_status": site.LastStatus, "last_message": site.LastMessage,
		"last_balance": site.LastBalance, "balance_display": balanceDisplayWithUnit(site.LastBalance, jsonMapString(site.PluginConfig, "balance_unit")),
		"package_display": packageDisplay(site), "checkin_status": site.LastStatus, "last_run_at": site.LastRunAt,
	}
	for key, value := range packageQuotaMap(site) {
		out[key] = value
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) SiteCheckin(w http.ResponseWriter, r *http.Request) {
	site, ok := a.getSite(w, chi.URLParam(r, "siteID"))
	if !ok {
		return
	}
	if canCheckin, reason := a.siteCanCheckin(site); !canCheckin {
		writeError(w, http.StatusBadRequest, reason)
		return
	}
	settings, _ := a.checkinBatchSettings()
	run := a.executeSiteCheckin(r.Context(), site, "manual", settings.RequestTimeout)
	var refreshed models.Site
	if err := a.DB.First(&refreshed, site.ID).Error; err == nil {
		site = refreshed
	}
	out := map[string]any{
		"run":               run.ID,
		"status":            run.Status,
		"message":           run.Message,
		"balance":           run.Balance,
		"balance_unit":      services.NormalizeBalanceUnit(jsonMapString(site.PluginConfig, "balance_unit")),
		"balance_display":   balanceDisplayWithUnit(run.Balance, jsonMapString(site.PluginConfig, "balance_unit")),
		"package_display":   packageDisplay(site),
		"checkin_status":    run.Status,
		"connection_status": run.Status,
	}
	for key, value := range packageQuotaMap(site) {
		out[key] = value
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) executeSiteCheckin(ctx context.Context, site models.Site, triggerType string, timeoutSeconds int) models.CheckinRun {
	return a.executeSiteCheckinAt(ctx, site, triggerType, timeoutSeconds, time.Time{})
}

func (a *App) executeSiteCheckinAt(ctx context.Context, site models.Site, triggerType string, timeoutSeconds int, runAt time.Time) models.CheckinRun {
	return a.executeSiteCheckinAttemptAt(ctx, site, triggerType, timeoutSeconds, 1, runAt)
}

func (a *App) executeSiteCheckinAttemptAt(ctx context.Context, site models.Site, triggerType string, timeoutSeconds int, attemptCount int, runAt time.Time) models.CheckinRun {
	if attemptCount < 1 {
		attemptCount = 1
	}
	now := checkinRunTimestamp(runAt)
	run := models.CheckinRun{SiteID: &site.ID, TriggerType: triggerType, Status: "running", Message: "签到执行中。", AttemptCount: attemptCount, StartedAt: now}
	if err := a.DB.Create(&run).Error; err != nil {
		finished := time.Now().UTC()
		run.Status = "failed"
		run.Message = "创建签到记录失败: " + err.Error()
		run.FinishedAt = &finished
		return run
	}
	manager := a.PluginManager
	if manager == nil {
		manager = plugins.NewManager()
	}
	plugin, err := manager.Get(site.PluginKey)
	if err != nil {
		finishRun(a.DB, &run, "failed", err.Error(), nil, nil)
		updateSiteAfterCheckin(a.DB, &site, "failed", err.Error(), nil, now)
		return run
	}
	timeoutSeconds = siteRequestTimeoutSeconds(timeoutSeconds)
	result, err := plugin.Checkin(ctx, site, timeoutSeconds)
	if err != nil {
		finishRun(a.DB, &run, "failed", err.Error(), nil, nil)
		updateSiteAfterCheckin(a.DB, &site, "failed", err.Error(), nil, now)
		return run
	}
	status := "failed"
	if result.Success {
		status = "success"
	}
	balance := result.Balance
	if status == "success" {
		balance = a.syncBalanceAfterCheckin(ctx, plugin, &site, result, timeoutSeconds)
	}
	finishRun(a.DB, &run, status, result.Message, balance, result.ResponseExcerpt)
	updateSiteAfterCheckin(a.DB, &site, status, result.Message, balance, now)
	return run
}

func checkinRunTimestamp(runAt time.Time) time.Time {
	if runAt.IsZero() {
		return time.Now().UTC()
	}
	return runAt.UTC()
}

func finishRun(db *gorm.DB, run *models.CheckinRun, status, message string, balance *float64, excerpt *string) {
	finished := time.Now().UTC()
	run.Status = status
	run.Message = message
	run.Balance = balance
	run.ResponseExcerpt = excerpt
	run.FinishedAt = &finished
	_ = db.Save(run).Error
}

func updateSiteAfterCheckin(db *gorm.DB, site *models.Site, status, message string, balance *float64, runAt time.Time) {
	site.LastStatus = &status
	site.LastMessage = &message
	site.LastRunAt = &runAt
	updates := map[string]any{
		"last_status":  site.LastStatus,
		"last_message": site.LastMessage,
		"last_run_at":  site.LastRunAt,
	}
	if balance != nil {
		site.LastBalance = balance
		updates["last_balance"] = balance
	}
	if len(site.Credentials) > 0 {
		updates["credentials"] = site.Credentials
	}
	if len(site.PluginConfig) > 0 {
		updates["plugin_config"] = site.PluginConfig
	}
	_ = db.Model(site).Updates(updates).Error
}

func (a *App) syncBalanceAfterCheckin(ctx context.Context, plugin plugins.SitePlugin, site *models.Site, result plugins.CheckinResult, timeout int) *float64 {
	if site.PluginConfig == nil {
		site.PluginConfig = models.JSONMap{}
	}
	if site.Credentials == nil {
		site.Credentials = models.JSONMap{}
	}
	if result.BalanceUnit != nil && strings.TrimSpace(*result.BalanceUnit) != "" {
		site.PluginConfig = mergeJSON(site.PluginConfig, models.JSONMap{"balance_unit": services.NormalizeBalanceUnit(*result.BalanceUnit)})
	}
	balance := result.Balance
	opCtx, cancel := siteOperationContext(ctx, timeout)
	defer cancel()
	status, err := plugin.FetchAccountStatus(opCtx, *site, timeout)
	if err != nil {
		if balance != nil {
			return balance
		}
		return site.LastBalance
	}
	if status.Balance != nil {
		balance = status.Balance
	}
	if status.BalanceUnit != nil && strings.TrimSpace(*status.BalanceUnit) != "" {
		site.PluginConfig = mergeJSON(site.PluginConfig, models.JSONMap{"balance_unit": services.NormalizeBalanceUnit(*status.BalanceUnit)})
	}
	if status.PackageDisplay != nil && strings.TrimSpace(*status.PackageDisplay) != "" {
		site.PluginConfig = mergeJSON(site.PluginConfig, models.JSONMap{"package_display": strings.TrimSpace(*status.PackageDisplay)})
	}
	if status.InviteLink != nil && strings.TrimSpace(*status.InviteLink) != "" {
		site.PluginConfig = mergeJSON(site.PluginConfig, models.JSONMap{"invite_link": strings.TrimSpace(*status.InviteLink)})
	}
	if status.InviteCode != nil && strings.TrimSpace(*status.InviteCode) != "" {
		site.PluginConfig = mergeJSON(site.PluginConfig, models.JSONMap{"invite_code": strings.TrimSpace(*status.InviteCode)})
	}
	if len(status.UpdatedCredentials) > 0 {
		mergeCredentialUpdates(site, status.UpdatedCredentials)
	}
	if len(status.UpdatedPluginConfig) > 0 {
		site.PluginConfig = mergeJSON(site.PluginConfig, status.UpdatedPluginConfig)
	}
	if balance != nil {
		return balance
	}
	return site.LastBalance
}

func includeInCheckin(site models.Site) bool {
	if site.PluginConfig == nil || site.PluginConfig["include_in_checkin"] == nil {
		return site.IsEnabled
	}
	switch typed := site.PluginConfig["include_in_checkin"].(type) {
	case bool:
		return typed
	case string:
		value := strings.TrimSpace(strings.ToLower(typed))
		if value == "" {
			return site.IsEnabled
		}
		if parsed, err := strconv.ParseBool(value); err == nil {
			return parsed
		}
		return site.IsEnabled
	case float64:
		return typed != 0
	case int:
		return typed != 0
	default:
		return site.IsEnabled
	}
}

func (a *App) siteCanCheckin(site models.Site) (bool, string) {
	manager := a.PluginManager
	if manager == nil {
		manager = plugins.NewManager()
	}
	plugin, err := manager.Get(site.PluginKey)
	if err != nil {
		return false, err.Error()
	}
	meta := plugin.Meta()
	if containsFold(meta.Capabilities, "relay_only") {
		return false, "模型供应商站点不支持签到。"
	}
	if !containsFold(meta.Capabilities, "checkin") {
		return false, "当前插件不支持签到。"
	}
	if site.PluginKey == "sub2api-platform" {
		disabled := strings.ToLower(strings.TrimSpace(jsonMapString(site.PluginConfig, "disable_checkin")))
		switch disabled {
		case "1", "true", "yes", "on":
			return false, "当前部署已关闭签到接口。"
		}
	}
	return true, ""
}

func (a *App) SiteQueue(w http.ResponseWriter, r *http.Request) {
	site, ok := a.getSite(w, chi.URLParam(r, "siteID"))
	if !ok {
		return
	}
	var tasks []models.SiteQueueTask
	if err := a.DB.Where("site_id = ?", site.ID).Order("sort_order asc, id asc").Find(&tasks).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := make([]map[string]any, 0, len(tasks))
	for _, task := range tasks {
		out = append(out, siteQueueTaskResponse(task))
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) ActivateQueueTask(w http.ResponseWriter, r *http.Request) {
	site, ok := a.getSite(w, chi.URLParam(r, "siteID"))
	if !ok {
		return
	}
	taskKey := strings.TrimSpace(chi.URLParam(r, "taskKey"))
	if taskKey == "" {
		writeError(w, http.StatusBadRequest, "任务标识不能为空")
		return
	}
	var payload struct {
		Message string `json:"message"`
	}
	if err := httpx.Decode(r, &payload); err != nil && !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	var task models.SiteQueueTask
	err := a.DB.Where("site_id = ? AND task_key = ?", site.ID, taskKey).First(&task).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		writeError(w, http.StatusNotFound, "队列任务不存在")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	now := time.Now().UTC()
	message := strings.TrimSpace(payload.Message)
	if message == "" {
		message = "任务已标记完成。"
	}
	task.Status = "done"
	task.LastMessage = &message
	task.LastError = nil
	task.CompletedAt = &now
	if err := a.DB.Save(&task).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, siteQueueTaskResponse(task))
}

func siteQueueTaskResponse(task models.SiteQueueTask) map[string]any {
	status := strings.TrimSpace(task.Status)
	if status == "" {
		status = "pending"
	}
	return map[string]any{
		"id":           task.ID,
		"task_key":     task.TaskKey,
		"title":        task.Title,
		"detail":       task.Detail,
		"status":       status,
		"sort_order":   task.SortOrder,
		"action_key":   task.ActionKey,
		"action_label": task.ActionLabel,
		"last_message": task.LastMessage,
		"last_error":   task.LastError,
		"completed_at": task.CompletedAt,
		"updated_at":   task.UpdatedAt,
	}
}

func (a *App) TotpPreview(w http.ResponseWriter, r *http.Request) {
	site, ok := a.getSite(w, chi.URLParam(r, "siteID"))
	if !ok {
		return
	}
	code, expiresIn, err := services.ResolveTOTPCode(
		strings.TrimSpace(jsonMapString(site.Credentials, "totp_secret")),
		strings.TrimSpace(jsonMapString(site.Credentials, "totp_otpauth_url")),
	)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if code == "" {
		writeError(w, http.StatusBadRequest, "站点未配置 TOTP secret 或 otpauth 链接")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"code": code, "expires_in": expiresIn})
}
