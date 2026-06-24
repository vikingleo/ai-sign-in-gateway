package handlers

import (
	"net/http"
	"time"

	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/schemas"
)

func (a *App) Overview(w http.ResponseWriter, r *http.Request) {
	var siteCount int64
	var enabledCount int64
	var successToday int64
	var failedToday int64
	a.DB.Model(&models.Site{}).Count(&siteCount)
	a.DB.Model(&models.Site{}).Where("is_enabled = ?", true).Count(&enabledCount)
	today := time.Now().UTC().Truncate(24 * time.Hour)
	a.DB.Model(&models.CheckinRun{}).Where("started_at >= ? AND status = ?", today, "success").Count(&successToday)
	a.DB.Model(&models.CheckinRun{}).Where("started_at >= ? AND status = ?", today, "failed").Count(&failedToday)

	var runs []models.CheckinRun
	a.DB.Preload("Site").Order("started_at desc").Limit(8).Find(&runs)
	recent := make([]schemas.CheckinRunResponse, 0, len(runs))
	for _, run := range runs {
		recent = append(recent, checkinRunResponse(run))
	}

	var sites []models.Site
	a.DB.
		Where("is_enabled = ? OR last_status = ? OR last_status = ?", false, "failed", "error").
		Order("CASE WHEN last_status IN ('failed', 'error') THEN 0 WHEN is_enabled = false THEN 1 ELSE 2 END").
		Order("updated_at desc").
		Limit(6).
		Find(&sites)
	attention := make([]schemas.OverviewAttentionSite, 0, len(sites))
	for _, site := range sites {
		attention = append(attention, overviewAttentionSite(site))
	}

	writeJSON(w, http.StatusOK, schemas.OverviewResponse{
		SiteCount:        int(siteCount),
		EnabledSiteCount: int(enabledCount),
		TodaySuccess:     int(successToday),
		TodayFailed:      int(failedToday),
		RecentRuns:       recent,
		AttentionSites:   attention,
	})
}

func overviewAttentionSite(site models.Site) schemas.OverviewAttentionSite {
	status := site.LastStatus
	message := site.LastMessage
	if !site.IsEnabled {
		paused := "paused"
		status = &paused
		disabledMessage := "站点已停用，不参与签到和网关路由。"
		if message != nil && *message != "" {
			disabledMessage += "最近状态：" + *message
		}
		message = &disabledMessage
	}
	return schemas.OverviewAttentionSite{
		ID:          site.ID,
		Name:        site.Name,
		LastStatus:  status,
		LastMessage: message,
		LastRunAt:   site.LastRunAt,
	}
}
