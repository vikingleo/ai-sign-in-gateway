//go:build desktop_shell

package main

import (
	"context"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/services"
	webview "github.com/webview/webview_go"
	"gorm.io/gorm"
)

const desktopWindowEnv = "AI_SIGN_IN_GATEWAY_DESKTOP_WINDOW_URL"

type trayItems struct {
	summary      *trayMenuItem
	routes       *trayMenuItem
	traffic      *trayMenuItem
	connectivity *trayMenuItem
	lastAction   *trayMenuItem
}

func desktopShellAvailable() bool {
	return true
}

func desktopWindowURL() string {
	return strings.TrimSpace(os.Getenv(desktopWindowEnv))
}

func runDesktopWindow(targetURL string) error {
	w := webview.New(envBool("AI_SIGN_IN_GATEWAY_DESKTOP_DEBUG", false))
	defer w.Destroy()
	w.SetTitle("爱签网关")
	w.SetSize(1280, 840, webview.HintNone)
	setDesktopWindowIcon(w.Window())
	w.Navigate(targetURL)
	w.Run()
	return nil
}

func runDesktopShell(ctx context.Context, rt desktopRuntime) error {
	serviceCtx, stopService := context.WithCancel(ctx)
	defer stopService()
	uiCtx, stopUI := context.WithCancel(context.Background())
	defer stopUI()

	serverErr := make(chan error, 1)
	for _, serverErrCh := range []<-chan error{
		runHTTPServer(serviceCtx, rt.Backend, rt.BackendLn),
		runHTTPServer(serviceCtx, rt.Frontend, rt.FrontendLn),
	} {
		go func(errCh <-chan error) {
			if err, ok := <-errCh; ok && err != nil {
				log.Printf("桌面本地服务退出: %v", err)
				select {
				case serverErr <- err:
				default:
				}
				trayQuit()
			}
		}(serverErrCh)
	}
	go func() {
		<-serviceCtx.Done()
		trayQuit()
	}()

	var items trayItems
	var exitOnce sync.Once
	var retainService atomic.Bool
	trayRun(func() {
		setupTray(rt, &items, func() {
			retainService.Store(desktopKeepRunningEnabled(rt.database()))
			stopUI()
			if !retainService.Load() {
				stopService()
			}
		})
		if envBool("AI_SIGN_IN_GATEWAY_OPEN_BROWSER", true) {
			go launchDesktopWindow(desktopConsoleURL(rt.FrontendURL))
		}
		go refreshTrayLoop(uiCtx, rt, &items)
	}, func() {
		exitOnce.Do(stopUI)
	})

	if retainService.Load() {
		log.Printf("桌面界面已关闭，本地服务继续运行: %s", rt.FrontendURL)
		select {
		case err, ok := <-serverErr:
			if ok && err != nil {
				return err
			}
			return nil
		case <-ctx.Done():
			stopService()
			return nil
		}
	}

	stopService()
	select {
	case err, ok := <-serverErr:
		if ok && err != nil {
			return err
		}
	case <-time.After(5 * time.Second):
	}
	return nil
}

