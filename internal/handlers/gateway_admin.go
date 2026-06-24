package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"ai-sign-in-gateway/internal/httpx"
	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/schemas"
	"ai-sign-in-gateway/internal/services"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

type gormDB = gorm.DB

func (a *App) GatewayAdminRoutes(r chi.Router) {
	r.Get("/overview", a.GatewayOverview)
	r.Get("/usage", a.GatewayUsage)
	r.Get("/settings", a.GetGatewaySettings)
	r.Put("/settings", a.UpdateGatewaySettings)
	r.Post("/sync", a.SyncGatewayRoutes)
	r.Get("/route-groups", a.GatewayRouteGroups)
	r.Post("/route-groups", a.CreateGatewayRouteGroup)
	r.Put("/route-groups/{groupID}", a.UpdateGatewayRouteGroup)
	r.Delete("/route-groups/{groupID}", a.DeleteGatewayRouteGroup)
	r.Get("/routes", a.GatewayRoutes)
	r.Get("/active-requests", a.GatewayActiveRequests)
	r.Post("/routes/probe", a.ProbeGatewayRoutes)
	r.Post("/routes/priorities/reorder", a.ReorderGatewayRoutePriorities)
	r.Post("/routes/disable-all", a.DisableAllGatewayRoutes)
	r.Delete("/routes/{routeID}", a.DeleteGatewayRoute)
	r.Post("/routes/{routeID}/toggle", a.ToggleGatewayRoute)
	r.Post("/routes/{routeID}/enable-only", a.EnableOnlyGatewayRoute)
	r.Post("/routes/{routeID}/reset-circuit", a.ResetGatewayCircuit)
	r.Put("/routes/{routeID}/groups", a.UpdateGatewayRouteGroups)
	r.Patch("/routes/{routeID}/type", a.UpdateGatewayRouteType)
	r.Get("/routes/{routeID}/diagnose", a.DiagnoseGatewayRoute)
	r.Post("/routes/{routeID}/probe", a.ProbeGatewayRoute)
	r.Post("/routes/{routeID}/balance-probe", a.ProbeGatewayRouteBalance)
	r.Get("/routes/{routeID}/logs", a.GatewayRouteLogs)
	r.Get("/logs", a.GatewayLogs)
}

func (a *App) GatewayOverview(w http.ResponseWriter, r *http.Request) {
	settings, err := a.effectiveSystemSettings()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var total, healthy, open, halfOpen, disabled int64
	a.DB.Model(&models.GatewayRouteState{}).Count(&total)
	a.DB.Model(&models.GatewayRouteState{}).Where("is_enabled = ? AND circuit_state = ?", true, "closed").Count(&healthy)
	a.DB.Model(&models.GatewayRouteState{}).Where("circuit_state = ?", "open").Count(&open)
	a.DB.Model(&models.GatewayRouteState{}).Where("circuit_state = ?", "half_open").Count(&halfOpen)
	a.DB.Model(&models.GatewayRouteState{}).Where("is_enabled = ?", false).Count(&disabled)

	now := time.Now().UTC()
	since24h := now.Add(-24 * time.Hour)
	overviewStats, _ := gatewayOverviewStats(a.DB, since24h)

	totalBalance, quantified := totalBalanceForRoutes(a.DB)
	pricing := services.ResolveGatewayPricingScheme(settings.GatewayPricingActiveSchemeID, settings.GatewayPricingSchemes)
	costSummary := gatewayUsageCostSummaryStream(a.DB, since24h, pricing)
	concurrencyPeaks, _ := services.GatewayConcurrencyPeakStats(a.DB, now)

	writeJSON(w, http.StatusOK, map[string]any{
		"total_routes":                  total,
		"healthy_routes":                healthy,
		"open_circuit_routes":           open,
		"half_open_routes":              halfOpen,
		"disabled_routes":               disabled,
		"total_balance_display":         totalBalance,
		"quantified_balance_site_count": quantified,
		"active_concurrency":            services.RouteTotalActive(),
		"max_concurrency_all_time":      concurrencyPeaks.AllTime,
		"max_concurrency_today":         concurrencyPeaks.Today,
		"request_count_24h":             overviewStats.RequestCount24h,
		"success_rate_24h":              overviewStats.SuccessRate,
		"avg_latency_ms_24h":            overviewStats.AvgLatency,
		"usage_cost_24h":                costSummary,
		"strategy_breakdown_24h":        strategyBreakdown24hStream(a.DB, since24h),
		"route_strategy":                gatewayRouteStrategyOrDefault(settings.GatewayRouteStrategy),
		"failure_threshold":             settings.GatewayFailureThreshold,
		"cooldown_seconds":              settings.GatewayCooldownSeconds,
		"request_timeout":               settings.GatewayRequestTimeout,
		"max_attempts":                  settings.GatewayMaxAttempts,
		"failure_retry_mode":            services.NormalizeGatewayFailureRetryMode(settings.GatewayFailureRetryMode),
		"route_concurrency_limit":       settings.GatewayRouteConcurrencyLimit,
		"concurrency_transfer_strategy": normalizeGatewayConcurrencyTransferStrategy(settings.GatewayConcurrencyTransferStrategy),
		"concurrency_overflow_strategy": gatewayConcurrencyOverflowStrategyOrDefault(settings.GatewayConcurrencyOverflowStrategy),
	})
}

func round2(v float64) float64 {
	return float64(int64(v*100+0.5)) / 100
}

type gatewayOverviewAgg struct {
	TotalRows       int64
	SuccessRows     int64
	LatencySamples  int64
	LatencySum      sql.NullFloat64
	RequestCount24h int64
	SuccessRate     float64 `gorm:"-"`
	AvgLatency      any     `gorm:"-"`
}

func gatewayOverviewStats(db *gormDB, since24h time.Time) (gatewayOverviewAgg, error) {
	stats := gatewayOverviewAgg{}
	if db == nil {
		return stats, nil
	}
	if err := db.Model(&models.GatewayRequestLog{}).
		Where("created_at >= ?", since24h).
		Select(
			"COUNT(*) AS total_rows",
			"COALESCE(SUM(CASE WHEN success THEN 1 ELSE 0 END), 0) AS success_rows",
			"COALESCE(SUM(CASE WHEN success AND latency_ms IS NOT NULL THEN latency_ms ELSE 0 END), 0) AS latency_sum",
			"COALESCE(SUM(CASE WHEN success AND latency_ms IS NOT NULL THEN 1 ELSE 0 END), 0) AS latency_samples",
		).
		Scan(&stats).Error; err != nil {
		return stats, err
	}
	_ = db.Model(&models.GatewayRequestLog{}).
		Where("created_at >= ?", since24h).
		Distinct("request_id").
		Count(&stats.RequestCount24h).Error
	if stats.TotalRows > 0 {
		stats.SuccessRate = round2(float64(stats.SuccessRows) / float64(stats.TotalRows) * 100)
	}
	if stats.LatencySamples > 0 && stats.LatencySum.Valid {
		stats.AvgLatency = round2(stats.LatencySum.Float64 / float64(stats.LatencySamples))
	}
	return stats, nil
}

func totalBalanceForRoutes(db *gormDB) (any, int) {
	var routes []models.GatewayRouteState
	if err := db.Joins("JOIN sites ON sites.id = gateway_route_states.site_id").
		Where("gateway_route_states.is_enabled = ? AND sites.is_enabled = ? AND gateway_route_states.last_balance IS NOT NULL", true, true).
		Find(&routes).Error; err != nil {
		return nil, 0
	}
	totals := map[string]float64{}
	quantified := 0
	for _, route := range routes {
		if route.LastBalance == nil {
			continue
		}
		unit := services.NormalizeBalanceUnit(route.BalanceUnit)
		if unit == "" {
			unit = "$"
		}
		quantified++
		totals[unit] += *route.LastBalance
	}
	if quantified == 0 {
		return nil, 0
	}
	units := make([]string, 0, len(totals))
	for unit := range totals {
		units = append(units, unit)
	}
	sort.Slice(units, func(i, j int) bool {
		return balanceUnitRank(units[i]) < balanceUnitRank(units[j]) ||
			(balanceUnitRank(units[i]) == balanceUnitRank(units[j]) && units[i] < units[j])
	})
	parts := make([]string, 0, len(units))
	for _, unit := range units {
		value := totals[unit]
		if display := balanceDisplayWithUnit(&value, unit); display != nil {
			parts = append(parts, *display)
		}
	}
	return strings.Join(parts, " / "), quantified
}

func balanceUnitRank(unit string) int {
	switch services.NormalizeBalanceUnit(unit) {
	case "$":
		return 0
	case "¥":
		return 1
	case "€":
		return 2
	case "£":
		return 3
	default:
		return 10
	}
}

func (a *App) GatewayUsage(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local).UTC()
	end := now.UTC()
	var err error
	if raw := strings.TrimSpace(r.URL.Query().Get("start")); raw != "" {
		start, err = parseGatewayUsageTime(raw)
		if err != nil {
			writeError(w, http.StatusBadRequest, "开始时间格式无效")
			return
		}
	}
	if raw := strings.TrimSpace(r.URL.Query().Get("end")); raw != "" {
		end, err = parseGatewayUsageTime(raw)
		if err != nil {
			writeError(w, http.StatusBadRequest, "结束时间格式无效")
			return
		}
	}
	if !end.After(start) {
		writeError(w, http.StatusBadRequest, "结束时间必须晚于开始时间")
		return
	}
	if end.Sub(start) > 366*24*time.Hour {
		writeError(w, http.StatusBadRequest, "查询时间段不能超过 366 天")
		return
	}

	settings, err := a.effectiveSystemSettings()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	pricing := services.ResolveGatewayPricingScheme(settings.GatewayPricingActiveSchemeID, settings.GatewayPricingSchemes)
	out, err := a.gatewayUsageResponseStream(start, end, pricing)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func parseGatewayUsageTime(raw string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339Nano, raw); err == nil {
		return t.UTC(), nil
	}
	if t, err := time.ParseInLocation("2006-01-02 15:04:05", raw, time.Local); err == nil {
		return t.UTC(), nil
	}
	if t, err := time.ParseInLocation("2006-01-02", raw, time.Local); err == nil {
		return t.UTC(), nil
	}
	return time.Time{}, errors.New("invalid time")
}

type gatewayUsageAgg struct {
	RouteID            *uint
	RouteLabel         string
	SiteID             *uint
	SiteName           *string
	KeyName            string
	KeyFingerprint     string
	GroupName          string
	RouteType          string
	Model              string
	RequestCount       int
	SuccessCount       int
	FailureCount       int
	StreamRequestCount int
	PromptTokens       int
	CachedInputTokens  int
	CompletionTokens   int
	TotalTokens        int
	UsageCost          float64
	hasUsageCost       bool
	ComputedInputCost  float64
	ComputedCachedCost float64
	ComputedOutputCost float64
	ComputedTotalCost  float64
	ComputedCostKnown  bool
	ComputedCostMixed  bool
	latencySum         float64
	latencySamples     int
	lastUsedAt         time.Time
}

type gatewayUsageCostAgg struct {
	InputCost        float64
	CachedCost       float64
	OutputCost       float64
	TotalCost        float64
	UpstreamCost     float64
	PromptTokens     int
	CachedTokens     int
	OutputTokens     int
	TotalTokens      int
	KnownRequests    int
	UnknownRequests  int
	UpstreamRequests int
	TopModels        map[string]*gatewayModelCostAgg
}

type gatewayModelCostAgg struct {
	Model      string
	Requests   int
	TotalCost  float64
	KnownPrice bool
}

func (a *App) gatewayUsageResponse(logs []models.GatewayRequestLog, start, end time.Time, pricing models.GatewayPricingScheme) (map[string]any, error) {
	routeByID, routeBySiteKey, err := a.gatewayLogRouteLookup(logs)
	if err != nil {
		return nil, err
	}
	siteByID := map[uint]models.Site{}
	for _, log := range logs {
		if log.Site != nil {
			siteByID[log.Site.ID] = *log.Site
		}
	}
	return gatewayUsageResponseFromLogs(logs, start, end, pricing, routeByID, routeBySiteKey, siteByID), nil
}

