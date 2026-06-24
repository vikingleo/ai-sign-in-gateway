package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"ai-sign-in-gateway/internal/config"
	"ai-sign-in-gateway/internal/database"
	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/plugins"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestRunSchedulerNowExecutesCheckinBatch(t *testing.T) {
	requestCount := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/checkin":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "signed",
				"data":    map[string]any{"balance": 18.5, "currency": "USD"},
			})
		case "/status":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "ok",
				"data":    map[string]any{"logged_in": true, "balance": 20.5, "currency": "USD"},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()

	db, err := gorm.Open(sqlite.Open("file:settings-run-scheduler-now?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	if err := db.Create(&models.SystemSetting{ID: 1, RequestTimeout: 5, OnlyEnabledSites: true}).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	enabled := schedulerNowTestSite(upstream.URL, true)
	disabled := schedulerNowTestSite(upstream.URL, false)
	disabled.Name = "disabled"
	if err := db.Create(&enabled).Error; err != nil {
		t.Fatalf("create enabled site: %v", err)
	}
	if err := db.Create(&disabled).Error; err != nil {
		t.Fatalf("create disabled site: %v", err)
	}

	app := &App{DB: db, PluginManager: plugins.NewManager()}
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/settings/scheduler/run-now", nil)
	app.RunSchedulerNow(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["status"] != "ok" || payload["message"] != "已执行一次签到：成功 1，失败 0。" {
		t.Fatalf("payload = %#v", payload)
	}
	if requestCount != 2 {
		t.Fatalf("request count = %d, want checkin and status requests", requestCount)
	}
	var runs []models.CheckinRun
	if err := db.Order("id asc").Find(&runs).Error; err != nil {
		t.Fatalf("list runs: %v", err)
	}
	if len(runs) != 1 || runs[0].SiteID == nil || *runs[0].SiteID != enabled.ID || runs[0].Status != "success" {
		t.Fatalf("runs = %+v", runs)
	}
	var stored models.Site
	if err := db.First(&stored, enabled.ID).Error; err != nil {
		t.Fatalf("reload site: %v", err)
	}
	if stored.LastBalance == nil || *stored.LastBalance != 20.5 {
		t.Fatalf("last balance = %v", stored.LastBalance)
	}
}

func TestRunSchedulerNowAppliesRetrySetting(t *testing.T) {
	checkinCount := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/checkin":
			checkinCount++
			if checkinCount == 1 {
				http.Error(w, `{"message":"temporary"}`, http.StatusBadGateway)
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "signed after retry",
				"data":    map[string]any{"balance": 18.5, "currency": "USD"},
			})
		case "/status":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "ok",
				"data":    map[string]any{"logged_in": true, "balance": 20.5, "currency": "USD"},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()

	db, err := gorm.Open(sqlite.Open("file:settings-run-scheduler-now-retry?mode=memory&cache=shared"), &gorm.Config{})
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
		RetryCount:               1,
	}).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	site := schedulerNowTestSite(upstream.URL, true)
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	app := &App{DB: db, PluginManager: plugins.NewManager()}
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/settings/scheduler/run-now", nil)
	app.RunSchedulerNow(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if checkinCount != 2 {
		t.Fatalf("checkin attempts = %d", checkinCount)
	}
	var runs []models.CheckinRun
	if err := db.Order("id asc").Find(&runs).Error; err != nil {
		t.Fatalf("list runs: %v", err)
	}
	if len(runs) != 2 || runs[0].Status != "failed" || runs[1].Status != "success" {
		t.Fatalf("runs = %+v", runs)
	}
	if runs[0].AttemptCount != 1 || runs[1].AttemptCount != 2 {
		t.Fatalf("attempt counts = %d/%d", runs[0].AttemptCount, runs[1].AttemptCount)
	}
}

