package handlers

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"ai-sign-in-gateway/internal/httpx"
	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/plugins"
	"ai-sign-in-gateway/internal/registrationpattern"
	"ai-sign-in-gateway/internal/schemas"
	"ai-sign-in-gateway/internal/services"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

type siteGroupPayload struct {
	Name    string `json:"name"`
	OldName string `json:"old_name"`
	NewName string `json:"new_name"`
}

type siteHealthOptions struct {
	Persist bool
}

func (a *App) SiteRoutes(r chi.Router) {
	r.Get("/", a.ListSites)
	r.Post("/", a.CreateSite)
	r.Post("/register-batch", a.CreateRegistrationBatchSites)
	r.Get("/groups", a.ListSiteGroups)
	r.Post("/groups", a.CreateSiteGroup)
	r.Put("/groups", a.RenameSiteGroup)
	r.Delete("/groups", a.DeleteSiteGroup)
	r.Post("/invites/refresh", a.RefreshSiteInvites)
	r.Post("/api-keys/refresh", a.RefreshSiteAPIKeys)
	r.Get("/cleanup-duplicates", a.ListDuplicateSites)
	r.Post("/cleanup-duplicates/merge", a.MergeDuplicateSites)
	r.Post("/refresh-summaries", a.RefreshSiteSummaries)
	r.Post("/storage/analyze", a.AnalyzeLocalStorage)
	r.Post("/test-draft", a.TestSiteDraft)
	r.Get("/{siteID}", a.GetSite)
	r.Put("/{siteID}", a.UpdateSite)
	r.Delete("/{siteID}", a.DeleteSite)
	r.Post("/{siteID}/toggle", a.ToggleSite)
	r.Post("/{siteID}/test", a.TestSite)
	r.Post("/{siteID}/api-keys/refresh", a.RefreshOneSiteAPIKeys)
	r.Post("/{siteID}/balance-probe", a.ProbeSiteBalance)
	r.Post("/{siteID}/checkin", a.SiteCheckin)
	r.Get("/{siteID}/queue", a.SiteQueue)
	r.Post("/{siteID}/queue/{taskKey}/activate", a.ActivateQueueTask)
	r.Get("/{siteID}/totp-preview", a.TotpPreview)
}

func (a *App) ListSites(w http.ResponseWriter, r *http.Request) {
	if _, err := services.SyncGatewayRoutes(a.DB); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var sites []models.Site
	if err := a.DB.Order("updated_at desc, name asc").Find(&sites).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	siteIDs := make([]uint, 0, len(sites))
	for _, site := range sites {
		siteIDs = append(siteIDs, site.ID)
	}
	modelsBySite, err := services.GatewaySupportedModelsBySite(a.DB, siteIDs, false)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := make([]schemas.SiteResponse, 0, len(sites))
	for _, site := range sites {
		out = append(out, siteResponseWithSupportedModels(site, false, modelsBySite[site.ID]))
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) PublicInvites(w http.ResponseWriter, r *http.Request) {
	var sites []models.Site
	if err := a.DB.Where("is_enabled = ?", 1).Order("updated_at desc, name asc").Find(&sites).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := make([]schemas.PublicInviteResponse, 0, len(sites))
	for _, site := range sites {
		inviteLink := strings.TrimSpace(jsonMapString(site.PluginConfig, "invite_link"))
		inviteCode := strings.TrimSpace(jsonMapString(site.PluginConfig, "invite_code"))
		if inviteLink == "" && inviteCode == "" {
			continue
		}
		out = append(out, schemas.PublicInviteResponse{
			SiteID:      site.ID,
			SiteName:    site.Name,
			BaseURL:     site.BaseURL,
			GroupName:   site.GroupName,
			PluginKey:   site.PluginKey,
			InviteLink:  inviteLink,
			InviteCode:  inviteCode,
			PackageName: packageDisplay(site),
		})
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) RefreshSiteInvites(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		SiteIDs     []uint `json:"site_ids"`
		OnlyEnabled bool   `json:"only_enabled"`
	}
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}

	query := a.DB.Model(&models.Site{})
	if len(payload.SiteIDs) > 0 {
		query = query.Where("id IN ?", payload.SiteIDs)
	}
	if payload.OnlyEnabled {
		query = query.Where("is_enabled = ?", true)
	}

	var sites []models.Site
	if err := query.Order("name asc").Find(&sites).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	settings, _ := a.systemSettings()
	timeout := siteRequestTimeoutSeconds(settings.RequestTimeout)
	out := make([]schemas.SiteInviteRefreshResponse, 0, len(sites))
	for _, site := range sites {
		out = append(out, a.refreshOneSiteInvite(r.Context(), site, timeout))
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) RefreshSiteAPIKeys(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		SiteIDs     []uint `json:"site_ids"`
		OnlyEnabled bool   `json:"only_enabled"`
	}
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}

	query := a.DB.Model(&models.Site{})
	if len(payload.SiteIDs) > 0 {
		query = query.Where("id IN ?", payload.SiteIDs)
	}
	if payload.OnlyEnabled {
		query = query.Where("is_enabled = ?", true)
	}

	var sites []models.Site
	if err := query.Order("name asc").Find(&sites).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	settings, _ := a.systemSettings()
	timeout := siteRequestTimeoutSeconds(settings.RequestTimeout)
	out := make([]schemas.SiteAPIKeyRefreshResponse, 0, len(sites))
	for _, site := range sites {
		out = append(out, a.refreshOneSiteAPIKeys(r.Context(), site, timeout))
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) RefreshOneSiteAPIKeys(w http.ResponseWriter, r *http.Request) {
	site, ok := a.getSite(w, chi.URLParam(r, "siteID"))
	if !ok {
		return
	}
	settings, _ := a.systemSettings()
	timeout := siteRequestTimeoutSeconds(settings.RequestTimeout)
	result := a.refreshOneSiteAPIKeys(r.Context(), site, timeout)
	writeJSON(w, http.StatusOK, result)
}

func (a *App) GetSite(w http.ResponseWriter, r *http.Request) {
	if _, err := services.SyncGatewayRoutes(a.DB); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	site, ok := a.getSite(w, chi.URLParam(r, "siteID"))
	if !ok {
		return
	}
	modelsBySite, err := services.GatewaySupportedModelsBySite(a.DB, []uint{site.ID}, false)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, siteResponseWithSupportedModels(site, true, modelsBySite[site.ID]))
}

