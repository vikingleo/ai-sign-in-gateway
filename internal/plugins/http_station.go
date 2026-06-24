package plugins

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/schemas"
	"ai-sign-in-gateway/internal/services"
)

type HTTPStation struct {
	client *http.Client
}

func NewHTTPStation() *HTTPStation {
	return &HTTPStation{client: &http.Client{}}
}

func (p *HTTPStation) Meta() schemas.PluginMetaResponse {
	return schemas.PluginMetaResponse{
		Key:          "http-relay-station",
		Name:         "正式 HTTP 中转站",
		Description:  "面向真实站点的通用 HTTP 适配器，支持 Cookie 或 Bearer Token。",
		Capabilities: []string{"checkin", "account_status", "real_http", "gateway"},
		CredentialFields: []schemas.FieldDescriptor{
			Field("account", "账号标识", "text", "admin@example.com", true, ""),
			Field("username", "登录用户名", "text", "用于自动登录", false, ""),
			Field("email", "登录邮箱", "text", "name@example.com", false, ""),
			Field("password", "登录密码", "password", "用于自动登录", false, ""),
			Field("cookie", "Cookie", "textarea", "session=...; token=...", false, ""),
			Field("api_key", "Bearer Token", "password", "sk-...", false, ""),
			Field("user_agent", "User-Agent", "text", services.DefaultBrowserUserAgent, false, ""),
		},
		ConfigFields: []schemas.FieldDescriptor{
			Field("auth_mode", "认证方式", "text", "cookie / bearer / none", true, ""),
			Field("status_path", "状态接口路径", "text", "/api/user/profile", true, ""),
			Field("status_method", "状态接口方法", "text", "GET", true, ""),
			Field("status_body_json", "状态接口 JSON Body", "textarea", `{"refresh": false}`, false, ""),
			Field("invite_path", "邀请接口路径", "text", "/api/user/invite", false, "填写后会额外请求该接口解析邀请链接；留空则直接复用状态接口响应。"),
			Field("invite_method", "邀请接口方法", "text", "GET", false, ""),
			Field("invite_body_json", "邀请接口 JSON Body", "textarea", `{"refresh": false}`, false, ""),
			Field("checkin_path", "签到接口路径", "text", "/api/checkin", true, ""),
			Field("checkin_method", "签到接口方法", "text", "POST", true, ""),
			Field("checkin_body_json", "签到接口 JSON Body", "textarea", `{"source":"dashboard"}`, false, ""),
			Field("extra_headers_json", "附加请求头 JSON", "textarea", `{"x-site-key":"demo"}`, false, ""),
			Field("status_login_path", "登录状态字段路径", "text", "data.logged_in", true, ""),
			Field("status_balance_path", "余额字段路径", "text", "data.balance", true, ""),
			Field("status_balance_unit_path", "余额单位字段路径", "text", "data.currency", false, ""),
			Field("status_account_path", "账号名字段路径", "text", "data.email", true, ""),
			Field("status_message_path", "状态消息字段路径", "text", "message", true, ""),
			Field("status_invite_link_path", "邀请链接字段路径", "text", "data.invite_link", false, ""),
			Field("status_invite_code_path", "邀请码字段路径", "text", "data.invite_code", false, ""),
			Field("invite_link_path", "邀请接口链接字段路径", "text", "data.invite_link", false, ""),
			Field("invite_code_path", "邀请接口邀请码字段路径", "text", "data.invite_code", false, ""),
			Field("invite_link_template", "邀请链接模板", "text", "/register?code={code}", false, "支持相对路径或完整 URL，使用 {code} 作为邀请码占位符。"),
			Field("checkin_success_path", "签到成功字段路径", "text", "success", true, ""),
			Field("checkin_message_path", "签到消息字段路径", "text", "message", true, ""),
			Field("checkin_balance_path", "签到后余额字段路径", "text", "data.balance", true, ""),
			Field("default_balance_unit", "默认余额单位", "text", "$", false, ""),
		},
		AuthEntryLabel: "打开官网",
		AuthHint:       "Go 版本当前支持使用已保存的 Cookie 或 Bearer Token 调用状态和签到接口。",
	}
}

