package services

import (
	"bufio"
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"ai-sign-in-gateway/internal/models"
	"gorm.io/gorm"
)

// ----------------------------- in-memory counters -----------------------------

var gatewayRoundRobin = struct {
	sync.Mutex
	offsets map[string]int
}{offsets: map[string]int{}}

var gatewayActive = struct {
	sync.Mutex
	counts map[uint]int
}{counts: map[uint]int{}}

var gatewayActiveRequests = struct {
	sync.Mutex
	items map[string]GatewayActiveRequest
}{items: map[string]GatewayActiveRequest{}}

var gatewayRecentActiveRequests = struct {
	sync.Mutex
	items map[string]GatewayActiveRequest
}{items: map[string]GatewayActiveRequest{}}

func acquireRoute(stateID uint) int {
	gatewayActive.Lock()
	defer gatewayActive.Unlock()
	gatewayActive.counts[stateID]++
	return gatewayActive.counts[stateID]
}

func releaseRoute(stateID uint) {
	gatewayActive.Lock()
	defer gatewayActive.Unlock()
	if gatewayActive.counts[stateID] <= 1 {
		delete(gatewayActive.counts, stateID)
	} else {
		gatewayActive.counts[stateID]--
	}
}

func RouteActiveCount(stateID uint) int {
	gatewayActive.Lock()
	defer gatewayActive.Unlock()
	return gatewayActive.counts[stateID]
}

func RouteTotalActive() int {
	gatewayActive.Lock()
	defer gatewayActive.Unlock()
	return gatewayTotalActiveLocked()
}

func gatewayTotalActiveLocked() int {
	total := 0
	for _, n := range gatewayActive.counts {
		total += n
	}
	return total
}

type GatewayActiveRequest struct {
	ID                string     `json:"id"`
	RequestID         string     `json:"request_id"`
	RouteID           uint       `json:"route_id"`
	SiteID            uint       `json:"site_id"`
	RouteLabel        string     `json:"route_label"`
	SiteName          string     `json:"site_name"`
	KeyName           string     `json:"key_name"`
	KeyFingerprint    string     `json:"key_fingerprint"`
	GroupName         string     `json:"group_name"`
	TargetPath        string     `json:"target_path"`
	RequestURL        string     `json:"request_url"`
	Method            string     `json:"method"`
	RouteStrategy     string     `json:"route_strategy"`
	AttemptIndex      int        `json:"attempt_index"`
	IsStream          bool       `json:"is_stream"`
	RouteType         string     `json:"route_type"`
	RequestedModel    string     `json:"requested_model"`
	ActualModel       string     `json:"actual_model"`
	RequestBaseURL    string     `json:"request_base_url"`
	ActiveConcurrency int        `json:"active_concurrency"`
	StartedAt         time.Time  `json:"started_at"`
	ElapsedMS         int64      `json:"elapsed_ms"`
	FinishedAt        *time.Time `json:"finished_at,omitempty"`
	Recent            bool       `json:"recent"`
	Success           *bool      `json:"success,omitempty"`
	StatusCode        *int       `json:"status_code,omitempty"`
	FailureKind       string     `json:"failure_kind,omitempty"`
	FailureReason     *string    `json:"failure_reason,omitempty"`
}

func ListGatewayActiveRequests() []GatewayActiveRequest {
	return ListGatewayActiveRequestsWithRecent(false)
}

func ListGatewayActiveRequestsWithRecent(includeRecent bool) []GatewayActiveRequest {
	gatewayActiveRequests.Lock()
	out := make([]GatewayActiveRequest, 0, len(gatewayActiveRequests.items))
	for _, item := range gatewayActiveRequests.items {
		out = append(out, item)
	}
	gatewayActiveRequests.Unlock()

	now := time.Now().UTC()
	if includeRecent {
		out = append(out, takeGatewayRecentActiveRequests(now)...)
	}
	for idx := range out {
		if out[idx].FinishedAt == nil {
			out[idx].ElapsedMS = now.Sub(out[idx].StartedAt).Milliseconds()
			out[idx].ActiveConcurrency = RouteActiveCount(out[idx].RouteID)
		}
	}
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].StartedAt.After(out[j].StartedAt)
	})
	return out
}

func takeGatewayRecentActiveRequests(now time.Time) []GatewayActiveRequest {
	gatewayRecentActiveRequests.Lock()
	defer gatewayRecentActiveRequests.Unlock()
	out := make([]GatewayActiveRequest, 0, len(gatewayRecentActiveRequests.items))
	for token, item := range gatewayRecentActiveRequests.items {
		if item.FinishedAt == nil || now.Sub(*item.FinishedAt) > gatewayRecentActivityTTL {
			delete(gatewayRecentActiveRequests.items, token)
			continue
		}
		out = append(out, item)
	}
	return out
}

func beginGatewayActiveRequest(route GatewayRoute, targetPath, requestURL, method, strategy string, attemptIndex int, isStream bool, requestID string, activeConcurrency int, requestedModel string) string {
	if requestID == "" {
		requestID = newRequestID()
	}
	if attemptIndex <= 0 {
		attemptIndex = 1
	}
	token := requestID + ":" + newRequestID()
	siteName := GatewayRouteSiteLabel(route)
	routeLabel := siteName
	if keyName := strings.TrimSpace(route.State.KeyName); keyName != "" {
		routeLabel += " · " + keyName
	}
	siteID := route.State.SiteID
	if route.Site.ID != 0 {
		siteID = route.Site.ID
	}
	gatewayActiveRequests.Lock()
	gatewayActiveRequests.items[token] = GatewayActiveRequest{
		ID:                token,
		RequestID:         requestID,
		RouteID:           route.State.ID,
		SiteID:            siteID,
		RouteLabel:        routeLabel,
		SiteName:          siteName,
		KeyName:           route.State.KeyName,
		KeyFingerprint:    route.State.KeyFingerprint,
		GroupName:         route.State.GroupName,
		TargetPath:        targetPath,
		RequestURL:        requestURL,
		Method:            method,
		RouteStrategy:     normalizeStrategy(strategy),
		AttemptIndex:      attemptIndex,
		IsStream:          isStream,
		RouteType:         route.State.RouteType,
		RequestedModel:    normalizeModelID(requestedModel),
		ActualModel:       normalizeModelID(requestedModel),
		RequestBaseURL:    route.RequestBaseURL,
		ActiveConcurrency: activeConcurrency,
		StartedAt:         time.Now().UTC(),
	}
	gatewayActiveRequests.Unlock()
	return token
}

type GatewayConcurrencyPeaks struct {
	AllTime int `json:"max_concurrency_all_time"`
	Today   int `json:"max_concurrency_today"`
}

func RecordGatewayCurrentConcurrencyPeak(db *gorm.DB, now time.Time) error {
	gatewayActive.Lock()
	total := gatewayTotalActiveLocked()
	gatewayActive.Unlock()
	return RecordGatewayConcurrencyPeak(db, total, now)
}

func RecordGatewayConcurrencyPeak(db *gorm.DB, totalConcurrency int, now time.Time) error {
	if db == nil || totalConcurrency <= 0 {
		return nil
	}
	updatedAt := now.UTC()
	for _, day := range []string{"all", gatewayConcurrencyPeakDay(now)} {
		if err := db.Exec(`INSERT INTO gateway_concurrency_peaks (day, max_concurrency, updated_at)
			VALUES (?, ?, ?)
			ON CONFLICT(day) DO UPDATE SET
				max_concurrency = excluded.max_concurrency,
				updated_at = excluded.updated_at
			WHERE excluded.max_concurrency > gateway_concurrency_peaks.max_concurrency`, day, totalConcurrency, updatedAt).Error; err != nil {
			return err
		}
	}
	return nil
}

func GatewayConcurrencyPeakStats(db *gorm.DB, now time.Time) (GatewayConcurrencyPeaks, error) {
	if db == nil {
		return GatewayConcurrencyPeaks{}, nil
	}
	stats := GatewayConcurrencyPeaks{}
	var allPeak models.GatewayConcurrencyPeak
	err := db.Where("day = ?", "all").First(&allPeak).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return stats, err
	}
	stats.AllTime = allPeak.MaxConcurrency

	var todayPeak models.GatewayConcurrencyPeak
	err = db.Where("day = ?", gatewayConcurrencyPeakDay(now)).First(&todayPeak).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return stats, err
	}
	stats.Today = todayPeak.MaxConcurrency
	return stats, nil
}

func gatewayConcurrencyPeakDay(now time.Time) string {
	if now.IsZero() {
		now = time.Now()
	}
	return now.In(time.Local).Format("2006-01-02")
}

func finishGatewayActiveRequest(token string) {
	finishGatewayActiveRequestWithResult(token, GatewayProxyResult{})
}

func finishGatewayActiveRequestWithResult(token string, result GatewayProxyResult) {
	if token == "" {
		return
	}
	now := time.Now().UTC()
	gatewayActiveRequests.Lock()
	item, ok := gatewayActiveRequests.items[token]
	if ok {
		delete(gatewayActiveRequests.items, token)
	}
	gatewayActiveRequests.Unlock()
	if !ok {
		return
	}
	item.FinishedAt = &now
	item.Recent = true
	item.ElapsedMS = now.Sub(item.StartedAt).Milliseconds()
	item.ActualModel = normalizeModelID(firstNonEmpty(result.ActualModel, item.ActualModel, item.RequestedModel))
	item.Success = boolPtr(result.Success)
	item.StatusCode = statusCodePtrOrNil(result.StatusCode)
	item.FailureKind = gatewayFailureKindForLog(result.StatusCode, result.Error)
	if reason := strings.TrimSpace(result.Error); reason != "" {
		item.FailureReason = stringPtr(gatewayRedactText(reason))
	}
	gatewayRecentActiveRequests.Lock()
	pruneGatewayRecentActiveRequestItems(gatewayRecentActiveRequests.items, now)
	gatewayRecentActiveRequests.items[token] = item
	trimGatewayRecentActiveRequestItems(gatewayRecentActiveRequests.items)
	gatewayRecentActiveRequests.Unlock()
}

func pruneGatewayRecentActiveRequestItems(items map[string]GatewayActiveRequest, now time.Time) {
	for token, item := range items {
		if item.FinishedAt == nil || now.Sub(*item.FinishedAt) > gatewayRecentActivityTTL {
			delete(items, token)
		}
	}
}

func trimGatewayRecentActiveRequestItems(items map[string]GatewayActiveRequest) {
	extra := len(items) - gatewayRecentActivityMaxItems
	if extra <= 0 {
		return
	}
	type orderedRecentRequest struct {
		token string
		item  GatewayActiveRequest
	}
	ordered := make([]orderedRecentRequest, 0, len(items))
	for token, item := range items {
		ordered = append(ordered, orderedRecentRequest{token: token, item: item})
	}
	slices.SortFunc(ordered, func(a, b orderedRecentRequest) int {
		return gatewayFinishedAtForTrim(a.item).Compare(gatewayFinishedAtForTrim(b.item))
	})
	for idx := 0; idx < extra && idx < len(ordered); idx++ {
		delete(items, ordered[idx].token)
	}
}

func gatewayFinishedAtForTrim(item GatewayActiveRequest) time.Time {
	if item.FinishedAt == nil {
		return time.Time{}
	}
	return *item.FinishedAt
}

// ResetGatewayCountersForTest clears in-memory gateway counters/offsets.
// Intended for tests; safe to call from any goroutine.
func ResetGatewayCountersForTest() {
	gatewayActive.Lock()
	gatewayActive.counts = map[uint]int{}
	gatewayActive.Unlock()
	gatewayActiveRequests.Lock()
	gatewayActiveRequests.items = map[string]GatewayActiveRequest{}
	gatewayActiveRequests.Unlock()
	gatewayRecentActiveRequests.Lock()
	gatewayRecentActiveRequests.items = map[string]GatewayActiveRequest{}
	gatewayRecentActiveRequests.Unlock()
	gatewayRoundRobin.Lock()
	gatewayRoundRobin.offsets = map[string]int{}
	gatewayRoundRobin.Unlock()
}

// ----------------------------- types -----------------------------

const (
	smartFreshFailureWindow = 15.0
	smartDefaultLatency     = 1000.0
	ewmaAlpha               = 0.3

	gatewayRateLimitCooldownSeconds   = 5 * 60
	gatewayConcurrencyCooldownSeconds = 60
	gatewayQuotaCooldownSeconds       = 24 * 60 * 60
	gatewayRecentActivityTTL          = 3 * time.Second
	gatewayRecentActivityMaxItems     = 200
	gatewayRedactedValue              = "[redacted]"

	maxGatewayRequestBodyBytes  int64 = 128 << 20
	maxGatewayResponseBodyBytes int64 = 128 << 20
)

var (
	gatewaySensitiveTextPattern      = regexp.MustCompile(`(?i)\b(authorization|cookie|password|secret|token|key|api[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|client[_-]?secret|session|session[_-]?id|session[_-]?token|jwt|bearer|csrf|csrf[_-]?token|xsrf|xsrf[_-]?token|private[_-]?key)\b(\s*[:=]\s*)("[^"]*"|'[^']*'|[^\r\n}]+)`)
	gatewaySensitiveQuotedKeyPattern = regexp.MustCompile(`(?i)(["'])(authorization|cookie|password|secret|token|key|api[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|client[_-]?secret|session|session[_-]?id|session[_-]?token|jwt|bearer|csrf|csrf[_-]?token|xsrf|xsrf[_-]?token|private[_-]?key)(["'])(\s*[:=]\s*)("[^"]*"|'[^']*'|[^\r\n}]+)`)
)

type gatewayUpstreamFailureKind string

const (
	gatewayUpstreamFailureNone        gatewayUpstreamFailureKind = ""
	gatewayUpstreamRateLimited        gatewayUpstreamFailureKind = "rate_limited"
	gatewayUpstreamConcurrencyLimited gatewayUpstreamFailureKind = "concurrency_limited"
	gatewayUpstreamQuotaLimited       gatewayUpstreamFailureKind = "quota_limited"
)

type GatewayPolicy struct {
	RouteStrategy               string
	FailureThreshold            int
	CooldownSeconds             int
	RequestTimeout              int
	MaxAttempts                 int
	FailureRetryMode            string
	RouteConcurrencyLimit       int
	ConcurrencyTransferStrategy string
	ConcurrencyOverflowStrategy string
	SmartLatencyBias            float64
	SmartConcurrencyBias        float64
	SmartFailureBias            float64
	SmartPriorityBias           float64
}

type GatewayRoutePriorityMode string

const (
	GatewayRoutePriorityMove    GatewayRoutePriorityMode = "move"
	GatewayRoutePriorityPackage GatewayRoutePriorityMode = "package"
	GatewayRoutePriorityBalance GatewayRoutePriorityMode = "balance"
)

type GatewayRoutePriorityReorderOptions struct {
	RouteID uint
	Mode    GatewayRoutePriorityMode
	Index   int
}

type GatewayRoute struct {
	State          models.GatewayRouteState
	Site           models.Site
	APIKey         string
	RequestBaseURL string
	Groups         []models.GatewayRouteGroup
}

type GatewayRouteGroupWithCount struct {
	Group      models.GatewayRouteGroup
	RouteCount int
}

type GatewayRouteGroupInput struct {
	Name   string
	APIKey string
}

type GatewayRouteGroupUpdateInput struct {
	Name      string
	APIKey    string
	APIKeySet bool
}

type DeleteGatewayRouteResult struct {
	RouteID       uint
	SiteID        uint
	RemovedAPIKey bool
}

type GatewayProxyResult struct {
	Route             GatewayRoute
	StatusCode        int
	Header            http.Header
	Body              []byte
	TargetPath        string
	RequestURL        string
	UserAgent         string
	LatencyMS         float64
	Success           bool
	Error             string
	Attempts          int
	IsStream          bool
	PromptTokens      *int
	CachedInputTokens *int
	CacheReadTokens   *int
	CacheWriteTokens  *int
	CompletionTokens  *int
	TotalTokens       *int
	UsageCost         *float64
	ActualModel       string
	FailureRecorded   bool
}

type GatewayAllRoutesFailedError struct {
	Attempts int
	Last     string
}

func (e GatewayAllRoutesFailedError) Error() string {
	return fmt.Sprintf("网关路由池全部失败，已尝试 %d 个候选", e.Attempts)
}

type GatewayNonRetryableUpstreamError struct {
	Attempts   int
	StatusCode int
}

func (e GatewayNonRetryableUpstreamError) Error() string {
	if e.StatusCode > 0 {
		return fmt.Sprintf("上游返回不可重试错误，网关已停止切换路由，已尝试 %d 个候选，状态码 %d", e.Attempts, e.StatusCode)
	}
	return fmt.Sprintf("上游返回不可重试错误，网关已停止切换路由，已尝试 %d 个候选", e.Attempts)
}

type GatewayMaxAttemptsExceededError struct {
	Attempts    int
	MaxAttempts int
	Last        string
}

func (e GatewayMaxAttemptsExceededError) Error() string {
	if e.MaxAttempts > 0 {
		return fmt.Sprintf("网关达到最大尝试次数 %d，已尝试 %d 个候选", e.MaxAttempts, e.Attempts)
	}
	return fmt.Sprintf("网关达到最大尝试次数，已尝试 %d 个候选", e.Attempts)
}

type GatewayModelNotSupportedError struct {
	Model     string
	RouteType string
	Group     string
}

func (e GatewayModelNotSupportedError) Error() string {
	model := strings.TrimSpace(e.Model)
	if model == "" {
		model = "未知模型"
	}
	routeType := strings.TrimSpace(e.RouteType)
	if routeType == "" {
		return fmt.Sprintf("没有支持模型 %q 的网关路由，请检查路由 supported_models 配置", model)
	}
	return fmt.Sprintf("没有支持模型 %q 的 %s 网关路由，请检查路由 supported_models 配置", model, routeType)
}

type GatewayBodyTooLargeError struct {
	Kind  string
	Limit int64
}

func (e GatewayBodyTooLargeError) Error() string {
	kind := strings.TrimSpace(e.Kind)
	if kind == "" {
		kind = "网关请求体"
	}
	return fmt.Sprintf("%s过大，最大允许 %d 字节", kind, e.Limit)
}

type GatewayProbeResult struct {
	Route      GatewayRoute
	OK         bool
	StatusCode *int
	LatencyMS  *float64
	Message    string
	Models     []string
	CheckedAt  time.Time
}

type ProxyResponseHook func(statusCode int, header http.Header)

// ProxyGatewayOptions controls request-level proxy behavior.
// When ResponseWriter is set, successful upstream responses are streamed
// directly into it; the returned Body will be empty.
type ProxyGatewayOptions struct {
	ResponseWriter     http.ResponseWriter
	BeforeWrite        ProxyResponseHook
	RequestID          string
	Group              string
	RouteType          string
	ModelProbeStrategy string
}

type gatewayRouteFilterResult struct {
	Candidates []GatewayRoute
	Model      string
	RouteType  string
}

var defaultCodexGatewaySupportedModels = []string{
	"gpt-5.3-codex",
	"gpt-5.3-codex-spark",
	"gpt-5.4",
	"gpt-5.4-mini",
	"gpt-5.4-nano",
	"gpt-5.4-pro",
	"gpt-5.5",
	"gpt-5.5-pro",
}

