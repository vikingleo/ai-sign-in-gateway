package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"ai-sign-in-gateway/internal/models"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestFeaturesReturnsSettingsQueryError(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:features-settings-query-error?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	failGatewayAdminQueries(db, "settings read failed")

	rec := httptest.NewRecorder()
	(&App{DB: db}).Features(rec, httptest.NewRequest(http.MethodGet, "/api/features", nil))
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d body = %s", rec.Code, rec.Body.String())
	}
}
