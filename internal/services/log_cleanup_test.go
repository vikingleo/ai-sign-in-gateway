package services

import (
	"path/filepath"
	"testing"
	"time"

	"ai-sign-in-gateway/internal/models"
)

func TestCleanupOldLogsDeletesRowsOlderThanRetention(t *testing.T) {
	db := openBackupTestDB(t, t.TempDir()+"/logs.db")
	now := time.Date(2026, 5, 13, 12, 0, 0, 0, time.UTC)
	oldTime := now.AddDate(0, 0, -6)
	recentTime := now.AddDate(0, 0, -2)

	runs := []models.CheckinRun{
		{Status: "success", Message: "old", StartedAt: oldTime},
		{Status: "success", Message: "recent", StartedAt: recentTime},
	}
	if err := db.Create(&runs).Error; err != nil {
		t.Fatalf("create checkin runs: %v", err)
	}
	logs := []models.GatewayRequestLog{
		{RequestID: "old", Method: "POST", CreatedAt: oldTime},
		{RequestID: "recent", Method: "POST", CreatedAt: recentTime},
	}
	if err := db.Create(&logs).Error; err != nil {
		t.Fatalf("create gateway logs: %v", err)
	}

	result, err := CleanupOldLogs(db, 5, now)
	if err != nil {
		t.Fatalf("cleanup logs: %v", err)
	}
	if result.RetentionDays != 5 || result.TotalDeleted() != 2 {
		t.Fatalf("cleanup result = %+v", result)
	}

	var checkinCount int64
	if err := db.Model(&models.CheckinRun{}).Count(&checkinCount).Error; err != nil {
		t.Fatal(err)
	}
	if checkinCount != 1 {
		t.Fatalf("checkin count = %d, want 1", checkinCount)
	}
	var gatewayCount int64
	if err := db.Model(&models.GatewayRequestLog{}).Count(&gatewayCount).Error; err != nil {
		t.Fatal(err)
	}
	if gatewayCount != 1 {
		t.Fatalf("gateway log count = %d, want 1", gatewayCount)
	}
}

func TestCleanupOldLogsUsesDefaultRetentionForInvalidValue(t *testing.T) {
	db := openBackupTestDB(t, t.TempDir()+"/default-retention.db")
	now := time.Date(2026, 5, 13, 12, 0, 0, 0, time.UTC)
	if err := db.Create(&models.GatewayRequestLog{RequestID: "old", CreatedAt: now.AddDate(0, 0, -6)}).Error; err != nil {
		t.Fatalf("create gateway log: %v", err)
	}

	result, err := CleanupOldLogs(db, 0, now)
	if err != nil {
		t.Fatalf("cleanup logs: %v", err)
	}
	if result.RetentionDays != DefaultLogRetentionDays || result.GatewayRequestLogsDeleted != 1 {
		t.Fatalf("cleanup result = %+v", result)
	}
}

func TestLogCleanupRunnerProviderUsesLatestDatabasePath(t *testing.T) {
	tempDir := t.TempDir()
	oldPath := filepath.Join(tempDir, "old", "logs.db")
	newPath := filepath.Join(tempDir, "new", "logs.db")
	now := time.Date(2026, 5, 13, 12, 0, 0, 0, time.UTC)

	oldDB := openBackupTestDB(t, oldPath)
	if err := oldDB.Create(&models.SystemSetting{ID: 1, LogRetentionDays: 5}).Error; err != nil {
		t.Fatalf("create old settings: %v", err)
	}
	if err := oldDB.Create(&models.GatewayRequestLog{RequestID: "old-db-log", CreatedAt: now.AddDate(0, 0, -6)}).Error; err != nil {
		t.Fatalf("create old db log: %v", err)
	}
	closeBackupTestDB(t, oldDB)

	newDB := openBackupTestDB(t, newPath)
	if err := newDB.Create(&models.SystemSetting{ID: 1, LogRetentionDays: 5}).Error; err != nil {
		t.Fatalf("create new settings: %v", err)
	}
	if err := newDB.Create(&models.GatewayRequestLog{RequestID: "new-db-log", CreatedAt: now.AddDate(0, 0, -6)}).Error; err != nil {
		t.Fatalf("create new db log: %v", err)
	}
	closeBackupTestDB(t, newDB)

	currentPath := newPath
	runner := LogCleanupRunner{DatabasePathProvider: func() string {
		return currentPath
	}}
	if err := runner.CleanupOnce(now); err != nil {
		t.Fatalf("cleanup latest db: %v", err)
	}

	verifyOld := openBackupTestDB(t, oldPath)
	defer closeBackupTestDB(t, verifyOld)
	var oldCount int64
	if err := verifyOld.Model(&models.GatewayRequestLog{}).Where("request_id = ?", "old-db-log").Count(&oldCount).Error; err != nil {
		t.Fatalf("count old db logs: %v", err)
	}
	if oldCount != 1 {
		t.Fatalf("old db log count = %d", oldCount)
	}

	verifyNew := openBackupTestDB(t, newPath)
	defer closeBackupTestDB(t, verifyNew)
	var newCount int64
	if err := verifyNew.Model(&models.GatewayRequestLog{}).Where("request_id = ?", "new-db-log").Count(&newCount).Error; err != nil {
		t.Fatalf("count new db logs: %v", err)
	}
	if newCount != 0 {
		t.Fatalf("new db log count = %d", newCount)
	}
}
