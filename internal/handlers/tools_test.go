package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"unicode/utf8"

	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/schemas"
	"github.com/glebarez/sqlite"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func TestShortenChatSessionTextUsesASCIISuffixAndKeepsUTF8(t *testing.T) {
	if got := shortenChatSessionText("abcdef", 5); got != "ab..." {
		t.Fatalf("ascii shortened text = %q", got)
	}
	if got := shortenChatSessionText("你好世界消息", 5); got != "你好..." {
		t.Fatalf("unicode shortened text = %q", got)
	}
	if got := shortenChatSessionText("你好世界消息", 2); got != "你好" {
		t.Fatalf("small limit unicode text = %q", got)
	}
	if got := shortenChatSessionText("你好世界消息", 5); !utf8.ValidString(got) {
		t.Fatalf("shortened text is invalid utf8: %q", got)
	}
}

func TestModelListLoadsModelsFromSiteRequestURL(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/models" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer model-key" {
			t.Fatalf("Authorization = %q", got)
		}
		if got := r.Header.Get("x-api-key"); got != "model-key" {
			t.Fatalf("x-api-key = %q", got)
		}
		if got := r.Header.Get("x-goog-api-key"); got != "model-key" {
			t.Fatalf("x-goog-api-key = %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"id":"gpt-4o-mini"},{"id":"gpt-image-2"}]}`))
	}))
	defer upstream.Close()

	db, err := gorm.Open(sqlite.Open("file:tools-model-list?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{
		Name:      "models",
		BaseURL:   "https://panel.example",
		PluginKey: "api-supplier",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"api_key": "model-key",
		},
		PluginConfig: models.JSONMap{
			"api_request_urls": []any{upstream.URL},
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	body, _ := json.Marshal(map[string]any{"site_id": site.ID})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/tools/models", bytes.NewReader(body))
	(&App{DB: db}).ModelList(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["ok"] != true {
		t.Fatalf("ok = %v, body = %s", payload["ok"], rec.Body.String())
	}
	items, _ := payload["items"].([]any)
	if len(items) != 2 {
		t.Fatalf("items len = %d, body = %s", len(items), rec.Body.String())
	}
	second, _ := items[1].(map[string]any)
	if second["id"] != "gpt-image-2" || second["mode"] != "image" {
		t.Fatalf("unexpected image model item: %#v", second)
	}
}

func TestModelListExplainsUpstream404(t *testing.T) {
	upstream := httptest.NewServer(http.NotFoundHandler())
	defer upstream.Close()

	db, err := gorm.Open(sqlite.Open("file:tools-model-list-404?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{
		Name:      "models-404",
		BaseURL:   upstream.URL,
		PluginKey: "api-supplier",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"api_key": "model-key",
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	body, _ := json.Marshal(map[string]any{"site_id": site.ID})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/tools/models", bytes.NewReader(body))
	(&App{DB: db}).ModelList(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["ok"] == true {
		t.Fatalf("ok = true, body = %s", rec.Body.String())
	}
	if !strings.Contains(strings.TrimSpace(payload["message"].(string)), "API 请求 URL") {
		t.Fatalf("message = %v", payload["message"])
	}
}

func TestModelListExplainsMissingUpstreamAPIKey(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/models" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"code":"API_KEY_REQUIRED","message":"API key is required"}`))
			return
		}
		if got := r.Header.Get("Authorization"); got != "Bearer model-key" {
			t.Fatalf("Authorization = %q", got)
		}
		if got := r.Header.Get("x-api-key"); got != "model-key" {
			t.Fatalf("x-api-key = %q", got)
		}
		if got := r.Header.Get("x-goog-api-key"); got != "model-key" {
			t.Fatalf("x-goog-api-key = %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"code":"INVALID_API_KEY","message":"Invalid API key"}`))
	}))
	defer upstream.Close()

	db, err := gorm.Open(sqlite.Open("file:tools-model-list-auth-missing-key?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{
		Name:      "otokapi-like",
		BaseURL:   "https://panel.example",
		PluginKey: "api-supplier",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"api_key": "model-key",
		},
		PluginConfig: models.JSONMap{
			"api_request_urls": []any{upstream.URL + "/v1"},
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	body, _ := json.Marshal(map[string]any{"site_id": site.ID})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/tools/models", bytes.NewReader(body))
	(&App{DB: db}).ModelList(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["ok"] == true {
		t.Fatalf("ok = true, body = %s", rec.Body.String())
	}
	message := strings.TrimSpace(payload["message"].(string))
	if strings.Contains(message, "API_KEY_REQUIRED") {
		t.Fatalf("request did not send Authorization header: %s", message)
	}
	if !strings.Contains(message, "INVALID_API_KEY") {
		t.Fatalf("message = %v", payload["message"])
	}
}

func TestModelListKeepsAuthFailureBeforeFallbackURLFailure(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/models" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"code":"INVALID_API_KEY","message":"Invalid API key"}`))
	}))
	defer upstream.Close()

	db, err := gorm.Open(sqlite.Open("file:tools-model-list-auth-fallback?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{
		Name:      "auth-fallback",
		BaseURL:   "https://panel.invalid",
		PluginKey: "api-supplier",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"api_key": "model-key",
		},
		PluginConfig: models.JSONMap{
			"api_request_urls": upstream.URL + "/v1",
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	body, _ := json.Marshal(map[string]any{"site_id": site.ID})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/tools/models", bytes.NewReader(body))
	(&App{DB: db}).ModelList(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	message := strings.TrimSpace(payload["message"].(string))
	if !strings.Contains(message, "INVALID_API_KEY") {
		t.Fatalf("message = %v", payload["message"])
	}
	if strings.Contains(message, "panel.invalid") {
		t.Fatalf("auth failure was overwritten by fallback URL failure: %s", message)
	}
}

func TestChatImageGenerationMatchesGPTImageContract(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s", r.Method)
		}
		if r.URL.Path != "/v1/images/generations" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer image-key" {
			t.Fatalf("Authorization = %q", got)
		}
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode upstream body: %v", err)
		}
		if payload["model"] != "gpt-image-2" || payload["prompt"] != "paint a fox" || payload["size"] != "1024x1024" {
			t.Fatalf("unexpected body = %#v", payload)
		}
		if payload["n"] != float64(1) || payload["quality"] != "auto" {
			t.Fatalf("missing gpt-image defaults: %#v", payload)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"url":"https://cdn.example/image.png","revised_prompt":"paint a fox cleanly"}]}`))
	}))
	defer upstream.Close()

	body, _ := json.Marshal(map[string]any{
		"base_url":   upstream.URL,
		"api_key":    "image-key",
		"model":      "gpt-image-2",
		"mode":       "image",
		"prompt":     "paint a fox",
		"image_size": "1024x1024",
	})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/tools/chat-test", bytes.NewReader(body))
	(&App{}).ChatTest(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var response struct {
		OK            bool                         `json:"ok"`
		Images        []schemasChatTestImageOutput `json:"images"`
		RevisedPrompt string                       `json:"revised_prompt"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !response.OK || len(response.Images) != 1 || response.Images[0].URL != "https://cdn.example/image.png" || response.RevisedPrompt != "paint a fox cleanly" {
		t.Fatalf("response = %+v body = %s", response, rec.Body.String())
	}
}

func TestChatTestCodexRouteUsesResponsesContract(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s", r.Method)
		}
		if r.URL.Path != "/v1/responses" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer codex-key" {
			t.Fatalf("Authorization = %q", got)
		}
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode upstream body: %v", err)
		}
		if payload["model"] != "gpt-5.5" {
			t.Fatalf("model = %#v", payload["model"])
		}
		if _, ok := payload["messages"]; ok {
			t.Fatalf("responses payload contains chat messages: %#v", payload)
		}
		if _, ok := payload["input"]; !ok {
			t.Fatalf("responses payload missing input: %#v", payload)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"output_text":"response ok"}`))
	}))
	defer upstream.Close()

	body, _ := json.Marshal(map[string]any{
		"base_url":   upstream.URL,
		"api_key":    "codex-key",
		"route_type": "codex",
		"model":      "gpt-5.5",
		"mode":       "chat",
		"prompt":     "ping",
	})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/tools/chat-test", bytes.NewReader(body))
	(&App{}).ChatTest(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var response struct {
		OK     bool   `json:"ok"`
		Output string `json:"output"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !response.OK || response.Output != "response ok" {
		t.Fatalf("response = %+v body = %s", response, rec.Body.String())
	}
}

