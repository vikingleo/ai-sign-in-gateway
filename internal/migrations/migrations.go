package migrations

import (
	"strings"

	"ai-sign-in-gateway/internal/database"
	"ai-sign-in-gateway/internal/features"
	"ai-sign-in-gateway/internal/models"
	"gorm.io/gorm"
)

func Apply(db *gorm.DB) error {
	// Detect whether this DB was previously bootstrapped by the Python backend.
	// In that case GORM's AutoMigrate would try to rebuild a few tables
	// (e.g. admin_users) and silently drop NOT NULL columns. Skip AutoMigrate
	// when an existing schema is detected and only run idempotent ALTER/CREATE
	// statements via ensureIndexes / addMissingColumns.
	if isFreshDatabase(db) {
		if err := database.AutoMigrate(db); err != nil {
			return err
		}
	} else {
		if err := ensureCoreRuntimeTables(db); err != nil {
			return err
		}
		if err := addMissingColumns(db); err != nil {
			return err
		}
	}
	if err := ensureChatSessionTables(db); err != nil {
		return err
	}
	if err := ensureGatewayConcurrencyPeakTable(db); err != nil {
		return err
	}
	if err := ensureGatewayRouteGroupTables(db); err != nil {
		return err
	}
	if err := ensureSiteQueueTaskTable(db); err != nil {
		return err
	}
	if err := normalizeGatewayRouteTypes(db); err != nil {
		return err
	}
	if err := features.AutoMigrate(db); err != nil {
		return err
	}
	if err := database.NormalizeAdminUsers(db); err != nil {
		return err
	}
	return ensureIndexes(db)
}

func isFreshDatabase(db *gorm.DB) bool {
	var count int64
	if err := db.Raw("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'admin_users'").Scan(&count).Error; err != nil {
		return true
	}
	return count == 0
}

