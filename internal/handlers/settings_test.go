package handlers

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"ai-sign-in-gateway/internal/config"
	"ai-sign-in-gateway/internal/database"
	"ai-sign-in-gateway/internal/models"
	"github.com/glebarez/sqlite"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func TestGetSettingsIncludesRuntimeInfo(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:settings-runtime-info?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	settings := models.SystemSetting{
		ID:                       1,
		Timezone:                 "Asia/Shanghai",
		ScheduleEnabled:          true,
		DailyRunTime:             "09:00",
		CheckinConcurrency:       1,
		CheckinGlobalConcurrency: 4,
		CheckinIntervalSeconds:   1,
		RetryCount:               1,
		RequestTimeout:           20,
		OnlyEnabledSites:         true,
		DesktopKeepRunning:       true,
	}
	if err := db.Create(&settings).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}

	SetRuntimeInfo(RuntimeInfo{
		FrontendURL:                 "http://127.0.0.1:3722",
		FrontendDefaultPort:         3721,
		FrontendPort:                3722,
		FrontendDefaultPortOccupant: "python3(pid:4321)",
		BackendURL:                  "http://127.0.0.1:8973",
		BackendDefaultPort:          8972,
		BackendPort:                 8973,
		BackendDefaultPortOccupant:  "ai-sign-in-gateway(pid:1234)",
		GatewayURL:                  "http://127.0.0.1:8973/api/gateway",
	})
	t.Cleanup(func() {
		SetRuntimeInfo(RuntimeInfo{})
	})

	req := httptest.NewRequest(http.MethodGet, "/api/settings", nil)
	recorder := httptest.NewRecorder()
	app := &App{DB: db}

	app.GetSettings(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body.String())
	}

	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response["desktop_frontend_url"] != "http://127.0.0.1:3722" {
		t.Fatalf("desktop_frontend_url = %v", response["desktop_frontend_url"])
	}
	if response["desktop_backend_url"] != "http://127.0.0.1:8973" {
		t.Fatalf("desktop_backend_url = %v", response["desktop_backend_url"])
	}
	if response["desktop_gateway_url"] != "http://127.0.0.1:8973/api/gateway" {
		t.Fatalf("desktop_gateway_url = %v", response["desktop_gateway_url"])
	}
	if response["desktop_frontend_default_port_occupant"] != "python3(pid:4321)" {
		t.Fatalf("desktop_frontend_default_port_occupant = %v", response["desktop_frontend_default_port_occupant"])
	}
	if response["desktop_backend_default_port_occupant"] != "ai-sign-in-gateway(pid:1234)" {
		t.Fatalf("desktop_backend_default_port_occupant = %v", response["desktop_backend_default_port_occupant"])
	}
	if warnings, ok := response["security_warnings"].([]any); !ok || len(warnings) == 0 {
		t.Fatalf("security_warnings = %#v", response["security_warnings"])
	}
	if response["log_retention_days"] != float64(5) {
		t.Fatalf("log_retention_days = %v", response["log_retention_days"])
	}
	if response["gateway_pricing_active_scheme_id"] != "official" {
		t.Fatalf("gateway_pricing_active_scheme_id = %v", response["gateway_pricing_active_scheme_id"])
	}
	if schemes, ok := response["gateway_pricing_schemes"].([]any); !ok || len(schemes) == 0 {
		t.Fatalf("gateway_pricing_schemes = %#v", response["gateway_pricing_schemes"])
	}
}

func TestGetSettingsUsesDefaultsWhenSettingsRowIsMissing(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:settings-get-missing-row-defaults?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/settings", nil)
	(&App{DB: db, Cfg: config.Config{SchedulerTimezone: "UTC", GatewayAPIKey: "gateway-key"}}).GetSettings(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body.String())
	}
	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response["timezone"] != "UTC" {
		t.Fatalf("timezone = %v", response["timezone"])
	}
	if response["request_timeout"] != float64(20) {
		t.Fatalf("request_timeout = %v", response["request_timeout"])
	}
	if warnings, ok := response["security_warnings"].([]any); !ok || len(warnings) != 1 {
		t.Fatalf("security_warnings = %#v", response["security_warnings"])
	}
}