// ----------------------------- discovery / sync -----------------------------

func SyncGatewayRoutes(db *gorm.DB) (int, error) {
	if err := cleanupOrphanGatewayRoutes(db); err != nil {
		return 0, err
	}
	if err := cleanupDisabledSiteGatewayRoutes(db); err != nil {
		return 0, err
	}
	var sites []models.Site
	if err := db.Where("is_enabled = ?", true).Order("name asc").Find(&sites).Error; err != nil {
		return 0, err
	}
	count := 0
	for _, site := range sites {
		activeFingerprints := map[string]bool{}
		manualDisabledFingerprints := disabledGatewayRouteFingerprints(site)
		for _, key := range siteAPIKeys(site) {
			fp := key.Fingerprint
			activeFingerprints[fp] = true
			routeType := firstNonEmpty(key.RouteType, inferRouteType(site))
			routePath := key.RoutePath
			explicitSupportedModels := explicitSupportedModelsForSiteKey(site, key)
			requestBaseCandidates := gatewayRouteRequestBaseCandidatesForKey(site, key)
			var state models.GatewayRouteState
			err := db.Where("site_id = ? AND key_fingerprint = ?", site.ID, fp).First(&state).Error
			if errors.Is(err, gorm.ErrRecordNotFound) {
				supportedModels := explicitSupportedModels
				modelProbeStatus := "key_metadata"
				if len(supportedModels) == 0 {
					supportedModels = defaultGatewaySupportedModels(routeType)
					if len(supportedModels) > 0 {
						modelProbeStatus = "default"
					} else {
						modelProbeStatus = ""
					}
				}
				state = models.GatewayRouteState{
					SiteID:              site.ID,
					KeyFingerprint:      fp,
					KeyName:             key.Name,
					KeySource:           key.Source,
					SiteNameSnapshot:    site.Name,
					SiteBaseURLSnapshot: site.BaseURL,
					SiteAPIURLSnapshot:  marshalStringSlice(requestBaseCandidates),
					RouteType:           routeType,
					RoutePath:           routePath,
					SupportedModels:     EncodeGatewaySupportedModels(supportedModels),
					ModelProbeStatus:    modelProbeStatus,
					GroupName:           site.GroupName,
					RoutePriority:       intValue(site.PluginConfig, "gateway_priority", 100),
					Weight:              intValue(site.PluginConfig, "gateway_weight", 1),
					IsEnabled:           !manualDisabledFingerprints[fp],
					IsEnabledManual:     manualDisabledFingerprints[fp],
					CircuitState:        "closed",
				}
				if err := db.Create(&state).Error; err != nil {
					return count, err
				}
				if manualDisabledFingerprints[fp] {
					if err := db.Model(&state).Updates(map[string]any{"is_enabled": false, "is_enabled_manual": true}).Error; err != nil {
						return count, err
					}
				}
			} else if err != nil {
				return count, err
			} else {
				state.KeyName = key.Name
				state.KeySource = key.Source
				state.SiteNameSnapshot = site.Name
				state.SiteBaseURLSnapshot = site.BaseURL
				state.SiteAPIURLSnapshot = marshalStringSlice(requestBaseCandidates)
				if state.LastRequestBaseURL != "" && !containsString(requestBaseCandidates, NormalizeBaseURL(state.LastRequestBaseURL)) {
					state.LastRequestBaseURL = ""
				}
				state.GroupName = site.GroupName
				if manualDisabledFingerprints[state.KeyFingerprint] {
					state.IsEnabled = false
					state.IsEnabledManual = true
				}
				if !state.RoutePriorityManual {
					state.RoutePriority = intValue(site.PluginConfig, "gateway_priority", state.RoutePriority)
				}
				state.Weight = intValue(site.PluginConfig, "gateway_weight", state.Weight)
				if !state.RouteTypeManual {
					state.RouteType = routeType
				}
				if key.RoutePathSet && !state.RoutePathManual {
					state.RoutePath = routePath
				}
				if len(explicitSupportedModels) > 0 {
					state.SupportedModels = EncodeGatewaySupportedModels(explicitSupportedModels)
					state.ModelProbeStatus = "key_metadata"
				}
				if err := db.Save(&state).Error; err != nil {
					return count, err
				}
			}
			count++
		}
		var staleStates []models.GatewayRouteState
		if err := db.Where("site_id = ?", site.ID).Find(&staleStates).Error; err != nil {
			return count, err
		}
		for _, state := range staleStates {
			if activeFingerprints[state.KeyFingerprint] {
				continue
			}
			if err := deleteGatewayRouteGroupMembersForRoutes(db, []uint{state.ID}); err != nil {
				return count, err
			}
			if err := db.Delete(&state).Error; err != nil {
				return count, err
			}
		}
	}
	return count, nil
}

func cleanupOrphanGatewayRoutes(db *gorm.DB) error {
	var siteIDs []uint
	if err := db.Model(&models.Site{}).Pluck("id", &siteIDs).Error; err != nil {
		return err
	}
	if len(siteIDs) == 0 {
		var routeIDs []uint
		if err := db.Model(&models.GatewayRouteState{}).Pluck("id", &routeIDs).Error; err != nil {
			return err
		}
		if err := deleteGatewayRouteGroupMembersForRoutes(db, routeIDs); err != nil {
			return err
		}
		return db.Where("1 = 1").Delete(&models.GatewayRouteState{}).Error
	}
	var routeIDs []uint
	if err := db.Model(&models.GatewayRouteState{}).Where("site_id NOT IN ?", siteIDs).Pluck("id", &routeIDs).Error; err != nil {
		return err
	}
	if err := deleteGatewayRouteGroupMembersForRoutes(db, routeIDs); err != nil {
		return err
	}
	return db.Where("site_id NOT IN ?", siteIDs).Delete(&models.GatewayRouteState{}).Error
}

func cleanupDisabledSiteGatewayRoutes(db *gorm.DB) error {
	var disabledSiteIDs []uint
	if err := db.Model(&models.Site{}).Where("is_enabled = ?", false).Pluck("id", &disabledSiteIDs).Error; err != nil {
		return err
	}
	if len(disabledSiteIDs) == 0 {
		return nil
	}
	return db.Transaction(func(tx *gorm.DB) error {
		if err := persistDisabledGatewayRoutesBeforeDelete(tx, disabledSiteIDs); err != nil {
			return err
		}
		var routeIDs []uint
		if err := tx.Model(&models.GatewayRouteState{}).Where("site_id IN ?", disabledSiteIDs).Pluck("id", &routeIDs).Error; err != nil {
			return err
		}
		if err := deleteGatewayRouteGroupMembersForRoutes(tx, routeIDs); err != nil {
			return err
		}
		return tx.Where("site_id IN ?", disabledSiteIDs).Delete(&models.GatewayRouteState{}).Error
	})
}

func persistDisabledGatewayRoutesBeforeDelete(tx *gorm.DB, siteIDs []uint) error {
	siteIDs = uniqueUintValues(siteIDs)
	if len(siteIDs) == 0 {
		return nil
	}
	var states []models.GatewayRouteState
	if err := tx.Where("site_id IN ? AND (is_enabled = ? OR is_enabled_manual = ?)", siteIDs, false, true).Find(&states).Error; err != nil {
		return err
	}
	bySite := map[uint][]string{}
	for _, state := range states {
		fingerprint := strings.TrimSpace(state.KeyFingerprint)
		if fingerprint == "" || containsString(bySite[state.SiteID], fingerprint) {
			continue
		}
		bySite[state.SiteID] = append(bySite[state.SiteID], fingerprint)
	}
	for siteID, fingerprints := range bySite {
		for _, fingerprint := range fingerprints {
			if err := updateSiteManualDisabledGatewayRoute(tx, siteID, fingerprint, true); err != nil {
				return err
			}
		}
	}
	return nil
}

func ListGatewayRoutes(db *gorm.DB, group string, includeDisabled bool) ([]GatewayRoute, error) {
	if _, err := SyncGatewayRoutes(db); err != nil {
		return nil, err
	}
	return listGatewayRoutes(db, group, includeDisabled)
}

func listGatewayRoutes(db *gorm.DB, group string, includeDisabled bool) ([]GatewayRoute, error) {
	query := db.Preload("Site")
	if strings.TrimSpace(group) != "" {
		routeIDs, err := GatewayRouteIDsForGroup(db, group)
		if err != nil {
			return nil, err
		}
		if len(routeIDs) == 0 {
			return []GatewayRoute{}, nil
		}
		query = query.Where("id IN ?", routeIDs)
	}
	if !includeDisabled {
		query = query.Where("is_enabled = ?", true)
	}
	var states []models.GatewayRouteState
	if err := query.Order("route_priority asc, id asc").Find(&states).Error; err != nil {
		return nil, err
	}
	routes := make([]GatewayRoute, 0, len(states))
	for _, state := range states {
		key := apiKeyForFingerprint(state.Site, state.KeyFingerprint)
		routes = append(routes, GatewayRoute{State: state, Site: state.Site, APIKey: key, RequestBaseURL: GatewayRouteRequestBase(state, state.Site)})
	}
	if err := hydrateGatewayRouteGroups(db, routes); err != nil {
		return nil, err
	}
	return routes, nil
}

func ReorderGatewayRoutePriorities(db *gorm.DB, opts GatewayRoutePriorityReorderOptions) ([]GatewayRoute, error) {
	if _, err := SyncGatewayRoutes(db); err != nil {
		return nil, err
	}

	var out []GatewayRoute
	err := db.Transaction(func(tx *gorm.DB) error {
		routes, err := listGatewayRoutes(tx, "", true)
		if err != nil {
			return err
		}
		if len(routes) == 0 {
			out = routes
			return nil
		}

		ordered := append([]GatewayRoute{}, routes...)
		switch opts.Mode {
		case GatewayRoutePriorityMove:
			next, err := moveGatewayRoutePriority(ordered, opts.RouteID, opts.Index)
			if err != nil {
				return err
			}
			ordered = next
		case GatewayRoutePriorityPackage:
			sort.SliceStable(ordered, func(i, j int) bool {
				return gatewayRoutePackageRank(ordered[i]) < gatewayRoutePackageRank(ordered[j])
			})
		case GatewayRoutePriorityBalance:
			sort.SliceStable(ordered, func(i, j int) bool {
				left, right := GatewayRouteBalance(ordered[i]), GatewayRouteBalance(ordered[j])
				if (left != nil) != (right != nil) {
					return left != nil
				}
				if left != nil && right != nil && *left != *right {
					return *left > *right
				}
				return false
			})
		default:
			return fmt.Errorf("unsupported priority reorder mode %q", opts.Mode)
		}

		for idx, route := range ordered {
			if err := tx.Model(&models.GatewayRouteState{}).
				Where("id = ?", route.State.ID).
				Updates(map[string]any{
					"route_priority":        idx,
					"route_priority_manual": true,
				}).Error; err != nil {
				return err
			}
		}
		out, err = listGatewayRoutes(tx, "", true)
		return err
	})
	if err != nil {
		return nil, err
	}
	return out, nil
}

func moveGatewayRoutePriority(routes []GatewayRoute, routeID uint, index int) ([]GatewayRoute, error) {
	if routeID == 0 {
		return nil, errors.New("route id is required")
	}
	source := -1
	for idx, route := range routes {
		if route.State.ID == routeID {
			source = idx
			break
		}
	}
	if source < 0 {
		return nil, errors.New("gateway route not found")
	}
	target := routes[source]
	ordered := append([]GatewayRoute{}, routes[:source]...)
	ordered = append(ordered, routes[source+1:]...)
	if index < 0 {
		index = 0
	}
	if index > len(ordered) {
		index = len(ordered)
	}
	ordered = append(ordered, GatewayRoute{})
	copy(ordered[index+1:], ordered[index:])
	ordered[index] = target
	return ordered, nil
}

func gatewayRoutePackageRank(route GatewayRoute) int {
	if gatewayRouteHasPriorityPackageGroup(route.State.GroupName) || gatewayRoutePackageLooksSubscribed(GatewayRoutePackageDisplay(route.Site)) {
		return 0
	}
	if strings.TrimSpace(GatewayRoutePackageDisplay(route.Site)) != "" {
		return 1
	}
	return 2
}

func gatewayRouteHasPriorityPackageGroup(value string) bool {
	for _, group := range parseGatewayRouteGroupNames(value) {
		if group == "订阅" || group == "套餐" {
			return true
		}
	}
	return false
}

func parseGatewayRouteGroupNames(value string) []string {
	return normalizeStringList(strings.FieldsFunc(value, func(r rune) bool {
		return strings.ContainsRune(",，;/|、\n\r\t", r)
	}))
}

func normalizeGatewayRouteGroupName(value string) string {
	return strings.TrimSpace(value)
}

func ListGatewayRouteGroups(db *gorm.DB) ([]GatewayRouteGroupWithCount, error) {
	var groups []models.GatewayRouteGroup
	if err := db.Order("name asc, id asc").Find(&groups).Error; err != nil {
		return nil, err
	}
	counts := map[uint]int{}
	if len(groups) > 0 {
		type row struct {
			GroupID uint
			Count   int
		}
		var rows []row
		if err := db.Model(&models.GatewayRouteGroupMember{}).
			Select("group_id, count(*) as count").
			Group("group_id").
			Scan(&rows).Error; err != nil {
			return nil, err
		}
		for _, item := range rows {
			counts[item.GroupID] = item.Count
		}
	}
	out := make([]GatewayRouteGroupWithCount, 0, len(groups))
	for _, group := range groups {
		out = append(out, GatewayRouteGroupWithCount{Group: group, RouteCount: counts[group.ID]})
	}
	return out, nil
}

func CreateGatewayRouteGroup(db *gorm.DB, input GatewayRouteGroupInput) (models.GatewayRouteGroup, error) {
	name := normalizeGatewayRouteGroupName(input.Name)
	if name == "" {
		return models.GatewayRouteGroup{}, errors.New("分组名称不能为空")
	}
	if err := ensureGatewayRouteGroupAPIKeyUnique(db, 0, input.APIKey); err != nil {
		return models.GatewayRouteGroup{}, err
	}
	group := models.GatewayRouteGroup{Name: name, APIKey: strings.TrimSpace(input.APIKey)}
	if err := db.Create(&group).Error; err != nil {
		return models.GatewayRouteGroup{}, err
	}
	return group, nil
}

func UpdateGatewayRouteGroup(db *gorm.DB, groupID uint, input GatewayRouteGroupUpdateInput) (models.GatewayRouteGroup, error) {
	if groupID == 0 {
		return models.GatewayRouteGroup{}, errors.New("分组 ID 无效")
	}
	name := normalizeGatewayRouteGroupName(input.Name)
	if name == "" {
		return models.GatewayRouteGroup{}, errors.New("分组名称不能为空")
	}
	if input.APIKeySet {
		if err := ensureGatewayRouteGroupAPIKeyUnique(db, groupID, input.APIKey); err != nil {
			return models.GatewayRouteGroup{}, err
		}
	}
	var group models.GatewayRouteGroup
	if err := db.First(&group, groupID).Error; err != nil {
		return models.GatewayRouteGroup{}, err
	}
	group.Name = name
	if input.APIKeySet {
		group.APIKey = strings.TrimSpace(input.APIKey)
	}
	if err := db.Save(&group).Error; err != nil {
		return models.GatewayRouteGroup{}, err
	}
	return group, nil
}

func DeleteGatewayRouteGroup(db *gorm.DB, groupID uint) error {
	if groupID == 0 {
		return errors.New("分组 ID 无效")
	}
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("group_id = ?", groupID).Delete(&models.GatewayRouteGroupMember{}).Error; err != nil {
			return err
		}
		return tx.Delete(&models.GatewayRouteGroup{}, groupID).Error
	})
}

func ReplaceGatewayRouteGroupMemberships(db *gorm.DB, routeID uint, groupIDs []uint) ([]models.GatewayRouteGroup, error) {
	if routeID == 0 {
		return nil, errors.New("路由 ID 无效")
	}
	var route models.GatewayRouteState
	if err := db.First(&route, routeID).Error; err != nil {
		return nil, err
	}
	groupIDs = uniqueUintValues(groupIDs)
	var groups []models.GatewayRouteGroup
	if len(groupIDs) > 0 {
		if err := db.Where("id IN ?", groupIDs).Order("name asc, id asc").Find(&groups).Error; err != nil {
			return nil, err
		}
		if len(groups) != len(groupIDs) {
			return nil, errors.New("包含不存在的路由分组")
		}
	}
	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("route_state_id = ?", routeID).Delete(&models.GatewayRouteGroupMember{}).Error; err != nil {
			return err
		}
		for _, groupID := range groupIDs {
			member := models.GatewayRouteGroupMember{GroupID: groupID, RouteStateID: routeID}
			if err := tx.Create(&member).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return groups, nil
}

func GatewayRouteIDsForGroup(db *gorm.DB, groupName string) ([]uint, error) {
	groupName = normalizeGatewayRouteGroupName(groupName)
	if groupName == "" {
		return nil, nil
	}
	var group models.GatewayRouteGroup
	err := db.Where("lower(name) = lower(?)", groupName).First(&group).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return []uint{}, nil
	}
	if err != nil {
		return nil, err
	}
	var routeIDs []uint
	if err := db.Model(&models.GatewayRouteGroupMember{}).
		Where("group_id = ?", group.ID).
		Pluck("route_state_id", &routeIDs).Error; err != nil {
		return nil, err
	}
	return uniqueUintValues(routeIDs), nil
}

func GatewayRouteGroupForAPIKey(db *gorm.DB, apiKey string) (models.GatewayRouteGroup, bool, error) {
	apiKey = strings.TrimSpace(apiKey)
	if apiKey == "" {
		return models.GatewayRouteGroup{}, false, nil
	}
	var group models.GatewayRouteGroup
	err := db.Where("api_key = ?", apiKey).Order("id asc").First(&group).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.GatewayRouteGroup{}, false, nil
	}
	if err != nil {
		return models.GatewayRouteGroup{}, false, err
	}
	return group, true, nil
}

func HasGatewayRouteGroupAPIKeys(db *gorm.DB) (bool, error) {
	var count int64
	if err := db.Model(&models.GatewayRouteGroup{}).Where("api_key <> ''").Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func ensureGatewayRouteGroupAPIKeyUnique(db *gorm.DB, currentID uint, apiKey string) error {
	apiKey = strings.TrimSpace(apiKey)
	if apiKey == "" {
		return nil
	}
	query := db.Model(&models.GatewayRouteGroup{}).Where("api_key = ?", apiKey)
	if currentID != 0 {
		query = query.Where("id <> ?", currentID)
	}
	var count int64
	if err := query.Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("分组 API Key 已被其他分组使用")
	}
	return nil
}