func (a *App) gatewayUsageResponseStream(start, end time.Time, pricing models.GatewayPricingScheme) (map[string]any, error) {
	routeIDSet := map[uint]bool{}
	siteIDSet := map[uint]bool{}
	metaRows, err := a.DB.Model(&models.GatewayRequestLog{}).
		Select("route_state_id", "site_id").
		Where("created_at >= ? AND created_at < ?", start, end).
		Rows()
	if err != nil {
		return nil, err
	}
	for metaRows.Next() {
		var routeID sql.NullInt64
		var siteID sql.NullInt64
		if err := metaRows.Scan(&routeID, &siteID); err != nil {
			metaRows.Close()
			return nil, err
		}
		if routeID.Valid && routeID.Int64 > 0 {
			routeIDSet[uint(routeID.Int64)] = true
		}
		if siteID.Valid && siteID.Int64 > 0 {
			siteIDSet[uint(siteID.Int64)] = true
		}
	}
	if err := metaRows.Close(); err != nil {
		return nil, err
	}

	routeByID, routeBySiteKey, err := a.gatewayLogRouteLookupForIDs(routeIDSet, siteIDSet)
	if err != nil {
		return nil, err
	}
	siteByID, err := a.gatewaySiteLookupForIDs(siteIDSet)
	if err != nil {
		return nil, err
	}

	rows, err := a.DB.Model(&models.GatewayRequestLog{}).
		Select("id", "request_id", "route_state_id", "site_id", "key_fingerprint", "key_name", "group_name", "model", "requested_model", "actual_model", "route_type", "success", "latency_ms", "prompt_tokens", "cached_input_tokens", "cache_read_tokens", "cache_write_tokens", "completion_tokens", "total_tokens", "usage_cost", "is_stream", "created_at").
		Where("created_at >= ? AND created_at < ?", start, end).
		Order("created_at desc").
		Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	total := gatewayUsageAgg{}
	groups := map[string]*gatewayUsageAgg{}
	for rows.Next() {
		var log models.GatewayRequestLog
		if err := a.DB.ScanRows(rows, &log); err != nil {
			return nil, err
		}
		addGatewayUsageLog(&total, groups, log, pricing, routeByID, routeBySiteKey, siteByID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return gatewayUsageResponseFromAggs(&total, groups, start, end), nil
}

func gatewayUsageResponseFromLogs(
	logs []models.GatewayRequestLog,
	start, end time.Time,
	pricing models.GatewayPricingScheme,
	routeByID map[uint]models.GatewayRouteState,
	routeBySiteKey map[string]models.GatewayRouteState,
	siteByID map[uint]models.Site,
) map[string]any {
	total := gatewayUsageAgg{}
	groups := map[string]*gatewayUsageAgg{}
	for _, log := range logs {
		addGatewayUsageLog(&total, groups, log, pricing, routeByID, routeBySiteKey, siteByID)
	}
	return gatewayUsageResponseFromAggs(&total, groups, start, end)
}

func addGatewayUsageLog(
	total *gatewayUsageAgg,
	groups map[string]*gatewayUsageAgg,
	log models.GatewayRequestLog,
	pricing models.GatewayPricingScheme,
	routeByID map[uint]models.GatewayRouteState,
	routeBySiteKey map[string]models.GatewayRouteState,
	siteByID map[uint]models.Site,
) {
	total.RequestCount++
	if log.Success {
		total.SuccessCount++
	} else {
		total.FailureCount++
	}
	if log.IsStream {
		total.StreamRequestCount++
	}
	addGatewayUsageTokens(total, log)
	addGatewayUsageCost(total, log, pricing)
	addGatewayUsageLatency(total, log)

	state, matched := models.GatewayRouteState{}, false
	if log.RouteStateID != nil {
		state, matched = routeByID[*log.RouteStateID]
	}
	if !matched && log.SiteID != nil {
		state, matched = routeBySiteKey[gatewayLogRouteKey(*log.SiteID, log.KeyFingerprint)]
	}

	routeID := log.RouteStateID
	if matched {
		id := state.ID
		routeID = &id
	}
	routeKey := "unknown"
	if routeID != nil && *routeID > 0 {
		routeKey = "route:" + strconv.FormatUint(uint64(*routeID), 10)
	} else if log.SiteID != nil {
		routeKey = gatewayLogRouteKey(*log.SiteID, log.KeyFingerprint)
	}
	agg, ok := groups[routeKey]
	if !ok {
		var siteName *string
		if log.Site != nil {
			siteName = &log.Site.Name
		}
		if siteName == nil && log.SiteID != nil {
			if site, ok := siteByID[*log.SiteID]; ok {
				siteName = &site.Name
			}
		}
		if siteName == nil && matched {
			name := services.GatewayRouteSiteLabel(services.GatewayRoute{State: state, Site: state.Site})
			siteName = &name
		}
		agg = &gatewayUsageAgg{
			RouteID:        routeID,
			SiteID:         log.SiteID,
			SiteName:       siteName,
			KeyName:        log.KeyName,
			KeyFingerprint: log.KeyFingerprint,
			GroupName:      log.GroupName,
			RouteType:      gatewayLogRouteType(log, state, matched),
			Model:          gatewayLogEffectiveModel(log),
			RouteLabel:     gatewayLogRouteLabel(log, state, matched, siteName),
		}
		if matched {
			if agg.SiteID == nil {
				siteID := state.SiteID
				agg.SiteID = &siteID
			}
			if strings.TrimSpace(agg.KeyName) == "" {
				agg.KeyName = state.KeyName
			}
			if strings.TrimSpace(agg.GroupName) == "" {
				agg.GroupName = state.GroupName
			}
		}
		groups[routeKey] = agg
	}
	agg.RequestCount++
	if log.Success {
		agg.SuccessCount++
	} else {
		agg.FailureCount++
	}
	if log.IsStream {
		agg.StreamRequestCount++
	}
	if logModel := gatewayLogEffectiveModel(log); logModel != "" {
		if strings.TrimSpace(agg.Model) == "" {
			agg.Model = logModel
		} else if agg.Model != logModel {
			agg.Model = "mixed"
		}
	}
	addGatewayUsageTokens(agg, log)
	addGatewayUsageCost(agg, log, pricing)
	addGatewayUsageLatency(agg, log)
	if log.CreatedAt.After(agg.lastUsedAt) {
		agg.lastUsedAt = log.CreatedAt
	}
}

func gatewayUsageResponseFromAggs(total *gatewayUsageAgg, groups map[string]*gatewayUsageAgg, start, end time.Time) map[string]any {
	routes := make([]map[string]any, 0, len(groups))
	for _, agg := range groups {
		routes = append(routes, gatewayUsageAggResponse(agg))
	}
	sortGatewayUsageRoutes(routes)
	out := gatewayUsageAggResponse(total)
	out["start"] = start.Format(time.RFC3339)
	out["end"] = end.Format(time.RFC3339)
	out["routes"] = routes
	return out
}

func addGatewayUsageTokens(agg *gatewayUsageAgg, log models.GatewayRequestLog) {
	if log.PromptTokens != nil {
		agg.PromptTokens += *log.PromptTokens
	}
	if log.CachedInputTokens != nil {
		agg.CachedInputTokens += *log.CachedInputTokens
	} else if log.CacheReadTokens != nil || log.CacheWriteTokens != nil {
		agg.CachedInputTokens += intPtrValue(log.CacheReadTokens) + intPtrValue(log.CacheWriteTokens)
	}
	if log.CompletionTokens != nil {
		agg.CompletionTokens += *log.CompletionTokens
	}
	if log.TotalTokens != nil {
		agg.TotalTokens += *log.TotalTokens
	}
}

func addGatewayUsageLatency(agg *gatewayUsageAgg, log models.GatewayRequestLog) {
	if log.Success && log.LatencyMS != nil {
		agg.latencySum += *log.LatencyMS
		agg.latencySamples++
	}
}

func addGatewayUsageCost(agg *gatewayUsageAgg, log models.GatewayRequestLog, pricing models.GatewayPricingScheme) {
	if log.UsageCost != nil {
		agg.UsageCost += *log.UsageCost
		agg.hasUsageCost = true
	}
	cost, known := gatewayComputedUsageCostForLog(log, pricing)
	agg.ComputedInputCost += cost.InputCost
	agg.ComputedCachedCost += cost.CachedCost
	agg.ComputedOutputCost += cost.OutputCost
	agg.ComputedTotalCost += cost.TotalCost
	if known {
		agg.ComputedCostKnown = true
	} else if gatewayLogHasUsageTokens(log) {
		agg.ComputedCostMixed = true
	}
}

func gatewayLogEffectiveModel(log models.GatewayRequestLog) string {
	return firstNonEmpty(log.ActualModel, log.RequestedModel, log.Model)
}

func gatewayLogRouteType(log models.GatewayRequestLog, state models.GatewayRouteState, matched bool) string {
	if value := strings.TrimSpace(log.RouteType); value != "" {
		return value
	}
	if matched {
		return strings.TrimSpace(state.RouteType)
	}
	return ""
}

func gatewayUsageAggResponse(agg *gatewayUsageAgg) map[string]any {
	var avgLatency any
	if agg.latencySamples > 0 {
		avgLatency = round2(agg.latencySum / float64(agg.latencySamples))
	}
	var usageCost any
	if agg.hasUsageCost {
		usageCost = round2(agg.UsageCost)
	}
	successRate := 0.0
	if agg.RequestCount > 0 {
		successRate = round2(float64(agg.SuccessCount) / float64(agg.RequestCount) * 100)
	}
	return map[string]any{
		"route_id":             agg.RouteID,
		"route_label":          agg.RouteLabel,
		"site_id":              agg.SiteID,
		"site_name":            agg.SiteName,
		"key_name":             agg.KeyName,
		"key_fingerprint":      agg.KeyFingerprint,
		"group_name":           agg.GroupName,
		"route_type":           agg.RouteType,
		"model":                agg.Model,
		"request_count":        agg.RequestCount,
		"success_count":        agg.SuccessCount,
		"failure_count":        agg.FailureCount,
		"success_rate":         successRate,
		"stream_request_count": agg.StreamRequestCount,
		"prompt_tokens":        agg.PromptTokens,
		"cached_input_tokens":  agg.CachedInputTokens,
		"completion_tokens":    agg.CompletionTokens,
		"total_tokens":         agg.TotalTokens,
		"usage_cost":           usageCost,
		"computed_input_cost":  roundCost(agg.ComputedInputCost),
		"computed_cached_cost": roundCost(agg.ComputedCachedCost),
		"computed_output_cost": roundCost(agg.ComputedOutputCost),
		"computed_total_cost":  roundCost(agg.ComputedTotalCost),
		"computed_cost_known":  agg.ComputedCostKnown,
		"computed_cost_mixed":  agg.ComputedCostMixed,
		"avg_latency_ms":       avgLatency,
		"last_used_at":         nullableTime(agg.lastUsedAt),
	}
}

func roundCost(value float64) float64 {
	return float64(int64(value*1_000_000+0.5)) / 1_000_000
}

func gatewayUsageCostSummary(logs []models.GatewayRequestLog, pricing models.GatewayPricingScheme) map[string]any {
	agg := gatewayUsageCostAgg{TopModels: map[string]*gatewayModelCostAgg{}}
	for _, log := range logs {
		addGatewayUsageCostSummary(&agg, log, pricing)
	}
	return gatewayUsageCostSummaryResponse(agg)
}

func gatewayUsageCostSummaryStream(db *gormDB, since time.Time, pricing models.GatewayPricingScheme) map[string]any {
	agg := gatewayUsageCostAgg{TopModels: map[string]*gatewayModelCostAgg{}}
	if db == nil {
		return gatewayUsageCostSummaryResponse(agg)
	}
	rows, err := db.Model(&models.GatewayRequestLog{}).
		Select("route_type", "model", "requested_model", "actual_model", "prompt_tokens", "cached_input_tokens", "cache_read_tokens", "cache_write_tokens", "completion_tokens", "total_tokens", "usage_cost").
		Where("created_at >= ?", since).
		Rows()
	if err != nil {
		return gatewayUsageCostSummaryResponse(agg)
	}
	defer rows.Close()
	for rows.Next() {
		var log models.GatewayRequestLog
		if err := db.ScanRows(rows, &log); err != nil {
			continue
		}
		addGatewayUsageCostSummary(&agg, log, pricing)
	}
	return gatewayUsageCostSummaryResponse(agg)
}

func gatewayUsageCostSummaryResponse(agg gatewayUsageCostAgg) map[string]any {
	topModels := make([]map[string]any, 0, len(agg.TopModels))
	for _, item := range agg.TopModels {
		topModels = append(topModels, map[string]any{
			"model":       item.Model,
			"requests":    item.Requests,
			"total_cost":  roundCost(item.TotalCost),
			"known_price": item.KnownPrice,
		})
	}
	sort.SliceStable(topModels, func(i, j int) bool {
		left, _ := topModels[i]["total_cost"].(float64)
		right, _ := topModels[j]["total_cost"].(float64)
		if left != right {
			return left > right
		}
		leftReq, _ := topModels[i]["requests"].(int)
		rightReq, _ := topModels[j]["requests"].(int)
		return leftReq > rightReq
	})
	if len(topModels) > 3 {
		topModels = topModels[:3]
	}
	return map[string]any{
		"input_cost":        roundCost(agg.InputCost),
		"cached_cost":       roundCost(agg.CachedCost),
		"output_cost":       roundCost(agg.OutputCost),
		"total_cost":        roundCost(agg.TotalCost),
		"upstream_cost":     roundCost(agg.UpstreamCost),
		"prompt_tokens":     agg.PromptTokens,
		"cached_tokens":     agg.CachedTokens,
		"output_tokens":     agg.OutputTokens,
		"total_tokens":      agg.TotalTokens,
		"known_requests":    agg.KnownRequests,
		"unknown_requests":  agg.UnknownRequests,
		"upstream_requests": agg.UpstreamRequests,
		"top_models":        topModels,
		"currency":          "USD",
		"window_seconds":    24 * 60 * 60,
	}
}

func addGatewayUsageCostSummary(agg *gatewayUsageCostAgg, log models.GatewayRequestLog, pricing models.GatewayPricingScheme) {
	if log.PromptTokens != nil {
		agg.PromptTokens += *log.PromptTokens
	}
	if log.CachedInputTokens != nil {
		agg.CachedTokens += *log.CachedInputTokens
	} else if log.CacheReadTokens != nil || log.CacheWriteTokens != nil {
		agg.CachedTokens += intPtrValue(log.CacheReadTokens) + intPtrValue(log.CacheWriteTokens)
	}
	if log.CompletionTokens != nil {
		agg.OutputTokens += *log.CompletionTokens
	}
	if log.TotalTokens != nil {
		agg.TotalTokens += *log.TotalTokens
	}
	if log.UsageCost != nil {
		agg.UpstreamCost += *log.UsageCost
		agg.UpstreamRequests++
	}
	cost, known := gatewayComputedUsageCostForLog(log, pricing)
	agg.InputCost += cost.InputCost
	agg.CachedCost += cost.CachedCost
	agg.OutputCost += cost.OutputCost
	agg.TotalCost += cost.TotalCost
	if known {
		agg.KnownRequests++
	} else if gatewayLogHasUsageTokens(log) {
		agg.UnknownRequests++
	}
	if !gatewayLogHasUsageTokens(log) && log.UsageCost == nil {
		return
	}
	model := gatewayLogEffectiveModel(log)
	if model == "" {
		model = "unknown"
	}
	if _, ok := agg.TopModels[model]; !ok {
		agg.TopModels[model] = &gatewayModelCostAgg{Model: model, KnownPrice: known}
	}
	agg.TopModels[model].Requests++
	agg.TopModels[model].TotalCost += cost.TotalCost
	agg.TopModels[model].KnownPrice = agg.TopModels[model].KnownPrice || known
}

type gatewayComputedUsageCost struct {
	InputCost  float64
	CachedCost float64
	OutputCost float64
	TotalCost  float64
}

func gatewayComputedUsageCostForLog(log models.GatewayRequestLog, pricing models.GatewayPricingScheme) (gatewayComputedUsageCost, bool) {
	price, ok := services.GatewayPriceForModel(pricing, log.RouteType, gatewayLogEffectiveModel(log))
	if !ok {
		return gatewayComputedUsageCost{}, false
	}
	promptTokens := intPtrValue(log.PromptTokens)
	cacheReadTokens := intPtrValue(log.CacheReadTokens)
	cacheWriteTokens := intPtrValue(log.CacheWriteTokens)
	hasSplitCache := log.CacheReadTokens != nil || log.CacheWriteTokens != nil
	if !hasSplitCache {
		cacheReadTokens = intPtrValue(log.CachedInputTokens)
	}
	outputTokens := intPtrValue(log.CompletionTokens)
	billableInputTokens := promptTokens
	if !strings.EqualFold(strings.TrimSpace(log.RouteType), "claude") {
		billableInputTokens = promptTokens - cacheReadTokens - cacheWriteTokens
	}
	if billableInputTokens < 0 {
		billableInputTokens = 0
	}
	inputCost := float64(billableInputTokens) / 1_000_000 * price.InputPerMTok
	cachedCost := float64(cacheReadTokens)/1_000_000*price.CachedInputPerMTok +
		float64(cacheWriteTokens)/1_000_000*price.CacheWritePerMTok
	outputCost := float64(outputTokens) / 1_000_000 * price.OutputPerMTok
	return gatewayComputedUsageCost{
		InputCost:  inputCost,
		CachedCost: cachedCost,
		OutputCost: outputCost,
		TotalCost:  inputCost + cachedCost + outputCost,
	}, true
}

func gatewayLogHasUsageTokens(log models.GatewayRequestLog) bool {
	return intPtrValue(log.PromptTokens) > 0 ||
		intPtrValue(log.CachedInputTokens) > 0 ||
		intPtrValue(log.CacheReadTokens) > 0 ||
		intPtrValue(log.CacheWriteTokens) > 0 ||
		intPtrValue(log.CompletionTokens) > 0 ||
		intPtrValue(log.TotalTokens) > 0
}

func intPtrValue(value *int) int {
	if value == nil {
		return 0
	}
	return *value
}

func sortGatewayUsageRoutes(routes []map[string]any) {
	sort.SliceStable(routes, func(i, j int) bool {
		leftTokens, _ := routes[i]["total_tokens"].(int)
		rightTokens, _ := routes[j]["total_tokens"].(int)
		if leftTokens != rightTokens {
			return leftTokens > rightTokens
		}
		leftRequests, _ := routes[i]["request_count"].(int)
		rightRequests, _ := routes[j]["request_count"].(int)
		if leftRequests != rightRequests {
			return leftRequests > rightRequests
		}
		leftLabel, _ := routes[i]["route_label"].(string)
		rightLabel, _ := routes[j]["route_label"].(string)
		return strings.TrimSpace(leftLabel) < strings.TrimSpace(rightLabel)
	})
}

func nullableTime(value time.Time) any {
	if value.IsZero() {
		return nil
	}
	return value.UTC().Format(time.RFC3339)
}

type strategyAgg struct {
	requests   int
	successes  int
	latencySum float64
	latencies  int
	stream     int
	streamSucc int
	streamLat  float64
	streamTTFB int
}

func strategyBreakdown24h(logs []models.GatewayRequestLog) []map[string]any {
	groups := map[string]*strategyAgg{}
	for _, log := range logs {
		strategy := strings.TrimSpace(log.RouteStrategy)
		switch strategy {
		case "smart", "round_robin", "latency_first", "priority":
		default:
			continue
		}
		agg, ok := groups[strategy]
		if !ok {
			agg = &strategyAgg{}
			groups[strategy] = agg
		}
		agg.requests++
		if log.Success {
			agg.successes++
			if log.LatencyMS != nil {
				agg.latencySum += *log.LatencyMS
				agg.latencies++
			}
		}
		if log.IsStream {
			agg.stream++
			if log.Success {
				agg.streamSucc++
				if log.LatencyMS != nil {
					agg.streamLat += *log.LatencyMS
					agg.streamTTFB++
				}
			}
		}
	}
	return strategyBreakdownResponse(groups)
}

func strategyBreakdownResponse(groups map[string]*strategyAgg) []map[string]any {
	order := []string{"smart", "round_robin", "latency_first", "priority"}
	out := []map[string]any{}
	for _, key := range order {
		agg, ok := groups[key]
		if !ok || agg.requests == 0 {
			continue
		}
		var avgLatency any
		if agg.latencies > 0 {
			avgLatency = round2(agg.latencySum / float64(agg.latencies))
		}
		var avgStreamTTFB any
		if agg.streamTTFB > 0 {
			avgStreamTTFB = round2(agg.streamLat / float64(agg.streamTTFB))
		}
		streamSuccessRate := 0.0
		if agg.stream > 0 {
			streamSuccessRate = round2(float64(agg.streamSucc) / float64(agg.stream) * 100)
		}
		out = append(out, map[string]any{
			"route_strategy":       key,
			"request_count":        agg.requests,
			"success_rate":         round2(float64(agg.successes) / float64(agg.requests) * 100),
			"avg_latency_ms":       avgLatency,
			"stream_request_count": agg.stream,
			"stream_success_rate":  streamSuccessRate,
			"avg_stream_ttfb_ms":   avgStreamTTFB,
		})
	}
	return out
}

func strategyBreakdown24hStream(db *gormDB, since time.Time) []map[string]any {
	if db == nil {
		return nil
	}
	rows, err := db.Model(&models.GatewayRequestLog{}).
		Select("route_strategy, COUNT(*) AS requests, COALESCE(SUM(CASE WHEN success THEN 1 ELSE 0 END), 0) AS successes, COALESCE(SUM(CASE WHEN success AND latency_ms IS NOT NULL THEN latency_ms ELSE 0 END), 0) AS latency_sum, COALESCE(SUM(CASE WHEN success AND latency_ms IS NOT NULL THEN 1 ELSE 0 END), 0) AS latencies, COALESCE(SUM(CASE WHEN is_stream THEN 1 ELSE 0 END), 0) AS stream, COALESCE(SUM(CASE WHEN is_stream AND success THEN 1 ELSE 0 END), 0) AS stream_succ, COALESCE(SUM(CASE WHEN is_stream AND success AND latency_ms IS NOT NULL THEN latency_ms ELSE 0 END), 0) AS stream_lat, COALESCE(SUM(CASE WHEN is_stream AND success AND latency_ms IS NOT NULL THEN 1 ELSE 0 END), 0) AS stream_ttfb").
		Where("created_at >= ? AND route_strategy IN ?", since, []string{"smart", "round_robin", "latency_first", "priority"}).
		Group("route_strategy").
		Rows()
	if err != nil {
		return nil
	}
	defer rows.Close()
	groups := map[string]*strategyAgg{}
	for rows.Next() {
		var strategy string
		var agg strategyAgg
		if err := rows.Scan(&strategy, &agg.requests, &agg.successes, &agg.latencySum, &agg.latencies, &agg.stream, &agg.streamSucc, &agg.streamLat, &agg.streamTTFB); err != nil {
			continue
		}
		groups[strings.TrimSpace(strategy)] = &agg
	}
	return strategyBreakdownResponse(groups)
}

func (a *App) GetGatewaySettings(w http.ResponseWriter, r *http.Request) {
	settings, err := a.effectiveSystemSettings()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, gatewaySettings(settings))
}

func (a *App) UpdateGatewaySettings(w http.ResponseWriter, r *http.Request) {
	var payload map[string]json.RawMessage
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	settings, err := a.effectiveSystemSettings()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if value, ok, err := gatewaySettingsString(payload, "route_strategy"); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	} else if ok {
		value = strings.ToLower(strings.TrimSpace(value))
		if !isGatewayRouteStrategy(value) {
			writeError(w, http.StatusBadRequest, "route_strategy 必须是 round_robin/latency_first/priority/smart")
			return
		}
		settings.GatewayRouteStrategy = value
	}
	if value, ok, err := gatewaySettingsString(payload, "concurrency_overflow_strategy"); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	} else if ok {
		value = strings.ToLower(strings.TrimSpace(value))
		if !isGatewayConcurrencyOverflowStrategy(value) {
			writeError(w, http.StatusBadRequest, "concurrency_overflow_strategy 必须是 latency_first/sequential")
			return
		}
		settings.GatewayConcurrencyOverflowStrategy = value
	}
	if value, ok, err := gatewaySettingsString(payload, "concurrency_transfer_strategy"); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	} else if ok {
		value = strings.ToLower(strings.TrimSpace(value))
		if !isGatewayConcurrencyTransferStrategy(value) {
			writeError(w, http.StatusBadRequest, "concurrency_transfer_strategy 必须是 limit_only/balance")
			return
		}
		settings.GatewayConcurrencyTransferStrategy = value
	}
	if value, ok, err := gatewaySettingsString(payload, "failure_retry_mode"); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	} else if ok {
		value = strings.ToLower(strings.TrimSpace(value))
		if !isGatewayFailureRetryMode(value) {
			writeError(w, http.StatusBadRequest, "failure_retry_mode 必须是 retryable/all")
			return
		}
		settings.GatewayFailureRetryMode = value
	}
	if value, ok, err := gatewaySettingsString(payload, "gateway_api_key"); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	} else if ok {
		settings.GatewayAPIKey = value
	}
	if value, ok, err := gatewaySettingsIntInRange(payload, "failure_threshold", 1, 20); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	} else if ok {
		settings.GatewayFailureThreshold = int(value)
	}
	if value, ok, err := gatewaySettingsIntInRange(payload, "cooldown_seconds", 10, 3600); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	} else if ok {
		settings.GatewayCooldownSeconds = int(value)
	}
	if value, ok, err := gatewaySettingsIntInRange(payload, "request_timeout", 5, 180); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	} else if ok {
		settings.GatewayRequestTimeout = int(value)
	}
	if value, ok, err := gatewaySettingsIntInRange(payload, "max_attempts", 0, 50); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	} else if ok {
		settings.GatewayMaxAttempts = int(value)
	}
	if value, ok, err := gatewaySettingsIntInRange(payload, "route_concurrency_limit", 0, 1000); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	} else if ok {
		settings.GatewayRouteConcurrencyLimit = int(value)
	}
	if value, ok, err := gatewaySettingsFloat(payload, "smart_latency_bias"); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	} else if ok {
		settings.GatewaySmartLatencyBias = clampBiasFromAPI(value)
	}
	if value, ok, err := gatewaySettingsFloat(payload, "smart_concurrency_bias"); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	} else if ok {
		settings.GatewaySmartConcurrencyBias = clampBiasFromAPI(value)
	}
	if value, ok, err := gatewaySettingsFloat(payload, "smart_failure_bias"); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	} else if ok {
		settings.GatewaySmartFailureBias = clampBiasFromAPI(value)
	}
	if value, ok, err := gatewaySettingsFloat(payload, "smart_priority_bias"); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	} else if ok {
		settings.GatewaySmartPriorityBias = clampBiasFromAPI(value)
	}
	if err := a.DB.Save(&settings).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, gatewaySettings(settings))
}