func (a *App) CreateSite(w http.ResponseWriter, r *http.Request) {
	var payload schemas.SiteCreate
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	site := models.Site{
		Name: payload.Name, BaseURL: payload.BaseURL, PluginKey: payload.PluginKey,
		GroupName: payload.GroupName, IsEnabled: payload.IsEnabled, Notes: payload.Notes,
		Credentials: nonNilJSON(payload.Credentials), PluginConfig: stripSiteSupportedModels(payload.PluginConfig),
	}
	if strings.TrimSpace(site.Name) == "" || strings.TrimSpace(site.BaseURL) == "" || strings.TrimSpace(site.PluginKey) == "" {
		writeError(w, http.StatusBadRequest, "站点名称、地址和插件不能为空")
		return
	}
	if plugin, err := a.PluginManager.Get(site.PluginKey); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	} else if err := plugin.Validate(site); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := a.DB.Create(&site).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	a.syncSiteInviteInfoAsync(site)
	if _, err := services.SyncGatewayRoutes(a.DB); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	modelsBySite, err := services.GatewaySupportedModelsBySite(a.DB, []uint{site.ID}, false)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, siteResponseWithSupportedModels(site, true, modelsBySite[site.ID]))
}

func (a *App) CreateRegistrationBatchSites(w http.ResponseWriter, r *http.Request) {
	var payload schemas.SiteRegistrationBatchCreate
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	if strings.TrimSpace(payload.Name) == "" || strings.TrimSpace(payload.BaseURL) == "" || strings.TrimSpace(payload.PluginKey) == "" {
		writeError(w, http.StatusBadRequest, "站点名称、地址和插件不能为空")
		return
	}
	if payload.Count < 1 || payload.Count > 100 {
		writeError(w, http.StatusBadRequest, "请求次数必须在 1 到 100 之间")
		return
	}
	if err := registrationpattern.Validate(payload.EmailPattern); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if strings.TrimSpace(payload.Password) == "" {
		writeError(w, http.StatusBadRequest, "注册密码不能为空")
		return
	}
	plugin, err := a.PluginManager.Get(payload.PluginKey)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	registrar, ok := plugin.(plugins.AccountRegistrar)
	if !ok || !containsFold(plugin.Meta().Capabilities, "account_registration") {
		writeError(w, http.StatusBadRequest, "当前插件不支持批量注册账号")
		return
	}

	settings, _ := a.systemSettings()
	timeout := siteRequestTimeoutSeconds(settings.RequestTimeout)
	startIndex := payload.StartIndex
	if startIndex <= 0 {
		startIndex = 1
	}
	out := schemas.SiteRegistrationBatchResponse{Items: []schemas.SiteRegistrationBatchItem{}}
	for i := 0; i < payload.Count; i++ {
		index := startIndex + i
		email, err := registrationpattern.Format(payload.EmailPattern, index)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		item := schemas.SiteRegistrationBatchItem{Index: index, Email: email}
		if email == "" {
			item.Message = "邮箱为空"
			out.FailedCount++
			out.Items = append(out.Items, item)
			continue
		}

		draft := models.Site{
			Name:         fmt.Sprintf("%s-%d", strings.TrimSpace(payload.Name), index),
			BaseURL:      payload.BaseURL,
			PluginKey:    payload.PluginKey,
			GroupName:    payload.GroupName,
			IsEnabled:    payload.IsEnabled,
			Notes:        payload.Notes,
			Credentials:  nonNilJSON(payload.Credentials),
			PluginConfig: stripSiteSupportedModels(payload.PluginConfig),
		}
		opCtx, cancel := siteOperationContext(r.Context(), timeout)
		result, err := registrar.RegisterAccount(opCtx, draft, plugins.AccountRegistrationRequest{
			Email:       email,
			Password:    payload.Password,
			AccountName: draft.Name,
		}, timeout)
		cancel()
		if err != nil {
			item.Message = err.Error()
			out.FailedCount++
			out.Items = append(out.Items, item)
			continue
		}
		draft.Credentials = mergeJSON(draft.Credentials, result.Credentials)
		draft.PluginConfig = mergeJSON(draft.PluginConfig, result.PluginConfig)
		if err := plugin.Validate(draft); err != nil {
			item.Message = err.Error()
			out.FailedCount++
			out.Items = append(out.Items, item)
			continue
		}
		if err := a.DB.Create(&draft).Error; err != nil {
			item.Message = err.Error()
			out.FailedCount++
			out.Items = append(out.Items, item)
			continue
		}
		item.OK = true
		item.Message = result.Message
		item.APIKeyCount = result.APIKeyCount
		response := siteResponseWithSupportedModels(draft, true, nil)
		item.Site = &response
		out.CreatedCount++
		out.Items = append(out.Items, item)
	}
	if out.CreatedCount > 0 {
		_, _ = services.SyncGatewayRoutes(a.DB)
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) UpdateSite(w http.ResponseWriter, r *http.Request) {
	site, ok := a.getSite(w, chi.URLParam(r, "siteID"))
	if !ok {
		return
	}
	var payload schemas.SiteUpdate
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	site.Name = payload.Name
	site.BaseURL = payload.BaseURL
	site.PluginKey = payload.PluginKey
	site.GroupName = payload.GroupName
	site.IsEnabled = payload.IsEnabled
	site.Notes = payload.Notes
	previousPluginConfig := cloneJSONMap(nonNilJSON(site.PluginConfig))
	site.Credentials = nonNilJSON(payload.Credentials)
	site.PluginConfig = preserveManualSitePluginConfig(stripSiteSupportedModels(payload.PluginConfig), previousPluginConfig)
	if plugin, err := a.PluginManager.Get(site.PluginKey); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	} else if err := plugin.Validate(site); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := a.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&site).Error; err != nil {
			return err
		}
		if !site.IsEnabled {
			return tx.Where("site_id = ?", site.ID).Delete(&models.GatewayRouteState{}).Error
		}
		return nil
	}); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	a.syncSiteInviteInfoAsync(site)
	if _, err := services.SyncGatewayRoutes(a.DB); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	modelsBySite, err := services.GatewaySupportedModelsBySite(a.DB, []uint{site.ID}, false)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, siteResponseWithSupportedModels(site, true, modelsBySite[site.ID]))
}

func (a *App) DeleteSite(w http.ResponseWriter, r *http.Request) {
	site, ok := a.getSite(w, chi.URLParam(r, "siteID"))
	if !ok {
		return
	}
	if err := a.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("site_id = ?", site.ID).Delete(&models.GatewayRouteState{}).Error; err != nil {
			return err
		}
		return tx.Delete(&site).Error
	}); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) ToggleSite(w http.ResponseWriter, r *http.Request) {
	site, ok := a.getSite(w, chi.URLParam(r, "siteID"))
	if !ok {
		return
	}
	site.IsEnabled = !site.IsEnabled
	if err := a.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&site).Error; err != nil {
			return err
		}
		if !site.IsEnabled {
			return tx.Where("site_id = ?", site.ID).Delete(&models.GatewayRouteState{}).Error
		}
		return nil
	}); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	modelsBySite, err := services.GatewaySupportedModelsBySite(a.DB, []uint{site.ID}, false)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, siteResponseWithSupportedModels(site, true, modelsBySite[site.ID]))
}