func TestUpdateSettingsPersistsLogRetentionDaysAndPrunesOldLogs(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:settings-log-retention?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	if err := db.Create(&models.SystemSetting{ID: 1, Timezone: "Asia/Shanghai", LogRetentionDays: 5}).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	now := time.Now().UTC()
	oldTime := now.AddDate(0, 0, -4)
	recentTime := now.AddDate(0, 0, -1)
	if err := db.Create(&[]models.CheckinRun{
		{Status: "success", Message: "old", StartedAt: oldTime},
		{Status: "success", Message: "recent", StartedAt: recentTime},
	}).Error; err != nil {
		t.Fatalf("create checkin runs: %v", err)
	}
	if err := db.Create(&[]models.GatewayRequestLog{
		{RequestID: "old", Method: "POST", CreatedAt: oldTime},
		{RequestID: "recent", Method: "POST", CreatedAt: recentTime},
	}).Error; err != nil {
		t.Fatalf("create gateway logs: %v", err)
	}

	payload := map[string]any{
		"timezone":                         "Asia/Shanghai",
		"schedule_enabled":                 true,
		"daily_run_time":                   "09:00",
		"checkin_concurrency":              1,
		"checkin_global_concurrency":       4,
		"checkin_interval_seconds":         1,
		"retry_count":                      1,
		"request_timeout":                  20,
		"only_enabled_sites":               true,
		"desktop_keep_running":             false,
		"database_backup_enabled":          false,
		"database_backup_dir":              "",
		"database_backup_interval_minutes": 1440,
		"database_backup_retention":        7,
		"log_retention_days":               3,
		"feature_flags":                    map[string]bool{},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/settings", bytes.NewReader(body))
	app := &App{DB: db}
	app.UpdateSettings(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body.String())
	}
	var settings models.SystemSetting
	if err := db.First(&settings, 1).Error; err != nil {
		t.Fatal(err)
	}
	if settings.LogRetentionDays != 3 {
		t.Fatalf("log retention days = %d, want 3", settings.LogRetentionDays)
	}
	var checkinCount int64
	if err := db.Model(&models.CheckinRun{}).Count(&checkinCount).Error; err != nil {
		t.Fatal(err)
	}
	if checkinCount != 1 {
		t.Fatalf("checkin count = %d, want 1", checkinCount)
	}
	var gatewayCount int64
	if err := db.Model(&models.GatewayRequestLog{}).Count(&gatewayCount).Error; err != nil {
		t.Fatal(err)
	}
	if gatewayCount != 1 {
		t.Fatalf("gateway log count = %d, want 1", gatewayCount)
	}
}

func TestUpdateSettingsPreservesFieldsMissingFromPartialPayload(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:settings-partial-update?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	if err := db.Create(&models.SystemSetting{
		ID:                            1,
		Timezone:                      "Asia/Shanghai",
		ScheduleEnabled:               true,
		DailyRunTime:                  "09:00",
		CheckinConcurrency:            2,
		CheckinGlobalConcurrency:      8,
		CheckinIntervalSeconds:        3,
		RetryCount:                    4,
		RequestTimeout:                30,
		OnlyEnabledSites:              true,
		DesktopKeepRunning:            true,
		DatabaseBackupEnabled:         true,
		DatabaseBackupDir:             "/tmp/backups",
		DatabaseBackupIntervalMinutes: 720,
		DatabaseBackupRetention:       14,
		LogRetentionDays:              9,
		GatewayPricingActiveSchemeID:  "official",
		GatewayPricingSchemes:         "[]",
		FeatureFlags:                  models.JSONMap{"gateway": true},
	}).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	body, err := json.Marshal(map[string]any{"log_retention_days": 11})
	if err != nil {
		t.Fatal(err)
	}

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/settings", bytes.NewReader(body))
	(&App{DB: db}).UpdateSettings(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body.String())
	}
	var settings models.SystemSetting
	if err := db.First(&settings, 1).Error; err != nil {
		t.Fatal(err)
	}
	if settings.LogRetentionDays != 11 {
		t.Fatalf("log retention days = %d, want 11", settings.LogRetentionDays)
	}
	if !settings.ScheduleEnabled || !settings.DesktopKeepRunning || !settings.DatabaseBackupEnabled {
		t.Fatalf("bool settings were reset: schedule=%v desktop=%v backup=%v", settings.ScheduleEnabled, settings.DesktopKeepRunning, settings.DatabaseBackupEnabled)
	}
	if settings.RequestTimeout != 30 || settings.DatabaseBackupIntervalMinutes != 720 || settings.DatabaseBackupRetention != 14 {
		t.Fatalf("numeric settings changed: timeout=%d interval=%d retention=%d", settings.RequestTimeout, settings.DatabaseBackupIntervalMinutes, settings.DatabaseBackupRetention)
	}
	if settings.DatabaseBackupDir != "/tmp/backups" {
		t.Fatalf("backup dir = %q", settings.DatabaseBackupDir)
	}
	if enabled, ok := settings.FeatureFlags["gateway"].(bool); !ok || !enabled {
		t.Fatalf("feature flags = %#v", settings.FeatureFlags)
	}
}