func (p *HTTPStation) Validate(site models.Site) error {
	authMode := strings.ToLower(strings.TrimSpace(stringValue(site.PluginConfig, "auth_mode", "none")))
	if strings.TrimSpace(site.BaseURL) == "" {
		return errors.New("站点地址不能为空")
	}
	switch authMode {
	case "cookie":
		if strings.TrimSpace(stringValue(site.Credentials, "cookie", "")) == "" {
			return errors.New("Cookie 模式请填写 Cookie")
		}
	case "bearer":
		if strings.TrimSpace(stringValue(site.Credentials, "api_key", "")) == "" {
			return errors.New("Bearer 模式请填写 Bearer Token")
		}
	case "none", "":
	default:
		return fmt.Errorf("不支持的认证方式：%s", authMode)
	}
	return nil
}

func (p *HTTPStation) FetchAccountStatus(ctx context.Context, site models.Site, timeoutSeconds int) (AccountStatus, error) {
	if err := p.Validate(site); err != nil {
		return AccountStatus{}, err
	}
	payload, _, err := p.requestJSON(ctx, site, stringValue(site.PluginConfig, "status_method", "GET"), stringValue(site.PluginConfig, "status_path", ""), "status_body_json", timeoutSeconds)
	if err != nil {
		return AccountStatus{}, err
	}
	balance := floatPtr(pathFloat(payload, stringValue(site.PluginConfig, "status_balance_path", "")))
	balanceUnit := stringPtr(normalizeBalanceUnit(pathString(payload, stringValue(site.PluginConfig, "status_balance_unit_path", ""), stringValue(site.PluginConfig, "default_balance_unit", "$"))))
	account := stringPtr(pathString(payload, stringValue(site.PluginConfig, "status_account_path", ""), stringValue(site.Credentials, "account", "")))
	inviteLink, inviteCode := extractInviteInfo(payload, site)
	if fetchedLink, fetchedCode, err := fetchInviteInfo(ctx, site, func(ctx context.Context, spec inviteRequestSpec) (map[string]any, error) {
		invitePayload, _, err := p.requestJSONPayload(ctx, site, spec.Method, spec.Target, spec.Body, timeoutSeconds)
		return invitePayload, err
	}); err == nil {
		inviteLink, inviteCode = mergeInviteInfo(site, fetchedLink, fetchedCode, inviteLink, inviteCode)
	}
	return AccountStatus{
		LoggedIn:            pathBool(payload, stringValue(site.PluginConfig, "status_login_path", "")),
		Message:             pathString(payload, stringValue(site.PluginConfig, "status_message_path", ""), "状态接口调用完成。"),
		Balance:             balance,
		BalanceUnit:         balanceUnit,
		AccountName:         account,
		InviteLink:          inviteLink,
		InviteCode:          inviteCode,
		UpdatedCredentials:  models.JSONMap{},
		UpdatedPluginConfig: models.JSONMap{},
	}, nil
}

func (p *HTTPStation) Checkin(ctx context.Context, site models.Site, timeoutSeconds int) (CheckinResult, error) {
	if err := p.Validate(site); err != nil {
		return CheckinResult{}, err
	}
	path := stringValue(site.PluginConfig, "checkin_url", "")
	if path == "" {
		path = stringValue(site.PluginConfig, "checkin_path", "")
	}
	payload, raw, err := p.requestJSON(ctx, site, stringValue(site.PluginConfig, "checkin_method", "POST"), path, "checkin_body_json", timeoutSeconds)
	if err != nil {
		return CheckinResult{}, err
	}
	balance := floatPtr(pathFloat(payload, stringValue(site.PluginConfig, "checkin_balance_path", "")))
	balanceUnit := stringPtr(normalizeBalanceUnit(pathString(payload, stringValue(site.PluginConfig, "checkin_balance_unit_path", ""), stringValue(site.PluginConfig, "default_balance_unit", "$"))))
	excerpt := shorten(raw, 500)
	return CheckinResult{
		Success:            pathBool(payload, stringValue(site.PluginConfig, "checkin_success_path", "")),
		Message:            pathString(payload, stringValue(site.PluginConfig, "checkin_message_path", ""), "签到请求已提交。"),
		Balance:            balance,
		BalanceUnit:        balanceUnit,
		ResponseExcerpt:    &excerpt,
		UpdatedCredentials: models.JSONMap{},
	}, nil
}