func hydrateGatewayRouteGroups(db *gorm.DB, routes []GatewayRoute) error {
	if len(routes) == 0 {
		return nil
	}
	routeIDs := make([]uint, 0, len(routes))
	indexByID := map[uint]int{}
	for idx, route := range routes {
		if route.State.ID == 0 {
			continue
		}
		routeIDs = append(routeIDs, route.State.ID)
		indexByID[route.State.ID] = idx
	}
	if len(routeIDs) == 0 {
		return nil
	}
	var members []models.GatewayRouteGroupMember
	if err := db.Preload("Group").
		Where("route_state_id IN ?", routeIDs).
		Order("route_state_id asc, group_id asc").
		Find(&members).Error; err != nil {
		return err
	}
	for _, member := range members {
		idx, ok := indexByID[member.RouteStateID]
		if !ok || member.Group.ID == 0 {
			continue
		}
		routes[idx].Groups = append(routes[idx].Groups, member.Group)
	}
	for idx := range routes {
		sort.SliceStable(routes[idx].Groups, func(i, j int) bool {
			return routes[idx].Groups[i].Name < routes[idx].Groups[j].Name
		})
	}
	return nil
}

func deleteGatewayRouteGroupMembersForRoutes(db *gorm.DB, routeIDs []uint) error {
	routeIDs = uniqueUintValues(routeIDs)
	if len(routeIDs) == 0 {
		return nil
	}
	return db.Where("route_state_id IN ?", routeIDs).Delete(&models.GatewayRouteGroupMember{}).Error
}

func GatewayRoutePackageDisplay(site models.Site) string {
	value := NormalizeBalanceUnitText(stringMapValue(site.PluginConfig, "package_display", ""))
	if value == "" {
		value = NormalizeBalanceUnitText(stringMapValue(site.PluginConfig, "package_name", ""))
	}
	if value == "" {
		value = NormalizeBalanceUnitText(stringMapValue(site.PluginConfig, "plan_name", ""))
	}
	remaining, hasRemaining := numericMapValue(site.PluginConfig, "package_remaining")
	total, hasTotal := numericMapValue(site.PluginConfig, "package_total")
	used, hasUsed := numericMapValue(site.PluginConfig, "package_used")
	unit := NormalizeBalanceUnit(stringMapValue(site.PluginConfig, "package_unit", ""))
	quota := ""
	if hasRemaining && hasTotal {
		quota = fmt.Sprintf("余量 %s / %s", formatBalanceAmount(remaining, unit), formatBalanceAmount(total, unit))
	} else if hasRemaining {
		quota = fmt.Sprintf("余量 %s", formatBalanceAmount(remaining, unit))
	} else if hasUsed && hasTotal {
		quota = fmt.Sprintf("已用 %s / %s", formatBalanceAmount(used, unit), formatBalanceAmount(total, unit))
	}
	if value != "" && quota != "" && !strings.Contains(value, quota) {
		return value + " · " + quota
	}
	if value == "" {
		return quota
	}
	return value
}

func formatBalanceAmount(value float64, unit string) string {
	text := formatCompactNumber(value)
	unit = NormalizeBalanceUnit(unit)
	if unit == "" {
		return text
	}
	if BalanceUnitIsSymbol(unit) {
		return unit + text
	}
	return text + " " + unit
}

func numericMapValue(m models.JSONMap, key string) (float64, bool) {
	if m == nil || m[key] == nil {
		return 0, false
	}
	switch typed := m[key].(type) {
	case float64:
		return typed, true
	case float32:
		return float64(typed), true
	case int:
		return float64(typed), true
	case int64:
		return float64(typed), true
	case json.Number:
		value, err := typed.Float64()
		return value, err == nil
	case string:
		value, err := strconv.ParseFloat(strings.TrimSpace(typed), 64)
		return value, err == nil
	default:
		return 0, false
	}
}

func formatCompactNumber(value float64) string {
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%.2f", value), "0"), ".")
}

func gatewayRoutePackageLooksSubscribed(value string) bool {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return false
	}
	return strings.Contains(normalized, "订阅") ||
		strings.Contains(normalized, "subscription") ||
		strings.Contains(normalized, "subscribe")
}

func GetGatewayRoute(db *gorm.DB, routeID string) (GatewayRoute, error) {
	var state models.GatewayRouteState
	if err := db.Preload("Site").First(&state, routeID).Error; err != nil {
		return GatewayRoute{}, err
	}
	route := GatewayRoute{
		State:          state,
		Site:           state.Site,
		APIKey:         apiKeyForFingerprint(state.Site, state.KeyFingerprint),
		RequestBaseURL: GatewayRouteRequestBase(state, state.Site),
	}
	routes := []GatewayRoute{route}
	if err := hydrateGatewayRouteGroups(db, routes); err != nil {
		return GatewayRoute{}, err
	}
	return routes[0], nil
}

func DeleteGatewayRoute(db *gorm.DB, routeID uint) (DeleteGatewayRouteResult, error) {
	if routeID == 0 {
		return DeleteGatewayRouteResult{}, gorm.ErrRecordNotFound
	}
	result := DeleteGatewayRouteResult{RouteID: routeID}
	err := db.Transaction(func(tx *gorm.DB) error {
		var state models.GatewayRouteState
		if err := tx.Preload("Site").First(&state, routeID).Error; err != nil {
			return err
		}
		result.SiteID = state.SiteID
		site := state.Site
		apiKeyInUse, err := gatewayRouteAPIKeyValueInUse(tx, site, state)
		if err != nil {
			return err
		}
		if site.ID != 0 && !apiKeyInUse && removeSiteAPIKeyForGatewayRoute(&site, state.KeyFingerprint) {
			if err := tx.Model(&models.Site{}).Where("id = ?", site.ID).Update("credentials", site.Credentials).Error; err != nil {
				return err
			}
			result.RemovedAPIKey = true
		}
		if site.ID != 0 {
			if err := updateSiteManualDisabledGatewayRoute(tx, state.SiteID, state.KeyFingerprint, false); err != nil {
				return err
			}
		}
		if err := deleteGatewayRouteGroupMembersForRoutes(tx, []uint{state.ID}); err != nil {
			return err
		}
		return tx.Delete(&state).Error
	})
	if err != nil {
		return DeleteGatewayRouteResult{}, err
	}
	return result, nil
}

func gatewayRouteAPIKeyValueInUse(db *gorm.DB, site models.Site, deletingState models.GatewayRouteState) (bool, error) {
	key, ok := siteKeyForFingerprint(site, deletingState.KeyFingerprint)
	if !ok || strings.TrimSpace(key.Value) == "" {
		return false, nil
	}
	var states []models.GatewayRouteState
	if err := db.Where("site_id = ? AND id <> ?", deletingState.SiteID, deletingState.ID).Find(&states).Error; err != nil {
		return false, err
	}
	for _, state := range states {
		otherKey, ok := siteKeyForFingerprint(site, state.KeyFingerprint)
		if ok && otherKey.Value == key.Value {
			return true, nil
		}
	}
	return false, nil
}

// ----------------------------- candidate ordering -----------------------------

func filterAndOrderCandidates(routes []GatewayRoute, group, routeType string, policy GatewayPolicy) []GatewayRoute {
	now := time.Now().UTC()
	rt := normalizeRouteType(routeType)
	candidates := make([]GatewayRoute, 0, len(routes))
	for _, route := range routes {
		if route.APIKey == "" || !route.Site.IsEnabled || !route.State.IsEnabled {
			continue
		}
		if rt != "" && route.State.RouteType != rt && route.State.RouteType != "general" {
			continue
		}
		// refresh half-open after cooldown
		if route.State.CircuitState == "open" {
			if route.State.CircuitOpenUntil != nil && route.State.CircuitOpenUntil.Before(now) {
				route.State.CircuitState = "half_open"
				route.State.CircuitOpenUntil = nil
			} else {
				continue
			}
		}
		candidates = append(candidates, route)
	}
	if len(candidates) == 0 {
		return candidates
	}
	closed := make([]GatewayRoute, 0)
	halfOpenAll := make([]GatewayRoute, 0)
	for _, c := range candidates {
		if c.State.CircuitState == "half_open" {
			halfOpenAll = append(halfOpenAll, c)
		} else {
			closed = append(closed, c)
		}
	}
	withinClosed, overflowClosed := splitByConcurrency(closed, policy)
	halfOpen, overflowHalf := splitByConcurrency(halfOpenAll, policy)

	bucket := normalizeStrategy(policy.RouteStrategy) + ":" + strings.ToLower(strings.TrimSpace(group))

	var ordered []GatewayRoute
	switch normalizeStrategy(policy.RouteStrategy) {
	case "smart":
		ref := referenceLatency(append(append([]GatewayRoute{}, withinClosed...), halfOpen...))
		ordered = append(sortBySmart(withinClosed, ref, policy, now), sortBySmart(halfOpen, ref, policy, now)...)
	case "latency_first":
		ordered = append(sortByLatency(withinClosed), sortByLoadAndPriority(halfOpen)...)
	case "priority":
		ordered = append(sortByStrictPriority(withinClosed), sortByStrictPriority(halfOpen)...)
	default: // round_robin
		base := append([]GatewayRoute{}, withinClosed...)
		sort.SliceStable(base, func(i, j int) bool {
			fi, fj := candidateFailureRank(base[i]), candidateFailureRank(base[j])
			if fi != fj {
				return fi < fj
			}
			if base[i].State.RoutePriority != base[j].State.RoutePriority {
				return base[i].State.RoutePriority < base[j].State.RoutePriority
			}
			if base[i].State.ConsecutiveFailures != base[j].State.ConsecutiveFailures {
				return base[i].State.ConsecutiveFailures < base[j].State.ConsecutiveFailures
			}
			return base[i].Site.Name < base[j].Site.Name
		})
		if policy.ConcurrencyTransferStrategy == "limit_only" {
			ordered = preferActiveWithinLimit(base, policy)
		} else {
			ordered = rotateUnique(base, bucket, true)
		}
		ordered = append(ordered, sortByLoadAndPriority(halfOpen)...)
	}

	if policy.ConcurrencyTransferStrategy == "balance" && normalizeStrategy(policy.RouteStrategy) != "priority" {
		ordered = sortByLoadThenExistingOrder(ordered)
	}

	if len(overflowClosed) > 0 {
		ordered = append(ordered, sortConcurrencyOverflow(overflowClosed, policy)...)
	}
	if len(overflowHalf) > 0 {
		ordered = append(ordered, sortConcurrencyOverflow(overflowHalf, policy)...)
	}
	return ordered
}

func splitByConcurrency(in []GatewayRoute, policy GatewayPolicy) (within, overflow []GatewayRoute) {
	for _, r := range in {
		if candidateBelowConcurrencyLimit(r, policy) {
			within = append(within, r)
		} else {
			overflow = append(overflow, r)
		}
	}
	return
}

func candidateBelowConcurrencyLimit(r GatewayRoute, policy GatewayPolicy) bool {
	active := RouteActiveCount(r.State.ID)
	if r.State.CircuitState == "half_open" {
		return active < 1
	}
	if policy.RouteConcurrencyLimit <= 0 {
		return true
	}
	return active < policy.RouteConcurrencyLimit
}

func sortByLatency(in []GatewayRoute) []GatewayRoute {
	out := append([]GatewayRoute{}, in...)
	sort.SliceStable(out, func(i, j int) bool {
		fi, fj := candidateFailureRank(out[i]), candidateFailureRank(out[j])
		if fi != fj {
			return fi < fj
		}
		ai := candidateEffectiveLatency(out[i])
		aj := candidateEffectiveLatency(out[j])
		if ai != aj {
			return ai < aj
		}
		return candidateLoadRank(out[i]) < candidateLoadRank(out[j])
	})
	return out
}

func sortByLoadAndPriority(in []GatewayRoute) []GatewayRoute {
	out := append([]GatewayRoute{}, in...)
	sort.SliceStable(out, func(i, j int) bool {
		fi, fj := candidateFailureRank(out[i]), candidateFailureRank(out[j])
		if fi != fj {
			return fi < fj
		}
		ai, aj := candidateLoadRank(out[i]), candidateLoadRank(out[j])
		if ai != aj {
			return ai < aj
		}
		if out[i].State.RoutePriority != out[j].State.RoutePriority {
			return out[i].State.RoutePriority < out[j].State.RoutePriority
		}
		return out[i].Site.Name < out[j].Site.Name
	})
	return out
}

func sortBySmart(in []GatewayRoute, ref float64, policy GatewayPolicy, now time.Time) []GatewayRoute {
	out := append([]GatewayRoute{}, in...)
	sort.SliceStable(out, func(i, j int) bool {
		si := smartScore(out[i], ref, policy, now)
		sj := smartScore(out[j], ref, policy, now)
		if si != sj {
			return si < sj
		}
		return out[i].Site.Name < out[j].Site.Name
	})
	return out
}

func sortByStrictPriority(in []GatewayRoute) []GatewayRoute {
	out := append([]GatewayRoute{}, in...)
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].State.RoutePriority != out[j].State.RoutePriority {
			return out[i].State.RoutePriority < out[j].State.RoutePriority
		}
		if out[i].State.ID != out[j].State.ID {
			return out[i].State.ID < out[j].State.ID
		}
		return out[i].Site.Name < out[j].Site.Name
	})
	return out
}

func sortByLoadThenExistingOrder(in []GatewayRoute) []GatewayRoute {
	out := append([]GatewayRoute{}, in...)
	sort.SliceStable(out, func(i, j int) bool {
		fi, fj := candidateFailureRank(out[i]), candidateFailureRank(out[j])
		if fi != fj {
			return fi < fj
		}
		return RouteActiveCount(out[i].State.ID) < RouteActiveCount(out[j].State.ID)
	})
	return out
}

func preferActiveWithinLimit(in []GatewayRoute, policy GatewayPolicy) []GatewayRoute {
	if strings.ToLower(strings.TrimSpace(policy.ConcurrencyTransferStrategy)) != "limit_only" {
		return append([]GatewayRoute{}, in...)
	}
	out := append([]GatewayRoute{}, in...)
	sort.SliceStable(out, func(i, j int) bool {
		ai, aj := RouteActiveCount(out[i].State.ID), RouteActiveCount(out[j].State.ID)
		iActive := ai > 0 && candidateBelowConcurrencyLimit(out[i], policy)
		jActive := aj > 0 && candidateBelowConcurrencyLimit(out[j], policy)
		if iActive != jActive {
			return iActive
		}
		if iActive && ai != aj {
			return ai > aj
		}
		return false
	})
	return out
}

func sortConcurrencyOverflow(in []GatewayRoute, policy GatewayPolicy) []GatewayRoute {
	if strings.ToLower(strings.TrimSpace(policy.ConcurrencyOverflowStrategy)) == "sequential" {
		return sortByStrictPriority(in)
	}
	return sortByLatency(in)
}

func candidateHealthRank(r GatewayRoute) int {
	if r.State.CircuitState == "half_open" {
		return 1
	}
	return 0
}

func candidateLoadRank(r GatewayRoute) int {
	return RouteActiveCount(r.State.ID)*1000 - candidateEffectiveWeight(r)
}

func candidateEffectiveWeight(r GatewayRoute) int {
	weight := maxInt(r.State.Weight, 1)
	failures := maxInt(r.State.ConsecutiveFailures, 0)
	if failures == 0 {
		return weight
	}
	penalty := 1
	for i := 0; i < failures && i < 8; i++ {
		penalty *= 2
	}
	return maxInt(weight/penalty, 1)
}

func candidateFailureRank(r GatewayRoute) int {
	rank := maxInt(r.State.ConsecutiveFailures, 0) * 1000
	if r.State.LastFailureAt != nil && (r.State.LastSuccessAt == nil || r.State.LastFailureAt.After(*r.State.LastSuccessAt)) {
		rank += 500
	}
	if r.State.RequestCount >= 5 {
		rank += int(float64(r.State.FailureCount) / float64(maxInt(r.State.RequestCount, 1)) * 100)
	}
	return rank
}

func candidateEffectiveLatency(r GatewayRoute) float64 {
	if r.State.EWMALatencyMS != nil {
		return *r.State.EWMALatencyMS
	}
	if r.State.AvgLatencyMS != nil {
		return *r.State.AvgLatencyMS
	}
	return float64(1 << 30)
}

func referenceLatency(routes []GatewayRoute) float64 {
	samples := make([]float64, 0, len(routes))
	for _, r := range routes {
		if r.State.EWMALatencyMS != nil && *r.State.EWMALatencyMS > 0 {
			samples = append(samples, *r.State.EWMALatencyMS)
		} else if r.State.AvgLatencyMS != nil && *r.State.AvgLatencyMS > 0 {
			samples = append(samples, *r.State.AvgLatencyMS)
		}
	}
	if len(samples) == 0 {
		return smartDefaultLatency
	}
	sort.Float64s(samples)
	return samples[len(samples)/2]
}

func smartScore(r GatewayRoute, ref float64, policy GatewayPolicy, now time.Time) float64 {
	state := r.State
	health := 0.0
	if state.CircuitState == "half_open" {
		health = 0.5
	}
	active := RouteActiveCount(state.ID)
	concurrencyFactor := 0.0
	if policy.RouteConcurrencyLimit > 0 {
		concurrencyFactor = float64(active) / float64(policy.RouteConcurrencyLimit)
	} else {
		concurrencyFactor = float64(active) * 0.05
	}
	latencyFactor := 0.5
	if l := candidateEffectiveLatency(r); l < float64(1<<29) {
		ref = max(ref, 1.0)
		latencyFactor = l / ref
	}
	consecutiveFactor := float64(state.ConsecutiveFailures) * 0.1
	freshFailure := 0.0
	if state.LastFailureAt != nil {
		elapsed := now.Sub(*state.LastFailureAt).Seconds()
		if elapsed >= 0 && elapsed < smartFreshFailureWindow {
			freshFailure = (smartFreshFailureWindow - elapsed) / smartFreshFailureWindow
		}
	}
	weightFactor := 1.0 / float64(maxInt(state.Weight, 1))
	priorityFactor := float64(state.RoutePriority) / 1000.0
	failureRate := 0.0
	if state.RequestCount >= 5 {
		failureRate = float64(state.FailureCount) / float64(maxInt(state.RequestCount, 1))
	}
	return health +
		concurrencyFactor*orDefault(policy.SmartConcurrencyBias, 1.5) +
		latencyFactor*orDefault(policy.SmartLatencyBias, 1.0) +
		consecutiveFactor*orDefault(policy.SmartFailureBias, 1.0)*0.5 +
		freshFailure*orDefault(policy.SmartFailureBias, 1.0) +
		failureRate*orDefault(policy.SmartFailureBias, 1.0) +
		weightFactor*orDefault(policy.SmartPriorityBias, 0.5) +
		priorityFactor*orDefault(policy.SmartPriorityBias, 0.5)
}

func rotateUnique(in []GatewayRoute, bucket string, weighted bool) []GatewayRoute {
	if len(in) == 0 {
		return in
	}
	if !weighted {
		gatewayRoundRobin.Lock()
		start := gatewayRoundRobin.offsets[bucket] % len(in)
		gatewayRoundRobin.offsets[bucket] = start + 1
		gatewayRoundRobin.Unlock()
		out := append([]GatewayRoute{}, in[start:]...)
		out = append(out, in[:start]...)
		return out
	}
	expanded := make([]int, 0, len(in))
	for idx, r := range in {
		w := r.State.Weight
		if w <= 0 {
			w = 1
		}
		for i := 0; i < w; i++ {
			expanded = append(expanded, idx)
		}
	}
	gatewayRoundRobin.Lock()
	start := gatewayRoundRobin.offsets[bucket] % len(expanded)
	gatewayRoundRobin.offsets[bucket] = start + 1
	gatewayRoundRobin.Unlock()
	primary := expanded[start]
	out := []GatewayRoute{in[primary]}
	for idx, r := range in {
		if idx == primary {
			continue
		}
		out = append(out, r)
	}
	return out
}

