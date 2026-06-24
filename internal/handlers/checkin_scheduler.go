package handlers

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"ai-sign-in-gateway/internal/models"
)

const checkinSchedulerPollInterval = time.Minute

type CheckinSchedulerRunner struct {
	App      *App
	Now      func() time.Time
	SleepFor time.Duration
}

func RunCheckinSchedulerLoop(ctx context.Context, app *App) {
	CheckinSchedulerRunner{App: app, SleepFor: checkinSchedulerPollInterval}.Run(ctx)
}

func (r CheckinSchedulerRunner) Run(ctx context.Context) {
	if r.App == nil || r.App.DB == nil {
		return
	}
	sleepFor := r.SleepFor
	if sleepFor <= 0 {
		sleepFor = checkinSchedulerPollInterval
	}
	ticker := time.NewTicker(sleepFor)
	defer ticker.Stop()

	lastRun := CheckinSchedulerLastRun{}
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		r.RunDue(ctx, &lastRun)
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

type CheckinSchedulerLastRun struct {
	DatabaseKey string
	Date        string
}

func (r CheckinSchedulerRunner) RunDue(ctx context.Context, lastRun *CheckinSchedulerLastRun) bool {
	if ctx.Err() != nil || r.App == nil || r.App.DB == nil {
		return false
	}
	settings, err := r.App.systemSettings()
	if err != nil {
		log.Printf("自动签到调度: 读取设置失败: %v", err)
		return false
	}
	if !settings.ScheduleEnabled {
		return false
	}
	location, err := time.LoadLocation(strings.TrimSpace(settings.Timezone))
	if err != nil {
		log.Printf("自动签到调度: 时区无效: %v", err)
		return false
	}
	hour, minute, err := parseDailyRunTime(settings.DailyRunTime)
	if err != nil {
		log.Printf("自动签到调度: 执行时间无效: %v", err)
		return false
	}
	now := r.now().In(location)
	dueAt := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, location)
	runDate := now.Format("2006-01-02")
	databaseKey := r.databaseKey()
	if now.Before(dueAt) || (lastRun != nil && lastRun.DatabaseKey == databaseKey && lastRun.Date == runDate) {
		return false
	}
	alreadyRun, err := r.scheduledRunExists(now, location)
	if err != nil {
		log.Printf("自动签到调度: 检查当天执行记录失败: %v", err)
		return false
	}
	if alreadyRun {
		if lastRun != nil {
			*lastRun = CheckinSchedulerLastRun{DatabaseKey: databaseKey, Date: runDate}
		}
		return false
	}
	runs, err := r.App.runCheckinBatchAt(ctx, nil, settings.OnlyEnabledSites, "scheduled", settings, now.UTC())
	if err != nil {
		log.Printf("自动签到调度: 执行失败: %v", err)
		return false
	}
	successCount, failedCount := checkinRunStatusCounts(runs)
	log.Printf("自动签到调度: 已执行一次签到，成功 %d，失败 %d", successCount, failedCount)
	if lastRun != nil {
		*lastRun = CheckinSchedulerLastRun{DatabaseKey: databaseKey, Date: runDate}
	}
	return true
}

func (r CheckinSchedulerRunner) scheduledRunExists(now time.Time, location *time.Location) (bool, error) {
	startLocal := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, location)
	endLocal := startLocal.AddDate(0, 0, 1)
	start := startLocal.UTC()
	end := endLocal.UTC()
	var count int64
	err := r.App.DB.Model(&models.CheckinRun{}).
		Where("trigger_type = ? AND started_at >= ? AND started_at < ?", "scheduled", start, end).
		Count(&count).Error
	return count > 0, err
}

func (r CheckinSchedulerRunner) now() time.Time {
	if r.Now != nil {
		return r.Now()
	}
	return time.Now()
}

func (r CheckinSchedulerRunner) databaseKey() string {
	if r.App == nil || r.App.DB == nil {
		return ""
	}
	return fmt.Sprintf("%p", r.App.DB)
}

func parseDailyRunTime(value string) (int, int, error) {
	parts := strings.Split(strings.TrimSpace(value), ":")
	if len(parts) != 2 {
		return 0, 0, strconv.ErrSyntax
	}
	hour, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, err
	}
	minute, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, 0, err
	}
	if hour < 0 || hour > 23 || minute < 0 || minute > 59 {
		return 0, 0, strconv.ErrSyntax
	}
	return hour, minute, nil
}