func (p *HTTPStation) requestJSON(ctx context.Context, site models.Site, method, target, bodyField string, timeoutSeconds int) (map[string]any, string, error) {
	if target == "" {
		return nil, "", errors.New("请求路径不能为空")
	}
	body, _, err := jsonConfigValue(site.PluginConfig, bodyField)
	if err != nil {
		return nil, "", err
	}
	return p.requestJSONPayload(ctx, site, method, target, body, timeoutSeconds)
}

func (p *HTTPStation) requestJSONPayload(ctx context.Context, site models.Site, method, target string, body any, timeoutSeconds int) (map[string]any, string, error) {
	if target == "" {
		return nil, "", errors.New("请求路径不能为空")
	}
	url, err := services.JoinURL(site.BaseURL, target)
	if err != nil {
		return nil, "", err
	}
	var requestBody io.Reader
	includeContentType := body != nil
	if includeContentType {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, "", err
		}
		requestBody = bytes.NewReader(data)
	}
	reqCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutSeconds)*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, strings.ToUpper(method), url, requestBody)
	if err != nil {
		return nil, "", err
	}
	for key, value := range p.headers(site, includeContentType) {
		req.Header.Set(key, value)
	}
	resp, err := p.client.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, "", err
	}
	raw := string(data)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, raw, fmt.Errorf("接口返回 %d: %s", resp.StatusCode, shorten(raw, 300))
	}
	var parsed map[string]any
	if err := json.Unmarshal(data, &parsed); err != nil {
		return nil, raw, fmt.Errorf("接口未返回 JSON: %w", err)
	}
	return parsed, raw, nil
}

func (p *HTTPStation) headers(site models.Site, includeContentType bool) map[string]string {
	authMode := strings.ToLower(strings.TrimSpace(stringValue(site.PluginConfig, "auth_mode", "none")))
	auth := ""
	cookie := ""
	if authMode == "bearer" {
		apiKey := strings.TrimSpace(stringValue(site.Credentials, "api_key", ""))
		if apiKey != "" {
			if strings.HasPrefix(strings.ToLower(apiKey), "bearer ") {
				auth = apiKey
			} else {
				auth = "Bearer " + apiKey
			}
		}
	}
	if authMode == "cookie" {
		cookie = strings.TrimSpace(stringValue(site.Credentials, "cookie", ""))
	}
	extra := map[string]string{}
	if raw := strings.TrimSpace(stringValue(site.PluginConfig, "extra_headers_json", "")); raw != "" {
		_ = json.Unmarshal([]byte(raw), &extra)
	}
	headers := services.BuildBrowserHeaders(site.BaseURL, includeContentType, auth, cookie, extra)
	if ua := strings.TrimSpace(stringValue(site.Credentials, "user_agent", "")); ua != "" {
		headers["User-Agent"] = ua
	}
	return headers
}

func jsonBody(config models.JSONMap, field string) (io.Reader, bool, error) {
	value, ok, err := jsonConfigValue(config, field)
	if err != nil {
		return nil, false, err
	}
	if !ok {
		return nil, false, nil
	}
	data, _ := json.Marshal(value)
	return bytes.NewReader(data), true, nil
}

func stringValue(source models.JSONMap, key, fallback string) string {
	if source == nil {
		return fallback
	}
	value, ok := source[key]
	if !ok || value == nil {
		return fallback
	}
	switch typed := value.(type) {
	case string:
		if strings.TrimSpace(typed) == "" {
			return fallback
		}
		return typed
	default:
		return fmt.Sprint(typed)
	}
}

