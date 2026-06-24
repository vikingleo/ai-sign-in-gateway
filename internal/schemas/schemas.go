package schemas

import (
	"time"

	"ai-sign-in-gateway/internal/models"
)

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AdminUserResponse struct {
	ID          uint       `json:"id"`
	Username    string     `json:"username"`
	Role        string     `json:"role"`
	IsEnabled   bool       `json:"is_enabled"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type AdminAccountUpdateRequest struct {
	CurrentPassword string `json:"current_password"`
	NewUsername     string `json:"new_username"`
	NewPassword     string `json:"new_password"`
}

type AdminAccountUpdateResponse struct {
	User        AdminUserResponse `json:"user"`
	AccessToken string            `json:"access_token"`
	TokenType   string            `json:"token_type"`
}

type AdminUserCreateRequest struct {
	Username  string `json:"username"`
	Password  string `json:"password"`
	Role      string `json:"role"`
	IsEnabled *bool  `json:"is_enabled"`
}

type AdminUserUpdateRequest struct {
	Username    string `json:"username"`
	Role        string `json:"role"`
	IsEnabled   *bool  `json:"is_enabled"`
	NewPassword string `json:"new_password"`
}

type FieldDescriptor struct {
	Name        string `json:"name"`
	Label       string `json:"label"`
	Type        string `json:"type"`
	Placeholder string `json:"placeholder"`
	Required    bool   `json:"required"`
	HelpText    string `json:"help_text"`
}

type PluginMetaResponse struct {
	Key              string            `json:"key"`
	Name             string            `json:"name"`
	Description      string            `json:"description"`
	CredentialFields []FieldDescriptor `json:"credential_fields"`
	ConfigFields     []FieldDescriptor `json:"config_fields"`
	Capabilities     []string          `json:"capabilities"`
	AuthEntryPath    string            `json:"auth_entry_path"`
	AuthEntryLabel   string            `json:"auth_entry_label"`
	AuthHint         string            `json:"auth_hint"`
}

type FeatureResponse struct {
	Key            string `json:"key"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	FrontendPath   string `json:"frontend_path"`
	DefaultEnabled bool   `json:"default_enabled"`
	Enabled        bool   `json:"enabled"`
}

type SiteBase struct {
	Name            string         `json:"name"`
	BaseURL         string         `json:"base_url"`
	PluginKey       string         `json:"plugin_key"`
	GroupName       string         `json:"group_name"`
	SupportedModels []string       `json:"supported_models"`
	IsEnabled       bool           `json:"is_enabled"`
	Notes           string         `json:"notes"`
	Credentials     models.JSONMap `json:"credentials"`
	PluginConfig    models.JSONMap `json:"plugin_config"`
}

type SiteCreate = SiteBase
type SiteUpdate = SiteBase

type SiteDraftTestRequest struct {
	SiteBase
	SiteID uint `json:"site_id"`
}

type SiteRegistrationBatchCreate struct {
	SiteBase
	EmailPattern string `json:"email_pattern"`
	Password     string `json:"password"`
	Count        int    `json:"count"`
	StartIndex   int    `json:"start_index"`
}

type SiteRegistrationBatchItem struct {
	Index       int           `json:"index"`
	Email       string        `json:"email"`
	OK          bool          `json:"ok"`
	Message     string        `json:"message"`
	Site        *SiteResponse `json:"site,omitempty"`
	APIKeyCount int           `json:"api_key_count"`
}

type SiteRegistrationBatchResponse struct {
	CreatedCount int                         `json:"created_count"`
	FailedCount  int                         `json:"failed_count"`
	Items        []SiteRegistrationBatchItem `json:"items"`
}

