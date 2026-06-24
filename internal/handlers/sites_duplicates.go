package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/url"
	"sort"
	"strings"

	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/services"
	"gorm.io/gorm"
)

type duplicateSiteKey struct {
	PluginKey           string
	BaseURL             string
	Account             string
	PasswordPresent     bool
	PasswordFingerprint string
}

type duplicateSiteItem struct {
	ID                uint   `json:"id"`
	Name              string `json:"name"`
	PluginKey         string `json:"plugin_key"`
	IsEnabled         bool   `json:"is_enabled"`
	Notes             string `json:"notes"`
	PluginConfigCount int    `json:"plugin_config_count"`
	CredentialsCount  int    `json:"credentials_count"`
	SuggestedKeep     bool   `json:"suggested_keep"`
}

type duplicateSiteGroup struct {
	PluginKey       string              `json:"plugin_key"`
	BaseURL         string              `json:"base_url"`
	Account         string              `json:"account"`
	PasswordPresent bool                `json:"password_present"`
	SuggestedKeepID uint                `json:"suggested_keep_id"`
	SiteIDs         []uint              `json:"site_ids"`
	Sites           []duplicateSiteItem `json:"sites"`
}

type duplicateSiteBucket struct {
	key   duplicateSiteKey
	sites []models.Site
}

func duplicateSiteGroups(db *gorm.DB) ([]duplicateSiteGroup, error) {
	var sites []models.Site
	if err := db.Order("base_url asc, id asc").Find(&sites).Error; err != nil {
		return nil, err
	}
	buckets := duplicateSiteBuckets(sites)
	groups := make([]duplicateSiteGroup, 0, len(buckets))
	for _, bucket := range buckets {
		if len(bucket.sites) < 2 {
			continue
		}
		groups = append(groups, duplicateSiteGroupResponse(bucket))
	}
	sortDuplicateSiteGroups(groups)
	return groups, nil
}

func duplicateSiteBuckets(sites []models.Site) []duplicateSiteBucket {
	index := map[duplicateSiteKey]int{}
	buckets := []duplicateSiteBucket{}
	for _, site := range sites {
		key := duplicateSiteGroupKey(site)
		if key.BaseURL == "" || key.Account == "" {
			continue
		}
		pos, ok := index[key]
		if !ok {
			index[key] = len(buckets)
			buckets = append(buckets, duplicateSiteBucket{key: key})
			pos = len(buckets) - 1
		}
		buckets[pos].sites = append(buckets[pos].sites, site)
	}
	return buckets
}

func duplicateSiteGroupKey(site models.Site) duplicateSiteKey {
	return duplicateSiteKey{
		PluginKey:           strings.TrimSpace(site.PluginKey),
		BaseURL:             normalizeDuplicateBaseURL(site.BaseURL),
		Account:             duplicateSiteAccount(site),
		PasswordPresent:     duplicatePasswordPresent(site),
		PasswordFingerprint: duplicatePasswordFingerprint(site),
	}
}

func duplicateSiteGroupResponse(bucket duplicateSiteBucket) duplicateSiteGroup {
	keep := suggestedDuplicateKeepSite(bucket.sites)
	group := duplicateSiteGroup{
		PluginKey:       bucket.key.PluginKey,
		BaseURL:         bucket.key.BaseURL,
		Account:         bucket.key.Account,
		PasswordPresent: bucket.key.PasswordPresent,
		SuggestedKeepID: keep.ID,
	}
	sort.SliceStable(bucket.sites, func(i, j int) bool {
		return bucket.sites[i].ID < bucket.sites[j].ID
	})
	for _, site := range bucket.sites {
		group.SiteIDs = append(group.SiteIDs, site.ID)
		group.Sites = append(group.Sites, duplicateSiteItemResponse(site, keep.ID))
	}
	return group
}

func duplicateSiteItemResponse(site models.Site, keepID uint) duplicateSiteItem {
	return duplicateSiteItem{
		ID:                site.ID,
		Name:              site.Name,
		PluginKey:         site.PluginKey,
		IsEnabled:         site.IsEnabled,
		Notes:             site.Notes,
		PluginConfigCount: jsonMapEntryCount(site.PluginConfig),
		CredentialsCount:  jsonMapEntryCount(site.Credentials),
		SuggestedKeep:     site.ID == keepID,
	}
}

func suggestedDuplicateKeepSite(sites []models.Site) models.Site {
	sorted := append([]models.Site(nil), sites...)
	sort.SliceStable(sorted, func(i, j int) bool {
		return duplicateKeepRank(sorted[i], sorted[j])
	})
	return sorted[0]
}