func TestUpdateSettingsUsesConfiguredTimezoneWhenSettingsRowIsMissing(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:settings-missing-row-defaults?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	body, err := json.Marshal(map[string]any{"log_retention_days": 11})
	if err != nil {
		t.Fatal(err)
	}

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/settings", bytes.NewReader(body))
	(&App{DB: db, Cfg: config.Config{SchedulerTimezone: "UTC"}}).UpdateSettings(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body.String())
	}
	var settings models.SystemSetting
	if err := db.First(&settings, 1).Error; err != nil {
		t.Fatal(err)
	}
	if settings.Timezone != "UTC" {
		t.Fatalf("timezone = %q, want UTC", settings.Timezone)
	}
	if settings.LogRetentionDays != 11 {
		t.Fatalf("log retention days = %d, want 11", settings.LogRetentionDays)
	}
}

func TestUpdateSettingsRejectsInvalidTimezone(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:settings-invalid-timezone?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	if err := db.Create(&models.SystemSetting{ID: 1, Timezone: "Asia/Shanghai"}).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	payload := settingsUpdatePayload(map[string]any{"timezone": "Not/AZone"})
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/settings", bytes.NewReader(body))
	(&App{DB: db}).UpdateSettings(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body.String())
	}
	var settings models.SystemSetting
	if err := db.First(&settings, 1).Error; err != nil {
		t.Fatal(err)
	}
	if settings.Timezone != "Asia/Shanghai" {
		t.Fatalf("timezone = %q", settings.Timezone)
	}
}

func TestUpdateSettingsRejectsNonObjectJSON(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:settings-non-object-json?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	if err := db.Create(&models.SystemSetting{ID: 1, Timezone: "Asia/Shanghai", LogRetentionDays: 9}).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/settings", bytes.NewReader([]byte("null")))
	(&App{DB: db}).UpdateSettings(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body.String())
	}
	var settings models.SystemSetting
	if err := db.First(&settings, 1).Error; err != nil {
		t.Fatal(err)
	}
	if settings.LogRetentionDays != 9 {
		t.Fatalf("log retention days = %d, want 9", settings.LogRetentionDays)
	}
}

func TestUpdateSettingsNormalizesTimezoneWhitespace(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:settings-timezone-whitespace?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	if err := db.Create(&models.SystemSetting{ID: 1, Timezone: "Asia/Shanghai"}).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	payload := settingsUpdatePayload(map[string]any{"timezone": "  UTC  "})
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/settings", bytes.NewReader(body))
	(&App{DB: db}).UpdateSettings(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body.String())
	}
	var settings models.SystemSetting
	if err := db.First(&settings, 1).Error; err != nil {
		t.Fatal(err)
	}
	if settings.Timezone != "UTC" {
		t.Fatalf("timezone = %q", settings.Timezone)
	}
}

func settingsUpdatePayload(overrides map[string]any) map[string]any {
	payload := map[string]any{
		"timezone":                         "Asia/Shanghai",
		"schedule_enabled":                 true,
		"daily_run_time":                   "09:00",
		"checkin_concurrency":              1,
		"checkin_global_concurrency":       4,
		"checkin_interval_seconds":         1,
		"retry_count":                      1,
		"request_timeout":                  20,
		"only_enabled_sites":               true,
		"desktop_keep_running":             false,
		"database_backup_enabled":          false,
		"database_backup_dir":              "",
		"database_backup_interval_minutes": 1440,
		"database_backup_retention":        7,
		"log_retention_days":               3,
		"feature_flags":                    map[string]bool{},
	}
	for key, value := range overrides {
		payload[key] = value
	}
	return payload
}