func TestCheckinSchedulerRunsDueBatchOncePerLocalDay(t *testing.T) {
	requestCount := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/checkin":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "scheduled",
				"data":    map[string]any{"balance": 18.5, "currency": "USD"},
			})
		case "/status":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "ok",
				"data":    map[string]any{"logged_in": true, "balance": 20.5, "currency": "USD"},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()

	db, err := gorm.Open(sqlite.Open("file:settings-scheduler-loop?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	if err := db.Create(&models.SystemSetting{
		ID:               1,
		Timezone:         "Asia/Shanghai",
		ScheduleEnabled:  true,
		DailyRunTime:     "09:00",
		RequestTimeout:   5,
		OnlyEnabledSites: true,
	}).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	site := schedulerNowTestSite(upstream.URL, true)
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	lastRun := CheckinSchedulerLastRun{}
	runner := CheckinSchedulerRunner{
		App: &App{DB: db, PluginManager: plugins.NewManager()},
		Now: func() time.Time {
			return time.Date(2026, 6, 2, 9, 1, 0, 0, time.FixedZone("CST", 8*60*60))
		},
	}
	if !runner.RunDue(context.Background(), &lastRun) {
		t.Fatalf("scheduler did not run")
	}
	if runner.RunDue(context.Background(), &lastRun) {
		t.Fatalf("scheduler ran twice in one local day")
	}
	lastRun = CheckinSchedulerLastRun{}
	if runner.RunDue(context.Background(), &lastRun) {
		t.Fatalf("scheduler ignored existing scheduled run after restart")
	}
	if requestCount != 2 {
		t.Fatalf("request count = %d, want checkin and status requests once", requestCount)
	}
	var runs []models.CheckinRun
	if err := db.Order("id asc").Find(&runs).Error; err != nil {
		t.Fatalf("list runs: %v", err)
	}
	if len(runs) != 1 || runs[0].TriggerType != "scheduled" || runs[0].Status != "success" {
		t.Fatalf("runs = %+v", runs)
	}
}

func TestCheckinSchedulerUsesReopenedRuntimeDatabase(t *testing.T) {
	requestCount := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/checkin":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "scheduled on imported db",
				"data":    map[string]any{"balance": 18.5, "currency": "USD"},
			})
		case "/status":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "ok",
				"data":    map[string]any{"logged_in": true, "balance": 20.5, "currency": "USD"},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()

	tempDir := t.TempDir()
	oldPath := filepath.Join(tempDir, "old.db")
	newPath := filepath.Join(tempDir, "new.db")
	oldDB, err := database.Open(config.Config{DatabaseURL: "sqlite:///" + filepath.ToSlash(oldPath)})
	if err != nil {
		t.Fatalf("open old db: %v", err)
	}
	if err := oldDB.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("migrate old db: %v", err)
	}
	if err := oldDB.Create(&models.SystemSetting{
		ID:              1,
		Timezone:        "Asia/Shanghai",
		ScheduleEnabled: false,
		DailyRunTime:    "09:00",
		RequestTimeout:  5,
	}).Error; err != nil {
		t.Fatalf("create old settings: %v", err)
	}

	seedDB, err := database.Open(config.Config{DatabaseURL: "sqlite:///" + filepath.ToSlash(newPath)})
	if err != nil {
		t.Fatalf("open new db: %v", err)
	}
	if err := seedDB.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("migrate new db: %v", err)
	}
	if err := seedDB.Create(&models.SystemSetting{
		ID:                       1,
		Timezone:                 "Asia/Shanghai",
		ScheduleEnabled:          true,
		DailyRunTime:             "09:00",
		RequestTimeout:           5,
		OnlyEnabledSites:         true,
		CheckinConcurrency:       1,
		CheckinGlobalConcurrency: 1,
		CheckinIntervalSeconds:   0,
	}).Error; err != nil {
		t.Fatalf("create new settings: %v", err)
	}
	site := schedulerNowTestSite(upstream.URL, true)
	if err := seedDB.Create(&site).Error; err != nil {
		t.Fatalf("create new site: %v", err)
	}
	if err := database.Close(seedDB); err != nil {
		t.Fatalf("close seed db: %v", err)
	}

	app := &App{
		DB:            oldDB,
		Cfg:           config.Config{DatabaseURL: "sqlite:///" + filepath.ToSlash(oldPath)},
		PluginManager: plugins.NewManager(),
	}
	if err := app.reopenDatabase(newPath); err != nil {
		t.Fatalf("reopen database: %v", err)
	}
	t.Cleanup(func() {
		_ = database.Close(app.DB)
	})

	lastRun := CheckinSchedulerLastRun{}
	runner := CheckinSchedulerRunner{
		App: app,
		Now: func() time.Time {
			return time.Date(2026, 6, 2, 9, 1, 0, 0, time.FixedZone("CST", 8*60*60))
		},
	}
	if !runner.RunDue(context.Background(), &lastRun) {
		t.Fatal("scheduler did not run on reopened db")
	}
	if requestCount != 2 {
		t.Fatalf("request count = %d, want checkin and status requests", requestCount)
	}

	var newRunCount int64
	if err := app.DB.Model(&models.CheckinRun{}).Where("trigger_type = ?", "scheduled").Count(&newRunCount).Error; err != nil {
		t.Fatalf("count new runs: %v", err)
	}
	if newRunCount != 1 {
		t.Fatalf("new db scheduled run count = %d", newRunCount)
	}
	verifyOldDB, err := database.Open(config.Config{DatabaseURL: "sqlite:///" + filepath.ToSlash(oldPath)})
	if err != nil {
		t.Fatalf("reopen old db: %v", err)
	}
	defer database.Close(verifyOldDB)
	var oldRunCount int64
	if err := verifyOldDB.Model(&models.CheckinRun{}).Count(&oldRunCount).Error; err != nil {
		t.Fatalf("count old runs: %v", err)
	}
	if oldRunCount != 0 {
		t.Fatalf("old db run count = %d", oldRunCount)
	}
}