func (a *App) ListSiteGroups(w http.ResponseWriter, r *http.Request) {
	var sites []models.Site
	a.DB.Find(&sites)
	counts := map[string]int{}
	for _, site := range sites {
		for _, groupName := range parseGroupNamesGo(site.GroupName) {
			counts[groupName]++
		}
	}
	catalog, err := a.siteGroupCatalog()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	nameSet := map[string]bool{}
	for _, name := range catalog {
		nameSet[name] = true
	}
	for name := range counts {
		nameSet[name] = true
	}
	names := make([]string, 0, len(nameSet))
	for name := range nameSet {
		names = append(names, name)
	}
	sort.Strings(names)
	type group struct {
		Name      string `json:"name"`
		SiteCount int    `json:"site_count"`
		InCatalog bool   `json:"in_catalog"`
		InUse     bool   `json:"in_use"`
	}
	out := make([]group, 0, len(names))
	for _, name := range names {
		out = append(out, group{Name: name, SiteCount: counts[name], InCatalog: containsFold(catalog, name), InUse: counts[name] > 0})
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) CreateSiteGroup(w http.ResponseWriter, r *http.Request) {
	var payload siteGroupPayload
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	name := normalizeGroupName(payload.Name)
	if name == "" {
		writeError(w, http.StatusBadRequest, "分组名称不能为空")
		return
	}
	catalog, err := a.siteGroupCatalog()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if !containsFold(catalog, name) {
		catalog = append(catalog, name)
		if err := a.saveSiteGroupCatalog(catalog); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	a.writeOneSiteGroup(w, http.StatusCreated, name)
}
func (a *App) RenameSiteGroup(w http.ResponseWriter, r *http.Request) {
	var payload siteGroupPayload
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	oldName := normalizeGroupName(payload.OldName)
	newName := normalizeGroupName(payload.NewName)
	if oldName == "" || newName == "" {
		writeError(w, http.StatusBadRequest, "原分组和新分组名称不能为空")
		return
	}
	catalog, err := a.siteGroupCatalog()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	nextCatalog := []string{}
	found := false
	for _, name := range catalog {
		if strings.EqualFold(name, oldName) {
			found = true
			if !containsFold(nextCatalog, newName) {
				nextCatalog = append(nextCatalog, newName)
			}
			continue
		}
		if !strings.EqualFold(name, newName) && !containsFold(nextCatalog, name) {
			nextCatalog = append(nextCatalog, name)
		}
	}
	if !found && !containsFold(nextCatalog, newName) {
		nextCatalog = append(nextCatalog, newName)
	}
	if err := a.renameGroupInSites(oldName, newName); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := a.renameGroupInRoutes(oldName, newName); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := a.saveSiteGroupCatalog(nextCatalog); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	a.writeOneSiteGroup(w, http.StatusOK, newName)
}
func (a *App) DeleteSiteGroup(w http.ResponseWriter, r *http.Request) {
	var payload siteGroupPayload
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	name := normalizeGroupName(payload.Name)
	if name == "" {
		writeError(w, http.StatusBadRequest, "分组名称不能为空")
		return
	}
	catalog, err := a.siteGroupCatalog()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	nextCatalog := []string{}
	for _, item := range catalog {
		if !strings.EqualFold(item, name) && !containsFold(nextCatalog, item) {
			nextCatalog = append(nextCatalog, item)
		}
	}
	if err := a.deleteGroupFromSites(name); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := a.deleteGroupFromRoutes(name); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := a.saveSiteGroupCatalog(nextCatalog); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "message": "分组已删除。"})
}

func (a *App) writeOneSiteGroup(w http.ResponseWriter, status int, name string) {
	var count int
	var sites []models.Site
	_ = a.DB.Select("group_name").Find(&sites).Error
	for _, site := range sites {
		if containsFold(parseGroupNamesGo(site.GroupName), name) {
			count++
		}
	}
	writeJSON(w, status, map[string]any{"name": name, "site_count": count, "in_catalog": true, "in_use": count > 0})
}

func (a *App) siteGroupCatalog() ([]string, error) {
	settings, err := a.systemSettings()
	if errors.Is(err, gorm.ErrRecordNotFound) {
		settings.ID = 1
		settings.SiteGroupCatalog = "[]"
		if createErr := a.DB.Create(&settings).Error; createErr != nil {
			return nil, createErr
		}
		return []string{}, nil
	}
	if err != nil {
		return nil, err
	}
	var raw []string
	if strings.TrimSpace(settings.SiteGroupCatalog) != "" {
		if err := json.Unmarshal([]byte(settings.SiteGroupCatalog), &raw); err != nil {
			return nil, err
		}
	}
	return uniqueGroupNames(raw), nil
}

func (a *App) saveSiteGroupCatalog(groups []string) error {
	data, err := json.Marshal(uniqueGroupNames(groups))
	if err != nil {
		return err
	}
	settings, err := a.systemSettings()
	if errors.Is(err, gorm.ErrRecordNotFound) {
		settings.ID = 1
	} else if err != nil {
		return err
	}
	settings.SiteGroupCatalog = string(data)
	return a.DB.Save(&settings).Error
}

func (a *App) renameGroupInSites(oldName, newName string) error {
	var sites []models.Site
	if err := a.DB.Find(&sites).Error; err != nil {
		return err
	}
	for _, site := range sites {
		next := renameGroupValue(site.GroupName, oldName, newName)
		if next == site.GroupName {
			continue
		}
		if err := a.DB.Model(&site).Update("group_name", next).Error; err != nil {
			return err
		}
	}
	return nil
}

func (a *App) renameGroupInRoutes(oldName, newName string) error {
	var routes []models.GatewayRouteState
	if err := a.DB.Find(&routes).Error; err != nil {
		return err
	}
	for _, route := range routes {
		next := renameGroupValue(route.GroupName, oldName, newName)
		if next == route.GroupName {
			continue
		}
		if err := a.DB.Model(&route).Update("group_name", next).Error; err != nil {
			return err
		}
	}
	return nil
}