func pathValue(payload any, path string) any {
	if strings.TrimSpace(path) == "" {
		return nil
	}
	current := payload
	for _, segment := range strings.Split(path, ".") {
		if segment == "" {
			continue
		}
		switch typed := current.(type) {
		case map[string]any:
			current = typed[segment]
		case []any:
			index, err := strconv.Atoi(segment)
			if err != nil || index < 0 || index >= len(typed) {
				return nil
			}
			current = typed[index]
		default:
			return nil
		}
	}
	return current
}

func pathString(payload map[string]any, path, fallback string) string {
	value := pathValue(payload, path)
	if value == nil || fmt.Sprint(value) == "" {
		return fallback
	}
	return fmt.Sprint(value)
}

func pathBool(payload map[string]any, path string) bool {
	value := pathValue(payload, path)
	switch typed := value.(type) {
	case bool:
		return typed
	case float64:
		return typed != 0
	case string:
		switch strings.ToLower(strings.TrimSpace(typed)) {
		case "1", "true", "success", "ok", "yes", "signed", "done":
			return true
		}
	}
	return false
}

func pathFloat(payload map[string]any, path string) *float64 {
	return numberPtr(pathValue(payload, path))
}

func numberPtr(value any) *float64 {
	switch typed := value.(type) {
	case float64:
		return &typed
	case float32:
		value := float64(typed)
		return &value
	case int:
		value := float64(typed)
		return &value
	case int64:
		value := float64(typed)
		return &value
	case json.Number:
		parsed, err := typed.Float64()
		if err == nil {
			return &parsed
		}
	case string:
		parsed, err := strconv.ParseFloat(strings.TrimSpace(typed), 64)
		if err == nil {
			return &parsed
		}
	}
	return nil
}

func quotaPerUnitFromConfig(site models.Site) float64 {
	raw := strings.TrimSpace(stringValue(site.PluginConfig, "quota_per_unit", ""))
	if raw == "" {
		return 500000.0
	}
	parsed, err := strconv.ParseFloat(raw, 64)
	if err != nil || parsed <= 0 {
		return 500000.0
	}
	return parsed
}

func normalizeQuotaAmount(site models.Site, value *float64) *float64 {
	if value == nil {
		return nil
	}
	out := *value
	if out >= 1000 || out <= -1000 {
		out = out / quotaPerUnitFromConfig(site)
	}
	return &out
}

func firstPathFloat(payload map[string]any, paths ...string) *float64 {
	for _, path := range paths {
		if value := pathFloat(payload, path); value != nil {
			return value
		}
	}
	return nil
}

func firstPathString(payload map[string]any, paths ...string) string {
	for _, path := range paths {
		value := strings.TrimSpace(pathString(payload, path, ""))
		if value != "" && value != "<nil>" {
			return value
		}
	}
	return ""
}

func quotaUsageFromPayload(site models.Site, payload map[string]any) (remaining, total, used *float64, unit string) {
	if payload == nil {
		return nil, nil, nil, ""
	}
	remaining = firstPathFloat(
		payload,
		"data.remaining",
		"data.remain_quota",
		"data.quota_remaining",
		"data.quota_remain",
		"data.available_quota",
		"data.balance",
		"remaining",
		"remain_quota",
		"quota.remaining",
		"quota_remain",
		"balance",
	)
	total = firstPathFloat(
		payload,
		"data.total",
		"data.total_quota",
		"data.quota_total",
		"data.amount_total",
		"total",
		"total_quota",
		"quota.total",
		"amount_total",
	)
	used = firstPathFloat(
		payload,
		"data.used",
		"data.used_quota",
		"data.quota_used",
		"data.amount_used",
		"used",
		"used_quota",
		"quota.used",
		"amount_used",
	)
	if remaining == nil && total != nil && used != nil {
		value := *total - *used
		remaining = &value
	}
	remaining = normalizeQuotaAmount(site, remaining)
	total = normalizeQuotaAmount(site, total)
	used = normalizeQuotaAmount(site, used)
	unit = normalizeBalanceUnit(firstPathString(payload, "data.quota_unit", "data.currency", "data.unit", "data.balance_unit", "unit", "quota.unit"))
	return remaining, total, used, unit
}

