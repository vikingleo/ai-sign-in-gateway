package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"ai-sign-in-gateway/internal/models"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestDuplicateSitesDetectsStoredGroups(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-duplicates-detect?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	older := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	newer := older.Add(time.Hour)
	sites := []models.Site{
		{
			Name: "keep", BaseURL: "HTTPS://Example.COM/", PluginKey: "http-relay-station",
			IsEnabled: true, CreatedAt: older, Credentials: models.JSONMap{"email": "User@Example.com", "password": "pw"},
			PluginConfig: models.JSONMap{"auth_mode": "none"},
		},
		{
			Name: "duplicate", BaseURL: "https://example.com", PluginKey: "http-relay-station",
			IsEnabled: false, CreatedAt: newer, Credentials: models.JSONMap{"email": "user@example.com", "password": "pw"},
			PluginConfig: models.JSONMap{},
		},
		{
			Name: "different-key", BaseURL: "https://example.com", PluginKey: "api-supplier",
			IsEnabled: true, Credentials: models.JSONMap{"api_key": "other-key"},
		},
	}
	if err := db.Create(&sites).Error; err != nil {
		t.Fatalf("create sites: %v", err)
	}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/sites/cleanup-duplicates", nil)
	(&App{DB: db}).ListDuplicateSites(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var groups []duplicateSiteGroup
	if err := json.Unmarshal(rec.Body.Bytes(), &groups); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(groups) != 1 {
		t.Fatalf("groups len = %d, body = %s", len(groups), rec.Body.String())
	}
	group := groups[0]
	if group.PluginKey != "http-relay-station" || group.BaseURL != "https://example.com" || group.Account != "user@example.com" || !group.PasswordPresent {
		t.Fatalf("group = %+v", group)
	}
	if group.SuggestedKeepID != sites[0].ID || len(group.SiteIDs) != 2 || len(group.Sites) != 2 {
		t.Fatalf("unexpected duplicate group = %+v", group)
	}
}

func TestDuplicateSitesKeepsDifferentPluginsSeparate(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-duplicates-plugin-boundary?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	sites := []models.Site{
		{
			Name: "station", BaseURL: "https://example.com", PluginKey: "http-relay-station",
			IsEnabled: true, Credentials: models.JSONMap{"email": "user@example.com", "password": "pw"},
		},
		{
			Name: "sub2api", BaseURL: "https://example.com/", PluginKey: "sub2api-platform",
			IsEnabled: true, Credentials: models.JSONMap{"email": "USER@example.com", "password": "pw"},
		},
	}
	if err := db.Create(&sites).Error; err != nil {
		t.Fatalf("create sites: %v", err)
	}

	groups, err := duplicateSiteGroups(db)
	if err != nil {
		t.Fatalf("duplicate groups: %v", err)
	}
	if len(groups) != 0 {
		t.Fatalf("expected no cross-plugin duplicate groups, got %+v", groups)
	}

	result, err := mergeDuplicateSites(db)
	if err != nil {
		t.Fatalf("merge duplicates: %v", err)
	}
	if result.DeletedSiteCount != 0 || result.MergedGroupCount != 0 {
		t.Fatalf("cross-plugin merge result = %+v", result)
	}
	var siteCount int64
	if err := db.Model(&models.Site{}).Count(&siteCount).Error; err != nil {
		t.Fatalf("count sites: %v", err)
	}
	if siteCount != 2 {
		t.Fatalf("site count after merge = %d", siteCount)
	}
}

func TestDuplicateSitesKeepsSameAccountDifferentPasswordsSeparate(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-duplicates-password-boundary?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	sites := []models.Site{
		{
			Name: "password-a", BaseURL: "https://example.com", PluginKey: "yellowpeach-newapi",
			IsEnabled: true, Credentials: models.JSONMap{"email": "user@example.com", "password": "old-password"},
		},
		{
			Name: "password-b", BaseURL: "https://example.com/", PluginKey: "yellowpeach-newapi",
			IsEnabled: true, Credentials: models.JSONMap{"email": "USER@example.com", "password": "new-password"},
		},
	}
	if err := db.Create(&sites).Error; err != nil {
		t.Fatalf("create sites: %v", err)
	}

	groups, err := duplicateSiteGroups(db)
	if err != nil {
		t.Fatalf("duplicate groups: %v", err)
	}
	if len(groups) != 0 {
		t.Fatalf("password-conflicting accounts were grouped: %+v", groups)
	}

	result, err := mergeDuplicateSites(db)
	if err != nil {
		t.Fatalf("merge duplicates: %v", err)
	}
	if result.DeletedSiteCount != 0 || result.MergedGroupCount != 0 {
		t.Fatalf("password-conflicting merge result = %+v", result)
	}
	var siteCount int64
	if err := db.Model(&models.Site{}).Count(&siteCount).Error; err != nil {
		t.Fatalf("count sites: %v", err)
	}
	if siteCount != 2 {
		t.Fatalf("site count after merge = %d", siteCount)
	}
}

func TestDuplicateSitesKeepsDifferentCredentialOnlyAccountsSeparate(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-duplicates-credential-boundary?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	sites := []models.Site{
		{
			Name: "cookie-a", BaseURL: "https://example.com", PluginKey: "yellowpeach-newapi",
			IsEnabled: true, Credentials: models.JSONMap{"cookie": "session=account-a"},
		},
		{
			Name: "cookie-b", BaseURL: "https://example.com/", PluginKey: "yellowpeach-newapi",
			IsEnabled: true, Credentials: models.JSONMap{"cookie": "session=account-b"},
		},
	}
	if err := db.Create(&sites).Error; err != nil {
		t.Fatalf("create sites: %v", err)
	}

	groups, err := duplicateSiteGroups(db)
	if err != nil {
		t.Fatalf("duplicate groups: %v", err)
	}
	if len(groups) != 0 {
		t.Fatalf("different credential-only accounts were grouped: %+v", groups)
	}

	result, err := mergeDuplicateSites(db)
	if err != nil {
		t.Fatalf("merge duplicates: %v", err)
	}
	if result.DeletedSiteCount != 0 || result.MergedGroupCount != 0 {
		t.Fatalf("credential-only boundary merge result = %+v", result)
	}
	var siteCount int64
	if err := db.Model(&models.Site{}).Count(&siteCount).Error; err != nil {
		t.Fatalf("count sites: %v", err)
	}
	if siteCount != 2 {
		t.Fatalf("site count after merge = %d", siteCount)
	}
}

func TestDuplicateSitesCredentialHashUsesUnambiguousEncoding(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-duplicates-credential-encoding?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	sites := []models.Site{
		{
			Name: "newline-in-cookie", BaseURL: "https://example.com", PluginKey: "yellowpeach-newapi",
			IsEnabled: true, Credentials: models.JSONMap{"cookie": "a\naccess_token=b"},
		},
		{
			Name: "separate-fields", BaseURL: "https://example.com/", PluginKey: "yellowpeach-newapi",
			IsEnabled: true, Credentials: models.JSONMap{"cookie": "a", "access_token": "b"},
		},
	}
	if err := db.Create(&sites).Error; err != nil {
		t.Fatalf("create sites: %v", err)
	}

	groups, err := duplicateSiteGroups(db)
	if err != nil {
		t.Fatalf("duplicate groups: %v", err)
	}
	if len(groups) != 0 {
		t.Fatalf("ambiguous credential encodings were grouped: %+v", groups)
	}

	result, err := mergeDuplicateSites(db)
	if err != nil {
		t.Fatalf("merge duplicates: %v", err)
	}
	if result.DeletedSiteCount != 0 || result.MergedGroupCount != 0 {
		t.Fatalf("ambiguous credential merge result = %+v", result)
	}
}

func TestDuplicateSitesGroupsMatchingCredentialOnlyAccountsByHash(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-duplicates-credential-hash?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	sites := []models.Site{
		{
			Name: "cookie-a", BaseURL: "https://example.com", PluginKey: "yellowpeach-newapi",
			IsEnabled: true, Credentials: models.JSONMap{"cookie": "session=same-account"},
		},
		{
			Name: "cookie-b", BaseURL: "https://example.com/", PluginKey: "yellowpeach-newapi",
			IsEnabled: true, Credentials: models.JSONMap{"cookie": "session=same-account"},
		},
	}
	if err := db.Create(&sites).Error; err != nil {
		t.Fatalf("create sites: %v", err)
	}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/sites/cleanup-duplicates", nil)
	(&App{DB: db}).ListDuplicateSites(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	body := rec.Body.String()
	if strings.Contains(body, "same-account") {
		t.Fatalf("duplicate response exposed raw credential: %s", body)
	}
	var groups []duplicateSiteGroup
	if err := json.Unmarshal([]byte(body), &groups); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(groups) != 1 {
		t.Fatalf("groups len = %d, body = %s", len(groups), body)
	}
	if !strings.HasPrefix(groups[0].Account, "credential:") {
		t.Fatalf("credential-only account marker = %q", groups[0].Account)
	}
}

func TestMergeDuplicateSitesPreservesKeptSyncedAPIKeys(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-duplicates-preserve-keep-api-keys?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	keepKey := "sk-keep-synced"
	duplicateKey := "sk-duplicate-synced"
	keep := models.Site{
		Name:      "keep",
		BaseURL:   "https://example.com",
		PluginKey: "http-relay-station",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"email":    "user@example.com",
			"password": "pw",
			"api_keys": []any{
				map[string]any{"id": "keep-remote", "name": "keep", "key": keepKey, "source": "api", "status": "active", "route_type": "gpt"},
			},
		},
	}
	duplicate := models.Site{
		Name:      "duplicate",
		BaseURL:   "https://example.com/",
		PluginKey: "http-relay-station",
		IsEnabled: false,
		Credentials: models.JSONMap{
			"email":    "USER@example.com",
			"password": "pw",
			"api_keys": []any{
				map[string]any{"id": "duplicate-remote", "name": "duplicate", "key": duplicateKey, "source": "api", "status": "active", "route_type": "codex"},
			},
		},
	}
	if err := db.Create(&keep).Error; err != nil {
		t.Fatalf("create keep site: %v", err)
	}
	if err := db.Create(&duplicate).Error; err != nil {
		t.Fatalf("create duplicate site: %v", err)
	}

	if _, err := mergeDuplicateSites(db); err != nil {
		t.Fatalf("merge duplicates: %v", err)
	}
	var stored models.Site
	if err := db.First(&stored, keep.ID).Error; err != nil {
		t.Fatalf("reload keep site: %v", err)
	}
	keys := apiKeyListFromAny(stored.Credentials["api_keys"])
	if !apiKeyListContainsValue(keys, keepKey) {
		t.Fatalf("kept synced key was dropped: %#v", keys)
	}
	keptEntry, ok := apiKeyEntryByValue(keys, keepKey)
	if !ok {
		t.Fatalf("kept synced key entry missing: %#v", keys)
	}
	if got := strings.TrimSpace(fmt.Sprint(keptEntry["id"])); got != "keep-remote" {
		t.Fatalf("kept key id = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(keptEntry["name"])); got != "keep" {
		t.Fatalf("kept key name = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(keptEntry["source"])); got != "api" {
		t.Fatalf("kept key source = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(keptEntry["status"])); got != "active" {
		t.Fatalf("kept key status = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(keptEntry["route_type"])); got != "gpt" {
		t.Fatalf("kept key route_type = %q", got)
	}
	if !apiKeyListContainsValue(keys, duplicateKey) {
		t.Fatalf("duplicate synced key was not merged: %#v", keys)
	}
	if gatewayRouteCountForFingerprint(t, db, keep.ID, testGatewayRouteFingerprint(keepKey)) != 1 {
		t.Fatalf("kept synced route was not preserved")
	}
	if gatewayRouteCountForFingerprint(t, db, keep.ID, testGatewayRouteFingerprint(duplicateKey)) != 1 {
		t.Fatalf("duplicate synced route was not created")
	}
}

func TestMergeDuplicateSitesKeepsPreferredAPIKeyAttributesForSameKey(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-duplicates-same-key-attributes?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	sharedKey := "sk-shared-synced"
	keep := models.Site{
		Name:      "keep",
		BaseURL:   "https://example.com",
		PluginKey: "http-relay-station",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"email":    "user@example.com",
			"password": "pw",
			"api_keys": []any{
				map[string]any{"id": "keep-remote", "name": "keep", "key": sharedKey, "source": "api", "status": "active", "route_type": "gpt", "route_path": "chat/completions"},
			},
		},
	}
	duplicate := models.Site{
		Name:      "duplicate",
		BaseURL:   "https://example.com/",
		PluginKey: "http-relay-station",
		IsEnabled: false,
		Credentials: models.JSONMap{
			"email":    "USER@example.com",
			"password": "pw",
			"api_keys": []any{
				map[string]any{"id": "duplicate-remote", "name": "duplicate", "key": sharedKey, "source": "manual", "status": "revoked", "route_type": "gpt", "route_path": "chat/completions", "request_base_url": "https://local.example/v1"},
			},
		},
	}
	if err := db.Create(&keep).Error; err != nil {
		t.Fatalf("create keep site: %v", err)
	}
	if err := db.Create(&duplicate).Error; err != nil {
		t.Fatalf("create duplicate site: %v", err)
	}
	duplicateRoute := models.GatewayRouteState{
		SiteID:         duplicate.ID,
		KeyFingerprint: testGatewayRouteFingerprint(sharedKey),
		KeyName:        "claude",
		RouteType:      "claude",
	}
	if err := db.Create(&duplicateRoute).Error; err != nil {
		t.Fatalf("create duplicate route: %v", err)
	}
	group := models.GatewayRouteGroup{Name: "same-key-route-types"}
	if err := db.Create(&group).Error; err != nil {
		t.Fatalf("create route group: %v", err)
	}
	if err := db.Create(&models.GatewayRouteGroupMember{GroupID: group.ID, RouteStateID: duplicateRoute.ID}).Error; err != nil {
		t.Fatalf("create route group member: %v", err)
	}
	if err := db.Create(&models.GatewayRequestLog{
		RouteStateID: &duplicateRoute.ID,
		SiteID:       &duplicate.ID,
		RequestID:    "req-same-key-claude",
		CreatedAt:    time.Now().UTC(),
	}).Error; err != nil {
		t.Fatalf("create request log: %v", err)
	}

	if _, err := mergeDuplicateSites(db); err != nil {
		t.Fatalf("merge duplicates: %v", err)
	}
	var stored models.Site
	if err := db.First(&stored, keep.ID).Error; err != nil {
		t.Fatalf("reload keep site: %v", err)
	}
	keys := apiKeyListFromAny(stored.Credentials["api_keys"])
	if count := apiKeyListValueCount(keys, sharedKey); count != 1 {
		t.Fatalf("shared key count = %d, keys = %#v", count, keys)
	}
	entry, ok := apiKeyEntryByValue(keys, sharedKey)
	if !ok {
		t.Fatalf("shared key entry missing: %#v", keys)
	}
	if got := strings.TrimSpace(fmt.Sprint(entry["id"])); got != "keep-remote" {
		t.Fatalf("shared key id = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(entry["name"])); got != "keep" {
		t.Fatalf("shared key name = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(entry["source"])); got != "api" {
		t.Fatalf("shared key source = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(entry["status"])); got != "active" {
		t.Fatalf("shared key status = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(entry["route_type"])); got != "gpt" {
		t.Fatalf("shared key route_type = %q", got)
	}
	if urls := apiKeyRequestBaseURLValues(entry); len(urls) != 1 || urls[0] != "https://local.example/v1" {
		t.Fatalf("shared key request_base_urls = %#v", urls)
	}
	if gatewayRouteCountForFingerprint(t, db, keep.ID, testGatewayRouteFingerprint(sharedKey)) != 1 {
		t.Fatalf("shared key route count mismatch")
	}
}

func TestMergeDuplicateSitesFallsBackToAPIKeyValueForWeakMetadata(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-duplicates-key-value-fallback?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	sharedKey := "sk-shared-weak-metadata"
	keep := models.Site{
		Name:      "keep",
		BaseURL:   "https://example.com",
		PluginKey: "http-relay-station",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"email":    "user@example.com",
			"password": "pw",
			"api_keys": []any{
				map[string]any{"id": "keep-remote", "name": "keep", "key": sharedKey, "source": "api", "status": "active", "route_type": "gpt"},
			},
		},
	}
	duplicate := models.Site{
		Name:      "duplicate",
		BaseURL:   "https://example.com/",
		PluginKey: "http-relay-station",
		IsEnabled: false,
		Credentials: models.JSONMap{
			"email":    "USER@example.com",
			"password": "pw",
			"api_keys": []any{
				map[string]any{"name": "legacy duplicate", "key": sharedKey},
			},
		},
	}
	if err := db.Create(&keep).Error; err != nil {
		t.Fatalf("create keep site: %v", err)
	}
	if err := db.Create(&duplicate).Error; err != nil {
		t.Fatalf("create duplicate site: %v", err)
	}

	if _, err := mergeDuplicateSites(db); err != nil {
		t.Fatalf("merge duplicates: %v", err)
	}
	var stored models.Site
	if err := db.First(&stored, keep.ID).Error; err != nil {
		t.Fatalf("reload keep site: %v", err)
	}
	keys := apiKeyListFromAny(stored.Credentials["api_keys"])
	if count := apiKeyListValueCount(keys, sharedKey); count != 1 {
		t.Fatalf("shared key count = %d, keys = %#v", count, keys)
	}
	entry, ok := apiKeyEntryByValue(keys, sharedKey)
	if !ok {
		t.Fatalf("shared key entry missing: %#v", keys)
	}
	if got := strings.TrimSpace(fmt.Sprint(entry["id"])); got != "keep-remote" {
		t.Fatalf("shared key id = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(entry["route_type"])); got != "gpt" {
		t.Fatalf("shared key route_type = %q", got)
	}
}

func TestMergeDuplicateSitesPromotesSyncedAPIKeyMetadataForSameKey(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-duplicates-promote-synced-key?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	sharedKey := "sk-shared-promote-metadata"
	keep := models.Site{
		Name:      "keep",
		BaseURL:   "https://example.com",
		PluginKey: "http-relay-station",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"email":    "user@example.com",
			"password": "pw",
			"api_keys": []any{
				map[string]any{"name": "manual keep", "key": sharedKey, "source": "manual", "status": "active", "route_type": "gpt", "request_base_url": "https://local.example/v1"},
			},
		},
	}
	duplicate := models.Site{
		Name:      "duplicate",
		BaseURL:   "https://example.com/",
		PluginKey: "http-relay-station",
		IsEnabled: false,
		Credentials: models.JSONMap{
			"email":    "USER@example.com",
			"password": "pw",
			"api_keys": []any{
				map[string]any{"id": "remote-synced", "name": "synced remote", "key": sharedKey, "source": "api", "status": "limited", "route_type": "gpt"},
			},
		},
	}
	if err := db.Create(&keep).Error; err != nil {
		t.Fatalf("create keep site: %v", err)
	}
	if err := db.Create(&duplicate).Error; err != nil {
		t.Fatalf("create duplicate site: %v", err)
	}

	if _, err := mergeDuplicateSites(db); err != nil {
		t.Fatalf("merge duplicates: %v", err)
	}
	var stored models.Site
	if err := db.First(&stored, keep.ID).Error; err != nil {
		t.Fatalf("reload keep site: %v", err)
	}
	keys := apiKeyListFromAny(stored.Credentials["api_keys"])
	if count := apiKeyListValueCount(keys, sharedKey); count != 1 {
		t.Fatalf("shared key count = %d, keys = %#v", count, keys)
	}
	entry, ok := apiKeyEntryByValue(keys, sharedKey)
	if !ok {
		t.Fatalf("shared key entry missing: %#v", keys)
	}
	if got := strings.TrimSpace(fmt.Sprint(entry["id"])); got != "remote-synced" {
		t.Fatalf("promoted key id = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(entry["name"])); got != "synced remote" {
		t.Fatalf("promoted key name = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(entry["source"])); got != "api" {
		t.Fatalf("promoted key source = %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(entry["status"])); got != "limited" {
		t.Fatalf("promoted key status = %q", got)
	}
	if urls := apiKeyRequestBaseURLValues(entry); len(urls) != 1 || urls[0] != "https://local.example/v1" {
		t.Fatalf("promoted key request_base_urls = %#v", urls)
	}
}

func TestMergeDuplicateSitesKeepsSameKeyWithDifferentRouteTypesSeparate(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-duplicates-same-key-route-types?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	sharedKey := "sk-shared-route-types"
	keep := models.Site{
		Name:      "keep",
		BaseURL:   "https://example.com",
		PluginKey: "http-relay-station",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"email":    "user@example.com",
			"password": "pw",
			"api_keys": []any{
				map[string]any{"id": "remote-gpt", "name": "gpt", "key": sharedKey, "source": "api", "status": "active", "route_type": "gpt"},
			},
		},
	}
	duplicate := models.Site{
		Name:      "duplicate",
		BaseURL:   "https://example.com/",
		PluginKey: "http-relay-station",
		IsEnabled: false,
		Credentials: models.JSONMap{
			"email":    "USER@example.com",
			"password": "pw",
			"api_keys": []any{
				map[string]any{"id": "remote-claude", "name": "claude", "key": sharedKey, "source": "api", "status": "active", "route_type": "claude"},
			},
		},
	}
	if err := db.Create(&keep).Error; err != nil {
		t.Fatalf("create keep site: %v", err)
	}
	if err := db.Create(&duplicate).Error; err != nil {
		t.Fatalf("create duplicate site: %v", err)
	}
	duplicateRoute := models.GatewayRouteState{
		SiteID:         duplicate.ID,
		KeyFingerprint: testGatewayRouteFingerprint(sharedKey),
		KeyName:        "claude",
		RouteType:      "claude",
	}
	if err := db.Create(&duplicateRoute).Error; err != nil {
		t.Fatalf("create duplicate route: %v", err)
	}
	group := models.GatewayRouteGroup{Name: "same-key-route-types"}
	if err := db.Create(&group).Error; err != nil {
		t.Fatalf("create route group: %v", err)
	}
	if err := db.Create(&models.GatewayRouteGroupMember{GroupID: group.ID, RouteStateID: duplicateRoute.ID}).Error; err != nil {
		t.Fatalf("create route group member: %v", err)
	}
	if err := db.Create(&models.GatewayRequestLog{
		RouteStateID: &duplicateRoute.ID,
		SiteID:       &duplicate.ID,
		RequestID:    "req-same-key-claude",
		CreatedAt:    time.Now().UTC(),
	}).Error; err != nil {
		t.Fatalf("create request log: %v", err)
	}

	if _, err := mergeDuplicateSites(db); err != nil {
		t.Fatalf("merge duplicates: %v", err)
	}
	var stored models.Site
	if err := db.First(&stored, keep.ID).Error; err != nil {
		t.Fatalf("reload keep site: %v", err)
	}
	keys := apiKeyListFromAny(stored.Credentials["api_keys"])
	if count := apiKeyListValueCount(keys, sharedKey); count != 2 {
		t.Fatalf("shared key count = %d, keys = %#v", count, keys)
	}
	routeTypes := map[string]bool{}
	for _, key := range keys {
		routeTypes[strings.TrimSpace(fmt.Sprint(key["route_type"]))] = true
	}
	if !routeTypes["gpt"] || !routeTypes["claude"] {
		t.Fatalf("route types = %#v, keys = %#v", routeTypes, keys)
	}
	if gatewayRouteCountForFingerprint(t, db, keep.ID, testGatewayRouteFingerprint(sharedKey)) != 0 {
		t.Fatalf("same key split route kept legacy fingerprint")
	}
	claudeFingerprint := testGatewayRouteFingerprint(sharedKey + "\x00" + testGatewayRouteSignature("claude", "", nil, nil, "", "", "claude"))
	var keepRoute models.GatewayRouteState
	if err := db.Where("site_id = ? AND key_fingerprint = ?", keep.ID, claudeFingerprint).First(&keepRoute).Error; err != nil {
		t.Fatalf("reload merged claude route: %v", err)
	}
	var log models.GatewayRequestLog
	if err := db.Where("request_id = ?", "req-same-key-claude").First(&log).Error; err != nil {
		t.Fatalf("reload request log: %v", err)
	}
	if log.RouteStateID == nil || *log.RouteStateID != keepRoute.ID {
		t.Fatalf("route_state_id = %v, want %d", log.RouteStateID, keepRoute.ID)
	}
	var memberCount int64
	if err := db.Model(&models.GatewayRouteGroupMember{}).Where("group_id = ? AND route_state_id = ?", group.ID, keepRoute.ID).Count(&memberCount).Error; err != nil {
		t.Fatalf("count moved route group member: %v", err)
	}
	if memberCount != 1 {
		t.Fatalf("moved route group members = %d", memberCount)
	}
}

func TestMergeDuplicateSitesReassignsReferencesForNewlyMergedAPIKeyRoute(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-duplicates-new-key-route-map?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	duplicateKey := "sk-duplicate-only-route"
	routeFingerprint := testGatewayRouteFingerprint(duplicateKey)
	keep := models.Site{
		Name:      "keep",
		BaseURL:   "https://example.com",
		PluginKey: "http-relay-station",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"email":    "user@example.com",
			"password": "pw",
		},
	}
	duplicate := models.Site{
		Name:      "duplicate",
		BaseURL:   "https://example.com/",
		PluginKey: "http-relay-station",
		IsEnabled: false,
		Credentials: models.JSONMap{
			"email":    "USER@example.com",
			"password": "pw",
			"api_keys": []any{
				map[string]any{"id": "duplicate-remote", "name": "duplicate", "key": duplicateKey, "source": "api", "status": "active", "route_type": "gpt", "route_path": "chat/completions"},
			},
		},
	}
	if err := db.Create(&keep).Error; err != nil {
		t.Fatalf("create keep site: %v", err)
	}
	if err := db.Create(&duplicate).Error; err != nil {
		t.Fatalf("create duplicate site: %v", err)
	}
	duplicateRoute := models.GatewayRouteState{
		SiteID:         duplicate.ID,
		KeyFingerprint: routeFingerprint,
		KeyName:        "duplicate",
		RouteType:      "gpt",
		RoutePath:      "chat/completions",
	}
	if err := db.Create(&duplicateRoute).Error; err != nil {
		t.Fatalf("create duplicate route: %v", err)
	}
	group := models.GatewayRouteGroup{Name: "duplicate-route-group"}
	if err := db.Create(&group).Error; err != nil {
		t.Fatalf("create route group: %v", err)
	}
	if err := db.Create(&models.GatewayRouteGroupMember{GroupID: group.ID, RouteStateID: duplicateRoute.ID}).Error; err != nil {
		t.Fatalf("create route group member: %v", err)
	}
	if err := db.Create(&models.GatewayRequestLog{
		RouteStateID: &duplicateRoute.ID,
		SiteID:       &duplicate.ID,
		RequestID:    "req-newly-merged-key",
		CreatedAt:    time.Now().UTC(),
	}).Error; err != nil {
		t.Fatalf("create request log: %v", err)
	}

	if _, err := mergeDuplicateSites(db); err != nil {
		t.Fatalf("merge duplicates: %v", err)
	}
	var keepRoute models.GatewayRouteState
	if err := db.Where("site_id = ? AND key_fingerprint = ?", keep.ID, routeFingerprint).First(&keepRoute).Error; err != nil {
		t.Fatalf("reload merged keep route: %v", err)
	}
	var log models.GatewayRequestLog
	if err := db.Where("request_id = ?", "req-newly-merged-key").First(&log).Error; err != nil {
		t.Fatalf("reload request log: %v", err)
	}
	if log.RouteStateID == nil || *log.RouteStateID != keepRoute.ID {
		t.Fatalf("route_state_id = %v, want %d", log.RouteStateID, keepRoute.ID)
	}
	var memberCount int64
	if err := db.Model(&models.GatewayRouteGroupMember{}).Where("group_id = ? AND route_state_id = ?", group.ID, keepRoute.ID).Count(&memberCount).Error; err != nil {
		t.Fatalf("count moved route group member: %v", err)
	}
	if memberCount != 1 {
		t.Fatalf("moved route group members = %d", memberCount)
	}
}

func TestMergeDuplicateSitesKeepsSuggestedAndDeletesDuplicates(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:sites-duplicates-merge?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	apiKey := "sk-duplicate-route"
	routeFingerprint := testGatewayRouteFingerprint(apiKey)
	keep := models.Site{
		Name: "keep", BaseURL: "https://example.com", PluginKey: "http-relay-station", GroupName: "alpha",
		IsEnabled: true, Notes: "keep note", Credentials: models.JSONMap{"email": "user@example.com", "password": "pw", "api_key": apiKey},
		PluginConfig: models.JSONMap{"auth_mode": "none", "gateway_route_type": "codex"},
	}
	duplicate := models.Site{
		Name: "duplicate", BaseURL: "https://example.com/", PluginKey: "http-relay-station", GroupName: "beta",
		IsEnabled: false, Notes: "duplicate note", Credentials: models.JSONMap{"email": "USER@example.com", "password": "pw", "cookie": "sid=1", "api_key": apiKey},
		PluginConfig: models.JSONMap{"status_path": "/status", "gateway_route_type": "codex"},
	}
	if err := db.Create(&keep).Error; err != nil {
		t.Fatalf("create keep site: %v", err)
	}
	if err := db.Create(&duplicate).Error; err != nil {
		t.Fatalf("create duplicate site: %v", err)
	}
	keepRoute := models.GatewayRouteState{SiteID: keep.ID, KeyFingerprint: routeFingerprint, KeyName: "keep", RouteType: "codex", RoutePath: "responses"}
	if err := db.Create(&keepRoute).Error; err != nil {
		t.Fatalf("create keep route: %v", err)
	}
	keepMismatchedRoute := models.GatewayRouteState{SiteID: keep.ID, KeyFingerprint: "fp-mismatched", KeyName: "keep-mismatched", RouteType: "codex", RoutePath: "responses"}
	if err := db.Create(&keepMismatchedRoute).Error; err != nil {
		t.Fatalf("create keep mismatched route: %v", err)
	}
	route := models.GatewayRouteState{SiteID: duplicate.ID, KeyFingerprint: routeFingerprint, KeyName: "duplicate", RouteType: "codex", RoutePath: "responses"}
	if err := db.Create(&route).Error; err != nil {
		t.Fatalf("create route: %v", err)
	}
	mismatchedRoute := models.GatewayRouteState{SiteID: duplicate.ID, KeyFingerprint: "fp-mismatched", KeyName: "mismatched", RouteType: "gpt", RoutePath: "chat/completions"}
	if err := db.Create(&mismatchedRoute).Error; err != nil {
		t.Fatalf("create mismatched route: %v", err)
	}
	unmappedRoute := models.GatewayRouteState{SiteID: duplicate.ID, KeyFingerprint: "fp-unmapped", KeyName: "unmapped"}
	if err := db.Create(&unmappedRoute).Error; err != nil {
		t.Fatalf("create unmapped route: %v", err)
	}
	group := models.GatewayRouteGroup{Name: "routes"}
	if err := db.Create(&group).Error; err != nil {
		t.Fatalf("create route group: %v", err)
	}
	member := models.GatewayRouteGroupMember{GroupID: group.ID, RouteStateID: route.ID}
	if err := db.Create(&member).Error; err != nil {
		t.Fatalf("create route group member: %v", err)
	}
	if err := db.Create(&models.SiteQueueTask{SiteID: duplicate.ID, TaskKey: "todo", Title: "Todo"}).Error; err != nil {
		t.Fatalf("create queue task: %v", err)
	}
	if err := db.Create(&models.CheckinRun{
		SiteID:    &duplicate.ID,
		Status:    "success",
		StartedAt: time.Now().UTC(),
	}).Error; err != nil {
		t.Fatalf("create checkin run: %v", err)
	}
	if err := db.Create(&models.GatewayRequestLog{
		RouteStateID: &route.ID,
		SiteID:       &duplicate.ID,
		RequestID:    "req-duplicate",
		CreatedAt:    time.Now().UTC(),
	}).Error; err != nil {
		t.Fatalf("create request log: %v", err)
	}
	if err := db.Create(&models.GatewayRequestLog{
		RouteStateID: &mismatchedRoute.ID,
		SiteID:       &duplicate.ID,
		RequestID:    "req-mismatched",
		CreatedAt:    time.Now().UTC(),
	}).Error; err != nil {
		t.Fatalf("create mismatched request log: %v", err)
	}
	if err := db.Create(&models.GatewayRequestLog{
		RouteStateID: &unmappedRoute.ID,
		SiteID:       &duplicate.ID,
		RequestID:    "req-unmapped",
		CreatedAt:    time.Now().UTC(),
	}).Error; err != nil {
		t.Fatalf("create unmapped request log: %v", err)
	}
	if err := db.Create(&models.ChatSession{
		SiteID: &duplicate.ID,
		Title:  "duplicate session",
	}).Error; err != nil {
		t.Fatalf("create chat session: %v", err)
	}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/sites/cleanup-duplicates/merge", nil)
	(&App{DB: db}).MergeDuplicateSites(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var result duplicateSiteMergeResult
	if err := json.Unmarshal(rec.Body.Bytes(), &result); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if result.MergedGroupCount != 1 || result.DeletedSiteCount != 1 || result.RemainingGroupCount != 0 {
		t.Fatalf("result = %+v", result)
	}
	if len(result.KeptSiteIDs) != 1 || result.KeptSiteIDs[0] != keep.ID || len(result.DeletedSiteIDs) != 1 || result.DeletedSiteIDs[0] != duplicate.ID {
		t.Fatalf("ids = %+v", result)
	}

	var stored models.Site
	if err := db.First(&stored, keep.ID).Error; err != nil {
		t.Fatalf("reload keep site: %v", err)
	}
	if got := jsonMapString(stored.Credentials, "cookie"); got != "sid=1" {
		t.Fatalf("merged cookie = %q", got)
	}
	if got := jsonMapString(stored.PluginConfig, "status_path"); got != "/status" {
		t.Fatalf("merged status_path = %q", got)
	}
	if !strings.Contains(stored.GroupName, "alpha") || !strings.Contains(stored.GroupName, "beta") {
		t.Fatalf("group name = %q", stored.GroupName)
	}
	if !strings.Contains(stored.Notes, "keep note") || !strings.Contains(stored.Notes, "duplicate note") {
		t.Fatalf("notes = %q", stored.Notes)
	}

	var duplicateCount int64
	if err := db.Model(&models.Site{}).Where("id = ?", duplicate.ID).Count(&duplicateCount).Error; err != nil {
		t.Fatalf("count duplicate site: %v", err)
	}
	if duplicateCount != 0 {
		t.Fatalf("duplicate site count = %d", duplicateCount)
	}
	var leftoverCount int64
	if err := db.Model(&models.GatewayRouteGroupMember{}).Where("route_state_id = ?", route.ID).Count(&leftoverCount).Error; err != nil {
		t.Fatalf("count route group members: %v", err)
	}
	if leftoverCount != 0 {
		t.Fatalf("leftover route group members = %d", leftoverCount)
	}
	if err := db.Model(&models.GatewayRouteGroupMember{}).Where("group_id = ? AND route_state_id = ?", group.ID, keepRoute.ID).Count(&leftoverCount).Error; err != nil {
		t.Fatalf("count moved route group members: %v", err)
	}
	if leftoverCount != 1 {
		t.Fatalf("moved route group members = %d", leftoverCount)
	}
	if err := db.Model(&models.SiteQueueTask{}).Where("site_id = ?", duplicate.ID).Count(&leftoverCount).Error; err != nil {
		t.Fatalf("count queue tasks: %v", err)
	}
	if leftoverCount != 0 {
		t.Fatalf("leftover queue tasks = %d", leftoverCount)
	}
	if err := db.Model(&models.CheckinRun{}).Where("site_id = ?", duplicate.ID).Count(&leftoverCount).Error; err != nil {
		t.Fatalf("count checkin runs: %v", err)
	}
	if leftoverCount != 0 {
		t.Fatalf("leftover checkin runs = %d", leftoverCount)
	}
	if err := db.Model(&models.CheckinRun{}).Where("site_id = ?", keep.ID).Count(&leftoverCount).Error; err != nil {
		t.Fatalf("count reassigned checkin runs: %v", err)
	}
	if leftoverCount != 1 {
		t.Fatalf("reassigned checkin runs = %d", leftoverCount)
	}
	if err := db.Model(&models.GatewayRequestLog{}).Where("site_id = ?", duplicate.ID).Count(&leftoverCount).Error; err != nil {
		t.Fatalf("count request logs: %v", err)
	}
	if leftoverCount != 0 {
		t.Fatalf("leftover request logs = %d", leftoverCount)
	}
	if err := db.Model(&models.GatewayRequestLog{}).Where("site_id = ?", keep.ID).Count(&leftoverCount).Error; err != nil {
		t.Fatalf("count reassigned request logs: %v", err)
	}
	if leftoverCount != 3 {
		t.Fatalf("reassigned request logs = %d", leftoverCount)
	}
	var storedLog models.GatewayRequestLog
	if err := db.Where("request_id = ?", "req-duplicate").First(&storedLog).Error; err != nil {
		t.Fatalf("reload request log: %v", err)
	}
	if storedLog.RouteStateID == nil || *storedLog.RouteStateID != keepRoute.ID {
		t.Fatalf("reassigned route_state_id = %v, want %d", storedLog.RouteStateID, keepRoute.ID)
	}
	var mismatchedLog models.GatewayRequestLog
	if err := db.Where("request_id = ?", "req-mismatched").First(&mismatchedLog).Error; err != nil {
		t.Fatalf("reload mismatched request log: %v", err)
	}
	if mismatchedLog.RouteStateID != nil {
		t.Fatalf("mismatched route_state_id = %v, want nil", *mismatchedLog.RouteStateID)
	}
	var unmappedLog models.GatewayRequestLog
	if err := db.Where("request_id = ?", "req-unmapped").First(&unmappedLog).Error; err != nil {
		t.Fatalf("reload unmapped request log: %v", err)
	}
	if unmappedLog.RouteStateID != nil {
		t.Fatalf("unmapped route_state_id = %v, want nil", *unmappedLog.RouteStateID)
	}
	var sessionCount int64
	if err := db.Model(&models.ChatSession{}).Where("site_id = ?", duplicate.ID).Count(&sessionCount).Error; err != nil {
		t.Fatalf("count chat sessions: %v", err)
	}
	if sessionCount != 0 {
		t.Fatalf("leftover chat sessions = %d", sessionCount)
	}
	if err := db.Model(&models.ChatSession{}).Where("site_id = ?", keep.ID).Count(&sessionCount).Error; err != nil {
		t.Fatalf("count reassigned chat sessions: %v", err)
	}
	if sessionCount != 1 {
		t.Fatalf("reassigned chat sessions = %d", sessionCount)
	}
}

func TestReassignDuplicateRouteLogReferencesChunksLargeRouteMaps(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:duplicate-route-log-chunks?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	routeIDMap := map[uint]uint{}
	for index := 0; index < duplicateMergeReferenceBatchSize+25; index++ {
		fingerprint := fmt.Sprintf("fp-%03d", index)
		kept := models.GatewayRouteState{SiteID: 1, KeyFingerprint: fingerprint}
		removed := models.GatewayRouteState{SiteID: 2, KeyFingerprint: fingerprint}
		if err := db.Create(&kept).Error; err != nil {
			t.Fatalf("create kept route: %v", err)
		}
		if err := db.Create(&removed).Error; err != nil {
			t.Fatalf("create removed route: %v", err)
		}
		routeIDMap[removed.ID] = kept.ID
		siteID := uint(2)
		if err := db.Create(&models.GatewayRequestLog{
			RouteStateID: &removed.ID,
			SiteID:       &siteID,
			RequestID:    fmt.Sprintf("req-%03d", index),
			CreatedAt:    time.Now().UTC(),
		}).Error; err != nil {
			t.Fatalf("create request log: %v", err)
		}
	}

	if err := db.Transaction(func(tx *gorm.DB) error {
		return reassignDuplicateRouteLogReferences(tx, routeIDMap)
	}); err != nil {
		t.Fatalf("reassign route references: %v", err)
	}
	var staleCount int64
	if err := db.Model(&models.GatewayRequestLog{}).
		Where("route_state_id IN ?", sortedUintKeys(routeIDMap)).
		Count(&staleCount).Error; err != nil {
		t.Fatalf("count stale references: %v", err)
	}
	if staleCount != 0 {
		t.Fatalf("stale removed route references = %d", staleCount)
	}
	var movedCount int64
	if err := db.Model(&models.GatewayRequestLog{}).
		Where("route_state_id IN ?", sortedUintKeys(invertUintMap(routeIDMap))).
		Count(&movedCount).Error; err != nil {
		t.Fatalf("count moved references: %v", err)
	}
	if movedCount != int64(len(routeIDMap)) {
		t.Fatalf("moved references = %d, want %d", movedCount, len(routeIDMap))
	}
}

func invertUintMap(values map[uint]uint) map[uint]uint {
	out := make(map[uint]uint, len(values))
	for key, value := range values {
		out[value] = key
	}
	return out
}

func apiKeyListContainsValue(keys []map[string]any, value string) bool {
	_, ok := apiKeyEntryByValue(keys, value)
	return ok
}

func apiKeyEntryByValue(keys []map[string]any, value string) (map[string]any, bool) {
	for _, key := range keys {
		if strings.TrimSpace(fmt.Sprint(key["key"])) == value {
			return key, true
		}
	}
	return nil, false
}

func apiKeyListValueCount(keys []map[string]any, value string) int {
	count := 0
	for _, key := range keys {
		if strings.TrimSpace(fmt.Sprint(key["key"])) == value {
			count++
		}
	}
	return count
}

func testGatewayRouteSignature(routeType, routePath string, supportedModels []string, requestBaseURLs []string, imageGenPath, imageEditPath, keyName string) string {
	return strings.Join([]string{
		routeType,
		routePath,
		strings.Join(supportedModels, ","),
		strings.Join(requestBaseURLs, ","),
		imageGenPath,
		imageEditPath,
		keyName,
	}, "\x00")
}

func gatewayRouteCountForFingerprint(t *testing.T, db *gorm.DB, siteID uint, fingerprint string) int64 {
	t.Helper()
	var count int64
	if err := db.Model(&models.GatewayRouteState{}).
		Where("site_id = ? AND key_fingerprint = ?", siteID, fingerprint).
		Count(&count).Error; err != nil {
		t.Fatalf("count gateway routes: %v", err)
	}
	return count
}
