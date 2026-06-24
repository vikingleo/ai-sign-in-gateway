package handlers

import (
	"net/http"
	"strings"

	"ai-sign-in-gateway/internal/features"
	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/schemas"
)

func (a *App) Features(w http.ResponseWriter, r *http.Request) {
	settings, err := a.effectiveSystemSettings()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, featureResponses(settings))
}

func featureResponses(settings models.SystemSetting) []schemas.FeatureResponse {
	modules := features.List()
	out := make([]schemas.FeatureResponse, 0, len(modules))
	for _, module := range modules {
		out = append(out, schemas.FeatureResponse{
			Key:            module.Key,
			Name:           module.Name,
			Description:    module.Description,
			FrontendPath:   module.FrontendPath,
			DefaultEnabled: module.DefaultEnabled,
			Enabled:        featureEnabled(settings.FeatureFlags, module.Key, module.DefaultEnabled),
		})
	}
	return out
}

func (a *App) requireFeatureEnabled(key string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if a.isFeatureEnabled(key) {
				next.ServeHTTP(w, r)
				return
			}
			writeError(w, http.StatusForbidden, "功能未启用")
		})
	}
}

func (a *App) isFeatureEnabled(key string) bool {
	settings, err := a.effectiveSystemSettings()
	if err != nil {
		return false
	}
	for _, module := range features.List() {
		if strings.EqualFold(module.Key, key) {
			return featureEnabled(settings.FeatureFlags, module.Key, module.DefaultEnabled)
		}
	}
	return false
}

func featureEnabled(flags models.JSONMap, key string, fallback bool) bool {
	if flags == nil {
		return fallback
	}
	value, ok := flags[key]
	if !ok {
		return fallback
	}
	switch typed := value.(type) {
	case bool:
		return typed
	case string:
		switch strings.ToLower(strings.TrimSpace(typed)) {
		case "1", "true", "yes", "on", "enabled":
			return true
		case "0", "false", "no", "off", "disabled":
			return false
		default:
			return fallback
		}
	default:
		return fallback
	}
}

func normalizeFeatureFlags(value models.JSONMap) models.JSONMap {
	out := models.JSONMap{}
	for key, item := range value {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		out[key] = featureEnabled(models.JSONMap{key: item}, key, true)
	}
	return out
}
