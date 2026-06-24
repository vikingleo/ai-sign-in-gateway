package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"ai-sign-in-gateway/internal/config"
	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/security"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestAdminUsersSuperAdminCanCreateAndListUsers(t *testing.T) {
	db := newAuthTestDB(t, "admin", "correct-password")
	app := &App{DB: db, Cfg: testAuthConfig()}
	token := loginToken(t, app, "admin", "correct-password")

	rec := performJSONRequest(t, db, http.MethodPost, "/api/auth/admin-users", token, map[string]any{
		"username": "operator",
		"password": "operator-password",
		"role":     models.AdminRoleAdmin,
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create status = %d body = %s", rec.Code, rec.Body.String())
	}
	var created models.AdminUser
	if err := db.Where("username = ?", "operator").First(&created).Error; err != nil {
		t.Fatalf("created admin not found: %v", err)
	}
	if created.Role != models.AdminRoleAdmin || !created.IsEnabled {
		t.Fatalf("created admin role/enabled = %q/%v", created.Role, created.IsEnabled)
	}

	rec = performJSONRequest(t, db, http.MethodGet, "/api/auth/admin-users", token, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("list status = %d body = %s", rec.Code, rec.Body.String())
	}
	var users []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &users); err != nil {
		t.Fatal(err)
	}
	if len(users) != 2 {
		t.Fatalf("user count = %d body = %s", len(users), rec.Body.String())
	}
	rolesByUsername := map[string]any{}
	for _, user := range users {
		rolesByUsername[fmt.Sprint(user["username"])] = user["role"]
	}
	if rolesByUsername["admin"] != models.AdminRoleSuper || rolesByUsername["operator"] != models.AdminRoleAdmin {
		t.Fatalf("roles = %#v", users)
	}
}

func TestAdminUsersCanCreateDisabledUser(t *testing.T) {
	db := newAuthTestDB(t, "admin", "correct-password")
	app := &App{DB: db, Cfg: testAuthConfig()}
	token := loginToken(t, app, "admin", "correct-password")

	rec := performJSONRequest(t, db, http.MethodPost, "/api/auth/admin-users", token, map[string]any{
		"username":   "disabled",
		"password":   "disabled-password",
		"role":       models.AdminRoleAdmin,
		"is_enabled": false,
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create status = %d body = %s", rec.Code, rec.Body.String())
	}
	var created models.AdminUser
	if err := db.Where("username = ?", "disabled").First(&created).Error; err != nil {
		t.Fatal(err)
	}
	if created.IsEnabled {
		t.Fatal("created disabled admin is enabled")
	}
}

func TestAdminUsernameLimitCountsCharacters(t *testing.T) {
	db := newAuthTestDB(t, "admin", "correct-password")
	app := &App{DB: db, Cfg: testAuthConfig()}
	token := loginToken(t, app, "admin", "correct-password")

	rec := performJSONRequest(t, db, http.MethodPost, "/api/auth/admin-users", token, map[string]any{
		"username": strings.Repeat("界", 50),
		"password": "operator-password",
		"role":     models.AdminRoleAdmin,
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("50-rune username status = %d body = %s", rec.Code, rec.Body.String())
	}

	rec = performJSONRequest(t, db, http.MethodPost, "/api/auth/admin-users", token, map[string]any{
		"username": strings.Repeat("界", 51),
		"password": "operator-password",
		"role":     models.AdminRoleAdmin,
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("51-rune username status = %d body = %s", rec.Code, rec.Body.String())
	}
}

func TestAdminUsersNormalAdminCannotManageUsers(t *testing.T) {
	db := newAuthTestDB(t, "admin", "correct-password")
	hash, err := security.HashPassword("operator-password")
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&models.AdminUser{
		Username:     "operator",
		PasswordHash: hash,
		Role:         models.AdminRoleAdmin,
		IsEnabled:    true,
	}).Error; err != nil {
		t.Fatal(err)
	}
	app := &App{DB: db, Cfg: testAuthConfig()}
	token := loginToken(t, app, "operator", "operator-password")

	rec := performJSONRequest(t, db, http.MethodPost, "/api/auth/admin-users", token, map[string]any{
		"username": "other",
		"password": "other-password",
	})
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d body = %s", rec.Code, rec.Body.String())
	}
}

func TestDisabledAdminCannotLoginOrUseExistingToken(t *testing.T) {
	db := newAuthTestDB(t, "admin", "correct-password")
	hash, err := security.HashPassword("operator-password")
	if err != nil {
		t.Fatal(err)
	}
	operator := models.AdminUser{
		Username:     "operator",
		PasswordHash: hash,
		Role:         models.AdminRoleAdmin,
		IsEnabled:    true,
	}
	if err := db.Create(&operator).Error; err != nil {
		t.Fatal(err)
	}
	app := &App{DB: db, Cfg: testAuthConfig()}
	token := loginToken(t, app, "operator", "operator-password")

	if err := db.Model(&operator).Update("is_enabled", false).Error; err != nil {
		t.Fatal(err)
	}
	login := performLogin(t, app, "operator", "operator-password")
	if login.Code != http.StatusUnauthorized {
		t.Fatalf("disabled login status = %d body = %s", login.Code, login.Body.String())
	}
	rec := performJSONRequest(t, db, http.MethodGet, "/api/auth/me", token, nil)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("disabled token status = %d body = %s", rec.Code, rec.Body.String())
	}
}

