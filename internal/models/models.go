package models

import "time"

const (
	AdminRoleSuper = "super_admin"
	AdminRoleAdmin = "admin"
)

func NormalizeAdminRole(role string) string {
	if role == AdminRoleSuper {
		return AdminRoleSuper
	}
	return AdminRoleAdmin
}

func IsAdminRole(role string) bool {
	return role == AdminRoleSuper || role == AdminRoleAdmin
}

type AdminUser struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	Username     string     `gorm:"size:200;uniqueIndex;not null" json:"username"`
	PasswordHash string     `gorm:"size:255;not null" json:"-"`
	Role         string     `gorm:"size:30;default:admin;index;not null" json:"role"`
	IsEnabled    bool       `gorm:"default:true;index;not null" json:"is_enabled"`
	LastLoginAt  *time.Time `json:"last_login_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type Site struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	Name         string     `gorm:"size:100;index;not null" json:"name"`
	BaseURL      string     `gorm:"size:255;not null" json:"base_url"`
	PluginKey    string     `gorm:"size:100;index;not null" json:"plugin_key"`
	GroupName    string     `gorm:"size:100;default:''" json:"group_name"`
	IsEnabled    bool       `gorm:"not null" json:"is_enabled"`
	Notes        string     `gorm:"type:text;default:''" json:"notes"`
	Credentials  JSONMap    `gorm:"type:json" json:"credentials"`
	PluginConfig JSONMap    `gorm:"type:json" json:"plugin_config"`
	LastStatus   *string    `gorm:"size:30" json:"last_status,omitempty"`
	LastMessage  *string    `gorm:"type:text" json:"last_message,omitempty"`
	LastBalance  *float64   `json:"last_balance,omitempty"`
	LastRunAt    *time.Time `json:"last_run_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	Runs         []CheckinRun
	QueueTasks   []SiteQueueTask `gorm:"constraint:OnDelete:CASCADE"`
}

type CheckinRun struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	SiteID          *uint      `gorm:"index" json:"site_id,omitempty"`
	TriggerType     string     `gorm:"size:30;default:manual" json:"trigger_type"`
	Status          string     `gorm:"size:30;default:pending;index" json:"status"`
	Message         string     `gorm:"type:text;default:''" json:"message"`
	ResponseExcerpt *string    `gorm:"type:text" json:"response_excerpt,omitempty"`
	Balance         *float64   `json:"balance,omitempty"`
	AttemptCount    int        `gorm:"default:1" json:"attempt_count"`
	StartedAt       time.Time  `json:"started_at"`
	FinishedAt      *time.Time `json:"finished_at,omitempty"`
	Site            *Site      `json:"-"`
}

type SystemSetting struct {
	ID                                 uint      `gorm:"primaryKey;default:1" json:"id"`
	Timezone                           string    `gorm:"size:80;default:Asia/Shanghai" json:"timezone"`
	ScheduleEnabled                    bool      `gorm:"default:true" json:"schedule_enabled"`
	DailyRunTime                       string    `gorm:"size:10;default:09:00" json:"daily_run_time"`
	CheckinConcurrency                 int       `gorm:"default:1" json:"checkin_concurrency"`
	CheckinGlobalConcurrency           int       `gorm:"default:4" json:"checkin_global_concurrency"`
	CheckinIntervalSeconds             int       `gorm:"default:1" json:"checkin_interval_seconds"`
	RetryCount                         int       `gorm:"default:1" json:"retry_count"`
	RequestTimeout                     int       `gorm:"default:20" json:"request_timeout"`
	OnlyEnabledSites                   bool      `gorm:"default:true" json:"only_enabled_sites"`
	DesktopKeepRunning                 bool      `gorm:"default:false" json:"desktop_keep_running"`
	DatabaseBackupEnabled              bool      `gorm:"default:false" json:"database_backup_enabled"`
	DatabaseBackupDir                  string    `gorm:"type:text;default:''" json:"database_backup_dir"`
	DatabaseBackupIntervalMinutes      int       `gorm:"default:1440" json:"database_backup_interval_minutes"`
	DatabaseBackupRetention            int       `gorm:"default:7" json:"database_backup_retention"`
	LogRetentionDays                   int       `gorm:"default:5" json:"log_retention_days"`
	GatewayPricingActiveSchemeID       string    `gorm:"size:80;default:official" json:"gateway_pricing_active_scheme_id"`
	GatewayPricingSchemes              string    `gorm:"type:text;default:'[]'" json:"gateway_pricing_schemes"`
	FeatureFlags                       JSONMap   `gorm:"type:json" json:"feature_flags"`
	GatewayRouteStrategy               string    `gorm:"size:30;default:round_robin" json:"gateway_route_strategy"`
	GatewayFailureThreshold            int       `gorm:"default:3" json:"gateway_failure_threshold"`
	GatewayCooldownSeconds             int       `gorm:"default:180" json:"gateway_cooldown_seconds"`
	GatewayRequestTimeout              int       `gorm:"default:60" json:"gateway_request_timeout"`
	GatewayMaxAttempts                 int       `gorm:"default:0" json:"gateway_max_attempts"`
	GatewayFailureRetryMode            string    `gorm:"size:30;default:retryable" json:"gateway_failure_retry_mode"`
	GatewayRouteConcurrencyLimit       int       `gorm:"default:5" json:"gateway_route_concurrency_limit"`
	GatewayConcurrencyTransferStrategy string    `gorm:"size:30;default:limit_only" json:"gateway_concurrency_transfer_strategy"`
	GatewayConcurrencyOverflowStrategy string    `gorm:"size:30;default:latency_first" json:"gateway_concurrency_overflow_strategy"`
	GatewaySmartLatencyBias            float64   `gorm:"default:1" json:"gateway_smart_latency_bias"`
	GatewaySmartConcurrencyBias        float64   `gorm:"default:1.5" json:"gateway_smart_concurrency_bias"`
	GatewaySmartFailureBias            float64   `gorm:"default:1" json:"gateway_smart_failure_bias"`
	GatewaySmartPriorityBias           float64   `gorm:"default:0.5" json:"gateway_smart_priority_bias"`
	GatewayAPIKey                      string    `gorm:"size:255;default:''" json:"gateway_api_key"`
	SiteGroupCatalog                   string    `gorm:"type:text;default:'[]'" json:"site_group_catalog"`
	UpdatedAt                          time.Time `json:"updated_at"`
}