// SelectGatewayRoute is preserved for back-compat (ignores excluded set + concurrency).
func SelectGatewayRoute(db *gorm.DB, group, routeType string, policy GatewayPolicy, excluded map[uint]bool) (GatewayRoute, error) {
	routes, err := ListGatewayRoutes(db, group, false)
	if err != nil {
		return GatewayRoute{}, err
	}
	policy = normalizePolicy(policy)
	filtered, err := filterGatewayRoutesByRequest(routes, group, routeType, "", nil)
	if err != nil {
		return GatewayRoute{}, err
	}
	ordered := filterAndOrderCandidates(filtered.Candidates, group, filtered.RouteType, policy)
	for _, r := range ordered {
		if excluded == nil || !excluded[r.State.ID] {
			return r, nil
		}
	}
	return GatewayRoute{}, errors.New("没有可用的网关路由")
}

// ----------------------------- proxy core -----------------------------

func ProxyGatewayRequest(ctx context.Context, db *gorm.DB, r *http.Request, targetPath, group, routeType string, policy GatewayPolicy) (GatewayProxyResult, error) {
	return ProxyGatewayRequestWithOptions(ctx, db, r, targetPath, ProxyGatewayOptions{Group: group, RouteType: routeType}, policy)
}

func ProxyGatewayRequestWithOptions(ctx context.Context, db *gorm.DB, r *http.Request, targetPath string, opts ProxyGatewayOptions, policy GatewayPolicy) (GatewayProxyResult, error) {
	policy = normalizePolicy(policy)

	body, err := readGatewayRequestBody(r)
	if err != nil {
		return GatewayProxyResult{}, err
	}
	if shouldServeGatewayModelProbe(r.Method, targetPath, opts.ModelProbeStrategy) {
		return gatewayModelProbeResponse(db, opts, policy)
	}
	streaming := isStreamingRequest(r, body)
	if opts.RequestID == "" {
		opts.RequestID = newRequestID()
	}
	requestedModel := GatewayRequestModelFromBody(body)

	routes, err := ListGatewayRoutes(db, opts.Group, false)
	if err != nil {
		return GatewayProxyResult{}, err
	}
	filtered, err := filterGatewayRoutesByRequest(routes, opts.Group, opts.RouteType, targetPath, body)
	if err != nil {
		return GatewayProxyResult{}, err
	}
	ordered := filterAndOrderCandidates(filtered.Candidates, opts.Group, filtered.RouteType, policy)
	if len(ordered) == 0 {
		return GatewayProxyResult{}, errors.New("没有可用的网关路由")
	}

	var lastResult GatewayProxyResult
	var lastErr error
	attemptCount := 0
	countedFailureRouteIDs := map[uint]bool{}
	for _, route := range ordered {
		if policy.MaxAttempts > 0 && attemptCount >= policy.MaxAttempts {
			lastMessage := strings.TrimSpace(lastResult.Error)
			if lastMessage == "" && lastErr != nil {
				lastMessage = lastErr.Error()
			}
			lastResult.Success = false
			lastResult.Body = nil
			lastResult.Header = nil
			lastResult.Error = lastMessage
			return lastResult, GatewayMaxAttemptsExceededError{Attempts: attemptCount, MaxAttempts: policy.MaxAttempts, Last: lastMessage}
		}
		attemptCount++
		attempt := attemptCount
		for _, baseURL := range gatewayRouteBasesInOrder(route) {
			candidateRoute := route
			candidateRoute.RequestBaseURL = baseURL
			countFailure := !countedFailureRouteIDs[candidateRoute.State.ID]
			result, shouldFallback, err := proxyGatewayAttempt(ctx, db, r, body, candidateRoute, targetPath, opts, policy, streaming, attempt, requestedModel, countFailure)
			if result.FailureRecorded && candidateRoute.State.ID != 0 {
				countedFailureRouteIDs[candidateRoute.State.ID] = true
			}
			result.Attempts = attempt
			result.IsStream = streaming
			LogGatewayRequest(db, candidateRoute, firstNonEmpty(result.TargetPath, targetPath), result.RequestURL, result.UserAgent, r.Method, requestedModel, firstNonEmpty(result.ActualModel, requestedModel), statusCodePtrOrNil(result.StatusCode), result.Success, result.LatencyMS, result.Error, policy.RouteStrategy, attempt, streaming, opts.RequestID, GatewayUsage{
				PromptTokens:      result.PromptTokens,
				CachedInputTokens: result.CachedInputTokens,
				CacheReadTokens:   result.CacheReadTokens,
				CacheWriteTokens:  result.CacheWriteTokens,
				CompletionTokens:  result.CompletionTokens,
				TotalTokens:       result.TotalTokens,
				UsageCost:         result.UsageCost,
			})
			lastResult = result
			lastErr = err
			if err == nil && result.Success {
				return result, nil
			}
			if !shouldFallback {
				lastResult.Success = false
				lastResult.Body = nil
				lastResult.Header = nil
				return lastResult, GatewayNonRetryableUpstreamError{Attempts: attemptCount, StatusCode: lastResult.StatusCode}
			}
		}
	}
	lastMessage := strings.TrimSpace(lastResult.Error)
	if lastMessage == "" && lastErr != nil {
		lastMessage = lastErr.Error()
	}
	if lastMessage == "" && lastResult.StatusCode > 0 {
		lastMessage = fmt.Sprintf("status=%d", lastResult.StatusCode)
	}
	lastResult.Success = false
	lastResult.Body = nil
	lastResult.Header = nil
	lastResult.Error = lastMessage
	return lastResult, GatewayAllRoutesFailedError{Attempts: attemptCount, Last: lastMessage}
}

func proxyGatewayAttempt(ctx context.Context, db *gorm.DB, r *http.Request, body []byte, route GatewayRoute, targetPath string, opts ProxyGatewayOptions, policy GatewayPolicy, streaming bool, attempt int, requestedModel string, countFailure bool) (GatewayProxyResult, bool, error) {
	upstreamTargetPath := gatewayUpstreamTargetPath(route, targetPath)
	upstreamURL, err := targetURL(route.RequestBaseURL, upstreamTargetPath, r.URL.RawQuery, route.State.RouteType, route.State.RoutePath)
	if err != nil {
		return GatewayProxyResult{Route: route, TargetPath: upstreamTargetPath, Error: err.Error()}, true, err
	}

	circuitBefore := route.State.CircuitState
	_ = circuitBefore // captured by caller through LogGatewayRequest via fresh route.State
	activeConcurrency := acquireRoute(route.State.ID)
	_ = RecordGatewayCurrentConcurrencyPeak(db, time.Now())
	activeToken := beginGatewayActiveRequest(route, upstreamTargetPath, upstreamURL, r.Method, policy.RouteStrategy, attempt, streaming, opts.RequestID, activeConcurrency, requestedModel)
	var activeResult GatewayProxyResult
	defer func() {
		finishGatewayActiveRequestWithResult(activeToken, activeResult)
		releaseRoute(route.State.ID)
	}()

	timeout := time.Duration(policy.RequestTimeout) * time.Second
	reqCtx := ctx
	var cancel context.CancelFunc
	if !streaming {
		reqCtx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	upstreamBody := sanitizeGatewayRequestBodyForProxy(upstreamTargetPath, body)
	var bodyReader io.Reader
	if len(upstreamBody) > 0 {
		bodyReader = bytes.NewReader(upstreamBody)
	}
	req, err := http.NewRequestWithContext(reqCtx, r.Method, upstreamURL, bodyReader)
	if err != nil {
		activeResult = GatewayProxyResult{Route: route, TargetPath: upstreamTargetPath, RequestURL: upstreamURL, Error: err.Error()}
		return activeResult, true, err
	}
	copyGatewayHeaders(req.Header, r.Header)
	upstreamUserAgent := gatewayUpstreamUserAgent(route, r.Header.Get("User-Agent"))
	req.Header.Set("User-Agent", upstreamUserAgent)
	req.Header.Set("Authorization", "Bearer "+route.APIKey)

	client := &http.Client{}
	if !streaming {
		client.Timeout = timeout
	}

	start := time.Now()
	resp, err := client.Do(req)
	latency := float64(time.Since(start).Microseconds()) / 1000.0
	if err != nil {
		recordGatewayAttemptFailure(db, &route.State, err.Error(), latency, nil, policy, countFailure)
		activeResult = GatewayProxyResult{Route: route, TargetPath: upstreamTargetPath, RequestURL: upstreamURL, UserAgent: upstreamUserAgent, LatencyMS: latency, Success: false, Error: err.Error(), ActualModel: requestedModel}
		activeResult.FailureRecorded = countFailure
		return activeResult, true, nil
	}

	statusCode := resp.StatusCode
	is2xx := statusCode >= 200 && statusCode < 300

	if is2xx && streaming && opts.ResponseWriter != nil {
		sanitizeResponses := gatewayResponsesTargetPath(upstreamTargetPath)
		streamReader, firstChunk, bootstrapErr := prepareGatewayStreamBootstrap(resp.Body, sanitizeResponses)
		if bootstrapErr != nil {
			_ = resp.Body.Close()
			reason := bootstrapErr.Error()
			if errors.Is(bootstrapErr, io.EOF) {
				reason = "upstream stream closed before first payload"
			}
			end := time.Now()
			actualLatency := float64(end.Sub(start).Microseconds()) / 1000.0
			recordGatewayAttemptFailure(db, &route.State, reason, actualLatency, &statusCode, policy, countFailure)
			activeResult = GatewayProxyResult{Route: route, StatusCode: statusCode, Header: resp.Header.Clone(), TargetPath: upstreamTargetPath, RequestURL: upstreamURL, UserAgent: upstreamUserAgent, LatencyMS: actualLatency, Success: false, Error: reason, ActualModel: requestedModel}
			activeResult.FailureRecorded = countFailure
			return activeResult, true, nil
		}
		if opts.BeforeWrite != nil {
			opts.BeforeWrite(statusCode, resp.Header.Clone())
		}
		writeStreamHeaders(opts.ResponseWriter, resp.Header, statusCode)
		written, usage, actualModel, copyErr := streamBodyWithInitial(opts.ResponseWriter, streamReader, sanitizeResponses, firstChunk)
		_ = resp.Body.Close()
		end := time.Now()
		actualLatency := float64(end.Sub(start).Microseconds()) / 1000.0
		if copyErr != nil && written == 0 {
			// Nothing flushed yet; count as failure and allow retry.
			recordGatewayAttemptFailure(db, &route.State, copyErr.Error(), actualLatency, &statusCode, policy, countFailure)
			activeResult = GatewayProxyResult{Route: route, StatusCode: statusCode, Header: resp.Header.Clone(), TargetPath: upstreamTargetPath, RequestURL: upstreamURL, UserAgent: upstreamUserAgent, LatencyMS: actualLatency, Success: false, Error: copyErr.Error(), ActualModel: requestedModel}
			activeResult.FailureRecorded = countFailure
			return activeResult, true, nil
		}
		// once data is on the wire, treat as success even if upstream cuts off mid-stream
		route.State.LastRequestBaseURL = route.RequestBaseURL
		UpdateRouteSuccess(db, &route.State, statusCode, latency)
		activeResult = GatewayProxyResult{
			Route:             route,
			StatusCode:        statusCode,
			Header:            resp.Header.Clone(),
			TargetPath:        upstreamTargetPath,
			RequestURL:        upstreamURL,
			UserAgent:         upstreamUserAgent,
			LatencyMS:         actualLatency,
			Success:           true,
			PromptTokens:      usage.PromptTokens,
			CachedInputTokens: usage.CachedInputTokens,
			CacheReadTokens:   usage.CacheReadTokens,
			CacheWriteTokens:  usage.CacheWriteTokens,
			CompletionTokens:  usage.CompletionTokens,
			TotalTokens:       usage.TotalTokens,
			UsageCost:         usage.UsageCost,
			ActualModel:       firstNonEmpty(actualModel, requestedModel),
		}
		return activeResult, false, nil
	}

	respBody, readErr := readGatewayResponseBody(resp)
	_ = resp.Body.Close()
	if readErr != nil {
		reason := readErr.Error()
		recordGatewayAttemptFailure(db, &route.State, reason, latency, &statusCode, policy, countFailure)
		activeResult = GatewayProxyResult{Route: route, StatusCode: statusCode, Header: resp.Header.Clone(), TargetPath: upstreamTargetPath, RequestURL: upstreamURL, UserAgent: upstreamUserAgent, LatencyMS: latency, Success: false, Error: reason, ActualModel: requestedModel}
		activeResult.FailureRecorded = countFailure
		return activeResult, true, nil
	}

	if is2xx {
		usage := ExtractGatewayUsage(respBody)
		actualModel := firstNonEmpty(ExtractGatewayModelFromResponseBody(respBody), requestedModel)
		rawRespBody := append([]byte(nil), respBody...)
		respBody = sanitizeGatewayResponseBodyForProxy(upstreamTargetPath, respBody)
		if gatewayResponsesTargetPath(upstreamTargetPath) &&
			gatewayResponseBodyHasStructuredPayload(rawRespBody) &&
			!gatewayResponseBodyHasVisiblePayload(respBody) {
			reason := "upstream response has no visible payload"
			recordGatewayAttemptFailure(db, &route.State, reason, latency, &statusCode, policy, countFailure)
			activeResult = GatewayProxyResult{
				Route:             route,
				StatusCode:        statusCode,
				Header:            resp.Header.Clone(),
				Body:              respBody,
				TargetPath:        upstreamTargetPath,
				RequestURL:        upstreamURL,
				UserAgent:         upstreamUserAgent,
				LatencyMS:         latency,
				Success:           false,
				Error:             reason,
				PromptTokens:      usage.PromptTokens,
				CachedInputTokens: usage.CachedInputTokens,
				CacheReadTokens:   usage.CacheReadTokens,
				CacheWriteTokens:  usage.CacheWriteTokens,
				CompletionTokens:  usage.CompletionTokens,
				TotalTokens:       usage.TotalTokens,
				UsageCost:         usage.UsageCost,
				ActualModel:       actualModel,
				FailureRecorded:   countFailure,
			}
			return activeResult, true, nil
		}
		route.State.LastRequestBaseURL = route.RequestBaseURL
		UpdateRouteSuccess(db, &route.State, statusCode, latency)
		if opts.ResponseWriter != nil {
			if opts.BeforeWrite != nil {
				opts.BeforeWrite(statusCode, resp.Header.Clone())
			}
			writeStreamHeaders(opts.ResponseWriter, resp.Header, statusCode)
			_, _ = opts.ResponseWriter.Write(respBody)
		}
		activeResult = GatewayProxyResult{
			Route:             route,
			StatusCode:        statusCode,
			Header:            resp.Header.Clone(),
			Body:              respBody,
			TargetPath:        upstreamTargetPath,
			RequestURL:        upstreamURL,
			UserAgent:         upstreamUserAgent,
			LatencyMS:         latency,
			Success:           true,
			PromptTokens:      usage.PromptTokens,
			CachedInputTokens: usage.CachedInputTokens,
			CacheReadTokens:   usage.CacheReadTokens,
			CacheWriteTokens:  usage.CacheWriteTokens,
			CompletionTokens:  usage.CompletionTokens,
			TotalTokens:       usage.TotalTokens,
			UsageCost:         usage.UsageCost,
			ActualModel:       actualModel,
		}
		return activeResult, false, nil
	}

	reason := strings.TrimSpace(string(respBody))
	if reason == "" {
		reason = fmt.Sprintf("status=%d", statusCode)
	}
	recordGatewayAttemptFailure(db, &route.State, reason, latency, &statusCode, policy, countFailure)
	activeResult = GatewayProxyResult{Route: route, StatusCode: statusCode, Header: resp.Header.Clone(), Body: respBody, TargetPath: upstreamTargetPath, RequestURL: upstreamURL, UserAgent: upstreamUserAgent, LatencyMS: latency, Success: false, Error: reason, ActualModel: firstNonEmpty(ExtractGatewayModelFromResponseBody(respBody), requestedModel)}
	activeResult.FailureRecorded = countFailure
	return activeResult, shouldFallbackGatewayFailure(statusCode, reason, policy.FailureRetryMode), nil
}

func recordGatewayAttemptFailure(db *gorm.DB, state *models.GatewayRouteState, message string, latency float64, statusCode *int, policy GatewayPolicy, countFailure bool) {
	if countFailure {
		UpdateRouteFailure(db, state, message, latency, statusCode, policy)
		return
	}
	UpdateRouteFailureObservation(db, state, message, latency, statusCode)
}

func gatewayUpstreamTargetPath(route GatewayRoute, targetPath string) string {
	normalized := normalizeGatewayTargetPath(targetPath)
	switch normalized {
	case "images/generations":
		if path := gatewayImagePathForRoute(route, "image_generation_path"); path != "" {
			return path
		}
		if path := gatewayImagePathFromConfig(route.Site.PluginConfig, "image_generation_path"); path != "" {
			return path
		}
	case "images/edits":
		if path := gatewayImagePathForRoute(route, "image_edit_path"); path != "" {
			return path
		}
		if path := gatewayImagePathFromConfig(route.Site.PluginConfig, "image_edit_path"); path != "" {
			return path
		}
	case "chat/completions", "completions", "responses":
		switch normalizeGatewayRoutePath(route.State.RoutePath) {
		case "chat/completions":
			return "chat/completions"
		case "responses":
			return "responses"
		}
	}
	return targetPath
}

func gatewayImagePathForRoute(route GatewayRoute, key string) string {
	siteKey, ok := siteKeyForFingerprint(route.Site, route.State.KeyFingerprint)
	if !ok {
		return ""
	}
	return gatewayImagePathFromConfig(siteKey.Config, key)
}

func gatewayImagePathFromConfig(config models.JSONMap, key string) string {
	value := strings.TrimSpace(stringMapValue(config, key, ""))
	if value == "" {
		return ""
	}
	if strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") {
		return value
	}
	return strings.TrimLeft(value, "/")
}

func shouldServeGatewayModelProbe(method, targetPath, strategy string) bool {
	if normalizeGatewayModelProbeStrategy(strategy) == "" {
		return false
	}
	if method != http.MethodGet {
		return false
	}
	return normalizeGatewayTargetPath(targetPath) == "models"
}

func normalizeGatewayModelProbeStrategy(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "sub2api", "sub2api_model_health", "model_health", "health", "synthetic":
		return "sub2api"
	default:
		return ""
	}
}

func normalizeGatewayTargetPath(value string) string {
	value = strings.Trim(strings.TrimSpace(value), "/")
	if strings.HasPrefix(value, "v1/") {
		value = strings.TrimPrefix(value, "v1/")
	}
	return value
}

func gatewayResponsesTargetPath(value string) bool {
	normalized := normalizeGatewayTargetPath(value)
	return normalized == "responses" || strings.HasPrefix(normalized, "responses/")
}