func TestLoginReportsDatabaseErrors(t *testing.T) {
	db := newAuthTestDB(t, "admin", "correct-password")
	app := &App{DB: db, Cfg: testAuthConfig()}
	failAuthQueries(db, "login query failed")

	rec := performLogin(t, app, "admin", "correct-password")
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("login status = %d body = %s", rec.Code, rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), "用户名或密码错误") {
		t.Fatalf("login masked database failure as credential error: %s", rec.Body.String())
	}
}

func TestAdminUsersProtectLastSuperAdmin(t *testing.T) {
	db := newAuthTestDB(t, "admin", "correct-password")
	app := &App{DB: db, Cfg: testAuthConfig()}
	token := loginToken(t, app, "admin", "correct-password")
	var admin models.AdminUser
	if err := db.Where("username = ?", "admin").First(&admin).Error; err != nil {
		t.Fatal(err)
	}

	rec := performJSONRequest(t, db, http.MethodPut, fmt.Sprintf("/api/auth/admin-users/%d", admin.ID), token, map[string]any{
		"role": models.AdminRoleAdmin,
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("demote status = %d body = %s", rec.Code, rec.Body.String())
	}
	rec = performJSONRequest(t, db, http.MethodPut, fmt.Sprintf("/api/auth/admin-users/%d", admin.ID), token, map[string]any{
		"is_enabled": false,
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("disable status = %d body = %s", rec.Code, rec.Body.String())
	}
	rec = performJSONRequest(t, db, http.MethodDelete, fmt.Sprintf("/api/auth/admin-users/%d", admin.ID), token, nil)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("delete self status = %d body = %s", rec.Code, rec.Body.String())
	}
}

func TestAdminUsersRequireAccountEndpointForSelfIdentityChanges(t *testing.T) {
	db := newAuthTestDB(t, "admin", "correct-password")
	app := &App{DB: db, Cfg: testAuthConfig()}
	token := loginToken(t, app, "admin", "correct-password")
	var admin models.AdminUser
	if err := db.Where("username = ?", "admin").First(&admin).Error; err != nil {
		t.Fatal(err)
	}

	rec := performJSONRequest(t, db, http.MethodPut, fmt.Sprintf("/api/auth/admin-users/%d", admin.ID), token, map[string]any{
		"username": "renamed",
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("rename self status = %d body = %s", rec.Code, rec.Body.String())
	}
	rec = performJSONRequest(t, db, http.MethodPut, fmt.Sprintf("/api/auth/admin-users/%d", admin.ID), token, map[string]any{
		"new_password": "changed-password",
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("change self password status = %d body = %s", rec.Code, rec.Body.String())
	}
	newPasswordLogin := performLogin(t, app, "admin", "changed-password")
	if newPasswordLogin.Code != http.StatusUnauthorized {
		t.Fatalf("new self password login status = %d body = %s", newPasswordLogin.Code, newPasswordLogin.Body.String())
	}

	hash, err := security.HashPassword("other-password")
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&models.AdminUser{
		Username:     "other-super",
		PasswordHash: hash,
		Role:         models.AdminRoleSuper,
		IsEnabled:    true,
	}).Error; err != nil {
		t.Fatal(err)
	}
	rec = performJSONRequest(t, db, http.MethodPut, fmt.Sprintf("/api/auth/admin-users/%d", admin.ID), token, map[string]any{
		"role": models.AdminRoleAdmin,
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("change self role status = %d body = %s", rec.Code, rec.Body.String())
	}
}

func TestAdminAccessTokenUsesIDAndRejectsStaleUsername(t *testing.T) {
	db := newAuthTestDB(t, "admin", "correct-password")
	app := &App{DB: db, Cfg: testAuthConfig()}
	token := loginToken(t, app, "admin", "correct-password")
	var admin models.AdminUser
	if err := db.Where("username = ?", "admin").First(&admin).Error; err != nil {
		t.Fatal(err)
	}

	if err := db.Model(&admin).Update("username", "renamed").Error; err != nil {
		t.Fatal(err)
	}
	rec := performJSONRequest(t, db, http.MethodGet, "/api/auth/me", token, nil)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("stale username token status = %d body = %s", rec.Code, rec.Body.String())
	}

	legacy, err := security.CreateAccessToken(testAuthConfig(), "renamed")
	if err != nil {
		t.Fatal(err)
	}
	rec = performJSONRequest(t, db, http.MethodGet, "/api/auth/me", legacy, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("legacy token status = %d body = %s", rec.Code, rec.Body.String())
	}
}

func testAuthConfig() config.Config {
	return config.Config{SecretKey: "test-secret", AccessTokenExpireMinutes: 60}
}

func loginToken(t *testing.T, app *App, username, password string) string {
	t.Helper()
	rec := performLogin(t, app, username, password)
	if rec.Code != http.StatusOK {
		t.Fatalf("login status = %d body = %s", rec.Code, rec.Body.String())
	}
	var body struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.AccessToken == "" {
		t.Fatalf("missing access token: %s", rec.Body.String())
	}
	return body.AccessToken
}

func performLogin(t *testing.T, app *App, username, password string) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(map[string]any{"username": username, "password": password})
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	app.Login(rec, req)
	return rec
}

func performJSONRequest(t *testing.T, db *gorm.DB, method, target, token string, payload any) *httptest.ResponseRecorder {
	t.Helper()
	var body *bytes.Reader
	if payload == nil {
		body = bytes.NewReader(nil)
	} else {
		raw, err := json.Marshal(payload)
		if err != nil {
			t.Fatal(err)
		}
		body = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, target, body)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	NewRouter(db, testAuthConfig()).ServeHTTP(rec, req)
	return rec
}

func newAuthTestDB(t *testing.T, username, password string) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:auth-"+strings.ReplaceAll(t.Name(), "/", "-")+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})
	hash, err := security.HashPassword(password)
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&models.AdminUser{
		Username:     username,
		PasswordHash: hash,
		Role:         models.AdminRoleSuper,
		IsEnabled:    true,
	}).Error; err != nil {
		t.Fatalf("create admin: %v", err)
	}
	return db
}

func failAuthQueries(db *gorm.DB, message string) {
	db.Callback().Query().Before("gorm:query").Register("test_fail_auth_query", func(tx *gorm.DB) {
		tx.AddError(fmt.Errorf("%s", message))
	})
}
