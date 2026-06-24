package plugins

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"ai-sign-in-gateway/internal/models"
)

func TestHTTPStationStatusAndCheckin(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
					"balance":   12.5,
					"currency":  "USD",
					"email":     "admin@example.com",
					"logged_in": true,
				},
			})
		case "/checkin":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "signed",
				"data": map[string]any{
					"balance": 13.5,
				},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	site := models.Site{
		BaseURL:   server.URL,
		PluginKey: "http-relay-station",
		Credentials: models.JSONMap{
			"api_key": "token-123",
		},
		PluginConfig: models.JSONMap{
			"auth_mode":                 "bearer",
			"status_path":               "/status",
			"status_method":             "GET",
			"status_login_path":         "data.logged_in",
			"status_balance_path":       "data.balance",
			"status_balance_unit_path":  "data.currency",
			"status_account_path":       "data.email",
			"status_message_path":       "message",
			"checkin_path":              "/checkin",
			"checkin_method":            "POST",
			"checkin_success_path":      "success",
			"checkin_message_path":      "message",
			"checkin_balance_path":      "data.balance",
			"checkin_balance_unit_path": "data.currency",
			"default_balance_unit":      "USD",
		},
	}

	plugin := NewHTTPStation()
	status, err := plugin.FetchAccountStatus(context.Background(), site, 5)
	if err != nil {
		t.Fatalf("FetchAccountStatus returned error: %v", err)
	}
	if !status.LoggedIn || status.Balance == nil || *status.Balance != 12.5 {
		t.Fatalf("unexpected status: %+v", status)
	}
	if status.BalanceUnit == nil || *status.BalanceUnit != "$" {
		t.Fatalf("BalanceUnit = %v", status.BalanceUnit)
	}
	if status.AccountName == nil || *status.AccountName != "admin@example.com" {
		t.Fatalf("unexpected account name: %+v", status.AccountName)
	}

	result, err := plugin.Checkin(context.Background(), site, 5)
	if err != nil {
		t.Fatalf("Checkin returned error: %v", err)
	}
	if !result.Success || result.Balance == nil || *result.Balance != 13.5 {
		t.Fatalf("unexpected checkin result: %+v", result)
	}
	if result.BalanceUnit == nil || *result.BalanceUnit != "$" {
		t.Fatalf("checkin BalanceUnit = %v", result.BalanceUnit)
	}
}

func TestHTTPStationUsesDefaultBalanceUnitWhenUnitPathIsEmpty(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/status":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "ok",
				"data": map[string]any{
					"balance":   12.5,
					"email":     "admin@example.com",
					"logged_in": true,
				},
			})
		case "/checkin":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"message": "signed",
				"data": map[string]any{
					"balance": 13.5,
				},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	site := models.Site{
		BaseURL:   server.URL,
		PluginKey: "http-relay-station",
		Credentials: models.JSONMap{
			"api_key": "token-123",
		},
		PluginConfig: models.JSONMap{
			"auth_mode":            "bearer",
			"status_path":          "/status",
			"status_method":        "GET",
			"status_login_path":    "data.logged_in",
			"status_balance_path":  "data.balance",
			"status_account_path":  "data.email",
			"status_message_path":  "message",
			"checkin_path":         "/checkin",
			"checkin_method":       "POST",
			"checkin_success_path": "success",
			"checkin_message_path": "message",
			"checkin_balance_path": "data.balance",
			"default_balance_unit": "USD",
		},
	}

	plugin := NewHTTPStation()
	status, err := plugin.FetchAccountStatus(context.Background(), site, 5)
	if err != nil {
		t.Fatalf("FetchAccountStatus returned error: %v", err)
	}
	if status.BalanceUnit == nil || *status.BalanceUnit != "$" {
		t.Fatalf("BalanceUnit = %v", status.BalanceUnit)
	}

	result, err := plugin.Checkin(context.Background(), site, 5)
	if err != nil {
		t.Fatalf("Checkin returned error: %v", err)
	}
	if result.BalanceUnit == nil || *result.BalanceUnit != "$" {
		t.Fatalf("checkin BalanceUnit = %v", result.BalanceUnit)
	}
}

func TestHTTPStationInviteAPIParsesSeparateInvitePayload(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
					"balance":   12.5,
					"currency":  "USD",
					"email":     "admin@example.com",
					"logged_in": true,
				},
			})
		case "/invite":
			if r.Method != http.MethodPost {
				t.Fatalf("invite method = %s", r.Method)
			}
			var payload map[string]any
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatalf("decode invite body: %v", err)
			}
			if got := payload["refresh"]; got != false {
				t.Fatalf("invite body refresh = %v", got)
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"data": map[string]any{
					"invite": map[string]any{
						"code": "HTTP-INVITE",
					},
				},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	site := models.Site{
		BaseURL:   server.URL,
		PluginKey: "http-relay-station",
		Credentials: models.JSONMap{
			"api_key": "token-123",
		},
		PluginConfig: models.JSONMap{
			"auth_mode":                "bearer",
			"status_path":              "/status",
			"status_method":            "GET",
			"status_login_path":        "data.logged_in",
			"status_balance_path":      "data.balance",
			"status_balance_unit_path": "data.currency",
			"status_account_path":      "data.email",
			"status_message_path":      "message",
			"invite_path":              "/invite",
			"invite_method":            "POST",
			"invite_body_json":         `{"refresh":false}`,
			"invite_code_path":         "data.invite.code",
			"invite_link_template":     "/register?code={code}",
			"default_balance_unit":     "USD",
		},
	}

	plugin := NewHTTPStation()
	status, err := plugin.FetchAccountStatus(context.Background(), site, 5)
	if err != nil {
		t.Fatalf("FetchAccountStatus returned error: %v", err)
	}
	if status.InviteCode == nil || *status.InviteCode != "HTTP-INVITE" {
		t.Fatalf("InviteCode = %v", status.InviteCode)
	}
	if status.InviteLink == nil || *status.InviteLink != server.URL+"/register?code=HTTP-INVITE" {
		t.Fatalf("InviteLink = %v", status.InviteLink)
	}
}