type SiteResponse struct {
	SiteBase
	ID               uint       `json:"id"`
	LastStatus       *string    `json:"last_status"`
	ConnectionStatus *string    `json:"connection_status"`
	LastMessage      *string    `json:"last_message"`
	LastBalance      *float64   `json:"last_balance"`
	BalanceDisplay   *string    `json:"balance_display"`
	BalanceUnit      *string    `json:"balance_unit"`
	PackageRemaining *float64   `json:"package_remaining"`
	PackageTotal     *float64   `json:"package_total"`
	PackageUsed      *float64   `json:"package_used"`
	PackageUnit      *string    `json:"package_unit"`
	PackageDisplay   *string    `json:"package_display"`
	CheckinStatus    *string    `json:"checkin_status"`
	LastRunAt        *time.Time `json:"last_run_at"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        *time.Time `json:"updated_at"`
}

type PublicInviteResponse struct {
	SiteID      uint    `json:"site_id"`
	SiteName    string  `json:"site_name"`
	BaseURL     string  `json:"base_url"`
	GroupName   string  `json:"group_name"`
	PluginKey   string  `json:"plugin_key"`
	InviteLink  string  `json:"invite_link"`
	InviteCode  string  `json:"invite_code"`
	PackageName *string `json:"package_name"`
}

type SiteInviteRefreshResponse struct {
	SiteID              uint           `json:"site_id"`
	OK                  bool           `json:"ok"`
	Message             string         `json:"message"`
	InviteLink          *string        `json:"invite_link"`
	InviteCode          *string        `json:"invite_code"`
	PackageRemaining    *float64       `json:"package_remaining"`
	PackageTotal        *float64       `json:"package_total"`
	PackageUsed         *float64       `json:"package_used"`
	PackageUnit         *string        `json:"package_unit"`
	PackageDisplay      *string        `json:"package_display"`
	UpdatedCredentials  models.JSONMap `json:"updated_credentials"`
	UpdatedPluginConfig models.JSONMap `json:"updated_plugin_config"`
}

type SiteAPIKeyRefreshResponse struct {
	SiteID             uint           `json:"site_id"`
	SiteName           string         `json:"site_name"`
	OK                 bool           `json:"ok"`
	Message            string         `json:"message"`
	APIKeyCount        int            `json:"api_key_count"`
	PrimaryKeyUpdated  bool           `json:"primary_key_updated"`
	UpdatedCredentials models.JSONMap `json:"updated_credentials"`
}

type SiteHealthResponse struct {
	SiteID              uint           `json:"site_id"`
	LoggedIn            bool           `json:"logged_in"`
	Message             string         `json:"message"`
	Balance             *float64       `json:"balance"`
	BalanceUnit         *string        `json:"balance_unit"`
	PackageRemaining    *float64       `json:"package_remaining"`
	PackageTotal        *float64       `json:"package_total"`
	PackageUsed         *float64       `json:"package_used"`
	PackageUnit         *string        `json:"package_unit"`
	PackageDisplay      *string        `json:"package_display"`
	AccountName         *string        `json:"account_name"`
	InviteLink          *string        `json:"invite_link"`
	InviteCode          *string        `json:"invite_code"`
	UpdatedCredentials  models.JSONMap `json:"updated_credentials"`
	UpdatedPluginConfig models.JSONMap `json:"updated_plugin_config"`
}

type CheckinRunResponse struct {
	ID              uint       `json:"id"`
	SiteID          *uint      `json:"site_id"`
	SiteName        *string    `json:"site_name"`
	TriggerType     string     `json:"trigger_type"`
	Status          string     `json:"status"`
	Message         string     `json:"message"`
	ResponseExcerpt *string    `json:"response_excerpt"`
	Balance         *float64   `json:"balance"`
	BalanceUnit     *string    `json:"balance_unit"`
	AttemptCount    int        `json:"attempt_count"`
	StartedAt       time.Time  `json:"started_at"`
	FinishedAt      *time.Time `json:"finished_at"`
}

type BatchCheckinRequest struct {
	SiteIDs     []uint `json:"site_ids"`
	OnlyEnabled *bool  `json:"only_enabled"`
}

type OverviewAttentionSite struct {
	ID          uint       `json:"id"`
	Name        string     `json:"name"`
	LastStatus  *string    `json:"last_status"`
	LastMessage *string    `json:"last_message"`
	LastRunAt   *time.Time `json:"last_run_at"`
}

type OverviewResponse struct {
	SiteCount        int                     `json:"site_count"`
	EnabledSiteCount int                     `json:"enabled_site_count"`
	TodaySuccess     int                     `json:"today_success"`
	TodayFailed      int                     `json:"today_failed"`
	NextRunAt        *time.Time              `json:"next_run_at"`
	LatestSync       *time.Time              `json:"latest_sync"`
	RecentRuns       []CheckinRunResponse    `json:"recent_runs"`
	AttentionSites   []OverviewAttentionSite `json:"attention_sites"`
}

type SettingsResponse struct {
	Timezone                           string                        `json:"timezone"`
	ScheduleEnabled                    bool                          `json:"schedule_enabled"`
	DailyRunTime                       string                        `json:"daily_run_time"`
	CheckinConcurrency                 int                           `json:"checkin_concurrency"`
	CheckinGlobalConcurrency           int                           `json:"checkin_global_concurrency"`
	CheckinIntervalSeconds             int                           `json:"checkin_interval_seconds"`
	RetryCount                         int                           `json:"retry_count"`
	RequestTimeout                     int                           `json:"request_timeout"`
	OnlyEnabledSites                   bool                          `json:"only_enabled_sites"`
	DesktopKeepRunning                 bool                          `json:"desktop_keep_running"`
	DatabaseBackupEnabled              bool                          `json:"database_backup_enabled"`
	DatabaseBackupDir                  string                        `json:"database_backup_dir"`
	DatabaseBackupIntervalMinutes      int                           `json:"database_backup_interval_minutes"`
	DatabaseBackupRetention            int                           `json:"database_backup_retention"`
	LogRetentionDays                   int                           `json:"log_retention_days"`
	GatewayPricingActiveSchemeID       string                        `json:"gateway_pricing_active_scheme_id"`
	GatewayPricingSchemes              []models.GatewayPricingScheme `json:"gateway_pricing_schemes"`
	FeatureFlags                       models.JSONMap                `json:"feature_flags"`
	Features                           []FeatureResponse             `json:"features"`
	DesktopFrontendDefaultPort         int                           `json:"desktop_frontend_default_port"`
	DesktopFrontendPort                int                           `json:"desktop_frontend_port"`
	DesktopFrontendURL                 string                        `json:"desktop_frontend_url"`
	DesktopFrontendDefaultPortOccupant string                        `json:"desktop_frontend_default_port_occupant"`
	DesktopBackendDefaultPort          int                           `json:"desktop_backend_default_port"`
	DesktopBackendPort                 int                           `json:"desktop_backend_port"`
	DesktopBackendURL                  string                        `json:"desktop_backend_url"`
	DesktopBackendDefaultPortOccupant  string                        `json:"desktop_backend_default_port_occupant"`
	DesktopGatewayURL                  string                        `json:"desktop_gateway_url"`
	RuntimeConfigDir                   string                        `json:"runtime_config_dir"`
	RuntimeDefaultConfigDir            string                        `json:"runtime_default_config_dir"`
	RuntimeDatabasePath                string                        `json:"runtime_database_path"`
	RuntimePendingConfigDir            string                        `json:"runtime_pending_config_dir"`
	SecurityWarnings                   []string                      `json:"security_warnings"`
}

type SettingsUpdate = SettingsResponse

type RuntimeConfigDirRequest struct {
	ConfigDir string `json:"config_dir"`
}

type RuntimeConfigDirResponse struct {
	ConfigDir       string `json:"config_dir"`
	DatabasePath    string `json:"database_path"`
	RestartRequired bool   `json:"restart_required"`
	Message         string `json:"message"`
}

type RuntimeDatabaseImportRequest struct {
	DatabasePath string `json:"database_path"`
}

type RuntimeDatabaseImportResponse struct {
	DatabasePath    string `json:"database_path"`
	BackupPath      string `json:"backup_path"`
	ReloginRequired bool   `json:"relogin_required"`
	RestartRequired bool   `json:"restart_required"`
	Message         string `json:"message"`
}

type RuntimeDatabaseBackupFile struct {
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	Size      int64     `json:"size"`
	CreatedAt time.Time `json:"created_at"`
}

type RuntimeDatabaseBackupsResponse struct {
	BackupDir string                      `json:"backup_dir"`
	Backups   []RuntimeDatabaseBackupFile `json:"backups"`
}

type RuntimeDatabaseBackupNowResponse struct {
	Backup    RuntimeDatabaseBackupFile   `json:"backup"`
	BackupDir string                      `json:"backup_dir"`
	Backups   []RuntimeDatabaseBackupFile `json:"backups"`
	Message   string                      `json:"message"`
}

type RuntimeStopStalePortsResponse struct {
	Results []RuntimeStopPortResult `json:"results"`
}

type RuntimeStopPortResult struct {
	Port    int    `json:"port"`
	PID     int    `json:"pid,omitempty"`
	Command string `json:"command,omitempty"`
	Stopped bool   `json:"stopped"`
	Skipped bool   `json:"skipped"`
	Message string `json:"message"`
}

type ModelListRequest struct {
	SiteID uint `json:"site_id"`
}

type ModelListResponse struct {
	OK             bool            `json:"ok"`
	StatusCode     *int            `json:"status_code"`
	LatencyMS      *float64        `json:"latency_ms"`
	Message        string          `json:"message"`
	Models         []string        `json:"models"`
	Items          []ModelListItem `json:"items"`
	BaseURL        string          `json:"base_url"`
	RouteType      string          `json:"route_type"`
	KeyFingerprint string          `json:"key_fingerprint"`
	KeyName        string          `json:"key_name"`
}

type ModelListItem struct {
	ID             string `json:"id"`
	RouteType      string `json:"route_type"`
	Mode           string `json:"mode"`
	BaseURL        string `json:"base_url"`
	KeyFingerprint string `json:"key_fingerprint"`
	KeyName        string `json:"key_name"`
	ImageGenPath   string `json:"image_generation_path"`
	ImageEditPath  string `json:"image_edit_path"`
}

type ChatTestRequest struct {
	BaseURL        string             `json:"base_url"`
	APIKey         string             `json:"api_key"`
	SiteID         uint               `json:"site_id"`
	RouteType      string             `json:"route_type"`
	KeyFingerprint string             `json:"key_fingerprint"`
	Model          string             `json:"model"`
	Prompt         string             `json:"prompt"`
	Mode           string             `json:"mode"`
	Messages       []ChatTestMessage  `json:"messages"`
	ReferenceImgs  []ChatTestImageRef `json:"reference_images"`
	ImageSize      string             `json:"image_size"`
	ImageGenPath   string             `json:"image_generation_path"`
	ImageEditPath  string             `json:"image_edit_path"`
}

type ChatTestMessage struct {
	Role            string             `json:"role"`
	Content         string             `json:"content"`
	ReferenceImages []ChatTestImageRef `json:"reference_images"`
}

type ChatTestImageRef struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

type ChatTestResponse struct {
	OK            bool                  `json:"ok"`
	StatusCode    *int                  `json:"status_code"`
	LatencyMS     *float64              `json:"latency_ms"`
	Message       string                `json:"message"`
	Output        string                `json:"output"`
	Images        []ChatTestImageOutput `json:"images"`
	RevisedPrompt string                `json:"revised_prompt"`
}

type ChatTestImageOutput struct {
	URL           string `json:"url"`
	B64JSON       string `json:"b64_json"`
	RevisedPrompt string `json:"revised_prompt"`
}

type ChatSessionCreateRequest struct {
	Title          string `json:"title"`
	SiteID         *uint  `json:"site_id"`
	SiteName       string `json:"site_name"`
	Model          string `json:"model"`
	Mode           string `json:"mode"`
	RouteType      string `json:"route_type"`
	KeyFingerprint string `json:"key_fingerprint"`
	KeyName        string `json:"key_name"`
	ImageSize      string `json:"image_size"`
	ImageWidth     int    `json:"image_width"`
	ImageHeight    int    `json:"image_height"`
}

type ChatSessionUpdateRequest struct {
	Title          *string `json:"title"`
	SiteID         *uint   `json:"site_id"`
	SiteName       *string `json:"site_name"`
	Model          *string `json:"model"`
	Mode           *string `json:"mode"`
	RouteType      *string `json:"route_type"`
	KeyFingerprint *string `json:"key_fingerprint"`
	KeyName        *string `json:"key_name"`
	ImageSize      *string `json:"image_size"`
	ImageWidth     *int    `json:"image_width"`
	ImageHeight    *int    `json:"image_height"`
}

type ChatSessionMessageRequest struct {
	Messages []ChatSessionMessagePayload `json:"messages"`
}

type ChatSessionMessagePayload struct {
	Role            string             `json:"role"`
	Content         string             `json:"content"`
	Status          string             `json:"status"`
	Mode            string             `json:"mode"`
	LatencyMS       *float64           `json:"latency_ms"`
	StatusCode      *int               `json:"status_code"`
	Error           string             `json:"error"`
	ReferenceImages []ChatTestImageRef `json:"reference_images"`
	Images          []ChatTestImageRef `json:"images"`
	CreatedAt       *time.Time         `json:"created_at"`
}

type ChatSessionListResponse struct {
	Items []ChatSessionResponse `json:"items"`
	Count int                   `json:"count"`
}

type ChatSessionResponse struct {
	ID              uint      `json:"id"`
	Title           string    `json:"title"`
	SiteID          *uint     `json:"site_id,omitempty"`
	SiteName        string    `json:"site_name"`
	Model           string    `json:"model"`
	Mode            string    `json:"mode"`
	RouteType       string    `json:"route_type"`
	KeyFingerprint  string    `json:"key_fingerprint"`
	KeyName         string    `json:"key_name"`
	ImageSize       string    `json:"image_size"`
	ImageWidth      int       `json:"image_width"`
	ImageHeight     int       `json:"image_height"`
	MessageCount    int       `json:"message_count"`
	LastMessageText string    `json:"last_message_text"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type ChatSessionDetailResponse struct {
	ChatSessionResponse
	Messages []ChatSessionMessageResponse `json:"messages"`
}

type ChatSessionMessageResponse struct {
	ID              uint               `json:"id"`
	SessionID       uint               `json:"session_id"`
	Seq             int                `json:"seq"`
	Role            string             `json:"role"`
	Content         string             `json:"content"`
	Status          string             `json:"status"`
	Mode            string             `json:"mode"`
	LatencyMS       *float64           `json:"latency_ms"`
	StatusCode      *int               `json:"status_code"`
	Error           string             `json:"error"`
	ReferenceImages []ChatTestImageRef `json:"reference_images"`
	Images          []ChatTestImageRef `json:"images"`
	CreatedAt       time.Time          `json:"created_at"`
	UpdatedAt       time.Time          `json:"updated_at"`
}

type McpTestRequest struct {
	BaseURL         string   `json:"base_url"`
	APIKey          string   `json:"api_key"`
	Model           string   `json:"model"`
	Prompt          string   `json:"prompt"`
	ServerLabel     string   `json:"server_label"`
	ServerURL       string   `json:"server_url"`
	AllowedTools    []string `json:"allowed_tools"`
	RequireApproval string   `json:"require_approval"`
}

type McpTestResponse struct {
	OK         bool     `json:"ok"`
	StatusCode *int     `json:"status_code"`
	LatencyMS  *float64 `json:"latency_ms"`
	Message    string   `json:"message"`
	Output     string   `json:"output"`
	RawExcerpt string   `json:"raw_excerpt"`
	ToolEvents []string `json:"tool_events"`
}

type GatewaySettingsResponse struct {
	RouteStrategy               string  `json:"route_strategy"`
	FailureThreshold            int     `json:"failure_threshold"`
	CooldownSeconds             int     `json:"cooldown_seconds"`
	RequestTimeout              int     `json:"request_timeout"`
	MaxAttempts                 int     `json:"max_attempts"`
	FailureRetryMode            string  `json:"failure_retry_mode"`
	RouteConcurrencyLimit       int     `json:"route_concurrency_limit"`
	ConcurrencyTransferStrategy string  `json:"concurrency_transfer_strategy"`
	ConcurrencyOverflowStrategy string  `json:"concurrency_overflow_strategy"`
	SmartLatencyBias            float64 `json:"smart_latency_bias"`
	SmartConcurrencyBias        float64 `json:"smart_concurrency_bias"`
	SmartFailureBias            float64 `json:"smart_failure_bias"`
	SmartPriorityBias           float64 `json:"smart_priority_bias"`
	GatewayAPIKey               string  `json:"gateway_api_key"`
}

type GatewaySettingsUpdate = GatewaySettingsResponse

type GatewayRouteStateUpdateRequest struct {
	RouteType             string    `json:"route_type"`
	RoutePath             *string   `json:"route_path"`
	SupportedModels       *[]string `json:"supported_models"`
	ManualRequestBaseURLs *[]string `json:"manual_request_base_urls"`
}

type GatewayRouteStateResponse struct {
	ID                  uint       `json:"id"`
	SiteID              uint       `json:"site_id"`
	SiteName            string     `json:"site_name"`
	BaseURL             string     `json:"base_url"`
	RequestBaseURL      string     `json:"request_base_url"`
	RequestBaseURLs     []string   `json:"request_base_urls"`
	LastRequestBaseURL  string     `json:"last_request_base_url"`
	SiteNameSnapshot    string     `json:"site_name_snapshot"`
	SiteBaseURLSnapshot string     `json:"site_base_url_snapshot"`
	SiteMissing         bool       `json:"site_missing"`
	HasAPIKey           bool       `json:"has_api_key"`
	GroupName           string     `json:"group_name"`
	LastBalance         *float64   `json:"last_balance"`
	BalanceDisplay      *string    `json:"balance_display"`
	PackageRemaining    *float64   `json:"package_remaining"`
	PackageTotal        *float64   `json:"package_total"`
	PackageUsed         *float64   `json:"package_used"`
	PackageUnit         *string    `json:"package_unit"`
	PackageDisplay      *string    `json:"package_display"`
	CheckinStatus       *string    `json:"checkin_status"`
	KeyName             string     `json:"key_name"`
	KeyFingerprint      string     `json:"key_fingerprint"`
	KeySource           string     `json:"key_source"`
	RouteType           string     `json:"route_type"`
	RouteTypeManual     bool       `json:"route_type_manual"`
	RoutePath           string     `json:"route_path"`
	RoutePathManual     bool       `json:"route_path_manual"`
	SupportedModels     []string   `json:"supported_models"`
	ModelProbeStatus    string     `json:"model_probe_status"`
	ModelProbeMessage   string     `json:"model_probe_message"`
	ModelProbeUpdatedAt *time.Time `json:"model_probe_updated_at"`
	RoutePriority       int        `json:"route_priority"`
	RoutePriorityManual bool       `json:"route_priority_manual"`
	Weight              int        `json:"weight"`
	IsEnabled           bool       `json:"is_enabled"`
	IsEnabledManual     bool       `json:"is_enabled_manual"`
	CircuitState        string     `json:"circuit_state"`
	ConsecutiveFailures int        `json:"consecutive_failures"`
	ActiveConcurrency   int        `json:"active_concurrency"`
	RequestCount        int        `json:"request_count"`
	SuccessCount        int        `json:"success_count"`
	FailureCount        int        `json:"failure_count"`
	AvgLatencyMS        *float64   `json:"avg_latency_ms"`
	EWMALatencyMS       *float64   `json:"ewma_latency_ms"`
	LastLatencyMS       *float64   `json:"last_latency_ms"`
	SuccessRate         float64    `json:"success_rate"`
	LastStatusCode      *int       `json:"last_status_code"`
	LastError           *string    `json:"last_error"`
	LastUsedAt          *time.Time `json:"last_used_at"`
	LastSuccessAt       *time.Time `json:"last_success_at"`
	LastFailureAt       *time.Time `json:"last_failure_at"`
	CircuitOpenUntil    *time.Time `json:"circuit_open_until"`
}