func gatewaySettingsString(payload map[string]json.RawMessage, key string) (string, bool, error) {
	raw, ok := payload[key]
	if !ok {
		return "", false, nil
	}
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return "", true, errors.New(key + " 类型必须是字符串")
	}
	return value, true, nil
}

func gatewaySettingsInt(payload map[string]json.RawMessage, key string) (int, bool, error) {
	raw, ok := payload[key]
	if !ok {
		return 0, false, nil
	}
	var value int
	if err := json.Unmarshal(raw, &value); err != nil {
		return 0, true, errors.New(key + " 类型必须是整数")
	}
	return value, true, nil
}

func gatewaySettingsIntInRange(payload map[string]json.RawMessage, key string, minValue int, maxValue int) (int, bool, error) {
	value, ok, err := gatewaySettingsInt(payload, key)
	if err != nil || !ok {
		return value, ok, err
	}
	if value < minValue || value > maxValue {
		return 0, true, fmt.Errorf("%s 必须在 %d 到 %d 之间", key, minValue, maxValue)
	}
	return value, true, nil
}

func gatewaySettingsFloat(payload map[string]json.RawMessage, key string) (float64, bool, error) {
	raw, ok := payload[key]
	if !ok {
		return 0, false, nil
	}
	var value float64
	if err := json.Unmarshal(raw, &value); err != nil {
		return 0, true, errors.New(key + " 类型必须是数字")
	}
	return value, true, nil
}

