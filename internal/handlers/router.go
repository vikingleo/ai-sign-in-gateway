package handlers

import (
	"net/http"

	"ai-sign-in-gateway/internal/config"
	"ai-sign-in-gateway/internal/features"
	"ai-sign-in-gateway/internal/middleware"
	"ai-sign-in-gateway/internal/plugins"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

type App struct {
	DB            *gorm.DB
	Cfg           config.Config
	PluginManager *plugins.Manager
}

func NewRouter(db *gorm.DB, cfg config.Config) http.Handler {
	return NewApp(db, cfg).Router()
}

func NewApp(db *gorm.DB, cfg config.Config) *App {
	return &App{DB: db, Cfg: cfg, PluginManager: plugins.NewManager()}
}

func (app *App) Router() http.Handler {
	if app.PluginManager == nil {
		app.PluginManager = plugins.NewManager()
	}
	r := chi.NewRouter()
	r.Use(middleware.CORS(app.Cfg.CORSOrigins))

	r.Get("/api/health", app.Health)
	r.Post("/api/auth/login", app.Login)
	r.Get("/api/public/invites", app.PublicInvites)

	r.Group(func(protected chi.Router) {
		protected.Use(middleware.RequireAdminDynamic(func() *gorm.DB {
			return app.DB
		}, app.Cfg))
		protected.Get("/api/auth/me", app.Me)
		protected.Put("/api/auth/account", app.UpdateAccount)
		protected.Route("/api/auth/admin-users", app.AdminUserRoutes)
		protected.Get("/api/overview", app.Overview)
		protected.Get("/api/features", app.Features)
		protected.Get("/api/plugins", app.Plugins)
		protected.Get("/api/sites", app.ListSites)
		protected.Post("/api/sites", app.CreateSite)
		protected.Route("/api/sites", app.SiteRoutes)
		protected.Get("/api/settings", app.GetSettings)
		protected.Put("/api/settings", app.UpdateSettings)
		protected.Route("/api/checkins", app.CheckinRoutes)
		protected.Route("/api/settings", app.SettingsRoutes)
		protected.Route("/api/tools", app.ToolRoutes)
		protected.Route("/api/gateway-admin", app.GatewayAdminRoutes)
		for _, module := range features.List() {
			if module.RoutePath == "" || module.RegisterRoutes == nil {
				continue
			}
			module := module
			protected.With(app.requireFeatureEnabled(module.Key)).Route(module.RoutePath, func(r chi.Router) {
				module.RegisterRoutes(features.Runtime{
					DB:            app.DB,
					PluginManager: app.PluginManager,
					Settings:      app.systemSettings,
				}, r)
			})
		}
	})

	r.HandleFunc("/api/gateway/v1/*", app.GatewayProxy)
	r.HandleFunc("/api/gateway/v1", app.GatewayProxy)
	r.HandleFunc("/api/gateway/*", app.GatewayProxy)
	r.HandleFunc("/api/gateway", app.GatewayProxy)
	r.HandleFunc("/v1/*", app.GatewayProxy)
	r.HandleFunc("/v1", app.GatewayProxy)
	r.HandleFunc("/responses/*", app.GatewayProxy)
	r.HandleFunc("/responses", app.GatewayProxy)
	return r
}

func (a *App) Health(w http.ResponseWriter, r *http.Request) {
	info := GetRuntimeInfo()
	writeJSON(w, http.StatusOK, map[string]any{
		"status":             "ok",
		"app":                "ai-sign-in-gateway",
		"public_url":         info.FrontendURL,
		"frontend_url":       info.FrontendURL,
		"backend_url":        info.BackendURL,
		"gateway_url":        info.GatewayURL,
		"port":               info.FrontendPort,
		"backend_port":       info.BackendPort,
		"runtime_protocol":   info.RuntimeProtocol,
		"config_dir":         info.ConfigDir,
		"default_config_dir": info.DefaultConfigDir,
		"database_path":      info.DatabasePath,
	})
}