type GatewayPricingScheme struct {
	ID       string              `json:"id"`
	Name     string              `json:"name"`
	Currency string              `json:"currency"`
	Readonly bool                `json:"readonly"`
	Source   string              `json:"source"`
	Prices   []GatewayModelPrice `json:"prices"`
}

type GatewayModelPrice struct {
	Provider           string  `json:"provider"`
	ModelPrefix        string  `json:"model_prefix"`
	DisplayName        string  `json:"display_name"`
	InputPerMTok       float64 `json:"input_per_mtok"`
	CachedInputPerMTok float64 `json:"cached_input_per_mtok"`
	CacheWritePerMTok  float64 `json:"cache_write_per_mtok"`
	OutputPerMTok      float64 `json:"output_per_mtok"`
}

type GatewayRouteState struct {
	ID                    uint       `gorm:"primaryKey" json:"id"`
	SiteID                uint       `gorm:"uniqueIndex:uq_gateway_route_site_key;index" json:"site_id"`
	KeyFingerprint        string     `gorm:"size:64;uniqueIndex:uq_gateway_route_site_key;index" json:"key_fingerprint"`
	KeyName               string     `gorm:"size:120;default:''" json:"key_name"`
	KeySource             string     `gorm:"size:80;default:site" json:"key_source"`
	SiteNameSnapshot      string     `gorm:"size:120;default:''" json:"site_name_snapshot"`
	SiteBaseURLSnapshot   string     `gorm:"size:255;default:''" json:"site_base_url_snapshot"`
	SiteAPIURLSnapshot    string     `gorm:"type:text;default:'[]'" json:"site_api_url_snapshot"`
	ManualRequestBaseURLs string     `gorm:"type:text;default:'[]'" json:"manual_request_base_urls"`
	LastRequestBaseURL    string     `gorm:"size:255;default:''" json:"last_request_base_url"`
	LastBalance           *float64   `json:"last_balance,omitempty"`
	BalanceUnit           string     `gorm:"size:30;default:''" json:"balance_unit"`
	BalanceProbeURL       string     `gorm:"size:255;default:''" json:"balance_probe_url"`
	RouteType             string     `gorm:"size:20;default:codex" json:"route_type"`
	RouteTypeManual       bool       `gorm:"default:false" json:"route_type_manual"`
	RoutePath             string     `gorm:"size:40;default:''" json:"route_path"`
	RoutePathManual       bool       `gorm:"default:false" json:"route_path_manual"`
	SupportedModels       string     `gorm:"type:text;default:'[]'" json:"supported_models"`
	ModelProbeStatus      string     `gorm:"size:30;default:''" json:"model_probe_status"`
	ModelProbeMessage     string     `gorm:"type:text;default:''" json:"model_probe_message"`
	ModelProbeUpdatedAt   *time.Time `json:"model_probe_updated_at,omitempty"`
	GroupName             string     `gorm:"size:100;default:''" json:"group_name"`
	RoutePriority         int        `gorm:"default:100;index" json:"route_priority"`
	RoutePriorityManual   bool       `gorm:"default:false" json:"route_priority_manual"`
	Weight                int        `gorm:"default:1" json:"weight"`
	IsEnabled             bool       `gorm:"default:true" json:"is_enabled"`
	IsEnabledManual       bool       `gorm:"default:false" json:"is_enabled_manual"`
	CircuitState          string     `gorm:"size:20;default:closed;index" json:"circuit_state"`
	ConsecutiveFailures   int        `gorm:"default:0" json:"consecutive_failures"`
	RequestCount          int        `gorm:"default:0" json:"request_count"`
	SuccessCount          int        `gorm:"default:0" json:"success_count"`
	FailureCount          int        `gorm:"default:0" json:"failure_count"`
	AvgLatencyMS          *float64   `json:"avg_latency_ms,omitempty"`
	EWMALatencyMS         *float64   `gorm:"column:ewma_latency_ms" json:"ewma_latency_ms,omitempty"`
	LastLatencyMS         *float64   `json:"last_latency_ms,omitempty"`
	LastStatusCode        *int       `json:"last_status_code,omitempty"`
	LastError             *string    `gorm:"type:text" json:"last_error,omitempty"`
	LastUsedAt            *time.Time `json:"last_used_at,omitempty"`
	LastSuccessAt         *time.Time `json:"last_success_at,omitempty"`
	LastFailureAt         *time.Time `json:"last_failure_at,omitempty"`
	CircuitOpenedAt       *time.Time `json:"circuit_opened_at,omitempty"`
	CircuitOpenUntil      *time.Time `json:"circuit_open_until,omitempty"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
	Site                  Site       `json:"-"`
}

type GatewayRouteGroup struct {
	ID        uint                      `gorm:"primaryKey" json:"id"`
	Name      string                    `gorm:"size:100;uniqueIndex;not null" json:"name"`
	APIKey    string                    `gorm:"size:255;default:''" json:"api_key"`
	CreatedAt time.Time                 `json:"created_at"`
	UpdatedAt time.Time                 `json:"updated_at"`
	Members   []GatewayRouteGroupMember `gorm:"foreignKey:GroupID;constraint:OnDelete:CASCADE" json:"-"`
}

type GatewayRouteGroupMember struct {
	ID           uint              `gorm:"primaryKey" json:"id"`
	GroupID      uint              `gorm:"uniqueIndex:uq_gateway_route_group_member;index;not null" json:"group_id"`
	RouteStateID uint              `gorm:"uniqueIndex:uq_gateway_route_group_member;index;not null" json:"route_state_id"`
	CreatedAt    time.Time         `json:"created_at"`
	Group        GatewayRouteGroup `gorm:"constraint:OnDelete:CASCADE" json:"-"`
	RouteState   GatewayRouteState `gorm:"constraint:OnDelete:CASCADE" json:"-"`
}

type GatewayRequestLog struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
	RequestID          string    `gorm:"size:40;index" json:"request_id"`
	RouteStateID       *uint     `gorm:"index" json:"route_state_id,omitempty"`
	SiteID             *uint     `gorm:"index" json:"site_id,omitempty"`
	KeyFingerprint     string    `gorm:"size:64;index" json:"key_fingerprint"`
	KeyName            string    `gorm:"size:120;default:''" json:"key_name"`
	GroupName          string    `gorm:"size:100;default:''" json:"group_name"`
	Model              string    `gorm:"size:120;default:'';index" json:"model"`
	RequestedModel     string    `gorm:"size:120;default:'';index" json:"requested_model"`
	ActualModel        string    `gorm:"size:120;default:'';index" json:"actual_model"`
	RouteType          string    `gorm:"size:30;default:'';index" json:"route_type"`
	TargetPath         string    `gorm:"size:255;default:''" json:"target_path"`
	RequestURL         string    `gorm:"type:text;default:''" json:"request_url"`
	UserAgent          string    `gorm:"type:text;default:''" json:"user_agent"`
	Method             string    `gorm:"size:10;default:GET" json:"method"`
	RouteStrategy      string    `gorm:"size:30;default:round_robin" json:"route_strategy"`
	AttemptIndex       int       `gorm:"default:1" json:"attempt_index"`
	StatusCode         *int      `json:"status_code,omitempty"`
	Success            bool      `gorm:"default:false;index" json:"success"`
	LatencyMS          *float64  `json:"latency_ms,omitempty"`
	PromptTokens       *int      `json:"prompt_tokens,omitempty"`
	CachedInputTokens  *int      `json:"cached_input_tokens,omitempty"`
	CacheReadTokens    *int      `json:"cache_read_tokens,omitempty"`
	CacheWriteTokens   *int      `json:"cache_write_tokens,omitempty"`
	CompletionTokens   *int      `json:"completion_tokens,omitempty"`
	TotalTokens        *int      `json:"total_tokens,omitempty"`
	UsageCost          *float64  `json:"usage_cost,omitempty"`
	CircuitStateBefore string    `gorm:"size:20;default:closed" json:"circuit_state_before"`
	FailureReason      *string   `gorm:"type:text" json:"failure_reason,omitempty"`
	IsStream           bool      `gorm:"default:false;index" json:"is_stream"`
	CreatedAt          time.Time `gorm:"index" json:"created_at"`
	Site               *Site     `json:"-"`
}

type GatewayConcurrencyPeak struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	Day            string    `gorm:"size:20;uniqueIndex;not null" json:"day"`
	MaxConcurrency int       `gorm:"default:0" json:"max_concurrency"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type SiteQueueTask struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	SiteID      uint       `gorm:"uniqueIndex:uq_site_queue_task_site_key;index" json:"site_id"`
	TaskKey     string     `gorm:"size:50;uniqueIndex:uq_site_queue_task_site_key;index" json:"task_key"`
	Title       string     `gorm:"size:120;not null" json:"title"`
	Detail      string     `gorm:"type:text;default:''" json:"detail"`
	Status      string     `gorm:"size:20;default:pending;index" json:"status"`
	SortOrder   int        `gorm:"default:0" json:"sort_order"`
	ActionKey   string     `gorm:"size:40;default:''" json:"action_key"`
	ActionLabel string     `gorm:"size:80;default:''" json:"action_label"`
	LastMessage *string    `gorm:"type:text" json:"last_message,omitempty"`
	LastError   *string    `gorm:"type:text" json:"last_error,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	Site        Site       `json:"-"`
}

type ChatSession struct {
	ID              uint          `gorm:"primaryKey" json:"id"`
	Title           string        `gorm:"size:160;default:'';index" json:"title"`
	SiteID          *uint         `gorm:"index" json:"site_id,omitempty"`
	SiteName        string        `gorm:"size:120;default:''" json:"site_name"`
	Model           string        `gorm:"size:160;default:'';index" json:"model"`
	Mode            string        `gorm:"size:20;default:'chat';index" json:"mode"`
	RouteType       string        `gorm:"size:30;default:''" json:"route_type"`
	KeyFingerprint  string        `gorm:"size:80;default:''" json:"key_fingerprint"`
	KeyName         string        `gorm:"size:120;default:''" json:"key_name"`
	ImageSize       string        `gorm:"size:40;default:''" json:"image_size"`
	ImageWidth      int           `gorm:"default:0" json:"image_width"`
	ImageHeight     int           `gorm:"default:0" json:"image_height"`
	MessageCount    int           `gorm:"default:0" json:"message_count"`
	LastMessageText string        `gorm:"type:text;default:''" json:"last_message_text"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
	Messages        []ChatMessage `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE" json:"-"`
}

