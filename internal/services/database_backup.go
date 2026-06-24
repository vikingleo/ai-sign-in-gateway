package services

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"ai-sign-in-gateway/internal/config"
	"ai-sign-in-gateway/internal/database"
	"ai-sign-in-gateway/internal/models"
)

type DatabaseBackupRunner struct {
	DatabasePath         string
	DatabasePathProvider func() string
}

type DatabaseBackupFile struct {
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	Size      int64     `json:"size"`
	CreatedAt time.Time `json:"created_at"`
}

func RunDatabaseBackupLoop(ctx context.Context, databasePath string) {
	runner := DatabaseBackupRunner{DatabasePath: databasePath}
	runner.Run(ctx)
}

func RunDatabaseBackupLoopWithProvider(ctx context.Context, provider func() string) {
	runner := DatabaseBackupRunner{DatabasePathProvider: provider}
	runner.Run(ctx)
}

func (r DatabaseBackupRunner) Run(ctx context.Context) {
	if strings.TrimSpace(r.currentDatabasePath()) == "" && r.DatabasePathProvider == nil {
		return
	}
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	lastBackups := map[string]time.Time{}
	for {
		if databaseKey, ok := r.shouldRun(lastBackups); ok {
			lastBackups[databaseKey] = time.Now()
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (r DatabaseBackupRunner) shouldRun(lastBackups map[string]time.Time) (string, bool) {
	runner := r.withCurrentDatabasePath()
	if strings.TrimSpace(runner.DatabasePath) == "" {
		return "", false
	}
	databaseKey := backupDatabaseKey(runner.DatabasePath)
	settings, err := runner.loadSettings()
	if err != nil {
		log.Printf("自动备份数据库: 读取设置失败: %v", err)
		return databaseKey, false
	}
	if !settings.DatabaseBackupEnabled {
		return databaseKey, false
	}
	backupDir, err := runner.ResolveBackupDir(settings.DatabaseBackupDir)
	if err != nil {
		log.Printf("自动备份数据库: 备份目录无效: %v", err)
		return databaseKey, false
	}
	interval := time.Duration(nonZeroInt(settings.DatabaseBackupIntervalMinutes, 1440)) * time.Minute
	lastBackup := lastBackups[databaseKey]
	if !lastBackup.IsZero() && time.Since(lastBackup) < interval {
		return databaseKey, false
	}
	if err := runner.BackupTo(backupDir, nonZeroInt(settings.DatabaseBackupRetention, 7)); err != nil {
		log.Printf("自动备份数据库: 执行失败: %v", err)
		return databaseKey, false
	}
	log.Printf("自动备份数据库: 已备份到 %s", backupDir)
	return databaseKey, true
}

func (r DatabaseBackupRunner) withCurrentDatabasePath() DatabaseBackupRunner {
	r.DatabasePath = r.currentDatabasePath()
	r.DatabasePathProvider = nil
	return r
}

func (r DatabaseBackupRunner) currentDatabasePath() string {
	if r.DatabasePathProvider != nil {
		if path := strings.TrimSpace(r.DatabasePathProvider()); path != "" {
			return path
		}
	}
	return r.DatabasePath
}

func backupDatabaseKey(path string) string {
	cleaned := filepath.Clean(strings.TrimSpace(path))
	absolute, err := filepath.Abs(cleaned)
	if err == nil {
		return absolute
	}
	return cleaned
}

func (r DatabaseBackupRunner) BackupTo(backupDir string, retention int) error {
	_, err := r.CreateBackupTo(backupDir, retention)
	return err
}

func (r DatabaseBackupRunner) CreateBackupTo(backupDir string, retention int) (DatabaseBackupFile, error) {
	sourcePath, err := filepath.Abs(filepath.Clean(r.DatabasePath))
	if err != nil {
		return DatabaseBackupFile{}, err
	}
	if err := os.MkdirAll(backupDir, 0o755); err != nil {
		return DatabaseBackupFile{}, err
	}
	if samePath(sourcePath, backupDir) {
		return DatabaseBackupFile{}, fmt.Errorf("备份目录不能是数据库文件")
	}

	targetName := fmt.Sprintf("ai-sign-in-gateway-%s-%09d.db", time.Now().Format("20060102-150405"), time.Now().Nanosecond())
	targetPath := filepath.Join(backupDir, targetName)
	if err := vacuumInto(sourcePath, targetPath); err != nil {
		return DatabaseBackupFile{}, err
	}
	if err := cleanupOldBackups(backupDir, retention); err != nil {
		return DatabaseBackupFile{}, err
	}
	return backupFileInfo(targetPath)
}

func (r DatabaseBackupRunner) loadSettings() (models.SystemSetting, error) {
	db, err := database.Open(config.Config{DatabaseURL: "sqlite:///" + filepath.ToSlash(r.DatabasePath)})
	if err != nil {
		return models.SystemSetting{}, err
	}
	defer database.Close(db)
	var settings models.SystemSetting
	if err := db.First(&settings, 1).Error; err != nil {
		return models.SystemSetting{}, err
	}
	return settings, nil
}

func (r DatabaseBackupRunner) ResolveBackupDir(path string) (string, error) {
	if strings.TrimSpace(path) == "" {
		return r.DefaultBackupDir()
	}
	dir, err := normalizeBackupDir(path)
	if err != nil {
		return "", err
	}
	if isForeignUnixDefaultBackupDir(dir) {
		return r.DefaultBackupDir()
	}
	return dir, nil
}

func (r DatabaseBackupRunner) DefaultBackupDir() (string, error) {
	sourcePath, err := filepath.Abs(filepath.Clean(r.DatabasePath))
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(sourcePath) == "" || sourcePath == "." {
		return "", os.ErrInvalid
	}
	return filepath.Join(filepath.Dir(sourcePath), "backups"), nil
}

func vacuumInto(sourcePath string, targetPath string) error {
	db, err := database.Open(config.Config{DatabaseURL: "sqlite:///" + filepath.ToSlash(sourcePath)})
	if err != nil {
		return err
	}
	defer database.Close(db)
	if err := db.Exec("VACUUM INTO " + sqliteQuote(targetPath)).Error; err != nil {
		_ = os.Remove(targetPath)
		return err
	}
	return nil
}

func cleanupOldBackups(backupDir string, retention int) error {
	if retention <= 0 {
		retention = 7
	}
	matches, err := filepath.Glob(filepath.Join(backupDir, "ai-sign-in-gateway-*.db"))
	if err != nil {
		return err
	}
	if len(matches) <= retention {
		return nil
	}
	sort.Slice(matches, func(i, j int) bool {
		left, leftErr := os.Stat(matches[i])
		right, rightErr := os.Stat(matches[j])
		if leftErr != nil || rightErr != nil {
			return matches[i] < matches[j]
		}
		return left.ModTime().Before(right.ModTime())
	})
	for _, path := range matches[:len(matches)-retention] {
		if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
			return err
		}
	}
	return nil
}

func ListDatabaseBackups(backupDir string) ([]DatabaseBackupFile, error) {
	dir, err := normalizeBackupDir(backupDir)
	if err != nil {
		return nil, err
	}
	matches, err := filepath.Glob(filepath.Join(dir, "ai-sign-in-gateway-*.db"))
	if err != nil {
		return nil, err
	}
	files := make([]DatabaseBackupFile, 0, len(matches))
	for _, path := range matches {
		file, err := backupFileInfo(path)
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return nil, err
		}
		files = append(files, file)
	}
	sort.Slice(files, func(i, j int) bool {
		return files[i].CreatedAt.After(files[j].CreatedAt)
	})
	return files, nil
}

func DeleteDatabaseBackup(backupDir string, name string) error {
	backup, err := DatabaseBackupFileByName(backupDir, name)
	if err != nil {
		return err
	}
	return os.Remove(backup.Path)
}

func DatabaseBackupFileByName(backupDir string, name string) (DatabaseBackupFile, error) {
	dir, err := normalizeBackupDir(backupDir)
	if err != nil {
		return DatabaseBackupFile{}, err
	}
	cleanName := filepath.Base(strings.TrimSpace(name))
	if cleanName == "." || cleanName == string(filepath.Separator) || cleanName != strings.TrimSpace(name) {
		return DatabaseBackupFile{}, os.ErrInvalid
	}
	if !strings.HasPrefix(cleanName, "ai-sign-in-gateway-") || filepath.Ext(cleanName) != ".db" {
		return DatabaseBackupFile{}, os.ErrInvalid
	}
	target := filepath.Join(dir, cleanName)
	if !strings.HasPrefix(filepath.Clean(target), filepath.Clean(dir)+string(filepath.Separator)) {
		return DatabaseBackupFile{}, os.ErrInvalid
	}
	return backupFileInfo(target)
}

func NormalizeDatabaseBackupDir(path string) (string, error) {
	return normalizeBackupDir(path)
}

func normalizeBackupDir(path string) (string, error) {
	value := strings.TrimSpace(path)
	if value == "" {
		return "", os.ErrInvalid
	}
	if strings.HasPrefix(value, "~") {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		switch {
		case value == "~":
			value = home
		case strings.HasPrefix(value, "~/"):
			value = filepath.Join(home, strings.TrimPrefix(value, "~/"))
		}
	}
	return filepath.Abs(filepath.Clean(value))
}

func backupFileInfo(path string) (DatabaseBackupFile, error) {
	info, err := os.Stat(path)
	if err != nil {
		return DatabaseBackupFile{}, err
	}
	if info.IsDir() {
		return DatabaseBackupFile{}, os.ErrInvalid
	}
	abs, err := filepath.Abs(filepath.Clean(path))
	if err != nil {
		return DatabaseBackupFile{}, err
	}
	return DatabaseBackupFile{
		Name:      filepath.Base(path),
		Path:      abs,
		Size:      info.Size(),
		CreatedAt: info.ModTime(),
	}, nil
}

func sqliteQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}

func samePath(path string, dir string) bool {
	left, leftErr := filepath.Abs(filepath.Clean(path))
	right, rightErr := filepath.Abs(filepath.Clean(dir))
	return leftErr == nil && rightErr == nil && left == right
}

func isForeignUnixDefaultBackupDir(dir string) bool {
	cleanDir := filepath.ToSlash(filepath.Clean(dir))
	if !strings.HasPrefix(cleanDir, "/home/") || !strings.Contains(cleanDir, "/.ai-sign-in-gateway/") {
		return false
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return false
	}
	cleanHome := filepath.ToSlash(filepath.Clean(home))
	return cleanDir != cleanHome && !strings.HasPrefix(cleanDir, cleanHome+"/")
}

func nonZeroInt(value int, fallback int) int {
	if value == 0 {
		return fallback
	}
	return value
}