func addMissingColumns(db *gorm.DB) error {
	routePathExisted := db.Migrator().HasColumn("gateway_route_states", "route_path")
	type columnPatch struct {
		table     string
		column    string
		statement string
	}
	patches := []columnPatch{
		{table: "admin_users", column: "role", statement: "ALTER TABLE admin_users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'"},
		{table: "admin_users", column: "is_enabled", statement: "ALTER TABLE admin_users ADD COLUMN is_enabled BOOLEAN NOT NULL DEFAULT 1"},
		{table: "admin_users", column: "last_login_at", statement: "ALTER TABLE admin_users ADD COLUMN last_login_at DATETIME"},
		{table: "admin_users", column: "updated_at", statement: "ALTER TABLE admin_users ADD COLUMN updated_at DATETIME"},
		{table: "sites", column: "group_name", statement: "ALTER TABLE sites ADD COLUMN group_name TEXT NOT NULL DEFAULT ''"},
		{table: "sites", column: "notes", statement: "ALTER TABLE sites ADD COLUMN notes TEXT NOT NULL DEFAULT ''"},
		{table: "sites", column: "credentials", statement: "ALTER TABLE sites ADD COLUMN credentials JSON NOT NULL DEFAULT '{}'"},
		{table: "sites", column: "plugin_config", statement: "ALTER TABLE sites ADD COLUMN plugin_config JSON NOT NULL DEFAULT '{}'"},
		{table: "sites", column: "last_status", statement: "ALTER TABLE sites ADD COLUMN last_status TEXT"},
		{table: "sites", column: "last_message", statement: "ALTER TABLE sites ADD COLUMN last_message TEXT"},
		{table: "sites", column: "last_balance", statement: "ALTER TABLE sites ADD COLUMN last_balance FLOAT"},
		{table: "sites", column: "last_run_at", statement: "ALTER TABLE sites ADD COLUMN last_run_at DATETIME"},
		{table: "sites", column: "created_at", statement: "ALTER TABLE sites ADD COLUMN created_at DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'"},
		{table: "sites", column: "updated_at", statement: "ALTER TABLE sites ADD COLUMN updated_at DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'"},
		{table: "checkin_runs", column: "site_id", statement: "ALTER TABLE checkin_runs ADD COLUMN site_id INTEGER"},
		{table: "checkin_runs", column: "trigger_type", statement: "ALTER TABLE checkin_runs ADD COLUMN trigger_type TEXT NOT NULL DEFAULT 'manual'"},
		{table: "checkin_runs", column: "status", statement: "ALTER TABLE checkin_runs ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'"},
		{table: "checkin_runs", column: "message", statement: "ALTER TABLE checkin_runs ADD COLUMN message TEXT NOT NULL DEFAULT ''"},
		{table: "checkin_runs", column: "response_excerpt", statement: "ALTER TABLE checkin_runs ADD COLUMN response_excerpt TEXT"},
		{table: "checkin_runs", column: "balance", statement: "ALTER TABLE checkin_runs ADD COLUMN balance FLOAT"},
		{table: "checkin_runs", column: "attempt_count", statement: "ALTER TABLE checkin_runs ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 1"},
		{table: "checkin_runs", column: "started_at", statement: "ALTER TABLE checkin_runs ADD COLUMN started_at DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'"},
		{table: "checkin_runs", column: "finished_at", statement: "ALTER TABLE checkin_runs ADD COLUMN finished_at DATETIME"},
		{table: "gateway_request_logs", column: "request_id", statement: "ALTER TABLE gateway_request_logs ADD COLUMN request_id TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_request_logs", column: "is_stream", statement: "ALTER TABLE gateway_request_logs ADD COLUMN is_stream BOOLEAN NOT NULL DEFAULT 0"},
		{table: "gateway_request_logs", column: "route_state_id", statement: "ALTER TABLE gateway_request_logs ADD COLUMN route_state_id INTEGER"},
		{table: "gateway_request_logs", column: "site_id", statement: "ALTER TABLE gateway_request_logs ADD COLUMN site_id INTEGER"},
		{table: "gateway_request_logs", column: "key_fingerprint", statement: "ALTER TABLE gateway_request_logs ADD COLUMN key_fingerprint TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_request_logs", column: "key_name", statement: "ALTER TABLE gateway_request_logs ADD COLUMN key_name TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_request_logs", column: "group_name", statement: "ALTER TABLE gateway_request_logs ADD COLUMN group_name TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_request_logs", column: "prompt_tokens", statement: "ALTER TABLE gateway_request_logs ADD COLUMN prompt_tokens INTEGER"},
		{table: "gateway_request_logs", column: "cached_input_tokens", statement: "ALTER TABLE gateway_request_logs ADD COLUMN cached_input_tokens INTEGER"},
		{table: "gateway_request_logs", column: "cache_read_tokens", statement: "ALTER TABLE gateway_request_logs ADD COLUMN cache_read_tokens INTEGER"},
		{table: "gateway_request_logs", column: "cache_write_tokens", statement: "ALTER TABLE gateway_request_logs ADD COLUMN cache_write_tokens INTEGER"},
		{table: "gateway_request_logs", column: "completion_tokens", statement: "ALTER TABLE gateway_request_logs ADD COLUMN completion_tokens INTEGER"},
		{table: "gateway_request_logs", column: "total_tokens", statement: "ALTER TABLE gateway_request_logs ADD COLUMN total_tokens INTEGER"},
		{table: "gateway_request_logs", column: "usage_cost", statement: "ALTER TABLE gateway_request_logs ADD COLUMN usage_cost FLOAT"},
		{table: "gateway_request_logs", column: "model", statement: "ALTER TABLE gateway_request_logs ADD COLUMN model TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_request_logs", column: "requested_model", statement: "ALTER TABLE gateway_request_logs ADD COLUMN requested_model TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_request_logs", column: "actual_model", statement: "ALTER TABLE gateway_request_logs ADD COLUMN actual_model TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_request_logs", column: "route_type", statement: "ALTER TABLE gateway_request_logs ADD COLUMN route_type TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_request_logs", column: "target_path", statement: "ALTER TABLE gateway_request_logs ADD COLUMN target_path TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_request_logs", column: "request_url", statement: "ALTER TABLE gateway_request_logs ADD COLUMN request_url TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_request_logs", column: "user_agent", statement: "ALTER TABLE gateway_request_logs ADD COLUMN user_agent TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_request_logs", column: "method", statement: "ALTER TABLE gateway_request_logs ADD COLUMN method TEXT NOT NULL DEFAULT 'GET'"},
		{table: "gateway_request_logs", column: "route_strategy", statement: "ALTER TABLE gateway_request_logs ADD COLUMN route_strategy TEXT NOT NULL DEFAULT 'round_robin'"},
		{table: "gateway_request_logs", column: "attempt_index", statement: "ALTER TABLE gateway_request_logs ADD COLUMN attempt_index INTEGER NOT NULL DEFAULT 1"},
		{table: "gateway_request_logs", column: "status_code", statement: "ALTER TABLE gateway_request_logs ADD COLUMN status_code INTEGER"},
		{table: "gateway_request_logs", column: "success", statement: "ALTER TABLE gateway_request_logs ADD COLUMN success BOOLEAN NOT NULL DEFAULT 0"},
		{table: "gateway_request_logs", column: "latency_ms", statement: "ALTER TABLE gateway_request_logs ADD COLUMN latency_ms FLOAT"},
		{table: "gateway_request_logs", column: "circuit_state_before", statement: "ALTER TABLE gateway_request_logs ADD COLUMN circuit_state_before TEXT NOT NULL DEFAULT 'closed'"},
		{table: "gateway_request_logs", column: "failure_reason", statement: "ALTER TABLE gateway_request_logs ADD COLUMN failure_reason TEXT"},
		{table: "gateway_request_logs", column: "created_at", statement: "ALTER TABLE gateway_request_logs ADD COLUMN created_at DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'"},
		{table: "gateway_route_states", column: "site_id", statement: "ALTER TABLE gateway_route_states ADD COLUMN site_id INTEGER NOT NULL DEFAULT 0"},
		{table: "gateway_route_states", column: "key_fingerprint", statement: "ALTER TABLE gateway_route_states ADD COLUMN key_fingerprint TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_route_states", column: "key_name", statement: "ALTER TABLE gateway_route_states ADD COLUMN key_name TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_route_states", column: "key_source", statement: "ALTER TABLE gateway_route_states ADD COLUMN key_source TEXT NOT NULL DEFAULT 'site'"},
		{table: "gateway_route_states", column: "ewma_latency_ms", statement: "ALTER TABLE gateway_route_states ADD COLUMN ewma_latency_ms FLOAT"},
		{table: "system_settings", column: "timezone", statement: "ALTER TABLE system_settings ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai'"},
		{table: "system_settings", column: "schedule_enabled", statement: "ALTER TABLE system_settings ADD COLUMN schedule_enabled BOOLEAN NOT NULL DEFAULT 1"},
		{table: "system_settings", column: "daily_run_time", statement: "ALTER TABLE system_settings ADD COLUMN daily_run_time TEXT NOT NULL DEFAULT '09:00'"},
		{table: "system_settings", column: "checkin_concurrency", statement: "ALTER TABLE system_settings ADD COLUMN checkin_concurrency INTEGER NOT NULL DEFAULT 1"},
		{table: "system_settings", column: "checkin_global_concurrency", statement: "ALTER TABLE system_settings ADD COLUMN checkin_global_concurrency INTEGER NOT NULL DEFAULT 4"},
		{table: "system_settings", column: "checkin_interval_seconds", statement: "ALTER TABLE system_settings ADD COLUMN checkin_interval_seconds INTEGER NOT NULL DEFAULT 1"},
		{table: "system_settings", column: "retry_count", statement: "ALTER TABLE system_settings ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 1"},
		{table: "system_settings", column: "request_timeout", statement: "ALTER TABLE system_settings ADD COLUMN request_timeout INTEGER NOT NULL DEFAULT 20"},
		{table: "system_settings", column: "only_enabled_sites", statement: "ALTER TABLE system_settings ADD COLUMN only_enabled_sites BOOLEAN NOT NULL DEFAULT 1"},
		{table: "system_settings", column: "desktop_keep_running", statement: "ALTER TABLE system_settings ADD COLUMN desktop_keep_running BOOLEAN NOT NULL DEFAULT 0"},
		{table: "system_settings", column: "database_backup_enabled", statement: "ALTER TABLE system_settings ADD COLUMN database_backup_enabled BOOLEAN NOT NULL DEFAULT 0"},
		{table: "system_settings", column: "database_backup_dir", statement: "ALTER TABLE system_settings ADD COLUMN database_backup_dir TEXT NOT NULL DEFAULT ''"},
		{table: "system_settings", column: "database_backup_interval_minutes", statement: "ALTER TABLE system_settings ADD COLUMN database_backup_interval_minutes INTEGER NOT NULL DEFAULT 1440"},
		{table: "system_settings", column: "database_backup_retention", statement: "ALTER TABLE system_settings ADD COLUMN database_backup_retention INTEGER NOT NULL DEFAULT 7"},
		{table: "system_settings", column: "log_retention_days", statement: "ALTER TABLE system_settings ADD COLUMN log_retention_days INTEGER NOT NULL DEFAULT 5"},
		{table: "system_settings", column: "gateway_pricing_active_scheme_id", statement: "ALTER TABLE system_settings ADD COLUMN gateway_pricing_active_scheme_id TEXT NOT NULL DEFAULT 'official'"},
		{table: "system_settings", column: "gateway_pricing_schemes", statement: "ALTER TABLE system_settings ADD COLUMN gateway_pricing_schemes TEXT NOT NULL DEFAULT '[]'"},
		{table: "system_settings", column: "feature_flags", statement: "ALTER TABLE system_settings ADD COLUMN feature_flags JSON NOT NULL DEFAULT '{}'"},
		{table: "system_settings", column: "gateway_route_strategy", statement: "ALTER TABLE system_settings ADD COLUMN gateway_route_strategy TEXT NOT NULL DEFAULT 'round_robin'"},
		{table: "system_settings", column: "gateway_failure_threshold", statement: "ALTER TABLE system_settings ADD COLUMN gateway_failure_threshold INTEGER NOT NULL DEFAULT 3"},
		{table: "system_settings", column: "gateway_cooldown_seconds", statement: "ALTER TABLE system_settings ADD COLUMN gateway_cooldown_seconds INTEGER NOT NULL DEFAULT 180"},
		{table: "system_settings", column: "gateway_request_timeout", statement: "ALTER TABLE system_settings ADD COLUMN gateway_request_timeout INTEGER NOT NULL DEFAULT 60"},
		{table: "system_settings", column: "gateway_max_attempts", statement: "ALTER TABLE system_settings ADD COLUMN gateway_max_attempts INTEGER NOT NULL DEFAULT 0"},
		{table: "system_settings", column: "gateway_route_concurrency_limit", statement: "ALTER TABLE system_settings ADD COLUMN gateway_route_concurrency_limit INTEGER NOT NULL DEFAULT 5"},
		{table: "system_settings", column: "gateway_smart_latency_bias", statement: "ALTER TABLE system_settings ADD COLUMN gateway_smart_latency_bias FLOAT NOT NULL DEFAULT 1"},
		{table: "system_settings", column: "gateway_smart_concurrency_bias", statement: "ALTER TABLE system_settings ADD COLUMN gateway_smart_concurrency_bias FLOAT NOT NULL DEFAULT 1.5"},
		{table: "system_settings", column: "gateway_smart_failure_bias", statement: "ALTER TABLE system_settings ADD COLUMN gateway_smart_failure_bias FLOAT NOT NULL DEFAULT 1"},
		{table: "system_settings", column: "gateway_smart_priority_bias", statement: "ALTER TABLE system_settings ADD COLUMN gateway_smart_priority_bias FLOAT NOT NULL DEFAULT 0.5"},
		{table: "system_settings", column: "gateway_failure_retry_mode", statement: "ALTER TABLE system_settings ADD COLUMN gateway_failure_retry_mode TEXT NOT NULL DEFAULT 'retryable'"},
		{table: "system_settings", column: "gateway_concurrency_transfer_strategy", statement: "ALTER TABLE system_settings ADD COLUMN gateway_concurrency_transfer_strategy TEXT NOT NULL DEFAULT 'limit_only'"},
		{table: "system_settings", column: "gateway_concurrency_overflow_strategy", statement: "ALTER TABLE system_settings ADD COLUMN gateway_concurrency_overflow_strategy TEXT NOT NULL DEFAULT 'latency_first'"},
		{table: "system_settings", column: "gateway_api_key", statement: "ALTER TABLE system_settings ADD COLUMN gateway_api_key TEXT NOT NULL DEFAULT ''"},
		{table: "system_settings", column: "site_group_catalog", statement: "ALTER TABLE system_settings ADD COLUMN site_group_catalog TEXT NOT NULL DEFAULT '[]'"},
		{table: "system_settings", column: "updated_at", statement: "ALTER TABLE system_settings ADD COLUMN updated_at DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'"},
		{table: "gateway_route_states", column: "site_name_snapshot", statement: "ALTER TABLE gateway_route_states ADD COLUMN site_name_snapshot TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_route_states", column: "site_base_url_snapshot", statement: "ALTER TABLE gateway_route_states ADD COLUMN site_base_url_snapshot TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_route_states", column: "site_api_url_snapshot", statement: "ALTER TABLE gateway_route_states ADD COLUMN site_api_url_snapshot TEXT NOT NULL DEFAULT '[]'"},
		{table: "gateway_route_states", column: "manual_request_base_urls", statement: "ALTER TABLE gateway_route_states ADD COLUMN manual_request_base_urls TEXT NOT NULL DEFAULT '[]'"},
		{table: "gateway_route_states", column: "last_request_base_url", statement: "ALTER TABLE gateway_route_states ADD COLUMN last_request_base_url TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_route_states", column: "last_balance", statement: "ALTER TABLE gateway_route_states ADD COLUMN last_balance FLOAT"},
		{table: "gateway_route_states", column: "balance_unit", statement: "ALTER TABLE gateway_route_states ADD COLUMN balance_unit TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_route_states", column: "balance_probe_url", statement: "ALTER TABLE gateway_route_states ADD COLUMN balance_probe_url TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_route_states", column: "route_type", statement: "ALTER TABLE gateway_route_states ADD COLUMN route_type TEXT NOT NULL DEFAULT 'codex'"},
		{table: "gateway_route_states", column: "route_type_manual", statement: "ALTER TABLE gateway_route_states ADD COLUMN route_type_manual BOOLEAN NOT NULL DEFAULT 0"},
		{table: "gateway_route_states", column: "route_path", statement: "ALTER TABLE gateway_route_states ADD COLUMN route_path TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_route_states", column: "route_path_manual", statement: "ALTER TABLE gateway_route_states ADD COLUMN route_path_manual BOOLEAN NOT NULL DEFAULT 0"},
		{table: "gateway_route_states", column: "supported_models", statement: "ALTER TABLE gateway_route_states ADD COLUMN supported_models TEXT NOT NULL DEFAULT '[]'"},
		{table: "gateway_route_states", column: "model_probe_status", statement: "ALTER TABLE gateway_route_states ADD COLUMN model_probe_status TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_route_states", column: "model_probe_message", statement: "ALTER TABLE gateway_route_states ADD COLUMN model_probe_message TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_route_states", column: "model_probe_updated_at", statement: "ALTER TABLE gateway_route_states ADD COLUMN model_probe_updated_at DATETIME"},
		{table: "gateway_route_states", column: "group_name", statement: "ALTER TABLE gateway_route_states ADD COLUMN group_name TEXT NOT NULL DEFAULT ''"},
		{table: "gateway_route_states", column: "route_priority", statement: "ALTER TABLE gateway_route_states ADD COLUMN route_priority INTEGER NOT NULL DEFAULT 100"},
		{table: "gateway_route_states", column: "route_priority_manual", statement: "ALTER TABLE gateway_route_states ADD COLUMN route_priority_manual BOOLEAN NOT NULL DEFAULT 0"},
		{table: "gateway_route_states", column: "weight", statement: "ALTER TABLE gateway_route_states ADD COLUMN weight INTEGER NOT NULL DEFAULT 1"},
		{table: "gateway_route_states", column: "is_enabled", statement: "ALTER TABLE gateway_route_states ADD COLUMN is_enabled BOOLEAN NOT NULL DEFAULT 1"},
		{table: "gateway_route_states", column: "is_enabled_manual", statement: "ALTER TABLE gateway_route_states ADD COLUMN is_enabled_manual BOOLEAN NOT NULL DEFAULT 0"},
		{table: "gateway_route_states", column: "circuit_state", statement: "ALTER TABLE gateway_route_states ADD COLUMN circuit_state TEXT NOT NULL DEFAULT 'closed'"},
		{table: "gateway_route_states", column: "consecutive_failures", statement: "ALTER TABLE gateway_route_states ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0"},
		{table: "gateway_route_states", column: "request_count", statement: "ALTER TABLE gateway_route_states ADD COLUMN request_count INTEGER NOT NULL DEFAULT 0"},
		{table: "gateway_route_states", column: "success_count", statement: "ALTER TABLE gateway_route_states ADD COLUMN success_count INTEGER NOT NULL DEFAULT 0"},
		{table: "gateway_route_states", column: "failure_count", statement: "ALTER TABLE gateway_route_states ADD COLUMN failure_count INTEGER NOT NULL DEFAULT 0"},
		{table: "gateway_route_states", column: "avg_latency_ms", statement: "ALTER TABLE gateway_route_states ADD COLUMN avg_latency_ms FLOAT"},
		{table: "gateway_route_states", column: "last_latency_ms", statement: "ALTER TABLE gateway_route_states ADD COLUMN last_latency_ms FLOAT"},
		{table: "gateway_route_states", column: "last_status_code", statement: "ALTER TABLE gateway_route_states ADD COLUMN last_status_code INTEGER"},
		{table: "gateway_route_states", column: "last_error", statement: "ALTER TABLE gateway_route_states ADD COLUMN last_error TEXT"},
		{table: "gateway_route_states", column: "last_used_at", statement: "ALTER TABLE gateway_route_states ADD COLUMN last_used_at DATETIME"},
		{table: "gateway_route_states", column: "last_success_at", statement: "ALTER TABLE gateway_route_states ADD COLUMN last_success_at DATETIME"},
		{table: "gateway_route_states", column: "last_failure_at", statement: "ALTER TABLE gateway_route_states ADD COLUMN last_failure_at DATETIME"},
		{table: "gateway_route_states", column: "circuit_opened_at", statement: "ALTER TABLE gateway_route_states ADD COLUMN circuit_opened_at DATETIME"},
		{table: "gateway_route_states", column: "circuit_open_until", statement: "ALTER TABLE gateway_route_states ADD COLUMN circuit_open_until DATETIME"},
		{table: "gateway_route_states", column: "created_at", statement: "ALTER TABLE gateway_route_states ADD COLUMN created_at DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'"},
		{table: "gateway_route_states", column: "updated_at", statement: "ALTER TABLE gateway_route_states ADD COLUMN updated_at DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'"},
	}
	for _, patch := range patches {
		if db.Migrator().HasColumn(patch.table, patch.column) {
			continue
		}
		if err := db.Exec(patch.statement).Error; err != nil {
			if isDuplicateColumnErr(err) {
				continue
			}
			return err
		}
	}
	if !routePathExisted {
		return backfillGatewayRoutePath(db)
	}
	return nil
}

