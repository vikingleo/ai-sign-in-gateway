package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/plugins"
	"ai-sign-in-gateway/internal/schemas"
	"github.com/glebarez/sqlite"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func TestCheckinRunsHonorsLimitQuery(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:checkin-runs-limit?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	site := models.Site{Name: "demo", BaseURL: "https://example.com", PluginKey: "http-relay-station", IsEnabled: true}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}
	base := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	for i := 0; i < 3; i++ {
		run := models.CheckinRun{
			SiteID:      &site.ID,
			TriggerType: "manual",
			Status:      "success",
			Message:     fmt.Sprintf("run-%d", i),
			StartedAt:   base.Add(time.Duration(i) * time.Minute),
		}
		if err := db.Create(&run).Error; err != nil {
			t.Fatalf("create run %d: %v", i, err)
		}
	}

	app := &App{DB: db}
	req := httptest.NewRequest(http.MethodGet, "/checkins/runs?limit=2", nil)
	rec := httptest.NewRecorder()
	app.CheckinRuns(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 2 {
		t.Fatalf("payload len = %d, body = %s", len(payload), rec.Body.String())
	}
	if got, _ := payload[0]["message"].(string); got != "run-2" {
		t.Fatalf("first run message = %q", got)
	}
}

func TestCheckinLimiterDoesNotAcquireCanceledContext(t *testing.T) {
	limiter := newCheckinLimiter()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	if limiter.Acquire(ctx, "site:1") {
		t.Fatal("canceled context acquired a limiter slot")
	}
	if limiter.globalCount != 0 || limiter.siteActive["site:1"] != 0 {
		t.Fatalf("limiter counters changed: global=%d site=%d", limiter.globalCount, limiter.siteActive["site:1"])
	}
}

func TestCheckinLimiterNormalizesInvalidLimits(t *testing.T) {
	limiter := newCheckinLimiter()
	limiter.UpdateLimits(checkinExecutionSettings{SiteConcurrency: 0, GlobalConcurrency: -1})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if !limiter.Acquire(ctx, "site:1") {
		t.Fatal("limiter did not acquire after invalid limit normalization")
	}
	limiter.Release("site:1")
	if limiter.globalCount != 0 || limiter.siteActive["site:1"] != 0 {
		t.Fatalf("limiter counters after release: global=%d site=%d", limiter.globalCount, limiter.siteActive["site:1"])
	}
}