func setupTray(rt desktopRuntime, items *trayItems, exitApp func()) {
	if icon := desktopIconBytes(); len(icon) > 0 {
		traySetIcon(icon)
	}
	traySetTitle("爱签网关")
	traySetTooltip("爱签网关 · ai-sign-in-gateway")

	items.summary = trayAddMenuItem("网关统计: 加载中...", "最近 24 小时网关统计")
	items.summary.Disable()
	items.routes = trayAddMenuItem("路由池: 加载中...", "网关路由健康状态")
	items.routes.Disable()
	items.traffic = trayAddMenuItem("请求趋势: 加载中...", "最近 24 小时请求量和延迟")
	items.traffic.Disable()
	items.connectivity = trayAddMenuItem("站点连通率: 未检测", "点击“检测站点连通率”后刷新")
	items.connectivity.Disable()
	items.lastAction = trayAddMenuItem("操作状态: 就绪", "最近一次托盘操作结果")
	items.lastAction.Disable()

	trayAddSeparator()
	openMain := trayAddMenuItem("打开服务面板", desktopConsoleURL(rt.FrontendURL))
	openGateway := trayAddMenuItem("打开网关中心", rt.FrontendURL+"/gateway")
	openSites := trayAddMenuItem("打开站点中心", rt.FrontendURL+"/sites")
	openInBrowser := trayAddMenuItem("在系统浏览器打开管理中心", rt.FrontendURL+"/overview")

	trayAddSeparator()
	refresh := trayAddMenuItem("刷新统计", "刷新托盘网关统计")
	checkSites := trayAddMenuItem("检测站点连通率", "检测已启用站点首页连通性")
	syncRoutes := trayAddMenuItem("同步网关路由", "根据站点 API Key 同步路由池")
	probeRoutes := trayAddMenuItem("探测全部网关路由", "请求每条路由的 /models 接口")

	trayAddSeparator()
	frontendURL := trayAddMenuItem("前端地址: "+rt.FrontendURL, rt.FrontendURL)
	frontendURL.Disable()
	backendURL := trayAddMenuItem("后端地址: "+rt.BackendURL, rt.BackendURL)
	backendURL.Disable()
	gatewayURL := trayAddMenuItem("网关地址: "+rt.GatewayURL, rt.GatewayURL)
	gatewayURL.Disable()
	configDir := trayAddMenuItem("配置目录: "+rt.ConfigDir, rt.ConfigDir)
	configDir.Disable()
	quit := trayAddMenuItem("退出", "停止桌面程序和本地服务")

	go func() {
		for {
			select {
			case <-openMain.ClickedCh:
				launchDesktopWindow(desktopConsoleURL(rt.FrontendURL))
			case <-openGateway.ClickedCh:
				launchDesktopWindow(rt.FrontendURL + "/gateway")
			case <-openSites.ClickedCh:
				launchDesktopWindow(rt.FrontendURL + "/sites")
			case <-openInBrowser.ClickedCh:
				openBrowser(rt.FrontendURL + "/overview")
			case <-refresh.ClickedCh:
				updateTraySnapshot(rt, items)
			case <-checkSites.ClickedCh:
				runSiteConnectivityCheck(rt.database(), items)
			case <-syncRoutes.ClickedCh:
				runGatewayRouteSync(rt.database(), items)
			case <-probeRoutes.ClickedCh:
				runGatewayRouteProbe(rt.database(), items)
			case <-quit.ClickedCh:
				exitApp()
				trayQuit()
				return
			}
		}
	}()
}

func desktopKeepRunningEnabled(db *gorm.DB) bool {
	if db == nil {
		return false
	}
	var settings models.SystemSetting
	if err := db.First(&settings, 1).Error; err != nil {
		return false
	}
	return settings.DesktopKeepRunning
}

func refreshTrayLoop(ctx context.Context, rt desktopRuntime, items *trayItems) {
	updateTraySnapshot(rt, items)
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			updateTraySnapshot(rt, items)
		}
	}
}

func updateTraySnapshot(rt desktopRuntime, items *trayItems) {
	snapshot := collectTraySnapshot(rt.database())
	items.summary.SetTitle(snapshot.Summary)
	items.routes.SetTitle(snapshot.Routes)
	items.traffic.SetTitle(snapshot.Traffic)
	traySetTooltip(snapshot.Tooltip)
}