func backfillGatewayRoutePath(db *gorm.DB) error {
	if !db.Migrator().HasColumn("gateway_route_states", "route_path") {
		return nil
	}
	if err := db.Exec("UPDATE gateway_route_states SET route_path = 'chat/completions' WHERE route_path = '' AND route_type = 'gpt'").Error; err != nil {
		return err
	}
	if err := db.Exec("UPDATE gateway_route_states SET route_path = 'responses' WHERE route_path = '' AND route_type = 'codex'").Error; err != nil {
		return err
	}
	return nil
}

func normalizeGatewayRouteTypes(db *gorm.DB) error {
	if !db.Migrator().HasColumn("gateway_route_states", "route_type") {
		return nil
	}
	if err := db.Exec("UPDATE gateway_route_states SET route_type = 'gpt' WHERE route_type IN ('gpt_chat', 'gptchat', 'gpt-chat')").Error; err != nil {
		return err
	}
	if db.Migrator().HasColumn("gateway_route_states", "route_path") {
		return db.Exec("UPDATE gateway_route_states SET route_path = 'chat/completions' WHERE route_path = '' AND route_type = 'gpt'").Error
	}
	return nil
}

func isDuplicateColumnErr(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "duplicate column name") || strings.Contains(msg, "already exists")
}

func ensureCoreRuntimeTables(db *gorm.DB) error {
	tables := []any{
		&models.Site{},
		&models.CheckinRun{},
		&models.SystemSetting{},
		&models.GatewayRouteState{},
		&models.GatewayRequestLog{},
	}
	for _, table := range tables {
		if db.Migrator().HasTable(table) {
			continue
		}
		if err := db.Migrator().CreateTable(table); err != nil {
			return err
		}
	}
	return nil
}