func (a *App) deleteGroupFromSites(name string) error {
	var sites []models.Site
	if err := a.DB.Find(&sites).Error; err != nil {
		return err
	}
	for _, site := range sites {
		next := deleteGroupValue(site.GroupName, name)
		if next == site.GroupName {
			continue
		}
		if err := a.DB.Model(&site).Update("group_name", next).Error; err != nil {
			return err
		}
	}
	return nil
}

func (a *App) deleteGroupFromRoutes(name string) error {
	var routes []models.GatewayRouteState
	if err := a.DB.Find(&routes).Error; err != nil {
		return err
	}
	for _, route := range routes {
		next := deleteGroupValue(route.GroupName, name)
		if next == route.GroupName {
			continue
		}
		if err := a.DB.Model(&route).Update("group_name", next).Error; err != nil {
			return err
		}
	}
	return nil
}

func parseGroupNamesGo(value string) []string {
	return uniqueGroupNames(strings.FieldsFunc(value, func(r rune) bool {
		return strings.ContainsRune(",，;/|、\n\r\t", r)
	}))
}

func uniqueGroupNames(values []string) []string {
	out := []string{}
	for _, value := range values {
		name := normalizeGroupName(value)
		if name == "" || containsFold(out, name) {
			continue
		}
		out = append(out, name)
	}
	return out
}

func normalizeGroupName(value string) string {
	return strings.TrimSpace(value)
}

func containsFold(values []string, target string) bool {
	for _, value := range values {
		if strings.EqualFold(strings.TrimSpace(value), strings.TrimSpace(target)) {
			return true
		}
	}
	return false
}

func renameGroupValue(value, oldName, newName string) string {
	items := parseGroupNamesGo(value)
	next := []string{}
	for _, item := range items {
		if strings.EqualFold(item, oldName) {
			if !containsFold(next, newName) {
				next = append(next, newName)
			}
			continue
		}
		if !containsFold(next, item) {
			next = append(next, item)
		}
	}
	return strings.Join(next, ",")
}

func deleteGroupValue(value, name string) string {
	items := parseGroupNamesGo(value)
	next := []string{}
	for _, item := range items {
		if strings.EqualFold(item, name) {
			continue
		}
		if !containsFold(next, item) {
			next = append(next, item)
		}
	}
	return strings.Join(next, ",")
}

func (a *App) ListDuplicateSites(w http.ResponseWriter, r *http.Request) {
	groups, err := duplicateSiteGroups(a.DB)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, groups)
}

func (a *App) MergeDuplicateSites(w http.ResponseWriter, r *http.Request) {
	result, err := mergeDuplicateSites(a.DB)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (a *App) RefreshSiteSummaries(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		SiteIDs     []uint `json:"site_ids"`
		OnlyEnabled bool   `json:"only_enabled"`
	}
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}

	query := a.DB.Model(&models.Site{})
	if len(payload.SiteIDs) > 0 {
		query = query.Where("id IN ?", payload.SiteIDs)
	}
	if payload.OnlyEnabled {
		query = query.Where("is_enabled = ?", true)
	}

	var sites []models.Site
	if err := query.Order("name asc").Find(&sites).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	settings, _ := a.systemSettings()
	timeout := siteRequestTimeoutSeconds(settings.RequestTimeout)
	out := make([]map[string]any, 0, len(sites))
	for _, site := range sites {
		out = append(out, a.refreshOneSite(r.Context(), site, timeout))
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) refreshOneSite(ctx context.Context, site models.Site, timeout int) map[string]any {
	timeout = siteRequestTimeoutSeconds(timeout)
	runAt := time.Now().UTC()
	updates := map[string]any{"last_run_at": &runAt}
	site.LastRunAt = &runAt

	status := "failed"
	var message string

	if plugin, err := a.PluginManager.Get(site.PluginKey); err != nil {
		message = err.Error()
	} else if site.ID != 0 && containsFold(plugin.Meta().Capabilities, "relay_only") {
		result, err := services.ProbeSiteBalance(ctx, a.DB, site.ID, timeout)
		if err != nil {
			message = err.Error()
		} else {
			message = result.Message
			if result.OK {
				status = "success"
				message = "模型出口验证成功：" + result.Message
			}
			site.LastBalance = result.Remaining
			updates["last_balance"] = result.Remaining
			if strings.TrimSpace(result.Unit) != "" {
				site.PluginConfig = mergeJSON(site.PluginConfig, models.JSONMap{
					"balance_unit": services.NormalizeBalanceUnit(result.Unit),
				})
				updates["plugin_config"] = site.PluginConfig
			}
		}
	} else {
		opCtx, cancel := siteOperationContext(ctx, timeout)
		result, err := plugin.FetchAccountStatus(opCtx, site, timeout)
		cancel()
		if err != nil {
			message = err.Error()
		} else {
			a.applySub2APIBalanceFallback(ctx, site, timeout, &result)
			message = result.Message
			if result.LoggedIn {
				status = "success"
			}
			site.LastBalance = result.Balance
			updates["last_balance"] = result.Balance
			pluginConfigUpdates := nonNilJSON(result.UpdatedPluginConfig)
			if result.BalanceUnit != nil && strings.TrimSpace(*result.BalanceUnit) != "" {
				pluginConfigUpdates["balance_unit"] = services.NormalizeBalanceUnit(*result.BalanceUnit)
			}
			if result.PackageDisplay != nil && strings.TrimSpace(*result.PackageDisplay) != "" {
				pluginConfigUpdates["package_display"] = strings.TrimSpace(*result.PackageDisplay)
			}
			mergePackageQuotaPluginConfig(pluginConfigUpdates, result.PackageRemaining, result.PackageTotal, result.PackageUsed, result.PackageUnit)
			if result.InviteLink != nil && strings.TrimSpace(*result.InviteLink) != "" {
				pluginConfigUpdates["invite_link"] = strings.TrimSpace(*result.InviteLink)
			}
			if result.InviteCode != nil && strings.TrimSpace(*result.InviteCode) != "" {
				pluginConfigUpdates["invite_code"] = strings.TrimSpace(*result.InviteCode)
			}
			if len(result.UpdatedCredentials) > 0 {
				mergeCredentialUpdates(&site, result.UpdatedCredentials)
				updates["credentials"] = site.Credentials
			}
			if len(pluginConfigUpdates) > 0 {
				site.PluginConfig = mergeJSON(site.PluginConfig, pluginConfigUpdates)
				updates["plugin_config"] = site.PluginConfig
			}
		}
	}

	site.LastStatus = &status
	site.LastMessage = &message
	updates["last_status"] = &status
	updates["last_message"] = &message

	_ = a.DB.Model(&site).Updates(updates).Error

	summary := map[string]any{
		"site_id":           site.ID,
		"last_status":       site.LastStatus,
		"connection_status": site.LastStatus,
		"last_message":      site.LastMessage,
		"last_balance":      site.LastBalance,
		"balance_display":   balanceDisplayWithUnit(site.LastBalance, jsonMapString(site.PluginConfig, "balance_unit")),
		"package_display":   packageDisplay(site),
		"invite_link":       strings.TrimSpace(jsonMapString(site.PluginConfig, "invite_link")),
		"invite_code":       strings.TrimSpace(jsonMapString(site.PluginConfig, "invite_code")),
		"checkin_status":    site.LastStatus,
		"last_run_at":       site.LastRunAt,
	}
	for key, value := range packageQuotaMap(site) {
		summary[key] = value
	}
	return summary
}