func TestChatImageEditUsesRepeatedImageMultipartField(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s", r.Method)
		}
		if r.URL.Path != "/v1/images/edits" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if err := r.ParseMultipartForm(16 << 20); err != nil {
			t.Fatalf("parse multipart: %v", err)
		}
		if got := r.MultipartForm.Value["model"]; len(got) != 1 || got[0] != "gpt-image-2" {
			t.Fatalf("model field = %#v", got)
		}
		if got := r.MultipartForm.Value["prompt"]; len(got) != 1 || got[0] != "merge references" {
			t.Fatalf("prompt field = %#v", got)
		}
		if got := r.MultipartForm.Value["size"]; len(got) != 1 || got[0] != "auto" {
			t.Fatalf("size field = %#v", got)
		}
		if got := r.MultipartForm.Value["n"]; len(got) != 1 || got[0] != "1" {
			t.Fatalf("n field = %#v", got)
		}
		if got := r.MultipartForm.Value["quality"]; len(got) != 1 || got[0] != "auto" {
			t.Fatalf("quality field = %#v", got)
		}
		if got := r.MultipartForm.File["image[]"]; len(got) != 0 {
			t.Fatalf("unexpected image[] field files = %d", len(got))
		}
		if got := r.MultipartForm.File["image"]; len(got) != 2 {
			t.Fatalf("image field files = %d", len(got))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"url":"https://cdn.example/edit.png"}]}`))
	}))
	defer upstream.Close()

	body, _ := json.Marshal(map[string]any{
		"base_url":   upstream.URL,
		"api_key":    "image-key",
		"model":      "gpt-image-2",
		"mode":       "image",
		"prompt":     "merge references",
		"image_size": "auto",
		"reference_images": []map[string]any{
			{"name": "ref1.png", "url": "data:image/png;base64,aGVsbG8="},
			{"name": "ref2.png", "url": "data:image/png;base64,d29ybGQ="},
		},
	})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/tools/chat-test", bytes.NewReader(body))
	(&App{}).ChatTest(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var response struct {
		OK     bool                         `json:"ok"`
		Images []schemasChatTestImageOutput `json:"images"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !response.OK || len(response.Images) != 1 || response.Images[0].URL != "https://cdn.example/edit.png" {
		t.Fatalf("response = %+v body = %s", response, rec.Body.String())
	}
}