func duplicateKeepRank(a, b models.Site) bool {
	if a.IsEnabled != b.IsEnabled {
		return a.IsEnabled
	}
	aCount := jsonMapEntryCount(a.Credentials) + jsonMapEntryCount(a.PluginConfig)
	bCount := jsonMapEntryCount(b.Credentials) + jsonMapEntryCount(b.PluginConfig)
	if aCount != bCount {
		return aCount > bCount
	}
	aCreated, bCreated := a.CreatedAt, b.CreatedAt
	if !aCreated.Equal(bCreated) {
		return aCreated.Before(bCreated)
	}
	return a.ID < b.ID
}

func duplicateSiteAccount(site models.Site) string {
	account := firstDuplicateIdentity(site.Credentials, "account", "email", "username", "user_id")
	if account != "" {
		return account
	}
	if apiKey := strings.TrimSpace(jsonMapString(site.Credentials, "api_key")); apiKey != "" {
		return "api_key:" + shortHash(apiKey)
	}
	if apiKeysHash := apiKeysIdentityHash(site.Credentials["api_keys"]); apiKeysHash != "" {
		return "api_keys:" + apiKeysHash
	}
	if credentialHash := credentialIdentityHash(site.Credentials); credentialHash != "" {
		return "credential:" + credentialHash
	}
	return ""
}

func firstDuplicateIdentity(values models.JSONMap, keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(jsonMapString(values, key)); value != "" {
			return strings.ToLower(value)
		}
	}
	return ""
}

func duplicatePasswordPresent(site models.Site) bool {
	for _, key := range []string{"password", "passwd", "pass"} {
		if strings.TrimSpace(jsonMapString(site.Credentials, key)) != "" {
			return true
		}
	}
	return false
}

func duplicatePasswordFingerprint(site models.Site) string {
	keys := []string{"password", "passwd", "pass"}
	type passwordPart struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	}
	parts := make([]passwordPart, 0, len(keys))
	for _, key := range keys {
		if value := strings.TrimSpace(jsonMapString(site.Credentials, key)); value != "" {
			parts = append(parts, passwordPart{Key: key, Value: value})
		}
	}
	if len(parts) == 0 {
		return ""
	}
	data, err := json.Marshal(parts)
	if err != nil {
		return ""
	}
	return shortHash(string(data))
}

func normalizeDuplicateBaseURL(raw string) string {
	normalized := services.NormalizeBaseURL(raw)
	parsed, err := url.Parse(normalized)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return strings.ToLower(normalized)
	}
	parsed.Scheme = strings.ToLower(parsed.Scheme)
	parsed.Host = strings.ToLower(parsed.Host)
	return services.NormalizeBaseURL(parsed.String())
}

func jsonMapEntryCount(value models.JSONMap) int {
	count := 0
	for _, item := range nonNilJSON(value) {
		if !jsonValueIsEmpty(item) {
			count++
		}
	}
	return count
}

func jsonValueIsEmpty(value any) bool {
	switch typed := value.(type) {
	case nil:
		return true
	case string:
		return strings.TrimSpace(typed) == ""
	case []any:
		return len(typed) == 0
	case []map[string]any:
		return len(typed) == 0
	case map[string]any:
		return len(typed) == 0
	case models.JSONMap:
		return len(typed) == 0
	default:
		return false
	}
}

func mergeDuplicateNotes(base, extra string) string {
	base = strings.TrimSpace(base)
	extra = strings.TrimSpace(extra)
	if base == "" {
		return extra
	}
	if extra == "" || strings.Contains(base, extra) {
		return base
	}
	return base + "\n" + extra
}

func apiKeysIdentityHash(value any) string {
	if jsonValueIsEmpty(value) {
		return ""
	}
	data, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return shortHash(string(data))
}

func credentialIdentityHash(values models.JSONMap) string {
	keys := []string{"cookie", "access_token", "refresh_token", "auth_token", "token", "authorization", "session", "session_id", "session_token", "jwt", "bearer"}
	type identityPart struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	}
	parts := make([]identityPart, 0, len(keys))
	for _, key := range keys {
		if value := strings.TrimSpace(jsonMapString(values, key)); value != "" {
			parts = append(parts, identityPart{Key: key, Value: value})
		}
	}
	if len(parts) == 0 {
		return ""
	}
	data, err := json.Marshal(parts)
	if err != nil {
		return ""
	}
	return shortHash(string(data))
}

func shortHash(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])[:12]
}

func sortDuplicateSiteGroups(groups []duplicateSiteGroup) {
	sort.SliceStable(groups, func(i, j int) bool {
		left, right := groups[i], groups[j]
		if left.PluginKey != right.PluginKey {
			return left.PluginKey < right.PluginKey
		}
		if left.BaseURL != right.BaseURL {
			return left.BaseURL < right.BaseURL
		}
		if left.Account != right.Account {
			return left.Account < right.Account
		}
		if left.PasswordPresent != right.PasswordPresent {
			return !left.PasswordPresent
		}
		return left.SuggestedKeepID < right.SuggestedKeepID
	})
}