func (a *App) refreshOneSiteInvite(ctx context.Context, site models.Site, timeout int) schemas.SiteInviteRefreshResponse {
	timeout = siteRequestTimeoutSeconds(timeout)
	plugin, err := a.PluginManager.Get(site.PluginKey)
	if err != nil {
		return schemas.SiteInviteRefreshResponse{
			SiteID:              site.ID,
			OK:                  false,
			Message:             err.Error(),
			UpdatedCredentials:  models.JSONMap{},
			UpdatedPluginConfig: models.JSONMap{},
		}
	}
	if containsFold(plugin.Meta().Capabilities, "relay_only") {
		return schemas.SiteInviteRefreshResponse{
			SiteID:              site.ID,
			OK:                  false,
			Message:             "模型供应商站点不提供邀请信息刷新。",
			UpdatedCredentials:  models.JSONMap{},
			UpdatedPluginConfig: models.JSONMap{},
		}
	}
	opCtx, cancel := siteOperationContext(ctx, timeout)
	defer cancel()
	status, err := plugin.FetchAccountStatus(opCtx, site, timeout)
	if err != nil {
		return schemas.SiteInviteRefreshResponse{
			SiteID:              site.ID,
			OK:                  false,
			Message:             err.Error(),
			UpdatedCredentials:  models.JSONMap{},
			UpdatedPluginConfig: models.JSONMap{},
		}
	}

	pluginConfigUpdates := nonNilJSON(status.UpdatedPluginConfig)
	if status.PackageDisplay != nil && strings.TrimSpace(*status.PackageDisplay) != "" {
		pluginConfigUpdates["package_display"] = strings.TrimSpace(*status.PackageDisplay)
	}
	mergePackageQuotaPluginConfig(pluginConfigUpdates, status.PackageRemaining, status.PackageTotal, status.PackageUsed, status.PackageUnit)
	if status.InviteLink != nil && strings.TrimSpace(*status.InviteLink) != "" {
		pluginConfigUpdates["invite_link"] = strings.TrimSpace(*status.InviteLink)
	}
	if status.InviteCode != nil && strings.TrimSpace(*status.InviteCode) != "" {
		pluginConfigUpdates["invite_code"] = strings.TrimSpace(*status.InviteCode)
	}
	updates := map[string]any{}
	updatedCredentials := models.JSONMap{}
	if len(status.UpdatedCredentials) > 0 {
		updatedCredentials = mergeCredentialUpdates(&site, status.UpdatedCredentials)
		updates["credentials"] = site.Credentials
	}
	if len(pluginConfigUpdates) > 0 {
		site.PluginConfig = mergeJSON(site.PluginConfig, pluginConfigUpdates)
		updates["plugin_config"] = site.PluginConfig
	}
	if len(updates) > 0 {
		_ = a.DB.Model(&site).Updates(updates).Error
	}

	message := status.Message
	if strings.TrimSpace(message) == "" {
		message = "邀请信息已刷新。"
	}
	packageUnit := status.PackageUnit
	if packageUnit != nil && strings.TrimSpace(*packageUnit) != "" {
		unit := services.NormalizeBalanceUnit(*packageUnit)
		packageUnit = &unit
	}
	return schemas.SiteInviteRefreshResponse{
		SiteID:              site.ID,
		OK:                  status.InviteLink != nil || status.InviteCode != nil,
		Message:             message,
		InviteLink:          status.InviteLink,
		InviteCode:          status.InviteCode,
		PackageRemaining:    status.PackageRemaining,
		PackageTotal:        status.PackageTotal,
		PackageUsed:         status.PackageUsed,
		PackageUnit:         packageUnit,
		PackageDisplay:      status.PackageDisplay,
		UpdatedCredentials:  updatedCredentials,
		UpdatedPluginConfig: pluginConfigUpdates,
	}
}

func (a *App) refreshOneSiteAPIKeys(ctx context.Context, site models.Site, timeout int) schemas.SiteAPIKeyRefreshResponse {
	timeout = siteRequestTimeoutSeconds(timeout)
	empty := schemas.SiteAPIKeyRefreshResponse{
		SiteID:             site.ID,
		SiteName:           site.Name,
		OK:                 false,
		UpdatedCredentials: models.JSONMap{},
		APIKeyCount:        siteAPIKeyCount(site.Credentials),
	}
	plugin, err := a.PluginManager.Get(site.PluginKey)
	if err != nil {
		empty.Message = err.Error()
		return empty
	}
	if !containsFold(plugin.Meta().Capabilities, "api_key_sync") {
		empty.Message = "当前插件不支持 API Key 同步。"
		return empty
	}
	syncer, ok := plugin.(plugins.APIKeySyncer)
	if !ok {
		empty.Message = "当前插件未实现 API Key 同步。"
		return empty
	}

	opCtx, cancel := siteOperationContext(ctx, timeout)
	defer cancel()
	result, err := syncer.SyncAPIKeys(opCtx, site, timeout)
	if err != nil {
		empty.Message = err.Error()
		return empty
	}

	credentialUpdates := nonNilJSON(result.UpdatedCredentials)
	if result.PrimaryKey != "" {
		credentialUpdates["api_key"] = result.PrimaryKey
	}
	if len(credentialUpdates) > 0 {
		credentialUpdates = mergeCredentialUpdates(&site, credentialUpdates)
		if err := a.DB.Model(&site).Updates(map[string]any{"credentials": site.Credentials}).Error; err != nil {
			empty.Message = err.Error()
			empty.APIKeyCount = siteAPIKeyCount(site.Credentials)
			empty.UpdatedCredentials = credentialUpdates
			return empty
		}
		_, _ = services.SyncGatewayRoutes(a.DB)
	}

	updatedCount := siteAPIKeyCount(credentialUpdates)
	count := siteAPIKeyCount(site.Credentials)
	message := strings.TrimSpace(result.Message)
	if message == "" {
		if updatedCount > 0 {
			message = fmt.Sprintf("已更新 %d 个 API Key。", updatedCount)
		} else {
			message = "未读取到可用 API Key。"
		}
	}
	return schemas.SiteAPIKeyRefreshResponse{
		SiteID:             site.ID,
		SiteName:           site.Name,
		OK:                 updatedCount > 0,
		Message:            message,
		APIKeyCount:        count,
		PrimaryKeyUpdated:  result.PrimaryKey != "",
		UpdatedCredentials: credentialUpdates,
	}
}

