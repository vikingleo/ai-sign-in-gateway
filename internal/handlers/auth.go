package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"ai-sign-in-gateway/internal/httpx"
	"ai-sign-in-gateway/internal/middleware"
	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/schemas"
	"ai-sign-in-gateway/internal/security"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

const maxAdminUsernameRunes = 50

func (a *App) Login(w http.ResponseWriter, r *http.Request) {
	var payload schemas.LoginRequest
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	username, validUsername := validAdminUsername(payload.Username)
	var admin models.AdminUser
	err := gorm.ErrRecordNotFound
	if validUsername {
		err = a.DB.Where("username = ?", username).First(&admin).Error
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if errors.Is(err, gorm.ErrRecordNotFound) || !security.VerifyPassword(payload.Password, admin.PasswordHash) {
		writeError(w, http.StatusUnauthorized, "用户名或密码错误")
		return
	}
	if !admin.IsEnabled {
		writeError(w, http.StatusUnauthorized, "账号已停用")
		return
	}
	now := time.Now().UTC()
	if err := a.DB.Model(&admin).Update("last_login_at", now).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	admin.LastLoginAt = &now
	token, err := security.CreateAdminAccessToken(a.Cfg, admin.ID, admin.Username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, schemas.TokenResponse{AccessToken: token, TokenType: "bearer"})
}

func (a *App) Me(w http.ResponseWriter, r *http.Request) {
	admin := middleware.CurrentAdmin(r)
	if admin == nil {
		writeError(w, http.StatusUnauthorized, "登录状态失效，请重新登录。")
		return
	}
	writeJSON(w, http.StatusOK, adminUserResponse(*admin))
}

func (a *App) UpdateAccount(w http.ResponseWriter, r *http.Request) {
	admin := middleware.CurrentAdmin(r)
	if admin == nil {
		writeError(w, http.StatusUnauthorized, "登录状态失效，请重新登录。")
		return
	}

	var payload schemas.AdminAccountUpdateRequest
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	if !security.VerifyPassword(payload.CurrentPassword, admin.PasswordHash) {
		writeError(w, http.StatusBadRequest, "当前密码不正确")
		return
	}

	newUsername := strings.TrimSpace(payload.NewUsername)
	newPassword := payload.NewPassword
	if newUsername == "" && newPassword == "" {
		writeError(w, http.StatusBadRequest, "请至少修改用户名或密码中的一项")
		return
	}
	if newUsername != "" {
		validUsername, ok := validAdminUsername(payload.NewUsername)
		if !ok {
			writeError(w, http.StatusBadRequest, "用户名不能为空，长度不能超过 50 个字符，且不能包含控制字符")
			return
		}
		newUsername = validUsername
	}
	if newPassword != "" && (len(newPassword) < 6 || len(newPassword) > 128) {
		writeError(w, http.StatusBadRequest, "新密码长度需在 6-128 之间")
		return
	}

	var fresh models.AdminUser
	if err := a.DB.First(&fresh, admin.ID).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if newUsername != "" && newUsername != fresh.Username {
		var existing models.AdminUser
		err := a.DB.Where("username = ? AND id <> ?", newUsername, fresh.ID).First(&existing).Error
		if err == nil {
			writeError(w, http.StatusBadRequest, "该用户名已被占用")
			return
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		fresh.Username = newUsername
	}

	if newPassword != "" {
		if security.VerifyPassword(newPassword, fresh.PasswordHash) {
			writeError(w, http.StatusBadRequest, "新密码不能与当前密码相同")
			return
		}
		hashed, err := security.HashPassword(newPassword)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		fresh.PasswordHash = hashed
	}

	if err := a.DB.Save(&fresh).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	token, err := security.CreateAdminAccessToken(a.Cfg, fresh.ID, fresh.Username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, schemas.AdminAccountUpdateResponse{
		User:        adminUserResponse(fresh),
		AccessToken: token,
		TokenType:   "bearer",
	})
}

func (a *App) AdminUserRoutes(r chi.Router) {
	r.Get("/", a.ListAdminUsers)
	r.Post("/", a.CreateAdminUser)
	r.Put("/{adminID}", a.UpdateAdminUser)
	r.Delete("/{adminID}", a.DeleteAdminUser)
}

func (a *App) ListAdminUsers(w http.ResponseWriter, r *http.Request) {
	if !requireSuperAdmin(w, r) {
		return
	}
	var admins []models.AdminUser
	if err := a.DB.Order("id ASC").Find(&admins).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := make([]schemas.AdminUserResponse, 0, len(admins))
	for _, admin := range admins {
		out = append(out, adminUserResponse(admin))
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) CreateAdminUser(w http.ResponseWriter, r *http.Request) {
	if !requireSuperAdmin(w, r) {
		return
	}
	var payload schemas.AdminUserCreateRequest
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	username, ok := validAdminUsername(payload.Username)
	if !ok {
		writeError(w, http.StatusBadRequest, "用户名不能为空，长度不能超过 50 个字符，且不能包含控制字符")
		return
	}
	if err := validateAdminPassword(payload.Password); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	role := strings.TrimSpace(payload.Role)
	if role == "" {
		role = models.AdminRoleAdmin
	}
	if !models.IsAdminRole(role) {
		writeError(w, http.StatusBadRequest, "管理员角色无效")
		return
	}
	isEnabled := true
	if payload.IsEnabled != nil {
		isEnabled = *payload.IsEnabled
	}
	if err := a.ensureAdminUsernameAvailable(username, 0); err != nil {
		writeAdminAvailabilityError(w, err)
		return
	}
	hashed, err := security.HashPassword(payload.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	admin := models.AdminUser{
		Username:     username,
		PasswordHash: hashed,
		Role:         role,
		IsEnabled:    isEnabled,
	}
	now := time.Now().UTC()
	if err := a.DB.Model(&models.AdminUser{}).Create(map[string]any{
		"username":      admin.Username,
		"password_hash": admin.PasswordHash,
		"role":          admin.Role,
		"is_enabled":    admin.IsEnabled,
		"created_at":    now,
		"updated_at":    now,
	}).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := a.DB.Where("username = ?", username).First(&admin).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, adminUserResponse(admin))
}

func (a *App) UpdateAdminUser(w http.ResponseWriter, r *http.Request) {
	current := middleware.CurrentAdmin(r)
	if current == nil || current.Role != models.AdminRoleSuper {
		writeError(w, http.StatusForbidden, "仅超级管理员可管理用户")
		return
	}
	adminID, ok := adminIDParam(w, r)
	if !ok {
		return
	}
	var target models.AdminUser
	if err := a.DB.First(&target, adminID).Error; err != nil {
		writeAdminLoadError(w, err)
		return
	}
	var payload schemas.AdminUserUpdateRequest
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	updates := map[string]any{}
	if strings.TrimSpace(payload.Username) != "" {
		username, ok := validAdminUsername(payload.Username)
		if !ok {
			writeError(w, http.StatusBadRequest, "用户名不能为空，长度不能超过 50 个字符，且不能包含控制字符")
			return
		}
		if username != target.Username {
			if target.ID == current.ID {
				writeError(w, http.StatusBadRequest, "请通过账号设置修改当前登录账号")
				return
			}
			if err := a.ensureAdminUsernameAvailable(username, target.ID); err != nil {
				writeAdminAvailabilityError(w, err)
				return
			}
			updates["username"] = username
		}
	}
	if strings.TrimSpace(payload.Role) != "" {
		role := strings.TrimSpace(payload.Role)
		if !models.IsAdminRole(role) {
			writeError(w, http.StatusBadRequest, "管理员角色无效")
			return
		}
		if target.ID == current.ID && role != target.Role {
			writeError(w, http.StatusBadRequest, "请通过账号设置修改当前登录账号")
			return
		}
		updates["role"] = role
	}
	if payload.IsEnabled != nil {
		if target.ID == current.ID && !*payload.IsEnabled {
			writeError(w, http.StatusBadRequest, "不能停用当前登录账号")
			return
		}
		updates["is_enabled"] = *payload.IsEnabled
	}
	if strings.TrimSpace(payload.NewPassword) != "" {
		if target.ID == current.ID {
			writeError(w, http.StatusBadRequest, "请通过账号设置修改当前登录账号")
			return
		}
		if err := validateAdminPassword(payload.NewPassword); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		hashed, err := security.HashPassword(payload.NewPassword)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		updates["password_hash"] = hashed
	}
	if len(updates) == 0 {
		writeJSON(w, http.StatusOK, adminUserResponse(target))
		return
	}
	if err := a.updateAdminUserWithLastSuperGuard(target, updates); err != nil {
		writeAdminMutationError(w, err)
		return
	}
	if err := a.DB.First(&target, target.ID).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, adminUserResponse(target))
}

func (a *App) DeleteAdminUser(w http.ResponseWriter, r *http.Request) {
	current := middleware.CurrentAdmin(r)
	if current == nil || current.Role != models.AdminRoleSuper {
		writeError(w, http.StatusForbidden, "仅超级管理员可管理用户")
		return
	}
	adminID, ok := adminIDParam(w, r)
	if !ok {
		return
	}
	if current.ID == adminID {
		writeError(w, http.StatusBadRequest, "不能删除当前登录账号")
		return
	}
	var target models.AdminUser
	if err := a.DB.First(&target, adminID).Error; err != nil {
		writeAdminLoadError(w, err)
		return
	}
	if err := a.deleteAdminUserWithLastSuperGuard(target); err != nil {
		writeAdminMutationError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func requireSuperAdmin(w http.ResponseWriter, r *http.Request) bool {
	admin := middleware.CurrentAdmin(r)
	if admin == nil {
		writeError(w, http.StatusUnauthorized, "登录状态失效，请重新登录。")
		return false
	}
	if admin.Role != models.AdminRoleSuper {
		writeError(w, http.StatusForbidden, "仅超级管理员可管理用户")
		return false
	}
	return true
}

func adminIDParam(w http.ResponseWriter, r *http.Request) (uint, bool) {
	value, err := strconv.ParseUint(chi.URLParam(r, "adminID"), 10, 64)
	if err != nil || value == 0 {
		writeError(w, http.StatusBadRequest, "管理员 ID 无效")
		return 0, false
	}
	return uint(value), true
}

func adminUserResponse(admin models.AdminUser) schemas.AdminUserResponse {
	return schemas.AdminUserResponse{
		ID:          admin.ID,
		Username:    admin.Username,
		Role:        models.NormalizeAdminRole(admin.Role),
		IsEnabled:   admin.IsEnabled,
		LastLoginAt: admin.LastLoginAt,
		CreatedAt:   admin.CreatedAt,
		UpdatedAt:   admin.UpdatedAt,
	}
}

func validAdminUsername(value string) (string, bool) {
	username := strings.TrimSpace(value)
	if username == "" || utf8.RuneCountInString(username) > maxAdminUsernameRunes {
		return "", false
	}
	for _, r := range username {
		if unicode.IsControl(r) {
			return "", false
		}
	}
	return username, true
}

func validateAdminPassword(value string) error {
	if len(value) < 6 || len(value) > 128 {
		return errors.New("密码长度需在 6-128 之间")
	}
	return nil
}

func (a *App) ensureAdminUsernameAvailable(username string, excludeID uint) error {
	var existing models.AdminUser
	query := a.DB.Where("username = ?", username)
	if excludeID > 0 {
		query = query.Where("id <> ?", excludeID)
	}
	err := query.First(&existing).Error
	if err == nil {
		return errAdminUsernameTaken
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	}
	return err
}

func (a *App) ensureAnotherEnabledSuperAdmin(excludeID uint) error {
	return ensureAnotherEnabledSuperAdmin(a.DB, excludeID)
}

func ensureAnotherEnabledSuperAdmin(db *gorm.DB, excludeID uint) error {
	var count int64
	if err := db.Model(&models.AdminUser{}).
		Where("role = ? AND is_enabled = ? AND id <> ?", models.AdminRoleSuper, true, excludeID).
		Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return errAdminLastSuper
	}
	return nil
}

func (a *App) updateAdminUserWithLastSuperGuard(target models.AdminUser, updates map[string]any) error {
	return a.DB.Transaction(func(tx *gorm.DB) error {
		var fresh models.AdminUser
		if err := tx.First(&fresh, target.ID).Error; err != nil {
			return err
		}
		if fresh.Role == models.AdminRoleSuper && demotesOrDisablesSuper(updates) {
			if err := ensureAnotherEnabledSuperAdmin(tx, target.ID); err != nil {
				return err
			}
		}
		return tx.Model(&fresh).Updates(updates).Error
	})
}

func (a *App) deleteAdminUserWithLastSuperGuard(target models.AdminUser) error {
	return a.DB.Transaction(func(tx *gorm.DB) error {
		var fresh models.AdminUser
		if err := tx.First(&fresh, target.ID).Error; err != nil {
			return err
		}
		if fresh.Role == models.AdminRoleSuper {
			if err := ensureAnotherEnabledSuperAdmin(tx, fresh.ID); err != nil {
				return err
			}
		}
		return tx.Delete(&fresh).Error
	})
}

func demotesOrDisablesSuper(updates map[string]any) bool {
	if role, ok := updates["role"].(string); ok && role != models.AdminRoleSuper {
		return true
	}
	if enabled, ok := updates["is_enabled"].(bool); ok && !enabled {
		return true
	}
	return false
}

var (
	errAdminUsernameTaken = errors.New("admin username taken")
	errAdminLastSuper     = errors.New("last super admin")
)

func writeAdminAvailabilityError(w http.ResponseWriter, err error) {
	if errors.Is(err, errAdminUsernameTaken) {
		writeError(w, http.StatusBadRequest, "该用户名已被占用")
		return
	}
	writeError(w, http.StatusInternalServerError, err.Error())
}

func writeAdminLastSuperError(w http.ResponseWriter, err error) {
	if errors.Is(err, errAdminLastSuper) {
		writeError(w, http.StatusBadRequest, "至少需要保留一个启用的超级管理员")
		return
	}
	writeError(w, http.StatusInternalServerError, err.Error())
}

func writeAdminMutationError(w http.ResponseWriter, err error) {
	if errors.Is(err, errAdminLastSuper) {
		writeAdminLastSuperError(w, err)
		return
	}
	writeError(w, http.StatusInternalServerError, err.Error())
}

func writeAdminLoadError(w http.ResponseWriter, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		writeError(w, http.StatusNotFound, "管理员不存在")
		return
	}
	writeError(w, http.StatusInternalServerError, err.Error())
}