func ensureChatSessionTables(db *gorm.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS chat_sessions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL DEFAULT '',
			site_id INTEGER,
			site_name TEXT NOT NULL DEFAULT '',
			model TEXT NOT NULL DEFAULT '',
			mode TEXT NOT NULL DEFAULT 'chat',
			route_type TEXT NOT NULL DEFAULT '',
			key_fingerprint TEXT NOT NULL DEFAULT '',
			key_name TEXT NOT NULL DEFAULT '',
			image_size TEXT NOT NULL DEFAULT '',
			image_width INTEGER NOT NULL DEFAULT 0,
			image_height INTEGER NOT NULL DEFAULT 0,
			message_count INTEGER NOT NULL DEFAULT 0,
			last_message_text TEXT NOT NULL DEFAULT '',
			created_at DATETIME,
			updated_at DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS chat_messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id INTEGER NOT NULL,
			seq INTEGER NOT NULL,
			role TEXT NOT NULL,
			content TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT 'done',
			mode TEXT NOT NULL DEFAULT '',
			latency_ms FLOAT,
			status_code INTEGER,
			error TEXT NOT NULL DEFAULT '',
			reference_images JSON NOT NULL DEFAULT '{}',
			images JSON NOT NULL DEFAULT '{}',
			created_at DATETIME,
			updated_at DATETIME,
			CONSTRAINT fk_chat_sessions_messages FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
		)`,
	}
	for _, statement := range statements {
		if err := db.Exec(statement).Error; err != nil {
			return err
		}
	}
	return nil
}

func ensureGatewayConcurrencyPeakTable(db *gorm.DB) error {
	return db.Exec(`CREATE TABLE IF NOT EXISTS gateway_concurrency_peaks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		day TEXT NOT NULL UNIQUE,
		max_concurrency INTEGER NOT NULL DEFAULT 0,
		updated_at DATETIME
	)`).Error
}

func ensureGatewayRouteGroupTables(db *gorm.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS gateway_route_groups (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			api_key TEXT NOT NULL DEFAULT '',
			created_at DATETIME,
			updated_at DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS gateway_route_group_members (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			group_id INTEGER NOT NULL,
			route_state_id INTEGER NOT NULL,
			created_at DATETIME,
			CONSTRAINT fk_gateway_route_group_members_group FOREIGN KEY (group_id) REFERENCES gateway_route_groups(id) ON DELETE CASCADE,
			CONSTRAINT fk_gateway_route_group_members_route_state FOREIGN KEY (route_state_id) REFERENCES gateway_route_states(id) ON DELETE CASCADE,
			CONSTRAINT uq_gateway_route_group_member UNIQUE (group_id, route_state_id)
		)`,
	}
	for _, statement := range statements {
		if err := db.Exec(statement).Error; err != nil {
			return err
		}
	}
	return nil
}