func isGatewayRouteStrategy(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "round_robin", "latency_first", "priority", "smart":
		return true
	default:
		return false
	}
}

func isGatewayFailureRetryMode(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "retryable", "all":
		return true
	default:
		return false
	}
}

func isGatewayConcurrencyTransferStrategy(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "limit_only", "balance":
		return true
	default:
		return false
	}
}

func isGatewayConcurrencyOverflowStrategy(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "latency_first", "sequential":
		return true
	default:
		return false
	}
}

func clampBiasFromAPI(value float64) float64 {
	if value < 0 {
		return 0
	}
	if value > 5 {
		return 5
	}
	return value
}

func gatewaySettings(settings models.SystemSetting) map[string]any {
	return map[string]any{
		"route_strategy":                gatewayRouteStrategyOrDefault(settings.GatewayRouteStrategy),
		"failure_threshold":             settings.GatewayFailureThreshold,
		"cooldown_seconds":              settings.GatewayCooldownSeconds,
		"request_timeout":               settings.GatewayRequestTimeout,
		"max_attempts":                  settings.GatewayMaxAttempts,
		"failure_retry_mode":            services.NormalizeGatewayFailureRetryMode(settings.GatewayFailureRetryMode),
		"route_concurrency_limit":       settings.GatewayRouteConcurrencyLimit,
		"concurrency_transfer_strategy": normalizeGatewayConcurrencyTransferStrategy(settings.GatewayConcurrencyTransferStrategy),
		"concurrency_overflow_strategy": gatewayConcurrencyOverflowStrategyOrDefault(settings.GatewayConcurrencyOverflowStrategy),
		"smart_latency_bias":            settings.GatewaySmartLatencyBias,
		"smart_concurrency_bias":        settings.GatewaySmartConcurrencyBias,
		"smart_failure_bias":            settings.GatewaySmartFailureBias,
		"smart_priority_bias":           settings.GatewaySmartPriorityBias,
		"gateway_api_key":               settings.GatewayAPIKey,
	}
}

func gatewayRouteStrategyOrDefault(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if isGatewayRouteStrategy(value) {
		return value
	}
	return "round_robin"
}

func gatewayConcurrencyOverflowStrategyOrDefault(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if isGatewayConcurrencyOverflowStrategy(value) {
		return value
	}
	return "latency_first"
}

func (a *App) SyncGatewayRoutes(w http.ResponseWriter, r *http.Request) {
	count, err := services.SyncGatewayRoutes(a.DB)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "route_count": count})
}

func (a *App) GatewayRouteGroups(w http.ResponseWriter, r *http.Request) {
	groups, err := services.ListGatewayRouteGroups(a.DB)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := make([]map[string]any, 0, len(groups))
	for _, item := range groups {
		out = append(out, gatewayRouteGroupResponse(item.Group, item.RouteCount))
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) CreateGatewayRouteGroup(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Name   string `json:"name"`
		APIKey string `json:"api_key"`
	}
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	group, err := services.CreateGatewayRouteGroup(a.DB, services.GatewayRouteGroupInput{Name: payload.Name, APIKey: payload.APIKey})
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, gatewayRouteGroupResponse(group, 0))
}

func (a *App) UpdateGatewayRouteGroup(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseUint(chi.URLParam(r, "groupID"), 10, 64)
	if err != nil || groupID == 0 {
		writeError(w, http.StatusBadRequest, "分组 ID 无效")
		return
	}
	var payload struct {
		Name        string  `json:"name"`
		APIKey      *string `json:"api_key"`
		ClearAPIKey bool    `json:"clear_api_key"`
	}
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	input := services.GatewayRouteGroupUpdateInput{Name: payload.Name}
	if payload.APIKey != nil {
		input.APIKey = strings.TrimSpace(*payload.APIKey)
		input.APIKeySet = true
	}
	if payload.ClearAPIKey {
		input.APIKey = ""
		input.APIKeySet = true
	}
	group, err := services.UpdateGatewayRouteGroup(a.DB, uint(groupID), input)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		writeError(w, status, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, gatewayRouteGroupResponse(group, gatewayRouteGroupMemberCount(a.DB, group.ID)))
}

func (a *App) DeleteGatewayRouteGroup(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseUint(chi.URLParam(r, "groupID"), 10, 64)
	if err != nil || groupID == 0 {
		writeError(w, http.StatusBadRequest, "分组 ID 无效")
		return
	}
	if err := services.DeleteGatewayRouteGroup(a.DB, uint(groupID)); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "message": "分组已删除。"})
}

func (a *App) UpdateGatewayRouteGroups(w http.ResponseWriter, r *http.Request) {
	routeID, err := strconv.ParseUint(chi.URLParam(r, "routeID"), 10, 64)
	if err != nil || routeID == 0 {
		writeError(w, http.StatusBadRequest, "路由 ID 无效")
		return
	}
	var payload struct {
		GroupIDs []uint `json:"group_ids"`
	}
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	if _, err := services.ReplaceGatewayRouteGroupMemberships(a.DB, uint(routeID), payload.GroupIDs); err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		writeError(w, status, err.Error())
		return
	}
	route, err := services.GetGatewayRoute(a.DB, strconv.FormatUint(routeID, 10))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, gatewayRouteResponse(route))
}

func (a *App) DeleteGatewayRoute(w http.ResponseWriter, r *http.Request) {
	routeID, err := strconv.ParseUint(chi.URLParam(r, "routeID"), 10, 64)
	if err != nil || routeID == 0 {
		writeError(w, http.StatusBadRequest, "路由 ID 无效")
		return
	}
	result, err := services.DeleteGatewayRoute(a.DB, uint(routeID))
	if err != nil {
		status := http.StatusInternalServerError
		message := "删除路由失败"
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
			message = "网关路由不存在"
		} else if strings.TrimSpace(err.Error()) != "" {
			message = err.Error()
		}
		writeError(w, status, message)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status":           "ok",
		"message":          deleteGatewayRouteMessage(result.RemovedAPIKey),
		"deleted_route_id": result.RouteID,
		"site_id":          result.SiteID,
		"removed_api_key":  result.RemovedAPIKey,
	})
}

func deleteGatewayRouteMessage(removedAPIKey bool) string {
	if removedAPIKey {
		return "路由已删除，对应站点 API Key 已移除。"
	}
	return "路由已删除，对应站点 API Key 已保留。"
}

func gatewayRouteGroupResponse(group models.GatewayRouteGroup, routeCount int) map[string]any {
	return map[string]any{
		"id":          group.ID,
		"name":        group.Name,
		"has_api_key": strings.TrimSpace(group.APIKey) != "",
		"route_count": routeCount,
		"created_at":  group.CreatedAt,
		"updated_at":  group.UpdatedAt,
	}
}

func gatewayRouteGroupMemberCount(db *gorm.DB, groupID uint) int {
	var count int64
	_ = db.Model(&models.GatewayRouteGroupMember{}).Where("group_id = ?", groupID).Count(&count).Error
	return int(count)
}

func (a *App) GatewayRoutes(w http.ResponseWriter, r *http.Request) {
	includeDisabled := strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("include_disabled")), "true")
	routes, err := services.ListGatewayRoutes(a.DB, r.URL.Query().Get("group"), includeDisabled)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := make([]map[string]any, 0, len(routes))
	for _, route := range routes {
		out = append(out, gatewayRouteResponse(route))
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) GatewayActiveRequests(w http.ResponseWriter, r *http.Request) {
	includeRecent := strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("include_recent")), "true")
	items := services.ListGatewayActiveRequestsWithRecent(includeRecent)
	out, err := a.gatewayActiveRequestResponse(items)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) ReorderGatewayRoutePriorities(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		RouteID uint   `json:"route_id"`
		Mode    string `json:"mode"`
		Index   *int   `json:"index"`
	}
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	mode := services.GatewayRoutePriorityMode(strings.TrimSpace(payload.Mode))
	opts := services.GatewayRoutePriorityReorderOptions{RouteID: payload.RouteID, Mode: mode}
	if payload.Index != nil {
		opts.Index = *payload.Index
	}
	if mode == services.GatewayRoutePriorityMove && payload.Index == nil {
		writeError(w, http.StatusBadRequest, "移动优先级需要提供目标优先级")
		return
	}
	routes, err := services.ReorderGatewayRoutePriorities(a.DB, opts)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	out := make([]map[string]any, 0, len(routes))
	for _, route := range routes {
		out = append(out, gatewayRouteResponse(route))
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) GatewayLogs(w http.ResponseWriter, r *http.Request) {
	limit := 80
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= 500 {
			limit = parsed
		}
	}
	var logs []models.GatewayRequestLog
	query := applyGatewayLogStatusFilter(a.DB.Preload("Site"), gatewayLogStatusFilter(r.URL.Query().Get("status")))
	if err := query.Order("created_at desc").Limit(limit).Find(&logs).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out, err := a.gatewayLogResponse(logs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) GatewayRouteLogs(w http.ResponseWriter, r *http.Request) {
	routeID, err := strconv.ParseUint(chi.URLParam(r, "routeID"), 10, 64)
	if err != nil || routeID == 0 {
		writeError(w, http.StatusBadRequest, "路由 ID 无效")
		return
	}
	limit := 80
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= 500 {
			limit = parsed
		}
	}
	var logs []models.GatewayRequestLog
	query := applyGatewayLogStatusFilter(a.DB.Preload("Site").Where("route_state_id = ?", uint(routeID)), gatewayLogStatusFilter(r.URL.Query().Get("status")))
	if err := query.Order("created_at desc").Limit(limit).Find(&logs).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out, err := a.gatewayLogResponse(logs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func gatewayLogStatusFilter(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "error", "failed", "failure", "fail":
		return "error"
	case "success", "ok", "successful":
		return "success"
	default:
		return ""
	}
}

