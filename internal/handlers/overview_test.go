package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"ai-sign-in-gateway/internal/models"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestOverviewIncludesDisabledSitesInAttentionList(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:overview-disabled-attention?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	disabled := models.Site{
		Name:      "disabled",
		BaseURL:   "https://disabled.example",
		PluginKey: "http-relay-station",
		IsEnabled: false,
	}
	healthy := models.Site{
		Name:      "healthy",
		BaseURL:   "https://healthy.example",
		PluginKey: "http-relay-station",
		IsEnabled: true,
	}
	if err := db.Create(&disabled).Error; err != nil {
		t.Fatalf("create disabled site: %v", err)
	}
	if err := db.Create(&healthy).Error; err != nil {
		t.Fatalf("create healthy site: %v", err)
	}

	app := &App{DB: db}
	rec := httptest.NewRecorder()
	app.Overview(rec, httptest.NewRequest(http.MethodGet, "/api/overview", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var payload struct {
		SiteCount      int `json:"site_count"`
		EnabledCount   int `json:"enabled_site_count"`
		AttentionSites []struct {
			ID          uint    `json:"id"`
			Name        string  `json:"name"`
			LastStatus  *string `json:"last_status"`
			LastMessage *string `json:"last_message"`
		} `json:"attention_sites"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.SiteCount != 2 || payload.EnabledCount != 1 {
		t.Fatalf("counts = site:%d enabled:%d", payload.SiteCount, payload.EnabledCount)
	}
	if len(payload.AttentionSites) != 1 {
		t.Fatalf("attention site count = %d, body = %s", len(payload.AttentionSites), rec.Body.String())
	}
	item := payload.AttentionSites[0]
	if item.ID != disabled.ID || item.Name != disabled.Name {
		t.Fatalf("attention site = %+v", item)
	}
	if item.LastStatus == nil || *item.LastStatus != "paused" {
		t.Fatalf("attention status = %v", item.LastStatus)
	}
	if item.LastMessage == nil || *item.LastMessage == "" {
		t.Fatalf("attention message = %v", item.LastMessage)
	}
}

func TestOverviewPrioritizesFailedSitesBeforeDisabledSites(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:overview-failed-attention-priority?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	status := "failed"
	old := time.Date(2026, 1, 2, 3, 0, 0, 0, time.UTC)
	recent := old.Add(time.Hour)
	sites := []models.Site{
		{Name: "disabled", BaseURL: "https://disabled.example", PluginKey: "http-relay-station", IsEnabled: false, UpdatedAt: recent},
		{Name: "failed", BaseURL: "https://failed.example", PluginKey: "http-relay-station", IsEnabled: true, LastStatus: &status, UpdatedAt: old},
	}
	if err := db.Create(&sites).Error; err != nil {
		t.Fatalf("create sites: %v", err)
	}

	app := &App{DB: db}
	rec := httptest.NewRecorder()
	app.Overview(rec, httptest.NewRequest(http.MethodGet, "/api/overview", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload struct {
		AttentionSites []struct {
			Name string `json:"name"`
		} `json:"attention_sites"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.AttentionSites) != 2 || payload.AttentionSites[0].Name != "failed" {
		t.Fatalf("attention order = %+v", payload.AttentionSites)
	}
}

func TestOverviewDisabledSiteMessageIncludesPausedReason(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:overview-disabled-message?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	lastStatus := "success"
	lastMessage := "状态接口正常"
	site := models.Site{
		Name:        "disabled",
		BaseURL:     "https://disabled.example",
		PluginKey:   "http-relay-station",
		IsEnabled:   false,
		LastStatus:  &lastStatus,
		LastMessage: &lastMessage,
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	app := &App{DB: db}
	rec := httptest.NewRecorder()
	app.Overview(rec, httptest.NewRequest(http.MethodGet, "/api/overview", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var payload struct {
		AttentionSites []struct {
			LastStatus  *string `json:"last_status"`
			LastMessage *string `json:"last_message"`
		} `json:"attention_sites"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.AttentionSites) != 1 {
		t.Fatalf("attention site count = %d", len(payload.AttentionSites))
	}
	item := payload.AttentionSites[0]
	if item.LastStatus == nil || *item.LastStatus != "paused" {
		t.Fatalf("attention status = %v", item.LastStatus)
	}
	if item.LastMessage == nil || *item.LastMessage != "站点已停用，不参与签到和网关路由。最近状态：状态接口正常" {
		t.Fatalf("attention message = %v", item.LastMessage)
	}
}