func gatewayModelProbeResponse(db *gorm.DB, opts ProxyGatewayOptions, policy GatewayPolicy) (GatewayProxyResult, error) {
	modelIDs, err := GatewayHealthyModelIDs(db, opts.Group, opts.RouteType, policy)
	if err != nil {
		return GatewayProxyResult{}, err
	}
	statusCode := http.StatusOK
	success := true
	if len(modelIDs) == 0 {
		statusCode = http.StatusServiceUnavailable
		success = false
	}
	body := gatewayModelProbeBody(modelIDs, statusCode)
	header := http.Header{}
	header.Set("Content-Type", "application/json")
	header.Set("X-Gateway-Model-Probe", "sub2api")
	header.Set("X-Gateway-Healthy-Models", strconv.Itoa(len(modelIDs)))
	if opts.ResponseWriter != nil {
		for key, values := range header {
			for _, value := range values {
				opts.ResponseWriter.Header().Add(key, value)
			}
		}
		opts.ResponseWriter.WriteHeader(statusCode)
		_, _ = opts.ResponseWriter.Write(body)
	}
	return GatewayProxyResult{StatusCode: statusCode, Header: header, Body: body, Success: success}, nil
}

func GatewayHealthyModelIDs(db *gorm.DB, group, routeType string, policy GatewayPolicy) ([]string, error) {
	routes, err := ListGatewayRoutes(db, group, false)
	if err != nil {
		return nil, err
	}
	ordered := filterAndOrderCandidates(routes, group, normalizeRouteType(routeType), normalizePolicy(policy))
	byKey := map[string]string{}
	for _, route := range ordered {
		for _, model := range GatewayRouteSupportedModels(route.State) {
			id := strings.TrimSpace(model)
			key := normalizeModelID(id)
			if key == "" {
				continue
			}
			if _, ok := byKey[key]; !ok {
				byKey[key] = id
			}
		}
	}
	keys := make([]string, 0, len(byKey))
	for key := range byKey {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := make([]string, 0, len(keys))
	for _, key := range keys {
		out = append(out, byKey[key])
	}
	return out, nil
}

func gatewayModelProbeBody(modelIDs []string, statusCode int) []byte {
	items := make([]map[string]any, 0, len(modelIDs))
	for _, id := range modelIDs {
		items = append(items, map[string]any{
			"id":       id,
			"object":   "model",
			"created":  0,
			"owned_by": "ai-sign-in-gateway",
		})
	}
	payload := map[string]any{
		"object": "list",
		"data":   items,
	}
	if statusCode >= 400 {
		payload["error"] = map[string]any{
			"message": "没有健康的网关模型路由",
			"type":    "gateway_model_health_unavailable",
		}
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return []byte(`{"object":"list","data":[]}`)
	}
	return body
}

func writeStreamHeaders(w http.ResponseWriter, src http.Header, status int) {
	dst := w.Header()
	for k, vs := range src {
		lk := strings.ToLower(k)
		if lk == "content-length" || lk == "transfer-encoding" || lk == "connection" {
			continue
		}
		for _, v := range vs {
			dst.Add(k, v)
		}
	}
	w.WriteHeader(status)
}

type gatewayStreamCapture struct {
	max  int
	data []byte
}

func (c *gatewayStreamCapture) Write(p []byte) {
	if c.max <= 0 || len(p) == 0 {
		return
	}
	c.data = append(c.data, p...)
	if len(c.data) > c.max {
		c.data = append([]byte{}, c.data[len(c.data)-c.max:]...)
	}
}

func streamBody(w http.ResponseWriter, src io.Reader, sanitizeResponses bool) (int, GatewayUsage, string, error) {
	if sanitizeResponses {
		return streamResponsesBody(w, src)
	}
	flusher, _ := w.(http.Flusher)
	buf := make([]byte, 32*1024)
	capture := gatewayStreamCapture{max: 1 << 20}
	written := 0
	for {
		n, err := src.Read(buf)
		if n > 0 {
			if _, werr := w.Write(buf[:n]); werr != nil {
				usage, model := ExtractGatewayUsageFromStream(capture.data)
				return written, usage, model, werr
			}
			capture.Write(buf[:n])
			written += n
			if flusher != nil {
				flusher.Flush()
			}
		}
		if err != nil {
			if errors.Is(err, io.EOF) {
				usage, model := ExtractGatewayUsageFromStream(capture.data)
				return written, usage, model, nil
			}
			usage, model := ExtractGatewayUsageFromStream(capture.data)
			return written, usage, model, err
		}
	}
}

func streamResponsesBody(w http.ResponseWriter, src io.Reader) (int, GatewayUsage, string, error) {
	flusher, _ := w.(http.Flusher)
	reader := bufio.NewReaderSize(src, 32*1024)
	capture := gatewayStreamCapture{max: 1 << 20}
	written := 0
	for {
		line, err := reader.ReadBytes('\n')
		if len(line) > 0 {
			nextLine, dropLine := sanitizeGatewayResponseSSELineForProxy(line)
			if !dropLine && len(nextLine) > 0 {
				n, werr := w.Write(nextLine)
				if werr != nil {
					usage, model := ExtractGatewayUsageFromStream(capture.data)
					return written, usage, model, werr
				}
				capture.Write(nextLine[:n])
				written += n
				if flusher != nil {
					flusher.Flush()
				}
			}
		}
		if err != nil {
			if errors.Is(err, io.EOF) {
				usage, model := ExtractGatewayUsageFromStream(capture.data)
				return written, usage, model, nil
			}
			usage, model := ExtractGatewayUsageFromStream(capture.data)
			return written, usage, model, err
		}
	}
}

func prepareGatewayStreamBootstrap(src io.Reader, sanitizeResponses bool) (io.Reader, []byte, error) {
	if src == nil {
		return bytes.NewReader(nil), nil, io.EOF
	}
	if sanitizeResponses {
		return prepareGatewayResponsesStreamBootstrap(src)
	}
	buf := make([]byte, 32*1024)
	for {
		n, err := src.Read(buf)
		if n > 0 {
			firstChunk := append([]byte(nil), buf[:n]...)
			return src, firstChunk, nil
		}
		if err != nil {
			return src, nil, err
		}
	}
}

func prepareGatewayResponsesStreamBootstrap(src io.Reader) (io.Reader, []byte, error) {
	reader := bufio.NewReaderSize(src, 32*1024)
	var firstChunk bytes.Buffer
	for {
		line, err := reader.ReadBytes('\n')
		if len(line) > 0 {
			nextLine, dropLine := sanitizeGatewayResponseSSELineForProxy(line)
			if !dropLine {
				if gatewayResponseSSELineHasVisiblePayload(nextLine) {
					firstChunk.Write(nextLine)
					return reader, firstChunk.Bytes(), nil
				}
				if !gatewayResponseSSELineIsDone(nextLine) {
					firstChunk.Write(nextLine)
				}
			}
		}
		if err != nil {
			return reader, nil, err
		}
	}
}

func streamBodyWithInitial(w http.ResponseWriter, src io.Reader, sanitizeResponses bool, firstChunk []byte) (int, GatewayUsage, string, error) {
	if len(firstChunk) > 0 {
		src = io.MultiReader(bytes.NewReader(firstChunk), src)
	}
	return streamBody(w, src, sanitizeResponses)
}

func gatewayResponseBodyHasStructuredPayload(body []byte) bool {
	body = bytes.TrimSpace(body)
	if len(body) == 0 {
		return false
	}
	var payload any
	if err := json.Unmarshal(body, &payload); err != nil {
		return false
	}
	return gatewayResponseValueHasStructuredPayload(payload)
}

func gatewayResponseBodyHasVisiblePayload(body []byte) bool {
	body = bytes.TrimSpace(body)
	if len(body) == 0 {
		return false
	}
	var payload any
	if err := json.Unmarshal(body, &payload); err != nil {
		return true
	}
	return gatewayResponseValueHasVisiblePayload(payload)
}

func gatewayResponseValueHasStructuredPayload(value any) bool {
	switch typed := value.(type) {
	case []any:
		for _, item := range typed {
			if gatewayResponseValueHasStructuredPayload(item) {
				return true
			}
		}
	case map[string]any:
		return gatewayResponseMapHasStructuredPayload(typed)
	}
	return false
}

func gatewayResponseMapHasStructuredPayload(obj map[string]any) bool {
	for _, key := range []string{
		"choices",
		"output",
		"message",
		"content",
		"delta",
		"text",
		"tool_calls",
		"tool_call",
		"function_call",
		"function",
	} {
		if _, ok := obj[key]; ok {
			return true
		}
	}
	for _, key := range []string{"choices", "output", "message", "content", "tool_calls", "tool_call", "function_call", "function"} {
		if gatewayResponseValueHasStructuredPayload(obj[key]) {
			return true
		}
	}
	return false
}

func gatewayResponseSSELineHasVisiblePayload(line []byte) bool {
	trimmed := strings.TrimSpace(string(line))
	if trimmed == "" {
		return false
	}
	if strings.HasPrefix(strings.ToLower(trimmed), "data:") {
		trimmed = strings.TrimSpace(strings.TrimPrefix(trimmed, "data:"))
	}
	if trimmed == "" || trimmed == "[DONE]" {
		return false
	}
	if !strings.HasPrefix(trimmed, "{") && !strings.HasPrefix(trimmed, "[") {
		return true
	}
	return gatewayResponseBodyHasVisiblePayload([]byte(trimmed))
}

func gatewayResponseSSELineIsDone(line []byte) bool {
	trimmed := strings.TrimSpace(string(line))
	if trimmed == "" {
		return false
	}
	if !strings.HasPrefix(strings.ToLower(trimmed), "data:") {
		return false
	}
	trimmed = strings.TrimSpace(strings.TrimPrefix(trimmed, "data:"))
	return trimmed == "[DONE]"
}

func gatewayResponseValueHasVisiblePayload(value any) bool {
	switch typed := value.(type) {
	case []any:
		for _, item := range typed {
			if gatewayResponseValueHasVisiblePayload(item) {
				return true
			}
		}
	case map[string]any:
		return gatewayResponseMapHasVisiblePayload(typed)
	case string:
		return strings.TrimSpace(typed) != ""
	}
	return false
}

func gatewayResponseMapHasVisiblePayload(obj map[string]any) bool {
	if value, ok := obj["text"]; ok && strings.TrimSpace(fmt.Sprint(value)) != "" {
		return true
	}
	if value, ok := obj["delta"]; ok && strings.TrimSpace(fmt.Sprint(value)) != "" {
		return true
	}
	if value, ok := obj["arguments"]; ok && strings.TrimSpace(fmt.Sprint(value)) != "" {
		return true
	}
	for _, key := range []string{"content", "output", "choices", "tool_calls", "tool_call", "function_call", "function", "message", "response", "item", "output_item"} {
		if gatewayResponseValueHasVisiblePayload(obj[key]) {
			return true
		}
	}
	return false
}

func ExtractGatewayUsageFromStream(body []byte) (GatewayUsage, string) {
	var out GatewayUsage
	actualModel := ""
	for _, rawLine := range bytes.Split(body, []byte{'\n'}) {
		line := strings.TrimSpace(string(rawLine))
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "data:") {
			line = strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		}
		if line == "" || line == "[DONE]" || !strings.HasPrefix(line, "{") {
			continue
		}
		usage := ExtractGatewayUsage([]byte(line))
		out = mergeGatewayUsage(out, usage)
		if model := ExtractGatewayModelFromResponseBody([]byte(line)); model != "" {
			actualModel = model
		}
	}
	return out, actualModel
}

func mergeGatewayUsage(left, right GatewayUsage) GatewayUsage {
	left.PromptTokens = maxIntPtr(left.PromptTokens, right.PromptTokens)
	left.CachedInputTokens = maxIntPtr(left.CachedInputTokens, right.CachedInputTokens)
	left.CacheReadTokens = maxIntPtr(left.CacheReadTokens, right.CacheReadTokens)
	left.CacheWriteTokens = maxIntPtr(left.CacheWriteTokens, right.CacheWriteTokens)
	left.CompletionTokens = maxIntPtr(left.CompletionTokens, right.CompletionTokens)
	left.TotalTokens = maxIntPtr(left.TotalTokens, right.TotalTokens)
	if right.UsageCost != nil {
		left.UsageCost = right.UsageCost
	}
	return left
}

func maxIntPtr(left, right *int) *int {
	if left == nil {
		return right
	}
	if right == nil || *left >= *right {
		return left
	}
	return right
}

func readGatewayRequestBody(r *http.Request) ([]byte, error) {
	if r == nil || r.Body == nil || r.Body == http.NoBody {
		return nil, nil
	}
	if r.ContentLength > maxGatewayRequestBodyBytes {
		return nil, GatewayBodyTooLargeError{Kind: "网关请求体", Limit: maxGatewayRequestBodyBytes}
	}
	return readLimitedGatewayBody(r.Body, maxGatewayRequestBodyBytes, "网关请求体过大")
}

func readGatewayResponseBody(resp *http.Response) ([]byte, error) {
	if resp == nil || resp.Body == nil || resp.Body == http.NoBody {
		return nil, nil
	}
	if resp.ContentLength > maxGatewayResponseBodyBytes {
		return nil, GatewayBodyTooLargeError{Kind: "上游响应体", Limit: maxGatewayResponseBodyBytes}
	}
	return readLimitedGatewayBody(resp.Body, maxGatewayResponseBodyBytes, "上游响应体过大")
}