func siteAPIKeyCount(credentials models.JSONMap) int {
	if credentials == nil {
		return 0
	}
	switch raw := credentials["api_keys"].(type) {
	case []map[string]any:
		return len(raw)
	case []any:
		count := 0
		for _, item := range raw {
			if item != nil {
				count++
			}
		}
		if count > 0 {
			return count
		}
	}
	if strings.TrimSpace(jsonMapString(credentials, "api_key")) != "" {
		return 1
	}
	return 0
}

func (a *App) AnalyzeLocalStorage(w http.ResponseWriter, r *http.Request) {
	var payload any
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	rawText := ""
	if obj, ok := payload.(map[string]any); ok {
		rawText = strings.TrimSpace(firstNonEmpty(anyString(obj["raw_text"]), anyString(obj["rawText"])))
	}
	if rawText == "" {
		data, err := json.Marshal(payload)
		if err != nil {
			writeError(w, http.StatusBadRequest, "请求格式错误")
			return
		}
		rawText = string(data)
	}
	result, err := analyzeBrowserStorage(rawText)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func analyzeBrowserStorage(raw string) (map[string]any, error) {
	payload, err := parseBrowserStoragePayload(raw)
	if err != nil {
		return nil, err
	}
	localStorage := firstStringMapFromAny(payload["localStorage"], payload["local_storage"])
	sessionStorage := firstStringMapFromAny(payload["sessionStorage"], payload["session_storage"])
	if len(localStorage) == 0 && len(sessionStorage) == 0 && looksLikeStorageMap(payload) {
		localStorage = stringMapFromAny(payload)
	}
	cookie := strings.TrimSpace(firstNonEmpty(anyString(payload["cookie"]), anyString(payload["cookie_header"])))
	title := strings.TrimSpace(firstNonEmpty(anyString(payload["title"]), anyString(payload["page_title"])))
	pageURL := strings.TrimSpace(firstNonEmpty(anyString(payload["url"]), anyString(payload["page_url"])))
	suggested := map[string]string{}
	matched := []string{}

	if cookie != "" {
		suggested["cookie"] = cookie
		matched = append(matched, "cookie")
	}
	if ua := strings.TrimSpace(firstNonEmpty(anyString(payload["userAgent"]), anyString(payload["user_agent"]))); ua != "" {
		suggested["user_agent"] = ua
		matched = append(matched, "userAgent")
	}

	combined := map[string]string{}
	for k, v := range localStorage {
		combined[k] = v
	}
	for k, v := range sessionStorage {
		if _, ok := combined[k]; !ok {
			combined[k] = v
		}
	}
	for key, value := range combined {
		lower := strings.ToLower(key)
		if strings.Contains(lower, "refresh") && strings.Contains(lower, "token") && strings.TrimSpace(value) != "" {
			suggested["refresh_token"] = strings.TrimSpace(value)
			matched = append(matched, key)
			continue
		}
		if (lower == "auth_token" || lower == "access_token" || lower == "token" || strings.Contains(lower, "jwt")) && strings.TrimSpace(value) != "" {
			suggested["access_token"] = strings.TrimSpace(value)
			matched = append(matched, key)
			fillAccountFromJWT(suggested, value)
			continue
		}
		if lower == "auth_user" || strings.Contains(lower, "user") || strings.Contains(lower, "profile") {
			fillAccountFromJSON(suggested, value)
		}
	}

	pluginKey := strings.TrimSpace(firstNonEmpty(anyString(payload["pluginKey"]), anyString(payload["plugin_key"])))
	if pluginKey == "" {
		pluginKey = inferStoragePlugin(pageURL, title, combined)
	}
	baseURL := originURL(pageURL)
	if config := firstMapFromAny(payload["appConfig"], payload["app_config"]); config != nil {
		if apiBase := firstNonEmpty(
			anyString(config["api_base_url"]),
			anyString(config["apiBaseUrl"]),
			anyString(config["base_url"]),
			anyString(config["baseURL"]),
		); apiBase != "" {
			baseURL = apiBase
		}
	}
	if tokenPayloads := firstMapFromAny(payload["tokenPayloads"], payload["token_payloads"]); tokenPayloads != nil {
		for key, value := range tokenPayloads {
			if obj, ok := value.(map[string]any); ok {
				fillAccountFromMap(suggested, obj)
				matched = append(matched, "tokenPayloads."+key)
			}
		}
	}
	if suggested["email"] != "" && suggested["username"] == "" {
		suggested["username"] = suggested["email"]
	}
	if suggested["username"] != "" && suggested["email"] == "" && strings.Contains(suggested["username"], "@") {
		suggested["email"] = suggested["username"]
	}
	if suggested["account"] == "" {
		suggested["account"] = firstNonEmpty(suggested["email"], suggested["username"], suggested["user_id"])
	}

	return map[string]any{
		"parsed_items":            len(localStorage) + len(sessionStorage),
		"page_url":                pageURL,
		"page_title":              title,
		"cookie_header":           cookie,
		"local_storage":           localStorage,
		"session_storage":         sessionStorage,
		"suggested_credentials":   suggested,
		"suggested_plugin_key":    pluginKey,
		"suggested_site_name":     firstNonEmpty(title, hostLabel(pageURL)),
		"suggested_base_url":      baseURL,
		"suggested_plugin_config": map[string]any{},
		"matched_keys":            uniqueStrings(matched),
		"message":                 "浏览器存储解析完成。",
	}, nil
}

func parseBrowserStoragePayload(raw string) (map[string]any, error) {
	candidates := browserStorageRawCandidates(raw)
	for _, candidate := range candidates {
		var payload map[string]any
		if err := json.Unmarshal([]byte(candidate), &payload); err == nil {
			return payload, nil
		}
		var quoted string
		if err := json.Unmarshal([]byte(candidate), &quoted); err == nil {
			nested, err := parseBrowserStoragePayload(quoted)
			if err == nil {
				return nested, nil
			}
		}
	}
	return nil, errors.New("粘贴内容不是有效 JSON 或 JSON 字符串")
}

func browserStorageRawCandidates(raw string) []string {
	raw = strings.TrimSpace(strings.TrimPrefix(raw, "\ufeff"))
	if raw == "" {
		return nil
	}
	out := []string{raw}
	add := func(value string) {
		value = strings.TrimSpace(value)
		if value == "" || containsFold(out, value) {
			return
		}
		out = append(out, value)
	}
	if len(raw) >= 2 {
		first := raw[0]
		last := raw[len(raw)-1]
		if (first == '\'' && last == '\'') || (first == '`' && last == '`') {
			inner := raw[1 : len(raw)-1]
			add(inner)
			add(strings.ReplaceAll(inner, `\"`, `"`))
			if unquoted, err := strconv.Unquote(`"` + inner + `"`); err == nil {
				add(unquoted)
			}
		}
	}
	if strings.Contains(raw, `\"`) {
		if unquoted, err := strconv.Unquote(`"` + strings.ReplaceAll(raw, `"`, `\"`) + `"`); err == nil {
			add(unquoted)
		}
		add(strings.ReplaceAll(raw, `\"`, `"`))
	}
	return out
}

func firstStringMapFromAny(values ...any) map[string]string {
	for _, value := range values {
		out := stringMapFromAny(value)
		if len(out) > 0 {
			return out
		}
	}
	return map[string]string{}
}

func stringMapFromAny(value any) map[string]string {
	out := map[string]string{}
	obj, ok := value.(map[string]any)
	if !ok {
		return out
	}
	for k, v := range obj {
		out[k] = anyString(v)
	}
	return out
}

func firstMapFromAny(values ...any) map[string]any {
	for _, value := range values {
		if obj, ok := value.(map[string]any); ok {
			return obj
		}
	}
	return nil
}

func looksLikeStorageMap(payload map[string]any) bool {
	for key := range payload {
		lower := strings.ToLower(key)
		if lower == "auth_token" || lower == "access_token" || lower == "refresh_token" || lower == "auth_user" || strings.Contains(lower, "jwt") {
			return true
		}
	}
	return false
}

func anyString(value any) string {
	if value == nil {
		return ""
	}
	switch typed := value.(type) {
	case string:
		return typed
	default:
		return strings.TrimSpace(fmtAny(typed))
	}
}

func fmtAny(value any) string {
	data, err := json.Marshal(value)
	if err == nil && string(data) != "null" {
		return strings.Trim(string(data), `"`)
	}
	return ""
}

func fillAccountFromJSON(out map[string]string, raw string) {
	var obj map[string]any
	if err := json.Unmarshal([]byte(raw), &obj); err != nil {
		return
	}
	fillAccountFromMap(out, obj)
}

func fillAccountFromJWT(out map[string]string, token string) {
	token = strings.TrimSpace(strings.TrimPrefix(token, "Bearer "))
	parts := strings.Split(token, ".")
	if len(parts) < 2 {
		return
	}
	data, err := base64RawURLDecode(parts[1])
	if err != nil {
		return
	}
	var obj map[string]any
	if err := json.Unmarshal(data, &obj); err != nil {
		return
	}
	fillAccountFromMap(out, obj)
}

func base64RawURLDecode(value string) ([]byte, error) {
	if rem := len(value) % 4; rem != 0 {
		value += strings.Repeat("=", 4-rem)
	}
	return base64.URLEncoding.DecodeString(value)
}

func fillAccountFromMap(out map[string]string, obj map[string]any) {
	for _, pair := range [][2]string{{"email", "email"}, {"username", "username"}, {"user_id", "user_id"}, {"id", "user_id"}, {"sub", "user_id"}} {
		if out[pair[1]] == "" {
			out[pair[1]] = strings.TrimSpace(anyString(obj[pair[0]]))
		}
	}
}

func inferStoragePlugin(pageURL, title string, storage map[string]string) string {
	text := strings.ToLower(pageURL + " " + title)
	if _, ok := storage["auth_token"]; ok || strings.Contains(text, "sub2api") || strings.Contains(text, "耀闪") {
		return "sub2api-platform"
	}
	if strings.Contains(text, "newapi") || strings.Contains(text, "oneapi") || strings.Contains(text, "yellowpeach") {
		return "yellowpeach-newapi"
	}
	return ""
}

func originURL(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}
	return parsed.Scheme + "://" + parsed.Host
}

