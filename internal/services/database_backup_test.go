package services

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"ai-sign-in-gateway/internal/models"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestDatabaseBackupRunnerBackupToCreatesSnapshotAndAppliesRetention(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "data", "ai-sign-in-gateway.db")
	backupDir := filepath.Join(tempDir, "backups")
	db := openBackupTestDB(t, dbPath)
	if err := db.Create(&models.AdminUser{Username: "admin", PasswordHash: "hash"}).Error; err != nil {
		t.Fatalf("create admin: %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("db handle: %v", err)
	}
	if err := sqlDB.Close(); err != nil {
		t.Fatalf("close db: %v", err)
	}

	oldBackup := filepath.Join(backupDir, "ai-sign-in-gateway-20000101-000000.db")
	if err := copyFixtureDB(dbPath, oldBackup); err != nil {
		t.Fatalf("copy old backup: %v", err)
	}
	oldTime := time.Now().Add(-24 * time.Hour)
	if err := os.Chtimes(oldBackup, oldTime, oldTime); err != nil {
		t.Fatalf("chtimes old backup: %v", err)
	}

	runner := DatabaseBackupRunner{DatabasePath: dbPath}
	if err := runner.BackupTo(backupDir, 1); err != nil {
		t.Fatalf("backup: %v", err)
	}

	matches, err := filepath.Glob(filepath.Join(backupDir, "ai-sign-in-gateway-*.db"))
	if err != nil {
		t.Fatalf("glob backups: %v", err)
	}
	if len(matches) != 1 {
		t.Fatalf("backup count = %d, want 1: %v", len(matches), matches)
	}
	if matches[0] == oldBackup {
		t.Fatalf("old backup was not pruned")
	}
}

func TestDatabaseBackupRunnerProviderUsesLatestDatabasePath(t *testing.T) {
	tempDir := t.TempDir()
	oldPath := filepath.Join(tempDir, "old", "ai-sign-in-gateway.db")
	newPath := filepath.Join(tempDir, "new", "ai-sign-in-gateway.db")
	backupDir := filepath.Join(tempDir, "backups")

	oldDB := openBackupTestDB(t, oldPath)
	if err := oldDB.Create(&models.SystemSetting{ID: 1, DatabaseBackupEnabled: false}).Error; err != nil {
		t.Fatalf("create old settings: %v", err)
	}
	closeBackupTestDB(t, oldDB)

	newDB := openBackupTestDB(t, newPath)
	if err := newDB.Create(&models.SystemSetting{
		ID:                            1,
		DatabaseBackupEnabled:         true,
		DatabaseBackupDir:             backupDir,
		DatabaseBackupIntervalMinutes: 1,
		DatabaseBackupRetention:       2,
	}).Error; err != nil {
		t.Fatalf("create new settings: %v", err)
	}
	if err := newDB.Create(&models.AdminUser{Username: "new", PasswordHash: "hash"}).Error; err != nil {
		t.Fatalf("create new admin: %v", err)
	}
	closeBackupTestDB(t, newDB)

	currentPath := oldPath
	runner := DatabaseBackupRunner{DatabasePathProvider: func() string {
		return currentPath
	}}
	lastBackups := map[string]time.Time{}
	if _, ok := runner.shouldRun(lastBackups); ok {
		t.Fatal("disabled old database triggered a backup")
	}
	currentPath = newPath
	if _, ok := runner.shouldRun(lastBackups); !ok {
		t.Fatal("enabled new database did not trigger a backup")
	}
	matches, err := filepath.Glob(filepath.Join(backupDir, "ai-sign-in-gateway-*.db"))
	if err != nil {
		t.Fatalf("glob backups: %v", err)
	}
	if len(matches) != 1 {
		t.Fatalf("backup count = %d, want 1: %v", len(matches), matches)
	}
}

func TestDatabaseBackupRunnerProviderDoesNotReuseLastBackupAcrossDatabasePaths(t *testing.T) {
	tempDir := t.TempDir()
	oldPath := filepath.Join(tempDir, "old", "ai-sign-in-gateway.db")
	newPath := filepath.Join(tempDir, "new", "ai-sign-in-gateway.db")
	oldBackupDir := filepath.Join(tempDir, "old-backups")
	newBackupDir := filepath.Join(tempDir, "new-backups")
	createBackupEnabledDB(t, oldPath, oldBackupDir, "old")
	createBackupEnabledDB(t, newPath, newBackupDir, "new")

	currentPath := oldPath
	runner := DatabaseBackupRunner{DatabasePathProvider: func() string {
		return currentPath
	}}
	lastBackups := map[string]time.Time{}
	databaseKey, ok := runner.shouldRun(lastBackups)
	if !ok {
		t.Fatal("old database did not trigger initial backup")
	}
	lastBackups[databaseKey] = time.Now()

	currentPath = newPath
	if _, ok := runner.shouldRun(lastBackups); !ok {
		t.Fatal("new database backup was suppressed by old database timestamp")
	}
	if countBackupFiles(t, oldBackupDir) != 1 {
		t.Fatalf("old backup count = %d", countBackupFiles(t, oldBackupDir))
	}
	if countBackupFiles(t, newBackupDir) != 1 {
		t.Fatalf("new backup count = %d", countBackupFiles(t, newBackupDir))
	}
}

func openBackupTestDB(t *testing.T, path string) *gorm.DB {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir db dir: %v", err)
	}
	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(models.All()...); err != nil {
		t.Fatalf("migrate db: %v", err)
	}
	return db
}

func closeBackupTestDB(t *testing.T, db *gorm.DB) {
	t.Helper()
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("db handle: %v", err)
	}
	if err := sqlDB.Close(); err != nil {
		t.Fatalf("close db: %v", err)
	}
}

func createBackupEnabledDB(t *testing.T, path string, backupDir string, username string) {
	t.Helper()
	db := openBackupTestDB(t, path)
	if err := db.Create(&models.SystemSetting{
		ID:                            1,
		DatabaseBackupEnabled:         true,
		DatabaseBackupDir:             backupDir,
		DatabaseBackupIntervalMinutes: 1440,
		DatabaseBackupRetention:       2,
	}).Error; err != nil {
		t.Fatalf("create settings: %v", err)
	}
	if err := db.Create(&models.AdminUser{Username: username, PasswordHash: "hash"}).Error; err != nil {
		t.Fatalf("create admin: %v", err)
	}
	closeBackupTestDB(t, db)
}

func countBackupFiles(t *testing.T, backupDir string) int {
	t.Helper()
	matches, err := filepath.Glob(filepath.Join(backupDir, "ai-sign-in-gateway-*.db"))
	if err != nil {
		t.Fatalf("glob backups: %v", err)
	}
	return len(matches)
}

func copyFixtureDB(source string, target string) error {
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return err
	}
	data, err := os.ReadFile(source)
	if err != nil {
		return err
	}
	return os.WriteFile(target, data, 0o600)
}