func readLimitedGatewayBody(src io.Reader, limit int64, label string) ([]byte, error) {
	body, err := io.ReadAll(io.LimitReader(src, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(body)) > limit {
		kind := strings.TrimSuffix(label, "过大")
		return nil, GatewayBodyTooLargeError{Kind: kind, Limit: limit}
	}
	return body, nil
}

func sanitizeGatewayRequestBodyForProxy(targetPath string, body []byte) []byte {
	if len(body) == 0 || !gatewayResponsesTargetPath(targetPath) {
		return body
	}
	next, _, changed := sanitizeGatewayJSONBodyForProxy(body)
	if !changed {
		return body
	}
	return next
}

func sanitizeGatewayResponseBodyForProxy(targetPath string, body []byte) []byte {
	if len(body) == 0 || !gatewayResponsesTargetPath(targetPath) {
		return body
	}
	next, _, changed := sanitizeGatewayJSONBodyForProxy(body)
	if !changed {
		return body
	}
	return next
}

func sanitizeGatewayJSONBodyForProxy(body []byte) ([]byte, bool, bool) {
	var payload any
	if err := json.Unmarshal(body, &payload); err != nil {
		return body, false, false
	}
	sanitized, changed, remove := sanitizeGatewaySignedThinkingValue(payload)
	if !changed {
		return body, false, false
	}
	if remove {
		return []byte(`{}`), true, true
	}
	next, err := json.Marshal(sanitized)
	if err != nil {
		return body, false, false
	}
	return next, false, true
}

func sanitizeGatewayResponseSSELineForProxy(line []byte) ([]byte, bool) {
	lineText := string(line)
	trimmedLeft := strings.TrimLeft(lineText, " \t")
	leading := lineText[:len(lineText)-len(trimmedLeft)]
	if !strings.HasPrefix(trimmedLeft, "data:") {
		return line, false
	}
	payloadText := strings.TrimPrefix(trimmedLeft, "data:")
	ending := ""
	switch {
	case strings.HasSuffix(payloadText, "\r\n"):
		ending = "\r\n"
		payloadText = strings.TrimSuffix(payloadText, "\r\n")
	case strings.HasSuffix(payloadText, "\n"):
		ending = "\n"
		payloadText = strings.TrimSuffix(payloadText, "\n")
	case strings.HasSuffix(payloadText, "\r"):
		ending = "\r"
		payloadText = strings.TrimSuffix(payloadText, "\r")
	}
	payloadText = strings.TrimSpace(payloadText)
	if payloadText == "" || payloadText == "[DONE]" || !strings.HasPrefix(payloadText, "{") {
		return line, false
	}
	body, remove, changed := sanitizeGatewayJSONBodyForProxy([]byte(payloadText))
	if !changed {
		return line, false
	}
	if remove {
		return nil, true
	}
	return []byte(leading + "data: " + string(body) + ending), false
}

func sanitizeGatewaySignedThinkingValue(value any) (any, bool, bool) {
	switch typed := value.(type) {
	case []any:
		next := make([]any, 0, len(typed))
		changed := false
		for _, item := range typed {
			cleaned, itemChanged, remove := sanitizeGatewaySignedThinkingValue(item)
			changed = changed || itemChanged
			if remove {
				continue
			}
			next = append(next, cleaned)
		}
		return next, changed, false
	case map[string]any:
		if isGatewaySignedThinkingObject(typed) {
			return nil, true, true
		}
		if isGatewaySignedThinkingEventObject(typed) {
			return nil, true, true
		}
		next := make(map[string]any, len(typed))
		changed := false
		for key, item := range typed {
			cleaned, itemChanged, remove := sanitizeGatewaySignedThinkingValue(item)
			changed = changed || itemChanged
			if remove {
				continue
			}
			next[key] = cleaned
		}
		return next, changed, false
	default:
		return value, false, false
	}
}

func isGatewaySignedThinkingObject(value any) bool {
	obj, ok := value.(map[string]any)
	if !ok {
		return false
	}
	itemType := strings.ToLower(strings.TrimSpace(fmt.Sprint(obj["type"])))
	if itemType != "reasoning" && itemType != "thinking" && itemType != "redacted_thinking" {
		return false
	}
	return gatewayObjectHasAnyKey(obj,
		"signature",
		"encrypted_content",
		"encrypted_content_type",
		"encrypted_reasoning",
		"encrypted_reasoning_content",
		"encryptedContent",
		"encryptedReasoning",
		"encryptedReasoningContent",
		"thinking_signature",
		"thinkingSignature",
		"redacted_thinking",
		"redactedThinking",
	)
}

func isGatewaySignedThinkingEventObject(obj map[string]any) bool {
	itemType := strings.ToLower(strings.TrimSpace(fmt.Sprint(obj["type"])))
	for _, key := range []string{"item", "output_item", "delta"} {
		if isGatewaySignedThinkingObject(obj[key]) {
			return true
		}
	}
	if !strings.Contains(itemType, "reasoning") && !strings.Contains(itemType, "thinking") {
		return false
	}
	return gatewayObjectHasAnyKey(obj,
		"signature",
		"encrypted_content",
		"encrypted_content_type",
		"encrypted_reasoning",
		"encrypted_reasoning_content",
		"encryptedContent",
		"encryptedReasoning",
		"encryptedReasoningContent",
		"thinking_signature",
		"thinkingSignature",
		"redacted_thinking",
		"redactedThinking",
	)
}

func gatewayObjectHasAnyKey(obj map[string]any, keys ...string) bool {
	for _, key := range keys {
		if value, ok := obj[key]; ok && fmt.Sprint(value) != "" {
			return true
		}
	}
	return false
}

func isStreamingRequest(r *http.Request, body []byte) bool {
	if accept := strings.ToLower(r.Header.Get("Accept")); strings.Contains(accept, "text/event-stream") {
		return true
	}
	if len(body) == 0 {
		return false
	}
	contentType := strings.ToLower(r.Header.Get("Content-Type"))
	if !strings.Contains(contentType, "json") {
		return false
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return false
	}
	stream, _ := payload["stream"].(bool)
	return stream
}

// ----------------------------- route state updates -----------------------------

func UpdateRouteSuccess(db *gorm.DB, state *models.GatewayRouteState, statusCode int, latency float64) {
	now := time.Now().UTC()
	previous := state.RequestCount
	state.RequestCount++
	state.SuccessCount++
	state.ConsecutiveFailures = 0
	state.LastStatusCode = &statusCode
	l := latency
	state.LastLatencyMS = &l
	state.LastError = nil
	state.LastUsedAt = &now
	state.LastSuccessAt = &now
	state.CircuitState = "closed"
	state.CircuitOpenedAt = nil
	state.CircuitOpenUntil = nil
	state.AvgLatencyMS = updateAvgLatency(state.AvgLatencyMS, previous, latency)
	state.EWMALatencyMS = updateEWMA(state.EWMALatencyMS, latency)
	_ = db.Save(state).Error
}

func UpdateRouteFailure(db *gorm.DB, state *models.GatewayRouteState, message string, latency float64, statusCode *int, policy GatewayPolicy) {
	policy = normalizePolicy(policy)
	now := time.Now().UTC()
	failureKind := classifyGatewayUpstreamFailure(message, statusCode)
	state.RequestCount++
	state.FailureCount++
	state.ConsecutiveFailures++
	state.LastStatusCode = statusCode
	l := latency
	state.LastLatencyMS = &l
	reason := shorten(message, 500)
	state.LastError = &reason
	state.LastUsedAt = &now
	state.LastFailureAt = &now
	if shouldOpenRouteCircuitImmediately(failureKind) || state.ConsecutiveFailures >= policy.FailureThreshold || state.CircuitState == "half_open" {
		cooldownSeconds := gatewayFailureCooldownSeconds(failureKind, policy)
		until := now.Add(time.Duration(cooldownSeconds) * time.Second)
		state.CircuitState = "open"
		state.CircuitOpenedAt = &now
		state.CircuitOpenUntil = &until
	}
	_ = db.Save(state).Error
}

func UpdateRouteFailureObservation(db *gorm.DB, state *models.GatewayRouteState, message string, latency float64, statusCode *int) {
	now := time.Now().UTC()
	reason := shorten(message, 500)
	updates := map[string]any{
		"last_status_code": statusCode,
		"last_latency_ms":  latency,
		"last_error":       reason,
		"last_used_at":     now,
		"last_failure_at":  now,
	}
	if err := db.Model(&models.GatewayRouteState{}).Where("id = ?", state.ID).Updates(updates).Error; err != nil {
		applyRouteFailureObservationState(state, reason, latency, statusCode, now)
		return
	}
	if err := db.First(state, state.ID).Error; err != nil {
		applyRouteFailureObservationState(state, reason, latency, statusCode, now)
		return
	}
}

func applyRouteFailureObservationState(state *models.GatewayRouteState, reason string, latency float64, statusCode *int, now time.Time) {
	state.LastStatusCode = statusCode
	l := latency
	state.LastLatencyMS = &l
	state.LastError = &reason
	state.LastUsedAt = &now
	state.LastFailureAt = &now
}

func shouldOpenRouteCircuitImmediately(kind gatewayUpstreamFailureKind) bool {
	return kind == gatewayUpstreamRateLimited ||
		kind == gatewayUpstreamConcurrencyLimited ||
		kind == gatewayUpstreamQuotaLimited
}

func gatewayFailureCooldownSeconds(kind gatewayUpstreamFailureKind, policy GatewayPolicy) int {
	switch kind {
	case gatewayUpstreamQuotaLimited:
		return maxInt(policy.CooldownSeconds, gatewayQuotaCooldownSeconds)
	case gatewayUpstreamRateLimited:
		return maxInt(policy.CooldownSeconds, gatewayRateLimitCooldownSeconds)
	case gatewayUpstreamConcurrencyLimited:
		return maxInt(policy.CooldownSeconds, gatewayConcurrencyCooldownSeconds)
	default:
		return policy.CooldownSeconds
	}
}

func classifyGatewayUpstreamFailure(message string, statusCode *int) gatewayUpstreamFailureKind {
	status := 0
	if statusCode != nil {
		status = *statusCode
	}
	normalized := strings.ToLower(strings.TrimSpace(message))
	spaced := strings.NewReplacer("_", " ", "-", " ", ".", " ").Replace(normalized)
	contains := func(terms ...string) bool {
		for _, term := range terms {
			if strings.Contains(normalized, term) || strings.Contains(spaced, term) {
				return true
			}
		}
		return false
	}

	if contains(
		"daily limit",
		"monthly limit",
		"usage limit",
		"quota exceeded",
		"insufficient quota",
		"insufficient user quota",
		"billing hard limit",
		"hard limit",
		"credit balance",
		"out of credit",
		"not enough balance",
		"余额不足",
		"额度不足",
		"额度已用尽",
		"额度用尽",
		"预扣费额度失败",
		"用户额度不足",
		"欠费",
	) {
		return gatewayUpstreamQuotaLimited
	}
	if contains(
		"concurrency limit",
		"concurrent limit",
		"active request",
		"parallel request",
		"并发",
		"同时请求",
	) {
		return gatewayUpstreamConcurrencyLimited
	}
	if contains(
		"rate limit",
		"too many requests",
		"requests per minute",
		"request per minute",
		"tokens per minute",
		"rpm",
		"tpm",
		"频率限制",
		"速率限制",
		"请求过快",
		"每分钟",
	) {
		return gatewayUpstreamRateLimited
	}
	if status == http.StatusTooManyRequests {
		return gatewayUpstreamRateLimited
	}
	return gatewayUpstreamFailureNone
}

func updateAvgLatency(current *float64, previousCount int, sample float64) *float64 {
	if current == nil || previousCount <= 0 {
		v := sample
		return &v
	}
	avg := ((*current)*float64(previousCount) + sample) / float64(previousCount+1)
	avg = roundTo(avg, 2)
	return &avg
}

func updateEWMA(current *float64, sample float64) *float64 {
	if sample <= 0 {
		return current
	}
	if current == nil {
		v := roundTo(sample, 2)
		return &v
	}
	v := roundTo(ewmaAlpha*sample+(1-ewmaAlpha)*(*current), 2)
	return &v
}

func roundTo(value float64, digits int) float64 {
	pow := 1.0
	for i := 0; i < digits; i++ {
		pow *= 10
	}
	return float64(int64(value*pow+0.5)) / pow
}

// ----------------------------- logging -----------------------------

type GatewayUsage struct {
	PromptTokens      *int
	CachedInputTokens *int
	CacheReadTokens   *int
	CacheWriteTokens  *int
	CompletionTokens  *int
	TotalTokens       *int
	UsageCost         *float64
}

func GatewayRequestModelFromBody(body []byte) string {
	return ExtractGatewayModelFromRequestBody(body)
}

func ExtractGatewayModelFromResponseBody(body []byte) string {
	return ExtractGatewayModelFromRequestBody(body)
}

func ExtractGatewayUsage(body []byte) GatewayUsage {
	var payload map[string]any
	if len(body) == 0 || json.Unmarshal(body, &payload) != nil {
		return GatewayUsage{}
	}
	usageMap, ok := payload["usage"].(map[string]any)
	if !ok {
		usageMap, ok = payload["usageMetadata"].(map[string]any)
	}
	if !ok || len(usageMap) == 0 {
		return GatewayUsage{}
	}
	prompt := usageInt(usageMap, "prompt_tokens", "input_tokens", "promptTokenCount")
	cacheRead := usageInt(usageMap, "cache_read_input_tokens", "prompt_cache_hit_tokens", "cachedContentTokenCount")
	cacheWrite := usageInt(usageMap, "cache_creation_input_tokens")
	cachedInput := usageInt(usageMap, "cached_input_tokens")
	if cacheRead == nil {
		if details, ok := usageMap["prompt_tokens_details"].(map[string]any); ok {
			cacheRead = usageInt(details, "cached_tokens")
		}
	}
	if cacheRead == nil {
		if details, ok := usageMap["input_tokens_details"].(map[string]any); ok {
			cacheRead = usageInt(details, "cached_tokens")
		}
	}
	if cachedInput == nil {
		cachedInput = sumIntPtrs(cacheRead, cacheWrite)
	}
	completion := usageInt(usageMap, "completion_tokens", "output_tokens", "candidatesTokenCount")
	total := usageInt(usageMap, "total_tokens", "totalTokenCount")
	if total == nil && (prompt != nil || cacheRead != nil || cacheWrite != nil || completion != nil) {
		v := intPtrValue(prompt) + intPtrValue(cacheRead) + intPtrValue(cacheWrite) + intPtrValue(completion)
		total = &v
	}
	return GatewayUsage{
		PromptTokens:      prompt,
		CachedInputTokens: cachedInput,
		CacheReadTokens:   cacheRead,
		CacheWriteTokens:  cacheWrite,
		CompletionTokens:  completion,
		TotalTokens:       total,
		UsageCost:         usageFloat(usageMap, "total_cost", "cost", "usage_cost"),
	}
}

func sumIntPtrs(values ...*int) *int {
	total := 0
	hasValue := false
	for _, value := range values {
		if value == nil {
			continue
		}
		total += *value
		hasValue = true
	}
	if !hasValue {
		return nil
	}
	return &total
}

func intPtrValue(value *int) int {
	if value == nil {
		return 0
	}
	return *value
}

func usageInt(values map[string]any, keys ...string) *int {
	for _, key := range keys {
		switch value := values[key].(type) {
		case float64:
			if value >= 0 {
				v := int(value)
				return &v
			}
		case int:
			if value >= 0 {
				v := value
				return &v
			}
		case json.Number:
			if parsed, err := value.Int64(); err == nil && parsed >= 0 {
				v := int(parsed)
				return &v
			}
		}
	}
	return nil
}

func usageFloat(values map[string]any, keys ...string) *float64 {
	for _, key := range keys {
		switch value := values[key].(type) {
		case float64:
			if value >= 0 {
				return &value
			}
		case int:
			if value >= 0 {
				v := float64(value)
				return &v
			}
		case json.Number:
			if parsed, err := value.Float64(); err == nil && parsed >= 0 {
				return &parsed
			}
		}
	}
	return nil
}

func LogGatewayRequest(db *gorm.DB, route GatewayRoute, targetPath, requestURL, userAgent, method, requestedModel, actualModel string, statusCode *int, success bool, latency float64, reason string, strategy string, attemptIndex int, isStream bool, requestID string, usage GatewayUsage) {
	siteID := route.State.SiteID
	if route.Site.ID != 0 {
		siteID = route.Site.ID
	}
	routeStateID := route.State.ID
	if attemptIndex <= 0 {
		attemptIndex = 1
	}
	if requestID == "" {
		requestID = newRequestID()
	}
	requestedModel = normalizeModelID(requestedModel)
	actualModel = normalizeModelID(firstNonEmpty(actualModel, requestedModel))
	log := models.GatewayRequestLog{
		RequestID:          requestID,
		RouteStateID:       &routeStateID,
		SiteID:             &siteID,
		KeyFingerprint:     route.State.KeyFingerprint,
		KeyName:            route.State.KeyName,
		GroupName:          route.State.GroupName,
		Model:              requestedModel,
		RequestedModel:     requestedModel,
		ActualModel:        actualModel,
		RouteType:          route.State.RouteType,
		TargetPath:         targetPath,
		RequestURL:         RedactGatewayURL(requestURL),
		UserAgent:          userAgent,
		Method:             method,
		RouteStrategy:      normalizeStrategy(strategy),
		AttemptIndex:       attemptIndex,
		StatusCode:         statusCode,
		Success:            success,
		LatencyMS:          &latency,
		PromptTokens:       usage.PromptTokens,
		CachedInputTokens:  usage.CachedInputTokens,
		CacheReadTokens:    usage.CacheReadTokens,
		CacheWriteTokens:   usage.CacheWriteTokens,
		CompletionTokens:   usage.CompletionTokens,
		TotalTokens:        usage.TotalTokens,
		UsageCost:          usage.UsageCost,
		CircuitStateBefore: route.State.CircuitState,
		IsStream:           isStream,
	}
	if reason != "" {
		log.FailureReason = stringPtr(gatewayRedactText(reason))
	}
	_ = db.Create(&log).Error
}

func gatewayFailureKindForLog(status int, message string) string {
	return string(classifyGatewayUpstreamFailure(message, statusCodePtrOrNil(status)))
}

func gatewayRedactText(message string) string {
	return RedactGatewayText(message)
}

func RedactGatewayText(message string) string {
	if strings.TrimSpace(message) == "" {
		return message
	}
	var parsed any
	if err := json.Unmarshal([]byte(message), &parsed); err == nil {
		if data, err := json.Marshal(redactGatewayJSONValue("", parsed)); err == nil {
			return string(data)
		}
	}
	return redactGatewaySensitiveText(message)
}

func redactGatewaySensitiveText(value string) string {
	value = gatewaySensitiveQuotedKeyPattern.ReplaceAllStringFunc(value, func(match string) string {
		parts := gatewaySensitiveQuotedKeyPattern.FindStringSubmatch(match)
		if len(parts) != 6 || parts[1] != parts[3] {
			return match
		}
		return parts[1] + parts[2] + parts[3] + parts[4] + redactedGatewayTextValue(parts[5])
	})
	return gatewaySensitiveTextPattern.ReplaceAllStringFunc(value, func(match string) string {
		parts := gatewaySensitiveTextPattern.FindStringSubmatch(match)
		if len(parts) != 4 {
			return match
		}
		return parts[1] + parts[2] + redactedGatewayTextValue(parts[3])
	})
}

func redactedGatewayTextValue(value string) string {
	value = strings.TrimSpace(value)
	if strings.HasPrefix(value, `"`) && strings.HasSuffix(value, `"`) {
		return `"` + gatewayRedactedValue + `"`
	}
	if strings.HasPrefix(value, `'`) && strings.HasSuffix(value, `'`) {
		return `'` + gatewayRedactedValue + `'`
	}
	return gatewayRedactedValue
}

func redactGatewayJSONValue(key string, value any) any {
	if gatewaySensitiveJSONKey(key) {
		return redactGatewaySensitiveJSONValue(value)
	}
	switch typed := value.(type) {
	case map[string]any:
		out := map[string]any{}
		for itemKey, itemValue := range typed {
			out[itemKey] = redactGatewayJSONValue(itemKey, itemValue)
		}
		return out
	case []any:
		items := make([]any, 0, len(typed))
		for _, item := range typed {
			items = append(items, redactGatewayJSONValue("", item))
		}
		return items
	case string:
		return redactGatewaySensitiveText(typed)
	default:
		return value
	}
}

func redactGatewaySensitiveJSONValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		out := map[string]any{}
		for key, item := range typed {
			out[key] = redactGatewaySensitiveJSONValue(item)
		}
		return out
	case []any:
		items := make([]any, 0, len(typed))
		for _, item := range typed {
			items = append(items, redactGatewaySensitiveJSONValue(item))
		}
		return items
	case string:
		if strings.TrimSpace(typed) == "" {
			return typed
		}
		return gatewayRedactedValue
	default:
		return value
	}
}

func gatewaySensitiveJSONKey(key string) bool {
	normalized := strings.ToLower(strings.TrimSpace(key))
	if normalized == "" {
		return false
	}
	switch normalized {
	case "api_key", "apikey", "api-key", "key", "token", "access_token", "refresh_token", "auth_token", "authorization", "cookie", "password", "secret", "client_secret", "session", "session_id", "session-id", "session_token", "session-token", "jwt", "bearer", "csrf", "csrf_token", "csrf-token", "xsrf", "xsrf_token", "xsrf-token", "private_key", "private-key":
		return true
	}
	return strings.Contains(normalized, "token") ||
		strings.Contains(normalized, "secret") ||
		strings.Contains(normalized, "password") ||
		strings.Contains(normalized, "cookie") ||
		strings.Contains(normalized, "authorization") ||
		strings.Contains(normalized, "session") ||
		strings.Contains(normalized, "jwt") ||
		strings.Contains(normalized, "csrf") ||
		strings.Contains(normalized, "xsrf")
}

func RedactGatewayURL(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
	values := parsed.Query()
	for key := range values {
		if gatewaySensitiveJSONKey(key) {
			values.Set(key, "[redacted]")
		}
	}
	parsed.RawQuery = values.Encode()
	return parsed.String()
}

// ----------------------------- probe -----------------------------

func ProbeGatewayRoute(ctx context.Context, db *gorm.DB, routeID string, timeoutSeconds int) (GatewayProbeResult, error) {
	route, err := GetGatewayRoute(db, routeID)
	if err != nil {
		return GatewayProbeResult{}, err
	}
	if route.APIKey == "" {
		now := time.Now().UTC()
		message := fmt.Sprintf(
			"路由缺少 API Key：%s，站点 ID %d，Key 指纹 %s",
			GatewayRouteSiteLabel(route),
			route.State.SiteID,
			route.State.KeyFingerprint,
		)
		updateGatewayRouteModelProbeState(db, &route.State, false, message, nil, now)
		return GatewayProbeResult{Route: route, OK: false, Message: message, CheckedAt: now}, nil
	}
	if timeoutSeconds <= 0 {
		timeoutSeconds = 20
	}
	var last GatewayProbeResult
	for _, baseURL := range gatewayRouteBasesInOrder(route) {
		candidateRoute := route
		candidateRoute.RequestBaseURL = baseURL
		upstreamURL, err := targetURL(candidateRoute.RequestBaseURL, "models", "", candidateRoute.State.RouteType, "")
		if err != nil {
			return GatewayProbeResult{}, err
		}
		reqCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutSeconds)*time.Second)
		req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, upstreamURL, nil)
		if err != nil {
			cancel()
			return GatewayProbeResult{}, err
		}
		req.Header.Set("Accept", "application/json")
		req.Header.Set("User-Agent", gatewayUpstreamUserAgent(candidateRoute, ""))
		req.Header.Set("Authorization", "Bearer "+candidateRoute.APIKey)
		start := time.Now()
		resp, err := (&http.Client{Timeout: time.Duration(timeoutSeconds) * time.Second}).Do(req)
		latency := float64(time.Since(start).Microseconds()) / 1000.0
		checkedAt := time.Now().UTC()
		cancel()
		if err != nil {
			updateGatewayRouteModelProbeState(db, &candidateRoute.State, false, err.Error(), nil, checkedAt)
			UpdateRouteFailure(db, &candidateRoute.State, err.Error(), latency, nil, GatewayPolicy{RequestTimeout: timeoutSeconds})
			last = GatewayProbeResult{Route: candidateRoute, OK: false, LatencyMS: &latency, Message: err.Error(), CheckedAt: checkedAt}
			continue
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
		_ = resp.Body.Close()
		statusCode := resp.StatusCode
		ok := statusCode >= 200 && statusCode < 300
		models := extractModelIDs(body)
		message := "探测成功。"
		if !ok {
			message = fmt.Sprintf("接口返回 %d", statusCode)
			updateGatewayRouteModelProbeState(db, &candidateRoute.State, false, string(body), nil, checkedAt)
			UpdateRouteFailure(db, &candidateRoute.State, string(body), latency, &statusCode, GatewayPolicy{RequestTimeout: timeoutSeconds})
		} else {
			if len(models) == 0 {
				models = defaultGatewaySupportedModels(candidateRoute.State.RouteType)
				if len(models) == 0 {
					ok = false
					message = "模型列表为空或无法解析"
					updateGatewayRouteModelProbeState(db, &candidateRoute.State, false, message, nil, checkedAt)
					UpdateRouteFailure(db, &candidateRoute.State, message, latency, &statusCode, GatewayPolicy{RequestTimeout: timeoutSeconds})
				} else {
					message = "模型列表为空，已使用默认支持模型。"
					updateGatewayRouteModelProbeState(db, &candidateRoute.State, true, message, models, checkedAt)
					candidateRoute.State.LastRequestBaseURL = candidateRoute.RequestBaseURL
					UpdateRouteSuccess(db, &candidateRoute.State, statusCode, latency)
				}
			} else {
				updateGatewayRouteModelProbeState(db, &candidateRoute.State, true, message, models, checkedAt)
				candidateRoute.State.LastRequestBaseURL = candidateRoute.RequestBaseURL
				UpdateRouteSuccess(db, &candidateRoute.State, statusCode, latency)
			}
		}
		last = GatewayProbeResult{Route: candidateRoute, OK: ok, StatusCode: &statusCode, LatencyMS: &latency, Message: message, Models: models, CheckedAt: checkedAt}
		if ok {
			return last, nil
		}
	}
	return last, nil
}