func collectTraySnapshot(db *gorm.DB) desktopTraySnapshot {
	if db == nil {
		return desktopTraySnapshot{
			Summary: "网关统计: 数据库未连接",
			Routes:  "路由池: 数据库未连接",
			Traffic: "请求趋势: 数据库未连接",
			Tooltip: "爱签网关\nai-sign-in-gateway\n数据库未连接",
		}
	}
	var totalRoutes, healthyRoutes, openRoutes, disabledRoutes int64
	_ = db.Model(&models.GatewayRouteState{}).Count(&totalRoutes).Error
	_ = db.Model(&models.GatewayRouteState{}).Where("is_enabled = ? AND circuit_state = ?", true, "closed").Count(&healthyRoutes).Error
	_ = db.Model(&models.GatewayRouteState{}).Where("circuit_state = ?", "open").Count(&openRoutes).Error
	_ = db.Model(&models.GatewayRouteState{}).Where("is_enabled = ?", false).Count(&disabledRoutes).Error

	since24h := time.Now().UTC().Add(-24 * time.Hour)
	var logs []models.GatewayRequestLog
	_ = db.Where("created_at >= ?", since24h).Find(&logs).Error
	requestIDs := map[string]struct{}{}
	successes := 0
	latencySum := 0.0
	latencySamples := 0
	for _, item := range logs {
		if item.RequestID != "" {
			requestIDs[item.RequestID] = struct{}{}
		}
		if item.Success {
			successes++
			if item.LatencyMS != nil {
				latencySum += *item.LatencyMS
				latencySamples++
			}
		}
	}
	successRate := 0.0
	if len(logs) > 0 {
		successRate = float64(successes) / float64(len(logs)) * 100
	}
	avgLatencyText := "-"
	if latencySamples > 0 {
		avgLatencyText = fmt.Sprintf("%.0fms", latencySum/float64(latencySamples))
	}
	active := services.RouteTotalActive()

	return desktopTraySnapshot{
		Summary: fmt.Sprintf("网关统计: 24h %d 请求 / 成功 %.1f%%", len(requestIDs), successRate),
		Routes:  fmt.Sprintf("路由池: %d/%d 健康 / %d 熔断 / %d 禁用", healthyRoutes, totalRoutes, openRoutes, disabledRoutes),
		Traffic: fmt.Sprintf("请求趋势: 当前并发 %d / 均值 %s", active, avgLatencyText),
		Tooltip: fmt.Sprintf(
			"爱签网关\nai-sign-in-gateway\n24h 请求: %d\n成功率: %.1f%%\n健康路由: %d/%d\n当前并发: %d",
			len(requestIDs),
			successRate,
			healthyRoutes,
			totalRoutes,
			active,
		),
	}
}

func runGatewayRouteSync(db *gorm.DB, items *trayItems) {
	if db == nil {
		items.lastAction.SetTitle("操作状态: 数据库未连接")
		return
	}
	items.lastAction.SetTitle("操作状态: 正在同步路由...")
	go func() {
		count, err := services.SyncGatewayRoutes(db)
		if err != nil {
			items.lastAction.SetTitle("操作状态: 路由同步失败")
			items.lastAction.SetTooltip(err.Error())
			return
		}
		items.lastAction.SetTitle(fmt.Sprintf("操作状态: 已同步 %d 条路由", count))
		items.lastAction.SetTooltip("网关路由已按站点 API Key 刷新")
	}()
}

func runGatewayRouteProbe(db *gorm.DB, items *trayItems) {
	if db == nil {
		items.lastAction.SetTitle("操作状态: 数据库未连接")
		return
	}
	items.lastAction.SetTitle("操作状态: 正在探测路由...")
	go func() {
		routes, err := services.ListGatewayRoutes(db, "", false)
		if err != nil {
			items.lastAction.SetTitle("操作状态: 路由探测失败")
			items.lastAction.SetTooltip(err.Error())
			return
		}
		timeoutSeconds := gatewayProbeTimeout(db)
		okCount := 0
		for _, route := range routes {
			if !route.State.IsEnabled {
				continue
			}
			result, err := services.ProbeGatewayRoute(context.Background(), db, strconv.FormatUint(uint64(route.State.ID), 10), timeoutSeconds)
			if err == nil && result.OK {
				okCount++
			}
		}
		items.lastAction.SetTitle(fmt.Sprintf("操作状态: 路由探测 %d/%d 可用", okCount, len(routes)))
		items.lastAction.SetTooltip("已完成全部启用路由探测")
	}()
}

func gatewayProbeTimeout(db *gorm.DB) int {
	if db == nil {
		return 20
	}
	var settings models.SystemSetting
	if err := db.First(&settings, 1).Error; err != nil || settings.GatewayRequestTimeout <= 0 {
		return 20
	}
	return settings.GatewayRequestTimeout
}