func TestCheckinSchedulerDoesNotReuseLastRunDateAcrossReopenedDatabase(t *testing.T) {
	requestCount := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/checkin":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "scheduled after switch",
				"data":    map[string]any{"balance": 18.5, "currency": "USD"},
			})
		case "/status":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "ok",
				"data":    map[string]any{"logged_in": true, "balance": 20.5, "currency": "USD"},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()

	tempDir := t.TempDir()
	oldPath := filepath.Join(tempDir, "old-ran.db")
	newPath := filepath.Join(tempDir, "new-needs-run.db")
	oldDB, err := database.Open(config.Config{DatabaseURL: "sqlite:///" + filepath.ToSlash(oldPath)})
	if err != nil {
		t.Fatalf("open old db: %v", err)
	}
	if err := oldDB.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("migrate old db: %v", err)
	}
	if err := oldDB.Create(&models.SystemSetting{
		ID:                       1,
		Timezone:                 "Asia/Shanghai",
		ScheduleEnabled:          true,
		DailyRunTime:             "09:00",
		RequestTimeout:           5,
		OnlyEnabledSites:         true,
		CheckinConcurrency:       1,
		CheckinGlobalConcurrency: 1,
		CheckinIntervalSeconds:   0,
	}).Error; err != nil {
		t.Fatalf("create old settings: %v", err)
	}
	oldSite := schedulerNowTestSite(upstream.URL, true)
	oldSite.Name = "old"
	if err := oldDB.Create(&oldSite).Error; err != nil {
		t.Fatalf("create old site: %v", err)
	}

	newDB, err := database.Open(config.Config{DatabaseURL: "sqlite:///" + filepath.ToSlash(newPath)})
	if err != nil {
		t.Fatalf("open new db: %v", err)
	}
	if err := newDB.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("migrate new db: %v", err)
	}
	if err := newDB.Create(&models.SystemSetting{
		ID:                       1,
		Timezone:                 "Asia/Shanghai",
		ScheduleEnabled:          true,
		DailyRunTime:             "09:00",
		RequestTimeout:           5,
		OnlyEnabledSites:         true,
		CheckinConcurrency:       1,
		CheckinGlobalConcurrency: 1,
		CheckinIntervalSeconds:   0,
	}).Error; err != nil {
		t.Fatalf("create new settings: %v", err)
	}
	newSite := schedulerNowTestSite(upstream.URL, true)
	newSite.Name = "new"
	if err := newDB.Create(&newSite).Error; err != nil {
		t.Fatalf("create new site: %v", err)
	}
	if err := database.Close(newDB); err != nil {
		t.Fatalf("close new db: %v", err)
	}

	app := &App{
		DB:            oldDB,
		Cfg:           config.Config{DatabaseURL: "sqlite:///" + filepath.ToSlash(oldPath)},
		PluginManager: plugins.NewManager(),
	}
	t.Cleanup(func() {
		_ = database.Close(app.DB)
	})
	lastRun := CheckinSchedulerLastRun{}
	runner := CheckinSchedulerRunner{
		App: app,
		Now: func() time.Time {
			return time.Date(2026, 6, 2, 9, 1, 0, 0, time.FixedZone("CST", 8*60*60))
		},
	}
	if !runner.RunDue(context.Background(), &lastRun) {
		t.Fatal("scheduler did not run on old db")
	}
	if err := app.reopenDatabase(newPath); err != nil {
		t.Fatalf("reopen database: %v", err)
	}
	if !runner.RunDue(context.Background(), &lastRun) {
		t.Fatal("scheduler reused old db last-run date")
	}

	var newRunCount int64
	if err := app.DB.Model(&models.CheckinRun{}).Where("trigger_type = ?", "scheduled").Count(&newRunCount).Error; err != nil {
		t.Fatalf("count new runs: %v", err)
	}
	if newRunCount != 1 {
		t.Fatalf("new db scheduled run count = %d", newRunCount)
	}
	if requestCount != 4 {
		t.Fatalf("request count = %d, want two scheduled batches", requestCount)
	}
}