func applyGatewayLogStatusFilter(query *gorm.DB, status string) *gorm.DB {
	switch status {
	case "error":
		return query.Where("success = ?", false)
	case "success":
		return query.Where("success = ?", true)
	default:
		return query
	}
}

func (a *App) gatewayActiveRequestResponse(items []services.GatewayActiveRequest) ([]map[string]any, error) {
	logs, err := a.gatewayActiveRelatedLogs(items)
	if err != nil {
		return nil, err
	}
	routeByID, routeBySiteKey, err := a.gatewayLogRouteLookup(logs)
	if err != nil {
		return nil, err
	}
	sequences := gatewayLogAttemptSequences(logs)
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		chain := gatewayActiveAttemptChain(item, sequences[item.RequestID], routeByID, routeBySiteKey)
		out = append(out, map[string]any{
			"id":                    item.ID,
			"request_id":            item.RequestID,
			"route_id":              item.RouteID,
			"site_id":               item.SiteID,
			"route_label":           item.RouteLabel,
			"site_name":             item.SiteName,
			"key_name":              item.KeyName,
			"key_fingerprint":       item.KeyFingerprint,
			"group_name":            item.GroupName,
			"target_path":           item.TargetPath,
			"request_url":           services.RedactGatewayURL(item.RequestURL),
			"method":                item.Method,
			"route_strategy":        item.RouteStrategy,
			"attempt_index":         item.AttemptIndex,
			"is_stream":             item.IsStream,
			"route_type":            item.RouteType,
			"requested_model":       item.RequestedModel,
			"actual_model":          item.ActualModel,
			"request_base_url":      item.RequestBaseURL,
			"active_concurrency":    item.ActiveConcurrency,
			"started_at":            item.StartedAt,
			"elapsed_ms":            item.ElapsedMS,
			"finished_at":           item.FinishedAt,
			"recent":                item.Recent,
			"success":               item.Success,
			"status_code":           item.StatusCode,
			"failure_kind":          item.FailureKind,
			"failure_reason":        item.FailureReason,
			"related_attempt_count": chain.RelatedAttemptCount,
			"transfer_to":           chain.TransferTo,
			"final_attempt":         chain.FinalAttempt,
			"previous_error":        chain.PreviousError,
		})
	}
	return out, nil
}

