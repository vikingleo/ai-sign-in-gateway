package main

import (
	"bytes"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"mime"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"ai-sign-in-gateway/internal/config"
	"ai-sign-in-gateway/internal/database"
	"ai-sign-in-gateway/internal/handlers"
	"ai-sign-in-gateway/internal/migrations"
	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/runtimecontrol"
	"ai-sign-in-gateway/internal/security"
	"ai-sign-in-gateway/internal/seed"
	"ai-sign-in-gateway/internal/services"
	"gorm.io/gorm"
)

const appName = "ai-sign-in-gateway"
const (
	defaultBackendPort   = 8972
	defaultFrontendPort  = 3721
	maxDesktopPortOffset = 20
	runtimeProtocol      = 3
)

var (
	defaultHost        = "127.0.0.1"
	defaultOpenBrowser = "true"
)

type ShellConfig struct {
	Host               string `json:"host"`
	Port               int    `json:"port"`
	OpenBrowserOnStart bool   `json:"open_browser_on_start"`
	DataDir            string `json:"data_dir"`
}

type startupOptions struct {
	Host         string
	Port         int
	BackendPort  int
	FrontendPort int
	ConfigDir    string
	OpenBrowser  *bool
	Desktop      *bool
}

type commandKind string

const (
	commandStart commandKind = "start"
	commandStop  commandKind = "stop"
	commandHelp  commandKind = "help"
)

type commandOptions struct {
	Kind commandKind
	Args []string
	Help bool
}

type stopOptions struct {
	Host         string
	Port         int
	BackendPort  int
	FrontendPort int
}

type startupSummary struct {
	Mode        string
	FrontendURL string
	BackendURL  string
	GatewayURL  string
	ConfigDir   string
	DatabaseURL string
	Cfg         config.Config
	DB          *gorm.DB
}

func main() {
	if err := run(); err != nil {
		log.Fatalf("%s 执行失败: %v", appName, err)
	}
}

