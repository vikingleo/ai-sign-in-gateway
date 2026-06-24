package handlers

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/plugins"
	"ai-sign-in-gateway/internal/schemas"
	"ai-sign-in-gateway/internal/services"
	"github.com/glebarez/sqlite"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func TestCreateRegistrationBatchSitesSub2APICreatesSites(t *testing.T) {
	requests := map[string]int{}
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests[r.URL.Path]++
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/v1/auth/register":
			var body map[string]any
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Fatalf("decode register body: %v", err)
			}
			if !strings.HasPrefix(fmt.Sprint(body["email"]), "user+") {
				t.Fatalf("register email = %v", body["email"])
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"success": true})
		case "/api/v1/auth/login":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"data": map[string]any{"access_token": "access-" + fmt.Sprint(requests[r.URL.Path]), "refresh_token": "refresh-token"},
			})
		case "/api/v1/keys":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"data": []map[string]any{{"id": 1, "name": "default", "key": "sk-test", "status": "active"}},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()

	db, err := gorm.Open(sqlite.Open("file:sites-register-batch?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	app := &App{DB: db, PluginManager: plugins.NewManager()}
	payload := map[string]any{
		"name":          "sub2api",
		"base_url":      upstream.URL,
		"plugin_key":    "sub2api-platform",
		"is_enabled":    true,
		"email_pattern": "user+{n}@example.com",
		"password":      "pass123456",
		"count":         2,
		"start_index":   3,
		"credentials":   map[string]any{},
		"plugin_config": map[string]any{"api_keys_url": "/api/v1/keys"},
	}
	data, _ := json.Marshal(payload)
	rec := httptest.NewRecorder()
	app.CreateRegistrationBatchSites(rec, httptest.NewRequest(http.MethodPost, "/api/sites/register-batch", bytes.NewReader(data)))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d body = %s", rec.Code, rec.Body.String())
	}
	var response struct {
		CreatedCount int `json:"created_count"`
		FailedCount  int `json:"failed_count"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response.CreatedCount != 2 || response.FailedCount != 0 {
		t.Fatalf("response = %+v", response)
	}
	var sites []models.Site
	if err := db.Order("name asc").Find(&sites).Error; err != nil {
		t.Fatalf("list sites: %v", err)
	}
	if len(sites) != 2 {
		t.Fatalf("site count = %d", len(sites))
	}
	if got := jsonMapString(sites[0].Credentials, "email"); got != "user+3@example.com" {
		t.Fatalf("first email = %q", got)
	}
	if got := jsonMapString(sites[0].Credentials, "api_key"); got != "sk-test" {
		t.Fatalf("first api_key = %q", got)
	}
}

func TestListSitesOrdersByCreatedAt(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-created-order?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	older := time.Now().UTC().Add(-2 * time.Hour)
	newer := time.Now().UTC().Add(-1 * time.Hour)
	sites := []models.Site{
		{Name: "newer", BaseURL: "https://newer.example", PluginKey: "http-relay-station", IsEnabled: true, Credentials: models.JSONMap{}, PluginConfig: models.JSONMap{}, CreatedAt: newer, UpdatedAt: older},
		{Name: "older", BaseURL: "https://older.example", PluginKey: "http-relay-station", IsEnabled: true, Credentials: models.JSONMap{}, PluginConfig: models.JSONMap{}, CreatedAt: older, UpdatedAt: newer},
	}
	for _, site := range sites {
		if err := db.Create(&site).Error; err != nil {
			t.Fatalf("create site: %v", err)
		}
	}

	app := &App{DB: db, PluginManager: plugins.NewManager()}
	rec := httptest.NewRecorder()
	app.ListSites(rec, httptest.NewRequest(http.MethodGet, "/api/sites", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("list status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if len(payload) != 2 {
		t.Fatalf("payload len = %d", len(payload))
	}
	if payload[0]["name"] != "older" || payload[1]["name"] != "newer" {
		t.Fatalf("site order = %v, %v", payload[0]["name"], payload[1]["name"])
	}
}

func TestUpdateSitePreservesManualCheckinParticipation(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-preserve-checkin-participation?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{
		Name:      "manual-checkin",
		BaseURL:   "https://manual-checkin.example",
		PluginKey: "http-relay-station",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"api_key": "route-key",
		},
		PluginConfig: models.JSONMap{
			"include_in_checkin": false,
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	payload := map[string]any{
		"name":             "manual-checkin-updated",
		"base_url":         site.BaseURL,
		"plugin_key":       site.PluginKey,
		"group_name":       "",
		"supported_models": nil,
		"is_enabled":       true,
		"notes":            "",
		"credentials":      map[string]any{"api_key": "route-key"},
		"plugin_config":    map[string]any{"checkin_path": "/checkin"},
	}
	data, _ := json.Marshal(payload)
	app := &App{DB: db, PluginManager: plugins.NewManager()}
	rec := httptest.NewRecorder()
	app.UpdateSite(rec, siteRequestWithIDAndBody(site.ID, http.MethodPut, data))
	if rec.Code != http.StatusOK {
		t.Fatalf("update status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var stored models.Site
	if err := db.First(&stored, site.ID).Error; err != nil {
		t.Fatalf("reload site: %v", err)
	}
	if includeInCheckin(stored) {
		t.Fatalf("include_in_checkin was not preserved: %#v", stored.PluginConfig)
	}
	if got := strings.TrimSpace(fmt.Sprint(stored.PluginConfig["checkin_path"])); got != "/checkin" {
		t.Fatalf("checkin_path = %q", got)
	}
}

func TestRefreshOneSiteUsesBalanceProbeForRelayOnlySites(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/usage" {
			t.Fatalf("unexpected path %q", r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer probe-key" {
			t.Fatalf("Authorization = %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"remaining":12.34,"unit":"USD"}`))
	}))
	defer upstream.Close()

	db, err := gorm.Open(sqlite.Open("file:sites-refresh-relay?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	site := models.Site{
		Name:      "su8",
		BaseURL:   upstream.URL,
		PluginKey: "api-supplier",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"account": "公司",
			"api_key": "probe-key",
		},
		PluginConfig: models.JSONMap{
			"endpoint_url": upstream.URL + "/v1",
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	app := &App{DB: db, PluginManager: plugins.NewManager()}
	summary := app.refreshOneSite(context.Background(), site, 5)

	connectionStatus, _ := summary["connection_status"].(*string)
	if connectionStatus == nil || *connectionStatus != "success" {
		t.Fatalf("connection_status = %v", summary["connection_status"])
	}
	message, _ := summary["last_message"].(*string)
	if message == nil || !strings.Contains(*message, "模型出口验证成功") {
		t.Fatalf("last_message = %v", summary["last_message"])
	}
	balance, _ := summary["last_balance"].(*float64)
	if balance == nil || *balance != 12.34 {
		t.Fatalf("last_balance = %v", summary["last_balance"])
	}

	var stored models.Site
	if err := db.First(&stored, site.ID).Error; err != nil {
		t.Fatalf("reload site: %v", err)
	}
	if stored.LastStatus == nil || *stored.LastStatus != "success" {
		t.Fatalf("stored.LastStatus = %v", stored.LastStatus)
	}
	if stored.LastBalance == nil || *stored.LastBalance != 12.34 {
		t.Fatalf("stored.LastBalance = %v", stored.LastBalance)
	}
	if got := strings.TrimSpace(jsonMapString(stored.PluginConfig, "balance_unit")); got != "$" {
		t.Fatalf("balance_unit = %q", got)
	}
}

func TestRefreshOneSiteInvitePersistsInviteInfo(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer token-123" {
			t.Fatalf("Authorization = %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/status":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "ok",
				"data": map[string]any{
					"logged_in": true,
				},
			})
		case "/invite":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"data": map[string]any{
					"invite": map[string]any{
						"code": "BATCH-INVITE",
					},
				},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()

	db, err := gorm.Open(sqlite.Open("file:sites-refresh-invite?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	site := models.Site{
		Name:      "invite-site",
		BaseURL:   upstream.URL,
		PluginKey: "http-relay-station",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"api_key": "token-123",
		},
		PluginConfig: models.JSONMap{
			"auth_mode":            "bearer",
			"status_path":          "/status",
			"status_method":        "GET",
			"status_login_path":    "data.logged_in",
			"invite_path":          "/invite",
			"invite_code_path":     "data.invite.code",
			"invite_link_template": "/register?code={code}",
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	app := &App{DB: db, PluginManager: plugins.NewManager()}
	result := app.refreshOneSiteInvite(context.Background(), site, 5)
	if !result.OK {
		t.Fatalf("result.OK = false, message = %q", result.Message)
	}
	if result.InviteCode == nil || *result.InviteCode != "BATCH-INVITE" {
		t.Fatalf("InviteCode = %v", result.InviteCode)
	}
	if result.InviteLink == nil || *result.InviteLink != upstream.URL+"/register?code=BATCH-INVITE" {
		t.Fatalf("InviteLink = %v", result.InviteLink)
	}

	var stored models.Site
	if err := db.First(&stored, site.ID).Error; err != nil {
		t.Fatalf("reload site: %v", err)
	}
	if got := strings.TrimSpace(jsonMapString(stored.PluginConfig, "invite_code")); got != "BATCH-INVITE" {
		t.Fatalf("stored invite_code = %q", got)
	}
	if got := strings.TrimSpace(jsonMapString(stored.PluginConfig, "invite_link")); got != upstream.URL+"/register?code=BATCH-INVITE" {
		t.Fatalf("stored invite_link = %q", got)
	}
}

func TestRefreshOneSiteAPIKeysPersistsUnmaskedYellowPeachKey(t *testing.T) {
	const wantKey = "W4DiyFnN2smON5wIi91Jx9fxBJV3Sw4VHszjdpkC1JoWNHI4"
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer panel-token" {
			t.Fatalf("Authorization = %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/token/":
			if got := r.URL.Query().Get("p"); got != "1" {
				t.Fatalf("page query = %q", got)
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"data": map[string]any{
					"items": []map[string]any{
						{
							"id":      25,
							"name":    "default",
							"key":     "sk-****",
							"enabled": true,
						},
					},
				},
			})
		case "/api/token/batch/keys":
			http.Error(w, `{"message":"not found"}`, http.StatusNotFound)
		case "/api/token/25/key":
			if r.Method != http.MethodPost {
				http.NotFound(w, r)
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"data": map[string]any{
					"key": wantKey,
				},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()

	db, err := gorm.Open(sqlite.Open("file:sites-refresh-api-keys?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	site := models.Site{
		Name:      "欢喜自用API",
		BaseURL:   upstream.URL,
		PluginKey: "yellowpeach-newapi",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"access_token": "panel-token",
		},
		PluginConfig: models.JSONMap{
			"api_keys_url": "/api/token/?p=1&size=10",
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	app := &App{DB: db, PluginManager: plugins.NewManager()}
	result := app.refreshOneSiteAPIKeys(context.Background(), site, 5)
	if !result.OK {
		t.Fatalf("result.OK = false, message = %q", result.Message)
	}
	if result.APIKeyCount != 1 {
		t.Fatalf("APIKeyCount = %d", result.APIKeyCount)
	}
	if !result.PrimaryKeyUpdated {
		t.Fatalf("PrimaryKeyUpdated = false")
	}

	var stored models.Site
	if err := db.First(&stored, site.ID).Error; err != nil {
		t.Fatalf("reload site: %v", err)
	}
	if got := strings.TrimSpace(jsonMapString(stored.Credentials, "api_key")); got != wantKey {
		t.Fatalf("stored api_key = %q", got)
	}
	apiKeys, ok := stored.Credentials["api_keys"].([]any)
	if !ok {
		t.Fatalf("stored api_keys type = %T", stored.Credentials["api_keys"])
	}
	if len(apiKeys) != 1 {
		t.Fatalf("stored api_keys len = %d", len(apiKeys))
	}
	item, ok := apiKeys[0].(map[string]any)
	if !ok {
		t.Fatalf("stored api_keys[0] type = %T", apiKeys[0])
	}
	if got := strings.TrimSpace(fmt.Sprint(item["key"])); got != wantKey {
		t.Fatalf("stored api_keys[0].key = %q", got)
	}
}

func TestRefreshOneSiteAPIKeysPreservesDistinctManualKeys(t *testing.T) {
	const syncedKey = "sk-synced"
	const manualKey = "sk-manual"
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer panel-token" {
			t.Fatalf("Authorization = %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/token/":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"data": map[string]any{
					"items": []map[string]any{
						{"id": 25, "name": "synced", "key": syncedKey, "enabled": true},
					},
				},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()

	db, err := gorm.Open(sqlite.Open("file:sites-refresh-api-keys-manual?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	site := models.Site{
		Name:      "manual-keys",
		BaseURL:   upstream.URL,
		PluginKey: "yellowpeach-newapi",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"access_token": "panel-token",
			"api_keys": []any{
				map[string]any{"id": "manual-1", "name": "manual", "key": manualKey, "status": "active", "source": "manual", "route_type": "claude"},
			},
		},
		PluginConfig: models.JSONMap{
			"api_keys_url": "/api/token/?p=1&size=10",
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	app := &App{DB: db, PluginManager: plugins.NewManager()}
	result := app.refreshOneSiteAPIKeys(context.Background(), site, 5)
	if !result.OK {
		t.Fatalf("result.OK = false, message = %q", result.Message)
	}
	if result.APIKeyCount != 2 {
		t.Fatalf("APIKeyCount = %d", result.APIKeyCount)
	}

	var stored models.Site
	if err := db.First(&stored, site.ID).Error; err != nil {
		t.Fatalf("reload site: %v", err)
	}
	apiKeys, ok := stored.Credentials["api_keys"].([]any)
	if !ok {
		t.Fatalf("stored api_keys type = %T", stored.Credentials["api_keys"])
	}
	if len(apiKeys) != 2 {
		t.Fatalf("stored api_keys len = %d", len(apiKeys))
	}
	first := apiKeys[0].(map[string]any)
	second := apiKeys[1].(map[string]any)
	if got := strings.TrimSpace(fmt.Sprint(first["key"])); got != syncedKey {
		t.Fatalf("first key = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(second["key"])); got != manualKey {
		t.Fatalf("second key = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(second["source"])); got != "manual" {
		t.Fatalf("manual source = %q", got)
	}
}

func TestMergeAPIKeyListsUsesSyncedEntryWhenManualKeyMatches(t *testing.T) {
	merged := mergeAPIKeyLists(
		[]any{
			map[string]any{"id": "manual-1", "name": "manual", "key": "sk-same", "source": "manual", "status": "active"},
			map[string]any{"id": "manual-2", "name": "other", "key": "sk-other", "source": "manual", "status": "active"},
		},
		[]map[string]any{
			{"id": "remote-1", "name": "remote", "key": "sk-same", "status": "active"},
		},
	)
	if len(merged) != 2 {
		t.Fatalf("merged len = %d", len(merged))
	}
	if got := strings.TrimSpace(fmt.Sprint(merged[0]["name"])); got != "remote" {
		t.Fatalf("merged[0].name = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(merged[0]["source"])); got != "" && got != "<nil>" {
		t.Fatalf("merged[0].source = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(merged[1]["key"])); got != "sk-other" {
		t.Fatalf("merged[1].key = %q", got)
	}
}

func TestMergeAPIKeyListsPreservesLocalRequestBaseURLsForSyncedKey(t *testing.T) {
	merged := mergeAPIKeyLists(
		[]any{
			map[string]any{
				"id":                "remote-previous",
				"name":              "previous",
				"key":               "sk-same",
				"source":            "api",
				"status":            "active",
				"request_base_urls": []any{"https://claude.example/v1"},
			},
		},
		[]map[string]any{
			{"id": "remote-next", "name": "next", "key": "sk-same", "source": "api", "status": "active"},
		},
	)
	if len(merged) != 1 {
		t.Fatalf("merged len = %d", len(merged))
	}
	urls, ok := merged[0]["request_base_urls"].([]any)
	if !ok {
		t.Fatalf("request_base_urls type = %T", merged[0]["request_base_urls"])
	}
	if len(urls) != 1 || urls[0] != "https://claude.example/v1" {
		t.Fatalf("request_base_urls = %#v", urls)
	}
}

func TestMergeAPIKeyListsKeepsSyncedSameKeyDifferentIDs(t *testing.T) {
	merged := mergeAPIKeyLists(
		[]any{
			map[string]any{
				"id":                "remote-gpt",
				"name":              "gpt",
				"key":               "sk-shared",
				"source":            "api",
				"status":            "active",
				"request_base_urls": []any{"https://gpt.example/v1"},
			},
			map[string]any{
				"id":                "remote-claude",
				"name":              "claude",
				"key":               "sk-shared",
				"source":            "api",
				"status":            "active",
				"request_base_urls": []any{"https://claude.example/v1"},
			},
		},
		[]map[string]any{
			{"id": "remote-gpt", "name": "gpt", "key": "sk-shared", "source": "api", "status": "active"},
			{"id": "remote-claude", "name": "claude", "key": "sk-shared", "source": "api", "status": "active"},
		},
	)
	if len(merged) != 2 {
		t.Fatalf("merged len = %d", len(merged))
	}
	if got := strings.TrimSpace(fmt.Sprint(merged[0]["id"])); got != "remote-gpt" {
		t.Fatalf("merged[0].id = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(merged[1]["id"])); got != "remote-claude" {
		t.Fatalf("merged[1].id = %q", got)
	}
	firstURLs, ok := merged[0]["request_base_urls"].([]any)
	if !ok || len(firstURLs) != 1 || firstURLs[0] != "https://gpt.example/v1" {
		t.Fatalf("merged[0].request_base_urls = %#v", merged[0]["request_base_urls"])
	}
	secondURLs, ok := merged[1]["request_base_urls"].([]any)
	if !ok || len(secondURLs) != 1 || secondURLs[0] != "https://claude.example/v1" {
		t.Fatalf("merged[1].request_base_urls = %#v", merged[1]["request_base_urls"])
	}
}

func TestMergeAPIKeyListsKeepsManualSameKeyWithDistinctRoutingConfig(t *testing.T) {
	merged := mergeAPIKeyLists(
		[]any{
			map[string]any{
				"id":                "remote-gpt",
				"name":              "gpt",
				"key":               "sk-shared",
				"source":            "api",
				"status":            "active",
				"route_type":        "gpt",
				"request_base_urls": []any{"https://gpt.example/v1"},
			},
			map[string]any{
				"id":                "manual-claude",
				"name":              "claude",
				"key":               "sk-shared",
				"source":            "manual",
				"status":            "active",
				"route_type":        "claude",
				"request_base_urls": []any{"https://claude.example/v1"},
			},
		},
		[]map[string]any{
			{"id": "remote-gpt", "name": "gpt", "key": "sk-shared", "source": "api", "status": "active", "route_type": "gpt"},
		},
	)
	if len(merged) != 2 {
		t.Fatalf("merged len = %d", len(merged))
	}
	if got := strings.TrimSpace(fmt.Sprint(merged[1]["id"])); got != "manual-claude" {
		t.Fatalf("merged[1].id = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(merged[1]["route_type"])); got != "claude" {
		t.Fatalf("merged[1].route_type = %q", got)
	}
	urls, ok := merged[1]["request_base_urls"].([]any)
	if !ok || len(urls) != 1 || urls[0] != "https://claude.example/v1" {
		t.Fatalf("merged[1].request_base_urls = %#v", merged[1]["request_base_urls"])
	}
}

func TestMergeAPIKeyListsKeepsNoIDSameKeyWithDistinctRoutingConfig(t *testing.T) {
	merged := mergeAPIKeyLists(
		nil,
		[]map[string]any{
			{
				"name":              "gpt",
				"key":               "sk-shared",
				"source":            "manual",
				"status":            "active",
				"route_type":        "gpt",
				"request_base_urls": []any{"https://gpt.example/v1"},
			},
			{
				"name":              "claude",
				"key":               "sk-shared",
				"source":            "manual",
				"status":            "active",
				"route_type":        "claude",
				"request_base_urls": []any{"https://claude.example/v1"},
			},
		},
	)
	if len(merged) != 2 {
		t.Fatalf("merged len = %d", len(merged))
	}
	if got := strings.TrimSpace(fmt.Sprint(merged[0]["route_type"])); got != "gpt" {
		t.Fatalf("merged[0].route_type = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(merged[1]["route_type"])); got != "claude" {
		t.Fatalf("merged[1].route_type = %q", got)
	}
}

func TestListSitesRedactsCredentialsAndGetSiteReturnsFullCredentials(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-redaction?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	site := models.Site{
		Name:      "secret-site",
		BaseURL:   "https://example.test",
		PluginKey: "yellowpeach-newapi",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"api_key":      "sk-live-secret",
			"access_token": "access-secret",
			"api_keys": []any{
				map[string]any{"id": "1", "name": "primary", "key": "sk-child-secret", "status": "active"},
			},
		},
		PluginConfig: models.JSONMap{
			"api_keys_url":       "/api/token/?p=1&size=10",
			"client_secret":      "client-secret",
			"supported_models":   []any{"manual-should-not-leak"},
			"gateway_route_type": "codex",
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}
	route := models.GatewayRouteState{
		SiteID:          site.ID,
		KeyFingerprint:  testGatewayRouteFingerprint("sk-live-secret"),
		KeyName:         "primary",
		KeySource:       "test",
		RouteType:       "codex",
		SupportedModels: services.EncodeGatewaySupportedModels([]string{"gpt-5.5"}),
		IsEnabled:       true,
		CircuitState:    "closed",
	}
	if err := db.Create(&route).Error; err != nil {
		t.Fatalf("create route: %v", err)
	}

	app := &App{DB: db, PluginManager: plugins.NewManager()}
	listRec := httptest.NewRecorder()
	app.ListSites(listRec, httptest.NewRequest(http.MethodGet, "/api/sites", nil))
	if listRec.Code != http.StatusOK {
		t.Fatalf("list status = %d, body = %s", listRec.Code, listRec.Body.String())
	}
	var listPayload []map[string]any
	if err := json.Unmarshal(listRec.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	credentials := listPayload[0]["credentials"].(map[string]any)
	if got := credentials["api_key"]; got != "********" {
		t.Fatalf("list api_key = %v", got)
	}
	apiKeys := credentials["api_keys"].([]any)
	firstKey := apiKeys[0].(map[string]any)["key"]
	if firstKey != "********" {
		t.Fatalf("list api_keys[0].key = %v", firstKey)
	}
	listConfig := listPayload[0]["plugin_config"].(map[string]any)
	if _, ok := listConfig["supported_models"]; ok {
		t.Fatalf("list plugin_config leaked supported_models: %v", listConfig["supported_models"])
	}
	if got := fmt.Sprint(listPayload[0]["supported_models"]); !strings.Contains(got, "gpt-5.5") || strings.Contains(got, "manual-should-not-leak") {
		t.Fatalf("list supported_models = %v", listPayload[0]["supported_models"])
	}

	detailRec := httptest.NewRecorder()
	app.GetSite(detailRec, siteRequestWithID(site.ID))
	if detailRec.Code != http.StatusOK {
		t.Fatalf("detail status = %d, body = %s", detailRec.Code, detailRec.Body.String())
	}
	var detailPayload map[string]any
	if err := json.Unmarshal(detailRec.Body.Bytes(), &detailPayload); err != nil {
		t.Fatalf("decode detail: %v", err)
	}
	detailCredentials := detailPayload["credentials"].(map[string]any)
	if got := detailCredentials["api_key"]; got != "sk-live-secret" {
		t.Fatalf("detail api_key = %v", got)
	}
	detailConfig := detailPayload["plugin_config"].(map[string]any)
	if _, ok := detailConfig["supported_models"]; ok {
		t.Fatalf("detail plugin_config leaked supported_models: %v", detailConfig["supported_models"])
	}
	if got := fmt.Sprint(detailPayload["supported_models"]); !strings.Contains(got, "gpt-5.5") || strings.Contains(got, "manual-should-not-leak") {
		t.Fatalf("detail supported_models = %v", detailPayload["supported_models"])
	}
}

func TestToggleSiteOffDeletesGatewayRoutes(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-toggle-route-cleanup?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	site := models.Site{
		Name:         "route-site",
		BaseURL:      "https://example.test",
		PluginKey:    "http-relay-station",
		IsEnabled:    true,
		Credentials:  models.JSONMap{"api_key": "route-key"},
		PluginConfig: models.JSONMap{},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}
	if err := db.Create(&models.GatewayRouteState{SiteID: site.ID, KeyFingerprint: testGatewayRouteFingerprint("route-key"), IsEnabled: true, CircuitState: "closed"}).Error; err != nil {
		t.Fatalf("create route: %v", err)
	}

	app := &App{DB: db, PluginManager: plugins.NewManager()}
	rec := httptest.NewRecorder()
	app.ToggleSite(rec, siteRequestWithID(site.ID))
	if rec.Code != http.StatusOK {
		t.Fatalf("toggle status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var routeCount int64
	if err := db.Model(&models.GatewayRouteState{}).Where("site_id = ?", site.ID).Count(&routeCount).Error; err != nil {
		t.Fatal(err)
	}
	if routeCount != 0 {
		t.Fatalf("route count after disable = %d", routeCount)
	}
}

func TestSiteDraftPayloadPreservesExistingSiteContextWithoutSavingDraft(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-draft-existing-context?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{
		Name:         "stored-site",
		BaseURL:      "https://stored.example",
		PluginKey:    "http-relay-station",
		IsEnabled:    true,
		Credentials:  models.JSONMap{"api_key": "stored-key", "account": "stored-account"},
		PluginConfig: models.JSONMap{"balance_unit": "USD"},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	app := &App{DB: db, PluginManager: plugins.NewManager()}
	rec := httptest.NewRecorder()
	draft, ok := app.siteFromDraftPayload(rec, schemas.SiteDraftTestRequest{
		SiteBase: schemas.SiteBase{
			BaseURL:      "https://draft.example",
			PluginKey:    "yellowpeach-newapi",
			Credentials:  models.JSONMap{"api_key": "draft-key"},
			PluginConfig: models.JSONMap{"request_base_url": "https://draft.example/v1", "supported_models": []string{"draft-model"}},
		},
		SiteID: site.ID,
	})
	if !ok {
		t.Fatalf("siteFromDraftPayload returned false, response = %d %s", rec.Code, rec.Body.String())
	}
	if draft.ID != site.ID || draft.Name != "stored-site" || !draft.IsEnabled {
		t.Fatalf("draft context = id:%d name:%q enabled:%v", draft.ID, draft.Name, draft.IsEnabled)
	}
	if draft.BaseURL != "https://draft.example" || draft.PluginKey != "yellowpeach-newapi" {
		t.Fatalf("draft base/plugin = %q/%q", draft.BaseURL, draft.PluginKey)
	}
	if got := jsonMapString(draft.Credentials, "api_key"); got != "draft-key" {
		t.Fatalf("draft api_key = %q", got)
	}
	if _, ok := draft.PluginConfig["supported_models"]; ok {
		t.Fatalf("draft plugin_config leaked supported_models: %v", draft.PluginConfig)
	}

	var stored models.Site
	if err := db.First(&stored, site.ID).Error; err != nil {
		t.Fatalf("reload site: %v", err)
	}
	if stored.BaseURL != "https://stored.example" || stored.PluginKey != "http-relay-station" {
		t.Fatalf("stored base/plugin mutated = %q/%q", stored.BaseURL, stored.PluginKey)
	}
	if got := jsonMapString(stored.Credentials, "api_key"); got != "stored-key" {
		t.Fatalf("stored api_key mutated = %q", got)
	}
}

func TestSiteDraftTestDoesNotPersistExistingSiteRuntimeOrBackfill(t *testing.T) {
	upstream, requests := newDraftBackfillServer()
	defer upstream.Close()

	db := newDraftBackfillDB(t)
	site, runAt := createStoredDraftBackfillSite(t, db)
	response := runDraftBackfillTest(t, db, site.ID, upstream.URL)

	assertDraftBackfillResponse(t, response, site.ID)
	assertStoredDraftBackfillUnchanged(t, db, site.ID, runAt)
	assertDraftBackfillRequests(t, requests)
}

func runDraftBackfillTest(t *testing.T, db *gorm.DB, siteID uint, baseURL string) schemas.SiteHealthResponse {
	t.Helper()
	payload := map[string]any{
		"site_id":    siteID,
		"name":       "draft-site",
		"base_url":   baseURL,
		"plugin_key": "yellowpeach-newapi",
		"credentials": map[string]any{
			"username": "draft@example.test",
			"password": "draft-password",
		},
		"plugin_config": map[string]any{},
	}
	data, _ := json.Marshal(payload)
	rec := httptest.NewRecorder()
	(&App{DB: db, PluginManager: plugins.NewManager()}).TestSiteDraft(rec, httptest.NewRequest(http.MethodPost, "/api/sites/test-draft", bytes.NewReader(data)))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var response schemas.SiteHealthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return response
}

func assertDraftBackfillResponse(t *testing.T, response schemas.SiteHealthResponse, siteID uint) {
	t.Helper()
	if !response.LoggedIn || response.SiteID != siteID {
		t.Fatalf("response logged_in/site_id = %v/%d", response.LoggedIn, response.SiteID)
	}
	if got := jsonMapString(response.UpdatedCredentials, "api_key"); got != "sk-draft" {
		t.Fatalf("response api_key = %q, credentials = %#v", got, response.UpdatedCredentials)
	}
	if response.PackageDisplay == nil || !strings.Contains(*response.PackageDisplay, "Draft Plan") {
		got := "<nil>"
		if response.PackageDisplay != nil {
			got = *response.PackageDisplay
		}
		t.Fatalf("response package display = %q", got)
	}
}

func assertStoredDraftBackfillUnchanged(t *testing.T, db *gorm.DB, siteID uint, runAt time.Time) {
	t.Helper()
	var stored models.Site
	if err := db.First(&stored, siteID).Error; err != nil {
		t.Fatalf("reload site: %v", err)
	}
	if stored.BaseURL != "https://stored.example" || stored.PluginKey != "yellowpeach-newapi" {
		t.Fatalf("stored base/plugin mutated = %q/%q", stored.BaseURL, stored.PluginKey)
	}
	if stored.LastStatus == nil || *stored.LastStatus != "success" {
		t.Fatalf("stored last_status = %v", stored.LastStatus)
	}
	if stored.LastMessage == nil || *stored.LastMessage != "stored message" {
		t.Fatalf("stored last_message = %v", stored.LastMessage)
	}
	if stored.LastBalance == nil || *stored.LastBalance != 3.0 {
		t.Fatalf("stored last_balance = %v", stored.LastBalance)
	}
	if stored.LastRunAt == nil || !stored.LastRunAt.Equal(runAt) {
		t.Fatalf("stored last_run_at = %v", stored.LastRunAt)
	}
	if got := jsonMapString(stored.Credentials, "api_key"); got != "sk-stored" {
		t.Fatalf("stored api_key mutated = %q", got)
	}
	if got := jsonMapString(stored.Credentials, "access_token"); got != "stored-access-token" {
		t.Fatalf("stored access_token mutated = %q", got)
	}
	if got := jsonMapString(stored.PluginConfig, "package_display"); got != "Stored Plan" {
		t.Fatalf("stored package_display mutated = %q", got)
	}
	if got := jsonMapString(stored.PluginConfig, "balance_unit"); got != "USD" {
		t.Fatalf("stored balance_unit mutated = %q", got)
	}
}

func assertDraftBackfillRequests(t *testing.T, requests map[string]int) {
	t.Helper()
	if requests["/api/user/login"] != 1 || requests["/api/user/self"] != 1 ||
		requests["/api/subscription/self"] != 1 || requests["/api/token/"] != 1 {
		t.Fatalf("unexpected upstream requests: %#v", requests)
	}
}

func newDraftBackfillDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:sites-draft-test-no-persist?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	if err := db.Create(&models.SystemSetting{ID: 1, RequestTimeout: 5}).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	return db
}

func createStoredDraftBackfillSite(t *testing.T, db *gorm.DB) (models.Site, time.Time) {
	t.Helper()
	lastStatus := "success"
	lastMessage := "stored message"
	lastBalance := 3.0
	runAt := time.Date(2026, 6, 1, 1, 2, 3, 0, time.UTC)
	site := models.Site{
		Name:        "stored-site",
		BaseURL:     "https://stored.example",
		PluginKey:   "yellowpeach-newapi",
		IsEnabled:   true,
		LastStatus:  &lastStatus,
		LastMessage: &lastMessage,
		LastBalance: &lastBalance,
		LastRunAt:   &runAt,
		Credentials: draftStoredCredentials(),
		PluginConfig: models.JSONMap{
			"balance_unit":    "USD",
			"package_display": "Stored Plan",
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}
	return site, runAt
}

func draftStoredCredentials() models.JSONMap {
	return models.JSONMap{
		"username":     "stored@example.test",
		"password":     "stored-password",
		"cookie":       "session=stored",
		"access_token": "stored-access-token",
		"api_key":      "sk-stored",
	}
}

func newDraftBackfillServer() (*httptest.Server, map[string]int) {
	requests := map[string]int{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests[r.URL.Path]++
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/user/login":
			writeDraftLoginResponse(w)
		case "/api/user/self":
			writeDraftSelfResponse(w)
		case "/api/subscription/self":
			writeDraftSubscriptionResponse(w)
		case "/api/token/":
			writeDraftTokenResponse(w)
		default:
			http.NotFound(w, r)
		}
	}))
	return server, requests
}

func writeDraftLoginResponse(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{Name: "session", Value: "draft-session"})
	_ = json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"data": map[string]any{
			"access_token": "draft-access-token",
			"user_id":      77,
		},
	})
}

func writeDraftSelfResponse(w http.ResponseWriter) {
	_ = json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"message": "draft status ok",
		"data": map[string]any{
			"id":      77,
			"email":   "draft@example.test",
			"balance": 42.5,
		},
	})
}

func writeDraftSubscriptionResponse(w http.ResponseWriter) {
	_ = json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"data": map[string]any{
			"subscriptions": []map[string]any{{
				"subscription": map[string]any{
					"plan_name":    "Draft Plan",
					"amount_total": 10,
					"amount_used":  2,
					"status":       "active",
				},
			}},
		},
	})
}

func writeDraftTokenResponse(w http.ResponseWriter) {
	_ = json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"data": map[string]any{
			"items": []map[string]any{{
				"id":     9,
				"name":   "draft-key",
				"key":    "sk-draft",
				"status": "active",
			}},
		},
	})
}

func testGatewayRouteFingerprint(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])[:16]
}

func siteRequestWithID(siteID uint) *http.Request {
	return siteRequestWithIDAndBody(siteID, http.MethodGet, nil)
}

func siteRequestWithIDAndBody(siteID uint, method string, body []byte) *http.Request {
	req := httptest.NewRequest(method, fmt.Sprintf("/api/sites/%d", siteID), bytes.NewReader(body))
	routeContext := chi.NewRouteContext()
	routeContext.URLParams.Add("siteID", fmt.Sprint(siteID))
	return req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, routeContext))
}
