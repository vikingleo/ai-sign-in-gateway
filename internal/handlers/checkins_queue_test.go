package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"ai-sign-in-gateway/internal/models"
	"github.com/glebarez/sqlite"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func TestSiteQueueListsStoredTasks(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:site-queue-list?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{Name: "queue", BaseURL: "https://example.com", PluginKey: "http-relay-station", IsEnabled: true}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}
	if err := db.Create(&[]models.SiteQueueTask{
		{SiteID: site.ID, TaskKey: "second", Title: "Second", Status: "pending", SortOrder: 20, ActionKey: "open", ActionLabel: "Open"},
		{SiteID: site.ID, TaskKey: "first", Title: "First", Detail: "Need action", Status: "", SortOrder: 10},
	}).Error; err != nil {
		t.Fatalf("create tasks: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/sites/%d/queue", site.ID), nil)
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("siteID", fmt.Sprint(site.ID))
	req = contextWithRoute(req, routeCtx)
	rec := httptest.NewRecorder()
	(&App{DB: db}).SiteQueue(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload) != 2 || payload[0]["task_key"] != "first" || payload[1]["task_key"] != "second" {
		t.Fatalf("unexpected queue order: %s", rec.Body.String())
	}
	if payload[0]["status"] != "pending" || payload[0]["detail"] != "Need action" {
		t.Fatalf("unexpected first task: %#v", payload[0])
	}
}

func TestActivateQueueTaskUpdatesExistingTask(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:site-queue-activate?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{Name: "queue", BaseURL: "https://example.com", PluginKey: "http-relay-station", IsEnabled: true}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}
	lastError := "pending error"
	task := models.SiteQueueTask{
		SiteID: site.ID, TaskKey: "verify", Title: "Verify", Status: "pending", LastError: &lastError,
	}
	if err := db.Create(&task).Error; err != nil {
		t.Fatalf("create task: %v", err)
	}

	body := bytes.NewReader([]byte(`{"message":"manual done"}`))
	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/sites/%d/queue/verify/activate", site.ID), body)
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("siteID", fmt.Sprint(site.ID))
	routeCtx.URLParams.Add("taskKey", "verify")
	req = contextWithRoute(req, routeCtx)
	rec := httptest.NewRecorder()
	(&App{DB: db}).ActivateQueueTask(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["status"] != "done" || payload["last_message"] != "manual done" || payload["last_error"] != nil {
		t.Fatalf("unexpected response: %#v", payload)
	}

	var stored models.SiteQueueTask
	if err := db.First(&stored, task.ID).Error; err != nil {
		t.Fatalf("reload task: %v", err)
	}
	if stored.Status != "done" || stored.LastMessage == nil || *stored.LastMessage != "manual done" || stored.LastError != nil || stored.CompletedAt == nil {
		t.Fatalf("stored task = %+v", stored)
	}
}

func TestActivateQueueTaskRejectsMissingTask(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:site-queue-missing?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{Name: "queue", BaseURL: "https://example.com", PluginKey: "http-relay-station", IsEnabled: true}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/sites/%d/queue/missing/activate", site.ID), nil)
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("siteID", fmt.Sprint(site.ID))
	routeCtx.URLParams.Add("taskKey", "missing")
	req = contextWithRoute(req, routeCtx)
	rec := httptest.NewRecorder()
	(&App{DB: db}).ActivateQueueTask(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestActivateQueueTaskRejectsMalformedJSONWithoutUpdatingTask(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:site-queue-malformed-json?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{Name: "queue", BaseURL: "https://example.com", PluginKey: "http-relay-station", IsEnabled: true}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}
	task := models.SiteQueueTask{SiteID: site.ID, TaskKey: "verify", Title: "Verify", Status: "pending"}
	if err := db.Create(&task).Error; err != nil {
		t.Fatalf("create task: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/sites/%d/queue/verify/activate", site.ID), bytes.NewReader([]byte(`{"message":`)))
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("siteID", fmt.Sprint(site.ID))
	routeCtx.URLParams.Add("taskKey", "verify")
	req = contextWithRoute(req, routeCtx)
	rec := httptest.NewRecorder()
	(&App{DB: db}).ActivateQueueTask(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var stored models.SiteQueueTask
	if err := db.First(&stored, task.ID).Error; err != nil {
		t.Fatalf("reload task: %v", err)
	}
	if stored.Status != "pending" || stored.CompletedAt != nil || stored.LastMessage != nil {
		t.Fatalf("stored task changed after malformed JSON: %+v", stored)
	}
}