func ensureSiteQueueTaskTable(db *gorm.DB) error {
	return db.Exec(`CREATE TABLE IF NOT EXISTS site_queue_tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		site_id INTEGER NOT NULL,
		task_key TEXT NOT NULL,
		title TEXT NOT NULL,
		detail TEXT NOT NULL DEFAULT '',
		status TEXT NOT NULL DEFAULT 'pending',
		sort_order INTEGER NOT NULL DEFAULT 0,
		action_key TEXT NOT NULL DEFAULT '',
		action_label TEXT NOT NULL DEFAULT '',
		last_message TEXT,
		last_error TEXT,
		completed_at DATETIME,
		created_at DATETIME,
		updated_at DATETIME,
		CONSTRAINT fk_sites_queue_tasks FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
		CONSTRAINT uq_site_queue_task_site_key UNIQUE (site_id, task_key)
	)`).Error
}

func ensureIndexes(db *gorm.DB) error {
	type indexStatement struct {
		table     string
		statement string
	}
	statements := []indexStatement{
		{"admin_users", "CREATE INDEX IF NOT EXISTS ix_admin_users_role ON admin_users (role)"},
		{"admin_users", "CREATE INDEX IF NOT EXISTS ix_admin_users_is_enabled ON admin_users (is_enabled)"},
		{"gateway_route_states", "CREATE INDEX IF NOT EXISTS ix_gateway_route_states_route_type ON gateway_route_states (route_type)"},
		{"gateway_route_states", "CREATE INDEX IF NOT EXISTS ix_gateway_route_states_route_priority ON gateway_route_states (route_priority)"},
		{"gateway_route_states", "CREATE INDEX IF NOT EXISTS ix_gateway_route_states_circuit_state ON gateway_route_states (circuit_state)"},
		{"gateway_route_groups", "CREATE INDEX IF NOT EXISTS ix_gateway_route_groups_api_key ON gateway_route_groups (api_key)"},
		{"gateway_route_group_members", "CREATE INDEX IF NOT EXISTS ix_gateway_route_group_members_group_id ON gateway_route_group_members (group_id)"},
		{"gateway_route_group_members", "CREATE INDEX IF NOT EXISTS ix_gateway_route_group_members_route_state_id ON gateway_route_group_members (route_state_id)"},
		{"gateway_request_logs", "CREATE INDEX IF NOT EXISTS ix_gateway_request_logs_created_at ON gateway_request_logs (created_at)"},
		{"gateway_request_logs", "CREATE INDEX IF NOT EXISTS ix_gateway_request_logs_success ON gateway_request_logs (success)"},
		{"gateway_request_logs", "CREATE INDEX IF NOT EXISTS ix_gateway_request_logs_is_stream ON gateway_request_logs (is_stream)"},
		{"gateway_request_logs", "CREATE INDEX IF NOT EXISTS ix_gateway_request_logs_route_state_id ON gateway_request_logs (route_state_id)"},
		{"gateway_request_logs", "CREATE INDEX IF NOT EXISTS ix_gateway_request_logs_model ON gateway_request_logs (model)"},
		{"gateway_request_logs", "CREATE INDEX IF NOT EXISTS ix_gateway_request_logs_requested_model ON gateway_request_logs (requested_model)"},
		{"gateway_request_logs", "CREATE INDEX IF NOT EXISTS ix_gateway_request_logs_actual_model ON gateway_request_logs (actual_model)"},
		{"gateway_request_logs", "CREATE INDEX IF NOT EXISTS ix_gateway_request_logs_route_type ON gateway_request_logs (route_type)"},
		{"gateway_request_logs", "CREATE INDEX IF NOT EXISTS ix_gateway_request_logs_request_url ON gateway_request_logs (request_url)"},
		{"chat_sessions", "CREATE INDEX IF NOT EXISTS ix_chat_sessions_updated_at ON chat_sessions (updated_at)"},
		{"chat_sessions", "CREATE INDEX IF NOT EXISTS ix_chat_sessions_site_id ON chat_sessions (site_id)"},
		{"chat_sessions", "CREATE INDEX IF NOT EXISTS ix_chat_sessions_model ON chat_sessions (model)"},
		{"chat_messages", "CREATE INDEX IF NOT EXISTS ix_chat_messages_session_seq ON chat_messages (session_id, seq)"},
		{"chat_messages", "CREATE INDEX IF NOT EXISTS ix_chat_messages_role ON chat_messages (role)"},
		{"site_queue_tasks", "CREATE INDEX IF NOT EXISTS ix_site_queue_tasks_site_id ON site_queue_tasks (site_id)"},
		{"site_queue_tasks", "CREATE INDEX IF NOT EXISTS ix_site_queue_tasks_task_key ON site_queue_tasks (task_key)"},
		{"site_queue_tasks", "CREATE INDEX IF NOT EXISTS ix_site_queue_tasks_status ON site_queue_tasks (status)"},
	}
	for _, statement := range statements {
		if !db.Migrator().HasTable(statement.table) {
			continue
		}
		if err := db.Exec(statement.statement).Error; err != nil {
			return err
		}
	}
	return nil
}
