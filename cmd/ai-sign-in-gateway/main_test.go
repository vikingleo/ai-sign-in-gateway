package main

import (
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

func TestListenWithPortOffsetSkipsOccupiedPort(t *testing.T) {
	occupied, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("occupy port: %v", err)
	}
	defer occupied.Close()

	startPort := occupied.Addr().(*net.TCPAddr).Port
	listener, actualPort, err := listenWithPortOffset("127.0.0.1", startPort, maxDesktopPortOffset)
	if err != nil {
		t.Fatalf("listen with offset: %v", err)
	}
	defer listener.Close()

	if actualPort == startPort {
		t.Fatalf("expected port offset, got same port %d", actualPort)
	}
	if actualPort < startPort || actualPort > startPort+maxDesktopPortOffset {
		t.Fatalf("actual port %d outside expected range [%d, %d]", actualPort, startPort, startPort+maxDesktopPortOffset)
	}
}

func TestDefaultPortOwnerReportsCurrentProgramAndFreePort(t *testing.T) {
	if got := defaultPortOwner("127.0.0.1", 8972, 8972); got != "当前程序" {
		t.Fatalf("defaultPortOwner current program = %q", got)
	}

	free, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("reserve free port: %v", err)
	}
	port := free.Addr().(*net.TCPAddr).Port
	if err := free.Close(); err != nil {
		t.Fatalf("close free port listener: %v", err)
	}

	if got := defaultPortOwner("127.0.0.1", port, port+1); got != "未占用" {
		t.Fatalf("defaultPortOwner free port = %q for port %s", got, strconv.Itoa(port))
	}
}

func TestParseStartupOptionsPortShortcuts(t *testing.T) {
	opts, err := parseStartupOptions([]string{"--port", "9000", "--host", "0.0.0.0", "--no-browser", "--no-desktop"}, io.Discard)
	if err != nil {
		t.Fatal(err)
	}
	if opts.Host != "0.0.0.0" || opts.Port != 9000 || opts.BackendPort != 9000 {
		t.Fatalf("unexpected port options: %+v", opts)
	}
	if opts.OpenBrowser == nil || *opts.OpenBrowser {
		t.Fatalf("expected no-browser option, got %+v", opts.OpenBrowser)
	}
	if opts.Desktop == nil || *opts.Desktop {
		t.Fatalf("expected no-desktop option, got %+v", opts.Desktop)
	}

	opts, err = parseStartupOptions([]string{"-p", "9010"}, io.Discard)
	if err != nil {
		t.Fatal(err)
	}
	if opts.Port != 9010 || opts.BackendPort != 9010 {
		t.Fatalf("short port not applied: %+v", opts)
	}
}

func TestParseStartupOptionsDesktopPorts(t *testing.T) {
	opts, err := parseStartupOptions([]string{"--frontend-port", "3722", "--backend-port", "8973", "--config-dir", "/tmp/aigw"}, io.Discard)
	if err != nil {
		t.Fatal(err)
	}
	if opts.FrontendPort != 3722 || opts.BackendPort != 8973 || opts.ConfigDir != "/tmp/aigw" {
		t.Fatalf("unexpected desktop options: %+v", opts)
	}
}

func TestParseStartupOptionsRejectsConflicts(t *testing.T) {
	tests := [][]string{
		{"--port", "9000", "-p", "9001"},
		{"--browser", "--no-browser"},
		{"--desktop", "--no-desktop"},
		{"--port", "70000"},
	}
	for _, args := range tests {
		if _, err := parseStartupOptions(args, io.Discard); err == nil {
			t.Fatalf("expected error for args %v", args)
		}
	}
}

func TestShellAPIPathIncludesGatewayRootV1(t *testing.T) {
	tests := map[string]bool{
		"/api":                 true,
		"/api/gateway/v1":      true,
		"/v1":                  true,
		"/v1/models":           true,
		"/v1/chat/completions": true,
		"/":                    false,
		"/settings":            false,
		"/assets/index.js":     false,
	}
	for path, want := range tests {
		if got := shellAPIPath(path); got != want {
			t.Fatalf("shellAPIPath(%q) = %v, want %v", path, got, want)
		}
	}
}

func TestShellHandlerPassesGatewayRootV1ToAPI(t *testing.T) {
	called := false
	api := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		if r.URL.Path != "/v1/models" {
			t.Fatalf("path = %q", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true}`))
	})

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/models", nil)
	shellHandler(api).ServeHTTP(rec, req)

	if !called {
		t.Fatal("api handler was not called")
	}
	if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("status=%d content-type=%q body=%s", rec.Code, rec.Header().Get("Content-Type"), rec.Body.String())
	}
}

func TestServeFrontendRejectsSiblingPrefixTraversal(t *testing.T) {
	root := t.TempDir()
	dist := filepath.Join(root, "dist")
	sibling := filepath.Join(root, "dist-outside")
	if err := os.MkdirAll(dist, 0o755); err != nil {
		t.Fatalf("create dist: %v", err)
	}
	if err := os.MkdirAll(sibling, 0o755); err != nil {
		t.Fatalf("create sibling: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dist, "index.html"), []byte("index"), 0o600); err != nil {
		t.Fatalf("write index: %v", err)
	}
	if err := os.WriteFile(filepath.Join(sibling, "outside.txt"), []byte("outside"), 0o600); err != nil {
		t.Fatalf("write outside: %v", err)
	}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/../dist-outside/outside.txt", nil)
	serveFrontend(dist, rec, req)

	if rec.Code == http.StatusOK || strings.Contains(rec.Body.String(), "outside") {
		t.Fatalf("serveFrontend escaped dist: status=%d body=%q", rec.Code, rec.Body.String())
	}
}

func TestServeFrontendWebManifestContentType(t *testing.T) {
	dist := t.TempDir()
	if err := os.WriteFile(filepath.Join(dist, "index.html"), []byte("index"), 0o600); err != nil {
		t.Fatalf("write index: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dist, "site.webmanifest"), []byte(`{"name":"app"}`), 0o600); err != nil {
		t.Fatalf("write manifest: %v", err)
	}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/site.webmanifest", nil)
	serveFrontend(dist, rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%q", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Content-Type"); !strings.HasPrefix(got, "application/manifest+json") {
		t.Fatalf("Content-Type = %q", got)
	}
	if !isStaticAssetRequest("/missing.webmanifest") {
		t.Fatal(".webmanifest should be treated as a static asset")
	}
}

func TestServeFrontendDisablesIndexCache(t *testing.T) {
	dist := t.TempDir()
	if err := os.WriteFile(filepath.Join(dist, "index.html"), []byte("index"), 0o600); err != nil {
		t.Fatalf("write index: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(dist, "assets"), 0o755); err != nil {
		t.Fatalf("create assets: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dist, "assets", "index.js"), []byte("console.log('ok')"), 0o600); err != nil {
		t.Fatalf("write asset: %v", err)
	}

	for _, path := range []string{"/", "/overview"} {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, path, nil)
		serveFrontend(dist, rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("%s status=%d body=%q", path, rec.Code, rec.Body.String())
		}
		if got := rec.Header().Get("Cache-Control"); got != "no-cache" {
			t.Fatalf("%s Cache-Control = %q, want no-cache", path, got)
		}
	}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/assets/index.js", nil)
	serveFrontend(dist, rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("asset status=%d body=%q", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Cache-Control"); got != "" {
		t.Fatalf("asset Cache-Control = %q, want empty", got)
	}
}
