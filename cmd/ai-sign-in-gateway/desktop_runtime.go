package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"ai-sign-in-gateway/internal/handlers"
	"ai-sign-in-gateway/internal/runtimecontrol"
	"gorm.io/gorm"
)

type desktopRuntime struct {
	FrontendURL string
	BackendURL  string
	GatewayURL  string
	ConfigDir   string
	App         *handlers.App
	Backend     *http.Server
	Frontend    *http.Server
	BackendLn   net.Listener
	FrontendLn  net.Listener
}

func (rt desktopRuntime) database() *gorm.DB {
	if rt.App == nil {
		return nil
	}
	return rt.App.DB
}

type desktopTraySnapshot struct {
	Summary string
	Routes  string
	Traffic string
	Tooltip string
}

type desktopServiceInfo struct {
	Status          string `json:"status"`
	App             string `json:"app"`
	PublicURL       string `json:"public_url"`
	GatewayURL      string `json:"gateway_url"`
	Port            int    `json:"port"`
	BackendPort     int    `json:"backend_port"`
	RuntimeProtocol int    `json:"runtime_protocol"`
	ConfigDir       string `json:"config_dir"`
}

func runHTTPServer(ctx context.Context, server *http.Server, listener net.Listener) <-chan error {
	errCh := make(chan error, 1)
	go func() {
		defer close(errCh)
		if server == nil || listener == nil {
			return
		}
		err := server.Serve(listener)
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
	}()
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
	}()
	return errCh
}

func findRunningDesktopService(host string, startPort int, maxOffset int) (desktopServiceInfo, bool) {
	probeHost := localProbeHost(host)
	client := &http.Client{Timeout: 350 * time.Millisecond}
	for offset := 0; offset <= maxOffset; offset++ {
		port := startPort + offset
		url := fmt.Sprintf("http://%s/api/health", net.JoinHostPort(probeHost, fmt.Sprintf("%d", port)))
		resp, err := client.Get(url)
		if err != nil {
			continue
		}
		var info desktopServiceInfo
		decodeErr := json.NewDecoder(resp.Body).Decode(&info)
		_ = resp.Body.Close()
		if resp.StatusCode != http.StatusOK || decodeErr != nil {
			continue
		}
		if info.Status == "ok" && info.App == appName {
			if info.PublicURL == "" {
				info.PublicURL = browserURL(host, port)
			}
			if info.GatewayURL == "" {
				info.GatewayURL = info.PublicURL + "/api/gateway"
			}
			if info.Port == 0 {
				info.Port = port
			}
			return info, true
		}
	}
	return desktopServiceInfo{}, false
}

func listenWithPortOffset(host string, startPort int, maxOffset int) (net.Listener, int, error) {
	var lastErr error
	for offset := 0; offset <= maxOffset; offset++ {
		port := startPort + offset
		listener, err := net.Listen("tcp", net.JoinHostPort(host, fmt.Sprintf("%d", port)))
		if err == nil {
			return listener, port, nil
		}
		lastErr = err
		if isAddrInUse(err) {
			continue
		}
		return nil, 0, err
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("没有可用端口")
	}
	return nil, 0, lastErr
}

func isAddrInUse(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "address already in use") || strings.Contains(message, "only one usage of each socket address")
}

func runningServiceUsesDifferentConfig(existing desktopServiceInfo, configDir string) bool {
	if strings.TrimSpace(existing.ConfigDir) == "" || strings.TrimSpace(configDir) == "" {
		return false
	}
	existingDir, err := filepath.Abs(filepath.Clean(existing.ConfigDir))
	if err != nil {
		return false
	}
	currentDir, err := filepath.Abs(filepath.Clean(configDir))
	if err != nil {
		return false
	}
	return existingDir != currentDir
}

func desktopConsoleURL(baseURL string) string {
	return strings.TrimRight(baseURL, "/") + "/desktop"
}

func localProbeHost(host string) string {
	switch strings.TrimSpace(host) {
	case "", "0.0.0.0", "::":
		return "127.0.0.1"
	default:
		return host
	}
}

func describePortOccupant(port int) string {
	return runtimecontrol.DescribePortOccupant(port)
}
