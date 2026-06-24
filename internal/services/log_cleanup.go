package services

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"ai-sign-in-gateway/internal/config"
	"ai-sign-in-gateway/internal/database"
	"ai-sign-in-gateway/internal/models"
	"gorm.io/gorm"
)

const DefaultLogRetentionDays = 5

type LogCleanupRunner struct {
	DatabasePath         string
	DatabasePathProvider func() string
}

type LogCleanupResult struct {
	RetentionDays             int
	Cutoff                    time.Time
	CheckinRunsDeleted        int64
	GatewayRequestLogsDeleted int64
}

func (r LogCleanupResult) TotalDeleted() int64 {
	return r.CheckinRunsDeleted + r.GatewayRequestLogsDeleted
}

func RunLogCleanupLoop(ctx context.Context, databasePath string) {
	runner := LogCleanupRunner{DatabasePath: databasePath}
	runner.Run(ctx)
}

func RunLogCleanupLoopWithProvider(ctx context.Context, provider func() string) {
	runner := LogCleanupRunner{DatabasePathProvider: provider}
	runner.Run(ctx)
}

func (r LogCleanupRunner) Run(ctx context.Context) {
	if strings.TrimSpace(r.currentDatabasePath()) == "" && r.DatabasePathProvider == nil {
		return
	}
	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()

	for {
		if err := r.CleanupOnce(time.Now().UTC()); err != nil {
			log.Printf("日志清理失败: %v", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (r LogCleanupRunner) CleanupOnce(now time.Time) error {
	databasePath := r.currentDatabasePath()
	if strings.TrimSpace(databasePath) == "" {
		return os.ErrInvalid
	}
	db, err := database.Open(config.Config{DatabaseURL: "sqlite:///" + filepath.ToSlash(databasePath)})
	if err != nil {
		return err
	}
	defer database.Close(db)

	var settings models.SystemSetting
	if err := db.First(&settings, 1).Error; err != nil {
		return err
	}
	result, err := CleanupOldLogs(db, settings.LogRetentionDays, now)
	if err != nil {
		return err
	}
	if result.TotalDeleted() > 0 {
		log.Printf("日志清理: 已删除 %d 条旧日志，保留 %d 天", result.TotalDeleted(), result.RetentionDays)
	}
	return nil
}

func (r LogCleanupRunner) currentDatabasePath() string {
	if r.DatabasePathProvider != nil {
		if path := strings.TrimSpace(r.DatabasePathProvider()); path != "" {
			return path
		}
	}
	return r.DatabasePath
}

func CleanupOldLogs(db *gorm.DB, retentionDays int, now time.Time) (LogCleanupResult, error) {
	retentionDays = normalizeLogRetentionDays(retentionDays)
	if now.IsZero() {
		now = time.Now().UTC()
	}
	cutoff := now.UTC().AddDate(0, 0, -retentionDays)
	result := LogCleanupResult{
		RetentionDays: retentionDays,
		Cutoff:        cutoff,
	}

	checkinDelete := db.Where("started_at < ?", cutoff).Delete(&models.CheckinRun{})
	if checkinDelete.Error != nil {
		return result, checkinDelete.Error
	}
	result.CheckinRunsDeleted = checkinDelete.RowsAffected

	gatewayDelete := db.Where("created_at < ?", cutoff).Delete(&models.GatewayRequestLog{})
	if gatewayDelete.Error != nil {
		return result, gatewayDelete.Error
	}
	result.GatewayRequestLogsDeleted = gatewayDelete.RowsAffected

	return result, nil
}

func normalizeLogRetentionDays(value int) int {
	if value <= 0 {
		return DefaultLogRetentionDays
	}
	if value > 365 {
		return 365
	}
	return value
}