func updateGatewayRouteModelProbeState(db *gorm.DB, state *models.GatewayRouteState, ok bool, message string, modelIDs []string, checkedAt time.Time) {
	if checkedAt.IsZero() {
		checkedAt = time.Now().UTC()
	}
	message = shorten(strings.TrimSpace(message), 500)
	updates := map[string]any{
		"model_probe_updated_at": &checkedAt,
		"model_probe_message":    message,
	}
	state.ModelProbeUpdatedAt = &checkedAt
	state.ModelProbeMessage = message
	if ok {
		state.ModelProbeStatus = "success"
		updates["model_probe_status"] = state.ModelProbeStatus
		if len(modelIDs) > 0 {
			state.SupportedModels = EncodeGatewaySupportedModels(modelIDs)
			updates["supported_models"] = state.SupportedModels
		}
	} else {
		state.ModelProbeStatus = "failed"
		updates["model_probe_status"] = state.ModelProbeStatus
	}
	_ = db.Model(state).Updates(updates).Error
}

// ----------------------------- helpers -----------------------------

func GatewayRequestBase(site models.Site) string {
	candidates := GatewayRequestBaseCandidates(site)
	if len(candidates) == 0 {
		return ""
	}
	return candidates[0]
}

func GatewayRequestBaseCandidates(site models.Site) []string {
	raw := []string{}
	raw = append(raw, stringListMapValue(site.PluginConfig, "api_request_urls")...)
	raw = append(raw, stringListMapValue(site.PluginConfig, "gateway_request_urls")...)
	raw = append(raw, stringMapValue(site.PluginConfig, "gateway_request_url", ""))
	raw = append(raw, stringMapValue(site.PluginConfig, "endpoint_url", ""))
	raw = append(raw, site.BaseURL)
	return normalizeRequestBaseURLCandidates(site.BaseURL, raw)
}

func normalizeRequestBaseURLCandidates(baseURL string, raw []string) []string {
	out := []string{}
	for _, target := range raw {
		target = strings.TrimSpace(target)
		if target == "" {
			continue
		}
		joined := target
		if value, err := JoinURL(baseURL, target); err == nil && value != "" {
			joined = value
		}
		joined = NormalizeBaseURL(joined)
		if joined == "" || containsString(out, joined) {
			continue
		}
		out = append(out, joined)
	}
	return out
}

func GatewayRouteRequestBase(state models.GatewayRouteState, site models.Site) string {
	manual := GatewayRouteManualRequestBaseURLs(state, site)
	if len(manual) > 0 {
		return manual[0]
	}
	if strings.TrimSpace(state.LastRequestBaseURL) != "" {
		return NormalizeBaseURL(state.LastRequestBaseURL)
	}
	candidates := GatewayRouteRequestBaseCandidates(state, site)
	if len(candidates) > 0 {
		return candidates[0]
	}
	return ""
}

func GatewayRouteRequestBaseCandidates(state models.GatewayRouteState, site models.Site) []string {
	manual := GatewayRouteManualRequestBaseURLs(state, site)
	if len(manual) > 0 {
		return manual
	}
	var snapshot []string
	if err := json.Unmarshal([]byte(strings.TrimSpace(state.SiteAPIURLSnapshot)), &snapshot); err == nil {
		snapshot = normalizeStringList(snapshot)
		if len(snapshot) > 0 {
			return snapshot
		}
	}
	if site.ID != 0 {
		return GatewayRequestBaseCandidates(site)
	}
	base := NormalizeBaseURL(state.SiteBaseURLSnapshot)
	if base == "" {
		return nil
	}
	return []string{base}
}

func GatewayRouteManualRequestBaseURLs(state models.GatewayRouteState, site models.Site) []string {
	var raw []string
	if err := json.Unmarshal([]byte(strings.TrimSpace(state.ManualRequestBaseURLs)), &raw); err != nil {
		raw = normalizeStringList(strings.FieldsFunc(state.ManualRequestBaseURLs, func(r rune) bool {
			return strings.ContainsRune(",，\n\r\t", r)
		}))
	}
	out := []string{}
	base := strings.TrimSpace(site.BaseURL)
	if base == "" {
		base = strings.TrimSpace(state.SiteBaseURLSnapshot)
	}
	for _, target := range raw {
		target = strings.TrimSpace(target)
		if target == "" {
			continue
		}
		joined := target
		if value, err := JoinURL(base, target); err == nil && value != "" {
			joined = value
		}
		joined = NormalizeBaseURL(joined)
		if joined == "" || containsString(out, joined) {
			continue
		}
		out = append(out, joined)
	}
	return out
}

func GatewayRouteSiteLabel(route GatewayRoute) string {
	name := strings.TrimSpace(route.Site.Name)
	if name == "" {
		name = strings.TrimSpace(route.State.SiteNameSnapshot)
	}
	if name == "" {
		name = strings.TrimSpace(route.Site.BaseURL)
	}
	if name == "" {
		name = strings.TrimSpace(route.State.SiteBaseURLSnapshot)
	}
	if name == "" {
		name = fmt.Sprintf("站点 #%d", route.State.SiteID)
	}
	return name
}

func gatewayRouteBasesInOrder(route GatewayRoute) []string {
	candidates := GatewayRouteRequestBaseCandidates(route.State, route.Site)
	if len(candidates) == 0 && strings.TrimSpace(route.RequestBaseURL) != "" {
		candidates = []string{route.RequestBaseURL}
	}
	preferred := NormalizeBaseURL(route.RequestBaseURL)
	if preferred == "" {
		return candidates
	}
	out := []string{preferred}
	for _, candidate := range candidates {
		candidate = NormalizeBaseURL(candidate)
		if candidate == "" || containsString(out, candidate) {
			continue
		}
		out = append(out, candidate)
	}
	return out
}

type siteKey struct {
	Value           string
	Fingerprint     string
	Name            string
	Source          string
	RouteType       string
	RoutePath       string
	RoutePathSet    bool
	SupportedModels []string
	RequestBaseURLs []string
	Config          models.JSONMap
}

func siteAPIKeys(site models.Site) []siteKey {
	rawKeys, ok := site.Credentials["api_keys"].([]any)
	keys := []siteKey{}
	if ok {
		for _, item := range rawKeys {
			obj, ok := item.(map[string]any)
			if !ok {
				continue
			}
			value := strings.TrimSpace(fmt.Sprint(obj["key"]))
			status := strings.ToLower(strings.TrimSpace(fmt.Sprint(obj["status"])))
			if value == "" || status == "disabled" || status == "inactive" || status == "revoked" {
				continue
			}
			keys = append(keys, siteKey{
				Value:           value,
				Name:            strings.TrimSpace(fmt.Sprint(obj["name"])),
				Source:          "site.credentials.api_keys",
				RouteType:       routeTypeFromAny(obj["route_type"], obj["api_type"], obj["api_format"], obj["type"]),
				RoutePath:       routePathFromAny(obj["route_path"], obj["request_path"], obj["gateway_route_path"]),
				RoutePathSet:    siteKeyHasRoutePath(obj),
				SupportedModels: stringListAnyValue(obj, "supported_models"),
				RequestBaseURLs: apiKeyRequestBaseURLs(site, obj),
				Config:          cloneSiteKeyConfig(obj),
			})
		}
	}
	if len(keys) == 0 {
		value := strings.TrimSpace(stringMapValue(site.Credentials, "api_key", ""))
		if value != "" {
			keys = append(keys, siteKey{Value: value, Fingerprint: fingerprint(value), Source: "site.credentials.api_key", RouteType: inferRouteType(site), RequestBaseURLs: GatewayRequestBaseCandidates(site), Config: models.JSONMap{}})
		}
	}
	assignSiteKeyFingerprints(keys)
	return keys
}

func assignSiteKeyFingerprints(keys []siteKey) {
	byValue := map[string]int{}
	for _, key := range keys {
		byValue[key.Value]++
	}
	seen := map[string]int{}
	for idx := range keys {
		if byValue[keys[idx].Value] <= 1 {
			keys[idx].Fingerprint = fingerprint(keys[idx].Value)
			continue
		}
		signature := siteKeyRouteSignature(keys[idx])
		fp := fingerprint(keys[idx].Value + "\x00" + signature)
		seen[fp]++
		if seen[fp] > 1 {
			fp = fingerprint(keys[idx].Value + "\x00" + signature + "\x00" + strconv.Itoa(seen[fp]))
		}
		keys[idx].Fingerprint = fp
	}
}

func siteKeyRouteSignature(key siteKey) string {
	parts := []string{
		normalizeRouteType(key.RouteType),
		normalizeGatewayRoutePath(key.RoutePath),
		strings.Join(normalizeStringList(key.SupportedModels), ","),
		strings.Join(normalizeStringList(key.RequestBaseURLs), ","),
		strings.TrimSpace(stringMapValue(key.Config, "image_generation_path", "")),
		strings.TrimSpace(stringMapValue(key.Config, "image_edit_path", "")),
		strings.TrimSpace(key.Name),
	}
	return strings.Join(parts, "\x00")
}

func cloneSiteKeyConfig(obj map[string]any) models.JSONMap {
	out := models.JSONMap{}
	for key, value := range obj {
		out[key] = value
	}
	return out
}

func gatewayRouteRequestBaseCandidatesForKey(site models.Site, key siteKey) []string {
	if len(key.RequestBaseURLs) > 0 {
		return key.RequestBaseURLs
	}
	return GatewayRequestBaseCandidates(site)
}

func apiKeyRequestBaseURLs(site models.Site, obj map[string]any) []string {
	raw := []string{}
	for _, field := range []string{
		"request_base_urls",
		"request_base_url",
		"api_request_urls",
		"api_request_url",
		"gateway_request_urls",
		"gateway_request_url",
		"endpoint_url",
		"base_url",
		"baseURL",
		"api_base_url",
		"apiBaseUrl",
		"api_url",
		"apiUrl",
	} {
		raw = append(raw, stringListAnyValue(obj, field)...)
	}
	return normalizeRequestBaseURLCandidates(site.BaseURL, raw)
}

func explicitSupportedModelsForSiteKey(_ models.Site, key siteKey) []string {
	if len(key.SupportedModels) > 0 {
		return key.SupportedModels
	}
	return nil
}

func defaultGatewaySupportedModels(routeType string) []string {
	rt := normalizeRouteType(routeType)
	if rt != "codex" && rt != "gpt" {
		return nil
	}
	return append([]string{}, defaultCodexGatewaySupportedModels...)
}

func stringListAnyValue(m map[string]any, key string) []string {
	if m == nil || m[key] == nil {
		return nil
	}
	switch typed := m[key].(type) {
	case []string:
		return normalizeStringList(typed)
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			out = append(out, fmt.Sprint(item))
		}
		return normalizeStringList(out)
	case string:
		return normalizeStringList(strings.FieldsFunc(typed, func(r rune) bool {
			return strings.ContainsRune(",，\n\r\t", r)
		}))
	default:
		return normalizeStringList([]string{fmt.Sprint(typed)})
	}
}

func stringListMapValue(m models.JSONMap, key string) []string {
	if m == nil || m[key] == nil {
		return nil
	}
	switch typed := m[key].(type) {
	case []string:
		return normalizeStringList(typed)
	case []any:
		out := []string{}
		for _, item := range typed {
			out = append(out, fmt.Sprint(item))
		}
		return normalizeStringList(out)
	case string:
		return normalizeStringList(strings.FieldsFunc(typed, func(r rune) bool {
			return strings.ContainsRune(",，\n\r\t", r)
		}))
	default:
		return normalizeStringList([]string{fmt.Sprint(typed)})
	}
}

func normalizeStringList(values []string) []string {
	out := []string{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || containsString(out, value) {
			continue
		}
		out = append(out, value)
	}
	return out
}

func StringListMapValue(m models.JSONMap, key string) []string {
	return stringListMapValue(m, key)
}

func disabledGatewayRouteFingerprints(site models.Site) map[string]bool {
	out := map[string]bool{}
	for _, value := range stringListMapValue(site.PluginConfig, "gateway_disabled_route_fingerprints") {
		out[value] = true
	}
	return out
}

func SetGatewayRouteManualEnabled(db *gorm.DB, routeID uint, enabled bool) (models.GatewayRouteState, error) {
	var state models.GatewayRouteState
	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&state, routeID).Error; err != nil {
			return err
		}
		if err := updateSiteManualDisabledGatewayRoute(tx, state.SiteID, state.KeyFingerprint, !enabled); err != nil {
			return err
		}
		state.IsEnabled = enabled
		state.IsEnabledManual = !enabled
		return tx.Save(&state).Error
	})
	return state, err
}

func SetGatewayRoutesManualDisabled(db *gorm.DB, routeIDs []uint, disabled bool) error {
	uniqueRouteIDs := uniqueUintValues(routeIDs)
	if len(uniqueRouteIDs) == 0 {
		return nil
	}
	return db.Transaction(func(tx *gorm.DB) error {
		var states []models.GatewayRouteState
		if err := tx.Where("id IN ?", uniqueRouteIDs).Find(&states).Error; err != nil {
			return err
		}
		for _, state := range states {
			if err := updateSiteManualDisabledGatewayRoute(tx, state.SiteID, state.KeyFingerprint, disabled); err != nil {
				return err
			}
		}
		return tx.Model(&models.GatewayRouteState{}).
			Where("id IN ?", uniqueRouteIDs).
			Updates(map[string]any{"is_enabled": !disabled, "is_enabled_manual": disabled}).Error
	})
}

func updateSiteManualDisabledGatewayRoute(tx *gorm.DB, siteID uint, fingerprint string, disabled bool) error {
	fingerprint = strings.TrimSpace(fingerprint)
	if fingerprint == "" {
		return nil
	}
	var site models.Site
	if err := tx.First(&site, siteID).Error; err != nil {
		return err
	}
	config := cloneGatewayJSONMap(site.PluginConfig)
	values := stringListMapValue(config, "gateway_disabled_route_fingerprints")
	next := removeStringValue(values, fingerprint)
	if disabled {
		next = append(next, fingerprint)
	}
	if len(next) == 0 {
		delete(config, "gateway_disabled_route_fingerprints")
	} else {
		config["gateway_disabled_route_fingerprints"] = next
	}
	return tx.Model(&models.Site{}).Where("id = ?", site.ID).Update("plugin_config", config).Error
}

func uniqueUintValues(values []uint) []uint {
	out := []uint{}
	seen := map[uint]bool{}
	for _, value := range values {
		if value == 0 || seen[value] {
			continue
		}
		seen[value] = true
		out = append(out, value)
	}
	return out
}

func removeStringValue(values []string, target string) []string {
	out := []string{}
	for _, value := range values {
		if value == target || containsString(out, value) {
			continue
		}
		out = append(out, value)
	}
	return out
}

func cloneGatewayJSONMap(value models.JSONMap) models.JSONMap {
	if value == nil {
		return models.JSONMap{}
	}
	data, err := json.Marshal(value)
	if err != nil {
		clone := models.JSONMap{}
		for key, item := range value {
			clone[key] = item
		}
		return clone
	}
	var clone models.JSONMap
	if err := json.Unmarshal(data, &clone); err != nil || clone == nil {
		return models.JSONMap{}
	}
	return clone
}

func NormalizeStringList(values []string) []string {
	return normalizeStringList(values)
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func marshalStringSlice(values []string) string {
	data, err := json.Marshal(normalizeStringList(values))
	if err != nil {
		return "[]"
	}
	return string(data)
}

func unmarshalStringSlice(value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return []string{}
	}
	var items []string
	if err := json.Unmarshal([]byte(value), &items); err == nil {
		return normalizeStringList(items)
	}
	return normalizeStringList(strings.FieldsFunc(value, func(r rune) bool {
		return strings.ContainsRune(",，\n\r\t", r)
	}))
}

func apiKeyForFingerprint(site models.Site, fp string) string {
	for _, key := range siteAPIKeys(site) {
		if key.Fingerprint == fp {
			return key.Value
		}
	}
	return ""
}

func siteKeyForFingerprint(site models.Site, fp string) (siteKey, bool) {
	for _, key := range siteAPIKeys(site) {
		if key.Fingerprint == fp {
			return key, true
		}
	}
	return siteKey{}, false
}

func removeSiteAPIKeyForGatewayRoute(site *models.Site, keyFingerprint string) bool {
	if site == nil || strings.TrimSpace(keyFingerprint) == "" {
		return false
	}
	credentials := cloneGatewayJSONMap(site.Credentials)
	raw, ok := credentials["api_keys"].([]any)
	if ok && len(raw) > 0 {
		keys := siteAPIKeys(*site)
		keyIndex := 0
		for idx, item := range raw {
			entry, ok := item.(map[string]any)
			if !ok {
				continue
			}
			if !siteAPIKeyEntryActive(entry) {
				continue
			}
			if keyIndex >= len(keys) {
				break
			}
			key := keys[keyIndex]
			keyIndex++
			if key.Fingerprint != keyFingerprint {
				continue
			}
			next := append([]any{}, raw[:idx]...)
			next = append(next, raw[idx+1:]...)
			if len(next) == 0 {
				delete(credentials, "api_keys")
			} else {
				credentials["api_keys"] = next
			}
			site.Credentials = credentials
			return true
		}
	}
	value := strings.TrimSpace(stringMapValue(credentials, "api_key", ""))
	if value != "" && fingerprint(value) == keyFingerprint {
		delete(credentials, "api_key")
		site.Credentials = credentials
		return true
	}
	return false
}

func GatewayRouteAPIKeyForState(state models.GatewayRouteState) string {
	return apiKeyForFingerprint(state.Site, state.KeyFingerprint)
}

func GatewayRouteBalance(route GatewayRoute) *float64 {
	return route.State.LastBalance
}

