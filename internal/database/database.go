package database

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"ai-sign-in-gateway/internal/config"
	"ai-sign-in-gateway/internal/models"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Open(cfg config.Config) (*gorm.DB, error) {
	dsn, err := sqliteDSN(cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.New(log.New(os.Stdout, "\r\n", log.LstdFlags), logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
		}),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		return nil, err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)
	sqlDB.SetConnMaxLifetime(time.Hour)
	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	if err := db.AutoMigrate(models.All()...); err != nil {
		return err
	}
	return NormalizeAdminUsers(db)
}

func NormalizeAdminUsers(db *gorm.DB) error {
	if db == nil || !db.Migrator().HasTable(&models.AdminUser{}) {
		return nil
	}
	var admins []models.AdminUser
	if err := db.Order("id ASC").Find(&admins).Error; err != nil {
		return err
	}
	if len(admins) == 0 {
		return nil
	}
	hasEnabledSuperAdmin := false
	for _, admin := range admins {
		if admin.Role == models.AdminRoleSuper && admin.IsEnabled {
			hasEnabledSuperAdmin = true
			break
		}
	}
	promoteID := uint(0)
	if !hasEnabledSuperAdmin {
		promoteID = firstEnabledAdminID(admins)
		if promoteID == 0 {
			promoteID = admins[0].ID
		}
	}
	for _, admin := range admins {
		updates := map[string]any{}
		role := models.NormalizeAdminRole(admin.Role)
		if promoteID != 0 && admin.ID == promoteID {
			role = models.AdminRoleSuper
		}
		if admin.Role != role {
			updates["role"] = role
		}
		if promoteID != 0 && admin.ID == promoteID && !admin.IsEnabled {
			updates["is_enabled"] = true
		}
		if len(updates) > 0 {
			if err := db.Model(&models.AdminUser{}).Where("id = ?", admin.ID).Updates(updates).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

func firstEnabledAdminID(admins []models.AdminUser) uint {
	for _, admin := range admins {
		if admin.IsEnabled {
			return admin.ID
		}
	}
	return 0
}

func Close(db *gorm.DB) error {
	if db == nil {
		return nil
	}
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

func sqliteDSN(databaseURL string) (string, error) {
	const prefix = "sqlite:///"
	if strings.HasPrefix(databaseURL, prefix) {
		path := filepath.FromSlash(strings.TrimPrefix(databaseURL, prefix))
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return "", err
		}
		return path, nil
	}
	if strings.HasPrefix(databaseURL, "sqlite://") {
		return "", fmt.Errorf("unsupported sqlite URL %q; expected sqlite:////absolute/path or sqlite:///relative/path", databaseURL)
	}
	if databaseURL == "" {
		return "", fmt.Errorf("database URL is empty")
	}
	if err := os.MkdirAll(filepath.Dir(databaseURL), 0o755); err != nil {
		return "", err
	}
	return databaseURL, nil
}