func TestTotpPreviewReturnsCurrentCode(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:totp-preview-code?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{
		Name:      "totp",
		BaseURL:   "https://example.com",
		PluginKey: "sub2api-platform",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"totp_secret": "JBSWY3DPEHPK3PXP",
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	app := &App{DB: db}
	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/sites/%d/totp-preview", site.ID), nil)
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("siteID", fmt.Sprint(site.ID))
	req = contextWithRoute(req, routeCtx)
	rec := httptest.NewRecorder()
	app.TotpPreview(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	code, _ := payload["code"].(string)
	if !isSixDigitCode(code) {
		t.Fatalf("code = %q", code)
	}
	expiresIn, _ := payload["expires_in"].(float64)
	if expiresIn <= 0 || expiresIn > 30 {
		t.Fatalf("expires_in = %v", payload["expires_in"])
	}
}

func TestTotpPreviewRejectsMissingConfig(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:totp-preview-missing?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{
		Name:        "totp",
		BaseURL:     "https://example.com",
		PluginKey:   "sub2api-platform",
		IsEnabled:   true,
		Credentials: models.JSONMap{},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	app := &App{DB: db}
	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/sites/%d/totp-preview", site.ID), nil)
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("siteID", fmt.Sprint(site.ID))
	req = contextWithRoute(req, routeCtx)
	rec := httptest.NewRecorder()
	app.TotpPreview(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if detail, ok := payload["detail"].(string); !ok || detail == "" {
		t.Fatalf("detail is empty: %s", rec.Body.String())
	}
}

func TestUpdateCheckinParticipationPersistsSetting(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:checkin-participation?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	site := models.Site{
		Name:         "demo",
		BaseURL:      "https://example.com",
		PluginKey:    "sub2api-platform",
		IsEnabled:    true,
		PluginConfig: models.JSONMap{},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	app := &App{DB: db}
	body := bytes.NewReader([]byte(`{"include_in_checkin":false}`))
	req := httptest.NewRequest(http.MethodPost, "/sites/1/participation", body)
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("siteID", "1")
	req = contextWithRoute(req, routeCtx)
	rec := httptest.NewRecorder()

	app.UpdateCheckinParticipation(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var stored models.Site
	if err := db.First(&stored, site.ID).Error; err != nil {
		t.Fatalf("reload site: %v", err)
	}
	if got := includeInCheckin(stored); got {
		t.Fatalf("includeInCheckin = %v", got)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/checkins/sites", nil)
	listRec := httptest.NewRecorder()
	app.CheckinSites(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("list status = %d, body = %s", listRec.Code, listRec.Body.String())
	}
	var payload []map[string]any
	if err := json.Unmarshal(listRec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 1 {
		t.Fatalf("payload len = %d", len(payload))
	}
	if got, ok := payload[0]["include_in_checkin"].(bool); !ok || got {
		t.Fatalf("include_in_checkin response = %v", payload[0]["include_in_checkin"])
	}
}

func TestRelayOnlySiteCannotParticipateInCheckin(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"message": "signed",
			"data": map[string]any{
				"balance": 12.5,
			},
		})
	}))
	defer server.Close()

	db, err := gorm.Open(sqlite.Open("file:checkin-relay-only?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	relaySite := models.Site{
		Name:      "relay",
		BaseURL:   "https://relay.example/v1",
		PluginKey: "api-supplier",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"api_key": "relay-key",
		},
		PluginConfig: models.JSONMap{
			"include_in_checkin": true,
		},
	}
	checkinSite := models.Site{
		Name:      "checkin",
		BaseURL:   server.URL,
		PluginKey: "http-relay-station",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"account": "demo",
		},
		PluginConfig: models.JSONMap{
			"auth_mode":            "none",
			"checkin_path":         "/checkin",
			"checkin_method":       "POST",
			"checkin_success_path": "success",
			"checkin_message_path": "message",
			"checkin_balance_path": "data.balance",
		},
	}
	if err := db.Create(&relaySite).Error; err != nil {
		t.Fatalf("create relay site: %v", err)
	}
	if err := db.Create(&checkinSite).Error; err != nil {
		t.Fatalf("create checkin site: %v", err)
	}

	app := &App{DB: db, PluginManager: plugins.NewManager()}
	listReq := httptest.NewRequest(http.MethodGet, "/checkins/sites", nil)
	listRec := httptest.NewRecorder()
	app.CheckinSites(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("list status = %d, body = %s", listRec.Code, listRec.Body.String())
	}
	var sites []map[string]any
	if err := json.Unmarshal(listRec.Body.Bytes(), &sites); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	byName := map[string]map[string]any{}
	for _, item := range sites {
		byName[fmt.Sprint(item["name"])] = item
	}
	if got, _ := byName["relay"]["can_checkin"].(bool); got {
		t.Fatalf("relay can_checkin = %v", got)
	}
	if got, _ := byName["relay"]["include_in_checkin"].(bool); got {
		t.Fatalf("relay include_in_checkin = %v", got)
	}
	if got, _ := byName["checkin"]["can_checkin"].(bool); !got {
		t.Fatalf("checkin can_checkin = %v", got)
	}

	body := bytes.NewReader([]byte(`{"include_in_checkin":true}`))
	req := httptest.NewRequest(http.MethodPost, "/checkins/sites/1/participation", body)
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("siteID", fmt.Sprint(relaySite.ID))
	req = contextWithRoute(req, routeCtx)
	rec := httptest.NewRecorder()
	app.UpdateCheckinParticipation(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("participation status = %d, body = %s", rec.Code, rec.Body.String())
	}

	batchReq := httptest.NewRequest(http.MethodPost, "/checkins/batch", bytes.NewReader([]byte(`{"only_enabled":true}`)))
	batchRec := httptest.NewRecorder()
	app.RunBatchCheckin(batchRec, batchReq)
	if batchRec.Code != http.StatusOK {
		t.Fatalf("batch status = %d, body = %s", batchRec.Code, batchRec.Body.String())
	}
	var runs []map[string]any
	if err := json.Unmarshal(batchRec.Body.Bytes(), &runs); err != nil {
		t.Fatalf("decode batch response: %v", err)
	}
	if len(runs) != 1 {
		t.Fatalf("batch runs len = %d, body = %s", len(runs), batchRec.Body.String())
	}
	if got, _ := runs[0]["site_id"].(float64); uint(got) != checkinSite.ID {
		t.Fatalf("batch site_id = %v", runs[0]["site_id"])
	}
}

func TestSub2APIPlatformCanDisableCheckin(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:checkin-sub2api-disabled?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	disabledSite := models.Site{
		Name:      "disabled",
		BaseURL:   "https://sub2api.example",
		PluginKey: "sub2api-platform",
		IsEnabled: true,
		PluginConfig: models.JSONMap{
			"disable_checkin":    "true",
			"include_in_checkin": true,
		},
	}
	enabledSite := checkinBatchTestSite("enabled", "https://enabled.example", true)
	if err := db.Create(&disabledSite).Error; err != nil {
		t.Fatalf("create disabled site: %v", err)
	}
	if err := db.Create(&enabledSite).Error; err != nil {
		t.Fatalf("create enabled site: %v", err)
	}

	app := &App{DB: db, PluginManager: plugins.NewManager()}
	listReq := httptest.NewRequest(http.MethodGet, "/checkins/sites", nil)
	listRec := httptest.NewRecorder()
	app.CheckinSites(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("list status = %d, body = %s", listRec.Code, listRec.Body.String())
	}
	var sites []map[string]any
	if err := json.Unmarshal(listRec.Body.Bytes(), &sites); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	byName := map[string]map[string]any{}
	for _, item := range sites {
		byName[fmt.Sprint(item["name"])] = item
	}
	if got, _ := byName["disabled"]["can_checkin"].(bool); got {
		t.Fatalf("disabled can_checkin = %v", got)
	}
	if got, _ := byName["disabled"]["include_in_checkin"].(bool); got {
		t.Fatalf("disabled include_in_checkin = %v", got)
	}
	if got, _ := byName["disabled"]["reason"].(string); !strings.Contains(got, "关闭签到") {
		t.Fatalf("disabled reason = %q", got)
	}

	batchReq := httptest.NewRequest(http.MethodPost, "/checkins/batch", bytes.NewReader([]byte(`{"only_enabled":true}`)))
	batchRec := httptest.NewRecorder()
	app.RunBatchCheckin(batchRec, batchReq)
	if batchRec.Code != http.StatusOK {
		t.Fatalf("batch status = %d, body = %s", batchRec.Code, batchRec.Body.String())
	}
	var runs []map[string]any
	if err := json.Unmarshal(batchRec.Body.Bytes(), &runs); err != nil {
		t.Fatalf("decode batch response: %v", err)
	}
	if len(runs) != 1 {
		t.Fatalf("batch runs len = %d, body = %s", len(runs), batchRec.Body.String())
	}
	if got, _ := runs[0]["site_id"].(float64); uint(got) != enabledSite.ID {
		t.Fatalf("batch site_id = %v", runs[0]["site_id"])
	}

	router := chi.NewRouter()
	router.Post("/sites/{siteID}/checkin", app.SiteCheckin)
	singleReq := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/sites/%d/checkin", disabledSite.ID), nil)
	singleRec := httptest.NewRecorder()
	router.ServeHTTP(singleRec, singleReq)
	if singleRec.Code != http.StatusBadRequest {
		t.Fatalf("single status = %d, body = %s", singleRec.Code, singleRec.Body.String())
	}
	var runCount int64
	if err := db.Model(&models.CheckinRun{}).Where("site_id = ?", disabledSite.ID).Count(&runCount).Error; err != nil {
		t.Fatalf("count disabled runs: %v", err)
	}
	if runCount != 0 {
		t.Fatalf("disabled single-site runs = %d", runCount)
	}
}

func TestRunBatchCheckinRejectsMalformedJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/checkins/batch", bytes.NewReader([]byte(`{"site_ids":[`)))
	rec := httptest.NewRecorder()

	(&App{}).RunBatchCheckin(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("期望状态码 400，实际 %d，响应体：%s", rec.Code, rec.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("解码错误响应失败：%v", err)
	}
	if detail, ok := payload["detail"].(string); !ok || detail == "" {
		t.Fatalf("错误详情为空：%s", rec.Body.String())
	}
}

func TestRunBatchCheckinUsesSettingsDefaultWhenOnlyEnabledIsOmitted(t *testing.T) {
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"message": "signed",
		})
	}))
	defer server.Close()

	db, err := gorm.Open(sqlite.Open("file:checkin-default-only-enabled?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	if err := db.Create(&models.SystemSetting{ID: 1, RequestTimeout: 5, OnlyEnabledSites: true}).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	sites := []models.Site{
		checkinBatchTestSite("enabled", server.URL, true),
		checkinBatchTestSite("disabled", server.URL, false),
	}
	if err := db.Create(&sites).Error; err != nil {
		t.Fatalf("create sites: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/checkins/batch", bytes.NewReader([]byte(`{}`)))
	rec := httptest.NewRecorder()
	(&App{DB: db, PluginManager: plugins.NewManager()}).RunBatchCheckin(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 1 {
		t.Fatalf("payload = %s", rec.Body.String())
	}
	if got, _ := payload[0]["site_id"].(float64); uint(got) != sites[0].ID {
		t.Fatalf("site_id = %v, want %d", payload[0]["site_id"], sites[0].ID)
	}
	if requestCount != 1 {
		t.Fatalf("request count = %d", requestCount)
	}
}

func TestRunBatchCheckinCanOverrideSettingsDefaultToIncludeDisabledSites(t *testing.T) {
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"message": "signed",
		})
	}))
	defer server.Close()

	db, err := gorm.Open(sqlite.Open("file:checkin-override-only-enabled?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	if err := db.Create(&models.SystemSetting{ID: 1, RequestTimeout: 5, OnlyEnabledSites: true}).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	sites := []models.Site{
		checkinBatchTestSite("enabled", server.URL, true),
		checkinBatchTestSite("disabled", server.URL, false),
	}
	if err := db.Create(&sites).Error; err != nil {
		t.Fatalf("create sites: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/checkins/batch", bytes.NewReader([]byte(`{"only_enabled":false}`)))
	rec := httptest.NewRecorder()
	(&App{DB: db, PluginManager: plugins.NewManager()}).RunBatchCheckin(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 2 {
		t.Fatalf("payload = %s", rec.Body.String())
	}
	if requestCount != 2 {
		t.Fatalf("request count = %d", requestCount)
	}
}

func TestRunBatchCheckinCompletesAfterRequestContextCanceled(t *testing.T) {
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/checkin":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "signed",
				"data":    map[string]any{"balance": 9.5, "currency": "USD"},
			})
		case "/status":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "ok",
				"data":    map[string]any{"logged_in": true, "balance": 10.5, "currency": "USD"},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	db, err := gorm.Open(sqlite.Open("file:checkin-request-cancel?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	if err := db.Create(&models.SystemSetting{
		ID:                       1,
		RequestTimeout:           5,
		OnlyEnabledSites:         true,
		CheckinConcurrency:       1,
		CheckinGlobalConcurrency: 1,
		CheckinIntervalSeconds:   0,
		RetryCount:               0,
	}).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	site := models.Site{
		Name:      "manual",
		BaseURL:   server.URL,
		PluginKey: "http-relay-station",
		IsEnabled: true,
		PluginConfig: models.JSONMap{
			"auth_mode":                 "none",
			"status_path":               "/status",
			"status_method":             "GET",
			"status_login_path":         "data.logged_in",
			"status_balance_path":       "data.balance",
			"status_balance_unit_path":  "data.currency",
			"status_message_path":       "message",
			"checkin_path":              "/checkin",
			"checkin_method":            "POST",
			"checkin_success_path":      "success",
			"checkin_message_path":      "message",
			"checkin_balance_path":      "data.balance",
			"checkin_balance_unit_path": "data.currency",
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	req := httptest.NewRequest(http.MethodPost, "/checkins/batch", bytes.NewReader([]byte(`{"only_enabled":true}`))).WithContext(ctx)
	cancel()
	rec := httptest.NewRecorder()

	(&App{DB: db, PluginManager: plugins.NewManager()}).RunBatchCheckin(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 1 || payload[0]["status"] != "success" {
		t.Fatalf("unexpected response: %s", rec.Body.String())
	}
	if requestCount != 2 {
		t.Fatalf("request count = %d, want checkin and status requests", requestCount)
	}
}

func TestCheckinLimiterIsSharedAcrossAppInstances(t *testing.T) {
	firstEntered := make(chan struct{}, 1)
	releaseFirst := make(chan struct{})
	secondEntered := make(chan struct{}, 1)
	var requestCount int
	var requestMu sync.Mutex
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path != "/checkin" {
			http.NotFound(w, r)
			return
		}
		requestMu.Lock()
		requestCount++
		current := requestCount
		requestMu.Unlock()
		if current == 1 {
			firstEntered <- struct{}{}
			<-releaseFirst
		} else {
			secondEntered <- struct{}{}
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"message": "signed",
		})
	}))
	defer server.Close()

	db, err := gorm.Open(sqlite.Open("file:checkin-shared-limiter?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	settings := models.SystemSetting{
		ID:                       1,
		RequestTimeout:           5,
		CheckinConcurrency:       1,
		CheckinGlobalConcurrency: 2,
		CheckinIntervalSeconds:   0,
		RetryCount:               0,
	}
	sites := []models.Site{
		{
			Name:      "first",
			BaseURL:   server.URL,
			PluginKey: "http-relay-station",
			IsEnabled: true,
			PluginConfig: models.JSONMap{
				"auth_mode":            "none",
				"checkin_path":         "/checkin",
				"checkin_method":       "POST",
				"checkin_success_path": "success",
				"checkin_message_path": "message",
			},
		},
		{
			Name:      "second",
			BaseURL:   server.URL + "/",
			PluginKey: "http-relay-station",
			IsEnabled: true,
			PluginConfig: models.JSONMap{
				"auth_mode":            "none",
				"checkin_path":         "/checkin",
				"checkin_method":       "POST",
				"checkin_success_path": "success",
				"checkin_message_path": "message",
			},
		},
	}
	if err := db.Create(&sites).Error; err != nil {
		t.Fatalf("create sites: %v", err)
	}
	appA := &App{DB: db, PluginManager: plugins.NewManager()}
	appB := &App{DB: db, PluginManager: plugins.NewManager()}
	doneA := make(chan []schemas.CheckinRunResponse, 1)
	doneB := make(chan []schemas.CheckinRunResponse, 1)

	go func() {
		doneA <- appA.executeCheckinTargets(context.Background(), []models.Site{sites[0]}, "manual", settings)
	}()
	select {
	case <-firstEntered:
	case <-time.After(time.Second):
		t.Fatal("first checkin did not reach upstream")
	}
	go func() {
		doneB <- appB.executeCheckinTargets(context.Background(), []models.Site{sites[1]}, "scheduled", settings)
	}()
	select {
	case <-secondEntered:
		t.Fatal("second checkin bypassed shared site concurrency limit")
	case <-time.After(100 * time.Millisecond):
	}
	close(releaseFirst)
	select {
	case runs := <-doneA:
		if len(runs) != 1 || runs[0].Status != "success" {
			t.Fatalf("first runs = %+v", runs)
		}
	case <-time.After(time.Second):
		t.Fatal("first checkin did not finish")
	}
	select {
	case <-secondEntered:
	case <-time.After(time.Second):
		t.Fatal("second checkin did not start after first released slot")
	}
	select {
	case runs := <-doneB:
		if len(runs) != 1 || runs[0].Status != "success" {
			t.Fatalf("second runs = %+v", runs)
		}
	case <-time.After(time.Second):
		t.Fatal("second checkin did not finish")
	}
}