func TestReopenDatabaseSeedsSystemSettingsForLegacyImportedDatabase(t *testing.T) {
	tempDir := t.TempDir()
	oldPath := filepath.Join(tempDir, "current.db")
	legacyPath := filepath.Join(tempDir, "legacy-import.db")
	oldDB, err := database.Open(config.Config{DatabaseURL: "sqlite:///" + filepath.ToSlash(oldPath)})
	if err != nil {
		t.Fatalf("open old db: %v", err)
	}
	if err := oldDB.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("migrate old db: %v", err)
	}
	createLegacyAdminOnlyDatabase(t, legacyPath)

	app := &App{
		DB: oldDB,
		Cfg: config.Config{
			DatabaseURL:       "sqlite:///" + filepath.ToSlash(oldPath),
			SchedulerTimezone: "UTC",
			GatewayAPIKey:     "gateway-key",
		},
	}
	t.Cleanup(func() {
		_ = database.Close(app.DB)
	})
	if err := app.reopenDatabase(legacyPath); err != nil {
		t.Fatalf("reopen legacy db: %v", err)
	}

	var settings models.SystemSetting
	if err := app.DB.First(&settings, 1).Error; err != nil {
		t.Fatalf("read seeded settings: %v", err)
	}
	if settings.Timezone != "UTC" || settings.GatewayAPIKey != "gateway-key" {
		t.Fatalf("settings defaults = timezone %q, gateway key %q", settings.Timezone, settings.GatewayAPIKey)
	}
	var adminCount int64
	if err := app.DB.Model(&models.AdminUser{}).Count(&adminCount).Error; err != nil {
		t.Fatalf("count admins: %v", err)
	}
	if adminCount != 1 {
		t.Fatalf("admin count = %d", adminCount)
	}
}