type ChatMessage struct {
	ID              uint        `gorm:"primaryKey" json:"id"`
	SessionID       uint        `gorm:"index;not null" json:"session_id"`
	Seq             int         `gorm:"not null;index" json:"seq"`
	Role            string      `gorm:"size:20;not null;index" json:"role"`
	Content         string      `gorm:"type:text;default:''" json:"content"`
	Status          string      `gorm:"size:20;default:'done';index" json:"status"`
	Mode            string      `gorm:"size:20;default:''" json:"mode"`
	LatencyMS       *float64    `json:"latency_ms,omitempty"`
	StatusCode      *int        `json:"status_code,omitempty"`
	Error           string      `gorm:"type:text;default:''" json:"error"`
	ReferenceImages JSONMap     `gorm:"type:json" json:"reference_images"`
	Images          JSONMap     `gorm:"type:json" json:"images"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
	Session         ChatSession `gorm:"foreignKey:SessionID" json:"-"`
}

func All() []any {
	return []any{
		&AdminUser{},
		&Site{},
		&CheckinRun{},
		&SystemSetting{},
		&GatewayRouteState{},
		&GatewayRouteGroup{},
		&GatewayRouteGroupMember{},
		&GatewayRequestLog{},
		&GatewayConcurrencyPeak{},
		&SiteQueueTask{},
		&ChatSession{},
		&ChatMessage{},
	}
}