func GatewayRouteBalanceUnit(route GatewayRoute) string {
	return NormalizeBalanceUnit(route.State.BalanceUnit)
}

func GatewayRouteBalanceProbeURL(route GatewayRoute) string {
	return strings.TrimSpace(route.State.BalanceProbeURL)
}

func GatewayRouteSupportedModels(state models.GatewayRouteState) []string {
	return unmarshalStringSlice(state.SupportedModels)
}

func EncodeGatewaySupportedModels(models []string) string {
	return marshalStringSlice(models)
}

func EncodeGatewayRequestBaseURLs(values []string) string {
	return marshalStringSlice(values)
}

func SetSiteAPIKeyRequestBaseURLs(site *models.Site, keyFingerprint string, values []string) (bool, string) {
	if site == nil || keyFingerprint == "" {
		return false, ""
	}
	credentials := cloneGatewayJSONMap(site.Credentials)
	raw, ok := credentials["api_keys"].([]any)
	if !ok || len(raw) == 0 {
		return false, ""
	}
	normalized := normalizeRequestBaseURLCandidates(site.BaseURL, values)
	changed := false
	newFingerprint := ""
	keys := siteAPIKeys(*site)
	keyIndex := 0
	for idx, item := range raw {
		entry, ok := item.(map[string]any)
		if !ok {
			continue
		}
		if !siteAPIKeyEntryActive(entry) {
			continue
		}
		if keyIndex >= len(keys) {
			break
		}
		key := keys[keyIndex]
		keyIndex++
		if key.Fingerprint != keyFingerprint {
			continue
		}
		if len(normalized) > 0 {
			entry["request_base_urls"] = stringSliceToAnySlice(normalized)
		} else {
			delete(entry, "request_base_urls")
		}
		removeAPIKeyRequestBaseURLAliases(entry)
		raw[idx] = entry
		changed = true
		candidateSite := *site
		candidateSite.Credentials = models.JSONMap{"api_keys": raw}
		for _, nextKey := range siteAPIKeys(candidateSite) {
			if nextKey.Value == key.Value &&
				normalizeRouteType(nextKey.RouteType) == normalizeRouteType(key.RouteType) &&
				normalizeGatewayRoutePath(nextKey.RoutePath) == normalizeGatewayRoutePath(key.RoutePath) &&
				strings.Join(normalizeStringList(nextKey.SupportedModels), "\x00") == strings.Join(normalizeStringList(key.SupportedModels), "\x00") &&
				strings.TrimSpace(nextKey.Name) == strings.TrimSpace(key.Name) {
				newFingerprint = nextKey.Fingerprint
				break
			}
		}
		break
	}
	if changed {
		credentials["api_keys"] = raw
		site.Credentials = credentials
	}
	return changed, newFingerprint
}

func siteAPIKeyEntryActive(obj map[string]any) bool {
	value := strings.TrimSpace(fmt.Sprint(obj["key"]))
	status := strings.ToLower(strings.TrimSpace(fmt.Sprint(obj["status"])))
	return value != "" && status != "disabled" && status != "inactive" && status != "revoked"
}

func stringSliceToAnySlice(values []string) []any {
	out := make([]any, 0, len(values))
	for _, value := range values {
		out = append(out, value)
	}
	return out
}

func removeAPIKeyRequestBaseURLAliases(entry map[string]any) {
	for _, key := range []string{
		"request_base_url",
		"api_request_urls",
		"api_request_url",
		"gateway_request_urls",
		"gateway_request_url",
		"endpoint_url",
		"base_url",
		"baseURL",
		"api_base_url",
		"apiBaseUrl",
		"api_url",
		"apiUrl",
	} {
		delete(entry, key)
	}
}

func GatewaySupportedModelsBySite(db *gorm.DB, siteIDs []uint, includeDisabled bool) (map[uint][]string, error) {
	out := map[uint][]string{}
	query := db.Model(&models.GatewayRouteState{}).Joins("JOIN sites ON sites.id = gateway_route_states.site_id")
	if len(siteIDs) > 0 {
		query = query.Where("gateway_route_states.site_id IN ?", siteIDs)
	}
	if !includeDisabled {
		query = query.Where("gateway_route_states.is_enabled = ? AND sites.is_enabled = ?", true, true)
	}
	var states []models.GatewayRouteState
	if err := query.Order("gateway_route_states.site_id asc, gateway_route_states.id asc").Find(&states).Error; err != nil {
		return nil, err
	}
	seen := map[uint]map[string]bool{}
	for _, state := range states {
		for _, model := range GatewayRouteSupportedModels(state) {
			model = strings.TrimSpace(model)
			key := normalizeModelID(model)
			if key == "" {
				continue
			}
			if seen[state.SiteID] == nil {
				seen[state.SiteID] = map[string]bool{}
			}
			if seen[state.SiteID][key] {
				continue
			}
			seen[state.SiteID][key] = true
			out[state.SiteID] = append(out[state.SiteID], model)
		}
	}
	return out, nil
}

func fingerprint(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])[:16]
}

func inferRouteType(site models.Site) string {
	routeType := normalizeRouteType(stringMapValue(site.PluginConfig, "gateway_route_type", ""))
	if routeType != "" {
		return routeType
	}
	if routeType := routeTypeFromAny(stringMapValue(site.PluginConfig, "api_format", "")); routeType != "" {
		return routeType
	}
	return "gpt"
}

func normalizeRouteType(value string) string {
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

func routeTypeFromAny(values ...any) string {
	for _, value := range values {
		candidate := normalizeRouteType(fmt.Sprint(value))
		if candidate != "" {
			return candidate
		}
	}
	return ""
}

func routePathFromAny(values ...any) string {
	for _, value := range values {
		candidate := normalizeGatewayRoutePath(fmt.Sprint(value))
		if candidate != "" {
			return candidate
		}
	}
	return ""
}

func siteKeyHasRoutePath(obj map[string]any) bool {
	for _, key := range []string{"route_path", "request_path", "gateway_route_path"} {
		if _, ok := obj[key]; ok {
			return true
		}
	}
	return false
}

func NormalizeGatewayRoutePath(value string) string {
	return normalizeGatewayRoutePath(value)
}

func normalizeGatewayRoutePath(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" || normalized == "<nil>" {
		return ""
	}
	normalized = strings.Trim(normalized, "/")
	switch normalized {
	case "inherit", "auto", "client", "follow_client", "follow-client", "none", "default":
		return ""
	case "chat", "chat_completions", "chat-completions", "completions", "v1/chat/completions":
		return "chat/completions"
	case "chat/completions":
		return "chat/completions"
	case "responses", "v1/responses":
		return "responses"
	default:
		return ""
	}
}

func InferGatewayRouteTypeFromTargetPath(targetPath string) string {
	switch normalizeGatewayTargetPath(targetPath) {
	case "chat/completions", "completions":
		return "gpt"
	case "responses":
		return "codex"
	default:
		return ""
	}
}

func InferGatewayRouteTypeForRequest(targetPath string, body []byte) string {
	fromBody := InferGatewayRouteTypeFromRequestBody(body)
	if fromBody == "claude" || fromBody == "gemini" || fromBody == "codex" {
		return fromBody
	}
	if fromPath := InferGatewayRouteTypeFromTargetPath(targetPath); fromPath != "" {
		return fromPath
	}
	return fromBody
}

func ExtractGatewayModelFromRequestBody(body []byte) string {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return ""
	}
	return normalizeModelID(fmt.Sprint(payload["model"]))
}

func InferGatewayRouteTypeFromRequestBody(body []byte) string {
	model := normalizeModelID(ExtractGatewayModelFromRequestBody(body))
	if model == "" {
		return ""
	}
	switch {
	case strings.Contains(model, "claude") || strings.Contains(model, "anthropic"):
		return "claude"
	case strings.Contains(model, "gemini"):
		return "gemini"
	case strings.Contains(model, "gpt") ||
		strings.Contains(model, "openai") ||
		strings.HasPrefix(model, "o1") ||
		strings.HasPrefix(model, "o3") ||
		strings.HasPrefix(model, "o4"):
		return "gpt"
	case strings.Contains(model, "codex"):
		return "codex"
	default:
		return ""
	}
}

func normalizeModelID(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" || value == "<nil>" {
		return ""
	}
	return value
}

func filterGatewayRoutesByRequest(routes []GatewayRoute, group, routeType, targetPath string, body []byte) (gatewayRouteFilterResult, error) {
	requestedRouteType := normalizeRouteType(routeType)
	result := gatewayRouteFilterResult{
		Candidates: routes,
		RouteType:  requestedRouteType,
		Model:      normalizeModelID(ExtractGatewayModelFromRequestBody(body)),
	}
	if result.RouteType == "" {
		result.RouteType = InferGatewayRouteTypeForRequest(targetPath, body)
	}
	filtered := routes
	if requestedRouteType != "" {
		filtered = filterRoutesByRouteType(filtered, requestedRouteType)
		result.Candidates = filterRoutesBySupportedModel(filtered, result.Model)
		if len(result.Candidates) == 0 && result.Model != "" && len(filtered) > 0 {
			return gatewayRouteFilterResult{}, GatewayModelNotSupportedError{
				Model:     result.Model,
				RouteType: result.RouteType,
				Group:     strings.TrimSpace(group),
			}
		}
		return result, nil
	}

	filtered = filterRoutesBySupportedModel(filtered, result.Model)
	if len(filtered) == 0 && result.Model != "" && len(routes) > 0 {
		return gatewayRouteFilterResult{}, GatewayModelNotSupportedError{
			Model:     result.Model,
			RouteType: result.RouteType,
			Group:     strings.TrimSpace(group),
		}
	}
	if result.RouteType != "" {
		preferred := filterRoutesByRouteType(filtered, result.RouteType)
		if len(preferred) > 0 {
			filtered = preferred
		} else {
			result.RouteType = ""
		}
	}
	result.Candidates = filtered
	return result, nil
}

func filterRoutesByRouteType(routes []GatewayRoute, routeType string) []GatewayRoute {
	routeType = normalizeRouteType(routeType)
	if routeType == "" {
		return routes
	}
	next := make([]GatewayRoute, 0, len(routes))
	for _, route := range routes {
		if route.State.RouteType == routeType || route.State.RouteType == "general" {
			next = append(next, route)
		}
	}
	return next
}

func filterRoutesBySupportedModel(routes []GatewayRoute, model string) []GatewayRoute {
	model = normalizeModelID(model)
	if len(routes) == 0 || model == "" {
		return routes
	}
	exact := make([]GatewayRoute, 0, len(routes))
	for _, route := range routes {
		supported := GatewayRouteSupportedModels(route.State)
		for _, candidate := range supported {
			if gatewayModelMatchesSupported(candidate, model) {
				exact = append(exact, route)
				break
			}
		}
	}
	return exact
}

func gatewayModelMatchesSupported(supported, requested string) bool {
	supported = normalizeModelID(supported)
	requested = normalizeModelID(requested)
	if supported == "" || requested == "" {
		return false
	}
	if supported == requested {
		return true
	}
	return supported == stripTrailingModelDateVersion(requested)
}

func stripTrailingModelDateVersion(model string) string {
	model = normalizeModelID(model)
	if !hasTrailingModelDateVersion(model) {
		return model
	}
	return model[:len(model)-11]
}

func hasTrailingModelDateVersion(model string) bool {
	if len(model) < 12 {
		return false
	}
	suffix := model[len(model)-11:]
	if suffix[0] != '-' || suffix[5] != '-' || suffix[8] != '-' {
		return false
	}
	for _, idx := range []int{1, 2, 3, 4, 6, 7, 9, 10} {
		if suffix[idx] < '0' || suffix[idx] > '9' {
			return false
		}
	}
	return true
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	return ""
}

func targetURL(baseURL, targetPath, rawQuery, routeType, routePath string) (string, error) {
	base := NormalizeBaseURL(baseURL)
	path := strings.TrimLeft(targetPath, "/")
	normalizedRoutePath := normalizeGatewayRoutePath(routePath)
	parsed, err := url.Parse(base)
	if err != nil {
		return "", err
	}
	if parsed.Path == "" || parsed.Path == "/" {
		if strings.HasPrefix(path, "v1/") || path == "v1" || strings.HasPrefix(path, "v1beta/") || path == "v1beta" {
			// keep path
		} else if normalizeRouteType(routeType) == "gemini" {
			path = "v1beta/openai/" + path
		} else {
			path = "v1/" + path
		}
	}
	joined, err := JoinURL(base, path)
	if err != nil {
		return "", err
	}
	u, err := url.Parse(joined)
	if err != nil {
		return "", err
	}
	if rawQuery != "" {
		values, _ := url.ParseQuery(rawQuery)
		values.Del("group")
		values.Del("type")
		values.Del("route_type")
		if values.Has("wire_api") {
			switch normalizedRoutePath {
			case "chat/completions":
				values.Set("wire_api", "chat")
			case "responses":
				values.Set("wire_api", "responses")
			}
		}
		u.RawQuery = values.Encode()
	}
	return u.String(), nil
}

func GatewayTargetURL(baseURL, targetPath, rawQuery, routeType string) (string, error) {
	return targetURL(baseURL, targetPath, rawQuery, routeType, "")
}

func copyGatewayHeaders(dst, src http.Header) {
	allowed := map[string]bool{"content-type": true, "accept": true, "openai-organization": true, "openai-project": true}
	for key, values := range src {
		if allowed[strings.ToLower(key)] {
			for _, value := range values {
				dst.Add(key, value)
			}
		}
	}
}

func gatewayUpstreamUserAgent(route GatewayRoute, clientUserAgent string) string {
	if key, ok := siteKeyForFingerprint(route.Site, route.State.KeyFingerprint); ok {
		if value := gatewayOfficialUserAgent(stringMapValue(key.Config, "user_agent", "")); value != "" {
			return value
		}
	}
	if value := gatewayOfficialUserAgent(stringMapValue(route.Site.Credentials, "user_agent", "")); value != "" {
		return value
	}
	if value := gatewayOfficialUserAgent(clientUserAgent); value != "" {
		return value
	}
	return DefaultCodexCLIUserAgent
}

func gatewayOfficialUserAgentForClient(clientUserAgent string) string {
	return gatewayOfficialUserAgent(clientUserAgent)
}

func gatewayOfficialUserAgent(userAgent string) string {
	value := strings.TrimSpace(userAgent)
	if value == "" {
		return ""
	}
	normalized := strings.ToLower(value)
	for _, prefix := range []string{
		"codex-tui/",
		"codex_exec/",
		"codex_vscode/",
		"codex desktop/",
		"openai/python ",
		"openai/js ",
		"opencode/",
		"opencodex/",
	} {
		if strings.HasPrefix(normalized, prefix) {
			return value
		}
	}
	return ""
}

func extractModelIDs(body []byte) []string {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return []string{}
	}
	items, ok := payload["data"].([]any)
	if !ok {
		return []string{}
	}
	ids := make([]string, 0, len(items))
	for _, item := range items {
		obj, ok := item.(map[string]any)
		if !ok {
			continue
		}
		id, ok := obj["id"].(string)
		if ok && strings.TrimSpace(id) != "" {
			ids = append(ids, strings.TrimSpace(id))
		}
	}
	return normalizeStringList(ids)
}

func normalizePolicy(policy GatewayPolicy) GatewayPolicy {
	policy.RouteStrategy = normalizeStrategy(policy.RouteStrategy)
	if policy.RouteStrategy == "" {
		policy.RouteStrategy = "round_robin"
	}
	policy.FailureRetryMode = NormalizeGatewayFailureRetryMode(policy.FailureRetryMode)
	if policy.FailureThreshold <= 0 {
		policy.FailureThreshold = 3
	}
	if policy.CooldownSeconds <= 0 {
		policy.CooldownSeconds = 180
	}
	if policy.RequestTimeout <= 0 {
		policy.RequestTimeout = 60
	}
	if policy.MaxAttempts < 0 {
		policy.MaxAttempts = 0
	}
	switch strings.ToLower(strings.TrimSpace(policy.ConcurrencyOverflowStrategy)) {
	case "latency_first", "sequential":
		policy.ConcurrencyOverflowStrategy = strings.ToLower(strings.TrimSpace(policy.ConcurrencyOverflowStrategy))
	default:
		policy.ConcurrencyOverflowStrategy = "latency_first"
	}
	switch strings.ToLower(strings.TrimSpace(policy.ConcurrencyTransferStrategy)) {
	case "limit_only", "balance":
		policy.ConcurrencyTransferStrategy = strings.ToLower(strings.TrimSpace(policy.ConcurrencyTransferStrategy))
	default:
		policy.ConcurrencyTransferStrategy = "limit_only"
	}
	policy.SmartLatencyBias = clampBias(policy.SmartLatencyBias, 1.0)
	policy.SmartConcurrencyBias = clampBias(policy.SmartConcurrencyBias, 1.5)
	policy.SmartFailureBias = clampBias(policy.SmartFailureBias, 1.0)
	policy.SmartPriorityBias = clampBias(policy.SmartPriorityBias, 0.5)
	return policy
}

func NormalizeGatewayFailureRetryMode(mode string) string {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case "all":
		return "all"
	default:
		return "retryable"
	}
}

func shouldFallbackStatus(status int, mode string) bool {
	if status >= 200 && status < 300 {
		return false
	}
	if NormalizeGatewayFailureRetryMode(mode) == "all" {
		return true
	}
	return status == http.StatusTooManyRequests || status >= 500
}

func shouldFallbackGatewayFailure(status int, message, mode string) bool {
	if shouldFallbackStatus(status, mode) {
		return true
	}
	return shouldOpenRouteCircuitImmediately(classifyGatewayUpstreamFailure(message, &status))
}

func clampBias(value, fallback float64) float64 {
	if value < 0 {
		return 0
	}
	if value == 0 && fallback > 0 {
		return fallback
	}
	if value > 5 {
		return 5
	}
	return value
}

func orDefault(value, fallback float64) float64 {
	if value == 0 {
		return fallback
	}
	return value
}

func normalizeStrategy(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "priority", "round_robin", "latency_first", "smart":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "round_robin"
	}
}

func stringMapValue(m models.JSONMap, key, fallback string) string {
	if m == nil || m[key] == nil {
		return fallback
	}
	switch typed := m[key].(type) {
	case string:
		if strings.TrimSpace(typed) == "" {
			return fallback
		}
		return typed
	default:
		return fmt.Sprint(typed)
	}
}

func intValue(m models.JSONMap, key string, fallback int) int {
	raw := stringMapValue(m, key, "")
	if raw == "" {
		return fallback
	}
	var parsed int
	if err := json.Unmarshal([]byte(raw), &parsed); err == nil {
		return parsed
	}
	if _, err := fmt.Sscanf(raw, "%d", &parsed); err == nil {
		return parsed
	}
	return fallback
}

func stringPtr(value string) *string { return &value }

func boolPtr(value bool) *bool { return &value }

func shorten(value string, limit int) string {
	value = strings.TrimSpace(value)
	if len(value) <= limit {
		return value
	}
	return value[:limit] + "..."
}

func max(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func newRequestID() string {
	var b [12]byte
	if _, err := rand.Read(b[:]); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b[:])
}

func statusCodePtrOrNil(value int) *int {
	if value == 0 {
		return nil
	}
	v := value
	return &v
}