func run() error {
	cmd, err := parseCommand(os.Args[1:])
	if err != nil {
		return err
	}
	switch cmd.Kind {
	case commandHelp:
		printCommandHelp(os.Stdout)
		return nil
	case commandStop:
		return runStopCommand(cmd.Args, os.Stdout)
	case commandStart:
	default:
		return fmt.Errorf("未知命令: %s", cmd.Kind)
	}

	opts, err := parseStartupOptions(cmd.Args, os.Stdout)
	if errors.Is(err, flag.ErrHelp) {
		return nil
	}
	if err != nil {
		return err
	}
	applyStartupOptions(opts)

	if targetURL := desktopWindowURL(); targetURL != "" {
		return runDesktopWindow(targetURL)
	}

	configDir, err := config.UserConfigDir()
	if err != nil {
		return err
	}
	defaultConfigDir, err := config.DefaultConfigDir()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(configDir, "logs"), 0o755); err != nil {
		return err
	}
	logFile, err := os.OpenFile(filepath.Join(configDir, "logs", "shell.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err == nil {
		defer logFile.Close()
		log.SetOutput(io.MultiWriter(os.Stdout, logFile))
	}

	cfg, err := config.Load()
	if err != nil {
		return err
	}
	host := envString("AI_SIGN_IN_GATEWAY_HOST", defaultHost)
	backendPort := envFirstInt([]string{"AI_SIGN_IN_GATEWAY_BACKEND_PORT", "AI_SIGN_IN_GATEWAY_PORT"}, defaultBackendPort)
	frontendPort := envInt("AI_SIGN_IN_GATEWAY_FRONTEND_PORT", defaultFrontendPort)

	if desktopShellAvailable() && envBool("AI_SIGN_IN_GATEWAY_DESKTOP", true) {
		if existing, ok := findRunningDesktopService(host, frontendPort, maxDesktopPortOffset); ok {
			if existing.RuntimeProtocol < runtimeProtocol || runningServiceUsesDifferentConfig(existing, configDir) {
				if existing.RuntimeProtocol < runtimeProtocol {
					log.Printf("检测到旧版本本地服务，准备停止默认端口后启动新版: %s", existing.PublicURL)
				} else {
					log.Printf("检测到已运行服务使用不同配置目录，准备重启服务: 当前=%s 已运行=%s", configDir, existing.ConfigDir)
				}
				results := runtimecontrol.StopAppProcessesOnPorts([]int{
					frontendPort,
					backendPort,
					existing.Port,
					existing.BackendPort,
				}, nil, appName)
				for _, result := range results {
					log.Printf("停止旧版本端口 %d: %s", result.Port, result.Message)
				}
			} else {
				log.Printf("检测到已运行的本地服务，直接进入桌面窗口: %s", existing.PublicURL)
				return runDesktopWindow(desktopConsoleURL(existing.PublicURL))
			}
		}
	}

	backendLn, actualBackendPort, err := listenWithPortOffset(host, backendPort, maxDesktopPortOffset)
	if err != nil {
		return err
	}
	defer func() {
		_ = backendLn.Close()
	}()
	if actualBackendPort != backendPort {
		log.Printf("后端端口 %d 已占用，已自动切换到 %d", backendPort, actualBackendPort)
	}

	db, err := database.Open(cfg)
	if err != nil {
		return err
	}
	app := handlers.NewApp(db, cfg)
	defer func() {
		_ = database.Close(app.DB)
	}()
	if err := migrations.Apply(db); err != nil {
		return err
	}
	if err := seed.InitialData(db, cfg); err != nil {
		return err
	}

	api := app.Router()
	backendURL := browserURL(host, actualBackendPort)
	gatewayURL := backendURL + "/api/gateway"

	if desktopShellAvailable() && envBool("AI_SIGN_IN_GATEWAY_DESKTOP", true) {
		frontendLn, actualFrontendPort, frontendErr := listenWithPortOffset(host, frontendPort, maxDesktopPortOffset)
		if frontendErr != nil {
			return frontendErr
		}
		defer func() {
			_ = frontendLn.Close()
		}()
		if actualFrontendPort != frontendPort {
			log.Printf("前端端口 %d 已占用，已自动切换到 %d", frontendPort, actualFrontendPort)
		}
		frontendURL := browserURL(host, actualFrontendPort)
		handlers.SetRuntimeInfo(handlers.RuntimeInfo{
			FrontendURL:                 frontendURL,
			FrontendDefaultPort:         frontendPort,
			FrontendPort:                actualFrontendPort,
			FrontendDefaultPortOccupant: defaultPortOwner(host, frontendPort, actualFrontendPort),
			BackendURL:                  backendURL,
			BackendDefaultPort:          backendPort,
			BackendPort:                 actualBackendPort,
			BackendDefaultPortOccupant:  defaultPortOwner(host, backendPort, actualBackendPort),
			GatewayURL:                  gatewayURL,
			RuntimeProtocol:             runtimeProtocol,
			ConfigDir:                   configDir,
			DefaultConfigDir:            defaultConfigDir,
			DatabasePath:                cfg.SQLitePath(),
		})

		backendServer := &http.Server{
			Addr:              net.JoinHostPort(host, strconv.Itoa(actualBackendPort)),
			Handler:           api,
			ReadHeaderTimeout: 15 * time.Second,
		}
		frontendServer := &http.Server{
			Addr:              net.JoinHostPort(host, strconv.Itoa(actualFrontendPort)),
			Handler:           desktopFrontendHandler(api, backendURL),
			ReadHeaderTimeout: 15 * time.Second,
		}

		ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
		defer stop()
		go handlers.RunCheckinSchedulerLoop(ctx, app)
		go services.RunDatabaseBackupLoopWithProvider(ctx, runtimeDatabasePathProvider(cfg))
		go services.RunLogCleanupLoopWithProvider(ctx, runtimeDatabasePathProvider(cfg))
		log.Printf("%s 前端正在监听 %s", appName, frontendURL)
		log.Printf("%s 后端正在监听 %s", appName, backendURL)
		log.Printf("网关请求地址: %s", gatewayURL)
		log.Printf("用户配置目录: %s", configDir)
		printStartupSummary(os.Stdout, startupSummary{
			Mode:        "桌面模式",
			FrontendURL: frontendURL,
			BackendURL:  backendURL,
			GatewayURL:  gatewayURL,
			ConfigDir:   configDir,
			DatabaseURL: cfg.SQLitePath(),
			Cfg:         cfg,
			DB:          db,
		})
		return runDesktopShell(ctx, desktopRuntime{
			FrontendURL: frontendURL,
			BackendURL:  backendURL,
			GatewayURL:  gatewayURL,
			ConfigDir:   configDir,
			App:         app,
			Backend:     backendServer,
			Frontend:    frontendServer,
			BackendLn:   backendLn,
			FrontendLn:  frontendLn,
		})
	}

	handlers.SetRuntimeInfo(handlers.RuntimeInfo{
		FrontendURL:                 backendURL,
		FrontendDefaultPort:         frontendPort,
		FrontendPort:                actualBackendPort,
		FrontendDefaultPortOccupant: defaultPortOwner(host, frontendPort, actualBackendPort),
		BackendURL:                  backendURL,
		BackendDefaultPort:          backendPort,
		BackendPort:                 actualBackendPort,
		BackendDefaultPortOccupant:  defaultPortOwner(host, backendPort, actualBackendPort),
		GatewayURL:                  gatewayURL,
		RuntimeProtocol:             runtimeProtocol,
		ConfigDir:                   configDir,
		DefaultConfigDir:            defaultConfigDir,
		DatabasePath:                cfg.SQLitePath(),
	})
	server := &http.Server{
		Addr:              net.JoinHostPort(host, strconv.Itoa(actualBackendPort)),
		Handler:           shellHandler(api),
		ReadHeaderTimeout: 15 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go handlers.RunCheckinSchedulerLoop(ctx, app)
	go services.RunDatabaseBackupLoopWithProvider(ctx, runtimeDatabasePathProvider(cfg))
	go services.RunLogCleanupLoopWithProvider(ctx, runtimeDatabasePathProvider(cfg))
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
	}()
	log.Printf("%s Go 后端正在监听 %s", appName, backendURL)
	log.Printf("网关请求地址: %s", gatewayURL)
	log.Printf("用户配置目录: %s", configDir)
	printStartupSummary(os.Stdout, startupSummary{
		Mode:        "服务模式",
		FrontendURL: backendURL,
		BackendURL:  backendURL,
		GatewayURL:  gatewayURL,
		ConfigDir:   configDir,
		DatabaseURL: cfg.SQLitePath(),
		Cfg:         cfg,
		DB:          db,
	})
	if envBool("AI_SIGN_IN_GATEWAY_OPEN_BROWSER", defaultOpenBrowserEnabled()) {
		go openBrowser(backendURL)
	}

	err = server.Serve(backendLn)
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

func runtimeDatabasePathProvider(cfg config.Config) func() string {
	return func() string {
		if path := strings.TrimSpace(handlers.GetRuntimeInfo().DatabasePath); path != "" {
			return path
		}
		return cfg.SQLitePath()
	}
}

func parseCommand(args []string) (commandOptions, error) {
	if len(args) == 0 {
		return commandOptions{Kind: commandStart}, nil
	}
	first := strings.TrimSpace(args[0])
	switch first {
	case "", "start":
		if first == "" {
			return commandOptions{Kind: commandStart, Args: args}, nil
		}
		return commandOptions{Kind: commandStart, Args: args[1:]}, nil
	case "stop":
		return commandOptions{Kind: commandStop, Args: args[1:]}, nil
	case "help", "-h", "--help":
		return commandOptions{Kind: commandHelp, Args: args[1:], Help: true}, nil
	}
	if strings.HasPrefix(first, "-") {
		return commandOptions{Kind: commandStart, Args: args}, nil
	}
	return commandOptions{}, fmt.Errorf("未知命令: %s。执行 `%s help` 查看用法", first, appName)
}

func printCommandHelp(output io.Writer) {
	if output == nil {
		output = io.Discard
	}
	fmt.Fprintf(output, "%s 单文件命令:\n\n", appName)
	fmt.Fprintf(output, "  %s [start] [参数]        启动管理后台与网关\n", appName)
	fmt.Fprintf(output, "  %s stop [参数]           停止当前机器上的本程序实例\n", appName)
	fmt.Fprintf(output, "  %s help                  显示帮助\n\n", appName)
	fmt.Fprintln(output, "启动示例:")
	fmt.Fprintf(output, "  %s --port 9000\n", appName)
	fmt.Fprintf(output, "  %s start --host 0.0.0.0 --port 9000 --no-browser\n", appName)
	fmt.Fprintf(output, "  %s start --frontend-port 3722 --backend-port 8973\n\n", appName)
	fmt.Fprintln(output, "停止示例:")
	fmt.Fprintf(output, "  %s stop\n", appName)
	fmt.Fprintf(output, "  %s stop --port 9000\n", appName)
	fmt.Fprintf(output, "  %s stop --frontend-port 3722 --backend-port 8973\n\n", appName)
	fmt.Fprintln(output, "启动参数:")
	startFS := newStartupFlagSet(io.Discard, nil, nil, nil, nil, nil, nil)
	startFS.SetOutput(output)
	startFS.PrintDefaults()
	fmt.Fprintln(output, "\n停止参数:")
	stopFS := newStopFlagSet(io.Discard, &stopOptions{}, nil)
	stopFS.SetOutput(output)
	stopFS.PrintDefaults()
}

func printStartupSummary(output io.Writer, summary startupSummary) {
	if output == nil {
		output = io.Discard
	}
	frontendURL := strings.TrimSpace(summary.FrontendURL)
	backendURL := strings.TrimSpace(summary.BackendURL)
	gatewayURL := strings.TrimSpace(summary.GatewayURL)
	mode := strings.TrimSpace(summary.Mode)
	if mode == "" {
		mode = "运行模式"
	}

	fmt.Fprintln(output)
	fmt.Fprintf(output, "%s 已启动（%s）\n", appName, mode)
	if frontendURL != "" {
		fmt.Fprintf(output, "访问地址: %s\n", frontendURL)
	}
	if backendURL != "" && backendURL != frontendURL {
		fmt.Fprintf(output, "后端地址: %s\n", backendURL)
	}
	if gatewayURL != "" {
		fmt.Fprintf(output, "网关地址: %s\n", gatewayURL)
	}
	if strings.TrimSpace(summary.ConfigDir) != "" {
		fmt.Fprintf(output, "配置目录: %s\n", summary.ConfigDir)
	}
	if strings.TrimSpace(summary.DatabaseURL) != "" {
		fmt.Fprintf(output, "数据库: %s\n", summary.DatabaseURL)
	}

	username, passwordLine := startupAdminCredentials(summary.DB, summary.Cfg)
	if passwordLine == "" {
		fmt.Fprintf(output, "当前用户名: %s\n", username)
		fmt.Fprintln(output, "密码状态: 已修改，明文不可读取")
	} else {
		fmt.Fprintf(output, "默认用户名: %s\n", username)
		fmt.Fprintln(output, "默认密码: 已设置，明文不在启动日志显示")
	}

	stopCommand := stopCommandForSummary(summary)
	fmt.Fprintln(output, "常用命令:")
	fmt.Fprintf(output, "  %s help\n", appName)
	if stopCommand != "" {
		fmt.Fprintf(output, "  %s\n", stopCommand)
	}
	if frontendURL != "" {
		fmt.Fprintf(output, "  curl %s/api/health\n", strings.TrimRight(frontendURL, "/"))
	}
	fmt.Fprintln(output)
}

func startupAdminCredentials(db *gorm.DB, cfg config.Config) (string, string) {
	fallbackUsername := strings.TrimSpace(cfg.DefaultAdminUsername)
	if fallbackUsername == "" {
		fallbackUsername = "admin"
	}
	defaultPassword := strings.TrimSpace(cfg.DefaultAdminPassword)
	if defaultPassword == "" {
		defaultPassword = "admin123"
	}
	if db == nil {
		return fallbackUsername, defaultPassword
	}
	var admin models.AdminUser
	err := db.Order("id ASC").First(&admin).Error
	if err != nil {
		return fallbackUsername, defaultPassword
	}
	username := strings.TrimSpace(admin.Username)
	if username == "" {
		username = fallbackUsername
	}
	if security.VerifyPassword(defaultPassword, admin.PasswordHash) {
		return username, defaultPassword
	}
	return username, ""
}

func stopCommandForSummary(summary startupSummary) string {
	if port := portFromURL(summary.FrontendURL); port > 0 {
		return fmt.Sprintf("%s stop --port %d", appName, port)
	}
	if port := portFromURL(summary.BackendURL); port > 0 {
		return fmt.Sprintf("%s stop --port %d", appName, port)
	}
	return fmt.Sprintf("%s stop", appName)
}

func portFromURL(value string) int {
	parsed, err := url.Parse(strings.TrimSpace(value))
	if err != nil || parsed.Host == "" {
		return 0
	}
	if portText := parsed.Port(); portText != "" {
		port, err := strconv.Atoi(portText)
		if err == nil && validPort(port) {
			return port
		}
	}
	switch parsed.Scheme {
	case "http":
		return 80
	case "https":
		return 443
	default:
		return 0
	}
}

func parseStartupOptions(args []string, output io.Writer) (startupOptions, error) {
	var opts startupOptions
	var shortPort int
	var openBrowser bool
	var noBrowser bool
	var desktop bool
	var noDesktop bool

	if output == nil {
		output = io.Discard
	}
	fs := newStartupFlagSet(output, &opts, &shortPort, &openBrowser, &noBrowser, &desktop, &noDesktop)
	fs.Usage = func() {
		fmt.Fprintf(output, "%s 单文件快速运行:\n\n", appName)
		fmt.Fprintf(output, "  %s --port 9000\n", appName)
		fmt.Fprintf(output, "  %s --host 0.0.0.0 --port 9000 --no-browser\n", appName)
		fmt.Fprintf(output, "  %s --frontend-port 3722 --backend-port 8973\n\n", appName)
		fmt.Fprintln(output, "可用参数:")
		fs.PrintDefaults()
	}

	if err := fs.Parse(args); err != nil {
		return startupOptions{}, err
	}
	if fs.NArg() > 0 {
		return startupOptions{}, fmt.Errorf("未知启动参数: %s", strings.Join(fs.Args(), " "))
	}
	if opts.Port > 0 && shortPort > 0 && opts.Port != shortPort {
		return startupOptions{}, fmt.Errorf("--port 和 -p 不能同时设置为不同端口")
	}
	if opts.Port == 0 {
		opts.Port = shortPort
	}
	if opts.BackendPort == 0 {
		opts.BackendPort = opts.Port
	}
	for label, port := range map[string]int{
		"--port":          opts.Port,
		"--backend-port":  opts.BackendPort,
		"--frontend-port": opts.FrontendPort,
	} {
		if port != 0 && !validPort(port) {
			return startupOptions{}, fmt.Errorf("%s 端口无效: %d", label, port)
		}
	}
	if openBrowser && noBrowser {
		return startupOptions{}, fmt.Errorf("--browser 和 --no-browser 不能同时使用")
	}
	if desktop && noDesktop {
		return startupOptions{}, fmt.Errorf("--desktop 和 --no-desktop 不能同时使用")
	}
	switch {
	case openBrowser:
		value := true
		opts.OpenBrowser = &value
	case noBrowser:
		value := false
		opts.OpenBrowser = &value
	}
	switch {
	case desktop:
		value := true
		opts.Desktop = &value
	case noDesktop:
		value := false
		opts.Desktop = &value
	}
	return opts, nil
}

func newStartupFlagSet(output io.Writer, opts *startupOptions, shortPort *int, openBrowser, noBrowser, desktop, noDesktop *bool) *flag.FlagSet {
	if output == nil {
		output = io.Discard
	}
	fs := flag.NewFlagSet(appName, flag.ContinueOnError)
	fs.SetOutput(output)
	if opts == nil {
		opts = &startupOptions{}
	}
	if shortPort == nil {
		shortPort = new(int)
	}
	if openBrowser == nil {
		openBrowser = new(bool)
	}
	if noBrowser == nil {
		noBrowser = new(bool)
	}
	if desktop == nil {
		desktop = new(bool)
	}
	if noDesktop == nil {
		noDesktop = new(bool)
	}
	fs.StringVar(&opts.Host, "host", "", "监听地址，例如 127.0.0.1 或 0.0.0.0")
	fs.IntVar(&opts.Port, "port", 0, "快速设置服务/API/网关端口")
	fs.IntVar(shortPort, "p", 0, "快速设置服务/API/网关端口，等同 --port")
	fs.IntVar(&opts.BackendPort, "backend-port", 0, "桌面模式后端/API/网关端口，优先级高于 --port")
	fs.IntVar(&opts.FrontendPort, "frontend-port", 0, "桌面模式前端窗口入口端口")
	fs.StringVar(&opts.ConfigDir, "config-dir", "", "用户配置和数据库目录")
	fs.BoolVar(openBrowser, "browser", false, "启动后打开浏览器或桌面窗口")
	fs.BoolVar(noBrowser, "no-browser", false, "启动后不打开浏览器或桌面窗口")
	fs.BoolVar(desktop, "desktop", false, "启用桌面 WebView/托盘")
	fs.BoolVar(noDesktop, "no-desktop", false, "禁用桌面 WebView/托盘，仅作为本地 Web 服务运行")
	return fs
}

func applyStartupOptions(opts startupOptions) {
	setEnvIfNotEmpty("AI_SIGN_IN_GATEWAY_HOST", opts.Host)
	setEnvIfNotEmpty("AI_SIGN_IN_GATEWAY_CONFIG_DIR", opts.ConfigDir)
	if opts.BackendPort > 0 {
		setEnvInt("AI_SIGN_IN_GATEWAY_BACKEND_PORT", opts.BackendPort)
		setEnvInt("AI_SIGN_IN_GATEWAY_PORT", opts.BackendPort)
	}
	if opts.FrontendPort > 0 {
		setEnvInt("AI_SIGN_IN_GATEWAY_FRONTEND_PORT", opts.FrontendPort)
	}
	if opts.OpenBrowser != nil {
		setEnvBool("AI_SIGN_IN_GATEWAY_OPEN_BROWSER", *opts.OpenBrowser)
	}
	if opts.Desktop != nil {
		setEnvBool("AI_SIGN_IN_GATEWAY_DESKTOP", *opts.Desktop)
	}
}

func parseStopOptions(args []string, output io.Writer) (stopOptions, error) {
	var opts stopOptions
	var shortPort int
	fs := newStopFlagSet(output, &opts, &shortPort)
	fs.Usage = func() {
		fmt.Fprintf(output, "%s stop 用法:\n\n", appName)
		fmt.Fprintf(output, "  %s stop\n", appName)
		fmt.Fprintf(output, "  %s stop --port 9000\n", appName)
		fmt.Fprintf(output, "  %s stop --frontend-port 3722 --backend-port 8973\n\n", appName)
		fmt.Fprintln(output, "可用参数:")
		fs.PrintDefaults()
	}
	if err := fs.Parse(args); err != nil {
		return stopOptions{}, err
	}
	if fs.NArg() > 0 {
		return stopOptions{}, fmt.Errorf("未知停止参数: %s", strings.Join(fs.Args(), " "))
	}
	if opts.Port > 0 && shortPort > 0 && opts.Port != shortPort {
		return stopOptions{}, fmt.Errorf("--port 和 -p 不能同时设置为不同端口")
	}
	if opts.Port == 0 {
		opts.Port = shortPort
	}
	if opts.BackendPort == 0 {
		opts.BackendPort = opts.Port
	}
	for label, port := range map[string]int{
		"--port":          opts.Port,
		"--backend-port":  opts.BackendPort,
		"--frontend-port": opts.FrontendPort,
	} {
		if port != 0 && !validPort(port) {
			return stopOptions{}, fmt.Errorf("%s 端口无效: %d", label, port)
		}
	}
	return opts, nil
}

func newStopFlagSet(output io.Writer, opts *stopOptions, shortPort *int) *flag.FlagSet {
	if output == nil {
		output = io.Discard
	}
	fs := flag.NewFlagSet(appName+" stop", flag.ContinueOnError)
	fs.SetOutput(output)
	if opts == nil {
		opts = &stopOptions{}
	}
	if shortPort == nil {
		shortPort = new(int)
	}
	fs.StringVar(&opts.Host, "host", "", "监听地址，仅用于按默认端口推断本地探测地址")
	fs.IntVar(&opts.Port, "port", 0, "快速设置服务/API/网关端口")
	fs.IntVar(shortPort, "p", 0, "快速设置服务/API/网关端口，等同 --port")
	fs.IntVar(&opts.BackendPort, "backend-port", 0, "桌面模式后端/API/网关端口，优先级高于 --port")
	fs.IntVar(&opts.FrontendPort, "frontend-port", 0, "桌面模式前端窗口入口端口")
	return fs
}

func runStopCommand(args []string, output io.Writer) error {
	opts, err := parseStopOptions(args, output)
	if errors.Is(err, flag.ErrHelp) {
		return nil
	}
	if err != nil {
		return err
	}
	host := envString("AI_SIGN_IN_GATEWAY_HOST", defaultHost)
	if strings.TrimSpace(opts.Host) != "" {
		host = strings.TrimSpace(opts.Host)
	}
	backendPort := envFirstInt([]string{"AI_SIGN_IN_GATEWAY_BACKEND_PORT", "AI_SIGN_IN_GATEWAY_PORT"}, defaultBackendPort)
	frontendPort := envInt("AI_SIGN_IN_GATEWAY_FRONTEND_PORT", defaultFrontendPort)
	ports := stopPortCandidates(opts, backendPort, frontendPort)
	results := runtimecontrol.StopAppProcessesOnPorts(ports, nil, appName)
	printStopResults(output, host, ports, results)
	return nil
}

func stopPortCandidates(opts stopOptions, backendPort, frontendPort int) []int {
	var ports []int
	if opts.BackendPort > 0 || opts.FrontendPort > 0 {
		if opts.BackendPort > 0 {
			ports = append(ports, opts.BackendPort)
		}
		if opts.FrontendPort > 0 {
			ports = append(ports, opts.FrontendPort)
		}
		return uniquePorts(ports)
	}
	for offset := 0; offset <= maxDesktopPortOffset; offset++ {
		ports = append(ports, backendPort+offset)
	}
	for offset := 0; offset <= maxDesktopPortOffset; offset++ {
		ports = append(ports, frontendPort+offset)
	}
	return uniquePorts(ports)
}

func uniquePorts(ports []int) []int {
	seen := map[int]bool{}
	out := make([]int, 0, len(ports))
	for _, port := range ports {
		if port <= 0 || seen[port] {
			continue
		}
		seen[port] = true
		out = append(out, port)
	}
	return out
}

func printStopResults(output io.Writer, host string, ports []int, results []runtimecontrol.StopPortResult) {
	if output == nil {
		output = io.Discard
	}
	stopped := 0
	for _, result := range results {
		if result.Stopped {
			stopped++
		}
		status := "跳过"
		if result.Stopped {
			status = "停止"
		}
		detail := result.Message
		if result.PID > 0 {
			detail = fmt.Sprintf("pid=%d %s", result.PID, detail)
		}
		fmt.Fprintf(output, "[%s] %s:%d %s\n", status, localProbeHost(host), result.Port, detail)
	}
	if len(results) == 0 {
		fmt.Fprintf(output, "未找到需要检查的端口: %v\n", ports)
		return
	}
	fmt.Fprintf(output, "已停止 %d 个本程序进程。\n", stopped)
}

func validPort(port int) bool {
	return port > 0 && port <= 65535
}

func setEnvIfNotEmpty(key, value string) {
	value = strings.TrimSpace(value)
	if value != "" {
		_ = os.Setenv(key, value)
	}
}

func setEnvInt(key string, value int) {
	_ = os.Setenv(key, strconv.Itoa(value))
}

func setEnvBool(key string, value bool) {
	_ = os.Setenv(key, strconv.FormatBool(value))
}

func desktopFrontendHandler(api http.Handler, backendURL string) http.Handler {
	target, err := url.Parse(backendURL)
	if err != nil {
		return shellHandler(api)
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	return funcHandler(func(w http.ResponseWriter, r *http.Request) {
		if shellAPIPath(r.URL.Path) {
			proxy.ServeHTTP(w, r)
			return
		}
		if embedded, ok := embeddedFrontend(); ok {
			serveEmbeddedFrontend(embedded, w, r)
			return
		}
		serveFrontend(findFrontendDist(), w, r)
	})
}

type funcHandler func(http.ResponseWriter, *http.Request)

func (fn funcHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	fn(w, r)
}

func shellHandler(api http.Handler) http.Handler {
	if embedded, ok := embeddedFrontend(); ok {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if shellAPIPath(r.URL.Path) {
				api.ServeHTTP(w, r)
				return
			}
			serveEmbeddedFrontend(embedded, w, r)
		})
	}
	dist := findFrontendDist()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if shellAPIPath(r.URL.Path) {
			api.ServeHTTP(w, r)
			return
		}
		serveFrontend(dist, w, r)
	})
}

