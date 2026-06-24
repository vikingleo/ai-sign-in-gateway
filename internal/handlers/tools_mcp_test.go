package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
)

func TestMCPTestRouteIsNotRegisteredUntilImplemented(t *testing.T) {
	router := chi.NewRouter()
	(&App{}).ToolRoutes(router)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/mcp-test", nil))

	if rec.Code != http.StatusNotFound {
		t.Fatalf("期望状态码 404，实际 %d，响应体：%s", rec.Code, rec.Body.String())
	}
}
