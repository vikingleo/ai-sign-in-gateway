# 开发文档

面向贡献者：从 clone 到本地开发、构建、测试和提交的完整说明。

相关文档：

- 项目入口与快速开始：[`README.md`](../README.md)
- 部署上线：[`docs/DEPLOYMENT.md`](DEPLOYMENT.md)
- 功能操作：[`docs/USAGE.md`](USAGE.md)

---

## 目录

- [技术栈](#技术栈)
- [仓库结构](#仓库结构)
- [先决条件](#先决条件)
- [安装依赖工具链](#安装依赖工具链)
- [Clone 到本地开发](#clone-到本地开发)
- [构建](#构建)
- [测试](#测试)
- [环境变量](#环境变量)
- [数据库与迁移](#数据库与迁移)
- [API 速览](#api-速览)
- [代码约定](#代码约定)

---

## 技术栈

### 后端 (Go)

| 模块 | 版本 / 选型 | 用途 |
|---|---|---|
| Go | `1.25+`（见 `go.mod`） | 主语言 |
| `github.com/go-chi/chi/v5` | `v5.2` | HTTP 路由 |
| `gorm.io/gorm` | `v1.31` | ORM |
| `github.com/glebarez/sqlite` | `v1.11` | 纯 Go SQLite 驱动（**无需 CGO**） |
| `github.com/golang-jwt/jwt/v5` | `v5.3` | 管理员 JWT |
| `golang.org/x/crypto` | `v0.50` | bcrypt + HMAC 等 |

设计要点：

- 单一二进制，纯 Go（`CGO_ENABLED=0` 即可静态编译）
- 默认 SQLite 文件 DB，开箱即用；`DATABASE_URL` 可换源
- 路由分层：`/api/auth/*`（公开 + 受保护）、`/api/sites|gateway-admin|...`（管理后台 API）、`/api/gateway/*`（聚合代理，兼容 `/api/gateway/v1/*`）
- 网关核心放在 `internal/services/gateway_service.go`，含调度 / 熔断 / 流式 / 观测

### 前端 (Vue)

| 模块 | 版本 | 用途 |
|---|---|---|
| Vue | `^3.5` | 框架 |
| Vite | `^8.0` | 构建 |
| TypeScript | `~6.0` | 类型 |
| `ant-design-vue` | `^4.2` | UI 组件 |
| `vue-router` | `^4.6` | 路由 |
| `unplugin-vue-components` | `^32` | 按需注册组件 |

### 部署 / 运行时

- 裸机：`run.sh` / `start-prod.sh`（systemd 友好）
- 容器：单 `Dockerfile`（多阶段：node22 → golang1.25 → alpine3.20）
- 离线分发：`package-release.sh` 产出 `.tar.gz`，含二进制、前端 dist、文档和启动脚本

---

## 仓库结构

```
.
├── cmd/ai-sign-in-gateway/      # Go 入口（main.go + 桌面包壳模板）
├── internal/
│   ├── config/                  # 环境变量与默认配置
│   ├── database/                # GORM 初始化
│   ├── handlers/                # HTTP handler，按域分文件
│   ├── httpx/                   # 请求/响应小工具
│   ├── middleware/              # CORS / Auth 中间件
│   ├── migrations/              # 运行时轻量迁移
│   ├── models/                  # GORM 实体 + JSONMap 类型
│   ├── plugins/                 # 4 个站点适配插件（含 TOTP 集成）
│   ├── schemas/                 # API 请求/响应 DTO
│   ├── security/                # bcrypt / JWT
│   ├── seed/                    # 默认管理员/系统设置初始化
│   └── services/                # 业务核心：网关代理、浏览器 HTTP、TOTP
├── frontend/
│   ├── src/views/               # 视图：Sites / Gateway / Checkins / ...
│   ├── src/components/          # 通用组件
│   ├── src/composables/         # 复用 hook
│   ├── src/api.ts               # 统一 fetch 封装
│   ├── src/router.ts            # vue-router 路由表
│   └── vite.config.ts           # Vite + 代理配置
├── docs/                        # 开发文档（本文件所在）
├── scripts/                     # 打包脚本
├── Dockerfile / compose.yaml    # 容器化
├── run.sh / stop.sh             # 开发起停
├── start-prod.sh / stop-prod.sh # 生产起停
└── package-release.sh           # 发布包构建
```

后端按"域"组织 handler：`sites.go` / `checkins.go` / `gateway_admin.go` / `overview.go` / `settings.go` / `tools.go` / `auth.go`，每个文件挂自己的子路由。

---

## 先决条件

| 工具 | 最低版本 | 备注 |
|---|---|---|
| Go | 1.25 | `go.mod` 锁定 |
| Node.js | 22 | Vite 8 要求 |
| npm | 10+ | 随 Node 22 |
| Git | 任意 |  |
| `ss` | 任意 | `run.sh` 用于探测端口 |
| Docker | 24+ | 仅容器部署需要 |

平台：Linux / macOS。Windows 建议 WSL2。

---

## 安装依赖工具链

如果你的环境里已经有 Go 1.25+ 和 Node 22+，可直接跳到 [Clone 到本地开发](#clone-到本地开发)。

### Go (1.25+)

**Linux（Ubuntu / Debian）**

apt 仓库的 `golang-go` 通常滞后，建议用官方 tarball：

```bash
GO_VERSION=1.25.0
curl -fsSL https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz \
  | sudo tar -C /usr/local -xz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
go version
```

**macOS**

```bash
brew install go
```

**Windows**

```powershell
winget install GoLang.Go
# 或
scoop install go
```

### Node.js (22+) + npm (10+)

**所有平台都推荐用版本管理器**（避免污染系统）：

```bash
# nvm（Linux / macOS / WSL）
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22
nvm use 22

# 或 fnm（更快，跨平台）
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 22
fnm use 22
```

**直接装**：

```bash
# macOS
brew install node@22

# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
winget install OpenJS.NodeJS.LTS
```

### Docker（仅容器部署需要）

- Linux：`curl -fsSL https://get.docker.com | sh`
- macOS / Windows：装 Docker Desktop

### 国内网络加速（强烈推荐）

首次 `go mod download` / `npm install` 经常因 `proxy.golang.org` 与 `registry.npmjs.org` 抽风而卡死。设一次镜像源就好：

```bash
# Go：永久写到 ~/.config/go/env
go env -w GOPROXY=https://goproxy.cn,direct
go env -w GOSUMDB=sum.golang.google.cn

# npm：写到 ~/.npmrc
npm config set registry https://registry.npmmirror.com
```

回退到官方源：`go env -u GOPROXY` / `npm config delete registry`。

### 校验

```bash
go version       # 期望: go1.25.x
node --version   # 期望: v22.x
npm --version    # 期望: 10.x 或更高
git --version
ss --version 2>/dev/null || echo "ss 缺失（仅 run.sh 端口探测需要）"
```

任意一项不达标 → 回到上面对应小节。

---

## Clone 到本地开发

```bash
git clone <repo-url> ai-sign-in-gateway
cd ai-sign-in-gateway

# 1. 拉前端依赖（首次推荐 npm ci，遵循 package-lock.json 严格还原）
cd frontend && npm ci && cd ..

# 2. 拉 Go 依赖（不强制，go build / go run 会自动拉）
go mod download

# 3. 一键起后端 + 前端
./run.sh
```

> **`npm ci` vs `npm install`**：
> - **首次安装** / **CI** / **生产构建** → `npm ci`（严格按 `package-lock.json`，更快、可复现）
> - **本地开发要加新依赖时** → `npm install <pkg>`（会更新 `package-lock.json`）
>
> 当前文档 / 脚本里：开发首拉用 `ci`；`package-release.sh` 在已有 `node_modules` 时退回 `install` 是为了少量修补。

### 验证起来了

`./run.sh` 终端会打印实际端口。在另一终端：

```bash
# 后端健康检查（端口替换为 .run/backend.port 实际值）
curl http://127.0.0.1:8972/api/health
# 期望：{"status":"ok"}

# 前端首页（端口 3721 或 .run/frontend.port 实际值）
curl -I http://127.0.0.1:3721
# 期望：HTTP/1.1 200 OK
```

浏览器打开 `http://127.0.0.1:3721`，登录默认 `admin` / `admin123`，能看到"总览"页就成功了。

`run.sh` 行为：

- 编译 `./cmd/ai-sign-in-gateway` 到 `.run/bin/`
- 后端默认监听 `8972`（被占用自动跳号）
- Vite 固定 `3721`（被占用直接报错；`unplugin-vue-components` HMR 与端口绑定）
- Vite 开发代理默认把 `/api` 转发到 `http://127.0.0.1:8972`；如需连接其他后端，显式设置 `VITE_PROXY_TARGET=http://host:port`。不要让 8000 等无关服务占用默认代理目标，否则页面会把后端接口误判为 404。
- 日志：`.run/backend.log` / `.run/frontend.log`
- PID / 实际端口：`.run/{backend,frontend}.{pid,port}`

可以指定起始端口：

```bash
FRONTEND_PORT=9912 BACKEND_PORT=8001 ./run.sh
```

停止：

```bash
./stop.sh
```

### 默认管理员

- 用户名：`admin`
- 密码：`admin123`

> **必改**：登录后立即在 `设置 → 账号与密码` 修改。也可以在第一次启动前用 `DEFAULT_ADMIN_PASSWORD` 环境变量覆盖。

### 开发数据库位置

- 通过 `run.sh` 启动：`<repo>/.run/ai-sign-in-gateway-go.db`
- 直接 `go run ./cmd/...` 启动：`~/.ai-sign-in-gateway/ai-sign-in-gateway.db`
- 通过 `DATABASE_URL` 显式指定：`sqlite:///path/to/file.db`（`/` 分隔）或 `sqlite:////absolute/path.db`

---

## 构建

### 后端二进制

```bash
go build -trimpath -ldflags "-s -w" -o ./bin/ai-sign-in-gateway ./cmd/ai-sign-in-gateway
```

纯 Go，无 CGO，可直接交叉编译：

```bash
GOOS=linux   GOARCH=amd64 go build -o bin/ai-sign-in-gateway-linux-amd64   ./cmd/ai-sign-in-gateway
GOOS=darwin  GOARCH=arm64 go build -o bin/ai-sign-in-gateway-darwin-arm64  ./cmd/ai-sign-in-gateway
GOOS=windows GOARCH=amd64 go build -o bin/ai-sign-in-gateway-windows.exe   ./cmd/ai-sign-in-gateway
```

### 前端静态资源

```bash
cd frontend
npm run build      # 产物在 frontend/dist/
npm run preview    # 本地预览 dist
```

### 自包含单文件产物

```bash
# 一次构建服务版和桌面端分发包
./scripts/build-single-release.sh

# 无桌面服务器 Web 单文件，默认输出 Linux amd64
./scripts/build-server-single.sh

# 当前系统桌面自包含二进制
./scripts/build-desktop-single.sh

# Windows 单文件 exe，默认使用 GUI 子系统，不弹控制台
./scripts/build-windows-exe.sh

# Linux AppImage
./scripts/build-appimage.sh

# 当前系统桌面二进制、Linux AppImage、Windows exe
./scripts/build-desktop-platforms.sh
```

这些脚本会先构建 `frontend/dist`，再把静态资源嵌入 Go 二进制。服务版使用 `embedded_assets` build tag，默认监听 `0.0.0.0:8972`、不自动打开浏览器，端口被占用时继续沿用自动偏移策略。桌面版使用 `embedded_assets desktop_shell` build tag，产物不依赖外部 `frontend/dist`，默认启动本地服务、系统 WebView 主窗口和托盘。

托盘提供网关 24h 简要统计、路由健康、当前并发、站点连通率检测、同步路由、探测全部网关路由和打开关键页面。桌面壳不使用 Electron；Linux 走 GTK/WebKitGTK，Windows 走 WebView2。需要只构建本地服务形态时：

```bash
DESKTOP_SHELL=false ./scripts/build-desktop-single.sh
```

输出默认位于 `.release/`：

- `ai-sign-in-gateway-server-linux-amd64`：无桌面服务器 Web 单文件，可直接放到服务器运行。
- `ai-sign-in-gateway`：当前系统自包含二进制。
- `ai-sign-in-gateway-windows-amd64.exe`：Windows 单文件 GUI exe。调试时可用 `WINDOWS_GUI=false ./scripts/build-windows-exe.sh` 构建控制台版。
- `ai-sign-in-gateway-x86_64.AppImage`：Linux AppImage。

`build-appimage.sh` 需要 AppImageKit 官方 `appimagetool`。脚本会优先使用 `APPIMAGETOOL=/path/to/appimagetool-x86_64.AppImage`，否则查找 PATH，仍找不到时自动下载到 `.release/tools/`。
Linux 桌面壳构建还需要 `pkg-config`、`gtk+-3.0`、`webkit2gtk-4.0/4.1` 开发文件。Windows 交叉构建需要 `x86_64-w64-mingw32-gcc/g++`，脚本会补齐 WebView2 头文件兼容项。

### GitHub Release 发布

发布脚本会参考当前本地打包结果发布，不会切换当前工作区分支：

```bash
# 首次使用前安装并登录 GitHub CLI
gh auth login

# 创建 tag、构建本地单文件产物、发布 GitHub Release、同步 release 分支
./scripts/release.sh v1.0.0

# 已经执行过打包，只发布 .release/ 下已有产物
./scripts/release.sh v1.0.0 --skip-build

# 覆盖已有 tag 到当前 HEAD，并覆盖同名 GitHub Release 资产
./scripts/release.sh v1.0.0 --retag-current -y
```

默认发布流程：

- 使用 `origin` 作为 Git remote，可用 `GIT_REMOTE=<name>` 覆盖。
- 从 remote URL 解析 GitHub 仓库，可用 `GH_REPO=owner/repo` 覆盖。
- 默认执行 `./scripts/build-single-release.sh`，可用 `BUILD_COMMAND=<script>` 覆盖。
- 上传 `.release/` 下的服务版单文件、桌面分发包和 `SHA256SUMS` 到 GitHub Release。
- 同步 `release` 分支为纯产物分支；分支根目录只保留最新产物、`SHA256SUMS`、`RELEASE_NOTES.md`、`RELEASE.txt` 和说明文件，不保留源码。

---

## 测试

```bash
# 后端单元测试
go test -timeout=60s ./...

# 静态检查
go vet ./...

# 前端状态和静态契约测试
(cd frontend && npm test)

# 前端类型检查（build 已包含）
(cd frontend && npx vue-tsc -b)
```

测试当前覆盖：

- `internal/plugins/http_station_test.go` — HTTP Station 插件
- `internal/plugins/sub2api_platform_test.go` — sub2api 登录、状态、邀请和 token 刷新
- `internal/plugins/yellowpeach_newapi_test.go` — NewAPI 登录回退、签到、邀请和 API Key 同步
- `internal/plugins/invite_test.go` — 邀请链接拼接规则
- `internal/handlers/*_test.go` — 签到参与、公开邀请码、站点刷新和浏览器存储解析
- `internal/services/gateway_service_test.go` — 网关调度核心
- `frontend/tests/*.test.ts` — 前端状态模型、页面装配边界和视觉契约静态测试

`frontend/tests/switchVisualContract.test.ts` 会静态检查 Ant Design Switch 的共享 `app-switch` 样式、可访问名称、输入框和站点编辑器布局等视觉契约。修改共享样式、站点编辑器、页头或侧边栏时，必须与 `npm test` 一起运行。

新增功能优先按影响面补测试：插件逻辑放 `internal/plugins`，HTTP 行为放 `internal/handlers`，网关调度放 `internal/services`。

---

## 环境变量

后端在 `internal/config/config.go` 集中读取。所有变量都可空，会回退到默认值。

### 通用

| 变量 | 默认 | 说明 |
|---|---|---|
| `APP_NAME` | `爱签网关` | 显示名 |
| `AI_SIGN_IN_GATEWAY_HOST` | `127.0.0.1` | 监听地址，容器/生产改 `0.0.0.0` |
| `AI_SIGN_IN_GATEWAY_PORT` | `8972` | 服务模式后端/API/网关端口；兼容旧变量 |
| `AI_SIGN_IN_GATEWAY_BACKEND_PORT` | `8972` | 桌面模式后端/API/网关端口，优先级高于 `AI_SIGN_IN_GATEWAY_PORT` |
| `AI_SIGN_IN_GATEWAY_FRONTEND_PORT` | `3721` | 桌面模式前端窗口入口端口 |
| `AI_SIGN_IN_GATEWAY_OPEN_BROWSER` | `true` | CLI 启动后自动 `xdg-open`，容器需 `false` |
| `SCHEDULER_TIMEZONE` | `Asia/Shanghai` | 定时签到时区 |
| `CORS_ORIGINS` | `http://localhost:3721,http://127.0.0.1:3721` | CSV，前端域名白名单 |

单文件二进制支持快速启动参数，便于本地临时换端口：

```bash
./ai-sign-in-gateway --port 9000
./ai-sign-in-gateway --host 0.0.0.0 --port 9000 --no-browser
./ai-sign-in-gateway --frontend-port 3722 --backend-port 8973
```

### 安全

| 变量 | 默认 | 说明 |
|---|---|---|
| `SECRET_KEY` | `change-me-in-production-at-least-32-bytes` | JWT 签名密钥，**必改** |
| `GATEWAY_API_KEY` | _空_ | 初始化聚合网关 Bearer token；空值表示不校验网关 Bearer，不建议生产使用 |
| `ALGORITHM` | `HS256` | JWT 算法 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | JWT 过期分钟 |
| `DEFAULT_ADMIN_USERNAME` | `admin` | 仅首次启动建库时使用 |
| `DEFAULT_ADMIN_PASSWORD` | `admin123` | 仅首次启动建库时使用，**必改** |

### 数据

| 变量 | 默认 | 说明 |
|---|---|---|
| `DATABASE_URL` | `sqlite:///~/.ai-sign-in-gateway/...db` | `sqlite:///rel/path` 或 `sqlite:////abs/path` |

### 浏览器自动化（占位能力）

| 变量 | 默认 |
|---|---|
| `MANAGED_BROWSER_PROFILE_ROOT` | `~/.ai-sign-in-gateway/browser-profiles` |
| `MANAGED_BROWSER_HEADLESS` | `false` |
| `MANAGED_BROWSER_TIMEOUT_SECONDS` | `20` |
| `MANAGED_BROWSER_SETTLE_MS` | `1200` |

---

## 数据库与迁移

- ORM：GORM
- 引擎：纯 Go SQLite（`glebarez/sqlite`），生产建议保持 SQLite 即可，单机够用
- 实体定义：`internal/models/models.go`
- 启动时 `internal/migrations/migrations.go` 跑轻量 `AutoMigrate` + 手动补列
- JSON 字段：`internal/models/json.go` 提供 `JSONMap` 类型，支持 `driver.Valuer/Scanner`，DB 里以字符串存

运行时数据库切换和导入使用同一套迁移口径：

- HTTP 路由通过 `handlers.App` 持有当前 `DB`，认证中间件、设置接口和后台任务都读取运行时 `App.DB`。
- 导入或切换 SQLite 数据库后，必须执行 `migrations.Apply`、`database.NormalizeAdminUsers` 和 `seed.EnsureSystemSettings`，再替换 `App.DB`。
- 旧库迁移必须补齐核心运行表、缺失列、索引和 `site_queue_tasks` 表；依赖旧 schema 的改动要补离线迁移测试。
- 定时签到按当前 `App.DB` 读取设置和站点；数据库备份、日志清理按运行时数据库路径 provider 读取当前 SQLite 路径。
- 管理员归一化必须保证至少存在一个启用的 super admin；已有禁用 super admin 时，不应阻止启用账号被提升。

切换到 PostgreSQL / MySQL：

1. `go.mod` 加对应驱动（`gorm.io/driver/postgres` 等）
2. `internal/database/database.go` 按 scheme 分发
3. 把 `JSONMap` 的 `type:json` GORM tag 在不同方言下校准

---

## API 速览

后台管理 API（需要 JWT，前端登录后通过 `Authorization: Bearer ...` 携带）：

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/me` | 当前管理员 |
| PUT | `/api/auth/account` | 修改账号/密码 |
| GET/POST | `/api/sites` | 站点 CRUD |
| POST | `/api/sites/{id}/test` | 单站点连通测试 |
| POST | `/api/sites/refresh-summaries` | **批量连通测试**（一键） |
| POST | `/api/sites/{id}/checkin` | 单站点签到 |
| POST | `/api/checkins/batch` | 批量签到 |
| GET | `/api/overview` | 概览数据 |
| GET/PUT | `/api/settings` | 系统设置（含网关策略参数） |
| `*` | `/api/gateway-admin/*` | 网关后台：上游路由、Key 池、观测 |

聚合网关（公网入口，需 `GATEWAY_API_KEY`）：

| 方法 | 路径 | 说明 |
|---|---|---|
| `*` | `/api/gateway/*` | 推荐入口，透明代理到上游中转站，按策略调度 |
| `*` | `/api/gateway/v1/*` | 兼容旧入口 |

示例：

```bash
curl https://your-host/api/gateway/chat/completions?group=main \
  -H "Authorization: Bearer $GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}'
```

支持的查询参数：`?group=<分组>` / `?type=claude|codex|gemini`。

---

## 代码约定

### Go

- 路由 / handler 按域分文件；公共工具放 `internal/handlers/helpers.go`
- 错误处理：handler 用 `writeError(w, status, detail)`；底层返回 `error`
- DB 写入：能用 `Updates(map[string]any{})` 限定字段就别用全 `Save`
- 时间：写库统一 `time.Now().UTC()`
- 插件接口：实现 `internal/plugins/base.go::Plugin` 全套方法，并在 `manager.go` 注册

### TypeScript / Vue

- 视图层：`<script setup lang="ts">` + `<style scoped>`
- API 调用：统一走 `frontend/src/api.ts` 的 `request()` 封装，自带 token 与错误吐司
- 类型：写到 `frontend/src/types.ts`，跟后端 DTO 字段名（snake_case）一一对应
- 表格高度：`useTableScrollHeights` 复用，避免每个视图自己算

### Commit message

Conventional Commits 风格，scope 用 `go` / `frontend` / `infra` / `docs` 等。例：

```
feat(go): 批量连通测试统一时区与字段写入
fix(frontend): 修复站点表格分页 sticky 失效
chore(infra): 锁定前端端口 3721
```

---

## 贡献流程

1. Fork → 新分支
2. 本地 `./run.sh` 验证
3. `go build ./... && go vet ./... && go test ./...` 全绿
4. `cd frontend && npm run build` 通过
5. 提 PR，描述清楚动机与影响面

欢迎贡献插件适配、测试用例、UI 优化与文档修订。