func hostLabel(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil {
		return ""
	}
	return parsed.Host
}

func uniqueStrings(values []string) []string {
	out := []string{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || containsFold(out, value) {
			continue
		}
		out = append(out, value)
	}
	return out
}
func (a *App) TestSite(w http.ResponseWriter, r *http.Request) {
	site, ok := a.getSite(w, chi.URLParam(r, "siteID"))
	if !ok {
		return
	}
	a.siteHealth(w, r.Context(), site, siteHealthOptions{Persist: true})
}
func (a *App) TestSiteDraft(w http.ResponseWriter, r *http.Request) {
	var payload schemas.SiteDraftTestRequest
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	site, ok := a.siteFromDraftPayload(w, payload)
	if !ok {
		return
	}
	a.siteHealth(w, r.Context(), site, siteHealthOptions{})
}

func (a *App) siteFromDraftPayload(w http.ResponseWriter, payload schemas.SiteDraftTestRequest) (models.Site, bool) {
	site := models.Site{}
	if payload.SiteID != 0 {
		if err := a.DB.First(&site, payload.SiteID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				writeError(w, http.StatusNotFound, "站点不存在")
				return site, false
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return site, false
		}
	}
	site.BaseURL = payload.BaseURL
	site.PluginKey = payload.PluginKey
	site.Credentials = nonNilJSON(payload.Credentials)
	site.PluginConfig = stripSiteSupportedModels(payload.PluginConfig)
	return site, true
}

func (a *App) ProbeSiteBalance(w http.ResponseWriter, r *http.Request) {
	site, ok := a.getSite(w, chi.URLParam(r, "siteID"))
	if !ok {
		return
	}
	settings, _ := a.systemSettings()
	result, err := services.ProbeSiteBalance(r.Context(), a.DB, site.ID, siteRequestTimeoutSeconds(settings.RequestTimeout))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, balanceProbeResponse(result))
}