func TestImportRuntimeDatabaseCopiesAndReopensDB(t *testing.T) {
	tempDir := t.TempDir()
	currentPath := filepath.Join(tempDir, "current", "ai-sign-in-gateway.db")
	sourcePath := filepath.Join(tempDir, "source.db")

	currentDB := openTestSQLite(t, currentPath)
	if err := currentDB.Create(&models.AdminUser{Username: "old", PasswordHash: "old-hash"}).Error; err != nil {
		t.Fatalf("create current admin: %v", err)
	}
	sourceDB := openTestSQLite(t, sourcePath)
	if err := sourceDB.Create(&models.AdminUser{Username: "imported", PasswordHash: "imported-hash"}).Error; err != nil {
		t.Fatalf("create source admin: %v", err)
	}
	if err := database.Close(sourceDB); err != nil {
		t.Fatalf("close source db: %v", err)
	}

	SetRuntimeInfo(RuntimeInfo{
		ConfigDir:    filepath.Dir(currentPath),
		DatabasePath: currentPath,
	})
	t.Cleanup(func() {
		SetRuntimeInfo(RuntimeInfo{})
	})

	body := []byte(`{"database_path":` + strconvQuote(sourcePath) + `}`)
	req := httptest.NewRequest(http.MethodPost, "/api/settings/runtime/database", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	app := &App{
		DB:  currentDB,
		Cfg: config.Config{DatabaseURL: "sqlite:///" + filepath.ToSlash(currentPath)},
	}

	app.ImportRuntimeDatabase(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body.String())
	}
	var imported models.AdminUser
	if err := app.DB.Where("username = ?", "imported").First(&imported).Error; err != nil {
		t.Fatalf("imported admin not found after reopen: %v", err)
	}
	var oldCount int64
	if err := app.DB.Model(&models.AdminUser{}).Where("username = ?", "old").Count(&oldCount).Error; err != nil {
		t.Fatalf("count old admin: %v", err)
	}
	if oldCount != 0 {
		t.Fatalf("old admin count = %d", oldCount)
	}

	matches, err := filepath.Glob(currentPath + ".backup-*")
	if err != nil {
		t.Fatalf("glob backup: %v", err)
	}
	if len(matches) != 1 {
		t.Fatalf("backup count = %d, want 1", len(matches))
	}
}

func TestImportRuntimeDatabaseUploadCopiesAndReopensDB(t *testing.T) {
	tempDir := t.TempDir()
	currentPath := filepath.Join(tempDir, "current", "ai-sign-in-gateway.db")
	sourcePath := filepath.Join(tempDir, "source.db")

	currentDB := openTestSQLite(t, currentPath)
	if err := currentDB.Create(&models.AdminUser{Username: "old", PasswordHash: "old-hash"}).Error; err != nil {
		t.Fatalf("create current admin: %v", err)
	}
	sourceDB := openTestSQLite(t, sourcePath)
	if err := sourceDB.Create(&models.AdminUser{Username: "uploaded", PasswordHash: "uploaded-hash"}).Error; err != nil {
		t.Fatalf("create source admin: %v", err)
	}
	if err := database.Close(sourceDB); err != nil {
		t.Fatalf("close source db: %v", err)
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("database", "source.db")
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	sourceFile, err := os.Open(sourcePath)
	if err != nil {
		t.Fatalf("open source: %v", err)
	}
	if _, err := io.Copy(part, sourceFile); err != nil {
		_ = sourceFile.Close()
		t.Fatalf("copy source to multipart: %v", err)
	}
	if err := sourceFile.Close(); err != nil {
		t.Fatalf("close source file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	SetRuntimeInfo(RuntimeInfo{
		ConfigDir:    filepath.Dir(currentPath),
		DatabasePath: currentPath,
	})
	t.Cleanup(func() {
		SetRuntimeInfo(RuntimeInfo{})
	})

	req := httptest.NewRequest(http.MethodPost, "/api/settings/runtime/database", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	recorder := httptest.NewRecorder()
	app := &App{
		DB:  currentDB,
		Cfg: config.Config{DatabaseURL: "sqlite:///" + filepath.ToSlash(currentPath)},
	}

	app.ImportRuntimeDatabase(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body.String())
	}
	var uploaded models.AdminUser
	if err := app.DB.Where("username = ?", "uploaded").First(&uploaded).Error; err != nil {
		t.Fatalf("uploaded admin not found after reopen: %v", err)
	}
}

func TestRuntimeDatabaseBackupLifecycle(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "data", "ai-sign-in-gateway.db")
	backupDir := filepath.Join(tempDir, "backups")
	db := openTestSQLite(t, dbPath)
	if err := db.Create(&models.AdminUser{Username: "admin", PasswordHash: "hash"}).Error; err != nil {
		t.Fatalf("create admin: %v", err)
	}
	settings := models.SystemSetting{
		ID:                            1,
		Timezone:                      "Asia/Shanghai",
		DatabaseBackupEnabled:         true,
		DatabaseBackupDir:             backupDir,
		DatabaseBackupIntervalMinutes: 1440,
		DatabaseBackupRetention:       7,
	}
	if err := db.Create(&settings).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	SetRuntimeInfo(RuntimeInfo{
		ConfigDir:    filepath.Dir(dbPath),
		DatabasePath: dbPath,
	})
	t.Cleanup(func() {
		SetRuntimeInfo(RuntimeInfo{})
	})

	app := &App{DB: db}
	createRecorder := httptest.NewRecorder()
	app.BackupRuntimeDatabaseNow(createRecorder, httptest.NewRequest(http.MethodPost, "/api/settings/runtime/database/backups", nil))
	if createRecorder.Code != http.StatusOK {
		t.Fatalf("create status = %d body = %s", createRecorder.Code, createRecorder.Body.String())
	}
	var createResponse struct {
		Backup struct {
			Name string `json:"name"`
		} `json:"backup"`
		Backups []any `json:"backups"`
	}
	if err := json.Unmarshal(createRecorder.Body.Bytes(), &createResponse); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	if createResponse.Backup.Name == "" || len(createResponse.Backups) != 1 {
		t.Fatalf("unexpected create response: %+v", createResponse)
	}

	listRecorder := httptest.NewRecorder()
	app.ListRuntimeDatabaseBackups(listRecorder, httptest.NewRequest(http.MethodGet, "/api/settings/runtime/database/backups", nil))
	if listRecorder.Code != http.StatusOK {
		t.Fatalf("list status = %d body = %s", listRecorder.Code, listRecorder.Body.String())
	}

	deleteReq := httptest.NewRequest(http.MethodDelete, "/api/settings/runtime/database/backups/"+createResponse.Backup.Name, nil)
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("name", createResponse.Backup.Name)
	deleteReq = deleteReq.WithContext(context.WithValue(deleteReq.Context(), chi.RouteCtxKey, routeCtx))
	deleteRecorder := httptest.NewRecorder()
	app.DeleteRuntimeDatabaseBackup(deleteRecorder, deleteReq)
	if deleteRecorder.Code != http.StatusOK {
		t.Fatalf("delete status = %d body = %s", deleteRecorder.Code, deleteRecorder.Body.String())
	}
	if _, err := os.Stat(filepath.Join(backupDir, createResponse.Backup.Name)); !os.IsNotExist(err) {
		t.Fatalf("backup file still exists or stat failed unexpectedly: %v", err)
	}
}