func shellAPIPath(path string) bool {
	return path == "/api" ||
		strings.HasPrefix(path, "/api/") ||
		path == "/v1" ||
		strings.HasPrefix(path, "/v1/")
}

func findFrontendDist() string {
	candidates := []string{}
	if cwd, err := os.Getwd(); err == nil {
		candidates = append(candidates, filepath.Join(cwd, "frontend", "dist"))
	}
	if exe, err := os.Executable(); err == nil {
		dir := filepath.Dir(exe)
		candidates = append(candidates, filepath.Join(dir, "frontend", "dist"))
		candidates = append(candidates, filepath.Join(dir, "..", "frontend", "dist"))
	}
	for _, candidate := range candidates {
		if exists(filepath.Join(candidate, "index.html")) {
			return candidate
		}
	}
	return filepath.Join("frontend", "dist")
}

func pathWithinDir(root string, target string) bool {
	rootAbs, err := filepath.Abs(filepath.Clean(root))
	if err != nil {
		return false
	}
	targetAbs, err := filepath.Abs(filepath.Clean(target))
	if err != nil {
		return false
	}
	rel, err := filepath.Rel(rootAbs, targetAbs)
	if err != nil {
		return false
	}
	return rel == "." || (rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator)) && !filepath.IsAbs(rel))
}