func runSiteConnectivityCheck(db *gorm.DB, items *trayItems) {
	if db == nil {
		items.connectivity.SetTitle("站点连通率: 数据库未连接")
		items.lastAction.SetTitle("操作状态: 数据库未连接")
		return
	}
	items.connectivity.SetTitle("站点连通率: 检测中...")
	items.lastAction.SetTitle("操作状态: 正在检测站点...")
	go func() {
		result := probeSiteConnectivity(db)
		items.connectivity.SetTitle(result)
		items.lastAction.SetTitle("操作状态: 站点连通率已刷新")
		items.lastAction.SetTooltip(result)
	}()
}

func probeSiteConnectivity(db *gorm.DB) string {
	var sites []models.Site
	if err := db.Where("is_enabled = ?", true).Order("name asc").Find(&sites).Error; err != nil {
		return "站点连通率: 检测失败"
	}
	if len(sites) == 0 {
		return "站点连通率: 无启用站点"
	}

	var wg sync.WaitGroup
	sem := make(chan struct{}, 8)
	results := make(chan bool, len(sites))
	for _, site := range sites {
		site := site
		wg.Add(1)
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			results <- probeSiteBaseURL(site.BaseURL)
		}()
	}
	wg.Wait()
	close(results)

	okCount := 0
	for ok := range results {
		if ok {
			okCount++
		}
	}
	rate := float64(okCount) / float64(len(sites)) * 100
	return fmt.Sprintf("站点连通率: %d/%d 可达 (%.0f%%)", okCount, len(sites), rate)
}

func probeSiteBaseURL(baseURL string) bool {
	target := services.NormalizeBaseURL(baseURL)
	if target == "" {
		return false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return false
	}
	req.Header.Set("User-Agent", appName+"/desktop")
	resp, err := (&http.Client{Timeout: 6 * time.Second}).Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1024))
	return resp.StatusCode > 0 && resp.StatusCode < 500
}

func launchDesktopWindow(targetURL string) {
	exe, err := os.Executable()
	if err != nil {
		log.Printf("无法定位桌面程序: %v", err)
		openBrowser(targetURL)
		return
	}
	cmd := exec.Command(exe)
	cmd.Env = append(os.Environ(),
		desktopWindowEnv+"="+targetURL,
		"AI_SIGN_IN_GATEWAY_OPEN_BROWSER=false",
	)
	if err := cmd.Start(); err != nil {
		log.Printf("桌面窗口启动失败: %v", err)
		openBrowser(targetURL)
	}
}

func desktopIconBytes() []byte {
	if runtime.GOOS == "windows" {
		if data := loadFrontendAsset("desktop-icons/ai-sign-in-gateway.ico"); len(data) > 0 {
			return data
		}
	}
	if data := loadFrontendAsset("desktop-icons/ai-sign-in-gateway-256.png"); len(data) > 0 {
		return data
	}
	return loadFrontendAsset("desktop-icons/ai-sign-in-gateway-32.png")
}

func desktopIconFilePath() string {
	data := loadFrontendAsset("desktop-icons/ai-sign-in-gateway-512.png")
	if len(data) == 0 {
		return ""
	}
	path := filepath.Join(os.TempDir(), "ai-sign-in-gateway-window-icon.png")
	if err := os.WriteFile(path, data, 0o600); err != nil {
		return ""
	}
	return path
}

func loadFrontendAsset(name string) []byte {
	if embedded, ok := embeddedFrontend(); ok {
		if data, err := fs.ReadFile(embedded, name); err == nil {
			return data
		}
	}
	candidates := []string{}
	if cwd, err := os.Getwd(); err == nil {
		candidates = append(candidates, filepath.Join(cwd, "frontend", "public", name))
	}
	if exe, err := os.Executable(); err == nil {
		dir := filepath.Dir(exe)
		candidates = append(candidates,
			filepath.Join(dir, "frontend", "public", name),
			filepath.Join(dir, "..", "frontend", "public", name),
		)
	}
	for _, candidate := range candidates {
		if data, err := os.ReadFile(candidate); err == nil {
			return data
		}
	}
	return nil
}