func TestRuntimeDatabaseBackupFallsBackFromForeignLinuxHomeDir(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "data", "ai-sign-in-gateway.db")
	defaultBackupDir := filepath.Join(filepath.Dir(dbPath), "backups")
	db := openTestSQLite(t, dbPath)
	if err := db.Create(&models.AdminUser{Username: "admin", PasswordHash: "hash"}).Error; err != nil {
		t.Fatalf("create admin: %v", err)
	}
	settings := models.SystemSetting{
		ID:                    1,
		Timezone:              "Asia/Shanghai",
		DatabaseBackupEnabled: true,
		DatabaseBackupDir:     "/home/__ai_gateway_foreign_user__/.ai-sign-in-gateway/backups",
	}
	if err := db.Create(&settings).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	SetRuntimeInfo(RuntimeInfo{
		ConfigDir:    filepath.Dir(dbPath),
		DatabasePath: dbPath,
	})
	t.Cleanup(func() {
		SetRuntimeInfo(RuntimeInfo{})
	})

	app := &App{DB: db}
	createRecorder := httptest.NewRecorder()
	app.BackupRuntimeDatabaseNow(createRecorder, httptest.NewRequest(http.MethodPost, "/api/settings/runtime/database/backups", nil))
	if createRecorder.Code != http.StatusOK {
		t.Fatalf("create status = %d body = %s", createRecorder.Code, createRecorder.Body.String())
	}
	var createResponse struct {
		BackupDir string `json:"backup_dir"`
		Backup    struct {
			Name string `json:"name"`
			Path string `json:"path"`
		} `json:"backup"`
	}
	if err := json.Unmarshal(createRecorder.Body.Bytes(), &createResponse); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	if createResponse.BackupDir != defaultBackupDir {
		t.Fatalf("backup dir = %q, want %q", createResponse.BackupDir, defaultBackupDir)
	}
	if _, err := os.Stat(createResponse.Backup.Path); err != nil {
		t.Fatalf("backup file missing: %v", err)
	}
}