func TestChatImageGenerationUsesSiteConfiguredPath(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/custom/images/create" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode upstream body: %v", err)
		}
		if payload["prompt"] != "site path prompt" {
			t.Fatalf("body = %#v", payload)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"url":"https://cdn.example/custom.png"}]}`))
	}))
	defer upstream.Close()

	db, err := gorm.Open(sqlite.Open("file:tools-chat-image-custom-generation-path?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{
		Name:      "custom image paths",
		BaseURL:   "https://panel.example",
		PluginKey: "api-supplier",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"api_key": "image-key",
		},
		PluginConfig: models.JSONMap{
			"api_request_urls":      []any{upstream.URL},
			"image_generation_path": "/custom/images/create",
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	body, _ := json.Marshal(map[string]any{
		"site_id":    site.ID,
		"model":      "gpt-image-2",
		"mode":       "image",
		"prompt":     "site path prompt",
		"image_size": "1024x1024",
	})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/tools/chat-test", bytes.NewReader(body))
	(&App{DB: db}).ChatTest(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var response struct {
		OK     bool                         `json:"ok"`
		Images []schemasChatTestImageOutput `json:"images"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !response.OK || len(response.Images) != 1 || response.Images[0].URL != "https://cdn.example/custom.png" {
		t.Fatalf("response = %+v body = %s", response, rec.Body.String())
	}
}