func TestRunBatchCheckinStopsBeforeExternalRequestWhenRunCreateFails(t *testing.T) {
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"message": "signed",
		})
	}))
	defer server.Close()

	db, err := gorm.Open(sqlite.Open("file:checkin-run-create-fails?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	if err := db.Create(&models.SystemSetting{
		ID:                       1,
		RequestTimeout:           5,
		OnlyEnabledSites:         true,
		CheckinConcurrency:       1,
		CheckinGlobalConcurrency: 1,
		CheckinIntervalSeconds:   0,
		RetryCount:               2,
	}).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	site := checkinBatchTestSite("broken-run", server.URL, true)
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}
	const createMessage = "forced checkin run create failure"
	db.Callback().Create().Before("gorm:create").Register("test_fail_checkin_run_create", func(tx *gorm.DB) {
		if tx.Statement.Table == "checkin_runs" {
			tx.AddError(errors.New(createMessage))
		}
	})

	req := httptest.NewRequest(http.MethodPost, "/checkins/batch", bytes.NewReader([]byte(`{"only_enabled":true}`)))
	rec := httptest.NewRecorder()
	(&App{DB: db, PluginManager: plugins.NewManager()}).RunBatchCheckin(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 1 {
		t.Fatalf("payload len = %d, body = %s", len(payload), rec.Body.String())
	}
	if got, _ := payload[0]["status"].(string); got != "failed" {
		t.Fatalf("status = %q, body = %s", got, rec.Body.String())
	}
	if got, _ := payload[0]["message"].(string); !strings.Contains(got, createMessage) {
		t.Fatalf("message = %q", got)
	}
	if got, _ := payload[0]["attempt_count"].(float64); got != 1 {
		t.Fatalf("attempt_count = %v", payload[0]["attempt_count"])
	}
	if requestCount != 0 {
		t.Fatalf("external checkin request count = %d", requestCount)
	}
	var runCount int64
	if err := db.Model(&models.CheckinRun{}).Where("site_id = ?", site.ID).Count(&runCount).Error; err != nil {
		t.Fatalf("count runs: %v", err)
	}
	if runCount != 0 {
		t.Fatalf("persisted runs = %d", runCount)
	}
}

