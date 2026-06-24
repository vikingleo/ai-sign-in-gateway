package seed

import (
	"errors"
	"strings"

	"ai-sign-in-gateway/internal/config"
	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/security"
	"gorm.io/gorm"
)

func InitialData(db *gorm.DB, cfg config.Config) error {
	var admin models.AdminUser
	err := db.Where("username = ?", cfg.DefaultAdminUsername).First(&admin).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		passwordHash, err := security.HashPassword(cfg.DefaultAdminPassword)
		if err != nil {
			return err
		}
		if err := db.Create(&models.AdminUser{
			Username:     cfg.DefaultAdminUsername,
			PasswordHash: passwordHash,
			Role:         models.AdminRoleSuper,
			IsEnabled:    true,
		}).Error; err != nil {
			return err
		}
	} else if admin.Role == "" {
		if err := db.Model(&admin).Updates(map[string]any{
			"role":       models.AdminRoleSuper,
			"is_enabled": true,
		}).Error; err != nil {
			return err
		}
	}

	return EnsureSystemSettings(db, cfg)
}

func EnsureSystemSettings(db *gorm.DB, cfg config.Config) error {
	var settings models.SystemSetting
	err := db.First(&settings, 1).Error
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	timezone := strings.TrimSpace(cfg.SchedulerTimezone)
	if timezone == "" {
		timezone = "Asia/Shanghai"
	}
	return db.Create(&models.SystemSetting{
		ID:                                 1,
		Timezone:                           timezone,
		ScheduleEnabled:                    true,
		DailyRunTime:                       "09:00",
		CheckinConcurrency:                 1,
		CheckinGlobalConcurrency:           4,
		CheckinIntervalSeconds:             1,
		RetryCount:                         1,
		RequestTimeout:                     20,
		OnlyEnabledSites:                   true,
		DesktopKeepRunning:                 false,
		DatabaseBackupEnabled:              false,
		DatabaseBackupDir:                  "",
		DatabaseBackupIntervalMinutes:      1440,
		DatabaseBackupRetention:            7,
		LogRetentionDays:                   5,
		GatewayPricingActiveSchemeID:       "official",
		GatewayPricingSchemes:              "[]",
		FeatureFlags:                       models.JSONMap{},
		GatewayRouteStrategy:               "round_robin",
		GatewayFailureThreshold:            3,
		GatewayCooldownSeconds:             180,
		GatewayRequestTimeout:              60,
		GatewayMaxAttempts:                 0,
		GatewayFailureRetryMode:            "retryable",
		GatewayRouteConcurrencyLimit:       5,
		GatewaySmartLatencyBias:            1,
		GatewaySmartConcurrencyBias:        1.5,
		GatewaySmartFailureBias:            1,
		GatewaySmartPriorityBias:           0.5,
		GatewayConcurrencyTransferStrategy: "limit_only",
		GatewayConcurrencyOverflowStrategy: "latency_first",
		GatewayAPIKey:                      strings.TrimSpace(cfg.GatewayAPIKey),
		SiteGroupCatalog:                   "[]",
	}).Error
}