func TestChatImageEditUsesSiteConfiguredPath(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/custom/images/edit" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if err := r.ParseMultipartForm(16 << 20); err != nil {
			t.Fatalf("parse multipart: %v", err)
		}
		if got := r.MultipartForm.File["image"]; len(got) != 1 {
			t.Fatalf("image field files = %d", len(got))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"url":"https://cdn.example/custom-edit.png"}]}`))
	}))
	defer upstream.Close()

	db, err := gorm.Open(sqlite.Open("file:tools-chat-image-custom-edit-path?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{
		Name:      "custom image edit path",
		BaseURL:   "https://panel.example",
		PluginKey: "api-supplier",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"api_key": "image-key",
		},
		PluginConfig: models.JSONMap{
			"api_request_urls": []any{upstream.URL},
			"image_edit_path":  "/custom/images/edit",
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	body, _ := json.Marshal(map[string]any{
		"site_id":    site.ID,
		"model":      "gpt-image-2",
		"mode":       "image",
		"prompt":     "edit with site path",
		"image_size": "1024x1024",
		"reference_images": []map[string]any{
			{"name": "ref.png", "url": "data:image/png;base64,aGVsbG8="},
		},
	})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/tools/chat-test", bytes.NewReader(body))
	(&App{DB: db}).ChatTest(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var response struct {
		OK     bool                         `json:"ok"`
		Images []schemasChatTestImageOutput `json:"images"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !response.OK || len(response.Images) != 1 || response.Images[0].URL != "https://cdn.example/custom-edit.png" {
		t.Fatalf("response = %+v body = %s", response, rec.Body.String())
	}
}

type schemasChatTestImageOutput struct {
	URL     string `json:"url"`
	B64JSON string `json:"b64_json"`
}