func TestValidateImportedDatabaseSeedsSystemSettingsForLegacyDatabase(t *testing.T) {
	legacyPath := filepath.Join(t.TempDir(), "legacy-validate.db")
	createLegacyAdminOnlyDatabase(t, legacyPath)

	cfg := config.Config{
		SchedulerTimezone: "UTC",
		GatewayAPIKey:     "gateway-key",
	}
	if err := validateImportedDatabase(legacyPath, cfg); err != nil {
		t.Fatalf("validate legacy db: %v", err)
	}
	db, err := database.Open(config.Config{DatabaseURL: "sqlite:///" + filepath.ToSlash(legacyPath)})
	if err != nil {
		t.Fatalf("open validated db: %v", err)
	}
	defer database.Close(db)
	var settings models.SystemSetting
	if err := db.First(&settings, 1).Error; err != nil {
		t.Fatalf("read seeded settings: %v", err)
	}
	if settings.Timezone != "UTC" || settings.GatewayAPIKey != "gateway-key" {
		t.Fatalf("settings defaults = timezone %q, gateway key %q", settings.Timezone, settings.GatewayAPIKey)
	}
}

func TestCheckinSchedulerRunDueShortCircuitsWhenCanceledOrMissingApp(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if (CheckinSchedulerRunner{}).RunDue(ctx, nil) {
		t.Fatal("canceled nil runner reported a run")
	}
	if (CheckinSchedulerRunner{App: &App{}}).RunDue(context.Background(), nil) {
		t.Fatal("runner without db reported a run")
	}
}

func TestCheckinSchedulerScheduledRunExistsUsesLocalDayWindow(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:settings-scheduler-dst-window?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	location, err := time.LoadLocation("America/New_York")
	if err != nil {
		t.Fatalf("load location: %v", err)
	}
	runAt := time.Date(2026, 3, 9, 0, 30, 0, 0, location).UTC()
	if err := db.Create(&models.CheckinRun{
		TriggerType: "scheduled",
		Status:      "success",
		StartedAt:   runAt,
	}).Error; err != nil {
		t.Fatalf("create run: %v", err)
	}

	runner := CheckinSchedulerRunner{App: &App{DB: db}}
	previousDay := time.Date(2026, 3, 8, 12, 0, 0, 0, location)
	exists, err := runner.scheduledRunExists(previousDay, location)
	if err != nil {
		t.Fatalf("scheduledRunExists previous day: %v", err)
	}
	if exists {
		t.Fatal("spring-forward day included the next local day run")
	}
	nextDay := time.Date(2026, 3, 9, 12, 0, 0, 0, location)
	exists, err = runner.scheduledRunExists(nextDay, location)
	if err != nil {
		t.Fatalf("scheduledRunExists next day: %v", err)
	}
	if !exists {
		t.Fatal("next local day did not include scheduled run")
	}
}

func schedulerNowTestSite(baseURL string, enabled bool) models.Site {
	return models.Site{
		Name:      "enabled",
		BaseURL:   baseURL,
		PluginKey: "http-relay-station",
		IsEnabled: enabled,
		Credentials: models.JSONMap{
			"account": "demo",
		},
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
			"default_balance_unit":      "USD",
		},
	}
}

func createLegacyAdminOnlyDatabase(t *testing.T, path string) {
	t.Helper()
	db, err := database.Open(config.Config{DatabaseURL: "sqlite:///" + filepath.ToSlash(path)})
	if err != nil {
		t.Fatalf("open legacy db: %v", err)
	}
	if err := db.Exec(`CREATE TABLE admin_users (
		id INTEGER PRIMARY KEY,
		username TEXT NOT NULL,
		password_hash TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`).Error; err != nil {
		t.Fatalf("create legacy admin table: %v", err)
	}
	if err := db.Exec(`INSERT INTO admin_users (username, password_hash) VALUES ('legacy-admin', 'hash')`).Error; err != nil {
		t.Fatalf("insert legacy admin: %v", err)
	}
	if err := database.Close(db); err != nil {
		t.Fatalf("close legacy db: %v", err)
	}
}