func serveFrontend(dist string, w http.ResponseWriter, r *http.Request) {
	if !exists(filepath.Join(dist, "index.html")) {
		http.Error(w, "frontend/dist 不存在，请先执行 npm run build", http.StatusServiceUnavailable)
		return
	}
	cleanPath := filepath.Clean(strings.TrimPrefix(r.URL.Path, "/"))
	if cleanPath == "." {
		cleanPath = "index.html"
	}
	requested := filepath.Join(dist, cleanPath)
	if pathWithinDir(dist, requested) {
		if info, err := os.Stat(requested); err == nil && !info.IsDir() {
			if contentType := frontendContentType(requested); contentType != "" {
				w.Header().Set("Content-Type", contentType)
			}
			if cleanPath == "index.html" {
				setFrontendIndexCacheHeaders(w)
			}
			http.ServeFile(w, r, requested)
			return
		}
	}
	if isStaticAssetRequest(r.URL.Path) {
		http.NotFound(w, r)
		return
	}
	setFrontendIndexCacheHeaders(w)
	http.ServeFile(w, r, filepath.Join(dist, "index.html"))
}

func serveEmbeddedFrontend(frontend fs.FS, w http.ResponseWriter, r *http.Request) {
	cleanPath := filepath.Clean(strings.TrimPrefix(r.URL.Path, "/"))
	if cleanPath == "." || cleanPath == "/" {
		cleanPath = "index.html"
	}
	cleanPath = filepath.ToSlash(cleanPath)
	if strings.HasPrefix(cleanPath, "../") || cleanPath == ".." {
		http.NotFound(w, r)
		return
	}
	if info, err := fs.Stat(frontend, cleanPath); err == nil && !info.IsDir() {
		if contentType := frontendContentType(cleanPath); contentType != "" {
			w.Header().Set("Content-Type", contentType)
		}
		if cleanPath == "index.html" {
			setFrontendIndexCacheHeaders(w)
		}
		http.ServeContent(w, r, cleanPath, info.ModTime(), mustOpenEmbedded(frontend, cleanPath))
		return
	}
	if isStaticAssetRequest(r.URL.Path) {
		http.NotFound(w, r)
		return
	}
	index, err := fs.ReadFile(frontend, "index.html")
	if err != nil {
		http.Error(w, "embedded frontend/index.html 不存在", http.StatusServiceUnavailable)
		return
	}
	if contentType := mime.TypeByExtension(".html"); contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
	setFrontendIndexCacheHeaders(w)
	http.ServeContent(w, r, "index.html", time.Time{}, bytes.NewReader(index))
}