func (a *App) gatewayActiveRelatedLogs(items []services.GatewayActiveRequest) ([]models.GatewayRequestLog, error) {
	requestIDSet := map[string]bool{}
	for _, item := range items {
		if requestID := strings.TrimSpace(item.RequestID); requestID != "" {
			requestIDSet[requestID] = true
		}
	}
	if len(requestIDSet) == 0 || a.DB == nil {
		return nil, nil
	}
	requestIDs := make([]string, 0, len(requestIDSet))
	for requestID := range requestIDSet {
		requestIDs = append(requestIDs, requestID)
	}
	sort.Strings(requestIDs)
	var logs []models.GatewayRequestLog
	if err := a.DB.Preload("Site").
		Where("request_id IN ?", requestIDs).
		Order("request_id asc, attempt_index asc, created_at asc, id asc").
		Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

func gatewayActiveAttemptChain(
	item services.GatewayActiveRequest,
	sequences [][]models.GatewayRequestLog,
	routeByID map[uint]models.GatewayRouteState,
	routeBySiteKey map[string]models.GatewayRouteState,
) gatewayLogAttemptChain {
	if strings.TrimSpace(item.RequestID) == "" {
		return gatewayLogAttemptChain{}
	}
	itemAttempt := normalizedAttemptIndex(item.AttemptIndex)
	for _, sequence := range sequences {
		if !gatewayActiveSequenceContains(sequence, item, itemAttempt) {
			continue
		}
		virtualSequence := gatewayActiveSequenceWithItem(sequence, item)
		chains := map[uint]gatewayLogAttemptChain{}
		addGatewayLogAttemptSequence(chains, virtualSequence, routeByID, routeBySiteKey)
		chain := chains[0]
		if item.FinishedAt == nil {
			chain.FinalAttempt = nil
		}
		return chain
	}
	if item.FinishedAt == nil && itemAttempt > 1 {
		return gatewayLogAttemptChain{
			RelatedAttemptCount: itemAttempt,
			PreviousError:       gatewayActivePreviousErrorFromSequences(item, sequences, routeByID, routeBySiteKey),
		}
	}
	return gatewayLogAttemptChain{}
}

func gatewayActiveSequenceContains(sequence []models.GatewayRequestLog, item services.GatewayActiveRequest, itemAttempt int) bool {
	if len(sequence) == 0 {
		return false
	}
	if item.FinishedAt == nil {
		last := sequence[len(sequence)-1]
		delta := item.StartedAt.Sub(last.CreatedAt)
		return normalizedAttemptIndex(last.AttemptIndex) < itemAttempt && delta >= -time.Second && delta < 5*time.Minute
	}
	for _, log := range sequence {
		if gatewayLogMatchesActiveRequest(log, item, itemAttempt) {
			return true
		}
	}
	return false
}

func gatewayActiveSequenceWithItem(sequence []models.GatewayRequestLog, item services.GatewayActiveRequest) []models.GatewayRequestLog {
	out := append([]models.GatewayRequestLog{}, sequence...)
	if item.FinishedAt == nil {
		out = append(out, gatewayLogFromActiveRequest(item))
		return out
	}
	for idx, log := range out {
		if gatewayLogMatchesActiveRequest(log, item, normalizedAttemptIndex(item.AttemptIndex)) {
			merged := mergeGatewayLogWithActiveRequest(log, item)
			merged.ID = 0
			out[idx] = merged
			return out
		}
	}
	out = append(out, gatewayLogFromActiveRequest(item))
	return out
}

func gatewayActivePreviousErrorFromSequences(
	item services.GatewayActiveRequest,
	sequences [][]models.GatewayRequestLog,
	routeByID map[uint]models.GatewayRouteState,
	routeBySiteKey map[string]models.GatewayRouteState,
) map[string]any {
	itemAttempt := normalizedAttemptIndex(item.AttemptIndex)
	var previous *models.GatewayRequestLog
	for _, sequence := range sequences {
		for idx := range sequence {
			log := sequence[idx]
			delta := item.StartedAt.Sub(log.CreatedAt)
			if normalizedAttemptIndex(log.AttemptIndex) >= itemAttempt || delta < -time.Second || delta >= 5*time.Minute {
				continue
			}
			if !log.Success {
				candidate := log
				previous = &candidate
			}
		}
	}
	if previous == nil {
		return nil
	}
	return gatewayLogAttemptSummary(*previous, routeByID, routeBySiteKey)
}

func gatewayLogMatchesActiveRequest(log models.GatewayRequestLog, item services.GatewayActiveRequest, itemAttempt int) bool {
	if normalizedAttemptIndex(log.AttemptIndex) != itemAttempt {
		return false
	}
	if log.RouteStateID != nil && *log.RouteStateID != item.RouteID {
		return false
	}
	if log.RouteStateID == nil && item.RouteID != 0 {
		return false
	}
	if item.FinishedAt != nil {
		delta := log.CreatedAt.Sub(*item.FinishedAt)
		return delta > -2*time.Second && delta < 2*time.Second
	}
	delta := log.CreatedAt.Sub(item.StartedAt)
	return delta > -2*time.Second && delta < 2*time.Second
}

func gatewayLogFromActiveRequest(item services.GatewayActiveRequest) models.GatewayRequestLog {
	siteID := item.SiteID
	routeID := item.RouteID
	log := models.GatewayRequestLog{
		RequestID:      item.RequestID,
		RouteStateID:   &routeID,
		SiteID:         &siteID,
		KeyFingerprint: item.KeyFingerprint,
		KeyName:        item.KeyName,
		GroupName:      item.GroupName,
		Model:          item.RequestedModel,
		RequestedModel: item.RequestedModel,
		ActualModel:    firstNonEmpty(item.ActualModel, item.RequestedModel),
		RouteType:      item.RouteType,
		TargetPath:     item.TargetPath,
		RequestURL:     item.RequestURL,
		Method:         item.Method,
		RouteStrategy:  item.RouteStrategy,
		AttemptIndex:   normalizedAttemptIndex(item.AttemptIndex),
		StatusCode:     item.StatusCode,
		Success:        item.Success != nil && *item.Success,
		FailureReason:  item.FailureReason,
		IsStream:       item.IsStream,
		CreatedAt:      item.StartedAt,
		Site:           &models.Site{ID: item.SiteID, Name: item.SiteName},
	}
	if item.FinishedAt != nil {
		log.CreatedAt = *item.FinishedAt
	}
	return log
}

func mergeGatewayLogWithActiveRequest(log models.GatewayRequestLog, item services.GatewayActiveRequest) models.GatewayRequestLog {
	if item.Success != nil {
		log.Success = *item.Success
	}
	if item.StatusCode != nil {
		log.StatusCode = item.StatusCode
	}
	if item.FailureReason != nil && strings.TrimSpace(*item.FailureReason) != "" {
		log.FailureReason = item.FailureReason
	}
	if strings.TrimSpace(item.ActualModel) != "" {
		log.ActualModel = item.ActualModel
	}
	return log
}

func (a *App) gatewayLogResponse(logs []models.GatewayRequestLog) ([]map[string]any, error) {
	attemptLogs, err := a.gatewayRelatedRequestLogs(logs)
	if err != nil {
		return nil, err
	}
	routeByID, routeBySiteKey, err := a.gatewayLogRouteLookup(attemptLogs)
	if err != nil {
		return nil, err
	}
	attempts := gatewayLogAttemptIndex(attemptLogs, routeByID, routeBySiteKey)
	out := make([]map[string]any, 0, len(logs))
	for _, item := range logs {
		routeState, routeMatched, routeID, siteName := gatewayLogRouteInfo(item, routeByID, routeBySiteKey)
		chain := attempts[item.ID]
		out = append(out, map[string]any{
			"id":                    item.ID,
			"request_id":            item.RequestID,
			"route_id":              routeID,
			"route_label":           gatewayLogRouteLabel(item, routeState, routeMatched, siteName),
			"site_id":               item.SiteID,
			"site_name":             siteName,
			"key_name":              item.KeyName,
			"key_fingerprint":       item.KeyFingerprint,
			"group_name":            item.GroupName,
			"route_type":            gatewayLogRouteType(item, routeState, routeMatched),
			"target_path":           item.TargetPath,
			"request_url":           services.RedactGatewayURL(item.RequestURL),
			"user_agent":            item.UserAgent,
			"method":                item.Method,
			"route_strategy":        item.RouteStrategy,
			"attempt_index":         item.AttemptIndex,
			"status_code":           item.StatusCode,
			"success":               item.Success,
			"latency_ms":            item.LatencyMS,
			"prompt_tokens":         item.PromptTokens,
			"cached_input_tokens":   item.CachedInputTokens,
			"cache_read_tokens":     item.CacheReadTokens,
			"cache_write_tokens":    item.CacheWriteTokens,
			"completion_tokens":     item.CompletionTokens,
			"total_tokens":          item.TotalTokens,
			"usage_cost":            item.UsageCost,
			"model":                 item.Model,
			"requested_model":       firstNonEmpty(item.RequestedModel, item.Model),
			"actual_model":          firstNonEmpty(item.ActualModel, item.RequestedModel, item.Model),
			"circuit_state_before":  item.CircuitStateBefore,
			"failure_reason":        redactedStringPtr(item.FailureReason),
			"is_stream":             item.IsStream,
			"created_at":            item.CreatedAt,
			"related_attempt_count": chain.RelatedAttemptCount,
			"transfer_to":           chain.TransferTo,
			"final_attempt":         chain.FinalAttempt,
			"previous_error":        chain.PreviousError,
		})
	}
	return out, nil
}

func (a *App) gatewayRelatedRequestLogs(logs []models.GatewayRequestLog) ([]models.GatewayRequestLog, error) {
	requestIDSet := map[string]bool{}
	for _, item := range logs {
		if requestID := strings.TrimSpace(item.RequestID); requestID != "" {
			requestIDSet[requestID] = true
		}
	}
	if len(requestIDSet) == 0 || a.DB == nil {
		return logs, nil
	}
	requestIDs := make([]string, 0, len(requestIDSet))
	for requestID := range requestIDSet {
		requestIDs = append(requestIDs, requestID)
	}
	sort.Strings(requestIDs)
	var related []models.GatewayRequestLog
	if err := a.DB.Preload("Site").
		Where("request_id IN ?", requestIDs).
		Order("request_id asc, attempt_index asc, created_at asc, id asc").
		Find(&related).Error; err != nil {
		return nil, err
	}
	return related, nil
}

type gatewayLogAttemptChain struct {
	RelatedAttemptCount int
	TransferTo          map[string]any
	FinalAttempt        map[string]any
	PreviousError       map[string]any
}

func gatewayLogAttemptIndex(
	logs []models.GatewayRequestLog,
	routeByID map[uint]models.GatewayRouteState,
	routeBySiteKey map[string]models.GatewayRouteState,
) map[uint]gatewayLogAttemptChain {
	out := map[uint]gatewayLogAttemptChain{}
	for _, sequences := range gatewayLogAttemptSequences(logs) {
		for _, sequence := range sequences {
			addGatewayLogAttemptSequence(out, sequence, routeByID, routeBySiteKey)
		}
	}
	return out
}

func gatewayLogAttemptSequences(logs []models.GatewayRequestLog) map[string][][]models.GatewayRequestLog {
	grouped := map[string][]models.GatewayRequestLog{}
	for _, item := range logs {
		requestID := strings.TrimSpace(item.RequestID)
		if requestID == "" {
			continue
		}
		grouped[requestID] = append(grouped[requestID], item)
	}
	out := map[string][][]models.GatewayRequestLog{}
	for requestID, items := range grouped {
		sort.SliceStable(items, func(i, j int) bool {
			leftAttempt := normalizedAttemptIndex(items[i].AttemptIndex)
			rightAttempt := normalizedAttemptIndex(items[j].AttemptIndex)
			if leftAttempt != rightAttempt {
				return leftAttempt < rightAttempt
			}
			if !items[i].CreatedAt.Equal(items[j].CreatedAt) {
				return items[i].CreatedAt.Before(items[j].CreatedAt)
			}
			return items[i].ID < items[j].ID
		})
		out[requestID] = splitGatewayLogAttemptSequences(items)
	}
	return out
}

func splitGatewayLogAttemptSequences(items []models.GatewayRequestLog) [][]models.GatewayRequestLog {
	sequences := make([][]models.GatewayRequestLog, 0, 1)
	current := make([]models.GatewayRequestLog, 0, len(items))
	lastAttempt := 0
	for _, item := range items {
		attempt := normalizedAttemptIndex(item.AttemptIndex)
		if len(current) > 0 && attempt <= lastAttempt {
			sequences = append(sequences, current)
			current = make([]models.GatewayRequestLog, 0, len(items))
		}
		current = append(current, item)
		lastAttempt = attempt
	}
	if len(current) > 0 {
		sequences = append(sequences, current)
	}
	return sequences
}

func addGatewayLogAttemptSequence(
	out map[uint]gatewayLogAttemptChain,
	items []models.GatewayRequestLog,
	routeByID map[uint]models.GatewayRouteState,
	routeBySiteKey map[string]models.GatewayRouteState,
) {
	var previousError map[string]any
	for idx, item := range items {
		chain := gatewayLogAttemptChain{RelatedAttemptCount: len(items)}
		if !item.Success && idx+1 < len(items) {
			chain.TransferTo = gatewayLogAttemptSummary(items[idx+1], routeByID, routeBySiteKey)
		}
		if len(items) > 1 {
			chain.FinalAttempt = gatewayLogAttemptSummary(items[len(items)-1], routeByID, routeBySiteKey)
		}
		chain.PreviousError = previousError
		out[item.ID] = chain
		if !item.Success {
			previousError = gatewayLogAttemptSummary(item, routeByID, routeBySiteKey)
		}
	}
}

func gatewayLogAttemptSummary(
	item models.GatewayRequestLog,
	routeByID map[uint]models.GatewayRouteState,
	routeBySiteKey map[string]models.GatewayRouteState,
) map[string]any {
	routeState, routeMatched, routeID, siteName := gatewayLogRouteInfo(item, routeByID, routeBySiteKey)
	return map[string]any{
		"id":              item.ID,
		"request_id":      item.RequestID,
		"route_id":        routeID,
		"route_label":     gatewayLogRouteLabel(item, routeState, routeMatched, siteName),
		"site_id":         item.SiteID,
		"site_name":       siteName,
		"key_name":        item.KeyName,
		"key_fingerprint": item.KeyFingerprint,
		"route_type":      gatewayLogRouteType(item, routeState, routeMatched),
		"target_path":     item.TargetPath,
		"request_url":     services.RedactGatewayURL(item.RequestURL),
		"method":          item.Method,
		"attempt_index":   normalizedAttemptIndex(item.AttemptIndex),
		"status_code":     item.StatusCode,
		"success":         item.Success,
		"failure_reason":  redactedStringPtr(item.FailureReason),
		"created_at":      item.CreatedAt,
	}
}

func redactedStringPtr(value *string) *string {
	if value == nil {
		return nil
	}
	redacted := services.RedactGatewayText(*value)
	return &redacted
}

func gatewayLogRouteInfo(
	item models.GatewayRequestLog,
	routeByID map[uint]models.GatewayRouteState,
	routeBySiteKey map[string]models.GatewayRouteState,
) (models.GatewayRouteState, bool, *uint, *string) {
	var siteName *string
	if item.Site != nil {
		name := item.Site.Name
		siteName = &name
	}
	routeState, routeMatched := models.GatewayRouteState{}, false
	if item.RouteStateID != nil {
		routeState, routeMatched = routeByID[*item.RouteStateID]
	}
	if !routeMatched && item.SiteID != nil {
		routeState, routeMatched = routeBySiteKey[gatewayLogRouteKey(*item.SiteID, item.KeyFingerprint)]
	}
	routeID := item.RouteStateID
	if routeMatched {
		id := routeState.ID
		routeID = &id
		if siteName == nil {
			label := services.GatewayRouteSiteLabel(services.GatewayRoute{State: routeState, Site: routeState.Site})
			siteName = &label
		}
	}
	return routeState, routeMatched, routeID, siteName
}

func normalizedAttemptIndex(value int) int {
	if value <= 0 {
		return 1
	}
	return value
}

func (a *App) gatewayLogRouteLookup(logs []models.GatewayRequestLog) (map[uint]models.GatewayRouteState, map[string]models.GatewayRouteState, error) {
	routeIDSet := map[uint]bool{}
	siteIDSet := map[uint]bool{}
	for _, item := range logs {
		if item.RouteStateID != nil && *item.RouteStateID > 0 {
			routeIDSet[*item.RouteStateID] = true
		}
		if item.SiteID != nil && *item.SiteID > 0 {
			siteIDSet[*item.SiteID] = true
		}
	}
	return a.gatewayLogRouteLookupForIDs(routeIDSet, siteIDSet)
}

func (a *App) gatewayLogRouteLookupForIDs(routeIDSet, siteIDSet map[uint]bool) (map[uint]models.GatewayRouteState, map[string]models.GatewayRouteState, error) {
	routeIDs := make([]uint, 0, len(routeIDSet))
	for id := range routeIDSet {
		routeIDs = append(routeIDs, id)
	}
	siteIDs := make([]uint, 0, len(siteIDSet))
	for id := range siteIDSet {
		siteIDs = append(siteIDs, id)
	}
	if len(routeIDs) == 0 && len(siteIDs) == 0 {
		return map[uint]models.GatewayRouteState{}, map[string]models.GatewayRouteState{}, nil
	}
	if a.DB == nil {
		return nil, nil, errors.New("数据库连接不可用")
	}

	states := make([]models.GatewayRouteState, 0)
	if len(routeIDs) > 0 {
		var byID []models.GatewayRouteState
		if err := a.DB.Preload("Site").Where("id IN ?", routeIDs).Find(&byID).Error; err != nil {
			return nil, nil, err
		}
		states = append(states, byID...)
	}
	if len(siteIDs) > 0 {
		var bySite []models.GatewayRouteState
		if err := a.DB.Preload("Site").Where("site_id IN ?", siteIDs).Find(&bySite).Error; err != nil {
			return nil, nil, err
		}
		states = append(states, bySite...)
	}

	routeByID := map[uint]models.GatewayRouteState{}
	routeBySiteKey := map[string]models.GatewayRouteState{}
	for _, state := range states {
		routeByID[state.ID] = state
		routeBySiteKey[gatewayLogRouteKey(state.SiteID, state.KeyFingerprint)] = state
	}
	return routeByID, routeBySiteKey, nil
}

func (a *App) gatewaySiteLookupForIDs(siteIDSet map[uint]bool) (map[uint]models.Site, error) {
	siteIDs := make([]uint, 0, len(siteIDSet))
	for id := range siteIDSet {
		siteIDs = append(siteIDs, id)
	}
	if len(siteIDs) == 0 {
		return map[uint]models.Site{}, nil
	}
	if a.DB == nil {
		return nil, errors.New("数据库连接不可用")
	}
	var sites []models.Site
	if err := a.DB.Where("id IN ?", siteIDs).Find(&sites).Error; err != nil {
		return nil, err
	}
	siteByID := map[uint]models.Site{}
	for _, site := range sites {
		siteByID[site.ID] = site
	}
	return siteByID, nil
}

func gatewayLogRouteKey(siteID uint, fingerprint string) string {
	return strconv.FormatUint(uint64(siteID), 10) + ":" + strings.TrimSpace(fingerprint)
}

func gatewayLogRouteLabel(log models.GatewayRequestLog, state models.GatewayRouteState, matched bool, siteName *string) string {
	parts := []string{}
	if matched && state.ID > 0 {
		parts = append(parts, "#"+strconv.FormatUint(uint64(state.ID), 10))
	} else if log.RouteStateID != nil && *log.RouteStateID > 0 {
		parts = append(parts, "#"+strconv.FormatUint(uint64(*log.RouteStateID), 10))
	}
	if siteName != nil && strings.TrimSpace(*siteName) != "" {
		parts = append(parts, strings.TrimSpace(*siteName))
	}
	keyName := strings.TrimSpace(log.KeyName)
	if keyName == "" && matched {
		keyName = strings.TrimSpace(state.KeyName)
	}
	if keyName != "" {
		parts = append(parts, keyName)
	}
	if len(parts) == 0 && log.SiteID != nil {
		parts = append(parts, "站点 #"+strconv.FormatUint(uint64(*log.SiteID), 10))
	}
	if len(parts) == 0 {
		parts = append(parts, "未知路由")
	}
	return strings.Join(parts, " · ")
}
func (a *App) ToggleGatewayRoute(w http.ResponseWriter, r *http.Request) {
	var state models.GatewayRouteState
	if err := a.DB.First(&state, chi.URLParam(r, "routeID")).Error; err != nil {
		writeError(w, http.StatusNotFound, "网关路由不存在")
		return
	}
	state, err := services.SetGatewayRouteManualEnabled(a.DB, state.ID, !state.IsEnabled)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "保存路由状态失败")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": state.ID, "is_enabled": state.IsEnabled, "is_enabled_manual": state.IsEnabledManual, "circuit_state": state.CircuitState})
}

func (a *App) DisableAllGatewayRoutes(w http.ResponseWriter, r *http.Request) {
	if _, err := services.SyncGatewayRoutes(a.DB); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var routes []models.GatewayRouteState
	if err := a.DB.Select("id").Where("is_enabled = ?", true).Find(&routes).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "禁用全部路由失败")
		return
	}
	routeIDs := make([]uint, 0, len(routes))
	for _, route := range routes {
		routeIDs = append(routeIDs, route.ID)
	}
	if err := services.SetGatewayRoutesManualDisabled(a.DB, routeIDs, true); err != nil {
		writeError(w, http.StatusInternalServerError, "禁用全部路由失败")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "disabled_count": len(routeIDs)})
}