func checkinBatchTestSite(name, baseURL string, enabled bool) models.Site {
	return models.Site{
		Name:      name,
		BaseURL:   baseURL,
		PluginKey: "http-relay-station",
		IsEnabled: enabled,
		PluginConfig: models.JSONMap{
			"auth_mode":            "none",
			"checkin_path":         "/checkin",
			"checkin_method":       "POST",
			"checkin_success_path": "success",
			"checkin_message_path": "message",
		},
	}
}

func TestSiteCheckinRejectsMissingPlugin(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:checkin-missing-plugin-status?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{Name: "missing", BaseURL: "https://example.com", PluginKey: "missing-plugin", IsEnabled: true}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/sites/%d/checkin", site.ID), nil)
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("siteID", fmt.Sprint(site.ID))
	req = contextWithRoute(req, routeCtx)
	rec := httptest.NewRecorder()
	(&App{DB: db, PluginManager: plugins.NewManager()}).SiteCheckin(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var stored models.Site
	if err := db.First(&stored, site.ID).Error; err != nil {
		t.Fatalf("reload site: %v", err)
	}
	if stored.LastStatus != nil {
		t.Fatalf("last status = %v", stored.LastStatus)
	}
	if stored.LastMessage != nil {
		t.Fatalf("last message = %v", stored.LastMessage)
	}
	var runCount int64
	if err := db.Model(&models.CheckinRun{}).Where("site_id = ?", site.ID).Count(&runCount).Error; err != nil {
		t.Fatalf("count runs: %v", err)
	}
	if runCount != 0 {
		t.Fatalf("missing plugin runs = %d", runCount)
	}
}

func TestSiteCheckinRefreshesBalanceAfterCheckin(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer token-123" {
			t.Fatalf("Authorization = %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/checkin":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "signed",
				"data":    map[string]any{},
			})
		case "/status":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "ok",
				"data": map[string]any{
					"logged_in": true,
					"balance":   42.5,
					"currency":  "USD",
				},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	db, err := gorm.Open(sqlite.Open("file:checkin-refresh-balance?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	settings := models.SystemSetting{ID: 1, RequestTimeout: 5}
	if err := db.Create(&settings).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	oldBalance := 3.25
	site := models.Site{
		Name:        "demo",
		BaseURL:     server.URL,
		PluginKey:   "http-relay-station",
		IsEnabled:   true,
		LastBalance: &oldBalance,
		Credentials: models.JSONMap{
			"api_key": "token-123",
		},
		PluginConfig: models.JSONMap{
			"auth_mode":                 "bearer",
			"status_path":               "/status",
			"status_method":             "GET",
			"status_login_path":         "data.logged_in",
			"status_balance_path":       "data.balance",
			"status_balance_unit_path":  "data.currency",
			"status_message_path":       "message",
			"checkin_path":              "/checkin",
			"checkin_method":            "POST",
			"checkin_success_path":      "success",
			"checkin_message_path":      "message",
			"checkin_balance_path":      "data.missing_balance",
			"checkin_balance_unit_path": "data.currency",
			"default_balance_unit":      "USD",
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	app := &App{DB: db, PluginManager: plugins.NewManager()}
	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/sites/%d/checkin", site.ID), nil)
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("siteID", fmt.Sprint(site.ID))
	req = contextWithRoute(req, routeCtx)
	rec := httptest.NewRecorder()

	app.SiteCheckin(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got, _ := payload["balance"].(float64); got != 42.5 {
		t.Fatalf("response balance = %v", payload["balance"])
	}
	if got, _ := payload["balance_unit"].(string); got != "$" {
		t.Fatalf("response balance_unit = %q", got)
	}

	var stored models.Site
	if err := db.First(&stored, site.ID).Error; err != nil {
		t.Fatalf("reload site: %v", err)
	}
	if stored.LastBalance == nil || *stored.LastBalance != 42.5 {
		t.Fatalf("stored.LastBalance = %v", stored.LastBalance)
	}
	if got := jsonMapString(stored.PluginConfig, "balance_unit"); got != "$" {
		t.Fatalf("balance_unit = %q", got)
	}
}

func contextWithRoute(req *http.Request, routeCtx *chi.Context) *http.Request {
	return req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, routeCtx))
}

func isSixDigitCode(value string) bool {
	if len(value) != 6 {
		return false
	}
	for _, r := range value {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