func setFrontendIndexCacheHeaders(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "no-cache")
}

func mustOpenEmbedded(frontend fs.FS, name string) *bytes.Reader {
	content, err := fs.ReadFile(frontend, name)
	if err != nil {
		panic("embedded frontend asset is not readable: " + name)
	}
	return bytes.NewReader(content)
}

func isStaticAssetRequest(requestPath string) bool {
	cleanPath := strings.TrimSpace(requestPath)
	if cleanPath == "" || cleanPath == "/" {
		return false
	}
	if strings.HasPrefix(cleanPath, "/assets/") {
		return true
	}
	ext := strings.ToLower(filepath.Ext(cleanPath))
	switch ext {
	case ".js", ".mjs", ".css", ".map", ".json", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".otf", ".txt", ".xml":
		return true
	case ".webmanifest":
		return true
	default:
		return false
	}
}

func frontendContentType(name string) string {
	if strings.EqualFold(filepath.Ext(name), ".webmanifest") {
		return "application/manifest+json"
	}
	return mime.TypeByExtension(filepath.Ext(name))
}

func browserURL(host string, port int) string {
	if host == "" || host == "0.0.0.0" || host == "::" {
		host = "127.0.0.1"
	}
	return fmt.Sprintf("http://%s", net.JoinHostPort(host, strconv.Itoa(port)))
}

func openBrowser(target string) {
	time.Sleep(500 * time.Millisecond)
	_ = runtimecontrol.OpenURL(target)
}

func exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func envString(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envFirstInt(keys []string, fallback int) int {
	for _, key := range keys {
		value := strings.TrimSpace(os.Getenv(key))
		if value == "" {
			continue
		}
		parsed, err := strconv.Atoi(value)
		if err == nil {
			return parsed
		}
	}
	return fallback
}

func defaultPortOwner(host string, defaultPort, currentPort int) string {
	if defaultPort == currentPort {
		return "当前程序"
	}
	if !runtimecontrol.IsPortOccupied(localProbeHost(host), defaultPort) {
		return "未占用"
	}
	return describePortOccupant(defaultPort)
}

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func defaultOpenBrowserEnabled() bool {
	parsed, err := strconv.ParseBool(strings.TrimSpace(defaultOpenBrowser))
	if err != nil {
		return true
	}
	return parsed
}