func (a *App) EnableOnlyGatewayRoute(w http.ResponseWriter, r *http.Request) {
	var state models.GatewayRouteState
	if err := a.DB.First(&state, chi.URLParam(r, "routeID")).Error; err != nil {
		writeError(w, http.StatusNotFound, "网关路由不存在")
		return
	}
	var routes []models.GatewayRouteState
	if err := a.DB.Select("id").Find(&routes).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "设置唯一启用路由失败")
		return
	}
	disableIDs := make([]uint, 0, len(routes))
	for _, route := range routes {
		if route.ID != state.ID {
			disableIDs = append(disableIDs, route.ID)
		}
	}
	if err := services.SetGatewayRoutesManualDisabled(a.DB, disableIDs, true); err != nil {
		writeError(w, http.StatusInternalServerError, "设置唯一启用路由失败")
		return
	}
	if _, err := services.SetGatewayRouteManualEnabled(a.DB, state.ID, true); err != nil {
		writeError(w, http.StatusInternalServerError, "设置唯一启用路由失败")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "enabled_route_id": state.ID})
}
func (a *App) ResetGatewayCircuit(w http.ResponseWriter, r *http.Request) {
	var state models.GatewayRouteState
	if err := a.DB.First(&state, chi.URLParam(r, "routeID")).Error; err != nil {
		writeError(w, http.StatusNotFound, "网关路由不存在")
		return
	}
	state.CircuitState = "closed"
	state.ConsecutiveFailures = 0
	state.CircuitOpenedAt = nil
	state.CircuitOpenUntil = nil
	if err := a.DB.Save(&state).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "保存路由状态失败")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": state.ID, "is_enabled": state.IsEnabled, "circuit_state": state.CircuitState})
}
func (a *App) UpdateGatewayRouteType(w http.ResponseWriter, r *http.Request) {
	var payload schemas.GatewayRouteStateUpdateRequest
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	routeType := normalizeGatewayRouteType(payload.RouteType)
	if routeType == "" {
		writeError(w, http.StatusBadRequest, "route_type 必须是 general/claude/gpt/codex/gemini")
		return
	}
	routePath := ""
	if payload.RoutePath != nil {
		routePath = services.NormalizeGatewayRoutePath(*payload.RoutePath)
		if strings.TrimSpace(*payload.RoutePath) != "" && routePath == "" {
			writeError(w, http.StatusBadRequest, "route_path 必须是空、chat/completions 或 responses")
			return
		}
	}
	var state models.GatewayRouteState
	if err := a.DB.Preload("Site").First(&state, chi.URLParam(r, "routeID")).Error; err != nil {
		writeError(w, http.StatusNotFound, "网关路由不存在")
		return
	}
	state.RouteType = routeType
	state.RouteTypeManual = true
	if payload.RoutePath != nil {
		state.RoutePath = routePath
		state.RoutePathManual = true
	}
	if payload.SupportedModels != nil {
		state.SupportedModels = services.EncodeGatewaySupportedModels(*payload.SupportedModels)
	}
	if payload.ManualRequestBaseURLs != nil {
		state.ManualRequestBaseURLs = services.EncodeGatewayRequestBaseURLs(*payload.ManualRequestBaseURLs)
		state.LastRequestBaseURL = ""
		if changed, keyFingerprint := services.SetSiteAPIKeyRequestBaseURLs(&state.Site, state.KeyFingerprint, *payload.ManualRequestBaseURLs); changed && keyFingerprint != "" {
			state.KeyFingerprint = keyFingerprint
		}
		requestBaseURLs := services.GatewayRouteManualRequestBaseURLs(state, state.Site)
		if len(requestBaseURLs) == 0 {
			requestBaseURLs = services.GatewayRequestBaseCandidates(state.Site)
		}
		state.SiteAPIURLSnapshot = services.EncodeGatewayRequestBaseURLs(requestBaseURLs)
	}
	if err := a.DB.Save(&state).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if payload.ManualRequestBaseURLs != nil {
		if err := a.DB.Save(&state.Site).Error; err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if err := refreshGatewayRouteSnapshotsForSite(a.DB, state.Site); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if err := a.DB.Preload("Site").First(&state, state.ID).Error; err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	writeJSON(w, http.StatusOK, gatewayRouteResponse(services.GatewayRoute{
		State:          state,
		Site:           state.Site,
		APIKey:         services.GatewayRouteAPIKeyForState(state),
		RequestBaseURL: services.GatewayRouteRequestBase(state, state.Site),
	}))
}

func (a *App) DiagnoseGatewayRoute(w http.ResponseWriter, r *http.Request) {
	routeID, err := strconv.ParseUint(chi.URLParam(r, "routeID"), 10, 64)
	if err != nil || routeID == 0 {
		writeError(w, http.StatusBadRequest, "路由 ID 无效")
		return
	}
	var state models.GatewayRouteState
	if err := a.DB.Preload("Site").First(&state, uint(routeID)).Error; err != nil {
		writeError(w, http.StatusNotFound, "网关路由不存在")
		return
	}
	route := services.GatewayRoute{
		State:          state,
		Site:           state.Site,
		APIKey:         services.GatewayRouteAPIKeyForState(state),
		RequestBaseURL: services.GatewayRouteRequestBase(state, state.Site),
	}
	settings, err := a.effectiveSystemSettings()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	items := gatewayRouteDiagnosisItems(route, settings)
	healthy := true
	for _, item := range items {
		if severity, ok := item["severity"].(string); ok && severity == "error" {
			healthy = false
			break
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":           state.ID,
		"healthy":      healthy,
		"route_label":  services.GatewayRouteSiteLabel(route),
		"route":        gatewayRouteResponse(route),
		"diagnostics":  items,
		"checked_at":   time.Now().UTC(),
		"active_count": services.RouteActiveCount(state.ID),
	})
}

func gatewayRouteDiagnosisItems(route services.GatewayRoute, settings models.SystemSetting) []map[string]any {
	state := route.State
	activeCount := services.RouteActiveCount(state.ID)
	limit := settings.GatewayRouteConcurrencyLimit
	items := []map[string]any{
		gatewayRouteDiagnosisItem("站点状态", route.Site.IsEnabled, boolLabel(route.Site.IsEnabled, "站点已启用", "站点已停用"), "站点停用后不会参与网关调度。"),
		gatewayRouteDiagnosisItem("路由状态", state.IsEnabled, boolLabel(state.IsEnabled, "路由已启用", "路由已停用"), "路由停用后不会参与网关调度。"),
		gatewayRouteDiagnosisItem("API Key", strings.TrimSpace(route.APIKey) != "", boolLabel(strings.TrimSpace(route.APIKey) != "", "已匹配可用 Key", "未匹配到可用 Key"), "未匹配到 Key 时请先更新站点 API Key，再同步路由池。"),
		gatewayRouteDiagnosisItem("请求入口", strings.TrimSpace(route.RequestBaseURL) != "", firstNonEmpty(route.RequestBaseURL, "未配置请求入口"), "请求入口来自站点基础 URL 或请求 API URL 配置。"),
		gatewayRouteDiagnosisItem("熔断状态", state.CircuitState == "" || state.CircuitState == "closed", firstNonEmpty(state.CircuitState, "closed"), "open/half_open 状态会影响路由被选择。"),
	}
	concurrencyOK := limit <= 0 || activeCount < limit
	concurrencyMessage := strconv.Itoa(activeCount)
	if limit > 0 {
		concurrencyMessage = strconv.Itoa(activeCount) + "/" + strconv.Itoa(limit)
	}
	items = append(items, gatewayRouteDiagnosisItem("当前并发", concurrencyOK, concurrencyMessage, "达到并发上限时该路由会被降权或进入溢出策略。"))
	if state.LastError != nil && strings.TrimSpace(*state.LastError) != "" {
		items = append(items, map[string]any{
			"label":    "最近异常",
			"ok":       false,
			"severity": "warning",
			"message":  strings.TrimSpace(*state.LastError),
			"detail":   "最近异常不一定代表当前不可用，可点击探测确认。",
		})
	}
	if route.Site.ID == 0 {
		items = append(items, map[string]any{
			"label":    "站点记录",
			"ok":       false,
			"severity": "error",
			"message":  "站点记录缺失",
			"detail":   "请同步路由池清理孤立路由。",
		})
	}
	return items
}

func gatewayRouteDiagnosisItem(label string, ok bool, message, detail string) map[string]any {
	severity := "ok"
	if !ok {
		severity = "error"
	}
	return map[string]any{
		"label":    label,
		"ok":       ok,
		"severity": severity,
		"message":  message,
		"detail":   detail,
	}
}

func boolLabel(ok bool, yes, no string) string {
	if ok {
		return yes
	}
	return no
}

func (a *App) ProbeGatewayRoutes(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		RouteIDs []uint `json:"route_ids"`
	}
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	settings, err := a.effectiveSystemSettings()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := []map[string]any{}
	if len(payload.RouteIDs) == 0 {
		writeJSON(w, http.StatusOK, out)
		return
	}
	for _, routeID := range payload.RouteIDs {
		result, err := services.ProbeGatewayRoute(r.Context(), a.DB, strconv.FormatUint(uint64(routeID), 10), settings.GatewayRequestTimeout)
		if err != nil {
			out = append(out, gatewayProbeErrorResponse(routeID, err.Error()))
			continue
		}
		out = append(out, gatewayProbeResponse(result))
	}
	writeJSON(w, http.StatusOK, out)
}
func (a *App) ProbeGatewayRoute(w http.ResponseWriter, r *http.Request) {
	settings, err := a.effectiveSystemSettings()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	result, err := services.ProbeGatewayRoute(r.Context(), a.DB, chi.URLParam(r, "routeID"), settings.GatewayRequestTimeout)
	if err != nil {
		writeError(w, http.StatusNotFound, "网关路由不存在")
		return
	}
	writeJSON(w, http.StatusOK, gatewayProbeResponse(result))
}