func TestToolModelCandidatesAllowSameKeyDifferentURLs(t *testing.T) {
	gpt := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer shared-key" {
			t.Fatalf("gpt Authorization = %q", got)
		}
		_, _ = w.Write([]byte(`{"data":[{"id":"gpt-5.5"}]}`))
	}))
	defer gpt.Close()

	claude := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer shared-key" {
			t.Fatalf("claude Authorization = %q", got)
		}
		_, _ = w.Write([]byte(`{"data":[{"id":"claude-3-7-sonnet"}]}`))
	}))
	defer claude.Close()

	db, err := gorm.Open(sqlite.Open("file:tools-same-key-different-urls?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{
		Name:      "same key tool models",
		BaseURL:   "https://panel.example",
		PluginKey: "api-supplier",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"api_keys": []any{
				map[string]any{"name": "shared-gpt", "key": "shared-key", "status": "active", "route_type": "gpt", "request_base_urls": []any{gpt.URL}},
				map[string]any{"name": "shared-claude", "key": "shared-key", "status": "active", "route_type": "claude", "request_base_urls": []any{claude.URL}},
			},
		},
		PluginConfig: models.JSONMap{"api_format": "openai"},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}

	body, _ := json.Marshal(map[string]any{"site_id": site.ID})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/tools/models", bytes.NewReader(body))
	(&App{DB: db}).ModelList(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Items []schemas.ModelListItem `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(response.Items) != 2 {
		t.Fatalf("items = %+v body = %s", response.Items, rec.Body.String())
	}
	seen := map[string]schemas.ModelListItem{}
	for _, item := range response.Items {
		seen[item.ID] = item
	}
	if seen["gpt-5.5"].RouteType != "gpt" || seen["gpt-5.5"].BaseURL != gpt.URL {
		t.Fatalf("gpt item = %+v", seen["gpt-5.5"])
	}
	if seen["claude-3-7-sonnet"].RouteType != "claude" || seen["claude-3-7-sonnet"].BaseURL != claude.URL {
		t.Fatalf("claude item = %+v", seen["claude-3-7-sonnet"])
	}
	if seen["gpt-5.5"].KeyFingerprint == "" || seen["gpt-5.5"].KeyFingerprint == seen["claude-3-7-sonnet"].KeyFingerprint {
		t.Fatalf("fingerprints gpt=%q claude=%q", seen["gpt-5.5"].KeyFingerprint, seen["claude-3-7-sonnet"].KeyFingerprint)
	}
}

func TestChatImageUsesAPIKeyConfiguredURLAndPaths(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/key/images/create" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer image-key" {
			t.Fatalf("Authorization = %q", got)
		}
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode upstream body: %v", err)
		}
		if payload["model"] != "gpt-image-2" {
			t.Fatalf("body = %#v", payload)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"url":"https://cdn.example/key-image.png"}]}`))
	}))
	defer upstream.Close()

	db, err := gorm.Open(sqlite.Open("file:tools-chat-image-key-path?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	site := models.Site{
		Name:      "key image paths",
		BaseURL:   "https://panel.example",
		PluginKey: "api-supplier",
		IsEnabled: true,
		Credentials: models.JSONMap{
			"api_keys": []any{
				map[string]any{
					"name":                  "image",
					"key":                   "image-key",
					"status":                "active",
					"route_type":            "gpt",
					"request_base_urls":     []any{upstream.URL},
					"image_generation_path": "/key/images/create",
					"image_edit_path":       "/key/images/edit",
				},
			},
		},
		PluginConfig: models.JSONMap{
			"api_format":            "openai",
			"api_request_urls":      []any{"https://site-upstream.example"},
			"image_generation_path": "/site/images/create",
		},
	}
	if err := db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}
	candidates := toolModelCandidates(site)
	if len(candidates) != 1 {
		t.Fatalf("candidates = %+v", candidates)
	}

	body, _ := json.Marshal(map[string]any{
		"site_id":         site.ID,
		"key_fingerprint": candidates[0].KeyFingerprint,
		"model":           "gpt-image-2",
		"mode":            "image",
		"prompt":          "key path prompt",
		"image_size":      "1024x1024",
	})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/tools/chat-test", bytes.NewReader(body))
	(&App{DB: db}).ChatTest(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var response struct {
		OK     bool                         `json:"ok"`
		Images []schemasChatTestImageOutput `json:"images"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !response.OK || len(response.Images) != 1 || response.Images[0].URL != "https://cdn.example/key-image.png" {
		t.Fatalf("response = %+v body = %s", response, rec.Body.String())
	}
}

func TestChatSessionLifecyclePersistsMessagesAndRestoresContext(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:tools-chat-session-lifecycle?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	app := &App{DB: db}
	router := chi.NewRouter()
	app.ToolRoutes(router)

	createBody, _ := json.Marshal(map[string]any{
		"title":           "Explain routing",
		"site_id":         7,
		"site_name":       "Gateway A",
		"model":           "gpt-4o-mini",
		"mode":            "chat",
		"route_type":      "codex",
		"key_fingerprint": "abc123",
		"key_name":        "main key",
		"image_size":      "1024x1024",
	})
	createRec := httptest.NewRecorder()
	router.ServeHTTP(createRec, httptest.NewRequest(http.MethodPost, "/chat-sessions", bytes.NewReader(createBody)))
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create status = %d body = %s", createRec.Code, createRec.Body.String())
	}
	var created struct {
		ID              uint   `json:"id"`
		Title           string `json:"title"`
		SiteID          *uint  `json:"site_id"`
		Model           string `json:"model"`
		RouteType       string `json:"route_type"`
		KeyFingerprint  string `json:"key_fingerprint"`
		MessageCount    int    `json:"message_count"`
		LastMessageText string `json:"last_message_text"`
	}
	if err := json.NewDecoder(createRec.Body).Decode(&created); err != nil {
		t.Fatalf("decode create: %v", err)
	}
	if created.ID == 0 || created.Title != "Explain routing" || created.SiteID == nil || *created.SiteID != 7 || created.Model != "gpt-4o-mini" {
		t.Fatalf("created session = %+v", created)
	}

	appendBody, _ := json.Marshal(map[string]any{
		"messages": []map[string]any{
			{
				"role":       "user",
				"content":    "What happened?",
				"status":     "done",
				"created_at": "2026-05-10T00:00:00Z",
			},
			{
				"role":        "assistant",
				"content":     "Route A handled it.",
				"status":      "done",
				"latency_ms":  123.4,
				"status_code": 200,
				"created_at":  "2026-05-10T00:00:01Z",
			},
		},
	})
	appendRec := httptest.NewRecorder()
	router.ServeHTTP(appendRec, httptest.NewRequest(http.MethodPost, "/chat-sessions/"+strconv.Itoa(int(created.ID))+"/messages", bytes.NewReader(appendBody)))
	if appendRec.Code != http.StatusOK {
		t.Fatalf("append status = %d body = %s", appendRec.Code, appendRec.Body.String())
	}

	getRec := httptest.NewRecorder()
	router.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/chat-sessions/"+strconv.Itoa(int(created.ID)), nil))
	if getRec.Code != http.StatusOK {
		t.Fatalf("get status = %d body = %s", getRec.Code, getRec.Body.String())
	}
	var detail struct {
		ID              uint   `json:"id"`
		MessageCount    int    `json:"message_count"`
		LastMessageText string `json:"last_message_text"`
		Messages        []struct {
			Role       string   `json:"role"`
			Content    string   `json:"content"`
			Status     string   `json:"status"`
			LatencyMS  *float64 `json:"latency_ms"`
			StatusCode *int     `json:"status_code"`
			Seq        int      `json:"seq"`
		} `json:"messages"`
	}
	if err := json.NewDecoder(getRec.Body).Decode(&detail); err != nil {
		t.Fatalf("decode detail: %v", err)
	}
	if detail.MessageCount != 2 || detail.LastMessageText != "Route A handled it." || len(detail.Messages) != 2 {
		t.Fatalf("detail = %+v", detail)
	}
	if detail.Messages[0].Role != "user" || detail.Messages[0].Seq != 1 || detail.Messages[1].Role != "assistant" || detail.Messages[1].Seq != 2 {
		t.Fatalf("messages not restored in context order: %+v", detail.Messages)
	}
	if detail.Messages[1].LatencyMS == nil || *detail.Messages[1].LatencyMS != 123.4 || detail.Messages[1].StatusCode == nil || *detail.Messages[1].StatusCode != 200 {
		t.Fatalf("assistant metadata lost: %+v", detail.Messages[1])
	}

	listRec := httptest.NewRecorder()
	router.ServeHTTP(listRec, httptest.NewRequest(http.MethodGet, "/chat-sessions", nil))
	if listRec.Code != http.StatusOK {
		t.Fatalf("list status = %d body = %s", listRec.Code, listRec.Body.String())
	}
	var list struct {
		Items []struct {
			ID              uint   `json:"id"`
			MessageCount    int    `json:"message_count"`
			LastMessageText string `json:"last_message_text"`
		} `json:"items"`
		Count int `json:"count"`
	}
	if err := json.NewDecoder(listRec.Body).Decode(&list); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if list.Count != 1 || len(list.Items) != 1 || list.Items[0].ID != created.ID || list.Items[0].MessageCount != 2 {
		t.Fatalf("list = %+v", list)
	}
}

func TestDeleteChatSessionCascadesMessages(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:tools-chat-session-delete?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	session := models.ChatSession{Title: "Delete me", Model: "gpt-4o-mini", Mode: "chat"}
	if err := db.Create(&session).Error; err != nil {
		t.Fatalf("create session: %v", err)
	}
	if err := db.Create(&models.ChatMessage{SessionID: session.ID, Seq: 1, Role: "user", Content: "hello", Status: "done"}).Error; err != nil {
		t.Fatalf("create message: %v", err)
	}
	app := &App{DB: db}
	router := chi.NewRouter()
	app.ToolRoutes(router)

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodDelete, "/chat-sessions/"+strconv.Itoa(int(session.ID)), nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("delete status = %d body = %s", rec.Code, rec.Body.String())
	}
	var sessionCount int64
	if err := db.Model(&models.ChatSession{}).Where("id = ?", session.ID).Count(&sessionCount).Error; err != nil {
		t.Fatalf("count sessions: %v", err)
	}
	var messageCount int64
	if err := db.Model(&models.ChatMessage{}).Where("session_id = ?", session.ID).Count(&messageCount).Error; err != nil {
		t.Fatalf("count messages: %v", err)
	}
	if sessionCount != 0 || messageCount != 0 {
		t.Fatalf("delete left session=%d messages=%d", sessionCount, messageCount)
	}
}
