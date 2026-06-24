package migrations

import (
	"strings"
	"testing"

	"ai-sign-in-gateway/internal/config"
	"ai-sign-in-gateway/internal/database"
	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/seed"
)

func TestApplyAddsGatewayModelColumnsToExistingSchema(t *testing.T) {
	db, err := database.Open(config.Config{DatabaseURL: "sqlite:///" + t.TempDir() + "/legacy.db"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = database.Close(db) })

	statements := []string{
		`CREATE TABLE admin_users (
			id INTEGER PRIMARY KEY,
			username TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE system_settings (id INTEGER PRIMARY KEY)`,
		`CREATE TABLE sites (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			base_url TEXT NOT NULL,
			plugin_key TEXT NOT NULL,
			is_enabled BOOLEAN NOT NULL DEFAULT 1,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE gateway_route_states (
			id INTEGER PRIMARY KEY,
			site_id INTEGER NOT NULL,
			key_fingerprint TEXT NOT NULL DEFAULT '',
			key_name TEXT NOT NULL DEFAULT '',
			key_source TEXT NOT NULL DEFAULT '',
			group_name TEXT NOT NULL DEFAULT '',
			route_priority INTEGER NOT NULL DEFAULT 100,
			weight INTEGER NOT NULL DEFAULT 1,
			is_enabled BOOLEAN NOT NULL DEFAULT 1,
			circuit_state TEXT NOT NULL DEFAULT 'closed',
			consecutive_failures INTEGER NOT NULL DEFAULT 0,
			request_count INTEGER NOT NULL DEFAULT 0,
			success_count INTEGER NOT NULL DEFAULT 0,
			failure_count INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE gateway_request_logs (
			id INTEGER PRIMARY KEY,
			request_id TEXT NOT NULL DEFAULT '',
			site_id INTEGER,
			key_fingerprint TEXT NOT NULL DEFAULT '',
			key_name TEXT NOT NULL DEFAULT '',
			group_name TEXT NOT NULL DEFAULT '',
			target_path TEXT NOT NULL DEFAULT '',
			method TEXT NOT NULL DEFAULT 'GET',
			route_strategy TEXT NOT NULL DEFAULT 'round_robin',
			attempt_index INTEGER NOT NULL DEFAULT 1,
			success BOOLEAN NOT NULL DEFAULT 0,
			circuit_state_before TEXT NOT NULL DEFAULT 'closed',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
	}
	for _, statement := range statements {
		if err := db.Exec(statement).Error; err != nil {
			t.Fatal(err)
		}
	}

	if err := Apply(db); err != nil {
		t.Fatal(err)
	}

	for _, item := range []struct {
		table  string
		column string
	}{
		{"gateway_route_states", "model_probe_status"},
		{"gateway_route_states", "model_probe_message"},
		{"gateway_route_states", "model_probe_updated_at"},
		{"gateway_route_states", "manual_request_base_urls"},
		{"gateway_request_logs", "requested_model"},
		{"gateway_request_logs", "actual_model"},
		{"gateway_request_logs", "route_type"},
		{"gateway_request_logs", "cache_read_tokens"},
		{"gateway_request_logs", "cache_write_tokens"},
		{"sites", "group_name"},
		{"sites", "credentials"},
		{"sites", "plugin_config"},
		{"sites", "last_balance"},
		{"admin_users", "role"},
		{"admin_users", "is_enabled"},
		{"admin_users", "last_login_at"},
		{"admin_users", "updated_at"},
		{"system_settings", "log_retention_days"},
		{"system_settings", "gateway_pricing_active_scheme_id"},
		{"system_settings", "gateway_pricing_schemes"},
		{"chat_sessions", "last_message_text"},
		{"chat_messages", "reference_images"},
		{"site_queue_tasks", "task_key"},
		{"site_queue_tasks", "action_label"},
	} {
		if !db.Migrator().HasColumn(item.table, item.column) {
			t.Fatalf("missing column %s.%s", item.table, item.column)
		}
	}
}

func TestApplyCreatesQueueTableForUpgradedSchema(t *testing.T) {
	db, err := database.Open(config.Config{DatabaseURL: "sqlite:///" + t.TempDir() + "/legacy-queue.db"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = database.Close(db) })

	statements := []string{
		`CREATE TABLE admin_users (
			id INTEGER PRIMARY KEY,
			username TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE sites (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			base_url TEXT NOT NULL,
			plugin_key TEXT NOT NULL,
			is_enabled BOOLEAN NOT NULL DEFAULT 1,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
	}
	for _, statement := range statements {
		if err := db.Exec(statement).Error; err != nil {
			t.Fatal(err)
		}
	}

	if err := Apply(db); err != nil {
		t.Fatal(err)
	}

	if !db.Migrator().HasTable("site_queue_tasks") {
		t.Fatal("missing site_queue_tasks table after migration")
	}
	if !db.Migrator().HasColumn("site_queue_tasks", "status") {
		t.Fatal("missing site_queue_tasks.status column after migration")
	}
	for _, table := range []any{
		&models.CheckinRun{},
		&models.SystemSetting{},
		&models.GatewayRouteState{},
		&models.GatewayRequestLog{},
	} {
		if !db.Migrator().HasTable(table) {
			t.Fatalf("missing core runtime table %T after migration", table)
		}
	}
	if err := seed.InitialData(db, config.Config{
		DefaultAdminUsername: "admin",
		DefaultAdminPassword: "password",
		SchedulerTimezone:    "Asia/Shanghai",
	}); err != nil {
		t.Fatalf("seed initial data after migration: %v", err)
	}
	if err := db.Create(&models.GatewayRequestLog{RequestID: "req-upgraded"}).Error; err != nil {
		t.Fatalf("insert request log after migration: %v", err)
	}
	site := models.Site{
		Name:         "upgraded",
		BaseURL:      "https://example.com",
		PluginKey:    "yellowpeach-newapi",
		IsEnabled:    true,
		Credentials:  models.JSONMap{"cookie": "session=1"},
		PluginConfig: models.JSONMap{"include_in_checkin": true},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("insert site after migration: %v", err)
	}
	var storedSite models.Site
	if err := db.First(&storedSite, site.ID).Error; err != nil {
		t.Fatalf("read site after migration: %v", err)
	}
	if storedSite.Credentials["cookie"] != "session=1" {
		t.Fatalf("site credentials after migration = %#v", storedSite.Credentials)
	}
	if err := db.Exec(`INSERT INTO site_queue_tasks (site_id, task_key, title) VALUES (1, 'review', 'Review')`).Error; err != nil {
		t.Fatalf("insert queue task: %v", err)
	}
}

func TestApplyNormalizesLegacyGptChatRouteTypes(t *testing.T) {
	db, err := database.Open(config.Config{DatabaseURL: "sqlite:///" + t.TempDir() + "/legacy-route-types.db"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = database.Close(db) })

	statements := []string{
		`CREATE TABLE admin_users (
			id INTEGER PRIMARY KEY,
			username TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE system_settings (id INTEGER PRIMARY KEY)`,
		`CREATE TABLE gateway_route_states (
			id INTEGER PRIMARY KEY,
			site_id INTEGER NOT NULL,
			key_fingerprint TEXT NOT NULL DEFAULT '',
			route_type TEXT NOT NULL DEFAULT 'codex',
			route_path TEXT NOT NULL DEFAULT '',
			route_priority INTEGER NOT NULL DEFAULT 100,
			circuit_state TEXT NOT NULL DEFAULT 'closed',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE gateway_request_logs (
			id INTEGER PRIMARY KEY,
			request_id TEXT NOT NULL DEFAULT '',
			site_id INTEGER,
			key_fingerprint TEXT NOT NULL DEFAULT '',
			key_name TEXT NOT NULL DEFAULT '',
			group_name TEXT NOT NULL DEFAULT '',
			target_path TEXT NOT NULL DEFAULT '',
			method TEXT NOT NULL DEFAULT 'GET',
			route_strategy TEXT NOT NULL DEFAULT 'round_robin',
			attempt_index INTEGER NOT NULL DEFAULT 1,
			success BOOLEAN NOT NULL DEFAULT 0,
			circuit_state_before TEXT NOT NULL DEFAULT 'closed',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`INSERT INTO gateway_route_states (id, site_id, key_fingerprint, route_type, route_path) VALUES (1, 1, 'key-1', 'gpt_chat', '')`,
		`INSERT INTO gateway_route_states (id, site_id, key_fingerprint, route_type, route_path) VALUES (2, 1, 'key-2', 'codex', '')`,
	}
	for _, statement := range statements {
		if err := db.Exec(statement).Error; err != nil {
			t.Fatal(err)
		}
	}

	if err := Apply(db); err != nil {
		t.Fatal(err)
	}

	var routeType string
	if err := db.Raw("SELECT route_type FROM gateway_route_states WHERE id = 1").Scan(&routeType).Error; err != nil {
		t.Fatal(err)
	}
	if routeType != "gpt" {
		t.Fatalf("legacy route_type = %q, want gpt", routeType)
	}
	var routePath string
	if err := db.Raw("SELECT route_path FROM gateway_route_states WHERE id = 1").Scan(&routePath).Error; err != nil {
		t.Fatal(err)
	}
	if routePath != "chat/completions" {
		t.Fatalf("legacy route_path = %q, want chat/completions", routePath)
	}
}

func TestFreshAdminUsernameColumnAllowsMultibyteLimit(t *testing.T) {
	db, err := database.Open(config.Config{DatabaseURL: "sqlite:///" + t.TempDir() + "/fresh-admin-width.db"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = database.Close(db) })

	if err := Apply(db); err != nil {
		t.Fatal(err)
	}

	var createSQL string
	if err := db.Raw("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'admin_users'").Scan(&createSQL).Error; err != nil {
		t.Fatal(err)
	}
	if strings.Contains(strings.ToLower(createSQL), "varchar(50)") {
		t.Fatalf("admin username column still uses 50-width schema: %s", createSQL)
	}
}