func (a *App) ProbeGatewayRouteBalance(w http.ResponseWriter, r *http.Request) {
	routeID, err := strconv.ParseUint(chi.URLParam(r, "routeID"), 10, 64)
	if err != nil || routeID == 0 {
		writeError(w, http.StatusBadRequest, "路由 ID 无效")
		return
	}
	var payload struct {
		BalanceURL      string `json:"balance_url"`
		BalanceProbeURL string `json:"balance_probe_url"`
	}
	if r.Body != nil && r.Body != http.NoBody {
		if err := httpx.Decode(r, &payload); err != nil && !errors.Is(err, io.EOF) {
			writeError(w, http.StatusBadRequest, "请求格式错误")
			return
		}
	}
	settings, err := a.effectiveSystemSettings()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	result, err := services.ProbeGatewayRouteBalanceWithOptions(r.Context(), a.DB, uint(routeID), settings.GatewayRequestTimeout, services.BalanceProbeOptions{
		BalanceURL: firstNonEmpty(payload.BalanceProbeURL, payload.BalanceURL),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, balanceProbeResponse(result))
}

func (a *App) GatewayProxy(w http.ResponseWriter, r *http.Request) {
	settings, err := a.effectiveSystemSettings()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	gatewayAPIKey := strings.TrimSpace(settings.GatewayAPIKey)
	hasGroupKeys, err := services.HasGatewayRouteGroupAPIKeys(a.DB)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if gatewayAPIKey == "" && !hasGroupKeys {
		writeError(w, http.StatusServiceUnavailable, "网关 API Key 未配置，公开网关已禁用")
		return
	}
	bearerKey := gatewayBearerToken(r.Header.Get("Authorization"))
	requestGroup := strings.TrimSpace(r.URL.Query().Get("group"))
	effectiveGroup := requestGroup
	if bearerKey != "" && gatewayAPIKey != "" && bearerKey == gatewayAPIKey {
		// Global key keeps the existing behavior: it may use all routes, or the
		// optional group query to narrow the pool.
	} else if bearerKey != "" {
		group, matched, err := services.GatewayRouteGroupForAPIKey(a.DB, bearerKey)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !matched {
			writeError(w, http.StatusUnauthorized, "网关 API Key 无效")
			return
		}
		if requestGroup != "" && !strings.EqualFold(requestGroup, group.Name) {
			writeError(w, http.StatusUnauthorized, "分组 API Key 与请求分组不匹配")
			return
		}
		effectiveGroup = group.Name
	} else {
		writeError(w, http.StatusUnauthorized, "网关 API Key 无效")
		return
	}
	targetPath := gatewayProxyTargetPath(r.URL.Path)
	policy := services.GatewayPolicy{
		RouteStrategy:               settings.GatewayRouteStrategy,
		FailureThreshold:            settings.GatewayFailureThreshold,
		CooldownSeconds:             settings.GatewayCooldownSeconds,
		RequestTimeout:              settings.GatewayRequestTimeout,
		MaxAttempts:                 settings.GatewayMaxAttempts,
		FailureRetryMode:            settings.GatewayFailureRetryMode,
		RouteConcurrencyLimit:       settings.GatewayRouteConcurrencyLimit,
		ConcurrencyTransferStrategy: normalizeGatewayConcurrencyTransferStrategy(settings.GatewayConcurrencyTransferStrategy),
		ConcurrencyOverflowStrategy: settings.GatewayConcurrencyOverflowStrategy,
		SmartLatencyBias:            settings.GatewaySmartLatencyBias,
		SmartConcurrencyBias:        settings.GatewaySmartConcurrencyBias,
		SmartFailureBias:            settings.GatewaySmartFailureBias,
		SmartPriorityBias:           settings.GatewaySmartPriorityBias,
	}
	opts := services.ProxyGatewayOptions{
		ResponseWriter:     w,
		Group:              effectiveGroup,
		RouteType:          normalizeGatewayRouteType(firstNonEmpty(r.URL.Query().Get("type"), r.URL.Query().Get("route_type"))),
		ModelProbeStrategy: gatewayModelProbeStrategy(r),
	}
	_, err = services.ProxyGatewayRequestWithOptions(r.Context(), a.DB, r, targetPath, opts, policy)
	if err != nil {
		// service did not write anything yet (no candidate)
		status := http.StatusBadGateway
		var allRoutesFailed services.GatewayAllRoutesFailedError
		var nonRetryableUpstream services.GatewayNonRetryableUpstreamError
		var maxAttemptsExceeded services.GatewayMaxAttemptsExceededError
		var modelNotSupported services.GatewayModelNotSupportedError
		var bodyTooLarge services.GatewayBodyTooLargeError
		if errors.As(err, &bodyTooLarge) {
			status = http.StatusRequestEntityTooLarge
		} else if errors.As(err, &modelNotSupported) {
			status = http.StatusBadRequest
		} else if errors.As(err, &allRoutesFailed) || errors.As(err, &maxAttemptsExceeded) || strings.Contains(err.Error(), "没有可用") {
			status = http.StatusServiceUnavailable
		} else if errors.As(err, &nonRetryableUpstream) {
			status = http.StatusBadGateway
		}
		writeError(w, status, err.Error())
		return
	}
}

func gatewayBearerToken(header string) string {
	header = strings.TrimSpace(header)
	if len(header) >= 7 && strings.EqualFold(header[:7], "Bearer ") {
		return strings.TrimSpace(header[7:])
	}
	return ""
}

func gatewayProxyTargetPath(path string) string {
	switch {
	case path == "/api/gateway/sub2api/v1" || path == "/api/gateway/sub2api":
		return ""
	case strings.HasPrefix(path, "/api/gateway/sub2api/v1/"):
		return strings.TrimPrefix(path, "/api/gateway/sub2api/v1/")
	case strings.HasPrefix(path, "/api/gateway/sub2api/"):
		return strings.TrimPrefix(path, "/api/gateway/sub2api/")
	case path == "/api/gateway/v1" || path == "/api/gateway":
		return ""
	case strings.HasPrefix(path, "/api/gateway/v1/"):
		return strings.TrimPrefix(path, "/api/gateway/v1/")
	case strings.HasPrefix(path, "/api/gateway/"):
		return strings.TrimPrefix(path, "/api/gateway/")
	case path == "/v1":
		return ""
	case strings.HasPrefix(path, "/v1/"):
		return strings.TrimPrefix(path, "/v1/")
	default:
		return strings.TrimLeft(path, "/")
	}
}

func gatewayModelProbeStrategy(r *http.Request) string {
	if r == nil {
		return ""
	}
	if strings.HasPrefix(r.URL.Path, "/api/gateway/sub2api") {
		return "sub2api"
	}
	if r.URL.Path == "/v1/models" {
		return "sub2api"
	}
	for _, value := range []string{
		r.URL.Query().Get("model_probe"),
		r.URL.Query().Get("models_probe"),
		r.URL.Query().Get("models_strategy"),
		r.URL.Query().Get("probe_strategy"),
		r.Header.Get("X-Gateway-Model-Probe"),
		r.Header.Get("X-Gateway-Models-Strategy"),
		r.Header.Get("X-Sub2API-Probe"),
	} {
		switch strings.ToLower(strings.TrimSpace(value)) {
		case "sub2api", "health", "model_health", "synthetic":
			return "sub2api"
		}
	}
	ua := strings.ToLower(strings.TrimSpace(r.Header.Get("User-Agent")))
	if strings.Contains(ua, "sub2api") || strings.Contains(ua, "sub2-api") {
		return "sub2api"
	}
	return ""
}

func normalizeGatewayConcurrencyTransferStrategy(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "limit_only", "balance":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "limit_only"
	}
}

func refreshGatewayRouteSnapshotsForSite(db *gorm.DB, site models.Site) error {
	if db == nil || site.ID == 0 {
		return nil
	}
	var states []models.GatewayRouteState
	if err := db.Where("site_id = ?", site.ID).Find(&states).Error; err != nil {
		return err
	}
	for _, route := range states {
		route.Site = site
		requestBaseURLs := refreshedGatewayRouteRequestBaseCandidates(route, site)
		if route.LastRequestBaseURL != "" && !gatewayStringSliceContains(requestBaseURLs, services.NormalizeBaseURL(route.LastRequestBaseURL)) {
			route.LastRequestBaseURL = ""
		}
		updates := map[string]any{
			"site_name_snapshot":     site.Name,
			"site_base_url_snapshot": site.BaseURL,
			"site_api_url_snapshot":  services.EncodeGatewayRequestBaseURLs(requestBaseURLs),
			"last_request_base_url":  route.LastRequestBaseURL,
		}
		if err := db.Model(&route).Updates(updates).Error; err != nil {
			return err
		}
	}
	return nil
}

func refreshedGatewayRouteRequestBaseCandidates(route models.GatewayRouteState, site models.Site) []string {
	manual := services.GatewayRouteManualRequestBaseURLs(route, site)
	if len(manual) > 0 {
		return manual
	}
	return services.GatewayRequestBaseCandidates(site)
}

func gatewayStringSliceContains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func gatewayRouteResponse(route services.GatewayRoute) map[string]any {
	state := route.State
	successRate := 0.0
	if state.RequestCount > 0 {
		successRate = round2(float64(state.SuccessCount) / float64(state.RequestCount) * 100)
	}
	groups := make([]map[string]any, 0, len(route.Groups))
	groupNames := make([]string, 0, len(route.Groups))
	for _, group := range route.Groups {
		groups = append(groups, gatewayRouteGroupResponse(group, 0))
		groupNames = append(groupNames, group.Name)
	}
	groupName := state.GroupName
	if len(groupNames) > 0 {
		sort.Strings(groupNames)
		groupName = strings.Join(groupNames, ", ")
	}
	out := map[string]any{
		"id":                       state.ID,
		"site_id":                  state.SiteID,
		"site_name":                services.GatewayRouteSiteLabel(route),
		"base_url":                 firstNonEmpty(route.Site.BaseURL, state.SiteBaseURLSnapshot),
		"request_base_url":         route.RequestBaseURL,
		"request_base_urls":        services.GatewayRouteRequestBaseCandidates(state, route.Site),
		"manual_request_base_urls": services.GatewayRouteManualRequestBaseURLs(state, route.Site),
		"last_request_base_url":    state.LastRequestBaseURL,
		"site_name_snapshot":       state.SiteNameSnapshot,
		"site_base_url_snapshot":   state.SiteBaseURLSnapshot,
		"site_missing":             route.Site.ID == 0,
		"has_api_key":              route.APIKey != "",
		"group_name":               groupName,
		"groups":                   groups,
		"last_balance":             services.GatewayRouteBalance(route),
		"balance_display":          balanceDisplayWithUnit(services.GatewayRouteBalance(route), services.GatewayRouteBalanceUnit(route)),
		"balance_unit":             services.GatewayRouteBalanceUnit(route),
		"balance_probe_url":        services.GatewayRouteBalanceProbeURL(route),
		"package_display":          packageDisplay(route.Site),
		"checkin_status":           route.Site.LastStatus,
		"key_name":                 state.KeyName,
		"key_fingerprint":          state.KeyFingerprint,
		"key_source":               state.KeySource,
		"route_type":               state.RouteType,
		"route_type_manual":        state.RouteTypeManual,
		"route_path":               state.RoutePath,
		"route_path_manual":        state.RoutePathManual,
		"supported_models":         services.GatewayRouteSupportedModels(state),
		"model_probe_status":       state.ModelProbeStatus,
		"model_probe_message":      services.RedactGatewayText(state.ModelProbeMessage),
		"model_probe_updated_at":   state.ModelProbeUpdatedAt,
		"route_priority":           state.RoutePriority,
		"route_priority_manual":    state.RoutePriorityManual,
		"weight":                   state.Weight,
		"is_enabled":               state.IsEnabled,
		"is_enabled_manual":        state.IsEnabledManual,
		"circuit_state":            state.CircuitState,
		"consecutive_failures":     state.ConsecutiveFailures,
		"active_concurrency":       services.RouteActiveCount(state.ID),
		"request_count":            state.RequestCount,
		"success_count":            state.SuccessCount,
		"failure_count":            state.FailureCount,
		"avg_latency_ms":           state.AvgLatencyMS,
		"ewma_latency_ms":          state.EWMALatencyMS,
		"last_latency_ms":          state.LastLatencyMS,
		"success_rate":             successRate,
		"last_status_code":         state.LastStatusCode,
		"last_error":               redactedStringPtr(state.LastError),
		"last_used_at":             state.LastUsedAt,
		"last_success_at":          state.LastSuccessAt,
		"last_failure_at":          state.LastFailureAt,
		"circuit_open_until":       state.CircuitOpenUntil,
	}
	for key, value := range packageQuotaMap(route.Site) {
		out[key] = value
	}
	return out
}

func gatewayProbeResponse(result services.GatewayProbeResult) map[string]any {
	state := result.Route.State
	return map[string]any{"id": state.ID, "site_id": state.SiteID, "site_name": services.GatewayRouteSiteLabel(result.Route), "request_base_url": result.Route.RequestBaseURL, "key_name": state.KeyName, "key_fingerprint": state.KeyFingerprint, "ok": result.OK, "status_code": result.StatusCode, "latency_ms": result.LatencyMS, "message": services.RedactGatewayText(result.Message), "models": result.Models, "supported_models": services.GatewayRouteSupportedModels(state), "model_probe_status": state.ModelProbeStatus, "model_probe_message": services.RedactGatewayText(state.ModelProbeMessage), "model_probe_updated_at": state.ModelProbeUpdatedAt, "last_status_code": state.LastStatusCode, "last_error": redactedStringPtr(state.LastError), "last_latency_ms": state.LastLatencyMS, "last_success_at": state.LastSuccessAt, "last_failure_at": state.LastFailureAt, "checked_at": result.CheckedAt}
}

func gatewayProbeErrorResponse(routeID uint, message string) map[string]any {
	return map[string]any{
		"id":                     routeID,
		"site_id":                0,
		"site_name":              "",
		"request_base_url":       "",
		"key_name":               "",
		"key_fingerprint":        "",
		"ok":                     false,
		"status_code":            nil,
		"latency_ms":             nil,
		"message":                services.RedactGatewayText(message),
		"models":                 []string{},
		"supported_models":       []string{},
		"model_probe_status":     "failed",
		"model_probe_message":    services.RedactGatewayText(message),
		"model_probe_updated_at": nil,
		"last_status_code":       nil,
		"last_error":             nil,
		"last_latency_ms":        nil,
		"last_success_at":        nil,
		"last_failure_at":        nil,
		"checked_at":             time.Now().UTC(),
	}
}

func normalizeGatewayRouteType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "general", "auto", "any", "none", "default":
		return "general"
	case "claude", "anthropic":
		return "claude"
	case "gpt", "gptchat", "gpt_chat", "gpt-chat", "openai", "chatgpt", "chat", "chat_completions", "chat-completions":
		return "gpt"
	case "codex", "response", "responses":
		return "codex"
	case "gemini", "google":
		return "gemini"
	default:
		return ""
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