func (a *App) applySub2APIBalanceFallback(ctx context.Context, site models.Site, timeout int, status *plugins.AccountStatus) {
	if status == nil || status.Balance != nil || site.ID == 0 || !strings.EqualFold(strings.TrimSpace(site.PluginKey), "sub2api-platform") {
		return
	}
	if status.PackageRemaining != nil {
		status.Balance = status.PackageRemaining
		if status.BalanceUnit == nil && status.PackageUnit != nil && strings.TrimSpace(*status.PackageUnit) != "" {
			unit := services.NormalizeBalanceUnit(*status.PackageUnit)
			status.BalanceUnit = &unit
		}
		return
	}
	result, err := services.ProbeSiteBalance(ctx, a.DB, site.ID, timeout)
	if err != nil || !result.OK || result.Remaining == nil {
		return
	}
	status.Balance = result.Remaining
	if strings.TrimSpace(result.Unit) != "" {
		unit := services.NormalizeBalanceUnit(result.Unit)
		status.BalanceUnit = &unit
	}
	if strings.TrimSpace(status.Message) != "" {
		status.Message = strings.TrimSpace(status.Message) + " API Key 余额兜底读取成功。"
	}
}
func (a *App) getSite(w http.ResponseWriter, rawID string) (models.Site, bool) {
	var site models.Site
	if err := a.DB.First(&site, rawID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, http.StatusNotFound, "站点不存在")
			return site, false
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return site, false
	}
	return site, true
}

func (a *App) siteHealth(w http.ResponseWriter, ctx context.Context, site models.Site, options siteHealthOptions) {
	plugin, err := a.PluginManager.Get(site.PluginKey)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	settings, _ := a.systemSettings()
	timeout := siteRequestTimeoutSeconds(settings.RequestTimeout)
	shouldPersist := options.Persist && site.ID != 0
	if shouldPersist && containsFold(plugin.Meta().Capabilities, "relay_only") {
		result, err := services.ProbeSiteBalance(ctx, a.DB, site.ID, timeout)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		statusText := "failed"
		message := result.Message
		if result.OK {
			statusText = "success"
			message = "模型出口验证成功：" + result.Message
		}
		runAt := time.Now().UTC()
		_ = a.DB.Model(&site).Updates(map[string]any{
			"last_status":  &statusText,
			"last_message": &message,
			"last_run_at":  &runAt,
		}).Error
		var balanceUnit *string
		if strings.TrimSpace(result.Unit) != "" {
			unit := services.NormalizeBalanceUnit(result.Unit)
			balanceUnit = &unit
		}
		account := strings.TrimSpace(jsonMapString(site.Credentials, "account"))
		if account == "" {
			account = strings.TrimSpace(site.Name)
		}
		var accountName *string
		if account != "" {
			accountName = &account
		}
		writeJSON(w, http.StatusOK, schemas.SiteHealthResponse{
			SiteID:              site.ID,
			LoggedIn:            result.OK,
			Message:             message,
			Balance:             result.Remaining,
			BalanceUnit:         balanceUnit,
			AccountName:         accountName,
			UpdatedCredentials:  models.JSONMap{},
			UpdatedPluginConfig: models.JSONMap{},
		})
		return
	}
	opCtx, cancel := siteOperationContext(ctx, timeout)
	defer cancel()
	status, err := plugin.FetchAccountStatus(opCtx, site, timeout)
	if err != nil {
		if shouldPersist {
			status := "failed"
			message := err.Error()
			runAt := time.Now().UTC()
			_ = a.DB.Model(&site).Updates(map[string]any{
				"last_status":  &status,
				"last_message": &message,
				"last_run_at":  &runAt,
			}).Error
		}
		writeJSON(w, http.StatusOK, schemas.SiteHealthResponse{SiteID: site.ID, LoggedIn: false, Message: err.Error(), UpdatedCredentials: models.JSONMap{}, UpdatedPluginConfig: models.JSONMap{}})
		return
	}
	a.applySub2APIBalanceFallback(ctx, site, timeout, &status)
	pluginConfigUpdates := nonNilJSON(status.UpdatedPluginConfig)
	if status.BalanceUnit != nil && strings.TrimSpace(*status.BalanceUnit) != "" {
		pluginConfigUpdates["balance_unit"] = services.NormalizeBalanceUnit(*status.BalanceUnit)
	}
	if status.PackageDisplay != nil && strings.TrimSpace(*status.PackageDisplay) != "" {
		pluginConfigUpdates["package_display"] = strings.TrimSpace(*status.PackageDisplay)
	}
	mergePackageQuotaPluginConfig(pluginConfigUpdates, status.PackageRemaining, status.PackageTotal, status.PackageUsed, status.PackageUnit)
	if status.InviteLink != nil && strings.TrimSpace(*status.InviteLink) != "" {
		pluginConfigUpdates["invite_link"] = strings.TrimSpace(*status.InviteLink)
	}
	if status.InviteCode != nil && strings.TrimSpace(*status.InviteCode) != "" {
		pluginConfigUpdates["invite_code"] = strings.TrimSpace(*status.InviteCode)
	}
	updatedCredentials := models.JSONMap{}
	if len(status.UpdatedCredentials) > 0 {
		updatedCredentials = mergeCredentialUpdates(&site, status.UpdatedCredentials)
	}
	if len(pluginConfigUpdates) > 0 {
		site.PluginConfig = mergeJSON(site.PluginConfig, pluginConfigUpdates)
	}
	if shouldPersist {
		statusText := "failed"
		if status.LoggedIn {
			statusText = "success"
		}
		runAt := time.Now().UTC()
		updates := map[string]any{
			"last_status":  &statusText,
			"last_message": &status.Message,
			"last_balance": status.Balance,
			"last_run_at":  &runAt,
		}
		if len(status.UpdatedCredentials) > 0 {
			updates["credentials"] = site.Credentials
		}
		if len(pluginConfigUpdates) > 0 {
			updates["plugin_config"] = site.PluginConfig
		}
		_ = a.DB.Model(&site).Updates(updates).Error
	}
	balanceUnit := status.BalanceUnit
	if balanceUnit != nil && strings.TrimSpace(*balanceUnit) != "" {
		unit := services.NormalizeBalanceUnit(*balanceUnit)
		balanceUnit = &unit
	}
	packageUnit := status.PackageUnit
	if packageUnit != nil && strings.TrimSpace(*packageUnit) != "" {
		unit := services.NormalizeBalanceUnit(*packageUnit)
		packageUnit = &unit
	}
	writeJSON(w, http.StatusOK, schemas.SiteHealthResponse{
		SiteID:              site.ID,
		LoggedIn:            status.LoggedIn,
		Message:             status.Message,
		Balance:             status.Balance,
		BalanceUnit:         balanceUnit,
		PackageRemaining:    status.PackageRemaining,
		PackageTotal:        status.PackageTotal,
		PackageUsed:         status.PackageUsed,
		PackageUnit:         packageUnit,
		PackageDisplay:      status.PackageDisplay,
		AccountName:         status.AccountName,
		InviteLink:          status.InviteLink,
		InviteCode:          status.InviteCode,
		UpdatedCredentials:  updatedCredentials,
		UpdatedPluginConfig: pluginConfigUpdates,
	})
}