func packageDisplayWithQuota(site models.Site, payload map[string]any, fallback string) (string, *float64, *float64, *float64, string) {
	display := strings.TrimSpace(fallback)
	remaining, total, used, unit := quotaUsageFromPayload(site, payload)
	if display == "" {
		display = packageDisplayFromPayload(payload)
	}
	if display == "" && (remaining != nil || total != nil || used != nil) {
		display = "套餐余量"
	}
	parts := []string{}
	if display != "" {
		parts = append(parts, display)
	}
	if remaining != nil && total != nil {
		parts = append(parts, fmt.Sprintf("余量 %.2f / %.2f", *remaining, *total))
	} else if remaining != nil {
		parts = append(parts, fmt.Sprintf("余量 %.2f", *remaining))
	} else if used != nil && total != nil {
		parts = append(parts, fmt.Sprintf("已用 %.2f / %.2f", *used, *total))
	}
	if unit != "" && len(parts) > 0 {
		parts[len(parts)-1] = parts[len(parts)-1] + " " + unit
	}
	return strings.Join(parts, " · "), remaining, total, used, unit
}

type packageQuotaSnapshot struct {
	Display   string
	Remaining *float64
	Total     *float64
	Used      *float64
	Unit      string
}

func packageQuotaFromPayload(site models.Site, payload map[string]any, fallback string) packageQuotaSnapshot {
	display, remaining, total, used, unit := packageDisplayWithQuota(site, payload, fallback)
	return packageQuotaSnapshot{
		Display:   display,
		Remaining: remaining,
		Total:     total,
		Used:      used,
		Unit:      unit,
	}
}

func (q packageQuotaSnapshot) hasQuota() bool {
	return q.Remaining != nil || q.Total != nil || q.Used != nil || strings.TrimSpace(q.Display) != ""
}

func firstNonEmptyPlugin(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" && value != "<nil>" {
			return value
		}
	}
	return ""
}

func formatPackageQuotaDisplay(label string, remaining, total, used *float64, unit string) string {
	parts := []string{}
	if strings.TrimSpace(label) != "" {
		parts = append(parts, strings.TrimSpace(label))
	}
	unit = normalizeBalanceUnit(unit)
	if remaining != nil && total != nil {
		parts = append(parts, fmt.Sprintf("余量 %s / %s", formatQuotaAmount(*remaining, unit), formatQuotaAmount(*total, unit)))
	} else if remaining != nil {
		parts = append(parts, fmt.Sprintf("余量 %s", formatQuotaAmount(*remaining, unit)))
	} else if used != nil && total != nil {
		parts = append(parts, fmt.Sprintf("已用 %s / %s", formatQuotaAmount(*used, unit), formatQuotaAmount(*total, unit)))
	}
	return strings.Join(parts, " · ")
}

func formatQuotaAmount(value float64, unit string) string {
	text := fmt.Sprintf("%.2f", value)
	unit = normalizeBalanceUnit(unit)
	if unit == "" {
		return text
	}
	if balanceUnitIsSymbol(unit) {
		return unit + text
	}
	return text + " " + unit
}

func packageDisplayFromPayload(payload map[string]any) string {
	if payload == nil {
		return ""
	}
	paths := []string{
		"data.package_display",
		"data.package.name",
		"data.package_name",
		"data.plan.name",
		"data.plan_name",
		"data.subscription.name",
		"data.subscription.plan",
		"data.subscription_plan",
		"data.group",
		"data.group_name",
		"data.user_group",
		"data.quota_group",
		"package_display",
		"package.name",
		"package_name",
		"plan.name",
		"plan_name",
		"subscription.name",
		"subscription.plan",
	}
	for _, path := range paths {
		value := strings.TrimSpace(pathString(payload, path, ""))
		if value != "" && value != "<nil>" {
			return value
		}
	}
	return ""
}

func floatPtr(value *float64) *float64 { return value }

func stringPtr(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func shorten(value string, limit int) string {
	value = strings.TrimSpace(value)
	if len(value) <= limit {
		return value
	}
	return value[:limit] + "..."
}