func TestDownloadRuntimeDatabaseBackup(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "data", "ai-sign-in-gateway.db")
	backupDir := filepath.Join(tempDir, "backups")
	db := openTestSQLite(t, dbPath)
	if err := db.Create(&models.AdminUser{Username: "admin", PasswordHash: "hash"}).Error; err != nil {
		t.Fatalf("create admin: %v", err)
	}
	settings := models.SystemSetting{
		ID:                    1,
		Timezone:              "Asia/Shanghai",
		DatabaseBackupEnabled: true,
		DatabaseBackupDir:     backupDir,
	}
	if err := db.Create(&settings).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	SetRuntimeInfo(RuntimeInfo{
		ConfigDir:    filepath.Dir(dbPath),
		DatabasePath: dbPath,
	})
	t.Cleanup(func() {
		SetRuntimeInfo(RuntimeInfo{})
	})

	app := &App{DB: db}
	createRecorder := httptest.NewRecorder()
	app.BackupRuntimeDatabaseNow(createRecorder, httptest.NewRequest(http.MethodPost, "/api/settings/runtime/database/backups", nil))
	if createRecorder.Code != http.StatusOK {
		t.Fatalf("create status = %d body = %s", createRecorder.Code, createRecorder.Body.String())
	}
	var createResponse struct {
		Backup struct {
			Name string `json:"name"`
		} `json:"backup"`
	}
	if err := json.Unmarshal(createRecorder.Body.Bytes(), &createResponse); err != nil {
		t.Fatalf("decode create response: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/settings/runtime/database/backups/"+createResponse.Backup.Name+"/download", nil)
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("name", createResponse.Backup.Name)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, routeCtx))
	recorder := httptest.NewRecorder()
	app.DownloadRuntimeDatabaseBackup(recorder, req)
	if recorder.Code != http.StatusOK {
		t.Fatalf("download status = %d body = %s", recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Disposition"); got == "" {
		t.Fatalf("missing content disposition")
	}
	if !bytes.HasPrefix(recorder.Body.Bytes(), []byte("SQLite format 3\x00")) {
		t.Fatalf("download does not look like sqlite")
	}
}

func TestDownloadRuntimeConfigArchive(t *testing.T) {
	tempDir := t.TempDir()
	configDir := filepath.Join(tempDir, "config")
	if err := os.MkdirAll(filepath.Join(configDir, "logs"), 0o755); err != nil {
		t.Fatalf("mkdir config: %v", err)
	}
	if err := os.WriteFile(filepath.Join(configDir, "launcher.json"), []byte(`{"active_config_dir":"`+configDir+`"}`), 0o600); err != nil {
		t.Fatalf("write launcher: %v", err)
	}
	if err := os.WriteFile(filepath.Join(configDir, "logs", "shell.log"), []byte("hello"), 0o600); err != nil {
		t.Fatalf("write log: %v", err)
	}
	dbPath := filepath.Join(configDir, "ai-sign-in-gateway.db")
	db := openTestSQLite(t, dbPath)
	if err := db.Create(&models.SystemSetting{ID: 1, Timezone: "Asia/Shanghai"}).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	SetRuntimeInfo(RuntimeInfo{
		ConfigDir:    configDir,
		DatabasePath: dbPath,
	})
	t.Cleanup(func() {
		SetRuntimeInfo(RuntimeInfo{})
	})

	recorder := httptest.NewRecorder()
	(&App{DB: db}).DownloadRuntimeConfigArchive(recorder, httptest.NewRequest(http.MethodGet, "/api/settings/runtime/config-dir/archive", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("archive status = %d body = %s", recorder.Code, recorder.Body.String())
	}
	reader, err := zip.NewReader(bytes.NewReader(recorder.Body.Bytes()), int64(recorder.Body.Len()))
	if err != nil {
		t.Fatalf("open zip: %v", err)
	}
	names := map[string]bool{}
	for _, file := range reader.File {
		names[file.Name] = true
	}
	for _, name := range []string{"launcher.json", "logs/shell.log", "ai-sign-in-gateway.db"} {
		if !names[name] {
			t.Fatalf("zip missing %s, got %#v", name, names)
		}
	}
}

func openTestSQLite(t *testing.T, path string) *gorm.DB {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir sqlite dir %s: %v", path, err)
	}
	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite %s: %v", path, err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate %s: %v", path, err)
	}
	return db
}

func strconvQuote(value string) string {
	data, _ := json.Marshal(value)
	return string(data)
}
