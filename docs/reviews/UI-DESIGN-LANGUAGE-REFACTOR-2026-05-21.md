# UI 设计语言重构方案

日期: 2026-05-21

## 背景事实

- 当前仓库前端为 Vue 3、Vite、TypeScript、Ant Design Vue，依赖记录在 `frontend/package.json`。
- 当前全局样式入口是 `frontend/src/style.css`，已经定义 IBM Plex Sans 字体、浅色页面背景、Ant Design Vue token 覆盖和大量业务页面样式。
- 当前壳层是 `frontend/src/components/ShellLayout.vue`，包含左侧导航、顶部 KPI、分组管理、用户入口和退出登录。
- 当前运行中的 Docker 服务暴露 `8972`，登录页和总览页可访问。
- 参考站截图的核心效果是白底运营后台: 蓝色主导航、窄边框卡片、紧凑指标面板、浅灰页面底色、清晰图标按钮和低装饰密度。
- 参考站技术栈为 React、shadcn/ui、Tailwind CSS、Radix UI 和 Lucide，但本项目无需为了视觉目标先迁移框架。

## 设计目标

本次重构目标不是复制参考站源码或技术栈，而是在当前 Vue/Ant Design Vue 架构内重建同类设计语言:

- 白底、浅灰页面、蓝色主操作色。
- 侧边导航固定、扁平、可扫描，弱化当前插画和玻璃渐变。
- 卡片圆角收敛到 8px，边框优先于重阴影。
- 页面密度提升，指标、表格、按钮和筛选区更接近运营后台。
- 图标使用现有 Ant Design icons 先统一尺寸和线性风格，不优先新增 Lucide 依赖。
- 保留现有业务入口和路由，不改变 API、鉴权和数据流。

## 视觉语言

### 色彩

- 页面背景: `#f8fafc` 或 `#f6f8fb`。
- 主要面板: `#ffffff`。
- 主色: `#2563eb`，用于 active nav、主按钮、关键数字、焦点边框。
- 主色浅底: `#eff6ff`，用于选中态和信息卡片。
- 文本主色: `#0f172a`。
- 文本弱色: `#64748b`。
- 边框: `#e2e8f0`。
- 成功、警告、危险色保持语义明确，减少大面积渐变。

### 形状与空间

- 卡片、按钮、输入框、菜单项统一 8px 圆角。
- 页边距桌面端 24px，窄屏 16px。
- 卡片内边距默认 24px，数据表和紧凑工具条可降到 16px。
- 顶部栏高度约 64px，左侧导航宽度约 248px 到 280px。
- 页面标题区独立于卡片，不把整块页面包进大卡片。

### 组件语言

- 导航: 白底、左侧品牌、蓝色选中态、线性图标、底部折叠按钮。
- 顶部栏: 当前页面标题、必要操作按钮、用户和账户状态，不放过多彩色 KPI。
- 指标卡: 小标题、主数字、副说明、可选轻量图标，第一关键指标可用浅蓝底强调。
- 表格: 白底、细边框、浅灰表头、紧凑行高、操作按钮图标化。
- 表单和弹窗: 分组清晰、字段密度适中、底部固定操作区。
- 空状态: 使用简短文本和主要操作，不使用大面积插画。

## 页面改造边界

- `ShellLayout.vue`: 重构侧边栏、顶部栏、导航选中态和全局壳层密度。
- `style.css`: 收敛全局 token、Ant Design Vue 组件覆盖、通用卡片和表格样式。
- `OverviewView.vue`: 对齐参考站总览页结构，重做指标卡和两列内容区。
- `GatewayView.vue`: 优先拆出网关总览、路由表格、监控面板的视觉结构，降低单文件样式耦合。
- `SitesView.vue`: 优先统一筛选、表格、站点编辑弹窗和批量操作区。
- `ChatTestView.vue`: 保持工作台功能，但将底部输入区、会话列表和消息区纳入统一白底面板语言。
- `LoginView.vue`: 降低营销页感，改为参考站同类的简洁登录卡和轻量公告/联系入口。

## 技术策略

推荐方案: 保留 Vue 3 + Ant Design Vue，建立本项目自己的轻量 design token 和页面结构规范。

原因:

- 当前业务页面和复杂表格大量依赖 Ant Design Vue，直接迁移到 React/shadcn 或 Tailwind 会扩大风险。
- 参考站的可感知效果主要来自布局、token、圆角、阴影、密度和图标语言，不依赖 React 本身。
- 当前代码已经有全局 token 覆盖，适合先用 CSS 变量和 Ant theme 完成第一轮视觉统一。

暂不做:

- 不迁移到 React。
- 不引入 shadcn/ui。
- 不把所有页面重写为 Tailwind。
- 不改变后端 API 和数据模型。
- 不在当前规划阶段改业务代码。

可选后续:

- 如果 Ant icons 与目标视觉差异明显，再评估 `lucide-vue-next`。
- 如果现有 CSS 继续膨胀，再把 `style.css` 拆为 `tokens.css`、`layout.css`、`components.css`、`pages.css`。

## 验收标准

- `npm run build` 通过。
- 登录页、总览页、站点中心、路由管理、网关监控、对话页、设置页在 1440px 和 390px 宽度下无明显重叠和横向溢出。
- 所有主要卡片圆角不超过 8px，除非 Ant Design Vue 组件内部限制无法稳定覆盖。
- 侧边栏、顶部栏、按钮、表格和表单使用同一套颜色、圆角、边框和字体 token。
- 保留现有路由、功能入口、API 调用和错误提示行为。
- 不新增静默降级、mock 成功路径或隐藏错误。

## 风险与控制

- 风险: `frontend/src/style.css` 已超过 2000 行，继续追加会加重维护负担。
  控制: 第一轮只收敛 token 和关键组件，必要时同步拆分 CSS 文件。
- 风险: `GatewayView.vue` 和 `SitesView.vue` 文件过大，视觉改造容易误伤业务逻辑。
  控制: 优先抽取纯展示组件或样式 class，不改数据请求和核心动作。
- 风险: 当前 Docker 运行态可能加载旧 `frontend/dist`。
  控制: 实现阶段必须执行 `npm run build`，如需运行态验证再重建 Docker。
- 风险: 参考站是 shadcn/Tailwind，本项目是 Ant Design Vue。
  控制: 以视觉验收为准，不以技术栈一致为准。

## 任务 1 验证记录

日期: 2026-05-21

- 范围: `frontend/src/App.vue`、`frontend/src/style.css`、`ui-design-language-refactor.md`。
- 改动: 将 Ant Design Vue theme 和全局 CSS token 收敛到白底浅灰、蓝色主色、8px 组件圆角、细边框和轻阴影基线；清理旧青绿色硬编码和主要壳层大圆角。
- `npm run build`: 通过。包含 `vue-tsc -b` 和 Vite production build。仍有既有大 chunk 与 plugin timing 警告。
- `npm audit --audit-level=high`: 通过，0 个漏洞。

- `git diff --check`: 通过。

## 任务 2 验证记录

日期: 2026-05-21

- 范围: `frontend/src/components/ShellLayout.vue`、`frontend/src/style.css`、`ui-design-language-refactor.md`。
- 改动: 侧边栏改为白底细边框、蓝色选中态和底部折叠按钮；顶部栏新增当前页面上下文、紧凑运行状态组、用户标签和图标化退出按钮；移除侧栏插画依赖和玻璃渐变装饰。
- Debug-First: 将网关概览刷新失败从静默吞错改为 `console.warn`，避免隐藏真实失败。
- `npm run build`: 通过。包含 `vue-tsc -b` 和 Vite production build。仍有既有大 chunk 与 plugin timing 警告。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过。
- 浏览器验证: Vite dev server `http://127.0.0.1:5174/overview` 登录后验证。1440px 桌面、桌面折叠侧栏、390px 移动模拟均无文档级横向溢出，顶部操作区未出视口；DevTools console 无 error/warn。

## 任务 3 验证记录

日期: 2026-05-21

- 范围: `frontend/src/views/OverviewView.vue`、`frontend/src/styles/overview.css`、`frontend/src/styles/overview-feed.css`、`ui-design-language-refactor.md`。
- 改动: 总览页改为参考站式运营后台结构，新增页面头、4 张紧凑指标卡、最近任务主面板、运行计划面板和待处理站点面板；将概览页样式拆到专用 CSS 文件，避免继续扩大单文件组件。
- `npm run build`: 通过。包含 `vue-tsc -b` 和 Vite production build。仍有既有大 chunk 与 plugin timing 警告。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过。
- 浏览器验证: Vite dev server `http://127.0.0.1:5174/overview` 登录后验证。真实空数据在 1440px、1024px、390px 下均无文档级横向溢出，4 个指标卡和 3 个面板均可见。
- 浏览器验证: 临时只拦截 `/api/overview` 的 visual fixture 有数据场景。1440px 下 5 条 feed 行可见且无横向溢出；390px 移动模拟下 5 条 feed 行可见，最大行右边界 359px，小于 390px 视口，文档无横向溢出。
- DevTools console: error/warn 为空。

## 任务 4 验证记录

日期: 2026-05-21

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/views/SitesView.vue`、`frontend/src/styles/management-surfaces.css`、`ui-design-language-refactor.md`。
- 改动: 新增管理页共享样式，统一路由管理、网关监控和站点中心的表格、筛选区、弹窗、抽屉、触控按钮尺寸；移除站点编辑弹窗的装饰插画和装饰符号；将相关分隔符改为 ASCII 文本。
- `npm run build`: 通过。包含 `vue-tsc -b` 和 Vite production build。仍有既有大 chunk 与 plugin timing 警告。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过。
- 纯文本约束扫描: 装饰符号扫描和 tab 扫描均已覆盖任务 4 代码文件，结果无命中。
- 浏览器验证: Vite dev server `http://127.0.0.1:5174/` 代理当前 Docker 后端 `8972`，`/api/health` 返回 200。
- 浏览器验证: Playwright 登录后检查 `/gateway/routes`、`/gateway/monitor`、`/sites`，覆盖 1440px、1024px、390px；同时打开网关策略弹窗、最近请求抽屉、站点编辑弹窗。18 个页面状态均无文档级横向溢出、无关键表面越界、无按钮文本溢出、无触控尺寸 warning。
- DevTools console: error/warn 为空。

## 任务 5 验证记录

日期: 2026-05-21

- 范围: `frontend/src/views/ChatTestView.vue`、`frontend/src/views/SettingsView.vue`、`frontend/src/views/DesktopServiceView.vue`、`frontend/src/views/LoginView.vue`、`frontend/src/styles/workspace-surfaces.css`、`ui-design-language-refactor.md`。
- 改动: 新增工作台共享样式，统一对话页、设置页、桌面服务页和登录页的白底面板、细边框、8px 圆角、输入控件和按钮语言；降低登录页营销插画感；移除对话页空态大图和装饰性分隔符；保留原有 API 调用、鉴权、会话、设置表单和登录流程。
- `npm run build`: 通过。包含 `vue-tsc -b` 和 Vite production build。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `node --test frontend/tests/*.test.ts`: 通过，14 个前端状态辅助测试全部通过。
- `go test ./...`: 通过，后端现有测试全部通过。
- `git diff --check`: 通过。
- 纯文本约束扫描: 装饰符号扫描和 tab 扫描均已覆盖任务 5 代码文件，结果无命中。
- 浏览器验证: Vite dev server `http://127.0.0.1:5174/` 代理当前 Docker 后端 `8972`，`/api/health` 返回 200。
- 浏览器验证: Playwright 登录后检查 `/chat-test`、`/settings`、`/desktop`，并以未登录上下文检查 `/login`，覆盖 1440px、1024px、390px；桌面视口额外执行登录提交并跳转 `/overview`。13 个页面状态均无文档级横向溢出、无关键表面越界、无按钮或输入文本溢出、无触控尺寸 warning。
- 补充复验: 修正对话页输入区主列宽度后，使用 `agent-browser` 复查 `/login`、`/chat-test`、`/settings`、`/desktop` 的 1440px、1024px、390px 视口和登录提交跳转，12 个页面状态和登录提交均通过。
- DevTools console: error/warn 为空。

## 任务 6 验证记录

日期: 2026-05-21

- 范围: `frontend/src/style.css`、`frontend/src/styles/management-surfaces.css`、`frontend/src/views/GatewayView.vue`、`frontend/src/views/ChatTestView.vue`、`ui-design-language-refactor.md`。
- 改动: 网关监控指标卡由横向滚动改为自适应换行网格；管理页搜索输入实际点击高度稳定到 32px；时间段消耗输入框补充可访问名称；对话页添加参考图按钮补充 `title` 和 `aria-label`。
- 首轮浏览器审计: `agent-browser` 检查 `/login`、`/overview`、`/gateway/routes`、`/gateway/monitor`、`/sites`、`/chat-test`、`/settings`、`/desktop`，覆盖 1440px、1024px、390px，发现网关监控指标卡中窄屏横向滚动、两个时间输入框缺少可访问名称、对话页添加参考图按钮缺少可访问名称。
- 修复后浏览器复验: 同一路由和视口共 24 个页面状态，文档级横向溢出、关键表面越界、按钮或输入文本溢出、不可点击控件、缺少可访问名称控件、图片 alt 缺失、重复 id、console error/warn 均为 0。
- `npm run build`: 通过。包含 `vue-tsc -b` 和 Vite production build。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过。
- 纯文本约束扫描: 装饰符号扫描和 tab 扫描均已覆盖任务 6 代码文件，结果无命中。

## 任务 7 验证记录

日期: 2026-05-21

- 范围: `compose.yaml` 运行态、Dockerfile 镜像构建、`http://127.0.0.1:8972` 管理端主要页面、`ui-design-language-refactor.md`。
- `npm run build`: 已在任务 6 后再次执行通过；Docker 镜像内 `RUN npm run build` 也通过。两者仍有既有大 chunk warning。
- `docker compose up -d --build`: 通过。镜像 `ai-sign-in-gateway-app:latest` 构建完成，容器 `ai-sign-in-gateway` 重新创建并启动。
- `docker compose ps`: `ai-sign-in-gateway` 状态为 `Up`，端口映射为 `0.0.0.0:8972->8972/tcp`。
- `docker compose logs --tail=80 app`: 服务模式启动成功，监听 `http://127.0.0.1:8972`，网关地址为 `http://127.0.0.1:8972/api/gateway`，数据库路径为 `/app/data/ai-sign-in-gateway.db`。
- `curl http://127.0.0.1:8972/api/health`: HTTP 200，响应 `status` 为 `ok`。
- `curl http://127.0.0.1:8972/`: HTTP 200，返回 2048 字节 HTML。
- `POST /api/auth/login`: 使用本机已知管理员凭据返回 HTTP 200；旧默认凭据返回 HTTP 401。文档不记录明文口令。
- 运行态浏览器验证: `agent-browser` 直接访问 `http://127.0.0.1:8972`，检查 `/login`、`/overview`、`/gateway/routes`、`/gateway/monitor`、`/sites`、`/chat-test`、`/settings`、`/desktop`，覆盖 1440px、1024px、390px，共 24 个页面状态。文档级横向溢出、关键表面越界、按钮或输入文本溢出、不可点击控件、缺少可访问名称控件、图片 alt 缺失、重复 id、console error/warn 均为 0。

## 外部复核后补充清理

日期: 2026-05-22

- 范围: 清理已无引用的旧 UI 插画资源。
- 删除文件: `frontend/src/assets/design/session-pic.png`、`frontend/src/assets/design/sidebar-gateway.png`、`frontend/src/assets/design/sidebar-skyline.png`、`frontend/src/assets/site-editor-account.png`、`frontend/src/assets/site-editor-cloud.png`、`frontend/src/assets/site-editor-gateway.png`、`frontend/src/assets/hero.png`、`frontend/src/assets/vite.svg`、`frontend/src/assets/vue.svg`。
- 引用检查: `rg -n 'site-editor-(account|cloud|gateway)\.png|session-pic\.png|sidebar-(gateway|skyline)\.png|hero\.png|vite\.svg|vue\.svg' frontend/src` 无命中。
- `npm run build`: 通过。包含 `vue-tsc -b` 和 Vite production build。仍有既有大 chunk 和 plugin timing 警告。
- `node --test frontend/tests/*.test.ts`: 通过，14 个前端状态辅助测试全部通过。
- `go test ./...`: 通过，后端现有测试全部通过。
- `docker compose up -d --build`: 通过。镜像 `ai-sign-in-gateway-app:latest` 重新构建，容器 `ai-sign-in-gateway` 重新创建并启动。
- `docker compose ps`: `ai-sign-in-gateway` 状态为 `Up`，端口映射为 `0.0.0.0:8972->8972/tcp`。
- `curl http://127.0.0.1:8972/api/health`: HTTP 200，响应 `status` 为 `ok`。
- `POST /api/auth/login`: 使用本机已知管理员凭据返回 HTTP 200，响应包含认证令牌字段。文档不记录明文口令。

## 移动端复核后补充优化

日期: 2026-05-22

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/views/ChatTestView.vue`、`frontend/src/views/SettingsView.vue`、`frontend/src/style.css`。
- 改动: 路由管理移动端工具栏改为两列操作网格，筛选控件改为全宽；对话页移动端主工作区优先、会话历史下置，并统一历史区图标按钮为 36px；设置页移动端 tabs 改为横向滚动并隐藏 Ant overflow 操作按钮，数字输入步进控件补足触控命中区；移动端折叠侧栏收窄为 72px。
- `git diff --check`: 通过。
- `node --test frontend/tests/*.test.ts`: 通过，14 个前端状态辅助测试全部通过。
- `npm run build`: 通过。包含 `vue-tsc -b` 和 Vite production build。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过，后端现有测试全部通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `docker compose up -d --build`: 通过。镜像内重新执行前端 production build，容器 `ai-sign-in-gateway` 重新创建并启动。
- `curl http://127.0.0.1:8972/api/health`: HTTP 200，响应 `status` 为 `ok`。
- 运行态浏览器验证: 直接访问 `http://127.0.0.1:8972`，复查 `/gateway/routes`、`/chat-test`、`/settings`。390px 下文档级横向溢出为 0，对话页输入区在会话历史之前，设置页 tabs 为横向滚动；1440px 下对话页和路由管理无关键表面越界、无按钮文本溢出、无小于 32px 的可见可点击控件。
- DevTools console: error/warn 为空。

## 代码结构复核后补充拆分

日期: 2026-05-22

- 范围: `frontend/src/style.css`、`frontend/src/views/GatewayView.vue`、`frontend/src/views/SitesView.vue` 及其拆分出的配置、工具与 CSS 模块。
- 改动: 将全局样式、网关页样式、站点页样式拆为按职责聚合的 CSS 模块；将网关页与站点页的常量配置移出大型 Vue 文件；抽取共享视图工具函数；改用 Ant Design Vue 子模块导入以减少无关入口耦合。
- 文件长度检查: `wc -l frontend/src/styles/*.css frontend/src/*Config.ts frontend/src/viewUtils.ts | sort -nr | head -12`，最长文件为 `frontend/src/styles/workspace-surfaces.css` 299 行，新增拆分文件均不超过 300 行。
- `git diff --check`: 通过。
- `node --test frontend/tests/*.test.ts`: 通过，14 个前端状态辅助测试全部通过。
- `npm run build`: 通过。包含 `vue-tsc -b` 和 Vite production build。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `go test ./...`: 通过，后端现有测试全部通过。
- 运行态浏览器验证: `npm run preview -- --host 127.0.0.1 --port 4173` 后访问 `http://127.0.0.1:4173/login`，页面正常加载，DevTools console error/warn 为空。

## 下一阶段目标: 视觉收敛与移动效率补齐

日期: 2026-05-23

目标: 在已完成主后台浅色化的基础上，补齐仍偏离最初规划的视觉与 UX 缺口，使登录页、桌面服务页、移动端操作页和大型视图结构继续向白底运营后台靠拢。

### 阶段边界

- 登录页: 从营销化首屏收敛为简洁后台登录页，减少大面积渐变、玻璃拟态、重阴影和超过 8px 的主要容器圆角。
- 桌面服务页: 与主后台统一为白底、浅灰页面、细边框、低阴影，不保留独立的多色渐变背景。
- 移动端操作页: 优先提升 `/sites`、`/gateway/routes` 的首屏操作效率，避免导航、KPI 和批量按钮挤占过多关键内容。
- 代码结构: 后续拆分 `SitesView.vue`、`GatewayView.vue`、`ChatTestView.vue`、`SettingsView.vue`、`LoginView.vue` 中的纯展示区和配置区，降低单文件维护压力。

### 验收标准

- `npm run build` 通过。
- `node --test frontend/tests/*.test.ts` 通过。
- `go test ./...` 通过。
- `/login`、`/desktop` 在 1440px 和 390px 下无文档级横向溢出、无明显元素重叠，主要卡片和按钮圆角收敛到 8px。
- `/sites`、`/gateway/routes` 在 390px 下保留可用操作入口，文档级横向溢出为 0；表格内部横向滚动只限表格区域。
- DevTools console 无 error/warn。

## 下一阶段任务 1: 登录页与桌面服务页视觉收敛

日期: 2026-05-23

- 范围: `frontend/src/views/LoginView.vue`、`frontend/src/views/DesktopServiceView.vue`。
- 改动: 登录页移除全屏渐变背景、伪插画网格、玻璃拟态登录卡、重阴影和大圆角；保留登录、记住我、公开邀请入口与邀请弹窗行为。桌面服务页移除独立多色渐变背景和指标卡装饰圆形，统一为白底、细边框和轻阴影。
- `git diff --check`: 通过。
- `node --test frontend/tests/*.test.ts`: 通过，14 个前端状态辅助测试全部通过。
- `npm run build`: 通过。`LoginView` CSS 产物从约 16.35 kB 降到约 11.24 kB；仍有既有大 chunk 警告。
- `go test ./...`: 通过，后端现有测试全部通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- 预览态浏览器验证: `npm run preview -- --host 127.0.0.1 --port 4173` 后复查 `/login` 的 1440px 与 390px，文档级横向溢出为 0，`.login-card` 和 `.login-submit` 圆角为 8px，`.login-screen` 无背景渐变。
- 预览态浏览器验证: 使用临时本地 token 仅绕过前端路由守卫，复查 `/desktop` 的 1440px 与 390px，文档级横向溢出为 0，`.desktop-console` 无背景渐变，`.summary-tile` 圆角为 8px。
- DevTools console: `/desktop` 预览态存在预期内 401 请求，因为临时 token 只用于前端路由守卫，不代表真实管理端登录态；布局验证不受影响。

## 下一阶段任务 2: 移动端首屏操作效率优化

日期: 2026-05-23

- 范围: `frontend/src/components/ShellLayout.vue`、`frontend/src/styles/management-surfaces.css`。
- 改动: 390px 等小屏下隐藏全局 KPI 摘要行，页头只保留当前页面标题；站点中心和路由管理的批量操作区改为横向可滚动操作带，避免多行按钮堆叠挤占首屏内容。
- `git diff --check`: 通过。
- `node --test frontend/tests/*.test.ts`: 通过，14 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过，后端现有测试全部通过。
- `docker compose up -d --build`: 通过。镜像内重新执行前端 production build 和 Go 二进制构建，容器 `ai-sign-in-gateway` 已重新创建并启动。
- `docker compose ps`: `ai-sign-in-gateway` 状态为 `Up`，端口映射为 `0.0.0.0:8972->8972/tcp`。
- `curl http://127.0.0.1:8972/api/health`: HTTP 200，响应 `status` 为 `ok`。
- `curl http://127.0.0.1:8972/`: HTTP 200，返回 2349 字节 HTML。
- `POST /api/auth/login`: 使用本机已知管理员凭据返回 HTTP 200，响应包含认证令牌字段。文档不记录明文口令。
- 运行态浏览器验证: 直接访问 `http://127.0.0.1:8972`，登录后复查 `/sites` 和 `/gateway/routes` 的 390px。文档级横向溢出为 0，`.app-header__summary` 和页头描述均隐藏，主内容顶部约 101px，站点中心和路由管理操作区为 36px 高横向滚动带。
- 运行态浏览器验证: 1440px 下复查 `/sites`、`/gateway/routes`、`/desktop`，文档级横向溢出均为 0；已登录状态访问 `/login` 按路由守卫跳转 `/overview`，无横向溢出。
- DevTools console: error/warn 为空。

## 下一阶段任务 3: 登录页样式拆分与死代码清理

日期: 2026-05-23

- 范围: `frontend/src/views/LoginView.vue`、`frontend/src/styles/login-view*.css`、`frontend/src/styles/workspace-surfaces.css`、`frontend/src/views/DesktopServiceView.vue`。
- 改动: 将登录页样式从 `LoginView.vue` 拆到 `login-view-layout.css`、`login-view-metrics.css`、`login-view-auth.css`、`login-view-responsive.css`，`login-view.css` 仅保留 imports；删除已永久隐藏的 `gateway-visual` 伪插画 DOM 和 `login-card__glow` 节点；清理共享覆盖中对应的无效隐藏选择器；修正 `DesktopServiceView.vue` 文件末尾空白。
- 文件长度检查: 登录页拆分后的 CSS 文件分别为 4、189、155、239、143 行；`workspace-surfaces.css` 为 300 行。
- 死代码扫描: `rg -n "gateway-visual|gateway-core|gateway-node|route-label|login-card__glow" frontend/src` 无命中。
- `git diff --check`: 通过。
- `node --test frontend/tests/*.test.ts`: 通过，14 个前端状态辅助测试全部通过。
- `npm ci`: 通过，0 个漏洞。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过，后端现有测试全部通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `docker compose up -d --build`: 通过，镜像重建并重新启动 `ai-sign-in-gateway` 容器。
- `docker compose ps`: `app` 服务处于 `Up`，端口映射为 `0.0.0.0:8972->8972/tcp`。
- `curl -fsS http://127.0.0.1:8972/api/health`: 通过，HTTP 200，返回 `status: ok`。
- `npm audit --audit-level=high`: 通过，0 个漏洞。

- `docker compose up -d --build`: 通过，镜像重建并重新启动 `ai-sign-in-gateway` 容器。
- `docker compose ps`: `app` 服务处于 `Up`，端口映射为 `0.0.0.0:8972->8972/tcp`。
- `curl -fsS http://127.0.0.1:8972/api/health`: 通过，HTTP 200，返回 `status: ok`。
- 浏览器烟测: `/login` 正常加载，页面资源和 `/api/public/invites` 返回 200，控制台无 error/warn。
- 浏览器烟测: 未登录访问 `/desktop` 返回应用入口资源 200，并按路由守卫重定向到 `/login`。
- 未覆盖项: 当前 Docker volume 中管理员密码已不是 `compose.yaml` 或开发默认初始化值，`/api/auth/login` 返回 401；未通过修改数据库或绕过认证制造登录后 `/desktop` 成功路径。

## 下一阶段任务 12: 站点页展示组件拆分

日期: 2026-05-24

- 范围: `frontend/src/views/SitesView.vue`、`frontend/src/components/sites/`、`frontend/src/components.d.ts`。
- 改动: 将站点页 API Key 弹窗、邀请弹窗、TOTP 预览、重复清理弹窗、指标网格、站点列表表格、签到配置弹窗、签到日志抽屉、cc-switch 导入导出弹窗、编辑器基础信息卡、浏览器存储导入卡、账号凭证卡和插件配置卡拆为独立组件。
- 边界: 父页面保留站点加载、保存、测试、签到、API Key 更新、邀请读取、cc-switch 导入导出、重复合并和路由同步等业务动作；新组件只负责展示、表单绑定和事件转发。
- 文件长度检查: `SitesView.vue` 从 3472 行降至 2541 行；`frontend/src/components/sites/` 下新增组件均小于 300 行，最长 `SitesTableCard.vue` 为 263 行。
- 自动生成文件: `frontend/src/components.d.ts` 由 `npm run build` 的自动组件声明更新，新增站点页组件类型。
- `npm run build`: 通过。仍有既有大 chunk 警告。
- `node --test frontend/tests/*.test.ts`: 通过，59 个前端状态辅助测试全部通过。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。

## 下一阶段任务 13: 站点页组合式函数拆分

日期: 2026-05-24

- 范围: `frontend/src/views/SitesView.vue`、`frontend/src/components/sites/`、`frontend/src/composables/useSites*.ts`、`frontend/src/sitesEditorActionTypes.ts`、`frontend/src/siteBatchRunner.ts`。
- 改动: 将站点页工具栏、编辑器弹窗、批量任务、路由同步、数据加载、抽屉状态、编辑器派生状态、编辑器保存/测试/删除动作、邀请刷新、API Key 刷新、CC Switch、重复站点检查、运行时检测、localStorage 分析、TOTP 预览和表格状态拆为独立组件或组合式函数；`SitesView.vue` 保留页面装配、生命周期加载和跨模块事件连接。
- 文件长度检查: `SitesView.vue` 从任务 12 后的 2541 行降至 708 行；新增/改造的 `frontend/src/composables/useSites*.ts` 与 `frontend/src/components/sites/*.vue` 均小于 300 行，最长为 `useSitesApiKeyDialog.ts` 298 行。
- 仍未完成项: `SitesView.vue` 尚未达到 300 行以内；剩余体积主要来自页面模板装配和跨弹窗 props/events 连接。继续压缩需要单独拆页面控制器或弹窗栈组件，应作为下一原子任务处理。
- `git diff --check`: 通过。
- `node --test frontend/tests/*.test.ts`: 通过，59 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk warning。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `go test ./...`: 通过，后端现有测试全部通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `docker compose up -d --build`: 通过，镜像重建并重新启动 `ai-sign-in-gateway` 容器。
- `docker compose ps`: `app` 服务处于 `Up`，端口映射为 `0.0.0.0:8972->8972/tcp`。
- `curl -fsS http://127.0.0.1:8972/api/health`: 通过，HTTP 200，返回 `status: ok`。

## 下一阶段目标: 代码结构收敛与维护边界补齐

日期: 2026-05-23

目标: 在视觉语言已经进入运行态验证通过的基础上，继续降低大型视图文件和页面内静态配置的维护压力。优先保持行为等价，不改变 API、路由、认证、刷新和表单提交流程。

### 阶段边界

- 先处理能低风险拆分的视图文件: 登录页和桌面服务页。
- 静态展示内容、默认设置和派生视图模型移出 Vue 单文件。
- 保持模板结构和用户操作路径稳定，不引入新依赖。
- 大型业务页如 `SitesView.vue`、`GatewayView.vue`、`ChatTestView.vue`、`SettingsView.vue` 后续按更小原子任务继续拆。

### 验收标准

- 被处理的 Vue 文件压到 300 行以内。
- 新增模块职责单一，单文件不超过 300 行。
- `npm run build`、`node --test frontend/tests/*.test.ts`、`go test ./...` 通过。
- Docker 运行态 `/api/health` 返回 `status: ok`。
- `/login` 和 `/desktop` 运行态页面正常加载，DevTools console 无 error/warn。

## 下一阶段任务 1: 登录页与桌面服务页视图模型拆分

日期: 2026-05-23

- 范围: `frontend/src/views/LoginView.vue`、`frontend/src/views/DesktopServiceView.vue`、`frontend/src/loginViewContent.ts`、`frontend/src/desktopServiceModel.ts`。
- 改动: 将登录页能力卡和指标卡静态内容移入 `loginViewContent.ts`；将桌面服务页默认设置、URL 拼接、服务状态项、摘要项和运行问题提示构造移入 `desktopServiceModel.ts`；保留登录、公开邀请、服务刷新、退出登录和设置页嵌入行为。
- 文件长度检查: `LoginView.vue` 298 行，`DesktopServiceView.vue` 241 行，`loginViewContent.ts` 55 行，`desktopServiceModel.ts` 138 行。
- `git diff --check`: 通过。
- `node --test frontend/tests/*.test.ts`: 通过，14 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过，后端现有测试全部通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。

## 下一阶段任务 12: 站点页控制器与页面主体拆分

日期: 2026-05-24

- 范围: `frontend/src/views/SitesView.vue`、`frontend/src/composables/useSitesViewController.ts`、`frontend/src/components/sites/SitesPageContent.vue`。
- 改动: 将站点页剩余组合逻辑收敛到 `useSitesViewController`，页面主体模板迁入 `SitesPageContent`，`SitesView.vue` 仅保留布局壳和控制器初始化。
- 文件长度检查: `SitesView.vue` 降至 16 行，`SitesPageContent.vue` 为 274 行，`useSitesViewController.ts` 为 241 行。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过。

## 下一阶段任务 13: 设置页控制器与 tab 组件拆分

日期: 2026-05-24

- 范围: `frontend/src/views/SettingsView.vue`、`frontend/src/settingsViewController.ts`、`frontend/src/settingsRuntimeController.ts`、`frontend/src/components/settings/`、`frontend/src/styles/settings-view.css`。
- 改动: 将设置页数据加载、运行时配置、数据库备份、账号修改和价格方案操作拆到 controller；按设置 tab 拆分页面组件；原内联样式迁入独立 CSS。
- 文件长度检查: `SettingsView.vue` 降至 12 行，`settingsViewController.ts` 为 222 行，`settingsRuntimeController.ts` 为 215 行，所有 `components/settings/*.vue` 均低于 300 行。
- `npm run build`: 通过。首次构建发现 `router.push` 返回类型不是严格 `Promise<void>`，已按真实返回值放宽 `goLogin` 回调类型后通过。
- `git diff --check`: 通过。

## 下一阶段任务 14: 对话页控制器、模板和样式拆分

日期: 2026-05-24

- 范围: `frontend/src/views/ChatTestView.vue`、`frontend/src/chatTestController.ts`、`frontend/src/chatTestImageController.ts`、`frontend/src/chatTestModelSelectionController.ts`、`frontend/src/chatTestSessionController.ts`、`frontend/src/components/chat/ChatTestPageContent.vue`、`frontend/src/styles/chat-test-*.css`。
- 改动: 将对话页模型选择、图片参数、参考图、会话历史、发送请求和消息持久化拆成职责独立的 controller；模板迁入 `ChatTestPageContent`；原样式按 shell/history/composer/responsive 拆分。
- 文件长度检查: `ChatTestView.vue` 降至 18 行，`ChatTestPageContent.vue` 为 234 行，4 个对话 controller 均低于 300 行，4 个 chat-test CSS 文件均低于 300 行。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过。

## 下一阶段任务 15: ShellLayout 控制器与头部样式拆分

日期: 2026-05-24

- 范围: `frontend/src/components/ShellLayout.vue`、`frontend/src/shellLayoutController.ts`、`frontend/src/styles/shell-layout-header.css`。
- 改动: 将后台壳的管理员加载、网关 KPI 轮询、导航状态和登出逻辑迁入 `useShellLayoutController`；头部样式迁入独立 CSS；组件保留模板结构和插槽。
- 文件长度检查: `ShellLayout.vue` 降至 131 行，`shellLayoutController.ts` 为 161 行，`shell-layout-header.css` 为 168 行。
- `npm run build`: 通过。
- `git diff --check`: 通过。

## 下一阶段任务 16: 网关页视图模型拆分与构建修复

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayViewModel.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 将网关页余额汇总、指标卡、路由池状态、策略卡片、时间段格式化、用量摘要、分组选项、活跃/最近请求 feed、路由/日志过滤和批量进度百分比移入 `gatewayViewModel.ts`；`GatewayView.vue` 保留 API 调用、状态持有、生命周期和用户操作处理。
- 构建修复: 首次 `npm run build` 暴露 `GatewayView.vue` 缺少 `activeRequestRouteTypeLabel`、`shortFingerprint`、`routeRequestBaseList`、`supportedModelsPreview`、`routeLatencyDetails`、`logRequestURL` 等模板/脚本依赖，以及若干已无引用导入；本任务通过视图模型拆分和显式导入修复。
- 文件长度检查: `GatewayView.vue` 降至 2553 行，`gatewayViewModel.ts` 为 289 行，`gatewayViewModel.test.ts` 为 168 行。
- TDD 红灯: `node --test frontend/tests/gatewayViewModel.test.ts` 首次失败于缺少 `gatewayViewModel.ts`，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewayViewModel.test.ts`: 通过，4 个网关视图模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，66 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayViewModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayViewModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 17: 网关路由状态合并模型拆分

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteStateModel.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`。
- 改动: 将活跃请求快照并发合并、站点摘要合并、路由探测结果合并、余额探测结果合并和优先级重排列表替换规则移入 `gatewayRouteStateModel.ts`；`GatewayView.vue` 只保留响应式赋值和调用点。
- 文件长度检查: `GatewayView.vue` 降至 2521 行，`gatewayRouteStateModel.ts` 为 82 行，`gatewayRouteStateModel.test.ts` 为 182 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于缺少 `gatewayRouteStateModel.ts`，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewayRouteStateModel.test.ts`: 通过，4 个网关路由状态测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，70 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteStateModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteStateModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 18: 网关路由配置模型拆分

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteConfigModel.ts`、`frontend/tests/gatewayRouteConfigModel.test.ts`。
- 改动: 将路由类型/请求格式选择校验、路由类型与路径更新 payload、乐观更新列表替换、支持模型弹窗 draft 和保存 payload 构造移入 `gatewayRouteConfigModel.ts`；`GatewayView.vue` 保留 API 调用、toast 和弹窗响应式状态。
- 文件长度检查: `GatewayView.vue` 为 2521 行，`gatewayRouteConfigModel.ts` 为 74 行，`gatewayRouteConfigModel.test.ts` 为 123 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConfigModel.test.ts` 首次失败于缺少 `gatewayRouteConfigModel.ts`，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewayRouteConfigModel.test.ts`: 通过，4 个网关路由配置测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，74 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk warning。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteConfigModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteConfigModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 19: 网关批量探测模型拆分

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`。
- 改动: 将批量路由探测失败结果构造、进度递增和完成提示文案移入 `gatewayRouteProbeModel.ts`；`GatewayView.vue` 保留实际 `probeGatewayRoute` 请求循环、响应式状态和 toast 调用。
- 文件长度检查: `GatewayView.vue` 降至 2505 行，`gatewayRouteProbeModel.ts` 为 63 行，`gatewayRouteProbeModel.test.ts` 为 116 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbeModel.test.ts` 首次失败于缺少 `gatewayRouteProbeModel.ts`；实现后发现特征测试误把旧行为写成覆盖空 `last_error`，已按现有代码行为修正为保留空字符串。
- `node --test frontend/tests/gatewayRouteProbeModel.test.ts`: 通过，4 个网关批量探测模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，78 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 首次因 npm registry TLS 连接断开失败；同命令重跑通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteProbeModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteProbeModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 20: 网关新增上游表单模型拆分

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAddUpstreamModel.ts`、`frontend/tests/gatewayAddUpstreamModel.test.ts`。
- 改动: 将新增上游默认表单、必填与 Base URL 校验、`createSite` payload 构造和成功文案移入 `gatewayAddUpstreamModel.ts`；`GatewayView.vue` 保留 toast、`createSite`、同步路由和刷新动作。
- 文件长度检查: `GatewayView.vue` 降至 2467 行，`gatewayAddUpstreamModel.ts` 为 65 行，`gatewayAddUpstreamModel.test.ts` 为 87 行。
- TDD 红灯: `node --test frontend/tests/gatewayAddUpstreamModel.test.ts` 首次失败于缺少 `gatewayAddUpstreamModel.ts`，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewayAddUpstreamModel.test.ts`: 通过，4 个新增上游表单模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，82 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayAddUpstreamModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayAddUpstreamModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 21: 网关策略设置展示模型拆分

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewaySettingsModel.ts`、`frontend/tests/gatewaySettingsModel.test.ts`。
- 改动: 将网关策略选项说明、并发转移阈值标签和策略说明列表移入 `gatewaySettingsModel.ts`；`GatewayView.vue` 保留响应式 computed 名称供模板使用。
- 文件长度检查: `GatewayView.vue` 降至 2463 行，`gatewaySettingsModel.ts` 为 47 行，`gatewaySettingsModel.test.ts` 为 84 行。
- TDD 红灯: `node --test frontend/tests/gatewaySettingsModel.test.ts` 首次失败于缺少 `gatewaySettingsModel.ts`，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewaySettingsModel.test.ts`: 通过，3 个网关策略设置展示模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，85 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewaySettingsModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewaySettingsModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 22: 网关访问入口展示模型拆分

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAccessModel.ts`、`frontend/tests/gatewayAccessModel.test.ts`。
- 改动: 将网关请求地址构造、Codex `/v1` 地址与提示文案、网关 API Key 掩码移入 `gatewayAccessModel.ts`；`GatewayView.vue` 保留 computed 与模板绑定。
- 文件长度检查: `GatewayView.vue` 降至 2444 行，`gatewayAccessModel.ts` 为 36 行，`gatewayAccessModel.test.ts` 为 48 行。
- TDD 红灯: `node --test frontend/tests/gatewayAccessModel.test.ts` 首次失败于缺少 `gatewayAccessModel.ts`，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewayAccessModel.test.ts`: 通过，4 个网关访问入口展示模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，89 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayAccessModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayAccessModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 23: 网关路由筛选状态模型拆分

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteFilterModel.ts`、`frontend/tests/gatewayRouteFilterModel.test.ts`。
- 改动: 将路由类型筛选切换、筛选项计数和清空筛选状态移入 `gatewayRouteFilterModel.ts`；`GatewayView.vue` 保留模板需要的 wrapper 函数和响应式赋值。
- 文件长度检查: `GatewayView.vue` 为 2448 行，`gatewayRouteFilterModel.ts` 为 35 行，`gatewayRouteFilterModel.test.ts` 为 52 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteFilterModel.test.ts` 首次失败于缺少 `gatewayRouteFilterModel.ts`，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewayRouteFilterModel.test.ts`: 通过，3 个路由筛选状态模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，92 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteFilterModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteFilterModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 24: 网关余额探测状态模型拆分

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`。
- 改动: 将余额探测路由 ID 归一化、探测中 ID 合并/移除、批量进度创建与递增、余额探测/更新完成提示文案移入 `gatewayRouteBalanceProbeModel.ts`；`GatewayView.vue` 保留实际 API 调用循环、toast 调用和响应式赋值。
- 文件长度检查: `GatewayView.vue` 为 2447 行，`gatewayRouteBalanceProbeModel.ts` 为 45 行，`gatewayRouteBalanceProbeModel.test.ts` 为 48 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于缺少 `gatewayRouteBalanceProbeModel.ts`，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，4 个余额探测状态模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，96 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteBalanceProbeModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 25: 手动余额探测弹窗模型补充

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`。
- 改动: 将手动余额探测弹窗草稿、余额接口 URL 校验、手动探测成功/失败文案和成功关闭状态移入 `gatewayRouteBalanceProbeModel.ts`；`GatewayView.vue` 保留实际手动探测 API 调用、toast 和响应式赋值。
- 文件长度检查: `GatewayView.vue` 为 2450 行，`gatewayRouteBalanceProbeModel.ts` 为 88 行，`gatewayRouteBalanceProbeModel.test.ts` 为 151 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于缺少 `buildManualGatewayRouteBalanceDialogDraft` 等导出，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，7 个余额探测模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，99 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过。

## 下一阶段任务 26: 网关路由探测状态模型补充

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`。
- 改动: 将路由探测 ID 归一化、探测中 ID 合并/移除、批量探测进度初始化和单路由探测成功/失败文案移入 `gatewayRouteProbeModel.ts`；`GatewayView.vue` 保留实际探测 API 调用、失败结果合并、toast 调用和响应式赋值。
- 文件长度检查: `GatewayView.vue` 为 2452 行，`gatewayRouteProbeModel.ts` 为 93 行，`gatewayRouteProbeModel.test.ts` 为 162 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbeModel.test.ts` 首次失败于缺少 `buildGatewaySingleProbeNotice` 等导出，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewayRouteProbeModel.test.ts`: 通过，7 个网关路由探测模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，102 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteProbeModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteProbeModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 27: 网关优先级弹窗模型拆分

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityModel.ts`、`frontend/tests/gatewayPriorityModel.test.ts`。
- 改动: 将优先级弹窗初始草稿、移动目标校验与 payload、套餐/余额预设 payload 与成功文案、重排后当前选中路由恢复逻辑移入 `gatewayPriorityModel.ts`；`GatewayView.vue` 保留实际优先级列表加载、重排 API 调用、toast 和响应式赋值。
- 文件长度检查: `GatewayView.vue` 为 2455 行，`gatewayPriorityModel.ts` 为 41 行，`gatewayPriorityModel.test.ts` 为 95 行。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityModel.test.ts` 首次失败于缺少 `gatewayPriorityModel.ts`，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewayPriorityModel.test.ts`: 通过，4 个网关优先级模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，106 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayPriorityModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPriorityModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 28: 网关路由类型筛选模型补齐

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteFilterModel.ts`、`frontend/tests/gatewayRouteFilterModel.test.ts`。
- 改动: 将路由类型筛选激活判断和清空路由类型筛选状态补入 `gatewayRouteFilterModel.ts`；`GatewayView.vue` 保留模板 wrapper 与响应式赋值，不再直接执行 `includes` 或内联空数组。
- 文件长度检查: `GatewayView.vue` 为 2457 行，`gatewayRouteFilterModel.ts` 为 46 行，`gatewayRouteFilterModel.test.ts` 为 62 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteFilterModel.test.ts` 首次失败于缺少 `clearGatewayRouteTypeFilters` 导出，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewayRouteFilterModel.test.ts`: 通过，4 个网关路由筛选模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，107 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteFilterModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteFilterModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 29: 网关路由探测状态谓词拆分

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`。
- 改动: 将单路由是否处于探测中的判断补入 `gatewayRouteProbeModel.ts`；`GatewayView.vue` 保留模板 wrapper 与响应式读取，不再直接对 `probingRouteIds` 执行 `includes`。
- 文件长度检查: `GatewayView.vue` 为 2458 行，`gatewayRouteProbeModel.ts` 为 97 行，`gatewayRouteProbeModel.test.ts` 为 168 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbeModel.test.ts` 首次失败于缺少 `isGatewayRouteProbing` 导出，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewayRouteProbeModel.test.ts`: 通过，8 个网关路由探测模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，108 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteProbeModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteProbeModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 30: 网关余额探测状态谓词拆分

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`。
- 改动: 将单路由余额是否处于探测中的判断补入 `gatewayRouteBalanceProbeModel.ts`；`GatewayView.vue` 保留模板 wrapper 与响应式读取，不再直接对 `balanceProbingRouteIds` 执行 `includes`。
- 文件长度检查: `GatewayView.vue` 为 2459 行，`gatewayRouteBalanceProbeModel.ts` 为 92 行，`gatewayRouteBalanceProbeModel.test.ts` 为 157 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于缺少 `isGatewayRouteBalanceProbing` 导出，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，8 个网关余额探测模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，109 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteBalanceProbeModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 31: 网关活动流合并模型拆分

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayViewModel.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 将活动请求 feed 与最近日志 feed 的合并、排序入口和 12 条上限移入 `buildRouteActivityFeed`；`GatewayView.vue` 保留响应式输入和模板绑定，运行态徽标改为直接读取 `activeRequests.length`。
- 文件长度检查: `GatewayView.vue` 为 2455 行，`gatewayViewModel.ts` 为 293 行，`gatewayViewModel.test.ts` 为 250 行。
- TDD 红灯: `node --test frontend/tests/gatewayViewModel.test.ts` 首次失败于缺少 `buildRouteActivityFeed` 导出，确认新增特征测试覆盖拆分目标。
- 构建修正: 首次 `npm run build` 暴露模板仍引用已删除的 `activeRouteFeed`；已改为 `activeRequests.length` 并重新完整验证。
- `node --test frontend/tests/gatewayViewModel.test.ts`: 通过，5 个网关视图模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，110 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayViewModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayViewModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 32: 网关用量今日范围模型拆分

日期: 2026-05-24

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayViewModel.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 将用量查询“今天”范围的本地时间起止计算移入 `buildGatewayUsageTodayRange`；`GatewayView.vue` 保留响应式赋值，不再直接构造当天 00:00 时间。
- 文件长度检查: `GatewayView.vue` 为 2453 行，`gatewayViewModel.ts` 为 302 行，`gatewayViewModel.test.ts` 为 256 行。
- TDD 红灯: `node --test frontend/tests/gatewayViewModel.test.ts` 首次失败于缺少 `buildGatewayUsageTodayRange` 导出，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewayViewModel.test.ts`: 通过，5 个网关视图模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，110 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayViewModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayViewModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 33: 网关优先级行样式模型拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityModel.ts`、`frontend/tests/gatewayPriorityModel.test.ts`。
- 改动: 将优先级弹窗表格当前行 class 判断移入 `gatewayPriorityRouteRowClassName`；`GatewayView.vue` 保留模板需要的 wrapper，不再直接比较当前选中路由 ID。
- 文件长度检查: `GatewayView.vue` 为 2454 行，`gatewayPriorityModel.ts` 为 45 行，`gatewayPriorityModel.test.ts` 为 105 行。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityModel.test.ts` 首次失败于缺少 `gatewayPriorityRouteRowClassName` 导出，确认新增特征测试覆盖拆分目标。
- `node --test frontend/tests/gatewayPriorityModel.test.ts`: 通过，5 个网关优先级模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，111 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayPriorityModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPriorityModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 34: 网关单路由余额探测 ID 管理复用

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`；复用既有 `frontend/src/gatewayRouteBalanceProbeModel.ts` 和 `frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 的余额探测 ID 管理口径。
- 改动: 将单路由余额探测和手动余额探测中的 `balanceProbingRouteIds` 添加/移除改为复用 `mergeGatewayRouteBalanceProbingIds` 与 `removeGatewayRouteBalanceProbingIds`；`GatewayView.vue` 不再直接拼接数组或用内联 `filter` 移除探测中路由 ID。
- 文件长度检查: `GatewayView.vue` 为 2454 行，`gatewayRouteBalanceProbeModel.ts` 为 92 行，`gatewayRouteBalanceProbeModel.test.ts` 为 157 行。
- 特征测试基线: 修改前 `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 通过，8 个余额探测模型测试全部通过。
- 旧写法扫描: `rg -n "balanceProbingRouteIds\.value = \[|balanceProbingRouteIds\.value = balanceProbingRouteIds\.value\.filter" frontend/src/views/GatewayView.vue` 无命中。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，8 个余额探测模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，111 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过。

## 下一阶段任务 35: 网关表格记录适配模型拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteDisplayModel.ts`、`frontend/src/gatewayActivityDisplayModel.ts`、`frontend/tests/gatewayRouteDisplayModel.test.ts`。
- 改动: 将路由表和日志表模板使用的 `asRoute`、`asLog`、`routeRowKey`、`logRowKey` 从 `GatewayView.vue` 移入展示模型；页面只保留导入别名，不再定义本地类型收窄和 row key 包装函数。
- 文件长度检查: `GatewayView.vue` 为 2442 行，`gatewayRouteDisplayModel.ts` 为 269 行，`gatewayActivityDisplayModel.ts` 为 107 行，`gatewayRouteDisplayModel.test.ts` 为 151 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteDisplayModel.test.ts` 首次失败于 `gatewayActivityDisplayModel.ts` 缺少 `asGatewayLog` 导出，确认新增特征测试覆盖拆分目标。
- 旧本地函数扫描: `rg -n "function asRoute\(|function asLog\(|function routeRowKey\(|function logRowKey\(" frontend/src/views/GatewayView.vue` 无命中。
- `node --test frontend/tests/gatewayRouteDisplayModel.test.ts`: 通过，4 个网关路由展示模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，112 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayActivityDisplayModel.ts`、`git diff --no-index --check /dev/null frontend/src/gatewayRouteDisplayModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteDisplayModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 36: 网关策略选项说明模型拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewaySettingsModel.ts`、`frontend/tests/gatewaySettingsModel.test.ts`。
- 改动: 将策略设置弹窗中路由策略、错误切换、并发转移和并发溢出 4 个当前选项说明合并为 `buildGatewaySelectedStrategyDescriptions`；`GatewayView.vue` 不再直接调用 `gatewaySettingOptionDescription` 或保留 4 个页面内说明 computed。
- 文件长度检查: `GatewayView.vue` 为 2427 行，`gatewaySettingsModel.ts` 为 56 行，`gatewaySettingsModel.test.ts` 为 103 行。
- TDD 红灯: `node --test frontend/tests/gatewaySettingsModel.test.ts` 首次失败于 `gatewaySettingsModel.ts` 缺少 `buildGatewaySelectedStrategyDescriptions` 导出，确认新增特征测试覆盖拆分目标。
- 旧页面说明扫描: `rg -n "selected(RouteStrategy|OverflowStrategy|ConcurrencyTransfer|FailureRetryMode)Description|gatewaySettingOptionDescription" frontend/src/views/GatewayView.vue` 无命中。
- `node --test frontend/tests/gatewaySettingsModel.test.ts`: 通过，4 个网关设置模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，113 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewaySettingsModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewaySettingsModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 37: 网关路由筛选状态构造模型补齐

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteFilterModel.ts`、`frontend/tests/gatewayRouteFilterModel.test.ts`。
- 改动: 新增 `buildGatewayRouteFilterState`，把路由搜索词、选中分组、路由类型和问题状态组合为统一筛选状态，并复制数组避免复用页面可变数组；`GatewayView.vue` 的激活筛选计数改为基于该模型状态计算。
- 文件长度检查: `GatewayView.vue` 为 2429 行，`gatewayRouteFilterModel.ts` 为 55 行，`gatewayRouteFilterModel.test.ts` 为 86 行。本轮为了显式保留 `routeFilterState` computed，页面文件行数增加 2 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteFilterModel.test.ts` 首次失败于 `gatewayRouteFilterModel.ts` 缺少 `buildGatewayRouteFilterState` 导出，确认新增特征测试覆盖拆分目标。
- 内联计数扫描: `rg -n "activeGatewayRouteFilterCount\(\{" frontend/src/views/GatewayView.vue` 无命中。
- `node --test frontend/tests/gatewayRouteFilterModel.test.ts`: 通过，5 个网关路由筛选模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，114 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteFilterModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteFilterModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 38: 网关路由筛选参数转换模型补齐

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayViewModel.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `buildGatewayRouteFilters`，把 `routeFilterState` 转换为 `filterGatewayRoutes` 所需的 `keyword` 过滤参数，并复制筛选数组；`GatewayView.vue` 的 `filteredRoutes` 不再内联拼装第二份筛选对象。
- 文件长度检查: `GatewayView.vue` 为 2426 行，`gatewayViewModel.ts` 为 318 行，`gatewayViewModel.test.ts` 为 281 行。
- TDD 红灯: `node --test frontend/tests/gatewayViewModel.test.ts` 首次失败于 `gatewayViewModel.ts` 缺少 `buildGatewayRouteFilters` 导出，确认新增特征测试覆盖拆分目标。
- 内联过滤参数扫描: `rg -n "filterGatewayRoutes\(routes\.value, \{" frontend/src/views/GatewayView.vue` 无命中。
- `node --test frontend/tests/gatewayViewModel.test.ts`: 通过，6 个网关视图模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，115 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayViewModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayViewModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 39: 网关活动 URL 复制归一化模型拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayActivityDisplayModel.ts`、`frontend/tests/gatewayRouteDisplayModel.test.ts`。
- 改动: 新增 `normalizeGatewayActivityCopyUrl`，把活动流请求 URL 复制前的 trim 和空值判断归一化移入活动展示模型；`GatewayView.vue` 的 `copyGatewayActivityUrl` 不再直接处理字符串归一化。
- 文件长度检查: `GatewayView.vue` 为 2427 行，`gatewayActivityDisplayModel.ts` 为 111 行，`gatewayRouteDisplayModel.test.ts` 为 157 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteDisplayModel.test.ts` 首次失败于 `gatewayActivityDisplayModel.ts` 缺少 `normalizeGatewayActivityCopyUrl` 导出，确认新增特征测试覆盖拆分目标。
- 页面内联归一化扫描: `rg -n "copyGatewayActivityUrl|normalizeGatewayActivityCopyUrl|const normalized = value\.trim\(\)" frontend/src/views/GatewayView.vue frontend/src/gatewayActivityDisplayModel.ts frontend/tests/gatewayRouteDisplayModel.test.ts` 无页面内联 `value.trim()` 残留。
- `node --test frontend/tests/gatewayRouteDisplayModel.test.ts`: 通过，5 个网关路由展示模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，116 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayActivityDisplayModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteDisplayModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 40: 网关 API Key 复制归一化模型拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAccessModel.ts`、`frontend/tests/gatewayAccessModel.test.ts`。
- 改动: 新增 `normalizeGatewayApiKeyCopyValue`，把复制管理端 `GATEWAY_API_KEY` 前的 trim 归一化移入访问模型；`GatewayView.vue` 的 `copyGatewayApiKey` 不再直接读取并裁剪密钥字符串。
- 文件长度检查: `GatewayView.vue` 为 2428 行，`gatewayAccessModel.ts` 为 40 行，`gatewayAccessModel.test.ts` 为 54 行。
- TDD 红灯: `node --test frontend/tests/gatewayAccessModel.test.ts` 首次失败于 `gatewayAccessModel.ts` 缺少 `normalizeGatewayApiKeyCopyValue` 导出，确认新增特征测试覆盖拆分目标。
- 页面内联归一化扫描: `rg -n "copyGatewayApiKey|normalizeGatewayApiKeyCopyValue|settingsForm\.gateway_api_key\.trim\(\)" frontend/src/views/GatewayView.vue frontend/src/gatewayAccessModel.ts frontend/tests/gatewayAccessModel.test.ts` 无页面内联 `settingsForm.gateway_api_key.trim()` 残留。
- `node --test frontend/tests/gatewayAccessModel.test.ts`: 通过，5 个网关访问模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，117 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayAccessModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayAccessModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 41: 网关单路由余额读取通知模型拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`。
- 改动: 新增 `buildGatewaySingleRouteBalanceNotice`，把单路由余额读取成功和失败 toast 文案移入余额探测模型；`GatewayView.vue` 的 `handleProbeRouteBalance` 不再内联拼接成功/失败文案。
- 文件长度检查: `GatewayView.vue` 为 2430 行，`gatewayRouteBalanceProbeModel.ts` 为 105 行，`gatewayRouteBalanceProbeModel.test.ts` 为 177 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于 `gatewayRouteBalanceProbeModel.ts` 缺少 `buildGatewaySingleRouteBalanceNotice` 导出，确认新增特征测试覆盖拆分目标。
- 页面内联通知扫描: `rg -n "buildGatewaySingleRouteBalanceNotice|formatBalance|余额读取成功：|余额读取失败：" frontend/src/views/GatewayView.vue frontend/src/gatewayRouteBalanceProbeModel.ts frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 确认页面仅保留模型函数调用，成功/失败文案拼接位于模型和测试中。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，9 个网关余额探测模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，118 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteBalanceProbeModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 42: 手动余额探测 URL 归一化模型拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`。
- 改动: 新增 `normalizeManualGatewayRouteBalanceProbeURL`，把手动余额探测提交前的 URL trim 归一化移入余额探测模型；`GatewayView.vue` 的 `submitManualRouteBalanceProbe` 不再直接裁剪 `balanceProbeManualURL.value`。
- 文件长度检查: `GatewayView.vue` 为 2431 行，`gatewayRouteBalanceProbeModel.ts` 为 109 行，`gatewayRouteBalanceProbeModel.test.ts` 为 180 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于 `gatewayRouteBalanceProbeModel.ts` 缺少 `normalizeManualGatewayRouteBalanceProbeURL` 导出，确认新增特征测试覆盖拆分目标。
- 页面内联归一化扫描: `rg -n 'normalizeManualGatewayRouteBalanceProbeURL|balanceProbeManualURL\.value\.trim\(\)' frontend/src/views/GatewayView.vue frontend/src/gatewayRouteBalanceProbeModel.ts frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 确认页面仅保留模型函数调用，无直接 `balanceProbeManualURL.value.trim()` 残留。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，9 个网关余额探测模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，118 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteBalanceProbeModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 43: 手动余额探测弹窗状态 Controller 拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeController.ts`、`frontend/tests/gatewayRouteBalanceProbeController.test.ts`。
- 改动: 新增 `useGatewayRouteBalanceManualDialog`，把手动余额探测弹窗的 `open`、`loading`、当前路由、URL 和错误消息状态集中到 controller；`GatewayView.vue` 仅保留模板别名和提交流程，弹窗打开、成功关闭、失败消息和 loading 切换不再分散写入多个 ref。
- 文件长度检查: `GatewayView.vue` 为 2424 行，`gatewayRouteBalanceProbeController.ts` 为 56 行，`gatewayRouteBalanceProbeController.test.ts` 为 76 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts` 首次失败于缺少 `frontend/src/gatewayRouteBalanceProbeController.ts`，确认新增 controller 测试覆盖拆分目标。
- 行为修正: controller 测试首次转绿前发现 Vue `ref` 会把路由对象包装为响应式代理，测试断言从引用相等改为结构相等，保持行为验证不依赖实现细节。
- 页面状态扫描: `rg -n "balanceProbeManualDialog|useGatewayRouteBalanceManualDialog|balanceProbeManual(Open|Loading|Route|URL|Message)\.value|buildManualGatewayRouteBalanceDialogDraft|buildManualGatewayRouteBalanceSuccessState" frontend/src/views/GatewayView.vue frontend/src/gatewayRouteBalanceProbeController.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts` 确认 draft 和成功关闭状态构造已进入 controller，页面只保留 controller 调用和模板绑定别名。
- `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts`: 通过，2 个 controller 测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，120 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteBalanceProbeController.ts`、`git diff --no-index --check /dev/null frontend/tests/gatewayRouteBalanceProbeController.test.ts`、`git diff --no-index --check /dev/null frontend/src/gatewayRouteBalanceProbeModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 检查，均无空白问题。

## 下一阶段任务 44: 路由支持模型弹窗状态 Controller 拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteConfigController.ts`、`frontend/tests/gatewayRouteConfigController.test.ts`。
- 改动: 新增 `useGatewayRouteModelsDialog`，把编辑路由配置弹窗的 `open`、`saving`、当前路由、支持模型列表和手动请求 URL 状态集中到 controller；`GatewayView.vue` 仅保留模板绑定别名和保存 API 流程，弹窗打开、保存中状态和成功关闭不再分散写入多个 ref。
- 文件长度检查: `GatewayView.vue` 为 2421 行，`gatewayRouteConfigController.ts` 为 44 行，`gatewayRouteConfigController.test.ts` 为 77 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConfigController.test.ts` 首次失败于缺少 `frontend/src/gatewayRouteConfigController.ts`，确认新增 controller 测试覆盖拆分目标。
- 页面状态扫描: `rg -n "routeModelsDialog|useGatewayRouteModelsDialog|routeModelsDialog(Open|Saving|Route|Value|RequestURLs)\.value|buildGatewayRouteModelsDialogDraft" frontend/src/views/GatewayView.vue frontend/src/gatewayRouteConfigController.ts frontend/tests/gatewayRouteConfigController.test.ts` 确认 draft 构造已进入 controller，页面只保留 controller 调用和模板绑定别名。
- `node --test frontend/tests/gatewayRouteConfigController.test.ts`: 通过，2 个 controller 测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，122 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteConfigController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteConfigController.test.ts` 检查，均无空白问题。

## 下一阶段任务 45: 优先级弹窗状态 Controller 拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityController.ts`、`frontend/tests/gatewayPriorityController.test.ts`。
- 改动: 新增 `useGatewayPriorityDialog`，把优先级弹窗的 `open`、`loading`、当前路由、目标优先级和弹窗路由列表状态集中到 controller；`GatewayView.vue` 仅保留模板绑定别名、优先级重排 API 流程和 `priorityRoutes` 数据接线。
- 文件长度检查: `GatewayView.vue` 为 2417 行，`gatewayPriorityController.ts` 为 46 行，`gatewayPriorityController.test.ts` 为 77 行。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityController.test.ts` 首次失败于缺少 `frontend/src/gatewayPriorityController.ts`，确认新增 controller 测试覆盖拆分目标。
- 页面状态扫描: `rg -n "buildGatewayPriorityDialogDraft|selectGatewayPriorityRoute|priorityDialog\.setLoading|priorityDialog\.selectRoute|priorityDialog\.clearInsertIndex|useGatewayPriorityDialog" frontend/src/views/GatewayView.vue frontend/src/gatewayPriorityController.ts frontend/tests/gatewayPriorityController.test.ts` 确认 draft 构造和当前路由重选已进入 controller，页面只保留 controller 调用和模板绑定别名。
- `node --test frontend/tests/gatewayPriorityController.test.ts`: 通过，2 个 controller 测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，124 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayPriorityController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPriorityController.test.ts` 检查，均无空白问题。

## 下一阶段任务 46: 添加上游弹窗状态 Controller 拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAddUpstreamController.ts`、`frontend/tests/gatewayAddUpstreamController.test.ts`。
- 改动: 新增 `useGatewayAddUpstreamDialog`，把添加上游弹窗的 `open`、`loading`、表单状态和分组选择状态集中到 controller；`GatewayView.vue` 仅保留 payload 校验、`createSite`、同步和重新加载流程。
- 文件长度检查: `GatewayView.vue` 为 2415 行，`gatewayAddUpstreamController.ts` 为 41 行，`gatewayAddUpstreamController.test.ts` 为 51 行。
- TDD 红灯: `node --test frontend/tests/gatewayAddUpstreamController.test.ts` 首次失败于缺少 `frontend/src/gatewayAddUpstreamController.ts`，确认新增 controller 测试覆盖拆分目标。
- 页面状态扫描: `rg -n "addUpstreamDialog|useGatewayAddUpstreamDialog|addUpstream(Open|Loading|Form|GroupNames)\.value|createDefaultAddUpstreamForm|Object\.assign\(addUpstreamForm|addUpstreamOpen = true" frontend/src/views/GatewayView.vue frontend/src/gatewayAddUpstreamController.ts frontend/tests/gatewayAddUpstreamController.test.ts` 确认默认表单和 reset 已进入 controller，页面只保留 controller 调用和模板绑定别名。
- `node --test frontend/tests/gatewayAddUpstreamController.test.ts`: 通过，2 个 controller 测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，126 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`: 通过，0 个漏洞。前两次 `npm audit --audit-level=high` 因 registry 网络超时或 TLS 连接中断失败，第三次加长 fetch timeout 后成功。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayAddUpstreamController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayAddUpstreamController.test.ts` 检查，均无空白问题。

## 下一阶段任务 47: 路由请求历史抽屉状态 Controller 拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteLogsController.ts`、`frontend/tests/gatewayRouteLogsController.test.ts`。
- 改动: 新增 `useGatewayRouteLogsDrawer`，把路由请求历史抽屉的 `open`、`loading`、当前路由、搜索文本和日志列表状态集中到 controller；`GatewayView.vue` 仅保留 `getGatewayRouteLogs` 请求、toast 错误提示和模板绑定别名。
- 文件长度检查: `GatewayView.vue` 为 2415 行，`gatewayRouteLogsController.ts` 为 43 行，`gatewayRouteLogsController.test.ts` 为 100 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteLogsController.test.ts` 首次失败于缺少 `frontend/src/gatewayRouteLogsController.ts`，确认新增 controller 测试覆盖拆分目标。
- 行为锁定: controller 测试明确打开抽屉时重置搜索但不提前清空旧日志，保留原页面在新请求返回前继续显示旧数据的行为；请求失败时由页面流程显式 `clearLogs()`。
- 页面状态扫描: `rg -n "routeLogsDrawerOpen = ref|routeLogsLoading = ref|routeLogsRoute = ref|routeLogSearch = ref|routeLogs = ref<GatewayLog|routeLogs\.value\s*=|useGatewayRouteLogsDrawer|routeLogsDrawer\." frontend/src/views/GatewayView.vue frontend/src/gatewayRouteLogsController.ts frontend/tests/gatewayRouteLogsController.test.ts` 确认旧 ref 状态和直接写 `routeLogs.value =` 已移除，页面只保留 controller 调用。
- `node --test frontend/tests/gatewayRouteLogsController.test.ts`: 通过，2 个 controller 测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，128 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteLogsController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteLogsController.test.ts` 检查，均无空白问题。

## 下一阶段任务 48: 路由诊断抽屉状态 Controller 拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteDiagnosisController.ts`、`frontend/tests/gatewayRouteDiagnosisController.test.ts`。
- 改动: 新增 `useGatewayRouteDiagnosisDrawer`，把路由诊断抽屉的 `open`、`loading` 和诊断结果状态集中到 controller；`GatewayView.vue` 仅保留 `diagnoseGatewayRoute` 请求、toast 错误提示和模板绑定别名。
- 文件长度检查: `GatewayView.vue` 为 2416 行，`gatewayRouteDiagnosisController.ts` 为 33 行，`gatewayRouteDiagnosisController.test.ts` 为 82 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteDiagnosisController.test.ts` 首次失败于缺少 `frontend/src/gatewayRouteDiagnosisController.ts`，确认新增 controller 测试覆盖拆分目标。
- 页面状态扫描: `rg -n "routeDiagnosisDrawer|useGatewayRouteDiagnosisDrawer|routeDiagnosis(Open|Loading)? = ref|routeDiagnosis\.value\s*=|diagnoseGatewayRoute|openRouteDiagnosis" frontend/src/views/GatewayView.vue frontend/src/gatewayRouteDiagnosisController.ts frontend/tests/gatewayRouteDiagnosisController.test.ts` 确认诊断结果和 loading 写入已进入 controller，页面只保留 controller 调用和 API 请求。
- `node --test frontend/tests/gatewayRouteDiagnosisController.test.ts`: 通过，2 个 controller 测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，130 个前端状态辅助测试全部通过。
- `npm run build`: 首次失败于 `GatewayView.vue` 中 `GatewayRouteDiagnosis` 类型 import 已未使用；移除该 import 后重跑通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteDiagnosisController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteDiagnosisController.test.ts` 检查，均无空白问题。

## 下一阶段任务 49: 最近请求抽屉状态 Controller 拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayLogsController.ts`、`frontend/tests/gatewayLogsController.test.ts`。
- 改动: 新增 `useGatewayLogsDrawer`，把最近请求抽屉的 `open`、搜索文本和最近请求日志列表状态集中到 controller；`GatewayView.vue` 仅保留 `getGatewayLogs` 加载流程、活动流计算和模板绑定别名。
- 文件长度检查: `GatewayView.vue` 为 2418 行，`gatewayLogsController.ts` 为 27 行，`gatewayLogsController.test.ts` 为 64 行。
- TDD 红灯: `node --test frontend/tests/gatewayLogsController.test.ts` 首次失败于缺少 `frontend/src/gatewayLogsController.ts`，确认新增 controller 测试覆盖拆分目标。
- 行为锁定: controller 测试明确打开最近请求抽屉时不重置搜索、不清空已有日志，保留原页面行为；日志数据仍由 `loadData` 和 `refreshRealtimeData` 显式写入。
- 页面状态扫描: `rg -n "logsDrawer|useGatewayLogsDrawer|logsDrawerOpen = ref|logSearch = ref|const logs = ref<GatewayLog|logs\.value\s*=|getGatewayLogs|buildRouteActivityFeed|filteredLogs" frontend/src/views/GatewayView.vue frontend/src/gatewayLogsController.ts frontend/tests/gatewayLogsController.test.ts` 确认旧 ref 状态和直接写 `logs.value =` 已移除，页面只保留 controller 调用、数据加载和派生计算。
- `node --test frontend/tests/gatewayLogsController.test.ts`: 通过，2 个 controller 测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，132 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayLogsController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayLogsController.test.ts` 检查，均无空白问题。

## 下一阶段任务 50: 网关策略弹窗状态 Controller 拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewaySettingsController.ts`、`frontend/tests/gatewaySettingsController.test.ts`。
- 改动: 新增 `useGatewaySettingsDialog`，把网关策略弹窗的 `open`、`loading` 和策略表单状态集中到 controller；`GatewayView.vue` 保留 `updateGatewaySettings` 请求、toast、重新加载和模板字段绑定。
- 文件长度检查: `GatewayView.vue` 为 2419 行，`gatewaySettingsController.ts` 为 38 行，`gatewaySettingsController.test.ts` 为 61 行。
- TDD 红灯: `node --test frontend/tests/gatewaySettingsController.test.ts` 首次失败于缺少 `frontend/src/gatewaySettingsController.ts`，确认新增 controller 测试覆盖拆分目标。
- 行为锁定: controller 测试明确打开策略弹窗时不重置已有表单；加载设置时只写入当前 form；保存成功后的关闭由 `closeAfterSuccess` 管理，loading 仍显式开关。
- 页面状态扫描: `rg -n "useGatewaySettingsDialog|settingsDialog|settingsOpen = ref|settingsLoading = ref|settingsForm = reactive|settingsOpen = true|Object\\.assign\\(settingsForm|createDefaultGatewaySettings" frontend/src/views/GatewayView.vue frontend/src/gatewaySettingsController.ts frontend/tests/gatewaySettingsController.test.ts` 确认旧 ref/reactive 状态、模板直接赋值和页面内 `Object.assign(settingsForm, ...)` 已移除，页面只保留 controller 调用、保存请求和派生显示。
- `node --test frontend/tests/gatewaySettingsController.test.ts`: 通过，3 个 controller 测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，135 个前端状态辅助测试全部通过。
- `npm run build`: 通过，`3324` 个模块完成转换，构建耗时 `34.12s`。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`: 首次因 registry TLS 建连失败中断，重试后通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewaySettingsController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewaySettingsController.test.ts` 检查，均无空白问题。

## 下一阶段任务 51: 路由池筛选状态 Controller 拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteFilterController.ts`、`frontend/tests/gatewayRouteFilterController.test.ts`。
- 改动: 新增 `useGatewayRouteFilters`，把路由池筛选的搜索文本、分组、路由类型、问题状态和清空/切换动作集中到 controller；`GatewayView.vue` 保留表格筛选应用、分组选项派生和模板绑定别名。
- 文件长度检查: `GatewayView.vue` 为 2390 行，`gatewayRouteFilterController.ts` 为 63 行，`gatewayRouteFilterController.test.ts` 为 54 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteFilterController.test.ts` 首次失败于缺少 `frontend/src/gatewayRouteFilterController.ts`，确认新增 controller 测试覆盖拆分目标。
- 行为锁定: controller 测试覆盖筛选状态构造、活动筛选计数、路由类型切换、路由类型清空和全部筛选清空，保持原有筛选语义。
- 页面状态扫描: `rg -n "useGatewayRouteFilters|routeFilters|selectedGroups = ref|selectedRouteTypes = ref|selectedIssueStates = ref|routeSearch = ref|buildGatewayRouteFilterState|activeGatewayRouteFilterCount|clearGatewayRouteFilters|clearGatewayRouteTypeFilters|isGatewayRouteTypeFilterActive|toggleGatewayRouteTypeFilter" frontend/src/views/GatewayView.vue frontend/src/gatewayRouteFilterController.ts frontend/tests/gatewayRouteFilterController.test.ts` 确认旧筛选 ref 和页面内筛选动作实现已移除，页面只保留 controller 别名和筛选结果应用。
- `node --test frontend/tests/gatewayRouteFilterController.test.ts`: 通过，3 个 controller 测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，138 个前端状态辅助测试全部通过。
- `npm run build`: 通过，`3325` 个模块完成转换，构建耗时 `58.62s`。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteFilterController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteFilterController.test.ts` 检查，均无空白问题。

## 下一阶段任务 52: 路由探测状态 Controller 拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeController.ts`、`frontend/tests/gatewayRouteProbeController.test.ts`。
- 改动: 新增 `useGatewayRouteProbeState`，把路由探测的 `loading`、正在探测路由 ID、批量探测进度、进度百分比和 1600ms 延迟清理定时器集中到 controller；`GatewayView.vue` 保留 `probeGatewayRoute` 请求、结果合并、失败结果构造和 toast。
- 文件长度检查: `GatewayView.vue` 为 2362 行，`gatewayRouteProbeController.ts` 为 101 行，`gatewayRouteProbeController.test.ts` 为 71 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbeController.test.ts` 首次失败于缺少 `frontend/src/gatewayRouteProbeController.ts`，确认新增 controller 测试覆盖拆分目标。
- 行为锁定: controller 测试覆盖批量开始、批量单路由完成、进度百分比、完成后保留进度直到定时清理，以及单路由探测状态跟踪，保持原页面的进度展示和延迟消失语义。
- 页面状态扫描: `rg -n "useGatewayRouteProbeState|routeProbeState|probeLoading = ref|probingRouteIds = ref|probeAllProgress = ref|probeProgressClearTimer|createGatewayProbeProgress|nextGatewayProbeProgress|mergeGatewayProbingIds|removeGatewayProbingIds|isGatewayRouteProbing" frontend/src/views/GatewayView.vue frontend/src/gatewayRouteProbeController.ts frontend/tests/gatewayRouteProbeController.test.ts` 确认旧探测 ref、页面内探测 ID 合并/移除和定时器变量已移除，页面只保留 controller 调用和请求流程。
- `node --test frontend/tests/gatewayRouteProbeController.test.ts`: 通过，4 个 controller 测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，142 个前端状态辅助测试全部通过。
- `npm run build`: 首次失败于 `probeAllProgress.value` 可能为 `null` 的类型检查；改为 `probeAllProgress.value?.success ?? 0` 后重跑通过，`3326` 个模块完成转换，构建耗时 `38.41s`。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteProbeController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteProbeController.test.ts` 检查，均无空白问题。

## 下一阶段任务 53: 余额探测状态 Controller 拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeController.ts`、`frontend/tests/gatewayRouteBalanceProbeController.test.ts`。
- 改动: 在现有 `gatewayRouteBalanceProbeController.ts` 中新增 `useGatewayRouteBalanceProbeState`，把余额探测的 `loading`、正在探测路由 ID、批量余额进度、进度百分比和 1600ms 延迟清理定时器集中到 controller；`GatewayView.vue` 保留 `probeGatewayRouteBalance` 请求、结果合并、摘要刷新、人工余额探测弹窗和 toast。
- 文件长度检查: `GatewayView.vue` 为 2342 行，`gatewayRouteBalanceProbeController.ts` 为 163 行，`gatewayRouteBalanceProbeController.test.ts` 为 146 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts` 首次失败于 `frontend/src/gatewayRouteBalanceProbeController.ts` 未导出 `useGatewayRouteBalanceProbeState`，确认新增 controller 测试覆盖拆分目标。
- 行为锁定: controller 测试覆盖批量余额探测开始、单路由完成、进度百分比、完成后保留进度直到定时清理，以及单路由余额探测状态跟踪，保持原页面进度展示和延迟消失语义。
- 页面状态扫描: `rg -n "useGatewayRouteBalanceProbeState|routeBalanceProbeState|balanceProbeAllLoading = ref|balanceProbeAllProgress = ref|balanceProbingRouteIds|balanceProgressClearTimer|mergeGatewayRouteBalanceProbingIds|removeGatewayRouteBalanceProbingIds|isGatewayRouteBalanceProbing|progressPercent" frontend/src/views/GatewayView.vue frontend/src/gatewayRouteBalanceProbeController.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts` 确认旧余额探测 ref、页面内 ID 合并/移除和定时器变量已移除，页面只保留 controller 调用和请求流程。
- `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts`: 通过，6 个 controller 测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，146 个前端状态辅助测试全部通过。
- `npm run build`: 通过，`3326` 个模块完成转换，构建耗时 `36.35s`。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`: 通过，0 个漏洞。
- `git diff --check`: 通过；未跟踪 controller/test 文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRouteBalanceProbeController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteBalanceProbeController.test.ts` 检查，均无空白问题。

## 下一阶段任务 54: 网关运行时刷新状态 Controller 拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 新增 `useGatewayRuntimeState`，把页面加载、用量加载、自动刷新 loading、实时请求刷新 loading，以及自动刷新和实时请求刷新的节流时间戳集中到 controller；`GatewayView.vue` 保留数据请求、请求取消、定时器注册、可见性事件和 toast。
- 文件长度检查: `GatewayView.vue` 为 2332 行，`gatewayRuntimeController.ts` 为 74 行，`gatewayRuntimeController.test.ts` 为 54 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于缺少 `frontend/src/gatewayRuntimeController.ts`，确认新增 controller 测试覆盖拆分目标。
- 行为锁定: controller 测试覆盖 loading 显式开关、自动刷新仅在可见且空闲并超过 1800ms 节流窗口时启动、实时请求刷新仅在监控页启用且可见并超过 500ms 节流窗口时启动，保持原页面节流语义。
- 页面状态扫描: `rg -n "useGatewayRuntimeState|gatewayRuntime|const loading = ref|usageLoading = ref|autoRefreshing|activeRequestsRefreshing|lastAutoRefreshAt|lastActiveRequestRefreshAt|setLoading|setUsageLoading|startAutoRefresh|finishAutoRefresh|startActiveRequestsRefresh|finishActiveRequestsRefresh" frontend/src/views/GatewayView.vue frontend/src/gatewayRuntimeController.ts frontend/tests/gatewayRuntimeController.test.ts` 确认旧运行时 loading ref 和页面内刷新节流变量已移除，页面只保留 controller 调用和请求流程。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，3 个 controller 测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，149 个前端状态辅助测试全部通过。
- `npm run build`: 通过，`3327` 个模块完成转换，构建耗时 `37.34s`。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用 `git diff --no-index --check /dev/null frontend/src/gatewayRuntimeController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRuntimeController.test.ts` 检查，均无空白问题。

## 下一阶段任务 55: 网关用量时间范围 Controller 拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayUsageRangeController.ts`、`frontend/tests/gatewayUsageRangeController.test.ts`。
- 改动: 新增 `useGatewayUsageRangeState`，把网关监控页用量时间范围 `range`、今日范围重置和 datetime-local 到请求 ISO 时间的转换集中到 controller；`GatewayView.vue` 保留 `getGatewayUsage` 请求、无效时间 toast、初始加载和查询按钮流程。
- 文件长度检查: `GatewayView.vue` 为 2321 行，`gatewayUsageRangeController.ts` 为 36 行，`gatewayUsageRangeController.test.ts` 为 34 行。
- TDD 红灯: `node --test frontend/tests/gatewayUsageRangeController.test.ts` 首次失败于缺少 `frontend/src/gatewayUsageRangeController.ts`，确认新增 controller 测试覆盖拆分目标。
- 行为锁定: controller 测试覆盖重置到本地当天起止时间、有效 datetime-local 值转成请求 ISO 时间，以及无效或空值保持为空请求参数，保持原页面显式查询校验和初始加载参数口径。
- 页面状态扫描: `rg -n "reactive|buildGatewayUsageTodayRange|datetimeLocalToISOString|resetUsageRangeToToday|useGatewayUsageRangeState|usageRangeState|toRequestRange" frontend/src/views/GatewayView.vue frontend/src/gatewayUsageRangeController.ts frontend/tests/gatewayUsageRangeController.test.ts` 确认页面不再直接持有用量时间范围构造逻辑，直接用法只保留在 controller 和测试中。
- `node --test frontend/tests/gatewayUsageRangeController.test.ts`: 通过，3 个 controller 测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，152 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3328` 个模块完成转换，构建耗时 `39.91s`。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`（在 `frontend/` 下执行）: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/gatewayUsageRangeController.ts` 和 `frontend/tests/gatewayUsageRangeController.test.ts`，均无空白问题。
- 命令位置校正: 根目录没有 `package.json`，根目录 `npm run build` 和 `npm audit` 分别因 `ENOENT`、`ENOLOCK` 失败；已在 `frontend/` 目录重跑并通过。
- 运行态说明: 任务 55 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 56: 网关用量面板组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayUsagePanel.vue`、`frontend/tests/gatewayUsagePanelComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayUsagePanel`，把监控页“时间段消耗”面板的时间输入、今日/查询按钮、用量摘要和用量表格模板移入组件；`GatewayView.vue` 保留 `getGatewayUsage` 请求、无效时间 toast、加载状态、时间范围状态、格式化函数和表格列配置的接线。
- 文件长度检查: `GatewayView.vue` 为 2259 行，`GatewayUsagePanel.vue` 为 127 行，`gatewayUsagePanelComponent.test.ts` 为 26 行。
- TDD 红灯: `node --test frontend/tests/gatewayUsagePanelComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayUsagePanel.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayUsagePanel>`。
- 行为锁定: 组件契约测试覆盖 `usageRange`、`usage`、`update:start`、`update:end`、`today`、`query` 和 `gateway-panel--usage` 结构，并确认父页不再内联 `<section class="gateway-panel gateway-panel--usage">`。
- 构建修复: 首次 `npm run build` 失败于 `GatewayUsagePanel.vue` 将表格列声明为 `unknown[]`，与 Ant Design Vue `a-table` 列类型不兼容；修复为 `ColumnsType<GatewayUsageRoute>` 后重跑通过。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayUsagePanel` 全局组件声明。
- `node --test frontend/tests/gatewayUsagePanelComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，154 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3330` 个模块完成转换，构建耗时 `1m 43s`。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`（在 `frontend/` 下执行）: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayUsagePanel.vue` 和 `frontend/tests/gatewayUsagePanelComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 56 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 57: 网关实时调用面板组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayActivityPanel.vue`、`frontend/tests/gatewayActivityPanelComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayActivityPanel`，把监控页“实时调用”面板的运行中/空闲状态、活动流列表、请求 URL 展示、复制按钮和空态移入组件；`GatewayView.vue` 保留 `buildRouteActivityFeed` 派生数据、实时请求快照、最近日志和 `copyGatewayActivityUrl` 副作用处理。
- 文件长度检查: `GatewayView.vue` 为 2207 行，`GatewayActivityPanel.vue` 为 93 行，`gatewayActivityPanelComponent.test.ts` 为 25 行。
- TDD 红灯: `node --test frontend/tests/gatewayActivityPanelComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayActivityPanel.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayActivityPanel>`。
- 行为锁定: 组件契约测试覆盖 `items`、`activeCount`、`copy` 事件、`gateway-panel--activity` 结构、`CopyOutlined` 和空态文案，并确认父页不再内联 `<section class="gateway-panel gateway-panel--activity">`。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayActivityPanel` 全局组件声明。
- `node --test frontend/tests/gatewayActivityPanelComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，156 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3332` 个模块完成转换，构建耗时 `41.43s`。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`（在 `frontend/` 下执行）: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayActivityPanel.vue` 和 `frontend/tests/gatewayActivityPanelComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 57 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 58: 网关路由池状态面板组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteStatusPanel.vue`、`frontend/tests/gatewayRouteStatusPanelComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteStatusPanel`，把监控页“路由池状态”面板的健康/半开/熔断/停用状态卡、进度条和前 5 个路由预览行移入组件；`GatewayView.vue` 保留 `buildRoutePoolStatusCards`、`buildRoutePoolPreviewRoutes` 和 `routeConcurrencyLimitLabel` 派生数据。
- 文件长度检查: `GatewayView.vue` 为 2166 行，`GatewayRouteStatusPanel.vue` 为 75 行，`gatewayRouteStatusPanelComponent.test.ts` 为 27 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteStatusPanelComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteStatusPanel.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteStatusPanel>`。
- 行为锁定: 组件契约测试覆盖 `statusCards`、`previewRoutes`、`routeConcurrencyLimitLabel`、`gateway-panel--route-status` 结构、路由池状态卡、预览行、最小 8% 进度条宽度和 `formatLatency(primaryLatency(route))` 延迟展示，并确认父页不再内联 `<section class="gateway-panel gateway-panel--route-status">`。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteStatusPanel` 全局组件声明。
- `node --test frontend/tests/gatewayRouteStatusPanelComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，158 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3334` 个模块完成转换，构建耗时 `33.43s`。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`（在 `frontend/` 下执行）: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteStatusPanel.vue` 和 `frontend/tests/gatewayRouteStatusPanelComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 58 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 59: 网关策略分布面板组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayStrategyPanel.vue`、`frontend/tests/gatewayStrategyPanelComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayStrategyPanel`，把监控页“策略分布”面板的策略卡片、轨道宽度和空态文案移入组件；`GatewayView.vue` 保留 `buildGatewayStrategyCards` 派生数据。
- 文件长度检查: `GatewayView.vue` 为 2144 行，`GatewayStrategyPanel.vue` 为 42 行，`gatewayStrategyPanelComponent.test.ts` 为 24 行。
- TDD 红灯: `node --test frontend/tests/gatewayStrategyPanelComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayStrategyPanel.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayStrategyPanel>`。
- 行为锁定: 组件契约测试覆盖 `cards`、`gateway-panel--strategy` 结构、策略卡片、轨道宽度和“暂无策略统计数据”空态，并确认父页不再内联 `<section class="gateway-panel gateway-panel--strategy">`。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayStrategyPanel` 全局组件声明。
- `node --test frontend/tests/gatewayStrategyPanelComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，160 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3336` 个模块完成转换。仍有既有大 chunk 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`（在 `frontend/` 下执行）: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayStrategyPanel.vue` 和 `frontend/tests/gatewayStrategyPanelComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 59 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 60: 网关指标卡片组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayMetricCards.vue`、`frontend/tests/gatewayMetricCardsComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayMetricCards`，把监控页顶部 KPI 指标卡片网格移入组件；`GatewayView.vue` 保留 `buildGatewayMetricCards` 派生数据和 `isGatewayMonitor` 条件渲染。
- 文件长度检查: `GatewayView.vue` 为 2134 行，`GatewayMetricCards.vue` 为 28 行，`gatewayMetricCardsComponent.test.ts` 为 24 行。
- TDD 红灯: `node --test frontend/tests/gatewayMetricCardsComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayMetricCards.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayMetricCards>`。
- 行为锁定: 组件契约测试覆盖 `cards`、`gateway-metrics` 结构、指标卡、标签和值元素，并确认父页不再内联 `<div v-if="isGatewayMonitor" class="gateway-metrics">`。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayMetricCards` 全局组件声明。
- `node --test frontend/tests/gatewayMetricCardsComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，162 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3338` 个模块完成转换。仍有既有大 chunk 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`（在 `frontend/` 下执行）: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayMetricCards.vue` 和 `frontend/tests/gatewayMetricCardsComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 60 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 61: 网关路由筛选栏组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteFiltersBar.vue`、`frontend/tests/gatewayRouteFiltersBarComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteFiltersBar`，把路由管理页顶部的路由类型切换、搜索、分组筛选、异常筛选、含停用开关和清空筛选按钮移入组件；`GatewayView.vue` 保留 `useGatewayRouteFilters` 状态、`groupOptions` 派生数据、`includeDisabled` 和 `loadData` 副作用。
- 文件长度检查: `GatewayView.vue` 为 2095 行，`GatewayRouteFiltersBar.vue` 为 102 行，`gatewayRouteFiltersBarComponent.test.ts` 为 28 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteFiltersBarComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteFiltersBar.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteFiltersBar>`。
- 行为锁定: 组件契约测试覆盖 `routeSearch`、`selectedGroups`、`selectedRouteTypes`、`selectedIssueStates`、`includeDisabled`、`route-pool-filters` 结构、路由类型 tabs、搜索栏和 `include-disabled-change` 事件，并确认父页不再内联 `<div class="route-pool-filters">`。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteFiltersBar` 全局组件声明。
- `node --test frontend/tests/gatewayRouteFiltersBarComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，164 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3340` 个模块完成转换。仍有既有大 chunk 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`（在 `frontend/` 下执行）: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteFiltersBar.vue` 和 `frontend/tests/gatewayRouteFiltersBarComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 61 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 62: 网关批量操作进度控件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteBatchAction.vue`、`frontend/tests/gatewayRouteBatchActionComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteBatchAction`，把路由管理页“探测全部”和“更新余额”的按钮、批量进度数字、成功/失败统计和进度条抽成复用组件；`GatewayView.vue` 保留 `handleProbeAll`、`handleUpdateAllBalances`、loading 状态和 progress 状态。
- 文件长度检查: `GatewayView.vue` 为 2091 行，`GatewayRouteBatchAction.vue` 为 40 行，`gatewayRouteBatchActionComponent.test.ts` 为 27 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBatchActionComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteBatchAction.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteBatchAction>`。
- 行为锁定: 组件契约测试覆盖 `label`、`progress`、`progressPercent`、`tone`、`action` 事件、`route-probe-control` 结构、余额进度样式和成功数展示，并确认父页不再内联 `<div v-if="isRouteManagement" class="route-probe-control">`。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteBatchAction` 全局组件声明。
- `node --test frontend/tests/gatewayRouteBatchActionComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，166 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3342` 个模块完成转换，构建耗时 `30.85s`。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`（在 `frontend/` 下执行）: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteBatchAction.vue` 和 `frontend/tests/gatewayRouteBatchActionComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 62 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 63: 网关访问地址复制栏组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayAccessBar.vue`、`frontend/tests/gatewayAccessBarComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayAccessBar`，把路由管理页和网关监控页顶部重复的网关地址、Codex `/v1` 提示、API Key 掩码和复制按钮移入组件；`GatewayView.vue` 保留 `gatewayRequestUrl`、`codexGatewayTooltip`、`maskedGatewayApiKey` 派生状态，以及复制剪贴板和 toast 副作用。
- 文件长度检查: `GatewayView.vue` 为 2065 行，`GatewayAccessBar.vue` 为 46 行，`gatewayAccessBarComponent.test.ts` 为 31 行。
- TDD 红灯: `node --test frontend/tests/gatewayAccessBarComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayAccessBar.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayAccessBar>`。
- 行为锁定: 组件契约测试覆盖 `requestUrl`、`codexTooltip`、`maskedApiKey`、`hasApiKey`、`variant`、`copy-request-url` 和 `copy-api-key` 事件，确认父页不再内联 `<div class="gateway-access">` 与 `<div class="gateway-access gateway-access--route">`。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayAccessBar` 全局组件声明。
- `node --test frontend/tests/gatewayAccessBarComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，168 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3344` 个模块完成转换，构建耗时 `34.87s`。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`（在 `frontend/` 下执行）: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayAccessBar.vue` 和 `frontend/tests/gatewayAccessBarComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 63 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 64: 网关路由表操作菜单组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteActionsMenu.vue`、`frontend/tests/gatewayRouteActionsMenuComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteActionsMenu`，把路由表操作列中的启用/禁用按钮、更多操作按钮、重置熔断、探测、余额、路由配置、禁用其他、优先权、诊断和历史菜单移入组件；`GatewayView.vue` 保留 `handleToggle`、`handleResetCircuit`、`handleProbeRoute`、`handleProbeRouteBalance`、`openRouteModelsDialog`、`handleEnableOnlyRoute`、`openPriorityDialog`、`openRouteDiagnosis` 和 `openRouteLogs` 副作用处理。
- 文件长度检查: `GatewayView.vue` 为 2014 行，`GatewayRouteActionsMenu.vue` 为 91 行，`gatewayRouteActionsMenuComponent.test.ts` 为 39 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteActionsMenuComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteActionsMenu.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteActionsMenu>`。
- 行为锁定: 组件契约测试覆盖 `route`、`routeProbing`、`balanceProbing`、9 个事件、`gateway-actions-cell` 结构、更多操作按钮、熔断禁用条件和历史图标，并确认父页不再内联操作菜单结构。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteActionsMenu` 全局组件声明。
- `node --test frontend/tests/gatewayRouteActionsMenuComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，170 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3346` 个模块完成转换，构建耗时 `35.73s`。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`（在 `frontend/` 下执行）: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteActionsMenu.vue` 和 `frontend/tests/gatewayRouteActionsMenuComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 64 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 65: 网关路由名称单元格组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteSummaryCell.vue`、`frontend/tests/gatewayRouteSummaryCellComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteSummaryCell`，把路由表 `route` 列的路由名称、详情 tooltip、模型能力摘要和异常标签移入组件；`GatewayView.vue` 保留 `loadRouteLabel`、`routeDetailItems`、`routeIssueLabels` 和 `supportedModelsPreview` 的现有展示函数接线。
- 文件长度检查: `GatewayView.vue` 为 1990 行，`GatewayRouteSummaryCell.vue` 为 52 行，`gatewayRouteSummaryCellComponent.test.ts` 为 31 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteSummaryCellComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteSummaryCell.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteSummaryCell>`。
- 行为锁定: 组件契约测试覆盖 `route`、`loadRouteLabel`、`routeDetailItems`、`routeIssueLabels`、`supportedModelsPreview`、详情 tooltip、模型能力标签、异常 tag 和信息图标，并确认父页不再内联路由名称单元格结构。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteSummaryCell` 全局组件声明。
- `node --test frontend/tests/gatewayRouteSummaryCellComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，172 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3348` 个模块完成转换，构建耗时 `24.67s`。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`（在 `frontend/` 下执行）: 通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteSummaryCell.vue` 和 `frontend/tests/gatewayRouteSummaryCellComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 65 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 66: 网关路由延迟单元格组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteLatencyCell.vue`、`frontend/tests/gatewayRouteLatencyCellComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteLatencyCell`，把路由表 `latency` 列的延迟 tooltip、延迟色阶 class、延迟点和值展示移入组件；`GatewayView.vue` 保留 `primaryLatency`、`latencyClass`、`formatLatency` 和 `routeLatencyDetails` 的现有展示函数接线。
- 文件长度检查: `GatewayView.vue` 为 1977 行，`GatewayRouteLatencyCell.vue` 为 35 行，`gatewayRouteLatencyCellComponent.test.ts` 为 29 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteLatencyCellComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteLatencyCell.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteLatencyCell>`。
- 行为锁定: 组件契约测试覆盖 `route`、`primaryLatency`、`latencyClass`、`formatLatency`、`routeLatencyDetails`、tooltip 详情列表、`participation-cell`、延迟点和值，并确认父页不再内联延迟 tooltip 与延迟 class 结构。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteLatencyCell` 全局组件声明。
- `node --test frontend/tests/gatewayRouteLatencyCellComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，174 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3350` 个模块完成转换，构建耗时 `1.45s`。仍有既有大 chunk 警告。
- `go test ./...`: 通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`（在 `frontend/` 下执行）: 首次因 registry TLS 握手前连接断开失败；原命令重试后通过，0 个漏洞。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteLatencyCell.vue` 和 `frontend/tests/gatewayRouteLatencyCellComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 66 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 67: 网关路由错误单元格组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteErrorCell.vue`、`frontend/tests/gatewayRouteErrorCellComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteErrorCell`，把路由表 `error` 列的错误 tooltip、错误摘要截断和空值兜底展示移入组件；`GatewayView.vue` 保留 `routeErrorDetails` 的现有展示函数接线。
- 文件长度检查: `GatewayView.vue` 为 1971 行，`GatewayRouteErrorCell.vue` 为 23 行，`gatewayRouteErrorCellComponent.test.ts` 为 27 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteErrorCellComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteErrorCell.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteErrorCell>`。
- 行为锁定: 组件契约测试覆盖 `route`、`routeErrorDetails`、`compactText`、tooltip 详情列表、`table-ellipsis`、`last_error` 和 `-` 空值兜底，并确认父页不再内联错误 tooltip 与 `compactText(asRoute(record).last_error, 42)`。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteErrorCell` 全局组件声明。
- `node --test frontend/tests/gatewayRouteErrorCellComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，176 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3352` 个模块完成转换，构建耗时 `22.34s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteErrorCell.vue` 和 `frontend/tests/gatewayRouteErrorCellComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 67 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 68: 网关路由余额单元格组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteBalanceCell.vue`、`frontend/tests/gatewayRouteBalanceCellComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteBalanceCell`，把路由表 `balance` 列的余额色阶 class、余额展示值和 `暂无` 空值兜底移入组件；`GatewayView.vue` 保留 `balanceClass` 的现有展示函数接线。
- 文件长度检查: `GatewayView.vue` 为 1970 行，`GatewayRouteBalanceCell.vue` 为 14 行，`gatewayRouteBalanceCellComponent.test.ts` 为 25 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceCellComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteBalanceCell.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteBalanceCell>`。
- 行为锁定: 组件契约测试覆盖 `route`、`balanceClass`、`last_balance`、`balance_display` 和 `暂无` 空值兜底，并确认父页不再内联 `balanceClass(asRoute(record).last_balance)` 与余额文本兜底。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteBalanceCell` 全局组件声明。
- `node --test frontend/tests/gatewayRouteBalanceCellComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，178 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3354` 个模块完成转换，构建耗时 `26.61s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteBalanceCell.vue` 和 `frontend/tests/gatewayRouteBalanceCellComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 68 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 69: 网关路由并发单元格组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteConcurrencyCell.vue`、`frontend/tests/gatewayRouteConcurrencyCellComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteConcurrencyCell`，把路由表 `concurrency` 列的并发 tooltip、当前并发、最大转移标签、分隔符和 active class 移入组件；`GatewayView.vue` 保留 `routeConcurrencyLimitLabel` 的现有计算接线。
- 文件长度检查: `GatewayView.vue` 为 1965 行，`GatewayRouteConcurrencyCell.vue` 为 18 行，`gatewayRouteConcurrencyCellComponent.test.ts` 为 30 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConcurrencyCellComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteConcurrencyCell.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteConcurrencyCell>`。
- 行为锁定: 组件契约测试覆盖 `route`、`routeConcurrencyLimitLabel`、`active_concurrency`、tooltip 文案、`gateway-concurrency--active`、当前并发、分隔符和最大转移标签，并确认父页不再内联并发展示结构。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteConcurrencyCell` 全局组件声明。
- `node --test frontend/tests/gatewayRouteConcurrencyCellComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，180 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3356` 个模块完成转换，构建耗时 `23.90s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteConcurrencyCell.vue` 和 `frontend/tests/gatewayRouteConcurrencyCellComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 69 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 70: 网关路由配置选择单元格组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteConfigCell.vue`、`frontend/tests/gatewayRouteConfigCellComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteConfigCell`，把路由表 `type` 与 `path` 列的类型选择器、请求格式选择器、类型选项样式、path 归一化取值和事件转发移入组件；`GatewayView.vue` 保留 `handleRouteTypeSelect`、`handleRoutePathSelect`、`routeTypeOptions`、`routePathOptions` 和 `normalizeRoutePath` 接线。
- 文件长度检查: `GatewayView.vue` 为 1965 行，`GatewayRouteConfigCell.vue` 为 45 行，`gatewayRouteConfigCellComponent.test.ts` 为 39 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConfigCellComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteConfigCell.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteConfigCell>`。
- 行为锁定: 组件契约测试覆盖 `route`、`mode`、`routeTypeOptions`、`routePathOptions`、`normalizeRoutePath`、`typeChange`、`pathChange`、类型选择 class、类型选项插槽、两个选择器宽度和 path 归一化，并确认父页不再内联选择器结构或 `asRoute(record)` 事件包装。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteConfigCell` 全局组件声明。
- `node --test frontend/tests/gatewayRouteConfigCellComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，182 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3358` 个模块完成转换，构建耗时 `37.09s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteConfigCell.vue` 和 `frontend/tests/gatewayRouteConfigCellComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 70 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 71: 网关路由纯文本单元格组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteTextCell.vue`、`frontend/tests/gatewayRouteTextCellComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteTextCell`，把路由表和优先级弹窗中的分组、优先级、权重、成功率纯文本展示移入组件；`GatewayView.vue` 保留 `formatGroupNames`、`asRoute` 和优先级弹窗 class 接线。
- 文件长度检查: `GatewayView.vue` 为 1966 行，`GatewayRouteTextCell.vue` 为 28 行，`gatewayRouteTextCellComponent.test.ts` 为 37 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteTextCellComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteTextCell.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteTextCell>`。
- 行为锁定: 组件契约测试覆盖 `route`、`mode`、`formatGroupNames`、`valueClass`、`group_name` 空值兜底、`route_priority`、`weight` 和 `success_rate` 百分号展示，并确认父页不再内联分组、优先级、权重和成功率文本。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteTextCell` 全局组件声明。
- `node --test frontend/tests/gatewayRouteTextCellComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gatewayRoute*Model.test.ts frontend/tests/gatewayRoute*Controller.test.ts frontend/tests/gatewayPriority*.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，99 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，184 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3360` 个模块完成转换，构建耗时 `30.48s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteTextCell.vue` 和 `frontend/tests/gatewayRouteTextCellComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 71 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 72: 网关日志路由单元格组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayLogRouteCell.vue`、`frontend/tests/gatewayLogRouteCellComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayLogRouteCell`，把“最近请求”和“路由请求历史”两个日志表中的路由名称、路由详情 tooltip 和信息图标移入组件；`GatewayView.vue` 保留 `asLog`、`logRouteLabel` 和 `logRouteMeta` 接线。
- 文件长度检查: `GatewayView.vue` 为 1953 行，`GatewayLogRouteCell.vue` 为 21 行，`gatewayLogRouteCellComponent.test.ts` 为 34 行。
- TDD 红灯: `node --test frontend/tests/gatewayLogRouteCellComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayLogRouteCell.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayLogRouteCell>`。
- 行为锁定: 组件契约测试覆盖 `log`、`logRouteLabel`、`logRouteMeta`、`InfoCircleOutlined`、`table-cell-compact` 结构、右侧 tooltip 和标题展示，并确认父页不再内联 `logRouteLabel(asLog(record))`、`logRouteMeta(asLog(record))` 和信息图标。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayLogRouteCell` 全局组件声明。
- `node --test frontend/tests/gatewayLogRouteCellComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，127 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，186 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3362` 个模块完成转换，构建耗时 `34.21s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayLogRouteCell.vue` 和 `frontend/tests/gatewayLogRouteCellComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 72 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 73: 网关日志状态单元格组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayLogStatusCell.vue`、`frontend/tests/gatewayLogStatusCellComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayLogStatusCell`，把“最近请求”和“路由请求历史”两个日志表中的成功/失败状态 tooltip、状态 tag 颜色和状态文案移入组件；`GatewayView.vue` 保留 `asLog` 接线。
- 文件长度检查: `GatewayView.vue` 为 1950 行，`GatewayLogStatusCell.vue` 为 13 行，`gatewayLogStatusCellComponent.test.ts` 为 30 行。
- TDD 红灯: `node --test frontend/tests/gatewayLogStatusCellComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayLogStatusCell.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayLogStatusCell>`。
- 行为锁定: 组件契约测试覆盖 `log.success`、`log.failure_reason`、成功/失败 tooltip 文案、成功/失败 tag 文案和 `success`/`error` 颜色，并确认父页不再内联日志状态判断。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayLogStatusCell` 全局组件声明。
- `node --test frontend/tests/gatewayLogStatusCellComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，129 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，188 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3364` 个模块完成转换，构建耗时 `30.69s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayLogStatusCell.vue` 和 `frontend/tests/gatewayLogStatusCellComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 73 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 74: 网关日志请求单元格组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayLogRequestCell.vue`、`frontend/tests/gatewayLogRequestCellComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayLogRequestCell`，把“最近请求”和“路由请求历史”两个日志表 `request` 列中的请求方法 tag、请求 URL tooltip/省略展示和流式 tag 移入组件；`GatewayView.vue` 保留 `asLog`、`requestMethodColor`、`logMethodLabel`、`logRequestLabel` 和 `logRequestURL` 接线。
- 文件长度检查: `GatewayView.vue` 为 1939 行，`GatewayLogRequestCell.vue` 为 21 行，`gatewayLogRequestCellComponent.test.ts` 为 38 行。
- TDD 红灯: `node --test frontend/tests/gatewayLogRequestCellComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayLogRequestCell.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayLogRequestCell>`。
- 行为锁定: 组件契约测试覆盖 `log`、`requestMethodColor`、`logMethodLabel`、`logRequestLabel`、`logRequestURL`、`gateway-log-request`、`gateway-log-method`、`table-ellipsis gateway-log-request-url`、`topLeft` tooltip、`log.is_stream` 和 `stream-tag`，并确认父页不再内联 request 列 DOM、`logRequestURL(asLog(record))` 或 `asLog(record).is_stream`。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayLogRequestCell` 全局组件声明。
- `node --test frontend/tests/gatewayLogRequestCellComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，131 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，190 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3366` 个模块完成转换。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayLogRequestCell.vue` 和 `frontend/tests/gatewayLogRequestCellComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 74 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 75: 网关日志模型单元格组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayLogModelCell.vue`、`frontend/tests/gatewayLogModelCellComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayLogModelCell`，把“最近请求”和“路由请求历史”两个日志表 `model` 列中的模型 tooltip 和单行模型展示移入组件；`GatewayView.vue` 保留 `asLog` 和 `logModelMeta` 接线。
- 文件长度检查: `GatewayView.vue` 为 1936 行，`GatewayLogModelCell.vue` 为 14 行，`gatewayLogModelCellComponent.test.ts` 为 28 行。
- TDD 红灯: `node --test frontend/tests/gatewayLogModelCellComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayLogModelCell.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayLogModelCell>`。
- 行为锁定: 组件契约测试覆盖 `log`、`logModelMeta`、`topLeft` tooltip、`gateway-log-model-line` 和模型文案展示，并确认父页不再内联 `logModelMeta(asLog(record))` 或模型行 DOM。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayLogModelCell` 全局组件声明。
- `node --test frontend/tests/gatewayLogModelCellComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，133 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，192 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3368` 个模块完成转换，构建耗时 `36.79s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayLogModelCell.vue` 和 `frontend/tests/gatewayLogModelCellComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 75 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 76: 网关日志 User-Agent 单元格组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayLogUserAgentCell.vue`、`frontend/tests/gatewayLogUserAgentCellComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayLogUserAgentCell`，把“最近请求”和“路由请求历史”两个日志表 `user_agent` 列中的 User-Agent tooltip、省略展示和 `暂无` 空态移入组件；`GatewayView.vue` 保留 `asLog` 和 `logUserAgent` 接线。
- 文件长度检查: `GatewayView.vue` 为 1931 行，`GatewayLogUserAgentCell.vue` 为 15 行，`gatewayLogUserAgentCellComponent.test.ts` 为 30 行。
- TDD 红灯: `node --test frontend/tests/gatewayLogUserAgentCellComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayLogUserAgentCell.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayLogUserAgentCell>`。
- 行为锁定: 组件契约测试覆盖 `log`、`logUserAgent`、非空 User-Agent tooltip、省略展示、`gateway-log-user-agent` class 和 `暂无` 空态，并确认父页不再内联 `logUserAgent(asLog(record))` 或 User-Agent DOM。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayLogUserAgentCell` 全局组件声明。
- `node --test frontend/tests/gatewayLogUserAgentCellComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，135 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，194 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3370` 个模块完成转换，构建耗时 `41.71s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayLogUserAgentCell.vue` 和 `frontend/tests/gatewayLogUserAgentCellComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 76 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 77: 网关日志延迟单元格组件拆分

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayLogLatencyCell.vue`、`frontend/tests/gatewayLogLatencyCellComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayLogLatencyCell`，把“最近请求”和“路由请求历史”两个日志表 `latency` 列中的延迟毫秒展示和 `暂无` 空态移入组件；`GatewayView.vue` 保留 `asLog` 接线。该列原先是单行表达式，新增组件 import 后 `GatewayView.vue` 净增 1 行，但展示边界已外移。
- 文件长度检查: `GatewayView.vue` 为 1932 行，`GatewayLogLatencyCell.vue` 为 11 行，`gatewayLogLatencyCellComponent.test.ts` 为 24 行。
- TDD 红灯: `node --test frontend/tests/gatewayLogLatencyCellComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayLogLatencyCell.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayLogLatencyCell>`。
- 行为锁定: 组件契约测试覆盖 `log.latency_ms ?` 的既有 falsy 判断、`${log.latency_ms} ms` 展示和 `暂无` 空态，并确认父页不再内联 `asLog(record).latency_ms ?` 表达式。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayLogLatencyCell` 全局组件声明。
- `node --test frontend/tests/gatewayLogLatencyCellComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，137 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，196 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3372` 个模块完成转换，构建耗时 `26.27s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayLogLatencyCell.vue` 和 `frontend/tests/gatewayLogLatencyCellComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 77 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 78: 网关日志抽屉展示边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayLogsDrawer.vue`、`frontend/tests/gatewayLogsDrawerComponent.test.ts`、6 个既有 `gatewayLog*CellComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayLogsDrawer`，把“最近请求”和“路由请求历史”两个日志抽屉的 drawer、搜索框、表格壳层、loading、分页、滚动和 bodyCell 分发移入共享组件；`GatewayView.vue` 保留日志加载、过滤、搜索状态、抽屉打开状态和展示函数接线。
- 文件长度检查: `GatewayView.vue` 降至 1866 行，`GatewayLogsDrawer.vue` 为 99 行，`gatewayLogsDrawerComponent.test.ts` 为 52 行。
- TDD 红灯: `node --test frontend/tests/gatewayLogsDrawerComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayLogsDrawer.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayLogsDrawer>`。
- 行为锁定: 组件契约测试覆盖 `open` 和 `search` 双向绑定、日志列/数据/loading/page size/drawer table 高度/row key 传入、搜索占位符、表格壳层、6 个日志单元格组件委托和 attempt 展示，并确认父页不再保留两个日志抽屉的内联 `a-drawer`。
- 测试迁移: 6 个日志单元格组件测试的父级委托边界从 `GatewayView.vue` 更新为 `GatewayLogsDrawer.vue`，避免任务 78 后继续把页面级组件当作单元格直接父级。
- 构建修复: 首次 `npm run build` 暴露 `GatewayView.vue` 仍导入未使用的 `asLog`；删除该旧导入后重新验证通过。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayLogsDrawer` 全局组件声明。
- `node --test frontend/tests/gatewayLogsDrawerComponent.test.ts frontend/tests/gatewayLogLatencyCellComponent.test.ts frontend/tests/gatewayLogModelCellComponent.test.ts frontend/tests/gatewayLogRequestCellComponent.test.ts frontend/tests/gatewayLogRouteCellComponent.test.ts frontend/tests/gatewayLogStatusCellComponent.test.ts frontend/tests/gatewayLogUserAgentCellComponent.test.ts`: 通过，14 个日志抽屉和日志单元格契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，139 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，198 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3374` 个模块完成转换，构建耗时 `31.44s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayLogsDrawer.vue` 和 `frontend/tests/gatewayLogsDrawerComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 78 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 79: 网关路由诊断抽屉展示边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteDiagnosisDrawer.vue`、`frontend/tests/gatewayRouteDiagnosisDrawerComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteDiagnosisDrawer`，把路由诊断抽屉的 drawer、loading spin、健康状态 alert、诊断项列表、severity 标签和详情展示移入组件；`GatewayView.vue` 保留诊断 API 请求、controller 状态和 `formatTime` 接线。
- 文件长度检查: `GatewayView.vue` 降至 1839 行，`GatewayRouteDiagnosisDrawer.vue` 为 62 行，`gatewayRouteDiagnosisDrawerComponent.test.ts` 为 46 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteDiagnosisDrawerComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteDiagnosisDrawer.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteDiagnosisDrawer>`。
- 行为锁定: 组件契约测试覆盖 `open` 双向绑定、诊断展示字段、loading、drawer 宽度和位置、健康/阻断 alert 文案、当前并发和检查时间、诊断项列表、severity class、severity 颜色与中文标签，并确认父页不再内联诊断 `a-drawer` 或遍历 `routeDiagnosis.diagnostics`。
- 类型面收窄: 组件 props 使用 `Pick<GatewayRouteDiagnosis, 'route_label' | 'healthy' | 'active_count' | 'checked_at' | 'diagnostics'>`，只把展示所需字段带入模板类型推导；父页仍可传完整诊断对象，行为不变。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteDiagnosisDrawer` 全局组件声明。
- `node --test frontend/tests/gatewayRouteDiagnosisDrawerComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，141 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，200 个前端状态辅助测试全部通过。
- `npx vue-tsc -b --pretty false`（在 `frontend/` 下执行）: 清理被中断构建留下的 `node_modules/.tmp/tsconfig.*.tsbuildinfo` 后通过，无输出。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3376` 个模块完成转换，构建耗时 `2m 8s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteDiagnosisDrawer.vue` 和 `frontend/tests/gatewayRouteDiagnosisDrawerComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 79 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 80: 网关优先级弹窗展示边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayPriorityDialog.vue`、`frontend/tests/gatewayPriorityDialogComponent.test.ts`、`frontend/tests/gatewayRouteTextCellComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayPriorityDialog`，把优先级弹窗的 modal、loading spin、优先级表格、当前路由摘要、目标优先级输入和 3 个操作按钮移入组件；`GatewayView.vue` 保留优先级列表加载、重排 API、toast、controller 状态和 `handlePriorityMove` / `handlePriorityPreset` 副作用。
- 文件长度检查: `GatewayView.vue` 降至 1795 行，`GatewayPriorityDialog.vue` 为 92 行，`gatewayPriorityDialogComponent.test.ts` 为 60 行，`gatewayRouteTextCellComponent.test.ts` 为 41 行。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityDialogComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayPriorityDialog.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayPriorityDialog>`。
- 行为锁定: 组件契约测试覆盖 `open` 与 `insertIndex` 双向绑定、优先级列/路由列表/loading/row key/row class 传入、表格分页与滚动、当前路由标签、`GatewayRouteTextCell` 委托、当前优先级摘要、目标优先级输入上限和 move/preset 事件。
- 测试迁移: `gatewayRouteTextCellComponent.test.ts` 的父级委托边界从只检查 `GatewayView.vue` 扩展为同时检查 `GatewayView.vue` 和 `GatewayPriorityDialog.vue`，因为 `value-class="priority-number"` 随任务 80 移入优先级弹窗组件。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayPriorityDialog` 全局组件声明。
- `node --test frontend/tests/gatewayPriorityDialogComponent.test.ts frontend/tests/gatewayRouteTextCellComponent.test.ts`: 通过，4 个组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，143 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，202 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3378` 个模块完成转换，构建耗时 `41.84s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayPriorityDialog.vue` 和 `frontend/tests/gatewayPriorityDialogComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 80 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 81: 网关手动余额探测弹窗展示边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteBalanceManualDialog.vue`、`frontend/tests/gatewayRouteBalanceManualDialogComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteBalanceManualDialog`，把手动余额探测弹窗的 modal、warning alert、当前路由 label、余额接口输入和说明文案移入组件；`GatewayView.vue` 保留 URL 归一化与校验、余额探测 API、结果合并、toast、loading 和 controller 状态。
- 文件长度检查: `GatewayView.vue` 降至 1779 行，`GatewayRouteBalanceManualDialog.vue` 为 46 行，`gatewayRouteBalanceManualDialogComponent.test.ts` 为 55 行，`components.d.ts` 为 114 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceManualDialogComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteBalanceManualDialog.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteBalanceManualDialog>`。
- 行为锁定: 组件契约测试覆盖 `open` 与 `url` 双向绑定、route/message/loading/loadRouteLabel props、submit 事件、modal 标题/宽度/确认 loading/确认文案、warning alert、当前路由 fallback label、输入 placeholder/autocomplete 和保存说明文案。
- 副作用边界: `submitManualRouteBalanceProbe`、`openRouteBalanceProbeManualDialog`、`probeGatewayRouteBalance`、`applyRouteBalanceResult`、`refreshRouteSummaries`、`notifyGatewayOverviewChanged` 和 toast 调用仍留在 `GatewayView.vue`，本任务只移动展示模板。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteBalanceManualDialog` 全局组件声明。
- `node --test frontend/tests/gatewayRouteBalanceManualDialogComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeModel.test.ts frontend/tests/gatewayRouteBalanceManualDialogComponent.test.ts`: 通过，17 个余额探测相关测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，145 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，204 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3380` 个模块完成转换，构建耗时 `1m 15s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteBalanceManualDialog.vue` 和 `frontend/tests/gatewayRouteBalanceManualDialogComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 81 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 82: 网关设置弹窗展示边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewaySettingsDialog.vue`、`frontend/tests/gatewaySettingsDialogComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewaySettingsDialog`，把网关策略设置弹窗的 modal、表单布局、路由策略/错误切换/并发转移选项、Smart 权重面板、`GATEWAY_API_KEY` 输入和右侧策略说明移入组件；`GatewayView.vue` 保留设置加载、保存 API、toast、controller form/open/loading 状态和 `saveSettings` 副作用。
- 文件长度检查: `GatewayView.vue` 降至 1568 行，`GatewaySettingsDialog.vue` 为 241 行，`gatewaySettingsDialogComponent.test.ts` 为 66 行，`components.d.ts` 为 115 行。
- TDD 红灯: `node --test frontend/tests/gatewaySettingsDialogComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewaySettingsDialog.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewaySettingsDialog>`。
- 行为锁定: 组件契约测试覆盖 `open` 双向绑定、form/loading props、save 事件、modal 标题/宽度/确认 loading、全部设置字段的 `v-model`、策略选项来源、Smart 面板条件展示、策略关系 alert、API Key 密码输入和右侧策略说明列表。
- 副作用边界: `saveSettings`、`updateGatewaySettings`、`settingsDialog.setSettings`、`settingsDialog.setLoading`、`settingsDialog.closeAfterSuccess` 和 toast 调用仍留在 `GatewayView.vue`，本任务只移动展示模板与展示用 computed。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewaySettingsDialog` 全局组件声明。
- `node --test frontend/tests/gatewaySettingsDialogComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gatewaySettingsController.test.ts frontend/tests/gatewaySettingsModel.test.ts frontend/tests/gatewaySettingsDialogComponent.test.ts`: 通过，9 个设置相关测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，147 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，206 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3382` 个模块完成转换，构建耗时 `43.96s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 前两次因 npm registry bulk advisories 请求 TLS 断开失败；确认 `npm ping --registry=https://registry.npmjs.org` 可通后第三次通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewaySettingsDialog.vue` 和 `frontend/tests/gatewaySettingsDialogComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 82 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 83: 网关添加上游弹窗展示边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayAddUpstreamDialog.vue`、`frontend/tests/gatewayAddUpstreamDialogComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayAddUpstreamDialog`，把添加上游 `api-supplier` 弹窗的 modal、说明 alert、名称/API 格式/Base URL/API Key/分组/默认模型/支持模型表单移入组件；`GatewayView.vue` 保留表单 controller、校验、`createSite`、同步路由、刷新数据和 toast 副作用。
- 文件长度检查: `GatewayView.vue` 降至 1479 行，`GatewayAddUpstreamDialog.vue` 为 126 行，`gatewayAddUpstreamDialogComponent.test.ts` 为 65 行，`components.d.ts` 为 116 行。
- TDD 红灯: `node --test frontend/tests/gatewayAddUpstreamDialogComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayAddUpstreamDialog.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayAddUpstreamDialog>`。
- 行为锁定: 组件契约测试覆盖 `open` 和 `groupNames` 双向绑定、form/groupOptions/loading props、submit/reset 事件、modal 标题/确认 loading/按钮文案/宽度、info alert、API 格式选项、全部表单字段、分组多选、支持模型 tags 输入和父视图不再内联添加上游 modal。
- 副作用边界: `submitAddUpstream`、`resetAddUpstreamForm`、`validateAddUpstreamForm`、`buildAddUpstreamPayload`、`createSite`、`handleSync`、`loadData`、`addUpstreamDialog.closeAfterSuccess` 和 toast 调用仍留在 `GatewayView.vue`，本任务只移动展示模板。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayAddUpstreamDialog` 全局组件声明。
- `node --test frontend/tests/gatewayAddUpstreamDialogComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewayAddUpstreamModel.test.ts frontend/tests/gatewayAddUpstreamDialogComponent.test.ts`: 通过，8 个添加上游相关测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，149 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，208 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3384` 个模块完成转换，构建耗时 `26.19s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 首次因 npm registry bulk advisories 请求 TLS 断开失败；确认 `npm ping --registry=https://registry.npmjs.org` 可通后重试通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayAddUpstreamDialog.vue` 和 `frontend/tests/gatewayAddUpstreamDialogComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 83 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 84: 网关路由模型编辑弹窗展示边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteModelsDialog.vue`、`frontend/tests/gatewayRouteModelsDialogComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteModelsDialog`，把路由模型编辑弹窗的 modal、路由 API URL textarea、支持模型 tags 选择器、当前路由 label 和说明文案移入组件；`GatewayView.vue` 保留 `saveRouteModelsDialog`、payload 构造、`updateGatewayRouteType`、路由替换、toast、saving 状态和 controller 状态。
- 文件长度检查: `GatewayView.vue` 降至 1462 行，`GatewayRouteModelsDialog.vue` 为 47 行，`gatewayRouteModelsDialogComponent.test.ts` 为 55 行，`components.d.ts` 为 117 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteModelsDialogComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteModelsDialog.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteModelsDialog>`。
- 行为锁定: 组件契约测试覆盖 `open`、`requestURLs` 和 `supportedModels` 双向绑定，`route`、`saving`、`loadRouteLabel` props，save 事件，modal 标题/宽度/确认 loading，URL textarea 占位文案，当前路由 label fallback，支持模型 tags 输入和父视图不再内联路由模型编辑 modal。
- 副作用边界: `saveRouteModelsDialog`、`buildGatewayRouteModelsPayload`、`normalizeRouteURLs`、`updateGatewayRouteType`、路由列表替换、`routeModelsDialog.closeAfterSuccess` 和 toast 调用仍留在 `GatewayView.vue`，本任务只移动展示模板。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteModelsDialog` 全局组件声明。
- `node --test frontend/tests/gatewayRouteModelsDialogComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gatewayRouteConfigController.test.ts frontend/tests/gatewayRouteConfigModel.test.ts frontend/tests/gatewayRouteModelsDialogComponent.test.ts`: 通过，8 个路由配置相关测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，151 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，210 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3386` 个模块完成转换，构建耗时 `28.77s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteModelsDialog.vue` 和 `frontend/tests/gatewayRouteModelsDialogComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 84 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 85: 网关路由管理表格主体展示边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteManagementTable.vue`、`frontend/tests/gatewayRouteManagementTableComponent.test.ts`、`frontend/tests/gatewayRoute*CellComponent.test.ts`、`frontend/tests/gatewayRouteFiltersBarComponent.test.ts`、`frontend/tests/gatewayRouteActionsMenuComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteManagementTable`，把路由管理卡片壳、`GatewayRouteFiltersBar`、表格容器、`a-table`、权重表头 tooltip、body cell 分发和路由行操作菜单装配移入组件；`GatewayView.vue` 保留路由数据、筛选状态、表格列、滚动高度绑定、API 调用、toast 和所有行操作副作用。
- 文件长度检查: `GatewayView.vue` 降至 1372 行，`GatewayRouteManagementTable.vue` 为 209 行，`gatewayRouteManagementTableComponent.test.ts` 为 52 行，`components.d.ts` 为 118 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteManagementTableComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteManagementTable.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteManagementTable>`。
- 行为锁定: 组件契约测试覆盖 columns/routes/pageSize/tableY/rowKey/table ref/filter models props、筛选事件、路由类型和路径变更事件、全部路由行操作事件、filter bar 委托、表格分页/滚动、权重说明 tooltip，以及 summary/config/balance/text/concurrency/latency/error/actions cell 的分发。
- 测试迁移: 路由行单元格和筛选栏相关 component 契约测试从 `GatewayView.vue` 改为检查 `GatewayRouteManagementTable.vue`，因为这些展示边界已不再由父视图直接渲染。
- 副作用边界: `handleRouteTypeSelect`、`handleRoutePathSelect`、`handleToggle`、`handleResetCircuit`、`handleProbeRoute`、`handleProbeRouteBalance`、`openRouteModelsDialog`、`handleEnableOnlyRoute`、`openPriorityDialog`、`openRouteDiagnosis`、`openRouteLogs`、`loadData` 和所有 API/toast 调用仍留在 `GatewayView.vue`。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteManagementTable` 全局组件声明。
- `node --test frontend/tests/gatewayRouteManagementTableComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts`: 通过，60 个网关组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，153 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，212 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3388` 个模块完成转换，构建耗时 `54.58s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteManagementTable.vue` 和 `frontend/tests/gatewayRouteManagementTableComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 85 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 86: 网关路由管理工具栏展示边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteManagementToolbar.vue`、`frontend/tests/gatewayRouteManagementToolbarComponent.test.ts`、`frontend/tests/gatewayRouteBatchActionComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayRouteManagementToolbar`，把路由池计数、route 版 `GatewayAccessBar`、刷新、同步路由、探测全部、更新余额、禁用全部、添加上游和网关策略按钮移入组件；`GatewayView.vue` 保留监控页工具栏、复制函数、刷新/同步/批量探测/批量余额/禁用全部/添加上游/打开策略的副作用函数。
- 文件长度检查: `GatewayView.vue` 降至 1351 行，`GatewayRouteManagementToolbar.vue` 为 98 行，`gatewayRouteManagementToolbarComponent.test.ts` 为 62 行，`components.d.ts` 为 119 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteManagementToolbarComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayRouteManagementToolbar.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayRouteManagementToolbar>`。
- 行为锁定: 组件契约测试覆盖路由计数、网关地址/API Key 展示、loading 状态、批量探测/余额进度、复制事件、刷新、同步、探测全部、更新余额、禁用全部、添加上游和打开策略事件，以及工具栏 class、route 版 `GatewayAccessBar` 和 `GatewayRouteBatchAction` 委托。
- 测试迁移: `gatewayRouteBatchActionComponent.test.ts` 的父级委托边界从 `GatewayView.vue` 改为 `GatewayRouteManagementToolbar.vue`，因为批量操作展示已由新工具栏组件承接。
- 副作用边界: `copyGatewayRequestUrl`、`copyGatewayApiKey`、`handleRefresh`、`handleSync`、`handleProbeAll`、`handleUpdateAllBalances`、`handleDisableAllRoutes`、`addUpstreamDialog.openDialog` 和 `settingsDialog.openDialog` 仍留在 `GatewayView.vue`。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayRouteManagementToolbar` 全局组件声明。
- `node --test frontend/tests/gatewayRouteManagementToolbarComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts`: 通过，62 个网关组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，155 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，214 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3390` 个模块完成转换，构建耗时 `39.61s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayRouteManagementToolbar.vue` 和 `frontend/tests/gatewayRouteManagementToolbarComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 86 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 87: 网关监控页工具栏展示边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayMonitorToolbar.vue`、`frontend/tests/gatewayMonitorToolbarComponent.test.ts`、`frontend/tests/gatewayAccessBarComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayMonitorToolbar`，把监控页顶部工具栏、默认 `GatewayAccessBar`、刷新、网关策略和最近请求按钮移入组件；`GatewayView.vue` 保留复制网关地址/API Key、刷新数据、打开策略弹窗和打开日志抽屉的副作用函数。
- 文件长度检查: `GatewayView.vue` 降至 1336 行，`GatewayMonitorToolbar.vue` 为 50 行，`gatewayMonitorToolbarComponent.test.ts` 为 45 行，`gatewayAccessBarComponent.test.ts` 为 39 行，`components.d.ts` 为 120 行。
- TDD 红灯: `node --test frontend/tests/gatewayMonitorToolbarComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayMonitorToolbar.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayMonitorToolbar>`。
- 行为锁定: 组件契约测试覆盖监控页 `GatewayAccessBar` props、`copy-request-url`、`copy-api-key`、`refresh`、`open-settings`、`open-logs` 事件，刷新 loading 状态，`ReloadOutlined`、`SettingOutlined` 图标，工具栏 class 和按钮文本。
- 测试迁移: `gatewayAccessBarComponent.test.ts` 的父级委托边界更新为同时检查 `GatewayMonitorToolbar` 与 `GatewayRouteManagementToolbar`，因为监控页和路由管理页已分别承接网关复制条展示。
- 副作用边界: `copyGatewayRequestUrl`、`copyGatewayApiKey`、`handleRefresh`、`settingsDialog.openDialog`、`logsDrawer.openDrawer`、自动刷新定时器、请求取消和 API/toast 调用仍留在 `GatewayView.vue`。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayMonitorToolbar` 全局组件声明。
- `node --test frontend/tests/gatewayMonitorToolbarComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts`: 通过，64 个网关组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，157 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，216 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3392` 个模块完成转换，构建耗时 `1m 15s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayMonitorToolbar.vue` 和 `frontend/tests/gatewayMonitorToolbarComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 87 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 88: 网关监控页主体展示边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayMonitorDashboard.vue`、`frontend/tests/gatewayMonitorDashboardComponent.test.ts`、`frontend/tests/gatewayMetricCardsComponent.test.ts`、`frontend/tests/gatewayUsagePanelComponent.test.ts`、`frontend/tests/gatewayActivityPanelComponent.test.ts`、`frontend/tests/gatewayRouteStatusPanelComponent.test.ts`、`frontend/tests/gatewayStrategyPanelComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayMonitorDashboard`，把监控页指标卡片、用量面板、实时调用、路由池状态、策略分布和 `gateway-overview-shell` 主体布局移入组件；`GatewayView.vue` 保留监控数据计算、用量时间范围状态、复制实时请求 URL、查询今日/指定用量范围和全部 API 副作用。
- 文件长度检查: `GatewayView.vue` 降至 1316 行，`GatewayMonitorDashboard.vue` 为 133 行，`gatewayMonitorDashboardComponent.test.ts` 为 49 行，`components.d.ts` 为 121 行。
- TDD 红灯: `node --test frontend/tests/gatewayMonitorDashboardComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayMonitorDashboard.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayMonitorDashboard>`。
- 行为锁定: 组件契约测试覆盖 metricCards、usageRange、usage、routeActivityFeed、routePoolStatusCards、routePoolPreviewRoutes、gatewayStrategyCards props，`update:start`、`update:end`、`today`、`query`、`copy-activity-url` 事件，`GatewayMetricCards`、`GatewayUsagePanel`、`GatewayActivityPanel`、`GatewayRouteStatusPanel`、`GatewayStrategyPanel` 委托，以及 `gateway-fill`、`gateway-overview-shell`、`gateway-overview-grid` 布局 class。
- 测试迁移: 监控页子面板相关 component 契约测试的父级委托边界从 `GatewayView.vue` 改为 `GatewayMonitorDashboard.vue`，因为监控主体展示已由新 dashboard 组件承接；`GatewayView.vue` 只保留 dashboard 入口和事件连接。
- 副作用边界: `metricCards`、`usageSummaryCards`、`routeActivityFeed`、`routePoolStatusCards`、`routePoolPreviewRoutes`、`gatewayStrategyCards`、`handleUsageToday`、`handleUsageQuery`、`copyGatewayActivityUrl`、自动刷新定时器、请求取消和 API/toast 调用仍留在 `GatewayView.vue`。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayMonitorDashboard` 全局组件声明。
- `node --test frontend/tests/gatewayMonitorDashboardComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts`: 通过，66 个网关组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，159 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，218 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3394` 个模块完成转换，构建耗时 `1m 3s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayMonitorDashboard.vue` 和 `frontend/tests/gatewayMonitorDashboardComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 88 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 89: 网关弹窗与抽屉宿主展示边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayOverlayHost.vue`、`frontend/tests/gatewayOverlayHostComponent.test.ts`、`frontend/tests/gatewayAddUpstreamDialogComponent.test.ts`、`frontend/tests/gatewayPriorityDialogComponent.test.ts`、`frontend/tests/gatewayRouteBalanceManualDialogComponent.test.ts`、`frontend/tests/gatewaySettingsDialogComponent.test.ts`、`frontend/tests/gatewayRouteModelsDialogComponent.test.ts`、`frontend/tests/gatewayLogsDrawerComponent.test.ts`、`frontend/tests/gatewayRouteDiagnosisDrawerComponent.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayOverlayHost`，把优先级弹窗、余额探测接口弹窗、网关策略弹窗、添加上游弹窗、路由模型配置弹窗、最近请求抽屉、路由请求历史抽屉和路由诊断抽屉宿主移入组件；`GatewayView.vue` 保留所有弹窗/抽屉 state、表单对象、API 请求、toast、保存/提交/查询/诊断副作用函数。
- 文件长度检查: `GatewayView.vue` 降至 1270 行，`GatewayOverlayHost.vue` 为 192 行，`gatewayOverlayHostComponent.test.ts` 为 72 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayOverlayHostComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayOverlayHost.vue`，同时确认 `GatewayView.vue` 尚未导入和渲染 `<GatewayOverlayHost>`。
- 行为锁定: 组件契约测试覆盖 priority、balanceProbeManual、settings、addUpstream、routeModels、logs、routeLogs、routeDiagnosis 的 named model，`priority-move`、`priority-preset`、`balance-submit`、`settings-save`、`add-upstream-submit`、`add-upstream-reset`、`route-models-save` 事件，以及 7 类弹窗/抽屉组件的宿主委托。
- 测试迁移: 弹窗和抽屉相关 component 契约测试的父级委托边界从 `GatewayView.vue` 改为 `GatewayOverlayHost.vue`；`GatewayView.vue` 的新增契约只校验宿主组件入口、named v-model、route logs 标题表达式和事件连接。
- 副作用边界: `handlePriorityMove`、`handlePriorityPreset`、`submitManualRouteBalanceProbe`、`saveSettings`、`submitAddUpstream`、`resetAddUpstreamForm`、`saveRouteModelsDialog`、日志筛选、路由诊断数据和所有 API/toast 调用仍留在 `GatewayView.vue`。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayOverlayHost` 全局组件声明。
- `node --test frontend/tests/gatewayOverlayHostComponent.test.ts`: 通过，2 个组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts`: 通过，68 个网关组件契约测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，161 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，220 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3396` 个模块完成转换，构建耗时 `50.86s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；新增未跟踪文件另用等价包装命令检查 `frontend/src/components/gateway/GatewayOverlayHost.vue` 和 `frontend/tests/gatewayOverlayHostComponent.test.ts`，均无空白问题。
- 运行态说明: 任务 89 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 90: 网关运行态请求取消槽边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `createGatewayAbortControllerSlot`，把 `GatewayView.vue` 中 `loadData`、`autoRefresh`、`activeRequests`、`gatewayUsage` 四组 AbortController 的替换、仅清理当前请求和卸载取消规则收口到无副作用 helper；API 调用、toast、加载状态、定时器和可见性判断仍保留在 `GatewayView.vue`。
- 文件长度检查: `GatewayView.vue` 降至 1250 行，`gatewayRuntimeController.ts` 为 107 行，`gatewayRuntimeController.test.ts` 为 96 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于缺少 `createGatewayAbortControllerSlot` named export，确认测试先锁定新增运行态 helper 行为。
- 构建红灯: 首次 `npm run build` 失败于 `GatewayView.vue` 多处 `controller.signal` 被推断为 `unknown`，根因是 slot 默认泛型未固定到 `AbortController`；已通过给 `createGatewayAbortControllerSlot` 增加默认泛型 `AbortController` 修复，避免调用点丢失 `AbortSignal` 类型。
- 行为锁定: 新测试覆盖替换 active controller 时取消旧请求、`clearIfCurrent` 只清理当前 controller、旧 controller 不能误清新请求、`abortAndClear` 可重复调用且会清空当前 controller。
- 副作用边界: 本任务未移动任何网关 API 请求、自动刷新 timer、页面可见性判断、`loadData`、`refreshRealtimeData`、`loadGatewayUsage`、toast 或状态写入逻辑，只替换请求取消槽的重复样板。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，5 个运行态控制器测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，163 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，222 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3396` 个模块完成转换，构建耗时 `40.60s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务未新增新路径，本轮涉及的未跟踪 helper/test 文件 `frontend/src/gatewayRuntimeController.ts` 和 `frontend/tests/gatewayRuntimeController.test.ts` 另用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 90 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 91: 网关数据加载计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `buildGatewayInitialDataLoadPlan` 和 `buildGatewayRealtimeRefreshPlan`，把 `loadData`、`refreshRealtimeData` 中“是否加载 logs / usage / active requests、是否应用 active request snapshot”的纯判断收口到 runtime helper；API 请求构造、Promise 编排、响应合并、toast、AbortController slot、loading 状态和定时器仍留在 `GatewayView.vue`。
- 文件长度检查: `GatewayView.vue` 当前为 1261 行，`gatewayRuntimeController.ts` 为 133 行，`gatewayRuntimeController.test.ts` 为 159 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于缺少 `buildGatewayInitialDataLoadPlan` named export，确认测试先锁定新增数据加载计划 helper 行为。
- 行为锁定: 新测试覆盖路由页初始加载不请求 logs/usage/active requests，监控页初始加载请求 logs/usage/active requests，已有 usage snapshot 时不重复请求 usage；实时刷新在路由页默认不拉 logs，logs drawer 打开时拉 logs，监控页拉 logs 并刷新 active requests。
- 副作用边界: 本任务未移动任何 API 函数、请求参数、响应写入、错误提示、自动刷新节流、页面可见性判断或取消逻辑，只把布尔计划从副作用函数中抽出。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，7 个运行态控制器测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，165 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，224 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3396` 个模块完成转换，构建耗时 `28.83s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务未新增新路径，本轮涉及的未跟踪 helper/test 文件 `frontend/src/gatewayRuntimeController.ts` 和 `frontend/tests/gatewayRuntimeController.test.ts` 另用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 91 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 92: 网关刷新定时器计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `buildGatewayAutoRefreshTimerPlan` 和 `buildGatewayVisibilityRefreshPlan`，把 `startAutoRefresh` 中 routes/monitor 的刷新间隔选择、是否启用 active request 定时器，以及 `handleVisibilityChange` 中 visible/monitor 的刷新触发计划收口到 runtime helper；真实 `window.setInterval`、`window.clearInterval`、`document.visibilityState` 读取和刷新函数调用仍保留在 `GatewayView.vue`。
- 文件长度检查: `GatewayView.vue` 当前为 1273 行，`gatewayRuntimeController.ts` 为 164 行，`gatewayRuntimeController.test.ts` 为 209 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于缺少 `buildGatewayAutoRefreshTimerPlan` named export，确认测试先锁定新增定时器计划 helper 行为。
- 行为锁定: 新测试覆盖路由页使用 `180000ms` 实时刷新且不启用 active request timer，监控页使用 `30000ms` 实时刷新并启用 `1000ms` active request timer；隐藏页面不触发 visibility 刷新，路由页可见时只刷新实时数据，监控页可见时同时刷新实时数据和 active requests。
- 副作用边界: 本任务未移动任何真实 timer 创建/清理、请求取消、API 调用、自动刷新节流、visibility 读取或 toast 逻辑，只把定时器和可见性刷新计划从副作用函数中抽出。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，9 个运行态控制器测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，167 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，226 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3396` 个模块完成转换，构建耗时 `28.54s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务未新增新路径，本轮涉及的未跟踪 helper/test 文件 `frontend/src/gatewayRuntimeController.ts` 和 `frontend/tests/gatewayRuntimeController.test.ts` 另用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 92 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 93: 网关运行态控制器聚合边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `useGatewayRuntimeController`，把 runtime loading state、四个 AbortController slot、数据加载计划、实时刷新计划、自动刷新定时器计划和 visibility 刷新计划聚合为单一 runtime controller；`GatewayView.vue` 改为通过该 controller 访问 state、slot 和计划 helper。
- 文件长度检查: `GatewayView.vue` 当前为 1266 行，`gatewayRuntimeController.ts` 为 182 行，`gatewayRuntimeController.test.ts` 为 248 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于缺少 `useGatewayRuntimeController` named export，确认测试先锁定新增聚合 controller 行为。
- 行为锁定: 新测试覆盖聚合 controller 仍能更新 loading/usageLoading、复用初始加载计划和自动刷新定时器计划，并为 `loadData` 与 `gatewayUsage` 创建互不干扰的 AbortController slot；替换 loadData controller 会 abort 旧 controller，不影响 usage controller。
- 副作用边界: 本任务未移动任何 API 请求、真实 timer、`document.visibilityState`、toast、mounted 判断、响应式写入或请求错误处理；仅把已存在的 runtime state、slot 和纯计划 helper 统一挂到 controller 门面。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，10 个运行态控制器测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，168 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，227 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3396` 个模块完成转换，构建耗时 `23.83s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务未新增新路径，本轮涉及的未跟踪 helper/test 文件 `frontend/src/gatewayRuntimeController.ts` 和 `frontend/tests/gatewayRuntimeController.test.ts` 另用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 93 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 94: 网关用量加载入口 guard 边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `buildGatewayUsageLoadPlan`，把 `loadGatewayUsage` 中非监控页清空 usage、时间范围缺失时是否提示、有效请求范围生成这组入口 guard 收口到 runtime helper；真实 `getGatewayUsage` 请求、toast 执行、AbortController slot、loading 状态和响应式写入仍保留在 `GatewayView.vue`。
- 文件长度检查: `GatewayView.vue` 当前为 1275 行，`gatewayRuntimeController.ts` 为 235 行，`gatewayRuntimeController.test.ts` 为 302 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于缺少 `buildGatewayUsageLoadPlan` named export，确认测试先锁定新增用量加载入口 guard 行为。
- 行为锁定: 新测试覆盖非监控页不请求且清空 usage，监控页时间范围缺失时不请求且仅非 silent 模式提示，监控页有效时间范围生成 `requestRange` 并允许进入请求流程。
- 副作用边界: 本任务未移动任何 API 请求、toast 文案、请求取消、mounted 判断、loading 设置或 usage 响应式写入；只把进入副作用前的可测试判定抽出。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，11 个运行态控制器测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，169 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，228 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3396` 个模块完成转换，构建耗时 `29.76s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 首次因 registry 连接 `ETIMEDOUT` 失败，立即重试通过，最终结果为 `found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务未新增新路径，本轮涉及的未跟踪 helper/test 文件 `frontend/src/gatewayRuntimeController.ts` 和 `frontend/tests/gatewayRuntimeController.test.ts` 另用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 94 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 95: 网关实时请求刷新入口计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `buildGatewayActiveRequestsRefreshPlan`，把 `refreshActiveRequests` 中监控页、页面可见性、刷新时间戳和 silent 参数组成启动计划的入口判定收口到 runtime helper；真实 `getGatewayActiveRequests` 请求、snapshot 应用、toast、AbortController slot、`document.visibilityState` 读取、`Date.now()` 读取和刷新状态收尾仍保留在 `GatewayView.vue`。
- 文件长度检查: `GatewayView.vue` 当前为 1280 行，`gatewayRuntimeController.ts` 为 275 行，`gatewayRuntimeController.test.ts` 为 342 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于缺少 `buildGatewayActiveRequestsRefreshPlan` named export，确认测试先锁定新增实时请求刷新入口计划行为。
- 行为锁定: 新测试覆盖非监控页不启动刷新、页面不可见时不启动刷新、监控页且页面可见时生成 `startOptions` 并透传 silent 模式。
- 副作用边界: 本任务未移动任何 API 请求、toast 文案、真实 timer、`document.visibilityState` 读取、`Date.now()` 读取、AbortController slot、refreshing 状态或 Vue 响应式写入；只把进入副作用前的可测试计划抽出。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，12 个运行态控制器测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，170 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，229 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3396` 个模块完成转换，构建耗时 `24.83s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务未新增新路径，本轮涉及的未跟踪 helper/test 文件 `frontend/src/gatewayRuntimeController.ts` 和 `frontend/tests/gatewayRuntimeController.test.ts` 另用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 95 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 96: 网关实时请求加载结果与错误计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayActiveRequestsLoadModel.ts`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `gatewayActiveRequestsLoadModel.ts`，把 `loadActiveRequests` 中成功后是否应用 snapshot、失败时是否展示错误和错误 fallback 文案这两组纯判定收口到 `buildGatewayActiveRequestsLoadResultPlan`、`buildGatewayActiveRequestsLoadErrorPlan`；`gatewayRuntimeController.ts` 重新导出并聚合这两个 helper，`GatewayView.vue` 仍只执行真实请求、toast、snapshot 响应式写入和 `applyActiveRequestSnapshot` 调用。
- 文件长度检查: `GatewayView.vue` 当前为 1287 行，`gatewayRuntimeController.ts` 为 287 行，`gatewayActiveRequestsLoadModel.ts` 为 46 行，`gatewayRuntimeController.test.ts` 为 419 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于缺少 `buildGatewayActiveRequestsLoadErrorPlan` named export，确认测试先锁定实时请求加载结果和错误计划行为。
- 重构红灯: 绿灯后把 helper 移到 `gatewayActiveRequestsLoadModel.ts` 时，目标测试首次失败于 Node ESM 不能解析无扩展名导入；已改为显式 `.ts` 导入并重跑目标测试、网关测试、全量前端辅助测试和 production build。
- 行为锁定: 新测试覆盖 mounted 且未 abort 时才应用 snapshot，未 mounted 或 abort 时不应用 snapshot；abort、未 mounted 或 silent 时不展示错误，非 silent 错误优先使用真实 Error message，否则使用 `网关实时请求加载失败` fallback。
- 副作用边界: 本任务未移动 `getGatewayActiveRequests`、toast 执行、AbortController slot、mounted 变量写入、`activeRequests.value` 写入或 `applyActiveRequestSnapshot`；只把进入这些副作用前的结果/错误判定抽出。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，14 个运行态控制器和 active request load model 测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，172 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，231 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3397` 个模块完成转换，构建耗时 `14.78s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务新增未跟踪文件 `frontend/src/gatewayActiveRequestsLoadModel.ts`，并继续涉及未跟踪 helper/test 文件 `frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`，三者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 96 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 97: 网关初始数据加载结果应用计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayInitialDataLoadModel.ts`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `gatewayInitialDataLoadModel.ts`，把 `loadData` 中 mounted/abort 后是否应用 Promise 结果、何时归一化 routes、是否应用 active request snapshot 的纯判定收口到 `buildGatewayInitialDataApplyPlan`；`gatewayRuntimeController.ts` 重新导出并聚合该 helper，`GatewayView.vue` 仍保留真实 API 请求、Promise 编排、toast、loading 状态、settings/logs/siteGroups/usage/activeRequests 响应式写入和 snapshot 副作用调用。
- 文件长度检查: `GatewayView.vue` 当前为 1293 行，`gatewayRuntimeController.ts` 为 290 行，`gatewayInitialDataLoadModel.ts` 为 38 行，`gatewayActiveRequestsLoadModel.ts` 为 46 行，`gatewayRuntimeController.test.ts` 为 480 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于缺少 `buildGatewayInitialDataApplyPlan` named export，确认测试先锁定初始数据加载结果应用计划行为。
- 行为锁定: 新测试覆盖未 mounted 或已 abort 时不应用结果且不执行 route normalize；mounted 且未 abort 时按原顺序归一化 routes，并透传是否应用 active request snapshot。
- 副作用边界: 本任务未移动 `getGatewayOverview`、`getGatewaySettings`、`getGatewayRoutes`、`getGatewayLogs`、`getSiteGroups`、`getGatewayUsage`、`getGatewayActiveRequests`、toast、AbortController slot、loading 状态或 Vue 响应式写入；只把进入这些副作用前的结果应用计划抽出。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，15 个运行态控制器和 gateway load model 测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，173 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，232 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3398` 个模块完成转换，构建耗时 `28.74s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务新增未跟踪文件 `frontend/src/gatewayInitialDataLoadModel.ts`，并继续涉及未跟踪 helper/test 文件 `frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`，三者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 97 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 98: 网关初始数据加载错误计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayInitialDataLoadModel.ts`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `buildGatewayInitialDataLoadErrorPlan`，把 `loadData` catch 分支中的 abort 判断、mounted 判断和错误 fallback 文案收口为纯计划；`gatewayRuntimeController.ts` 重新导出并聚合该 helper，`GatewayView.vue` 仍保留 toast 执行、真实 API 请求、Promise 编排、AbortController slot、loading 状态和 Vue 响应式写入。
- 文件长度检查: `GatewayView.vue` 当前为 1297 行，`gatewayRuntimeController.ts` 为 295 行，`gatewayInitialDataLoadModel.ts` 为 71 行，`gatewayActiveRequestsLoadModel.ts` 为 46 行，`gatewayRuntimeController.test.ts` 为 528 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于缺少 `buildGatewayInitialDataLoadErrorPlan` named export；自审补充空字符串错误信息特征后再次失败于 `''` 被误替换为 fallback，确认测试先锁定初始数据加载错误计划行为和旧 catch 的空字符串语义。
- 行为锁定: 新测试覆盖已 abort 时不提示、未 mounted 时不提示、mounted 且非 abort 的 `Error` 使用原错误信息、空字符串错误信息保持原样、非 `Error` 使用 fallback 文案 `网关数据加载失败`。
- 副作用边界: 本任务未移动 `getGatewayOverview`、`getGatewaySettings`、`getGatewayRoutes`、`getGatewayLogs`、`getSiteGroups`、`getGatewayUsage`、`getGatewayActiveRequests`、Promise 编排、toast 执行、AbortController slot、loading 状态或 Vue 响应式写入；只把进入 toast 副作用前的错误展示计划抽出。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，16 个运行态控制器和 gateway load model 测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，174 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，233 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3398` 个模块完成转换，构建耗时 `27.54s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务涉及未跟踪 helper/test 文件 `frontend/src/gatewayInitialDataLoadModel.ts`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`，三者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 98 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 99: 网关实时刷新结果应用计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRealtimeRefreshModel.ts`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `gatewayRealtimeRefreshModel.ts`，把 `refreshRealtimeData` Promise 结果返回后的 mounted/abort 判断、routes 归一化、是否更新优先级弹窗路由列表、是否继续刷新 active requests 收口到 `buildGatewayRealtimeRefreshApplyPlan`；同时将既有 `buildGatewayRealtimeRefreshPlan` 从 runtime controller 移入该 model 并保持 runtime 重新导出。
- 文件长度检查: `GatewayView.vue` 当前为 1305 行，`gatewayRuntimeController.ts` 为 290 行，`gatewayRealtimeRefreshModel.ts` 为 56 行，`gatewayInitialDataLoadModel.ts` 为 71 行，`gatewayActiveRequestsLoadModel.ts` 为 46 行，`gatewayRuntimeController.test.ts` 为 597 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于缺少 `buildGatewayRealtimeRefreshApplyPlan` named export，确认测试先锁定实时刷新结果应用计划行为。
- 行为锁定: 新测试覆盖未 mounted 或已 abort 时不应用结果且不执行 route normalize；mounted 且未 abort 时归一化 routes；优先级弹窗未打开时允许更新 priority routes，已打开时不覆盖；是否继续刷新 active requests 由实时刷新入口计划透传。
- 副作用边界: 本任务未移动 `getGatewayOverview`、`getGatewayRoutes`、`getGatewayLogs`、`refreshActiveRequests`、Promise 编排、toast/静默错误策略、AbortController slot、自动刷新定时器、loading 状态或 Vue 响应式写入；只把进入响应式写入前的结果应用计划抽出。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，17 个运行态控制器和 gateway realtime/load model 测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，175 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，234 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3399` 个模块完成转换，构建耗时 `25.73s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务新增未跟踪文件 `frontend/src/gatewayRealtimeRefreshModel.ts`，并继续涉及未跟踪 helper/test 文件 `frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`，三者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 99 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 100: 网关用量加载结果与错误计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayUsageLoadModel.ts`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `gatewayUsageLoadModel.ts`，把 `loadGatewayUsage` 的请求入口计划、请求结果 mounted/abort 应用判断、错误路径 abort/mounted/silent/fallback 文案收口到 `buildGatewayUsageLoadPlan`、`buildGatewayUsageLoadResultPlan`、`buildGatewayUsageLoadErrorPlan`；`gatewayRuntimeController.ts` 重新导出并聚合这三个 helper，`GatewayView.vue` 仍保留真实 API 请求、toast 执行、AbortController slot、usage loading 状态和 Vue 响应式写入。
- 文件长度检查: `GatewayView.vue` 当前为 1312 行，`gatewayRuntimeController.ts` 为 248 行，`gatewayUsageLoadModel.ts` 为 95 行，`gatewayRealtimeRefreshModel.ts` 为 56 行，`gatewayInitialDataLoadModel.ts` 为 71 行，`gatewayActiveRequestsLoadModel.ts` 为 46 行，`gatewayRuntimeController.test.ts` 为 684 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于缺少 `buildGatewayUsageLoadErrorPlan` named export，确认测试先锁定用量加载结果与错误计划行为。
- 行为锁定: 新测试覆盖 mounted 且未 abort 时应用 usage，未 mounted 或已 abort 时不应用；错误路径覆盖 abort、未 mounted、silent 时不提示，非 silent 的 `Error` 使用原错误信息，空字符串错误信息保持原样，非 `Error` 使用 fallback 文案 `网关消耗加载失败`。
- 副作用边界: 本任务未移动 `getGatewayUsage`、toast、AbortController slot、usage loading 状态、日期范围 state 或 Vue 响应式写入；只把进入这些副作用前的结果/错误展示计划抽出。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，19 个运行态控制器和 gateway usage/realtime/load model 测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，177 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，236 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3400` 个模块完成转换，构建耗时 `26.96s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务新增未跟踪文件 `frontend/src/gatewayUsageLoadModel.ts`，并继续涉及未跟踪 helper/test 文件 `frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`，三者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 100 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 101: 网关路由汇总刷新结果应用边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteStateModel.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayRouteStateModel.ts` 中新增 `buildGatewayRouteSummaryRefreshPlan` 与 `applyGatewaySiteSummaries`，把 `refreshRouteSummaries` 请求前的 site id 去重计划和请求后多条 site summary 顺序合并逻辑收口到纯模型；`GatewayView.vue` 仍保留真实 `refreshSiteSummaries` 请求、toast 错误提示和最终响应式写入。
- 文件长度检查: `GatewayView.vue` 当前为 1309 行，`gatewayRouteStateModel.ts` 为 94 行，`gatewayRouteStateModel.test.ts` 为 237 行，`gatewayRuntimeController.ts` 为 248 行，`gatewayRuntimeController.test.ts` 为 684 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于缺少 `applyGatewaySiteSummaries` named export，确认测试先锁定路由汇总刷新计划与批量应用行为。
- 行为锁定: 新测试覆盖空 routes 不刷新、重复 site id 按首次出现顺序去重；多条 site summary 按响应顺序合并，更新命中 site 的套餐/签到字段，保留未命中 route 引用且不修改输入 routes。
- 副作用边界: 本任务未移动 `refreshSiteSummaries`、toast、debounce 调度、余额探测、路由探测或 Vue 响应式写入；只把请求参数计划和多条 summary 合并计算抽出。
- `node --test frontend/tests/gatewayRouteStateModel.test.ts`: 通过，6 个路由状态模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，179 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，238 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3400` 个模块完成转换，构建耗时 `48.15s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务涉及未跟踪 helper/test 文件 `frontend/src/gatewayRouteStateModel.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 101 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 102: 网关路由探测批量开始计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayRouteProbeModel.ts` 中新增 `buildGatewayProbeBatchStartPlan`，把批量路由探测开始前的 route id 归一化和空批次提示收口到纯模型；`GatewayView.vue` 仍保留真实 `probeGatewayRoute` 循环、失败结果构造、进度推进、完成通知、toast 和 `routeProbeState` 响应式状态写入。
- 文件长度检查: `GatewayView.vue` 当前为 1310 行，`gatewayRouteProbeModel.ts` 为 123 行，`gatewayRouteProbeModel.test.ts` 为 183 行，`gatewayRouteStateModel.ts` 为 94 行，`gatewayRouteStateModel.test.ts` 为 237 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbeModel.test.ts` 首次失败于缺少 `buildGatewayProbeBatchStartPlan` named export，确认测试先锁定批量探测开始计划行为。
- 构建红灯: 首次 `npm run build` 失败于 `GatewayView.vue` 中 `startPlan.errorMessage` 被推断为 `string | null`，已通过为 `GatewayProbeBatchStartPlan` 增加显式判别联合类型修复，避免空批次错误文案类型泄漏到可开始分支。
- 行为锁定: 新测试覆盖重复、无效和 `NaN` route id 的过滤去重并保持首次出现顺序；空批次返回 `shouldStart: false` 和原有提示 `当前没有可探测的网关路由。`，有效批次返回归一化后的 route ids 且无错误文案。
- 副作用边界: 本任务未移动 `probeGatewayRoute`、`buildGatewayProbeFailureResult`、`nextGatewayProbeProgress`、`buildGatewayProbeNotice`、toast、循环顺序或 Vue 响应式写入；只把进入批量探测副作用前的开始计划抽出。
- `node --test frontend/tests/gatewayRouteProbeModel.test.ts`: 通过，9 个路由探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，180 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，239 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3400` 个模块完成转换，构建耗时 `34.03s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务涉及未跟踪 helper/test 文件 `frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 102 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 103: 网关余额批量更新开始计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayRouteBalanceProbeModel.ts` 中新增 `buildGatewayRouteBalanceBatchStartPlan`，把批量余额更新开始前的 route id 归一化、空批次提示和路由探测运行中提示收口到纯模型；`GatewayView.vue` 仍保留真实 `probeRouteBalances` 请求、`refreshRouteSummaries`、余额更新完成通知、toast 和 `routeBalanceProbeState` 响应式状态写入。
- 文件长度检查: `GatewayView.vue` 当前为 1311 行，`gatewayRouteBalanceProbeModel.ts` 为 145 行，`gatewayRouteBalanceProbeModel.test.ts` 为 201 行，`gatewayRouteProbeModel.ts` 为 123 行，`gatewayRouteProbeModel.test.ts` 为 183 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于缺少 `buildGatewayRouteBalanceBatchStartPlan` named export，确认测试先锁定批量余额更新开始计划行为。
- 行为锁定: 新测试覆盖重复、无效和 `NaN` route id 的过滤去重并保持首次出现顺序；空批次优先返回 `当前没有可更新余额的网关路由。`，有效批次且路由探测仍在运行时返回 `路由探测仍在运行，请稍后再更新余额。`，可开始分支返回归一化后的 route ids 且无错误文案。
- 副作用边界: 本任务未移动 `probeRouteBalances`、`refreshRouteSummaries`、`buildGatewayRouteBalanceNotice`、toast、进度推进、概览刷新或 Vue 响应式写入；只把进入批量余额更新副作用前的开始计划抽出。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，10 个余额探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，181 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，240 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3400` 个模块完成转换，构建耗时 `34.52s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务涉及未跟踪 helper/test 文件 `frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 103 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 104: 网关余额批量探测入口计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayRouteBalanceProbeModel.ts` 中新增 `buildGatewayRouteBalanceProbeRunPlan`，把 `probeRouteBalances` 入口处的 route id 归一化、空批次 `{ success: 0, failed: 0 }` 返回和可选批量进度初始对象收口到纯模型；`GatewayView.vue` 仍保留真实 `probeGatewayRouteBalance` 循环、成功失败计数、概览刷新、`notifyGatewayOverviewChanged`、toast 和 track/untrack 状态写入。
- 文件长度检查: `GatewayView.vue` 当前为 1311 行，`gatewayRouteBalanceProbeModel.ts` 为 178 行，`gatewayRouteBalanceProbeModel.test.ts` 为 225 行，`gatewayRouteProbeModel.ts` 为 123 行，`gatewayRouteProbeModel.test.ts` 为 183 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于缺少 `buildGatewayRouteBalanceProbeRunPlan` named export，确认测试先锁定余额探测运行入口计划行为。
- 行为锁定: 新测试覆盖有效 route id 去重后生成 `shouldRun: true` 计划，带进度时返回 `{ total, done: 0, success: 0, failed: 0 }`，不带进度时 progress 为 `null`；空批次返回 `shouldRun: false`、空 route ids、无进度和 `{ success: 0, failed: 0 }`。
- 副作用边界: 本任务未移动 `probeGatewayRouteBalance`、`applyRouteBalanceResult`、`getGatewayOverview`、`notifyGatewayOverviewChanged`、`buildGatewayRouteBalanceNotice`、toast、循环顺序或 Vue 响应式写入；只把进入批量余额探测副作用前的运行计划抽出。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，11 个余额探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，182 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，241 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3400` 个模块完成转换，构建耗时 `44.67s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务涉及未跟踪 helper/test 文件 `frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 104 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 105: 网关余额探测循环计数推进计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayRouteBalanceProbeModel.ts` 中新增 `buildGatewayRouteBalanceProbeStepPlan`，把 `probeRouteBalances` 循环内单条路由完成后的 success/failed 计数递增和可选进度推进收口到纯模型；`GatewayView.vue` 仍保留真实 `probeGatewayRouteBalance` 请求、`applyRouteBalanceResult`、异常捕获、概览刷新、`notifyGatewayOverviewChanged`、toast 和 track/untrack 状态写入。
- 文件长度检查: `GatewayView.vue` 当前为 1311 行，`gatewayRouteBalanceProbeModel.ts` 为 196 行，`gatewayRouteBalanceProbeModel.test.ts` 为 243 行，`gatewayRouteProbeModel.ts` 为 123 行，`gatewayRouteProbeModel.test.ts` 为 183 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于缺少 `buildGatewayRouteBalanceProbeStepPlan` named export，确认测试先锁定余额探测循环计数推进行为。
- 构建红灯: 首次 `npm run build` 失败于 `GatewayView.vue` 中 `nextGatewayRouteBalanceProgress` 未使用导入；已删除页面侧旧导入，进度推进统一由 `buildGatewayRouteBalanceProbeStepPlan` 内部完成。
- 行为锁定: 新测试覆盖成功步将 success 和 progress.success 各加 1，失败步将 failed 加 1 且无进度时保持 progress 为 `null`；同时确认输入 count 和 progress 不被原地修改。
- 副作用边界: 本任务未移动 `probeGatewayRouteBalance`、`applyRouteBalanceResult`、`getGatewayOverview`、`notifyGatewayOverviewChanged`、`buildGatewayRouteBalanceNotice`、toast、循环顺序或 Vue 响应式写入；只把单次循环后的计数与进度推进计划抽出。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，12 个余额探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，183 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，242 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3400` 个模块完成转换，构建耗时 `35.92s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务涉及未跟踪 helper/test 文件 `frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 105 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 106: 网关余额探测概览通知计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayRouteBalanceProbeModel.ts` 中新增 `buildGatewayRouteBalanceProbeCompletionPlan`，把 `probeRouteBalances` 循环完成后的概览通知条件和非静默 toast 文案计划收口到纯模型；`GatewayView.vue` 仍保留真实 `getGatewayOverview` 请求、`notifyGatewayOverviewChanged` 执行、toast 执行、余额请求循环、结果应用、异常捕获和 track/untrack 状态写入。
- 文件长度检查: `GatewayView.vue` 当前为 1316 行，`gatewayRouteBalanceProbeModel.ts` 为 214 行，`gatewayRouteBalanceProbeModel.test.ts` 为 274 行，`gatewayRouteProbeModel.ts` 为 123 行，`gatewayRouteProbeModel.test.ts` 为 183 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于缺少 `buildGatewayRouteBalanceProbeCompletionPlan` named export，确认测试先锁定余额探测完成计划口径。
- 行为锁定: 新测试覆盖 success 大于 0 时允许概览变更通知、success 为 0 时不通知、非静默时复用 `余额探测` 完成提示、silent 为 true 时不生成 toast notice。
- 副作用边界: 本任务未移动 `probeGatewayRouteBalance`、`applyRouteBalanceResult`、`getGatewayOverview`、`notifyGatewayOverviewChanged`、toast、loading、progress、定时器或 Vue 响应式写入；`GatewayView.vue` 仍在概览刷新成功后才执行通知，并在概览刷新尝试后执行非静默 toast。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，13 个余额探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，184 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，243 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3400` 个模块完成转换，构建耗时 `23.92s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务涉及未跟踪 helper/test 文件 `frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 106 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 107: 网关单路由余额探测完成计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`、`frontend/src/components.d.ts`。
- 边界评估: 原建议中的 `probeRouteBalances` 概览刷新失败 catch 当前只保留“不阻断当前操作”的空处理，非静默 toast 已在 catch 之后执行；单独抽出错误计划会形成无业务决策的空操作 helper。本任务改为同一余额探测域内的单路由完成计划收口。
- 改动: 在 `gatewayRouteBalanceProbeModel.ts` 中新增 `buildGatewaySingleRouteBalanceProbeCompletionPlan`，把 `handleProbeRouteBalance` 中成功时通知概览、失败时打开手动探测弹窗、以及 success/error toast 文案选择收口到纯模型；`GatewayView.vue` 仍保留真实 `probeGatewayRouteBalance` 请求、`applyRouteBalanceResult`、`refreshRouteSummaries`、`notifyGatewayOverviewChanged` 执行、toast 执行、手动弹窗打开和 track/untrack 状态写入。
- 文件长度检查: `GatewayView.vue` 当前为 1317 行，`gatewayRouteBalanceProbeModel.ts` 为 233 行，`gatewayRouteBalanceProbeModel.test.ts` 为 304 行，`gatewayRouteProbeModel.ts` 为 123 行，`gatewayRouteProbeModel.test.ts` 为 183 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于缺少 `buildGatewaySingleRouteBalanceProbeCompletionPlan` named export，确认测试先锁定单路由余额探测完成计划口径。
- 行为锁定: 新测试覆盖成功结果会要求通知概览、不打开手动弹窗并生成 success notice；失败结果会禁止通知概览、打开手动弹窗并把失败 message 作为弹窗消息，同时生成 error notice。
- 副作用边界: 本任务未移动 `probeGatewayRouteBalance`、`applyRouteBalanceResult`、`refreshRouteSummaries`、`notifyGatewayOverviewChanged`、toast、手动弹窗、loading、定时器或 Vue 响应式写入；只把完成后的条件和消息计划抽出。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，14 个余额探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，185 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，244 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3400` 个模块完成转换，构建耗时 `49.80s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务涉及未跟踪 helper/test 文件 `frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 107 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 108: 网关手动余额探测完成计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayRouteBalanceProbeModel.ts` 中新增 `buildManualGatewayRouteBalanceProbeCompletionPlan`，把 `submitManualRouteBalanceProbe` 中成功时通知概览、成功后关闭手动弹窗、失败时回写失败消息、以及 success/error toast 文案选择收口到纯模型；`GatewayView.vue` 仍保留真实 `probeGatewayRouteBalance` 请求、`applyRouteBalanceResult`、`refreshRouteSummaries`、`notifyGatewayOverviewChanged` 执行、toast 执行、手动弹窗状态写入和 track/untrack。
- 文件长度检查: `GatewayView.vue` 当前为 1318 行，`gatewayRouteBalanceProbeModel.ts` 为 269 行，`gatewayRouteBalanceProbeModel.test.ts` 为 334 行，`gatewayRouteProbeModel.ts` 为 123 行，`gatewayRouteProbeModel.test.ts` 为 183 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于缺少 `buildManualGatewayRouteBalanceProbeCompletionPlan` named export，确认测试先锁定手动余额探测完成计划口径。
- 行为锁定: 新测试覆盖成功结果会要求通知概览、生成 success notice、关闭弹窗且不写失败消息；失败结果会禁止通知概览、生成 error notice、不关闭弹窗并把失败 message 回写到弹窗状态。
- 副作用边界: 本任务未移动 `probeGatewayRouteBalance`、`applyRouteBalanceResult`、`refreshRouteSummaries`、`notifyGatewayOverviewChanged`、toast、loading、手动弹窗写入、定时器或 Vue 响应式写入；只把完成后的条件和消息计划抽出。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，15 个余额探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，186 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，245 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3400` 个模块完成转换，构建耗时 `27.81s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务涉及未跟踪 helper/test 文件 `frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 108 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 109: 网关单路由探测完成计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayRouteProbeModel.ts` 中新增 `buildGatewaySingleProbeCompletionPlan`，把 `handleProbeRoute` 中单路由探测结果对应的 success/error toast 文案计划收口到纯模型；`GatewayView.vue` 仍保留真实 `probeGatewayRoute` 请求、`applyProbeResult`、toast 执行和 track/untrack。
- 文件长度检查: `GatewayView.vue` 当前为 1319 行，`gatewayRouteProbeModel.ts` 为 136 行，`gatewayRouteProbeModel.test.ts` 为 207 行，`gatewayRouteBalanceProbeModel.ts` 为 269 行，`gatewayRouteBalanceProbeModel.test.ts` 为 334 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbeModel.test.ts` 首次失败于缺少 `buildGatewaySingleProbeCompletionPlan` named export，确认测试先锁定单路由探测完成计划口径。
- 行为锁定: 新测试覆盖成功结果生成 success notice，失败结果生成 error notice；文案继续复用既有 `buildGatewaySingleProbeNotice`。
- 副作用边界: 本任务未移动 `probeGatewayRoute`、`applyProbeResult`、toast、loading、定时器或 Vue 响应式写入；只把完成后的 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteProbeModel.test.ts`: 通过，10 个路由探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，187 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，246 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3400` 个模块完成转换，构建耗时 `39.06s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务涉及未跟踪 helper/test 文件 `frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 109 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 110: 网关批量路由探测循环步骤计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayRouteProbeModel.ts` 中新增 `buildGatewayProbeStepPlan`，把 `handleProbeAll` 循环内基于单条探测结果的成功判定和 `failedResults` 收集收口到纯模型；`GatewayView.vue` 仍保留真实 `probeGatewayRoute` 请求、`buildGatewayProbeFailureResult` 失败结果构造、`applyProbeResult`、`routeProbeState.finishBatchRoute` 进度推进和 untrack、批量完成 toast、`finishBatch`。
- 文件长度检查: `GatewayView.vue` 当前为 1325 行，`gatewayRouteProbeModel.ts` 为 154 行，`gatewayRouteProbeModel.test.ts` 为 249 行，`gatewayRouteBalanceProbeModel.ts` 为 269 行，`gatewayRouteBalanceProbeModel.test.ts` 为 334 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbeModel.test.ts` 首次失败于缺少 `buildGatewayProbeStepPlan` named export，确认测试先锁定批量探测步骤计划口径。
- 行为锁定: 新测试覆盖成功结果保持原 `failedResults` 引用并返回 `routeSucceeded: true`；失败结果返回追加后的新失败列表并返回 `routeSucceeded: false`；原失败列表不被突变。进度对象仍由 `nextGatewayProbeProgress` 和 route probe controller 既有测试覆盖。
- 副作用边界: 本任务未移动 `probeGatewayRoute`、失败结果构造、`applyProbeResult`、toast、loading、定时器、Vue 响应式写入或 `finishBatchRoute` 的进度推进；只把循环内结果判断和失败列表收集抽出。
- `node --test frontend/tests/gatewayRouteProbeModel.test.ts`: 通过，11 个路由探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，188 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，247 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3400` 个模块完成转换，构建耗时 `29.16s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务涉及未跟踪 helper/test 文件 `frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 110 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 111: 网关批量路由探测完成通知计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayRouteProbeModel.ts` 中新增 `buildGatewayProbeCompletionPlan`，把 `handleProbeAll` 循环结束后的批量探测完成 notice 计划收口到纯模型；`GatewayView.vue` 仍保留 `probeAllProgress` 成功计数读取、toast 执行、真实 `probeGatewayRoute` 请求、失败结果构造、结果应用、`finishBatchRoute` 和 `finishBatch`。
- 文件长度检查: `GatewayView.vue` 当前为 1325 行，`gatewayRouteProbeModel.ts` 为 167 行，`gatewayRouteProbeModel.test.ts` 为 271 行，`gatewayRouteBalanceProbeModel.ts` 为 269 行，`gatewayRouteBalanceProbeModel.test.ts` 为 334 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbeModel.test.ts` 首次失败于缺少 `buildGatewayProbeCompletionPlan` named export，确认测试先锁定批量探测完成计划口径。
- 行为锁定: 新测试覆盖无失败时生成 success notice，存在失败时生成 error notice 且复用前两条失败样例；文案继续复用既有 `buildGatewayProbeNotice`。
- 副作用边界: 本任务未移动 `probeGatewayRoute`、失败结果构造、`applyProbeResult`、`probeAllProgress` 读取、toast 执行、loading、定时器、Vue 响应式写入或 `finishBatchRoute`/`finishBatch`；只把完成后的 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteProbeModel.test.ts`: 通过，12 个路由探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，189 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，248 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3400` 个模块完成转换，构建耗时 `31.64s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务涉及未跟踪 helper/test 文件 `frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 111 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 112: 网关单路由探测失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayRouteProbeModel.ts` 中新增 `buildGatewaySingleProbeErrorPlan`，把 `handleProbeRoute` 的 catch 分支错误 toast 计划收口到纯模型；`GatewayView.vue` 仍保留真实 `probeGatewayRoute` 请求、`applyProbeResult`、成功 completion plan、toast 执行、`routeProbeState.trackRoute` 和 `routeProbeState.untrackRoute`。
- 文件长度检查: `GatewayView.vue` 当前为 1327 行，`gatewayRouteProbeModel.ts` 为 183 行，`gatewayRouteProbeModel.test.ts` 为 287 行，`gatewayRouteBalanceProbeModel.ts` 为 269 行，`gatewayRouteBalanceProbeModel.test.ts` 为 334 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbeModel.test.ts` 首次失败于缺少 `buildGatewaySingleProbeErrorPlan` named export，确认测试先锁定单路由探测失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例使用原始 `message`，非 `Error` 抛出值沿用既有默认文案 `路由探测失败`。
- 副作用边界: 本任务未移动 `probeGatewayRoute`、`applyProbeResult`、成功 notice 计划、toast 执行、loading、定时器、Vue 响应式写入或 track/untrack；只把失败路径的 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteProbeModel.test.ts`: 通过，13 个路由探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，190 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，249 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3400` 个模块完成转换，构建耗时 `38.59s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务涉及未跟踪 helper/test 文件 `frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 112 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 113: 网关单路由余额探测失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayRouteBalanceProbeModel.ts` 中新增 `buildGatewaySingleRouteBalanceProbeErrorPlan`，把 `handleProbeRouteBalance` 的 catch 分支错误 toast 计划收口到纯模型；`GatewayView.vue` 仍保留真实 `probeGatewayRouteBalance` 请求、`applyRouteBalanceResult`、`refreshRouteSummaries`、成功/失败 completion plan、`notifyGatewayOverviewChanged`、toast 执行、手动重试弹窗和 track/untrack。
- 文件长度检查: `GatewayView.vue` 当前为 1329 行，`gatewayRouteBalanceProbeModel.ts` 为 285 行，`gatewayRouteBalanceProbeModel.test.ts` 为 350 行，`gatewayRouteProbeModel.ts` 为 183 行，`gatewayRouteProbeModel.test.ts` 为 287 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于缺少 `buildGatewaySingleRouteBalanceProbeErrorPlan` named export，确认测试先锁定单路由余额探测失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例使用原始 `message`，非 `Error` 抛出值沿用既有默认文案 `余额读取失败`。
- 副作用边界: 本任务未移动 `probeGatewayRouteBalance`、`applyRouteBalanceResult`、`refreshRouteSummaries`、成功/失败 completion plan、toast 执行、手动重试弹窗、loading、定时器、Vue 响应式写入或 track/untrack；只把失败路径的 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，16 个余额探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，191 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，250 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3400` 个模块完成转换，构建耗时 `31.74s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务涉及未跟踪 helper/test 文件 `frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 113 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 114: 网关手动余额探测失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayRouteBalanceProbeModel.ts` 中新增 `buildManualGatewayRouteBalanceProbeErrorPlan`，把 `submitManualRouteBalanceProbe` 的 catch 分支错误 toast 和弹窗失败消息计划收口到纯模型；`GatewayView.vue` 仍保留 URL 校验、真实 `probeGatewayRouteBalance` 请求、`applyRouteBalanceResult`、`refreshRouteSummaries`、completion plan、`notifyGatewayOverviewChanged`、toast 执行、弹窗关闭/失败消息写入和 track/untrack。
- 文件长度检查: `GatewayView.vue` 当前为 1330 行，`gatewayRouteBalanceProbeModel.ts` 为 304 行，`gatewayRouteBalanceProbeModel.test.ts` 为 368 行，`gatewayRouteProbeModel.ts` 为 183 行，`gatewayRouteProbeModel.test.ts` 为 287 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于缺少 `buildManualGatewayRouteBalanceProbeErrorPlan` named export，确认测试先锁定手动余额探测失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例使用原始 `message`，非 `Error` 抛出值沿用既有默认文案 `余额读取失败`；返回值同时包含 error notice 和 `failureMessage`。
- 副作用边界: 本任务未移动 `probeGatewayRouteBalance`、`applyRouteBalanceResult`、`refreshRouteSummaries`、completion plan、`notifyGatewayOverviewChanged`、toast 执行、弹窗关闭/失败消息写入、loading、定时器、Vue 响应式写入或 track/untrack；只把失败路径的 notice 与 failure message 计划抽出。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，17 个余额探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，192 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，251 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3400` 个模块完成转换，构建耗时 `29.38s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务涉及未跟踪 helper/test 文件 `frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 114 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 115: 网关路由诊断失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteDiagnosisModel.ts`、`frontend/tests/gatewayRouteDiagnosisModel.test.ts`、`frontend/src/gatewayRouteDiagnosisController.ts`、`frontend/tests/gatewayRouteDiagnosisController.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `gatewayRouteDiagnosisModel.ts`，把 `openRouteDiagnosis` 的 catch 分支错误 toast 计划收口到 `buildGatewayRouteDiagnosisErrorPlan`；`GatewayView.vue` 仍保留抽屉打开、loading 写入、真实 `diagnoseGatewayRoute` 请求、诊断结果写入、toast 执行和 loading 复位。
- 文件长度检查: `GatewayView.vue` 当前为 1332 行，`gatewayRouteDiagnosisModel.ts` 为 15 行，`gatewayRouteDiagnosisModel.test.ts` 为 20 行，`gatewayRouteDiagnosisController.ts` 为 33 行，`gatewayRouteDiagnosisController.test.ts` 为 82 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteDiagnosisModel.test.ts` 首次失败于找不到 `frontend/src/gatewayRouteDiagnosisModel.ts`，确认测试先锁定路由诊断失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例使用原始 `message`，非 `Error` 抛出值沿用既有默认文案 `路由诊断失败`；返回值只包含 error notice 计划，不引入隐藏回退或模拟成功路径。
- 副作用边界: 本任务未移动 `diagnoseGatewayRoute`、抽屉打开、loading、诊断结果写入、toast 执行、定时器或 Vue 响应式写入；只把失败路径的 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteDiagnosisModel.test.ts`: 通过，1 个路由诊断模型测试通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，193 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，252 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3401` 个模块完成转换，构建耗时 `3.66s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 首次因 registry TLS 连接中断失败，重跑通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务新增未跟踪 helper/test 文件 `frontend/src/gatewayRouteDiagnosisModel.ts`、`frontend/tests/gatewayRouteDiagnosisModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 115 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 116: 网关路由日志失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteLogsModel.ts`、`frontend/tests/gatewayRouteLogsModel.test.ts`、`frontend/src/gatewayRouteLogsController.ts`、`frontend/tests/gatewayRouteLogsController.test.ts`、`frontend/src/gatewayRouteDiagnosisModel.ts`、`frontend/tests/gatewayRouteDiagnosisModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `gatewayRouteLogsModel.ts`，把 `openRouteLogs` 的 catch 分支错误 toast 和清空日志决策收口到 `buildGatewayRouteLogsErrorPlan`；`GatewayView.vue` 仍保留抽屉打开、loading 写入、真实 `getGatewayRouteLogs` 请求、日志结果写入、toast 执行、日志清空执行和 loading 复位。
- 文件长度检查: `GatewayView.vue` 当前为 1336 行，`gatewayRouteLogsModel.ts` 为 17 行，`gatewayRouteLogsModel.test.ts` 为 22 行，`gatewayRouteLogsController.ts` 为 43 行，`gatewayRouteLogsController.test.ts` 为 100 行，`gatewayRouteDiagnosisModel.ts` 为 15 行，`gatewayRouteDiagnosisModel.test.ts` 为 20 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteLogsModel.test.ts` 首次失败于找不到 `frontend/src/gatewayRouteLogsModel.ts`，确认测试先锁定路由日志失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例使用原始 `message`，非 `Error` 抛出值沿用既有默认文案 `路由请求历史加载失败`；返回值包含 error notice 与 `shouldClearLogs: true`，不引入隐藏回退或模拟成功路径。
- 副作用边界: 本任务未移动 `getGatewayRouteLogs`、抽屉打开、loading、日志结果写入、toast 执行、日志清空执行、定时器或 Vue 响应式写入；只把失败路径的 notice 与清空决策计划抽出。
- `node --test frontend/tests/gatewayRouteLogsModel.test.ts`: 通过，1 个路由日志模型测试通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，194 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，253 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `30.07s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 首次因 registry TLS 连接中断失败，重跑通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务新增未跟踪 helper/test 文件 `frontend/src/gatewayRouteLogsModel.ts`、`frontend/tests/gatewayRouteLogsModel.test.ts`，两者均用 `git diff --no-index --check /dev/null <file>` 检查，均无空白输出。
- 运行态说明: 任务 116 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 117: 网关请求地址复制失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAccessModel.ts`、`frontend/tests/gatewayAccessModel.test.ts`、`frontend/src/gatewayRouteLogsModel.ts`、`frontend/tests/gatewayRouteLogsModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayAccessModel.ts` 中新增 `buildGatewayRequestUrlCopyErrorPlan`，把 `copyGatewayRequestUrl` 的失败 toast 计划收口到纯模型；`GatewayView.vue` 仍保留真实 `navigator.clipboard.writeText`、成功 toast、失败 toast 执行和 `gatewayRequestUrl` computed 读取。
- 文件长度检查: `GatewayView.vue` 当前为 1338 行，`gatewayAccessModel.ts` 为 49 行，`gatewayAccessModel.test.ts` 为 64 行，`gatewayRouteLogsModel.ts` 为 17 行，`gatewayRouteLogsModel.test.ts` 为 22 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayAccessModel.test.ts` 首次失败于缺少 `buildGatewayRequestUrlCopyErrorPlan` named export，确认测试先锁定网关请求地址复制失败计划口径。
- 行为锁定: 新测试覆盖失败 notice 使用既有默认文案 `复制失败，请手动复制。`；本任务只处理 `copyGatewayRequestUrl`，不改变路由请求 URL 复制或网关 API Key 复制路径。
- 副作用边界: 本任务未移动 `navigator.clipboard.writeText`、`gatewayRequestUrl` computed、成功 toast、失败 toast 执行、定时器或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayAccessModel.test.ts`: 通过，6 个网关访问模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，195 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，254 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `26.68s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务未新增未跟踪文件，不需要新增 no-index 空白检查。
- 运行态说明: 任务 117 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 118: 网关 API Key 复制失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAccessModel.ts`、`frontend/tests/gatewayAccessModel.test.ts`、`frontend/src/gatewayRouteLogsModel.ts`、`frontend/tests/gatewayRouteLogsModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayAccessModel.ts` 中新增 `buildGatewayApiKeyCopyErrorPlan`，把 `copyGatewayApiKey` 的 clipboard 失败 toast 计划收口到纯模型；`GatewayView.vue` 仍保留空值校验、`normalizeGatewayApiKeyCopyValue`、真实 `navigator.clipboard.writeText`、成功 toast、失败 toast 执行和 settings form 读取。
- 文件长度检查: `GatewayView.vue` 当前为 1340 行，`gatewayAccessModel.ts` 为 58 行，`gatewayAccessModel.test.ts` 为 74 行，`gatewayRouteLogsModel.ts` 为 17 行，`gatewayRouteLogsModel.test.ts` 为 22 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayAccessModel.test.ts` 首次失败于缺少 `buildGatewayApiKeyCopyErrorPlan` named export，确认测试先锁定网关 API Key 复制失败计划口径。
- 行为锁定: 新测试覆盖失败 notice 使用既有默认文案 `复制失败，请手动复制。`；本任务只处理 `copyGatewayApiKey` 的 clipboard 失败分支，不改变空值错误文案 `后端未配置 GATEWAY_API_KEY。`。
- 副作用边界: 本任务未移动 `navigator.clipboard.writeText`、`normalizeGatewayApiKeyCopyValue`、settings form 读取、空值 toast、成功 toast、失败 toast 执行、定时器或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayAccessModel.test.ts`: 通过，7 个网关访问模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，196 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，255 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `27.55s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务未新增未跟踪文件，不需要新增 no-index 空白检查。
- 运行态说明: 任务 118 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 119: 网关路由请求 URL 复制失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayActivityDisplayModel.ts`、`frontend/tests/gatewayRouteDisplayModel.test.ts`、`frontend/src/gatewayAccessModel.ts`、`frontend/tests/gatewayAccessModel.test.ts`、`frontend/src/components.d.ts`。
- 改动: 在 `gatewayActivityDisplayModel.ts` 中新增 `buildGatewayActivityCopyErrorPlan`，把 `copyGatewayActivityUrl` 的 clipboard 失败 toast 计划收口到纯模型；`GatewayView.vue` 仍保留 `normalizeGatewayActivityCopyUrl`、空值提前返回、真实 `navigator.clipboard.writeText`、成功 toast 和失败 toast 执行。
- 文件长度检查: `GatewayView.vue` 当前为 1342 行，`gatewayActivityDisplayModel.ts` 为 120 行，`gatewayRouteDisplayModel.test.ts` 为 167 行，`gatewayAccessModel.ts` 为 58 行，`gatewayAccessModel.test.ts` 为 74 行，`components.d.ts` 为 122 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteDisplayModel.test.ts` 首次失败于缺少 `buildGatewayActivityCopyErrorPlan` named export，确认测试先锁定路由请求 URL 复制失败计划口径。
- 行为锁定: 新测试覆盖失败 notice 使用既有默认文案 `复制失败，请手动复制。`；本任务只处理 `copyGatewayActivityUrl` 的 clipboard 失败分支，不改变 URL 归一化和空值提前返回行为。
- 副作用边界: 本任务未移动 `navigator.clipboard.writeText`、`normalizeGatewayActivityCopyUrl`、空值提前返回、成功 toast、失败 toast 执行、定时器或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteDisplayModel.test.ts`: 通过，6 个网关路由展示模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，197 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，256 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `28.02s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过；本任务未新增未跟踪文件，不需要新增 no-index 空白检查。
- 运行态说明: 任务 119 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 120: 网关策略保存失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewaySettingsModel.ts`、`frontend/tests/gatewaySettingsModel.test.ts`。
- 改动: 在 `gatewaySettingsModel.ts` 中新增 `buildGatewaySettingsSaveErrorPlan`，把 `saveSettings` 的失败 toast 消息计划收口到纯模型；`GatewayView.vue` 仍保留 `settingsDialog.setLoading`、真实 `updateGatewaySettings(settingsForm)`、settings form 写回、成功关闭、成功 toast、`loadData` 和失败 toast 执行。
- 文件长度检查: `GatewayView.vue` 当前为 1346 行，`gatewaySettingsModel.ts` 为 65 行，`gatewaySettingsModel.test.ts` 为 119 行。
- TDD 红灯: `node --test frontend/tests/gatewaySettingsModel.test.ts` 首次失败于缺少 `buildGatewaySettingsSaveErrorPlan` named export，确认测试先锁定网关策略保存失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用既有默认文案 `保存失败`；本任务只处理 `saveSettings` 的失败消息计划，不改变保存请求、加载状态、成功路径和数据刷新。
- 副作用边界: 本任务未移动 `updateGatewaySettings`、`settingsDialog` 状态写入、成功关闭、成功 toast、`loadData`、失败 toast 执行、定时器或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewaySettingsModel.test.ts`: 通过，5 个网关设置模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，198 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，257 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `28.58s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewaySettingsModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewaySettingsModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 120 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 121: 网关路由模型保存失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteConfigModel.ts`、`frontend/tests/gatewayRouteConfigModel.test.ts`。
- 改动: 在 `gatewayRouteConfigModel.ts` 中新增 `buildGatewayRouteModelsSaveErrorPlan`，把 `saveRouteModelsDialog` 的失败 toast 消息计划收口到纯模型；`GatewayView.vue` 仍保留 route models dialog 读取、真实 `updateGatewayRouteType`、两份路由列表替换、弹窗成功关闭、成功 toast 和失败 toast 执行。
- 文件长度检查: `GatewayView.vue` 当前为 1348 行，`gatewayRouteConfigModel.ts` 为 83 行，`gatewayRouteConfigModel.test.ts` 为 139 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConfigModel.test.ts` 首次失败于缺少 `buildGatewayRouteModelsSaveErrorPlan` named export，确认测试先锁定路由模型保存失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用既有默认文案 `保存失败`；本任务只处理 `saveRouteModelsDialog` 的失败消息计划，不改变保存请求、路由列表替换、弹窗关闭和成功路径。
- 副作用边界: 本任务未移动 `updateGatewayRouteType`、`buildGatewayRouteModelsPayload`、`replaceGatewayRoute`、`routeModelsDialog` 状态写入、成功 toast、失败 toast 执行、定时器或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteConfigModel.test.ts`: 通过，5 个网关路由配置模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，199 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，258 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `31.73s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteConfigModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteConfigModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 121 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 122: 网关路由类型切换失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteConfigModel.ts`、`frontend/tests/gatewayRouteConfigModel.test.ts`。
- 改动: 在 `gatewayRouteConfigModel.ts` 中新增 `buildGatewayRouteTypeChangeErrorPlan`，把 `handleRouteTypeChange` 的失败 toast 消息计划收口到纯模型；`GatewayView.vue` 仍保留乐观更新、真实 `updateGatewayRouteType`、成功时两份路由列表替换、失败回滚、成功 toast 和失败 toast 执行。
- 文件长度检查: `GatewayView.vue` 当前为 1350 行，`gatewayRouteConfigModel.ts` 为 92 行，`gatewayRouteConfigModel.test.ts` 为 155 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConfigModel.test.ts` 首次失败于缺少 `buildGatewayRouteTypeChangeErrorPlan` named export，确认测试先锁定路由类型切换失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用既有默认文案 `类型切换失败`；本任务只处理 `handleRouteTypeChange` 的失败消息计划，不改变保存请求、乐观更新、失败回滚和成功路径。
- 副作用边界: 本任务未移动 `applyGatewayRouteTypeDraft`、`updateGatewayRouteType`、`buildGatewayRouteTypePayload`、`replaceGatewayRoute`、`priorityRoutes` 同步、成功 toast、失败 toast 执行、定时器或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteConfigModel.test.ts`: 通过，6 个网关路由配置模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，200 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，259 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `35.37s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteConfigModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteConfigModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 122 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 123: 网关路由请求格式切换失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteConfigModel.ts`、`frontend/tests/gatewayRouteConfigModel.test.ts`。
- 改动: 在 `gatewayRouteConfigModel.ts` 中新增 `buildGatewayRoutePathChangeErrorPlan`，把 `handleRoutePathChange` 的失败 toast 消息计划收口到纯模型；`GatewayView.vue` 仍保留路径乐观更新、真实 `updateGatewayRouteType`、成功时两份路由列表替换、失败回滚、成功 toast 和失败 toast 执行。
- 文件长度检查: `GatewayView.vue` 当前为 1352 行，`gatewayRouteConfigModel.ts` 为 101 行，`gatewayRouteConfigModel.test.ts` 为 171 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConfigModel.test.ts` 首次失败于缺少 `buildGatewayRoutePathChangeErrorPlan` named export，确认测试先锁定路由请求格式切换失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用既有默认文案 `请求格式切换失败`；本任务只处理 `handleRoutePathChange` 的失败消息计划，不改变保存请求、路径乐观更新、失败回滚和成功路径。
- 副作用边界: 本任务未移动 `applyGatewayRoutePathDraft`、`updateGatewayRouteType`、`buildGatewayRoutePathPayload`、`replaceGatewayRoute`、`priorityRoutes` 同步、成功 toast、失败 toast 执行、定时器或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteConfigModel.test.ts`: 通过，7 个网关路由配置模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，201 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，260 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `42.86s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteConfigModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteConfigModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 123 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 124: 网关路由启用状态切换失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteStateModel.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`。
- 改动: 在 `gatewayRouteStateModel.ts` 中新增 `buildGatewayRouteToggleErrorPlan`，把 `handleToggle` 的失败 toast 消息计划收口到纯模型；`GatewayView.vue` 仍保留真实 `toggleGatewayRoute`、成功 toast、`loadData` 和失败 toast 执行。
- 文件长度检查: `GatewayView.vue` 当前为 1354 行，`gatewayRouteStateModel.ts` 为 103 行，`gatewayRouteStateModel.test.ts` 为 254 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于缺少 `buildGatewayRouteToggleErrorPlan` named export，确认测试先锁定路由启用状态切换失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用既有默认文案 `切换失败`；本任务只处理 `handleToggle` 的失败消息计划，不改变真实启停请求、成功文案、刷新和 toast 执行。
- 副作用边界: 本任务未移动 `toggleGatewayRoute`、成功 toast、`loadData`、失败 toast 执行、定时器或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteStateModel.test.ts`: 通过，7 个网关路由状态模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，202 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，261 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `27.16s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteStateModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteStateModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 124 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 125: 网关同步失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteStateModel.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`。
- 改动: 在 `gatewayRouteStateModel.ts` 中新增 `buildGatewaySyncErrorPlan`，把 `handleSync` 的失败 toast 消息计划收口到纯模型；`GatewayView.vue` 仍保留真实 `syncGatewayRoutes`、`loadData`、静默 `probeRouteBalances`、成功 toast、失败 toast 执行和 `loading` 复位。
- 文件长度检查: `GatewayView.vue` 当前为 1356 行，`gatewayRouteStateModel.ts` 为 112 行，`gatewayRouteStateModel.test.ts` 为 271 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于缺少 `buildGatewaySyncErrorPlan` named export，确认测试先锁定网关同步失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用既有默认文案 `同步失败`；本任务只处理 `handleSync` 的失败消息计划，不改变真实同步请求、数据刷新、静默余额探测、成功文案、加载态复位和 toast 执行。
- 副作用边界: 本任务未移动 `syncGatewayRoutes`、`loadData`、`probeRouteBalances`、成功 toast、失败 toast 执行、`loading` 写入、定时器或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteStateModel.test.ts`: 通过，8 个网关路由状态模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，203 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，262 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `33.63s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteStateModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteStateModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 125 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 126: 网关禁用全部失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteStateModel.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`。
- 改动: 在 `gatewayRouteStateModel.ts` 中新增 `buildGatewayDisableAllRoutesErrorPlan`，把 `handleDisableAllRoutes` 的失败 toast 消息计划收口到纯模型；`GatewayView.vue` 仍保留真实 `window.confirm`、`disableAllGatewayRoutes`、成功 toast、`loadData` 和失败 toast 执行。
- 文件长度检查: `GatewayView.vue` 当前为 1358 行，`gatewayRouteStateModel.ts` 为 121 行，`gatewayRouteStateModel.test.ts` 为 288 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于缺少 `buildGatewayDisableAllRoutesErrorPlan` named export，确认测试先锁定网关禁用全部失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用既有默认文案 `禁用全部失败`；本任务只处理 `handleDisableAllRoutes` 的失败消息计划，不改变确认弹窗、真实禁用请求、成功文案、数据刷新和 toast 执行。
- 副作用边界: 本任务未移动 `window.confirm`、`disableAllGatewayRoutes`、成功 toast、`loadData`、失败 toast 执行、定时器或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteStateModel.test.ts`: 通过，9 个网关路由状态模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，204 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，263 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `29.55s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteStateModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteStateModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 126 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 127: 网关仅启用单路由失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteStateModel.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`。
- 改动: 在 `gatewayRouteStateModel.ts` 中新增 `buildGatewayEnableOnlyRouteErrorPlan`，把 `handleEnableOnlyRoute` 的失败 toast 消息计划收口到纯模型；`GatewayView.vue` 仍保留真实 `window.confirm`、`enableOnlyGatewayRoute`、成功 toast、`loadData` 和失败 toast 执行。
- 文件长度检查: `GatewayView.vue` 当前为 1360 行，`gatewayRouteStateModel.ts` 为 130 行，`gatewayRouteStateModel.test.ts` 为 305 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于缺少 `buildGatewayEnableOnlyRouteErrorPlan` named export，确认测试先锁定网关仅启用单路由失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用既有默认文案 `禁用其他失败`；本任务只处理 `handleEnableOnlyRoute` 的失败消息计划，不改变确认弹窗、真实仅启用请求、成功文案、数据刷新和 toast 执行。
- 副作用边界: 本任务未移动 `window.confirm`、`enableOnlyGatewayRoute`、成功 toast、`loadData`、失败 toast 执行、定时器或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteStateModel.test.ts`: 通过，10 个网关路由状态模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，205 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，264 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `26.80s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteStateModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteStateModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 127 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 128: 网关重置熔断失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteStateModel.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`。
- 改动: 在 `gatewayRouteStateModel.ts` 中新增 `buildGatewayResetCircuitErrorPlan`，把 `handleResetCircuit` 的失败 toast 消息计划收口到纯模型；`GatewayView.vue` 仍保留真实 `resetGatewayRouteCircuit`、成功 toast、`loadData` 和失败 toast 执行。
- 文件长度检查: `GatewayView.vue` 当前为 1362 行，`gatewayRouteStateModel.ts` 为 139 行，`gatewayRouteStateModel.test.ts` 为 322 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于缺少 `buildGatewayResetCircuitErrorPlan` named export，确认测试先锁定网关重置熔断失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用既有默认文案 `重置失败`；本任务只处理 `handleResetCircuit` 的失败消息计划，不改变真实重置请求、成功文案、数据刷新和 toast 执行。
- 副作用边界: 本任务未移动 `resetGatewayRouteCircuit`、成功 toast、`loadData`、失败 toast 执行、定时器或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteStateModel.test.ts`: 通过，11 个网关路由状态模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，206 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，265 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.33s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteStateModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteStateModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 128 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 129: 网关路由摘要刷新失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteStateModel.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`。
- 改动: 在 `gatewayRouteStateModel.ts` 中新增 `buildGatewayRouteSummaryRefreshErrorPlan`，把 `refreshRouteSummaries` 的失败 toast 消息计划收口到纯模型；`GatewayView.vue` 仍保留真实 `buildGatewayRouteSummaryRefreshPlan`、`refreshSiteSummaries`、`applyGatewaySiteSummaries`、路由列表写入和失败 toast 执行。
- 文件长度检查: `GatewayView.vue` 当前为 1364 行，`gatewayRouteStateModel.ts` 为 148 行，`gatewayRouteStateModel.test.ts` 为 339 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于缺少 `buildGatewayRouteSummaryRefreshErrorPlan` named export，确认测试先锁定网关路由摘要刷新失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用既有默认文案 `路由摘要刷新失败`；本任务只处理 `refreshRouteSummaries` 的失败消息计划，不改变摘要刷新条件、真实摘要请求、摘要合并和路由列表写入。
- 副作用边界: 本任务未移动 `buildGatewayRouteSummaryRefreshPlan`、`refreshSiteSummaries`、`applyGatewaySiteSummaries`、`routes.value` 写入、失败 toast 执行、定时器或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteStateModel.test.ts`: 通过，12 个网关路由状态模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，207 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，266 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.53s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteStateModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteStateModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 129 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 130: 网关批量余额更新失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`。
- 改动: 在 `gatewayRouteBalanceProbeModel.ts` 中新增 `buildGatewayRouteBalanceBatchUpdateErrorPlan`，把 `handleUpdateAllBalances` 的失败 toast 消息计划收口到纯模型；`GatewayView.vue` 仍保留真实 `buildGatewayRouteBalanceBatchStartPlan`、`probeRouteBalances`、`refreshRouteSummaries`、成功 notice、batch 开始/结束和失败 toast 执行。
- 文件长度检查: `GatewayView.vue` 当前为 1366 行，`gatewayRouteBalanceProbeModel.ts` 为 320 行，`gatewayRouteBalanceProbeModel.test.ts` 为 385 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于缺少 `buildGatewayRouteBalanceBatchUpdateErrorPlan` named export，确认测试先锁定网关批量余额更新失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用既有默认文案 `余额更新失败`；本任务只处理 `handleUpdateAllBalances` 的失败消息计划，不改变批量开始条件、真实余额请求、摘要刷新、成功文案和 batch 结束。
- 副作用边界: 本任务未移动 `buildGatewayRouteBalanceBatchStartPlan`、`routeBalanceProbeState.startBatch`、`probeRouteBalances`、`refreshRouteSummaries`、`buildGatewayRouteBalanceNotice`、成功 toast、失败 toast 执行、`routeBalanceProbeState.finishBatch`、定时器或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，18 个余额探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，208 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，267 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `27.99s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteBalanceProbeModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 130 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 131: 网关单路由探测失败计划接入边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`。
- 改动: 在 `gatewayRouteProbeModel.test.ts` 中新增源码边界测试，确认 `handleProbeRoute` 的 catch 分支委托既有 `buildGatewaySingleProbeErrorPlan`；`GatewayView.vue` 仍保留真实 `routeProbeState.trackRoute`、`probeGatewayRoute`、`applyProbeResult`、completion plan、成功 toast、失败 toast 执行和 `routeProbeState.untrackRoute`。
- 文件长度检查: `GatewayView.vue` 当前为 1367 行，`gatewayRouteProbeModel.ts` 为 183 行，`gatewayRouteProbeModel.test.ts` 为 302 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbeModel.test.ts` 首次失败于 `GatewayView delegates single route probe errors to the probe model plan`，确认 `handleProbeRoute` 仍内联 `toast.error(err instanceof Error ? err.message : '路由探测失败')`。
- 行为锁定: 既有模型测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用默认文案 `路由探测失败`；新增源码边界测试锁定视图 catch 使用 `buildGatewaySingleProbeErrorPlan` 和 `toast[errorPlan.notice.tone]` 执行。
- 副作用边界: 本任务未移动 `routeProbeState.trackRoute`、`probeGatewayRoute`、`applyProbeResult`、`buildGatewaySingleProbeCompletionPlan`、成功 toast、失败 toast 执行、`routeProbeState.untrackRoute`、定时器或 Vue 响应式写入；只把失败路径 notice 执行接入既有模型计划。
- `node --test frontend/tests/gatewayRouteProbeModel.test.ts`: 通过，14 个路由探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，209 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，268 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `17.21s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteProbeModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteProbeModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 131 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 132: 网关新增上游失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAddUpstreamModel.ts`、`frontend/tests/gatewayAddUpstreamModel.test.ts`。
- 改动: 在 `gatewayAddUpstreamModel.ts` 中新增 `buildAddUpstreamErrorPlan`，把 `submitAddUpstream` 的失败 toast 消息计划收口到新增上游模型；`GatewayView.vue` 仍保留真实 `validateAddUpstreamForm`、`buildAddUpstreamPayload`、`createSite`、成功 toast、弹窗成功关闭、`handleSync`、`loadData` 和 loading 结束。
- 文件长度检查: `GatewayView.vue` 当前为 1369 行，`gatewayAddUpstreamModel.ts` 为 81 行，`gatewayAddUpstreamModel.test.ts` 为 119 行。
- TDD 红灯: `node --test frontend/tests/gatewayAddUpstreamModel.test.ts` 首次失败于缺少 `buildAddUpstreamErrorPlan` named export，确认测试先锁定新增上游失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用默认文案 `添加失败`；源码边界测试锁定视图 catch 使用 `buildAddUpstreamErrorPlan` 和 `toast[errorPlan.notice.tone]` 执行。
- 副作用边界: 本任务未移动 `validateAddUpstreamForm`、`addUpstreamDialog.setLoading`、`buildAddUpstreamPayload`、`createSite`、`buildAddUpstreamSuccessMessage`、成功 toast、`addUpstreamDialog.closeAfterSuccess`、`handleSync`、`loadData`、失败 toast 执行或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayAddUpstreamModel.test.ts`: 通过，6 个新增上游模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，211 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，270 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `2.19s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayAddUpstreamModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayAddUpstreamModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 132 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 133: 网关优先级列表加载失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityModel.ts`、`frontend/tests/gatewayPriorityModel.test.ts`。
- 改动: 在 `gatewayPriorityModel.ts` 中新增 `buildGatewayPriorityListLoadErrorPlan`，把 `openPriorityDialog` 的失败 toast 消息计划收口到优先级模型；`GatewayView.vue` 仍保留真实 `priorityDialog.openDialog`、`priorityDialog.setLoading`、`getGatewayRoutes`、`normalizeGatewayRoute`、`priorityDialog.selectRoute` 和 loading 结束。
- 文件长度检查: `GatewayView.vue` 当前为 1371 行，`gatewayPriorityModel.ts` 为 61 行，`gatewayPriorityModel.test.ts` 为 137 行。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityModel.test.ts` 首次失败于缺少 `buildGatewayPriorityListLoadErrorPlan` named export，确认测试先锁定优先级列表加载失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用默认文案 `优先级列表加载失败`；源码边界测试锁定视图 catch 使用 `buildGatewayPriorityListLoadErrorPlan` 和 `toast[errorPlan.notice.tone]` 执行。
- 副作用边界: 本任务未移动 `priorityDialog.openDialog`、`priorityDialog.setLoading`、`getGatewayRoutes`、`normalizeGatewayRoute`、`priorityDialog.selectRoute`、失败 toast 执行或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayPriorityModel.test.ts`: 通过，7 个优先级模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，213 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，272 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `24.97s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPriorityModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayPriorityModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 133 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 134: 网关优先级更新失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityModel.ts`、`frontend/tests/gatewayPriorityModel.test.ts`。
- 改动: 在 `gatewayPriorityModel.ts` 中新增 `buildGatewayPriorityMoveErrorPlan`，把 `handlePriorityMove` 的失败 toast 消息计划收口到优先级模型；`GatewayView.vue` 仍保留真实 `buildGatewayPriorityMoveRequest`、`reorderGatewayRoutePriorities`、`applyReorderedRoutes`、`priorityDialog.selectRoute`、成功 toast 和 loading 结束。
- 文件长度检查: `GatewayView.vue` 当前为 1373 行，`gatewayPriorityModel.ts` 为 77 行，`gatewayPriorityModel.test.ts` 为 166 行。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityModel.test.ts` 首次失败于缺少 `buildGatewayPriorityMoveErrorPlan` named export，确认测试先锁定优先级更新失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用默认文案 `优先级更新失败`；源码边界测试锁定视图 catch 使用 `buildGatewayPriorityMoveErrorPlan` 和 `toast[errorPlan.notice.tone]` 执行。
- 副作用边界: 本任务未移动 `buildGatewayPriorityMoveRequest`、参数校验 toast、`priorityDialog.setLoading`、`reorderGatewayRoutePriorities`、`applyReorderedRoutes`、`priorityDialog.selectRoute`、成功 toast、失败 toast 执行或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayPriorityModel.test.ts`: 通过，9 个优先级模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，215 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，274 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `25.85s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 首次执行因 registry TLS 连接在建立前断开失败；重跑通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPriorityModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayPriorityModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 134 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 135: 网关优先级重排失败计划边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityModel.ts`、`frontend/tests/gatewayPriorityModel.test.ts`。
- 改动: 在 `gatewayPriorityModel.ts` 中新增 `buildGatewayPriorityPresetErrorPlan`，把 `handlePriorityPreset` 的失败 toast 消息计划收口到优先级模型；`GatewayView.vue` 仍保留真实 `buildGatewayPriorityPresetPayload`、`reorderGatewayRoutePriorities`、`applyReorderedRoutes`、`priorityDialog.clearInsertIndex`、`priorityDialog.selectRoute`、成功 toast 和 loading 结束。
- 文件长度检查: `GatewayView.vue` 当前为 1375 行，`gatewayPriorityModel.ts` 为 93 行，`gatewayPriorityModel.test.ts` 为 195 行。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityModel.test.ts` 首次失败于缺少 `buildGatewayPriorityPresetErrorPlan` named export，确认测试先锁定优先级重排失败计划口径。
- 行为锁定: 新测试覆盖 `Error` 实例沿用原始错误消息，非 `Error` 值沿用默认文案 `优先级重排失败`；源码边界测试锁定视图 catch 使用 `buildGatewayPriorityPresetErrorPlan` 和 `toast[errorPlan.notice.tone]` 执行。
- 副作用边界: 本任务未移动 `buildGatewayPriorityPresetPayload`、`priorityDialog.setLoading`、`reorderGatewayRoutePriorities`、`applyReorderedRoutes`、`priorityDialog.clearInsertIndex`、`priorityDialog.selectRoute`、成功 toast、失败 toast 执行或 Vue 响应式写入；只把失败路径 notice 计划抽出。
- `node --test frontend/tests/gatewayPriorityModel.test.ts`: 通过，11 个优先级模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，217 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，276 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `25.02s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPriorityModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayPriorityModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 异常失败 toast 扫描: `rg -n "toast\\.error\\(err instanceof Error \\? err\\.message" frontend/src/views/GatewayView.vue` 无命中。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 135 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 136: 网关用量时间范围校验提示边界收口

日期: 2026-05-25

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayUsageLoadModel.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 在 `gatewayUsageLoadModel.ts` 的 `buildGatewayUsageLoadPlan` 中新增 `invalidRangeNotice`，把 `loadGatewayUsage` 的无效时间范围提示文案收口到用量加载计划；`GatewayView.vue` 仍保留真实 `usageRangeState.toRequestRange`、`gatewayRuntime.buildUsageLoadPlan`、`gatewayUsage.value = null`、`gatewayUsageControllerSlot.replace`、`gatewayRuntime.setUsageLoading`、`getGatewayUsage`、result/error plan、abort slot 和 loading 结束。
- 文件长度检查: `GatewayView.vue` 当前为 1378 行，`gatewayUsageLoadModel.ts` 为 107 行，`gatewayRuntimeController.test.ts` 为 706 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于 `buildGatewayUsageLoadPlan` 缺少 `invalidRangeNotice`，以及 `GatewayView delegates invalid usage range notices to the usage load plan` 发现视图仍硬编码 `toast.error('请选择有效的开始和结束时间')`。
- 行为锁定: 新测试覆盖非监控页清空用量时不提示、非 silent 的无效时间范围返回错误 notice、silent 的无效时间范围不提示、有效范围仍返回 requestRange；源码边界测试锁定视图从 `usagePlan.invalidRangeNotice` 取 notice 并执行 `toast[notice.tone](notice.message)`。
- 副作用边界: 本任务未移动 `usageRangeState.toRequestRange`、`gatewayRuntime.buildUsageLoadPlan`、`gatewayUsage.value = null`、`gatewayUsageControllerSlot.replace`、`gatewayRuntime.setUsageLoading`、`getGatewayUsage`、`buildUsageLoadResultPlan`、`buildUsageLoadErrorPlan`、abort slot 或 loading 写入；只把无效时间范围 notice 计划抽出。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，20 个运行时 controller 测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，218 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，277 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1m 9s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayUsageLoadModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRuntimeController.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index -- /dev/null frontend/src/gatewayUsageLoadModel.ts` 与 `git diff --no-index -- /dev/null frontend/tests/gatewayRuntimeController.test.ts` 均只输出新增文件差异；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 136 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 137: 网关优先级移动参数校验提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityModel.ts`、`frontend/tests/gatewayPriorityModel.test.ts`。
- 改动: 在 `buildGatewayPriorityMoveRequest` 中新增 `validationNotice`，把 `handlePriorityMove` 的目标优先级缺失提示从视图内联 `toast.error(request.error)` 收口到优先级移动请求计划；`GatewayView.vue` 仍保留真实 `buildGatewayPriorityMoveRequest`、`priorityDialog.setLoading`、`reorderGatewayRoutePriorities`、`applyReorderedRoutes`、`priorityDialog.selectRoute`、成功 toast、失败计划和 loading 结束。
- 文件长度检查: `GatewayView.vue` 当前为 1381 行，`gatewayPriorityModel.ts` 为 99 行，`gatewayPriorityModel.test.ts` 为 212 行。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityModel.test.ts` 首次失败于 `buildGatewayPriorityMoveRequest` 缺少 `validationNotice`，以及 `GatewayView delegates priority move validation notices to the move request plan` 发现视图仍直接 `toast.error(request.error)`。
- 行为锁定: 新测试覆盖缺少目标优先级时返回错误 notice、有效目标优先级时 `validationNotice` 为 `null` 且 payload 继续保留 `route_id`、`mode: 'move'` 和截断后的 `index`；源码边界测试锁定视图从 `request.validationNotice` 取 notice 并执行 `toast[notice.tone](notice.message)`。
- 副作用边界: 本任务未移动优先级移动 payload 构造、真实优先级重排 API、重排结果应用、选中路由恢复、成功 toast、catch 失败计划、loading 写入或 Vue 响应式状态；只把校验失败 notice 计划抽出。
- `node --test frontend/tests/gatewayPriorityModel.test.ts`: 通过，12 个优先级模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，219 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，278 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.11s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayPriorityModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayPriorityModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPriorityModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayPriorityModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 137 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 138: 网关新增上游校验提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAddUpstreamModel.ts`、`frontend/tests/gatewayAddUpstreamModel.test.ts`。
- 改动: 在 `gatewayAddUpstreamModel.ts` 中新增 `buildAddUpstreamValidationPlan`，把 `submitAddUpstream` 的表单校验提示从视图内联 `toast.error(validationMessage)` 收口到新增上游校验计划；`GatewayView.vue` 仍保留真实 `buildAddUpstreamPayload`、`createSite`、成功 toast、弹窗成功关闭、`handleSync`、`loadData`、失败计划和 loading 结束。
- 文件长度检查: `GatewayView.vue` 当前为 1383 行，`gatewayAddUpstreamModel.ts` 为 102 行，`gatewayAddUpstreamModel.test.ts` 为 168 行。
- TDD 红灯: `node --test frontend/tests/gatewayAddUpstreamModel.test.ts` 首次失败于缺少 `buildAddUpstreamValidationPlan` named export，确认测试先锁定新增上游校验计划口径。
- 行为锁定: 新测试覆盖必填缺失、Base URL 格式错误和有效表单三种校验计划；源码边界测试锁定视图从 `buildAddUpstreamValidationPlan(addUpstreamForm)` 取 notice 并执行 `toast[validationPlan.notice.tone](validationPlan.notice.message)`。
- 副作用边界: 本任务未移动新增上游 payload 构造、真实 `createSite`、成功 toast、弹窗成功关闭、`handleSync`、`loadData`、catch 失败计划、loading 写入或 Vue 响应式状态；只把校验失败 notice 计划抽出。
- `node --test frontend/tests/gatewayAddUpstreamModel.test.ts`: 通过，8 个新增上游模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，221 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，280 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `2.60s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayAddUpstreamModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayAddUpstreamModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayAddUpstreamModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayAddUpstreamModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 138 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 139: 网关手动余额探测 URL 校验提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`。
- 改动: 在 `gatewayRouteBalanceProbeModel.ts` 中新增 `buildManualGatewayRouteBalanceProbeURLValidationPlan`，把 `submitManualRouteBalanceProbe` 的余额探测 URL 校验提示从视图内联 `toast.error(validationMessage)` 收口到余额探测模型计划；`GatewayView.vue` 仍保留真实 `normalizeManualGatewayRouteBalanceProbeURL`、route 缺失返回、`probeGatewayRouteBalance`、`applyRouteBalanceResult`、`refreshRouteSummaries`、completion/error plan、弹窗状态和 loading 结束。
- 文件长度检查: `GatewayView.vue` 当前为 1385 行，`gatewayRouteBalanceProbeModel.ts` 为 343 行，`gatewayRouteBalanceProbeModel.test.ts` 为 430 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于缺少 `buildManualGatewayRouteBalanceProbeURLValidationPlan` named export，确认测试先锁定手动余额 URL 校验计划口径。
- 行为锁定: 新测试覆盖空 URL、非法相对字符串和合法相对路径三种校验计划；源码边界测试锁定视图从 `buildManualGatewayRouteBalanceProbeURLValidationPlan(balanceProbeURL)` 取 notice 并执行 `toast[validationPlan.notice.tone](validationPlan.notice.message)`。
- 副作用边界: 本任务未移动手动余额探测 URL 归一化、route 缺失返回、真实余额探测 API、余额结果写入、路由摘要刷新、成功/失败 completion plan、弹窗关闭/失败信息、loading 写入或 active route 追踪；只把校验失败 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，20 个余额探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，223 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，282 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.37s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayRouteBalanceProbeModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteBalanceProbeModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 139 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 140: 网关 API Key 缺失提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAccessModel.ts`、`frontend/tests/gatewayAccessModel.test.ts`。
- 改动: 在 `gatewayAccessModel.ts` 中新增 `buildGatewayApiKeyMissingPlan`，把 `copyGatewayApiKey` 的空 API Key 提示从视图内联 `toast.error('后端未配置 GATEWAY_API_KEY。')` 收口到访问模型计划；`GatewayView.vue` 仍保留真实 `normalizeGatewayApiKeyCopyValue`、`navigator.clipboard.writeText`、成功 toast、复制失败计划和剪贴板副作用。
- 文件长度检查: `GatewayView.vue` 当前为 1389 行，`gatewayAccessModel.ts` 为 69 行，`gatewayAccessModel.test.ts` 为 105 行。
- TDD 红灯: `node --test frontend/tests/gatewayAccessModel.test.ts` 首次失败于缺少 `buildGatewayApiKeyMissingPlan` named export，确认测试先锁定 API Key 缺失提示计划口径。
- 行为锁定: 新测试覆盖空字符串返回错误 notice、已配置 Key 返回 `notice: null`；源码边界测试锁定视图从 `buildGatewayApiKeyMissingPlan(value)` 取 notice 并执行 `toast[missingPlan.notice.tone](missingPlan.notice.message)`。
- 副作用边界: 本任务未移动 API Key trim、真实剪贴板写入、成功 toast、复制失败计划、请求 URL 构造或 API Key 掩码；只把缺失值 notice 计划抽出。
- `node --test frontend/tests/gatewayAccessModel.test.ts`: 通过，9 个访问模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，225 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，284 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.32s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayAccessModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayAccessModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayAccessModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayAccessModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 140 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 141: 网关批量路由探测启动提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`。
- 改动: 在 `buildGatewayProbeBatchStartPlan` 的失败分支中补充 `notice`，把 `handleProbeAll` 的空批次启动提示从视图内联 `toast.error(startPlan.errorMessage)` 收口到路由探测模型计划；成功分支返回结构保持原样，不新增 `notice: null`。
- 文件长度检查: `GatewayView.vue` 当前为 1389 行，`gatewayRouteProbeModel.ts` 为 192 行，`gatewayRouteProbeModel.test.ts` 为 318 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbeModel.test.ts` 首次失败 2 项，分别指向空批次计划缺少 `notice`，以及 `GatewayView` 仍直接调用 `toast.error(startPlan.errorMessage)`。
- 行为锁定: 新测试覆盖空批次计划返回错误 notice；源码边界测试锁定视图从 `buildGatewayProbeBatchStartPlan(routes.value.map((route) => route.id))` 取 `startPlan.notice` 并执行 `toast[startPlan.notice.tone](startPlan.notice.message)`。
- 副作用边界: 本任务未移动真实 `probeGatewayRoute` 循环、`applyProbeResult`、失败结果构造、进度推进、completion plan、catch error plan、batch start/finish 或 Vue 响应式状态；只把启动失败 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteProbeModel.test.ts`: 通过，15 个路由探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，226 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，285 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.83s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayRouteProbeModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRouteProbeModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteProbeModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteProbeModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 141 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 142: 网关批量余额更新启动提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`。
- 改动: 在 `buildGatewayRouteBalanceBatchStartPlan` 的失败分支中补充 `notice`，把 `handleUpdateAllBalances` 的空批次和路由探测运行中启动提示从视图内联 `toast.error(startPlan.errorMessage)` 收口到余额探测模型计划；成功分支返回结构保持原样，不新增 `notice: null`。
- 文件长度检查: `GatewayView.vue` 当前为 1389 行，`gatewayRouteBalanceProbeModel.ts` 为 357 行，`gatewayRouteBalanceProbeModel.test.ts` 为 450 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败 2 项，分别指向启动计划缺少 `notice`，以及 `GatewayView` 仍直接调用 `toast.error(startPlan.errorMessage)`。
- 行为锁定: 新测试覆盖空批次和路由探测运行中两类启动失败 notice；源码边界测试锁定视图从 `buildGatewayRouteBalanceBatchStartPlan(...)` 取 `startPlan.notice` 并执行 `toast[startPlan.notice.tone](startPlan.notice.message)`。
- 副作用边界: 本任务未移动真实 `probeRouteBalances` 调用、`refreshRouteSummaries`、余额更新成功 notice、catch error plan、batch start/finish、进度状态或 Vue 响应式写入；只把启动失败 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，21 个余额探测模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，227 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，286 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.22s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayRouteBalanceProbeModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteBalanceProbeModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 142 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 143: 网关用量加载错误提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayUsageLoadModel.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 在 `buildGatewayUsageLoadErrorPlan` 的展示错误分支中补充 `notice`，把 `loadGatewayUsage` 的请求失败提示从视图内联 `toast.error(errorPlan.errorMessage)` 收口到用量加载计划；静默、未挂载和 abort 分支返回结构保持原样。
- 文件长度检查: `GatewayView.vue` 当前为 1389 行，`gatewayUsageLoadModel.ts` 为 116 行，`gatewayRuntimeController.test.ts` 为 730 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败 2 项，分别指向用量错误计划缺少 `notice`，以及 `GatewayView` 仍直接调用 `toast.error(errorPlan.errorMessage)`。
- 行为锁定: 新测试覆盖 `Error` 文案、空字符串文案和 fallback 文案对应的错误 notice；源码边界测试锁定视图从 `gatewayRuntime.buildUsageLoadErrorPlan(...)` 取 `errorPlan.notice` 并执行 `toast[errorPlan.notice.tone](errorPlan.notice.message)`。
- 副作用边界: 本任务未移动真实 `getGatewayUsage` 请求、`usageRangeState.toRequestRange`、invalid range notice、abort slot、result plan、silent 模式、loading 结束或 `gatewayUsage.value` 写入；只把请求失败 notice 计划抽出。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，21 个 runtime controller 测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，228 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，287 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.13s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayUsageLoadModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRuntimeController.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayUsageLoadModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRuntimeController.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 143 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 144: 网关活跃请求加载错误提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayActiveRequestsLoadModel.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 在 `buildGatewayActiveRequestsLoadErrorPlan` 的展示错误分支中补充 `notice`，把 `loadActiveRequests` 的请求失败提示从视图内联 `toast.error(errorPlan.errorMessage)` 收口到活跃请求加载计划；静默、未挂载和 abort 分支返回结构保持原样。
- 文件长度检查: `GatewayView.vue` 当前为 1389 行，`gatewayActiveRequestsLoadModel.ts` 为 55 行，`gatewayRuntimeController.test.ts` 为 764 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败 2 项，分别指向活跃请求错误计划缺少 `notice`，以及 `GatewayView` 仍直接调用 `toast.error(errorPlan.errorMessage)`。
- 行为锁定: 新测试覆盖 `Error` 文案、空字符串 fallback 文案和 null fallback 文案对应的错误 notice；源码边界测试锁定视图从 `gatewayRuntime.buildActiveRequestsLoadErrorPlan(...)` 取 `errorPlan.notice` 并执行 `toast[errorPlan.notice.tone](errorPlan.notice.message)`。
- 副作用边界: 本任务未移动真实 `getGatewayActiveRequests` 请求、abort slot、result plan、silent 模式、`activeRequests.value` 写入、`applyActiveRequestSnapshot` 或并发状态合并；只把请求失败 notice 计划抽出。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，22 个 runtime controller 测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，229 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，288 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.15s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayActiveRequestsLoadModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRuntimeController.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayActiveRequestsLoadModel.ts` 与 `git diff --no-index --check /dev/null frontend/tests/gatewayRuntimeController.test.ts` 均无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 144 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 145: 网关初始数据加载错误提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayInitialDataLoadModel.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 在 `buildGatewayInitialDataLoadErrorPlan` 的展示错误分支中补充 `notice`，把 `loadData` 的请求失败提示从视图内联 `toast.error(errorPlan.errorMessage)` 收口到初始数据加载计划；未挂载和 abort 分支返回结构保持原样。
- 文件长度检查: `GatewayView.vue` 当前为 1389 行，`gatewayInitialDataLoadModel.ts` 为 80 行，`gatewayRuntimeController.test.ts` 为 788 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败 2 项，分别指向初始数据错误计划缺少 `notice`，以及 `GatewayView` 仍直接调用 `toast.error(errorPlan.errorMessage)`。
- 行为锁定: 新测试覆盖 `Error` 文案、空字符串文案和 null fallback 文案对应的错误 notice；源码边界测试锁定视图从 `gatewayRuntime.buildInitialDataLoadErrorPlan(...)` 取 `errorPlan.notice` 并执行 `toast[errorPlan.notice.tone](errorPlan.notice.message)`。
- 副作用边界: 本任务未移动真实 `Promise.all` 请求、请求取消、初始用量缓存判断、活跃请求 snapshot 应用、route/log/overview/site group 写入、loading 结束或 abort slot 清理；只把请求失败 notice 计划抽出。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，23 个 runtime controller 测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，230 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，289 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `37.78s`。仍有既有大 chunk 警告，并输出插件耗时提示。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayInitialDataLoadModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRuntimeController.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/tests/gatewayRuntimeController.test.ts` 无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 145 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 146: 网关同步成功提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteStateModel.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`。
- 改动: 新增 `buildGatewaySyncSuccessPlan`，把 `handleSync` 的成功提示文案从视图内联 `toast.success(...)` 收口到网关路由状态模型；失败路径仍使用既有 `buildGatewaySyncErrorPlan`。
- 文件长度检查: `GatewayView.vue` 当前为 1394 行，`gatewayRouteStateModel.ts` 为 163 行，`gatewayRouteStateModel.test.ts` 为 377 行。由于本任务只抽出成功 notice 计划且保留源码边界测试，`GatewayView.vue` 行数未下降。
- TDD 红灯: `node --test frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于缺少 `buildGatewaySyncSuccessPlan` named export。
- 行为锁定: 新测试覆盖同步成功 route count 与余额成功数文案，以及 `GatewayView` 从 `buildGatewaySyncSuccessPlan(...)` 取 `successPlan.notice` 并执行 `toast[successPlan.notice.tone](successPlan.notice.message)`。
- 副作用边界: 本任务未移动真实 `syncGatewayRoutes`、`loadData`、静默 `probeRouteBalances`、loading 状态、错误计划或 catch/finally 流程；只把成功 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteStateModel.test.ts`: 通过，14 个路由状态模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，232 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，291 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `28.24s`。仍有既有大 chunk 警告，并输出插件耗时提示。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayRouteStateModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRouteStateModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/tests/gatewayRouteStateModel.test.ts` 无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 146 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 147: 网关路由启停成功提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteStateModel.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`。
- 改动: 新增 `buildGatewayRouteToggleSuccessPlan`，把 `handleToggle` 的成功提示文案从视图内联 `toast.success(route.is_enabled ? ...)` 收口到网关路由状态模型；失败路径仍使用既有 `buildGatewayRouteToggleErrorPlan`。
- 文件长度检查: `GatewayView.vue` 当前为 1398 行，`gatewayRouteStateModel.ts` 为 176 行，`gatewayRouteStateModel.test.ts` 为 411 行。由于本任务只抽出成功 notice 计划且保留源码边界测试，`GatewayView.vue` 行数未下降。
- TDD 红灯: `node --test frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于缺少 `buildGatewayRouteToggleSuccessPlan` named export。
- 行为锁定: 新测试覆盖切换前已启用时提示 `已禁用该路由。`、切换前已禁用时提示 `已重新启用该路由。`，以及 `GatewayView` 从 `buildGatewayRouteToggleSuccessPlan(...)` 取 `successPlan.notice` 并执行 `toast[successPlan.notice.tone](successPlan.notice.message)`。
- 副作用边界: 本任务未移动真实 `toggleGatewayRoute`、`loadData`、当前 `route.is_enabled` 判定来源、失败计划或 catch/finally 流程；只把成功 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteStateModel.test.ts`: 通过，16 个路由状态模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，234 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，293 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `34.33s`。仍有既有大 chunk 警告，并输出插件耗时提示。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayRouteStateModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRouteStateModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/tests/gatewayRouteStateModel.test.ts` 无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 147 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 148: 网关批量禁用成功提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteStateModel.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`。
- 改动: 新增 `buildGatewayDisableAllRoutesSuccessPlan`，把 `handleDisableAllRoutes` 的成功提示文案从视图内联 `toast.success(...)` 收口到网关路由状态模型；失败路径仍使用既有 `buildGatewayDisableAllRoutesErrorPlan`。
- 文件长度检查: `GatewayView.vue` 当前为 1402 行，`gatewayRouteStateModel.ts` 为 189 行，`gatewayRouteStateModel.test.ts` 为 445 行。由于本任务只抽出成功 notice 计划且保留源码边界测试，`GatewayView.vue` 行数未下降。
- TDD 红灯: `node --test frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于缺少 `buildGatewayDisableAllRoutesSuccessPlan` named export。
- 行为锁定: 新测试覆盖 disabled count 文案，以及 `GatewayView` 从 `buildGatewayDisableAllRoutesSuccessPlan(...)` 取 `successPlan.notice` 并执行 `toast[successPlan.notice.tone](successPlan.notice.message)`。
- 副作用边界: 本任务未移动确认弹窗、真实 `disableAllGatewayRoutes`、`loadData`、失败计划或 catch 流程；只把成功 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteStateModel.test.ts`: 通过，18 个路由状态模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，236 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，295 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `44.27s`。仍有既有大 chunk 警告，并输出插件耗时提示。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayRouteStateModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRouteStateModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/tests/gatewayRouteStateModel.test.ts` 无输出；返回码为 no-index 文件差异的预期 `1`。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 148 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 149: 网关仅启用当前路由成功提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteStateModel.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`。
- 改动: 新增 `buildGatewayEnableOnlyRouteSuccessPlan`，把 `handleEnableOnlyRoute` 的成功提示文案从视图内联 `toast.success(...)` 收口到网关路由状态模型；失败路径仍使用既有 `buildGatewayEnableOnlyRouteErrorPlan`。
- 文件长度检查: `GatewayView.vue` 当前为 1404 行，`gatewayRouteStateModel.ts` 为 198 行，`gatewayRouteStateModel.test.ts` 为 467 行。由于本任务只抽出成功 notice 计划且保留源码边界测试，`GatewayView.vue` 行数未下降。
- TDD 红灯: `node --test frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于缺少 `buildGatewayEnableOnlyRouteSuccessPlan` named export。
- 行为锁定: 新测试覆盖静态成功提示 `已仅启用该路由，其他路由已禁用。`，以及 `GatewayView` 从 `buildGatewayEnableOnlyRouteSuccessPlan()` 取 `successPlan.notice` 并执行 `toast[successPlan.notice.tone](successPlan.notice.message)`。
- 副作用边界: 本任务未移动确认弹窗、真实 `enableOnlyGatewayRoute`、`loadData`、当前路由标签确认文案、失败计划或 catch 流程；只把成功 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteStateModel.test.ts`: 通过，20 个路由状态模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，238 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，297 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.17s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayRouteStateModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRouteStateModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/tests/gatewayRouteStateModel.test.ts` 无输出；返回码为 no-index 文件差异的预期 `1`。
- `git diff --check`: 通过。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 149 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 150: 网关重置熔断成功提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteStateModel.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`。
- 改动: 新增 `buildGatewayResetCircuitSuccessPlan`，把 `handleResetCircuit` 的成功提示文案从视图内联 `toast.success(...)` 收口到网关路由状态模型；失败路径仍使用既有 `buildGatewayResetCircuitErrorPlan`。
- 文件长度检查: `GatewayView.vue` 当前为 1406 行，`gatewayRouteStateModel.ts` 为 207 行，`gatewayRouteStateModel.test.ts` 为 489 行。由于本任务只抽出成功 notice 计划且保留源码边界测试，`GatewayView.vue` 行数未下降。
- TDD 红灯: `node --test frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于缺少 `buildGatewayResetCircuitSuccessPlan` named export。
- 行为锁定: 新测试覆盖静态成功提示 `已重置该路由熔断状态。`，以及 `GatewayView` 从 `buildGatewayResetCircuitSuccessPlan()` 取 `successPlan.notice` 并执行 `toast[successPlan.notice.tone](successPlan.notice.message)`。
- 副作用边界: 本任务未移动真实 `resetGatewayRouteCircuit`、`loadData`、失败计划或 catch 流程；只把成功 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteStateModel.test.ts`: 通过，22 个路由状态模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，240 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，299 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.89s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayRouteStateModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRouteStateModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteStateModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteStateModel.test.ts` 均无输出；返回码均为 no-index 文件差异的预期 `1`。
- `git diff --check`: 通过。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 150 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 151: 网关路由类型切换成功提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteConfigModel.ts`、`frontend/tests/gatewayRouteConfigModel.test.ts`。
- 改动: 新增 `buildGatewayRouteTypeChangeSuccessPlan`，把 `handleRouteTypeChange` 的成功提示文案从视图内联 `toast.success(...)` 收口到网关路由配置模型；失败路径仍使用既有 `buildGatewayRouteTypeChangeErrorPlan`。
- 文件长度检查: `GatewayView.vue` 当前为 1411 行，`gatewayRouteConfigModel.ts` 为 116 行，`gatewayRouteConfigModel.test.ts` 为 201 行。由于本任务只抽出成功 notice 计划且保留源码边界测试，`GatewayView.vue` 行数未下降。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConfigModel.test.ts` 首次失败于缺少 `buildGatewayRouteTypeChangeSuccessPlan` named export。
- 行为锁定: 新测试覆盖 `routeLabel` 与 `routeTypeLabel` 组合出的成功提示，以及 `GatewayView` 从 `buildGatewayRouteTypeChangeSuccessPlan(...)` 取 `successPlan.notice` 并执行 `toast[successPlan.notice.tone](successPlan.notice.message)`。
- 副作用边界: 本任务未移动乐观更新、真实 `updateGatewayRouteType`、`buildGatewayRouteTypePayload`、两份路由列表替换、失败回滚、失败计划或 catch 流程；只把成功 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteConfigModel.test.ts`: 通过，9 个路由配置模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，242 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，301 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.97s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayRouteConfigModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRouteConfigModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteConfigModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteConfigModel.test.ts` 均无输出；返回码均为 no-index 文件差异的预期 `1`。
- `git diff --check`: 通过。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 151 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 152: 网关请求格式切换成功提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteConfigModel.ts`、`frontend/tests/gatewayRouteConfigModel.test.ts`。
- 改动: 新增 `buildGatewayRoutePathChangeSuccessPlan`，把 `handleRoutePathChange` 的成功提示文案从视图内联 `toast.success(...)` 收口到网关路由配置模型；失败路径仍使用既有 `buildGatewayRoutePathChangeErrorPlan`。
- 文件长度检查: `GatewayView.vue` 当前为 1416 行，`gatewayRouteConfigModel.ts` 为 131 行，`gatewayRouteConfigModel.test.ts` 为 228 行。由于本任务只抽出成功 notice 计划且保留源码边界测试，`GatewayView.vue` 行数未下降。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConfigModel.test.ts` 首次失败于缺少 `buildGatewayRoutePathChangeSuccessPlan` named export。
- 行为锁定: 新测试覆盖 `routeLabel` 与 `routePathLabel` 组合出的成功提示，以及 `GatewayView` 从 `buildGatewayRoutePathChangeSuccessPlan(...)` 取 `successPlan.notice` 并执行 `toast[successPlan.notice.tone](successPlan.notice.message)`。
- 副作用边界: 本任务未移动乐观更新、真实 `updateGatewayRouteType`、`buildGatewayRoutePathPayload`、两份路由列表替换、失败回滚、失败计划或 catch 流程；只把成功 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteConfigModel.test.ts`: 通过，11 个路由配置模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，244 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，303 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `2.63s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayRouteConfigModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRouteConfigModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteConfigModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteConfigModel.test.ts` 均无输出；返回码均为 no-index 文件差异的预期 `1`。
- `git diff --check`: 通过。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 152 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 153: 网关路由模型保存成功提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteConfigModel.ts`、`frontend/tests/gatewayRouteConfigModel.test.ts`。
- 改动: 新增 `buildGatewayRouteModelsSaveSuccessPlan`，把 `saveRouteModelsDialog` 的成功提示文案从视图内联 `toast.success(...)` 收口到网关路由配置模型；失败路径仍使用既有 `buildGatewayRouteModelsSaveErrorPlan`。
- 文件长度检查: `GatewayView.vue` 当前为 1418 行，`gatewayRouteConfigModel.ts` 为 140 行，`gatewayRouteConfigModel.test.ts` 为 250 行。由于本任务只抽出成功 notice 计划且保留源码边界测试，`GatewayView.vue` 行数未下降。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConfigModel.test.ts` 首次失败于缺少 `buildGatewayRouteModelsSaveSuccessPlan` named export。
- 行为锁定: 新测试覆盖静态成功提示 `路由配置已更新。`，以及 `GatewayView` 从 `buildGatewayRouteModelsSaveSuccessPlan()` 取 `successPlan.notice` 并执行 `toast[successPlan.notice.tone](successPlan.notice.message)`。
- 副作用边界: 本任务未移动 route 判空、真实 `updateGatewayRouteType`、`buildGatewayRouteModelsPayload`、两份路由列表替换、`routeModelsDialog.closeAfterSuccess()`、saving 状态、失败计划或 catch/finally 流程；只把成功 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteConfigModel.test.ts`: 通过，13 个路由配置模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，246 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，305 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `39.21s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayRouteConfigModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRouteConfigModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteConfigModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteConfigModel.test.ts` 均无输出；返回码均为 no-index 文件差异的预期 `1`。
- `git diff --check`: 通过。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 153 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 154: 网关请求地址复制成功提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAccessModel.ts`、`frontend/tests/gatewayAccessModel.test.ts`。
- 改动: 新增 `buildGatewayRequestUrlCopySuccessPlan`，把 `copyGatewayRequestUrl` 的成功提示文案从视图内联 `toast.success(...)` 收口到网关访问模型；失败路径仍使用既有 `buildGatewayRequestUrlCopyErrorPlan`。
- 文件长度检查: `GatewayView.vue` 当前为 1420 行，`gatewayAccessModel.ts` 为 78 行，`gatewayAccessModel.test.ts` 为 127 行。由于本任务只抽出成功 notice 计划且保留源码边界测试，`GatewayView.vue` 行数未下降。
- TDD 红灯: `node --test frontend/tests/gatewayAccessModel.test.ts` 首次失败于缺少 `buildGatewayRequestUrlCopySuccessPlan` named export。
- 行为锁定: 新测试覆盖静态成功提示 `网关请求地址已复制。`，以及 `GatewayView` 从 `buildGatewayRequestUrlCopySuccessPlan()` 取 `successPlan.notice` 并执行 `toast[successPlan.notice.tone](successPlan.notice.message)`。
- 副作用边界: 本任务未移动真实 `navigator.clipboard.writeText`、`gatewayRequestUrl` computed、复制失败计划或 catch 流程；只把成功 notice 计划抽出。
- `node --test frontend/tests/gatewayAccessModel.test.ts`: 通过，11 个网关访问模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，248 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，307 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.20s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayAccessModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayAccessModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayAccessModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayAccessModel.test.ts` 均无输出；返回码均为 no-index 文件差异的预期 `1`。
- `git diff --check`: 通过。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 154 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 155: 网关 API Key 复制成功提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAccessModel.ts`、`frontend/tests/gatewayAccessModel.test.ts`。
- 改动: 新增 `buildGatewayApiKeyCopySuccessPlan`，把 `copyGatewayApiKey` 的成功提示文案从视图内联 `toast.success(...)` 收口到网关访问模型；空 key 路径仍使用既有 `buildGatewayApiKeyMissingPlan`，失败路径仍使用既有 `buildGatewayApiKeyCopyErrorPlan`。
- 文件长度检查: `GatewayView.vue` 当前为 1422 行，`gatewayAccessModel.ts` 为 87 行，`gatewayAccessModel.test.ts` 为 149 行。由于本任务只抽出成功 notice 计划且保留源码边界测试，`GatewayView.vue` 行数未下降。
- TDD 红灯: `node --test frontend/tests/gatewayAccessModel.test.ts` 首次失败于缺少 `buildGatewayApiKeyCopySuccessPlan` named export。
- 行为锁定: 新测试覆盖静态成功提示 `网关 API Key 已复制。`，以及 `GatewayView` 从 `buildGatewayApiKeyCopySuccessPlan()` 取 `successPlan.notice` 并执行 `toast[successPlan.notice.tone](successPlan.notice.message)`。
- 副作用边界: 本任务未移动 `normalizeGatewayApiKeyCopyValue`、空 key 缺失计划、真实 `navigator.clipboard.writeText`、复制失败计划或 catch 流程；只把成功 notice 计划抽出。
- `node --test frontend/tests/gatewayAccessModel.test.ts`: 通过，13 个网关访问模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，250 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，309 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.55s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayAccessModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayAccessModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayAccessModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayAccessModel.test.ts` 均无输出；返回码均为 no-index 文件差异的预期 `1`。
- `git diff --check`: 通过。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 155 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 156: 网关策略保存成功提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewaySettingsModel.ts`、`frontend/tests/gatewaySettingsModel.test.ts`。
- 改动: 新增 `buildGatewaySettingsSaveSuccessPlan`，把 `saveSettings` 的成功提示文案从视图内联 `toast.success(...)` 收口到网关设置模型；失败路径仍使用既有 `buildGatewaySettingsSaveErrorPlan`。
- 文件长度检查: `GatewayView.vue` 当前为 1424 行，`gatewaySettingsModel.ts` 为 74 行，`gatewaySettingsModel.test.ts` 为 144 行。由于本任务只抽出成功 notice 计划且保留源码边界测试，`GatewayView.vue` 行数未下降。
- TDD 红灯: `node --test frontend/tests/gatewaySettingsModel.test.ts` 首次失败于缺少 `buildGatewaySettingsSaveSuccessPlan` named export。
- 行为锁定: 新测试覆盖静态成功提示 `网关策略已保存。`，以及 `GatewayView` 从 `buildGatewaySettingsSaveSuccessPlan()` 取 `successPlan.notice` 并执行 `toast[successPlan.notice.tone](successPlan.notice.message)`。
- 副作用边界: 本任务未移动真实 `updateGatewaySettings`、`settingsDialog.setSettings`、`settingsDialog.closeAfterSuccess()`、`loadData()`、失败计划或 catch/finally 流程；只把成功 notice 计划抽出。
- `node --test frontend/tests/gatewaySettingsModel.test.ts`: 通过，7 个网关设置模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，252 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，311 个前端状态辅助测试全部通过。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.40s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewaySettingsModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewaySettingsModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewaySettingsModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewaySettingsModel.test.ts` 均无输出；返回码均为 no-index 文件差异的预期 `1`。
- `git diff --check`: 通过。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 156 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 157: 网关优先级移动成功提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityModel.ts`、`frontend/tests/gatewayPriorityModel.test.ts`。
- 改动: 新增 `buildGatewayPriorityMoveSuccessPlan`，把 `handlePriorityMove` 的成功提示文案从视图内联 `toast.success(...)` 收口到网关优先级模型；目标位置校验仍使用 `buildGatewayPriorityMoveRequest` 的 `validationNotice`，失败路径仍使用既有 `buildGatewayPriorityMoveErrorPlan`。
- 文件长度检查: `GatewayView.vue` 当前为 1426 行，`gatewayPriorityModel.ts` 为 115 行，`gatewayPriorityModel.test.ts` 为 234 行。由于本任务只抽出成功 notice 计划且保留源码边界测试，`GatewayView.vue` 行数未下降。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityModel.test.ts` 首次失败于缺少 `buildGatewayPriorityMoveSuccessPlan` named export。
- 行为锁定: 新测试覆盖静态成功提示 `优先级已更新。`，以及 `GatewayView` 从 `buildGatewayPriorityMoveSuccessPlan()` 取 `successPlan.notice` 并执行 `toast[successPlan.notice.tone](successPlan.notice.message)`。
- 副作用边界: 本任务未移动 `buildGatewayPriorityMoveRequest`、目标位置校验、真实 `reorderGatewayRoutePriorities`、`applyReorderedRoutes`、`priorityDialog.selectRoute(...)`、失败计划或 catch/finally/loading 流程；只把成功 notice 计划抽出。
- `node --test frontend/tests/gatewayPriorityModel.test.ts`: 通过，14 个网关优先级模型测试全部通过。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，254 个网关相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，313 个前端状态辅助测试全部通过，耗时 `2100.776931ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.52s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayPriorityModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayPriorityModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPriorityModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPriorityModel.test.ts` 均无输出；返回码均为 no-index 文件差异的预期 `1`。
- `git diff --check`: 通过。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 157 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 158: 网关优先级预设成功提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityModel.ts`、`frontend/tests/gatewayPriorityModel.test.ts`。
- 改动: 新增 `buildGatewayPriorityPresetSuccessPlan`，把 `handlePriorityPreset` 的套餐/余额重排成功提示从视图内联 `toast.success(...)` 收口到网关优先级模型；失败路径仍使用既有 `buildGatewayPriorityPresetErrorPlan`。
- 文件长度检查: `GatewayView.vue` 当前为 1427 行，`gatewayPriorityModel.ts` 为 133 行，`gatewayPriorityModel.test.ts` 为 262 行。由于本任务只抽出成功 notice 计划且保留源码边界测试，`GatewayView.vue` 行数未下降。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityModel.test.ts` 首次失败于缺少 `buildGatewayPriorityPresetSuccessPlan` named export。
- 行为锁定: 新测试覆盖 `package` 模式成功提示 `已按套餐优先重排。`、`balance` 模式成功提示 `已按余额优先重排。`，以及 `GatewayView` 从 `buildGatewayPriorityPresetSuccessPlan(mode)` 取 `successPlan.notice` 并执行 `toast[successPlan.notice.tone](successPlan.notice.message)`。
- 副作用边界: 本任务未移动 `buildGatewayPriorityPresetPayload`、真实 `reorderGatewayRoutePriorities`、`applyReorderedRoutes`、`priorityDialog.clearInsertIndex()`、`priorityDialog.selectRoute(...)`、失败计划或 catch/finally/loading 流程；只把成功 notice 计划抽出。
- `node --test frontend/tests/gatewayPriorityModel.test.ts`: 通过，16 个网关优先级模型测试全部通过，耗时 `165.026519ms`。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，256 个网关相关测试全部通过，耗时 `1891.443621ms`。
- `node --test frontend/tests/*.test.ts`: 通过，315 个前端状态辅助测试全部通过，耗时 `2329.169831ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.67s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayPriorityModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayPriorityModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPriorityModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPriorityModel.test.ts` 均无输出；返回码均为 no-index 文件差异的预期 `1`。
- `git diff --check`: 通过。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 158 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 159: 网关新增上游成功提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAddUpstreamModel.ts`、`frontend/tests/gatewayAddUpstreamModel.test.ts`。
- 改动: 新增 `buildAddUpstreamSuccessPlan`，把 `submitAddUpstream` 的新增上游成功提示从视图内联 `toast.success(...)` 收口到新增上游模型；表单校验仍使用 `buildAddUpstreamValidationPlan`，失败路径仍使用既有 `buildAddUpstreamErrorPlan`。
- 文件长度检查: `GatewayView.vue` 当前为 1428 行，`gatewayAddUpstreamModel.ts` 为 118 行，`gatewayAddUpstreamModel.test.ts` 为 190 行。由于本任务只抽出成功 notice 计划且保留源码边界测试，`GatewayView.vue` 行数未下降。
- TDD 红灯: `node --test frontend/tests/gatewayAddUpstreamModel.test.ts` 首次失败于缺少 `buildAddUpstreamSuccessPlan` named export。
- 行为锁定: 新测试覆盖新增上游成功提示 `已添加上游「上游 B」，可在路由池中调整 priority/weight。`，以及 `GatewayView` 从 `buildAddUpstreamSuccessPlan(payload.name)` 取 `successPlan.notice` 并执行 `toast[successPlan.notice.tone](successPlan.notice.message)`。
- 副作用边界: 本任务未移动 `buildAddUpstreamPayload`、真实 `createSite`、`addUpstreamDialog.closeAfterSuccess()`、`handleSync()`、`loadData()`、失败计划或 catch/finally/loading 流程；只把成功 notice 计划抽出。
- `node --test frontend/tests/gatewayAddUpstreamModel.test.ts`: 通过，10 个新增上游模型测试全部通过，耗时 `132.325783ms`。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，258 个网关相关测试全部通过，耗时 `1347.981402ms`。
- `node --test frontend/tests/*.test.ts`: 通过，317 个前端状态辅助测试全部通过，耗时 `1566.710599ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.94s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayAddUpstreamModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayAddUpstreamModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayAddUpstreamModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayAddUpstreamModel.test.ts` 均无输出；返回码均为 no-index 文件差异的预期 `1`。
- `git diff --check`: 通过。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 159 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 160: 网关活动请求 URL 复制成功提示边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayActivityDisplayModel.ts`、`frontend/tests/gatewayRouteDisplayModel.test.ts`。
- 改动: 新增 `buildGatewayActivityCopySuccessPlan`，把 `copyGatewayActivityUrl` 的成功提示 `请求 URL 已复制。` 从视图内联 `toast.success(...)` 收口到活动展示模型；失败路径仍使用既有 `buildGatewayActivityCopyErrorPlan`。
- 文件长度检查: `GatewayView.vue` 当前为 1430 行，`gatewayActivityDisplayModel.ts` 为 129 行，`gatewayRouteDisplayModel.test.ts` 为 192 行。由于本任务只抽出成功 notice 计划且保留源码边界测试，`GatewayView.vue` 行数未下降。
- TDD 红灯: `node --test frontend/tests/gatewayRouteDisplayModel.test.ts` 首次失败于缺少 `buildGatewayActivityCopySuccessPlan` named export。
- 行为锁定: 新测试覆盖活动 URL 复制成功提示 `请求 URL 已复制。`，以及 `GatewayView` 从 `buildGatewayActivityCopySuccessPlan()` 取 `successPlan.notice` 并执行 `toast[successPlan.notice.tone](successPlan.notice.message)`。
- 副作用边界: 本任务未移动 `normalizeGatewayActivityCopyUrl`、空 URL 返回、真实 `navigator.clipboard.writeText(...)`、失败计划或 catch 流程；只把成功 notice 计划抽出。
- `node --test frontend/tests/gatewayRouteDisplayModel.test.ts`: 通过，8 个网关路由/活动展示模型测试全部通过，耗时 `153.588657ms`。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，260 个网关相关测试全部通过，耗时 `1605.903911ms`。
- `node --test frontend/tests/*.test.ts`: 通过，319 个前端状态辅助测试全部通过，耗时 `2531.244017ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.51s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check -- frontend/src/gatewayActivityDisplayModel.ts frontend/src/views/GatewayView.vue frontend/tests/gatewayRouteDisplayModel.test.ts`: 通过。
- 新增文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayActivityDisplayModel.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteDisplayModel.test.ts` 均无输出；返回码均为 no-index 文件差异的预期 `1`。
- `rg -n "toast\\.success\\(" frontend/src/views/GatewayView.vue`: 无命中。
- `git diff --check`: 通过。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 160 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 161: 网关视图 toast 执行辅助边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/tests/gatewayViewModel.test.ts`、网关源码边界测试。
- 改动: 在 `GatewayView.vue` 内新增本地 `GatewayNoticePlan` 与 `showPlanNotice(plan)`，把重复的 `toast[plan.notice.tone](plan.notice.message)` 执行点收口为统一 helper；可空 notice 分支仍先显式判空并传入非空 `{ notice }`。
- 文件长度检查: `GatewayView.vue` 当前为 1442 行，`gatewayViewModel.test.ts` 为 292 行。由于本任务只建立执行辅助并同步源码边界测试，`GatewayView.vue` 行数小幅增加。
- TDD 红灯: `node --test frontend/tests/gatewayViewModel.test.ts` 首次失败于缺少 `GatewayNoticePlan` 类型和 `showPlanNotice(plan)` helper，确认测试覆盖新增视图执行边界。
- 行为锁定: 新测试确认 `GatewayView.vue` 存在 `showPlanNotice(plan)`，并且不再出现 `toast[xxxPlan.notice.tone](xxxPlan.notice.message)` 形式的计划对象直接执行；原各 model/controller 的 notice 文案、tone、API 请求和响应式写入均不变。
- 副作用边界: 本任务未移动任何真实 API 调用、clipboard 写入、AbortController slot、loading 状态、Vue 响应式写入、toast 文案来源或错误计划；只把计划对象的 toast 执行动作收口为本地 helper。
- `node --test frontend/tests/gatewayViewModel.test.ts`: 通过，7 个网关视图模型与源码边界测试全部通过，耗时 `166.428776ms`。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，261 个网关相关测试全部通过，耗时 `1594.493778ms`。
- `node --test frontend/tests/*.test.ts`: 通过，320 个前端状态辅助测试全部通过，耗时 `2625.659948ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.40s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `rg -n "toast\\.success\\(" frontend/src/views/GatewayView.vue`: 无命中。
- `rg -n "toast\\[[a-zA-Z]+Plan\\.notice\\.tone\\]\\([a-zA-Z]+Plan\\.notice\\.message\\)" frontend/src/views/GatewayView.vue`: 无命中。
- `git diff --check`: 通过。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 161 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 162: 网关视图运行态通知执行边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/tests/gatewayViewModel.test.ts`、`frontend/tests/gatewayPriorityModel.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 在 `GatewayView.vue` 内新增本地 `showNotice(notice)`，让 `showPlanNotice(plan)` 复用该 helper，并把剩余局部 `toast[notice.tone](notice.message)` 执行点改为 `showNotice(notice)`。
- 文件长度检查: `GatewayView.vue` 当前为 1446 行，`gatewayViewModel.test.ts` 为 294 行，`gatewayPriorityModel.test.ts` 为 262 行，`gatewayRuntimeController.test.ts` 为 788 行。由于本任务只建立局部 notice 执行 helper，`GatewayView.vue` 行数小幅增加。
- TDD 红灯: `node --test frontend/tests/gatewayViewModel.test.ts` 首次失败于缺少 `showNotice(notice)` helper，且源码中存在多处 `toast[notice.tone](notice.message)` 直接执行。
- 行为锁定: 新测试确认 `showNotice(notice)` 是唯一直接调用 `toast[notice.tone](notice.message)` 的位置，`showPlanNotice(plan)` 委托 `showNotice(plan.notice)`，业务 handler 只调用 `showNotice(notice)` 或 `showPlanNotice(plan)`。
- 副作用边界: 本任务未移动任何真实 API 调用、clipboard 写入、AbortController slot、loading 状态、Vue 响应式写入、toast 文案来源或错误计划；只把局部运行态 notice 的 toast 执行动作收口为本地 helper。
- `node --test frontend/tests/gatewayViewModel.test.ts`: 通过，7 个网关视图模型与源码边界测试全部通过，耗时 `253.974553ms`。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，261 个网关相关测试全部通过，耗时 `3210.178262ms`。
- `node --test frontend/tests/*.test.ts`: 通过，320 个前端状态辅助测试全部通过，耗时 `3358.987409ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.49s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `rg -n "toast\\.success\\(" frontend/src/views/GatewayView.vue`: 无命中。
- `rg -n "toast\\[[a-zA-Z]+Plan\\.notice\\.tone\\]\\([a-zA-Z]+Plan\\.notice\\.message\\)" frontend/src/views/GatewayView.vue`: 无命中。
- `rg -n "toast\\[notice\\.tone\\]\\(notice\\.message\\)" frontend/src/views/GatewayView.vue`: 仅命中 `showNotice` helper 内部调用。
- `git diff --check`: 通过。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 162 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 163: 网关视图动作后数据重载入口收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增本地 `reloadGatewayDataAfterAction()`，把新增上游、同步、路由启停、批量禁用、仅启用、重置熔断和设置保存成功后的 `loadData()` 重载入口统一到该 helper；保留 `handleRefresh` 和 `onMounted` 的入口级直接加载。
- 文件长度检查: `GatewayView.vue` 当前为 1450 行，`gatewayViewModel.test.ts` 为 320 行。由于本任务只建立动作后重载 helper 并补源码边界测试，`GatewayView.vue` 行数小幅增加。
- TDD 红灯: `node --test frontend/tests/gatewayViewModel.test.ts` 首次失败于缺少 `reloadGatewayDataAfterAction()` helper；修正测试切片后确认目标 handler 不再直接调用 `loadData()`。
- 行为锁定: 新测试确认 `reloadGatewayDataAfterAction()` 内部仍执行 `await loadData()`，且 `submitAddUpstream`、`handleSync`、`handleToggle`、`handleDisableAllRoutes`、`handleEnableOnlyRoute`、`handleResetCircuit`、`saveSettings` 成功路径改为 `await reloadGatewayDataAfterAction()`。
- 副作用边界: 本任务未移动 `loadData` 内部真实 API 请求、AbortController slot、loading 状态、Vue 响应式写入、toast 文案来源或错误计划；只把动作成功后的重载调用入口收口为本地 helper。
- `node --test frontend/tests/gatewayViewModel.test.ts`: 通过，8 个网关视图模型与源码边界测试全部通过，耗时 `184.680796ms`。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，262 个网关相关测试全部通过，耗时 `2516.352425ms`。
- `node --test frontend/tests/*.test.ts`: 通过，321 个前端状态辅助测试全部通过，耗时 `2686.17267ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.25s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 163 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 164: 网关实时请求加载 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 新增导出的 `loadGatewayActiveRequests(...)` runtime helper，通过注入 `requestActiveRequests`、`controllerSlot`、`mounted` getter、快照 setter、快照合并函数和计划通知函数执行实时请求加载；`GatewayView.vue` 的 `loadActiveRequests` 改为委托 `gatewayRuntime.loadActiveRequests(...)`，不再直接编排活跃请求加载结果计划和错误计划。
- 文件长度检查: `GatewayView.vue` 当前为 1436 行，`gatewayRuntimeController.ts` 为 302 行，`gatewayRuntimeController.test.ts` 为 898 行。相比任务 163 结束时，`GatewayView.vue` 从 1450 行降至 1436 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于 `gatewayRuntimeController.ts` 尚未导出 `loadGatewayActiveRequests`。
- 行为锁定: 新测试覆盖成功加载会同时写入 `activeRequests` 并执行 `applyActiveRequestSnapshot`；过期 abort、组件卸载、静默错误均不弹出错误；非静默可见错误仍通过注入的 `showPlanNotice` 执行错误计划。
- 副作用边界: 本任务未改变真实 API 地址、请求参数、AbortController slot 的替换和清理语义、活跃请求快照合并逻辑或 toast 文案来源；只是把 `loadActiveRequests` 的 Promise 编排从视图迁入 runtime controller。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，25 个 runtime controller 测试全部通过，耗时 `262.915517ms`。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，264 个网关相关测试全部通过，耗时 `3284.660454ms`。
- `node --test frontend/tests/*.test.ts`: 通过，323 个前端状态辅助测试全部通过，耗时 `3421.888585ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.57s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRuntimeController.ts` 与 `frontend/tests/gatewayRuntimeController.test.ts`: 通过，未发现空白错误。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 164 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 165: 网关用量加载 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 新增导出的 `loadGatewayUsage(...)` runtime helper，通过注入 `requestUsage`、`controllerSlot`、`mounted` getter、用量 setter、loading setter、普通通知函数、计划通知函数和 abort 判断函数执行用量加载；`GatewayView.vue` 的 `loadGatewayUsage` 改为委托 `gatewayRuntime.loadUsage(...)`，不再直接编排用量加载计划、结果计划和错误计划。
- 文件长度检查: `GatewayView.vue` 当前为 1401 行，`gatewayRuntimeController.ts` 为 385 行，`gatewayRuntimeController.test.ts` 为 1108 行。相比任务 164 结束时，`GatewayView.vue` 从 1436 行降至 1401 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于 `gatewayRuntimeController.ts` 尚未导出 `loadGatewayUsage`。
- 行为锁定: 新测试覆盖有效范围会打开 loading、请求用量并写入 snapshot；非监控状态会清空用量；无效时间范围仅在非 silent 模式显示原错误通知且不发请求；过期 abort、组件卸载、abort error 和 silent error 均不弹出错误；非静默可见错误仍通过注入的 `showPlanNotice` 执行错误计划。
- 副作用边界: 本任务未改变真实 API 地址、请求参数、时间范围转换、AbortController slot 的替换和清理语义、loading 在已卸载组件上不再关闭的既有行为或 toast 文案来源；只是把 `loadGatewayUsage` 的 Promise 编排从视图迁入 runtime controller。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，29 个 runtime controller 测试全部通过，耗时 `193.316508ms`。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，268 个网关相关测试全部通过，耗时 `2600.656285ms`。
- `node --test frontend/tests/*.test.ts`: 通过，327 个前端状态辅助测试全部通过，耗时 `2805.335307ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1.16s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRuntimeController.ts` 与 `frontend/tests/gatewayRuntimeController.test.ts`: 通过，未发现空白错误。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 165 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 166: 网关实时刷新 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 新增导出的 `refreshGatewayRealtimeData(...)` runtime helper，通过注入自动刷新节流函数、AbortController slot、overview/routes/logs 请求函数、当前日志 getter、路由 normalize、响应式 setter、活跃请求刷新函数和 abort 判断函数执行实时刷新；`GatewayView.vue` 的 `refreshRealtimeData` 改为委托 `gatewayRuntime.refreshRealtimeData(...)`，不再直接编排实时刷新 Promise、应用计划和 controller 清理。
- 文件长度检查: `GatewayView.vue` 当前为 1386 行，`gatewayRuntimeController.ts` 为 491 行，`gatewayRuntimeController.test.ts` 为 1348 行。相比任务 165 结束时，`GatewayView.vue` 从 1401 行降至 1386 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于 `gatewayRuntimeController.ts` 尚未导出 `refreshGatewayRealtimeData`。
- 绿灯修正: 目标测试续跑曾暴露新增测试的 `requestLogs` 参数形态与真实 `getGatewayLogs(80, { signal })` 不一致；已将测试修正为真实接口形态，并将 `GatewayView.vue` 中的 `setLogs` 注入改为显式闭包。
- 行为锁定: 新测试覆盖实时刷新会按监控/日志抽屉计划加载 overview、routes、logs，写入 overview/routes/priorityRoutes/logs，并在监控态刷新活跃请求；节流拒绝时不发请求；abort 过期、组件卸载和优先级编辑中均保持既有不应用或不覆盖边界。
- 副作用边界: 本任务未改变真实 API 地址、请求参数、日志加载条件、优先级弹窗保护、AbortController slot 替换和清理语义、自动刷新节流语义或 toast 文案来源；只是把 `refreshRealtimeData` 的副作用编排从视图迁入 runtime controller。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，33 个 runtime controller 测试全部通过，耗时 `210.607724ms`。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，272 个网关相关测试全部通过，耗时 `1987.550154ms`。
- `node --test frontend/tests/*.test.ts`: 通过，331 个前端状态辅助测试全部通过，耗时 `2071.941211ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3402` 个模块完成转换，构建耗时 `1m 14s`。仍有既有大 chunk 警告和 plugin timing 提示。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRuntimeController.ts` 与 `frontend/tests/gatewayRuntimeController.test.ts`: 通过，未发现空白错误。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 166 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 167: 网关 runtime load controller 职责拆分

日期: 2026-05-26

- 范围: `frontend/src/gatewayRuntimeController.ts`、`frontend/src/gatewayRuntimeLoadController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 新增 `gatewayRuntimeLoadController.ts`，将 `loadGatewayActiveRequests(...)`、`loadGatewayUsage(...)`、`refreshGatewayRealtimeData(...)` 三个带请求副作用的 runtime load helper 从聚合 controller 中拆出；`gatewayRuntimeController.ts` 继续导入并重新导出同名 helper，`useGatewayRuntimeController()` 对外方法名保持不变。
- 文件长度检查: `GatewayView.vue` 当前为 1386 行，`gatewayRuntimeController.ts` 当前为 261 行，`gatewayRuntimeLoadController.ts` 为 263 行，`gatewayRuntimeController.test.ts` 为 1358 行。相比任务 166 结束时，`gatewayRuntimeController.ts` 从 491 行降至 261 行，`GatewayView.vue` 未改动。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于 `gatewayRuntimeController.ts` 尚未从 `./gatewayRuntimeLoadController.ts` 导入 load helper，且仍直接定义 `export async function loadGatewayActiveRequests`、`loadGatewayUsage`、`refreshGatewayRealtimeData`。
- 绿灯修正: 拆分后首次目标测试失败于 `gatewayRuntimeController.ts` 仍兼容导出 `buildGatewayRealtimeRefreshApplyPlan` 但缺少本地 import；补回 import 后目标测试通过。
- 行为锁定: 新源码边界测试确认聚合 controller 通过专门 load module 承接 runtime 副作用 helper，且不再直接定义三个 async load/refresh helper；既有 runtime 行为测试继续覆盖用量加载、活跃请求加载、实时刷新、节流、abort、mounted-out 和优先级编辑保护。
- 副作用边界: 本任务未改 `GatewayView.vue`、真实 API 地址、请求参数、AbortController slot 语义、自动刷新节流语义、toast 文案来源或 `useGatewayRuntimeController()` 对外字段；只是按职责拆分 runtime controller 文件。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，34 个 runtime controller 测试全部通过，耗时 `1816.352808ms`。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，273 个网关相关测试全部通过，耗时 `2742.060925ms`。
- `node --test frontend/tests/*.test.ts`: 通过，332 个前端状态辅助测试全部通过，耗时 `3032.397849ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3403` 个模块完成转换，构建耗时 `1m 9s`。仍有既有大 chunk 警告和 plugin timing 提示。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRuntimeController.ts`、`frontend/src/gatewayRuntimeLoadController.ts` 与 `frontend/tests/gatewayRuntimeController.test.ts`: 通过，未发现空白错误。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 167 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 168: 网关初始数据加载 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeController.ts`、`frontend/src/gatewayRuntimeLoadController.ts`、`frontend/src/gatewayInitialDataLoadController.ts`、`frontend/src/gatewayInitialDataLoadModel.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 新增 `gatewayInitialDataLoadController.ts` 承接 `loadGatewayData(...)` 初始加载副作用编排，`GatewayView.vue` 的 `loadData()` 改为通过 `gatewayRuntime.loadData(...)` 注入 overview、settings、routes、logs、site groups、usage、active requests 请求函数、AbortController slot、setter、route normalize、active request snapshot 应用和 notice 执行函数；`gatewayRuntimeController.ts` 继续兼容导出 `loadGatewayData`，`useGatewayRuntimeController()` 对外字段保持 `loadData` 不变。
- 文件长度检查: `GatewayView.vue` 当前为 1372 行，`gatewayRuntimeController.ts` 为 252 行，`gatewayRuntimeLoadController.ts` 为 263 行，`gatewayInitialDataLoadController.ts` 为 165 行，`gatewayInitialDataLoadModel.ts` 为 94 行，`gatewayRuntimeController.test.ts` 为 1530 行。相比任务 167 结束时，`GatewayView.vue` 从 1386 行降至 1372 行，runtime 聚合 controller 从 261 行降至 252 行，runtime load controller 保持 263 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于 `gatewayRuntimeController.ts` 尚未导出 `loadGatewayData`；补充源码边界测试后再次失败于聚合 controller 尚未从 `./gatewayInitialDataLoadController.ts` 导入，且 `gatewayRuntimeLoadController.ts` 仍直接导出 `loadGatewayData`。
- 绿灯修正: 将初始数据加载计划模型下沉到 `gatewayInitialDataLoadModel.ts`，将 `loadGatewayData(...)` 移入独立 controller；构建验证曾暴露 `GatewayView.vue` 的 `GatewayLog` 类型导入已无使用，已移除该无用导入。
- 行为锁定: 新测试覆盖初始加载通过注入依赖并发读取 overview、settings、routes、logs、site groups、usage、active requests，按 mounted/abort/monitor/usage snapshot 计划写入响应式状态并保持活跃请求快照应用边界；源码边界测试确认 `GatewayView.vue` 不再直接编排初始加载 `Promise.all` 和初始加载 plan。
- 副作用边界: 本任务未改变真实 API 地址、请求参数、日志加载限制 `80`、`includeDisabled`、usage range、AbortController slot 清理、mounted-out 保护、初始加载错误提示文案或 `useGatewayRuntimeController()` 对外字段；只是把 `loadData()` 的副作用编排从视图迁入专门 runtime controller。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，36 个 runtime controller 测试全部通过，耗时 `2405.385533ms`。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，275 个网关相关测试全部通过，耗时 `2372.187145ms`。
- `node --test frontend/tests/*.test.ts`: 通过，334 个前端状态辅助测试全部通过，耗时 `1852.780514ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3404` 个模块完成转换，构建耗时 `27.56s`。仍有既有大 chunk 警告和 plugin timing 提示。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRuntimeController.ts`、`frontend/src/gatewayRuntimeLoadController.ts`、`frontend/src/gatewayInitialDataLoadController.ts`、`frontend/src/gatewayInitialDataLoadModel.ts` 与 `frontend/tests/gatewayRuntimeController.test.ts`: 通过，未发现空白错误。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 168 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 169: 网关路由日志加载 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteLogsController.ts`、`frontend/tests/gatewayRouteLogsController.test.ts`。
- 改动: 新增 `loadGatewayRouteLogs(...)` controller helper，通过注入 `requestLogs`、drawer open/loading/log setter/clearer 和 notice 执行函数加载单路由请求历史；`GatewayView.vue` 的 `openRouteLogs(route)` 改为委托 `loadGatewayRouteLogs(...)`，不再直接编排 loading、`getGatewayRouteLogs(route.id, 120)`、错误 plan 和清空日志。
- 文件长度检查: `GatewayView.vue` 当前为 1367 行，`gatewayRouteLogsController.ts` 为 78 行，`gatewayRouteLogsController.test.ts` 为 174 行。相比任务 168 结束时，`GatewayView.vue` 从 1372 行降至 1367 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteLogsController.test.ts` 首次失败于 `gatewayRouteLogsController.ts` 尚未导出 `loadGatewayRouteLogs`。
- 行为锁定: 新测试覆盖成功加载时按 route id 和固定 limit `120` 调用注入请求函数、打开 drawer、写入 logs、loading true/false；失败时复用 `buildGatewayRouteLogsErrorPlan`，显示错误提示、按 `shouldClearLogs` 清空日志并复位 loading；源码边界测试确认 `GatewayView.vue` 只委托 controller。
- 副作用边界: 本任务未改变真实 API 地址、路由日志 limit `120`、drawer 打开语义、搜索清空语义、错误提示文案、失败后清空日志规则或表格展示逻辑；只是把 `openRouteLogs()` 的副作用编排从视图迁入 route logs controller。
- `node --test frontend/tests/gatewayRouteLogsController.test.ts`: 通过，5 个 route logs controller 测试全部通过，耗时 `15351.698587ms`。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，278 个网关相关测试全部通过，耗时 `4787.44842ms`。
- `node --test frontend/tests/*.test.ts`: 通过，337 个前端状态辅助测试全部通过，耗时 `3359.224238ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3404` 个模块完成转换，构建耗时 `1m 7s`。仍有既有大 chunk 警告和 plugin timing 提示。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteLogsController.ts` 与 `frontend/tests/gatewayRouteLogsController.test.ts`: 通过，未发现空白错误。
- 缓存清理: 已删除本轮可再生成产物和系统缓存 `frontend/dist`、`.DS_Store`、`docs/.DS_Store`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 169 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 170: 网关路由诊断加载 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteDiagnosisController.ts`、`frontend/tests/gatewayRouteDiagnosisController.test.ts`。
- 改动: 新增 `loadGatewayRouteDiagnosis(...)` controller helper，通过注入 `requestDiagnosis`、drawer open/loading/diagnosis setter 和 notice 执行函数加载单路由诊断；`GatewayView.vue` 的 `openRouteDiagnosis(route)` 改为委托 `loadGatewayRouteDiagnosis(...)`，不再直接编排 loading、`diagnoseGatewayRoute(route.id)`、错误 plan 和 finally 复位。
- 文件长度检查: `GatewayView.vue` 当前为 1364 行，`gatewayRouteDiagnosisController.ts` 为 63 行，`gatewayRouteDiagnosisController.test.ts` 为 148 行。相比任务 169 结束时，`GatewayView.vue` 从 1367 行降至 1364 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteDiagnosisController.test.ts` 首次失败于 `gatewayRouteDiagnosisController.ts` 尚未导出 `loadGatewayRouteDiagnosis`。
- 行为锁定: 新测试覆盖成功加载时按 route id 调用注入请求函数、打开 drawer、写入 diagnosis、loading true/false；失败时复用 `buildGatewayRouteDiagnosisErrorPlan` 显示错误提示并复位 loading；源码边界测试确认 `GatewayView.vue` 只委托 controller。
- 副作用边界: 本任务未改变真实 API 地址、路由诊断请求参数、drawer 打开语义、打开时清空旧诊断语义、错误提示文案或诊断抽屉展示逻辑；只是把 `openRouteDiagnosis()` 的副作用编排从视图迁入 route diagnosis controller。
- `node --test frontend/tests/gatewayRouteDiagnosisController.test.ts`: 通过，5 个 route diagnosis controller 测试全部通过，耗时 `2037.118191ms`。
- `node --test frontend/tests/gateway*Component.test.ts frontend/tests/gateway*Controller.test.ts frontend/tests/gateway*Model.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，281 个网关相关测试全部通过，耗时 `3191.110676ms`。
- `node --test frontend/tests/*.test.ts`: 通过，340 个前端状态辅助测试全部通过，耗时 `6097.504427ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3404` 个模块完成转换，构建耗时 `30.63s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteDiagnosisController.ts` 与 `frontend/tests/gatewayRouteDiagnosisController.test.ts`: 通过，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 与 `docs/.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 170 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 171: 网关优先级列表加载 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityController.ts`、`frontend/tests/gatewayPriorityController.test.ts`、`frontend/tests/gatewayPriorityModel.test.ts`。
- 改动: 新增 `loadGatewayPriorityRoutes(...)` controller helper，通过注入 `requestRoutes`、`normalizeRoute`、dialog open/loading/routes/select setter 和 notice 执行函数加载优先级弹窗全量路由；`GatewayView.vue` 的 `openPriorityDialog(route)` 改为委托 `loadGatewayPriorityRoutes(...)`，不再直接编排 `priorityDialog.openDialog`、loading、`getGatewayRoutes({ includeDisabled: true })`、路由归一化、错误计划和选中路由恢复。
- 文件长度检查: `GatewayView.vue` 当前为 1365 行，`gatewayPriorityController.ts` 为 87 行，`gatewayPriorityController.test.ts` 为 172 行，`gatewayPriorityModel.test.ts` 为 250 行。相比任务 170 结束时，`GatewayView.vue` 从 1364 行变为 1365 行，因为视图侧保留了更显式的依赖注入接线。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayPriorityModel.test.ts` 首次失败于 `gatewayPriorityController.ts` 尚未导出 `loadGatewayPriorityRoutes`。
- 行为锁定: 新测试覆盖成功加载时先打开弹窗、loading true/false、按 `{ includeDisabled: true }` 调用注入请求函数、逐项执行 `normalizeRoute`、写入弹窗路由列表并恢复当前选中路由；失败时复用 `buildGatewayPriorityListLoadErrorPlan` 显示错误提示，不写入路由列表、不恢复选中路由并复位 loading；源码边界测试确认 `GatewayView.vue` 只委托 controller。
- 旧边界同步: 移除 `gatewayPriorityModel.test.ts` 中要求 `GatewayView.openPriorityDialog` 直接调用 `buildGatewayPriorityListLoadErrorPlan(err)` 的源码断言，避免 model 测试继续绑定已迁出的 controller 职责；错误计划本身仍由模型测试覆盖。
- 副作用边界: 本任务未改变真实 API 地址、优先级列表请求参数、路由归一化规则、弹窗打开语义、当前路由选中恢复语义、错误提示文案、优先级移动或预设重排流程；只是把 `openPriorityDialog()` 的列表加载副作用编排从视图迁入 priority controller。
- `node --test frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayPriorityModel.test.ts`: 通过，20 个优先级 controller/model 测试全部通过，耗时 `3174.524321ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，284 个网关相关测试全部通过，耗时 `2793.190638ms`。
- `node --test frontend/tests/*.test.ts`: 通过，342 个前端状态辅助测试全部通过，耗时 `10474.559747ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3404` 个模块完成转换，构建耗时 `40.18s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayPriorityController.ts`、`frontend/tests/gatewayPriorityController.test.ts` 与 `frontend/tests/gatewayPriorityModel.test.ts`: 通过，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 与 `docs/.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 171 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 172: 网关优先级移动 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityController.ts`、`frontend/tests/gatewayPriorityController.test.ts`、`frontend/tests/gatewayPriorityModel.test.ts`。
- 改动: 新增 `moveGatewayPriorityRoute(...)` controller helper，通过注入 `requestReorder`、`applyReorderedRoutes`、dialog loading/select setter、validation notice 和 plan notice 执行函数完成优先级移动；`GatewayView.vue` 的 `handlePriorityMove()` 改为委托 `moveGatewayPriorityRoute(...)`，不再直接编排目标校验、`reorderGatewayRoutePriorities(request.payload)`、重排结果应用、成功计划、失败计划和 loading 复位。
- 文件长度检查: `GatewayView.vue` 当前为 1348 行，`gatewayPriorityController.ts` 为 144 行，`gatewayPriorityController.test.ts` 为 319 行，`gatewayPriorityModel.test.ts` 为 214 行。相比任务 171 结束时，`GatewayView.vue` 从 1365 行降至 1348 行。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayPriorityModel.test.ts` 首次失败于 `gatewayPriorityController.ts` 尚未导出 `moveGatewayPriorityRoute`。
- 行为锁定: 新测试覆盖成功移动时按 `buildGatewayPriorityMoveRequest` 生成 `{ route_id, mode: 'move', index }` 并截断目标优先级、调用注入重排请求、应用重排路由、恢复选中路由、显示成功计划并复位 loading；目标优先级缺失时只显示 validation notice 且不发请求；当前选中路由为空时不产生副作用；请求失败时复用 `buildGatewayPriorityMoveErrorPlan` 显示错误提示且复位 loading；源码边界测试确认 `GatewayView.vue` 只委托 controller。
- 旧边界同步: 移除 `gatewayPriorityModel.test.ts` 中要求 `GatewayView.handlePriorityMove` 直接调用 move request、move success 和 move error plan 的源码断言，避免 model 测试继续绑定已迁出的 controller 职责；对应模型函数本身仍由模型测试覆盖。
- 绿灯修正: 首轮实现后目标测试只剩旧列表加载源码断言要求 priority controller import 仅含两个名字；已将断言同步为包含 `moveGatewayPriorityRoute` 的新 controller import 边界，生产逻辑未因此调整。
- 副作用边界: 本任务未改变真实 API 地址、优先级移动 payload 语义、目标优先级校验文案、重排结果应用规则、当前路由选中恢复语义、成功或失败提示文案、优先级列表加载或预设重排流程；只是把 `handlePriorityMove()` 的移动副作用编排从视图迁入 priority controller。
- `node --test frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayPriorityModel.test.ts`: 通过，22 个优先级 controller/model 测试全部通过，耗时 `312.834511ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，286 个网关相关测试全部通过，耗时 `2078.480574ms`。
- `node --test frontend/tests/*.test.ts`: 通过，344 个前端状态辅助测试全部通过，耗时 `10600.831819ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3404` 个模块完成转换，构建耗时 `32.16s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayPriorityController.ts`、`frontend/tests/gatewayPriorityController.test.ts` 与 `frontend/tests/gatewayPriorityModel.test.ts`: 通过，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 与 `docs/.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 172 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 173: 网关优先级预设重排 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityController.ts`、`frontend/tests/gatewayPriorityController.test.ts`、`frontend/tests/gatewayPriorityModel.test.ts`。
- 改动: 新增 `presetGatewayPriorityRoutes(...)` controller helper，通过注入 `requestReorder`、`applyReorderedRoutes`、dialog loading/clear/select setter 和 plan notice 执行函数完成套餐优先或余额优先重排；`GatewayView.vue` 的 `handlePriorityPreset(mode)` 改为委托 `presetGatewayPriorityRoutes(...)`，不再直接编排 `buildGatewayPriorityPresetPayload(mode)`、`reorderGatewayRoutePriorities(...)`、重排结果应用、目标优先级清空、选中路由恢复、成功计划、失败计划和 loading 复位。
- 文件长度检查: `GatewayView.vue` 当前为 1346 行，`gatewayPriorityController.ts` 为 190 行，`gatewayPriorityController.test.ts` 为 409 行，`gatewayPriorityModel.test.ts` 为 187 行。相比任务 172 结束时，`GatewayView.vue` 从 1348 行降至 1346 行。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayPriorityModel.test.ts` 首次失败于 `gatewayPriorityController.ts` 尚未导出 `presetGatewayPriorityRoutes`。
- 行为锁定: 新测试覆盖成功预设重排时按 mode 生成 `{ mode: 'balance' }` 或 `{ mode: 'package' }` payload、调用注入重排请求、应用重排路由、清空目标优先级、恢复当前选中路由、显示对应成功计划并复位 loading；请求失败时复用 `buildGatewayPriorityPresetErrorPlan` 显示错误提示，不应用路由、不清空目标优先级、不恢复选中路由并复位 loading；源码边界测试确认 `GatewayView.vue` 只委托 controller。
- 旧边界同步: 移除 `gatewayPriorityModel.test.ts` 中要求 `GatewayView.handlePriorityPreset` 直接调用 preset success 和 preset error plan 的源码断言，避免 model 测试继续绑定已迁出的 controller 职责；对应模型函数本身仍由模型测试覆盖。
- 绿灯修正: 首轮实现后目标测试只剩 priority controller import 断言仍按单行 import 匹配；已改为可匹配多行 import 的源码边界，生产逻辑未因此调整。
- 副作用边界: 本任务未改变真实 API 地址、预设重排 payload 语义、重排结果应用规则、目标优先级清空语义、当前路由选中恢复语义、成功或失败提示文案、优先级列表加载或移动流程；只是把 `handlePriorityPreset()` 的预设重排副作用编排从视图迁入 priority controller。
- `node --test frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayPriorityModel.test.ts`: 通过，23 个优先级 controller/model 测试全部通过，耗时 `265.544018ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，287 个网关相关测试全部通过，耗时 `2722.775976ms`。
- `node --test frontend/tests/*.test.ts`: 通过，345 个前端状态辅助测试全部通过，耗时 `1988.792377ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3404` 个模块完成转换，构建耗时 `37.60s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayPriorityController.ts`、`frontend/tests/gatewayPriorityController.test.ts` 与 `frontend/tests/gatewayPriorityModel.test.ts`: 通过，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 与 `docs/.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 173 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 174: 网关路由摘要刷新 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteSummaryController.ts`、`frontend/tests/gatewayRouteSummaryController.test.ts`。
- 改动: 新增 `refreshGatewayRouteSummaries(...)` controller helper，通过注入当前路由、摘要请求函数、路由 setter 和 plan notice 执行函数完成路由摘要刷新；`GatewayView.vue` 的 `refreshRouteSummaries()` 改为委托该 controller，不再直接编排刷新计划、`refreshSiteSummaries({ site_ids })`、摘要合并和错误提示。
- 文件长度检查: `GatewayView.vue` 当前为 1341 行，`gatewayRouteSummaryController.ts` 为 34 行，`gatewayRouteSummaryController.test.ts` 为 153 行，`gatewayRouteStateModel.ts` 为 207 行，`gatewayRouteStateModel.test.ts` 为 489 行。相比任务 173 结束时，`GatewayView.vue` 从 1346 行降至 1341 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteSummaryController.test.ts frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于 `ERR_MODULE_NOT_FOUND`，确认 `gatewayRouteSummaryController.ts` 尚不存在。
- 行为锁定: 新测试覆盖无路由时不发请求、不写路由、不提示错误；有路由时按唯一 `site_id` 列表请求摘要并复用 `applyGatewaySiteSummaries` 写回套餐和签到状态；请求失败时复用 `buildGatewayRouteSummaryRefreshErrorPlan` 显示错误提示且不写路由；源码边界测试确认 `GatewayView.vue` 只委托 controller。
- 副作用边界: 本任务未改变真实 API 地址、摘要刷新请求 payload、站点摘要合并规则、错误提示文案、自动刷新调度、手动刷新、余额更新后刷新或路由探测后刷新流程；只是把 `refreshRouteSummaries()` 的摘要刷新副作用编排从视图迁入 route summary controller。
- `node --test frontend/tests/gatewayRouteSummaryController.test.ts frontend/tests/gatewayRouteStateModel.test.ts`: 通过，26 个 route summary/controller state model 测试全部通过，耗时 `361.261771ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，291 个网关相关测试全部通过，耗时 `7160.840489ms`。
- `node --test frontend/tests/*.test.ts`: 通过，349 个前端状态辅助测试全部通过，耗时 `2304.45943ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3405` 个模块完成转换，构建耗时 `30.28s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteSummaryController.ts` 与 `frontend/tests/gatewayRouteSummaryController.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 说明: 额外尝试过 `npx vue-tsc --noEmit --ignoreConfig ... src/gatewayRouteSummaryController.ts tests/gatewayRouteSummaryController.test.ts`，但脱离项目 tsconfig 后会重新按 NodeNext 严格规则检查既有依赖链，报出既有 `gatewayRouteConcurrency.ts`、`gatewayViewConfig.ts` 导入扩展名和 Ant Design 类型解析问题；项目级 `npm run build` 已覆盖 `vue-tsc -b` 并通过。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 174 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 175: 网关路由启用状态切换 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteToggleController.ts`、`frontend/tests/gatewayRouteToggleController.test.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `toggleGatewayRouteEnabled(...)` controller helper，通过注入当前路由、真实切换请求、动作后 reload helper 和 plan notice 执行函数完成单路由启用/禁用切换；`GatewayView.vue` 的 `handleToggle(route)` 改为委托该 controller，不再直接编排 `toggleGatewayRoute(route.id)`、成功/失败计划和 reload。
- 文件长度检查: `GatewayView.vue` 当前为 1335 行，`gatewayRouteToggleController.ts` 为 33 行，`gatewayRouteToggleController.test.ts` 为 131 行，`gatewayRouteStateModel.ts` 为 207 行，`gatewayRouteStateModel.test.ts` 为 476 行，`gatewayViewModel.test.ts` 为 324 行。相比任务 174 结束时，`GatewayView.vue` 从 1341 行降至 1335 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteToggleController.test.ts frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于 `ERR_MODULE_NOT_FOUND`，确认 `gatewayRouteToggleController.ts` 尚不存在。
- 行为锁定: 新测试覆盖成功切换时按 route id 调用注入请求函数、按切换前启用状态显示成功计划、随后调用 reload；请求失败时复用 `buildGatewayRouteToggleErrorPlan` 显示错误提示且不 reload；reload 失败时保留既有先成功提示、再错误提示的顺序；源码边界测试确认 `GatewayView.vue` 只委托 controller。
- 旧边界同步: 移除 `gatewayRouteStateModel.test.ts` 中要求 `GatewayView.handleToggle` 直接调用 toggle success plan 的源码断言；模型函数本身的成功/失败计划测试仍保留。同步调整 `gatewayViewModel.test.ts` 的 reload helper 断言，允许 `handleToggle` 通过 `reloadGatewayData: reloadGatewayDataAfterAction` 注入集中 reload helper。
- 副作用边界: 本任务未改变真实 API 地址、切换请求参数、成功或失败提示文案、动作后 reload helper、reload 失败时的提示顺序、批量禁用、仅启用单路由或重置熔断流程；只是把 `handleToggle()` 的副作用编排从视图迁入 route toggle controller。
- `node --test frontend/tests/gatewayRouteToggleController.test.ts frontend/tests/gatewayRouteStateModel.test.ts`: 通过，25 个 route toggle/controller state model 测试全部通过，耗时 `217.712434ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，294 个网关相关测试全部通过，耗时 `2729.860159ms`。
- `node --test frontend/tests/*.test.ts`: 通过，352 个前端状态辅助测试全部通过，耗时 `2827.239591ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3406` 个模块完成转换，构建耗时 `44.43s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteToggleController.ts` 与 `frontend/tests/gatewayRouteToggleController.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 175 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 176: 网关路由熔断重置 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteCircuitController.ts`、`frontend/tests/gatewayRouteCircuitController.test.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `resetGatewayRouteCircuitState(...)` controller helper，通过注入当前路由、真实重置请求、动作后 reload helper 和 plan notice 执行函数完成单路由熔断重置；`GatewayView.vue` 的 `handleResetCircuit(route)` 改为委托该 controller，不再直接编排 `resetGatewayRouteCircuit(route.id)`、成功/失败计划和 reload。
- 文件长度检查: `GatewayView.vue` 当前为 1331 行，`gatewayRouteCircuitController.ts` 为 31 行，`gatewayRouteCircuitController.test.ts` 为 131 行，`gatewayRouteStateModel.ts` 为 207 行，`gatewayRouteStateModel.test.ts` 为 464 行，`gatewayViewModel.test.ts` 为 324 行。相比任务 175 结束时，`GatewayView.vue` 从 1335 行降至 1331 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteCircuitController.test.ts frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于 `ERR_MODULE_NOT_FOUND`，确认 `gatewayRouteCircuitController.ts` 尚不存在。
- 行为锁定: 新测试覆盖成功重置时按 route id 调用注入请求函数、显示 `buildGatewayResetCircuitSuccessPlan()` 成功提示、随后调用 reload；请求失败时复用 `buildGatewayResetCircuitErrorPlan` 显示错误提示且不 reload；reload 失败时保留既有先成功提示、再错误提示的顺序；源码边界测试确认 `GatewayView.vue` 只委托 controller。
- 旧边界同步: 移除 `gatewayRouteStateModel.test.ts` 中要求 `GatewayView.handleResetCircuit` 直接调用 reset success plan 的源码断言；模型函数本身的成功/失败计划测试仍保留。同步调整 `gatewayViewModel.test.ts` 的 reload helper 断言，允许 `handleResetCircuit` 通过 `reloadGatewayData: reloadGatewayDataAfterAction` 注入集中 reload helper。
- 副作用边界: 本任务未改变真实 API 地址、熔断重置请求参数、成功或失败提示文案、动作后 reload helper、reload 失败时的提示顺序、路由启用切换、批量禁用或仅启用单路由流程；只是把 `handleResetCircuit()` 的副作用编排从视图迁入 route circuit controller。
- `node --test frontend/tests/gatewayRouteCircuitController.test.ts frontend/tests/gatewayRouteStateModel.test.ts`: 通过，24 个 route circuit/controller state model 测试全部通过，耗时 `521.5333ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，297 个网关相关测试全部通过，耗时 `2601.519783ms`。
- `node --test frontend/tests/*.test.ts`: 通过，355 个前端状态辅助测试全部通过，耗时 `2692.016196ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3407` 个模块完成转换，构建耗时 `31.33s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteCircuitController.ts` 与 `frontend/tests/gatewayRouteCircuitController.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 176 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 177: 网关批量禁用路由 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteDisableController.ts`、`frontend/tests/gatewayRouteDisableController.test.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `disableAllGatewayRoutesWithConfirmation(...)` controller helper，通过注入确认函数、真实批量禁用请求、动作后 reload helper 和 plan notice 执行函数完成批量禁用路由；`GatewayView.vue` 的 `handleDisableAllRoutes()` 改为委托该 controller，不再直接编排 `window.confirm(...)`、`disableAllGatewayRoutes()`、成功/失败计划和 reload。
- 文件长度检查: `GatewayView.vue` 当前为 1322 行，`gatewayRouteDisableController.ts` 为 36 行，`gatewayRouteDisableController.test.ts` 为 115 行，`gatewayRouteStateModel.ts` 为 207 行，`gatewayRouteStateModel.test.ts` 为 451 行，`gatewayViewModel.test.ts` 为 324 行。相比任务 176 结束时，`GatewayView.vue` 从 1331 行降至 1322 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteDisableController.test.ts frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于 `ERR_MODULE_NOT_FOUND`，确认 `gatewayRouteDisableController.ts` 尚不存在。
- 绿灯修正: 首轮实现后目标测试暴露新 controller 内部 import 缺少 `.ts` 扩展，Node ESM 直跑测试无法解析 `./gatewayRouteStateModel`；已按现有 controller 模式修正为 `./gatewayRouteStateModel.ts`。
- 行为锁定: 新测试覆盖确认取消时不发请求、不 reload、不提示；确认后按注入请求函数禁用全部路由并显示 `buildGatewayDisableAllRoutesSuccessPlan({ disabledCount })` 成功提示，随后调用 reload；请求失败时复用 `buildGatewayDisableAllRoutesErrorPlan` 显示错误提示且不 reload；reload 失败时保留既有先成功提示、再错误提示的顺序；源码边界测试确认 `GatewayView.vue` 只委托 controller。
- 旧边界同步: 移除 `gatewayRouteStateModel.test.ts` 中要求 `GatewayView.handleDisableAllRoutes` 直接调用 disable-all success plan 的源码断言；模型函数本身的成功/失败计划测试仍保留。同步调整 `gatewayViewModel.test.ts` 的 reload helper 断言，允许 `handleDisableAllRoutes` 通过 `reloadGatewayData: reloadGatewayDataAfterAction` 注入集中 reload helper。
- 副作用边界: 本任务未改变真实 API 地址、批量禁用确认文案、批量禁用请求参数、成功或失败提示文案、动作后 reload helper、reload 失败时的提示顺序、路由启用切换、熔断重置或仅启用单路由流程；只是把 `handleDisableAllRoutes()` 的副作用编排从视图迁入 route disable controller。
- `node --test frontend/tests/gatewayRouteDisableController.test.ts frontend/tests/gatewayRouteStateModel.test.ts`: 通过，24 个 route disable/controller state model 测试全部通过，耗时 `444.941476ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，301 个网关相关测试全部通过，耗时 `8828.737721ms`。
- `node --test frontend/tests/*.test.ts`: 通过，359 个前端状态辅助测试全部通过，耗时 `2075.98114ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3408` 个模块完成转换，构建耗时 `52.37s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteDisableController.ts` 与 `frontend/tests/gatewayRouteDisableController.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 177 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 178: 网关仅启用单路由 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteEnableOnlyController.ts`、`frontend/tests/gatewayRouteEnableOnlyController.test.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `enableOnlyGatewayRouteWithConfirmation(...)` controller helper，通过注入当前路由、确认函数、真实仅启用请求、动作后 reload helper 和 plan notice 执行函数完成仅启用单路由；`GatewayView.vue` 的 `handleEnableOnlyRoute(route)` 改为委托该 controller，不再直接编排 `window.confirm(...)`、`enableOnlyGatewayRoute(route.id)`、成功/失败计划和 reload。
- 文件长度检查: `GatewayView.vue` 当前为 1316 行，`gatewayRouteEnableOnlyController.ts` 为 37 行，`gatewayRouteEnableOnlyController.test.ts` 为 165 行，`gatewayRouteStateModel.ts` 为 207 行，`gatewayRouteStateModel.test.ts` 为 439 行，`gatewayViewModel.test.ts` 为 329 行。相比任务 177 结束时，`GatewayView.vue` 从 1322 行降至 1316 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteEnableOnlyController.test.ts frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于 `ERR_MODULE_NOT_FOUND`，确认 `gatewayRouteEnableOnlyController.ts` 尚不存在。
- 行为锁定: 新测试覆盖确认取消时不发请求、不 reload、不提示；确认后按 route id 调用注入请求函数并显示 `buildGatewayEnableOnlyRouteSuccessPlan()` 成功提示，随后调用 reload；请求失败时复用 `buildGatewayEnableOnlyRouteErrorPlan` 显示错误提示且不 reload；reload 失败时保留既有先成功提示、再错误提示的顺序；源码边界测试确认 `GatewayView.vue` 只委托 controller。
- 旧边界同步: 移除 `gatewayRouteStateModel.test.ts` 中要求 `GatewayView.handleEnableOnlyRoute` 直接调用 enable-only success plan 的源码断言；模型函数本身的成功/失败计划测试仍保留。同步调整 `gatewayViewModel.test.ts` 的 reload helper 断言，允许 `handleEnableOnlyRoute` 通过 `reloadGatewayData: reloadGatewayDataAfterAction` 注入集中 reload helper。
- 副作用边界: 本任务未改变真实 API 地址、仅启用确认文案、仅启用请求参数、成功或失败提示文案、动作后 reload helper、reload 失败时的提示顺序、路由启用切换、批量禁用或熔断重置流程；只是把 `handleEnableOnlyRoute()` 的副作用编排从视图迁入 route enable-only controller。
- `node --test frontend/tests/gatewayRouteEnableOnlyController.test.ts frontend/tests/gatewayRouteStateModel.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，31 个 route enable-only/controller state model/view model 测试全部通过，耗时 `293.883479ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，305 个网关相关测试全部通过，耗时 `6692.666068ms`。
- `node --test frontend/tests/*.test.ts`: 通过，363 个前端状态辅助测试全部通过，耗时 `2663.99661ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3409` 个模块完成转换，构建耗时 `44.85s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteEnableOnlyController.ts` 与 `frontend/tests/gatewayRouteEnableOnlyController.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 178 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 179: 网关设置保存 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewaySettingsController.ts`、`frontend/tests/gatewaySettingsController.test.ts`、`frontend/tests/gatewaySettingsModel.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `saveGatewaySettings(...)` controller helper，通过注入当前设置表单、真实保存请求、设置弹窗 loading/set/close 方法、动作后 reload helper 和 plan notice 执行函数完成网关设置保存；`GatewayView.vue` 的 `saveSettings()` 改为委托该 controller，不再直接编排 `updateGatewaySettings(settingsForm)`、设置回填、关闭弹窗、成功/失败计划和 reload。
- 文件长度检查: `GatewayView.vue` 当前为 1310 行，`gatewaySettingsController.ts` 为 78 行，`gatewaySettingsController.test.ts` 为 197 行，`gatewaySettingsModel.ts` 为 74 行，`gatewaySettingsModel.test.ts` 为 132 行，`gatewayViewModel.test.ts` 为 330 行。相比任务 178 结束时，`GatewayView.vue` 从 1316 行降至 1310 行。
- TDD 红灯: `node --test frontend/tests/gatewaySettingsController.test.ts frontend/tests/gatewaySettingsModel.test.ts frontend/tests/gatewayViewModel.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewaySettingsController.ts' does not provide an export named 'saveGatewaySettings'`，确认 controller helper 尚未存在。
- 行为锁定: 新测试覆盖保存成功时设置 loading true、按原 settings 对象调用注入请求、写回保存结果、关闭弹窗、显示 `buildGatewaySettingsSaveSuccessPlan()` 成功提示、随后 reload 并复位 loading；请求失败时复用 `buildGatewaySettingsSaveErrorPlan` 显示错误提示，不写设置、不关闭弹窗、不 reload，并复位 loading；reload 失败时保留既有先成功提示、再错误提示的顺序；源码边界测试确认 `GatewayView.vue` 只委托 controller。
- 旧边界同步: 移除 `gatewaySettingsModel.test.ts` 中要求 `GatewayView.saveSettings` 直接调用 settings save success plan 的源码断言；模型函数本身的成功/失败计划测试仍保留。同步调整 `gatewayViewModel.test.ts` 的 reload helper 断言，允许 `saveSettings` 通过 `reloadGatewayData: reloadGatewayDataAfterAction` 注入集中 reload helper。
- 副作用边界: 本任务未改变真实 API 地址、设置保存 payload、设置表单回填规则、弹窗关闭语义、成功或失败提示文案、动作后 reload helper、reload 失败时的提示顺序、自动刷新或运行态加载流程；只是把 `saveSettings()` 的副作用编排从视图迁入 settings controller。
- `node --test frontend/tests/gatewaySettingsController.test.ts frontend/tests/gatewaySettingsModel.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，21 个 settings controller/model/view model 测试全部通过，耗时 `4437.185571ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，308 个网关相关测试全部通过，耗时 `3928.252637ms`。
- `node --test frontend/tests/*.test.ts`: 通过，366 个前端状态辅助测试全部通过，耗时 `3101.964775ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3409` 个模块完成转换，构建耗时 `47.28s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewaySettingsController.ts` 与 `frontend/tests/gatewaySettingsController.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 179 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 180: 网关请求地址复制 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAccessController.ts`、`frontend/tests/gatewayAccessController.test.ts`、`frontend/tests/gatewayAccessModel.test.ts`。
- 改动: 新增 `copyGatewayRequestUrlToClipboard(...)` controller helper，通过注入请求地址、真实剪贴板写入函数和 plan notice 执行函数完成网关请求地址复制；`GatewayView.vue` 的 `copyGatewayRequestUrl()` 改为委托该 controller，不再直接编排 `navigator.clipboard.writeText(gatewayRequestUrl.value)`、成功计划和失败计划。
- 文件长度检查: `GatewayView.vue` 当前为 1306 行，`gatewayAccessController.ts` 为 27 行，`gatewayAccessController.test.ts` 为 62 行，`gatewayAccessModel.ts` 为 87 行，`gatewayAccessModel.test.ts` 为 137 行。相比任务 179 结束时，`GatewayView.vue` 从 1310 行降至 1306 行。
- TDD 红灯: `node --test frontend/tests/gatewayAccessController.test.ts frontend/tests/gatewayAccessModel.test.ts` 首次失败于 `ERR_MODULE_NOT_FOUND`，缺少 `frontend/src/gatewayAccessController.ts`，确认 controller helper 尚未存在。
- 行为锁定: 新测试覆盖复制成功时按原请求地址调用注入的 `writeText`，并显示 `网关请求地址已复制。`；剪贴板写入失败时显示 `复制失败，请手动复制。`；源码边界测试确认 `GatewayView.vue` 只委托 controller，并保留 `requestUrl: gatewayRequestUrl.value`、`navigator.clipboard.writeText.bind(navigator.clipboard)` 和 `showPlanNotice` 注入。
- 旧边界同步: 移除 `gatewayAccessModel.test.ts` 中要求 `GatewayView.copyGatewayRequestUrl` 直接调用 request URL copy success plan 的源码断言；模型函数本身的请求地址、Codex 地址、API Key 掩码和复制提示计划测试仍保留。
- 副作用边界: 本任务未改变请求 URL 计算、真实 Clipboard API 调用、成功或失败提示文案、网关 API Key 复制流程、访问栏组件绑定、设置弹窗、自动刷新或运行态加载流程；只是把请求地址复制的副作用编排从视图迁入 access controller。
- `node --test frontend/tests/gatewayAccessController.test.ts frontend/tests/gatewayAccessModel.test.ts`: 通过，15 个 access controller/model 测试全部通过，耗时 `327.227333ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，310 个网关相关测试全部通过，耗时 `9851.804696ms`。
- `node --test frontend/tests/*.test.ts`: 通过，368 个前端状态辅助测试全部通过，耗时 `2976.26181ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3410` 个模块完成转换，构建耗时 `41.33s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayAccessController.ts` 与 `frontend/tests/gatewayAccessController.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 180 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 181: 网关 API Key 复制 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAccessController.ts`、`frontend/tests/gatewayAccessController.test.ts`、`frontend/tests/gatewayAccessModel.test.ts`。
- 改动: 在 `gatewayAccessController.ts` 中新增 `copyGatewayApiKeyToClipboard(...)`，通过注入 API Key、真实剪贴板写入函数和 plan notice 执行函数完成网关 API Key 复制；`GatewayView.vue` 的 `copyGatewayApiKey()` 改为委托该 controller，不再直接编排 `normalizeGatewayApiKeyCopyValue`、缺失计划、`navigator.clipboard.writeText(value)`、成功计划和失败计划。
- 文件长度检查: `GatewayView.vue` 当前为 1291 行，`gatewayAccessController.ts` 为 61 行，`gatewayAccessController.test.ts` 为 137 行，`gatewayAccessModel.ts` 为 87 行，`gatewayAccessModel.test.ts` 为 110 行。相比任务 180 结束时，`GatewayView.vue` 从 1306 行降至 1291 行。
- TDD 红灯: `node --test frontend/tests/gatewayAccessController.test.ts frontend/tests/gatewayAccessModel.test.ts` 首次失败于 `ReferenceError: copyGatewayApiKeyToClipboard is not defined`，且源码边界断言确认 `GatewayView.vue` 仍未通过 access controller 委托 API Key 复制。
- 构建红灯: 首次 `npm run build` 失败于 `GatewayView.vue` 向 access controller 注入的 `showPlanNotice` 类型不兼容，原因是 controller 的 notice plan 类型把 `buildGatewayApiKeyMissingPlan` 的 `notice: null` 分支暴露给了视图侧；已将 controller 入参类型收窄为实际可展示 notice，并在缺失分支只传非空 notice。
- 行为锁定: 新测试覆盖 API Key 复制成功时先 trim 再写入剪贴板，并显示 `网关 API Key 已复制。`；API Key 为空时不写剪贴板，并显示 `后端未配置 GATEWAY_API_KEY。`；剪贴板写入失败时显示 `复制失败，请手动复制。`；源码边界测试确认 `GatewayView.vue` 只委托 controller，并保留 `apiKey: settingsForm.gateway_api_key`、`navigator.clipboard.writeText.bind(navigator.clipboard)` 和 `showPlanNotice` 注入。
- 旧边界同步: 移除 `gatewayAccessModel.test.ts` 中要求 `GatewayView.copyGatewayApiKey` 直接调用 API Key missing/success plan 的源码断言；模型函数本身的 API Key 归一化、缺失、成功和失败提示计划测试仍保留。
- 副作用边界: 本任务未改变 API Key 来源、trim 规则、真实 Clipboard API 调用、缺失/成功/失败提示文案、请求地址复制流程、访问栏组件绑定、设置表单或运行态加载流程；只是把 API Key 复制的副作用编排从视图迁入 access controller。
- `node --test frontend/tests/gatewayAccessController.test.ts frontend/tests/gatewayAccessModel.test.ts`: 通过，17 个 access controller/model 测试全部通过，耗时 `242.110985ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，312 个网关相关测试全部通过，耗时 `4479.045416ms`。
- `node --test frontend/tests/*.test.ts`: 通过，370 个前端状态辅助测试全部通过，耗时 `4580.252577ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3410` 个模块完成转换，构建耗时 `16.52s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayAccessController.ts`、`frontend/tests/gatewayAccessController.test.ts` 与 `frontend/tests/gatewayAccessModel.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 181 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 182: 网关活动请求地址复制 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayActivityController.ts`、`frontend/tests/gatewayActivityController.test.ts`、`frontend/tests/gatewayRouteDisplayModel.test.ts`。
- 改动: 新增 `copyGatewayActivityUrlToClipboard(...)` controller helper，通过注入活动请求 URL、真实剪贴板写入函数和 plan notice 执行函数完成活动请求 URL 复制；`GatewayView.vue` 的 `copyGatewayActivityUrl(value)` 改为委托该 controller，不再直接编排 `normalizeGatewayActivityCopyUrl`、空值跳过、`navigator.clipboard.writeText(normalized)`、成功计划和失败计划。
- 文件长度检查: `GatewayView.vue` 当前为 1282 行，`gatewayActivityController.ts` 为 32 行，`gatewayActivityController.test.ts` 为 79 行，`gatewayActivityDisplayModel.ts` 为 129 行，`gatewayRouteDisplayModel.test.ts` 为 177 行。相比任务 181 结束时，`GatewayView.vue` 从 1291 行降至 1282 行。
- TDD 红灯: `node --test frontend/tests/gatewayActivityController.test.ts frontend/tests/gatewayRouteDisplayModel.test.ts` 首次失败于 `ERR_MODULE_NOT_FOUND`，缺少 `frontend/src/gatewayActivityController.ts`，确认 controller helper 尚未存在；既有 display model 测试仍通过。
- 行为锁定: 新测试覆盖活动请求 URL 复制成功时先 trim 再写入剪贴板，并显示 `请求 URL 已复制。`；活动请求 URL 为空时不写剪贴板且不提示；剪贴板写入失败时显示 `复制失败，请手动复制。`；源码边界测试确认 `GatewayView.vue` 只委托 controller，并保留 `value`、`navigator.clipboard.writeText.bind(navigator.clipboard)` 和 `showPlanNotice` 注入。
- 旧边界同步: 移除 `gatewayRouteDisplayModel.test.ts` 中要求 `GatewayView.copyGatewayActivityUrl` 直接调用 activity copy success plan 的源码断言；display model 本身的活动 URL 归一化、成功和失败提示计划测试仍保留。
- 副作用边界: 本任务未改变活动 URL 来源、trim 规则、空值跳过行为、真实 Clipboard API 调用、成功/失败提示文案、监控活动流组件绑定、日志展示、请求地址复制、API Key 复制或运行态加载流程；只是把活动请求 URL 复制的副作用编排从视图迁入 activity controller。
- `node --test frontend/tests/gatewayActivityController.test.ts frontend/tests/gatewayRouteDisplayModel.test.ts`: 通过，11 个 activity controller/display model 测试全部通过，耗时 `522.115274ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，315 个网关相关测试全部通过，耗时 `6248.919506ms`。
- `node --test frontend/tests/*.test.ts`: 通过，373 个前端状态辅助测试全部通过，耗时 `3398.885869ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3411` 个模块完成转换，构建耗时 `42.08s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayActivityController.ts`、`frontend/tests/gatewayActivityController.test.ts` 与 `frontend/tests/gatewayRouteDisplayModel.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 182 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 183: 网关同步 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewaySyncController.ts`、`frontend/tests/gatewaySyncController.test.ts`、`frontend/tests/gatewayRouteStateModel.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `syncGatewayRoutesWithBalances(...)` controller helper，通过注入真实同步请求、同步后数据重载、静默余额探测、运行态 loading setter 和 plan notice 执行函数完成网关同步；`GatewayView.vue` 的 `handleSync()` 改为委托该 controller，不再直接编排 `loading.value = true/false`、`syncGatewayRoutes()`、`reloadGatewayDataAfterAction()`、`probeRouteBalances(..., { silent: true })`、同步成功计划和同步失败计划。
- 文件长度检查: `GatewayView.vue` 当前为 1273 行，`gatewaySyncController.ts` 为 50 行，`gatewaySyncController.test.ts` 为 160 行，`gatewayRouteStateModel.ts` 为 207 行，`gatewayRouteStateModel.test.ts` 为 424 行，`gatewayViewModel.test.ts` 为 331 行。相比任务 182 结束时，`GatewayView.vue` 从 1282 行降至 1273 行。
- TDD 红灯: `node --test frontend/tests/gatewaySyncController.test.ts frontend/tests/gatewayRouteStateModel.test.ts` 首次失败于 `ERR_MODULE_NOT_FOUND`，缺少 `frontend/src/gatewaySyncController.ts`，确认 controller helper 尚未存在；既有 route state model 测试仍通过。
- 中间回归: 首次扩大到 `node --test frontend/tests/gateway*.test.ts` 时出现 317 个通过、1 个失败，失败用例为 `GatewayView centralizes post-action data reloads in a local helper`；根因是源码边界断言仍要求 `handleSync` 直接调用 `await reloadGatewayDataAfterAction()`。已将该测试同步为允许 `handleSync` 通过 `reloadGatewayData: reloadGatewayDataAfterAction` 注入 controller，和其它副作用 controller 边界保持一致。
- 行为锁定: 新测试覆盖同步成功时按 `loading:true -> sync -> reload -> probe:true -> notice -> loading:false` 顺序执行，并把当前路由 ID `[11, 12]` 传给静默余额探测；同步请求失败时不执行 reload 和余额探测；reload 失败时保持既有行为，只显示错误 plan 且不继续余额探测。
- 旧边界同步: 移除 `gatewayRouteStateModel.test.ts` 中要求 `GatewayView.handleSync` 直接调用同步成功/失败 plan 的源码断言；route state model 本身的同步成功和失败提示计划测试仍保留。`gatewayViewModel.test.ts` 的 post-action reload 边界同步为 controller 注入形式。
- 副作用边界: 本任务未改变真实同步 API、同步后的数据重载、余额探测 route id 来源、`silent: true` 语义、成功/失败提示文案、运行态 loading、自动刷新、路由表或监控页组件绑定；只是把同步流程副作用编排从视图迁入 sync controller。
- `node --test frontend/tests/gatewaySyncController.test.ts frontend/tests/gatewayRouteStateModel.test.ts`: 通过，21 个 sync controller/route state model 测试全部通过，耗时 `251.032156ms`。
- `node --test frontend/tests/gatewaySyncController.test.ts frontend/tests/gatewayRouteStateModel.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，29 个相关测试全部通过，耗时 `582.198785ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，318 个网关相关测试全部通过，耗时 `2537.285081ms`。
- `node --test frontend/tests/*.test.ts`: 通过，376 个前端状态辅助测试全部通过，耗时 `2891.361945ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3412` 个模块完成转换，构建耗时 `52.40s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewaySyncController.ts`、`frontend/tests/gatewaySyncController.test.ts`、`frontend/tests/gatewayRouteStateModel.test.ts` 与 `frontend/tests/gatewayViewModel.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 183 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 184: 网关路由配置变更 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteConfigController.ts`、`frontend/tests/gatewayRouteConfigController.test.ts`、`frontend/tests/gatewayRouteConfigModel.test.ts`。
- 改动: 在 `gatewayRouteConfigController.ts` 中新增 `changeGatewayRouteType(...)` 和 `changeGatewayRoutePath(...)`，通过注入真实路由配置更新请求、当前路由列表 getter/setter、优先级路由列表 getter/setter、标签函数和 plan notice 执行函数，承接路由类型与请求格式切换的 optimistic draft、持久化、成功替换、失败回滚和提示编排；`GatewayView.vue` 的 `handleRouteTypeChange()` 与 `handleRoutePathChange()` 改为委托该 controller。
- 文件长度检查: `GatewayView.vue` 当前为 1269 行，`gatewayRouteConfigController.ts` 为 140 行，`gatewayRouteConfigController.test.ts` 为 272 行，`gatewayRouteConfigModel.ts` 为 140 行，`gatewayRouteConfigModel.test.ts` 为 222 行。相比任务 183 结束时，`GatewayView.vue` 从 1273 行降至 1269 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConfigController.test.ts frontend/tests/gatewayRouteConfigModel.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteConfigController.ts' does not provide an export named 'changeGatewayRoutePath'`，确认 controller helper 尚未存在。
- 中间回归: 实现后首次目标测试出现 16 个通过、4 个失败；其中 2 个失败来自测试错误地要求 `replaceGatewayRoute(...)` 保持同一对象引用，而现有模型会归一化并返回新对象；另外 2 个失败来自旧 model 源码断言仍要求 `GatewayView` 直接构造 route type/path 成功 plan。已同步测试边界，保留 model 计划单测，由 controller 测试覆盖视图委托。
- 行为锁定: 新测试覆盖路由类型切换成功时先应用 optimistic draft，再用原 route 构造 payload 调用真实更新请求，随后替换 `routes` 与 `priorityRoutes` 并显示 `主站 已切换为 Gemini。`；失败时回滚 optimistic draft 并显示错误；请求格式切换同样覆盖成功替换与失败回滚，成功提示为 `主站 请求格式已切换为 Responses。`。
- 旧边界同步: 移除 `gatewayRouteConfigModel.test.ts` 中要求 `GatewayView.handleRouteTypeChange` 与 `GatewayView.handleRoutePathChange` 直接调用 success plan 的源码断言；`gatewayRouteConfigController.test.ts` 新增源码边界断言，确认视图只注入 `updateGatewayRouteType`、routes/priorityRoutes getter-setter、标签函数和 `showPlanNotice`。
- 副作用边界: 本任务未改变真实 `updateGatewayRouteType` API、payload 字段、乐观更新/失败回滚规则、成功/失败提示文案、路由类型/请求格式选择校验、路由模型弹窗保存流程、路由表组件或监控页组件绑定；只是把路由类型与请求格式变更的副作用编排从视图迁入 route config controller。
- `node --test frontend/tests/gatewayRouteConfigController.test.ts frontend/tests/gatewayRouteConfigModel.test.ts`: 通过，18 个 route config controller/model 测试全部通过，耗时 `2107.169569ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，321 个网关相关测试全部通过，耗时 `2825.157357ms`。
- `node --test frontend/tests/*.test.ts`: 通过，379 个前端状态辅助测试全部通过，耗时 `2561.28361ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3412` 个模块完成转换，构建耗时 `40.41s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteConfigController.ts`、`frontend/tests/gatewayRouteConfigController.test.ts` 与 `frontend/tests/gatewayRouteConfigModel.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 184 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 185: 网关单路由探测 controller 边界收口

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeController.ts`、`frontend/tests/gatewayRouteProbeController.test.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`。
- 改动: 在 `gatewayRouteProbeController.ts` 中新增 `probeSingleGatewayRoute(...)`，通过注入单路由探测请求、探测结果应用函数、route probing 跟踪/清理函数和 notice 执行函数，承接单路由探测的 track、真实请求、结果合并、成功/失败提示和 finally 清理；`GatewayView.vue` 的 `handleProbeRoute(route)` 改为委托该 controller。
- 文件长度检查: `GatewayView.vue` 当前为 1264 行，`gatewayRouteProbeController.ts` 为 141 行，`gatewayRouteProbeController.test.ts` 为 215 行，`gatewayRouteProbeModel.ts` 为 192 行，`gatewayRouteProbeModel.test.ts` 为 306 行。相比任务 184 结束时，`GatewayView.vue` 从 1269 行降至 1264 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbeController.test.ts frontend/tests/gatewayRouteProbeModel.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteProbeController.ts' does not provide an export named 'probeSingleGatewayRoute'`，确认 controller helper 尚未存在；既有 probe model 测试仍通过。
- 中间回归: 实现后首次目标测试出现 21 个通过、1 个失败，失败用例为 `GatewayView delegates single route probe errors to the probe model plan`；根因是旧 model 源码断言仍要求 `GatewayView.handleProbeRoute` 直接构造单路由探测错误 plan。已移除该旧断言，保留 model plan 单元测试，并由 controller 测试覆盖视图委托边界。
- 行为锁定: 新测试覆盖单路由探测成功时按 `track -> request -> apply -> notice -> untrack` 顺序执行，并传入真实 route id；探测请求失败时不应用结果，显示错误 plan，并始终 untrack route id。
- 旧边界同步: 移除 `gatewayRouteProbeModel.test.ts` 中要求 `GatewayView.handleProbeRoute` 直接调用 `buildGatewaySingleProbeErrorPlan` 的源码断言；`buildGatewaySingleProbeCompletionPlan`、`buildGatewaySingleProbeErrorPlan` 等 model 单元测试仍保留。
- 副作用边界: 本任务未改变真实 `probeGatewayRoute` API、探测结果合并规则、探测中 route id 管理、成功/失败提示文案、批量探测、余额探测、手动余额弹窗、路由表组件或监控页组件绑定；只是把单路由探测的副作用编排从视图迁入 route probe controller。
- `node --test frontend/tests/gatewayRouteProbeController.test.ts frontend/tests/gatewayRouteProbeModel.test.ts`: 通过，21 个 route probe controller/model 测试全部通过，耗时 `204.241433ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，323 个网关相关测试全部通过，耗时 `8252.662548ms`。
- `node --test frontend/tests/*.test.ts`: 通过，381 个前端状态辅助测试全部通过，耗时 `4365.147975ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3412` 个模块完成转换，构建耗时 `48.20s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteProbeController.ts`、`frontend/tests/gatewayRouteProbeController.test.ts` 与 `frontend/tests/gatewayRouteProbeModel.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 185 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 186: 网关批量探测副作用边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeController.ts`、`frontend/tests/gatewayRouteProbeController.test.ts`、`frontend/src/gatewayRouteProbeModel.ts`、`frontend/tests/gatewayRouteProbeModel.test.ts`。
- 改动: 在 `gatewayRouteProbeController.ts` 中新增 `probeGatewayRouteBatch(...)`，通过注入路由列表、真实探测请求、结果合并函数、批量进度 state、完成计数、时间函数和 notice 执行函数，承接批量路由探测的 route id 归一化、逐条真实探测、失败结果构造、进度推进、失败样本提示和 finally 清理；`GatewayView.vue` 的 `handleProbeAll()` 改为委托该 controller。
- 类型边界修正: 首次本轮 `npm run build` 失败，暴露 `GatewayView.vue` 仍导入未使用的 `buildGatewaySingleProbeErrorPlan`，且 `gatewayRouteProbeController.ts` 的 `showPlanNotice` 类型把可启动的批量开始计划也纳入通知计划。已移除无用导入，并把 controller 通知计划类型收窄到实际带 `notice` 的分支。
- 文件长度检查: `GatewayView.vue` 当前为 1229 行，`gatewayRouteProbeController.ts` 为 215 行，`gatewayRouteProbeController.test.ts` 为 377 行，`gatewayRouteProbeModel.ts` 为 192 行，`gatewayRouteProbeModel.test.ts` 为 291 行。相比任务 185 结束时，`GatewayView.vue` 从 1264 行降至 1229 行。
- 行为锁定: 新测试覆盖批量探测成功路径按 `start -> request/apply/finish-route -> completion notice -> finish` 顺序执行；单条 route 请求失败时构造失败结果、继续探测后续 route、推进失败进度并在完成提示中包含失败样本；空路由列表只显示错误提示，不启动批量状态、不发请求。
- 视图边界锁定: 源码测试确认 `GatewayView.handleProbeAll()` 只传入 `routes.value`、`probeGatewayRoute`、`applyProbeResult`、`routeProbeState.startBatch`、`routeProbeState.finishBatchRoute`、`routeProbeState.finishBatch`、当前成功计数、当前时间和 `showPlanNotice`；页面不再内联批量 `for` 循环、开始计划、失败结果构造、步骤计划或完成计划。
- 副作用边界: 本任务未改变真实 `probeGatewayRoute` API、探测结果合并规则、批量进度口径、失败样本提示文案、单路由探测、余额探测、手动余额弹窗、路由表组件或监控页组件绑定；只是把批量路由探测副作用编排从视图迁入 route probe controller。
- `node --test frontend/tests/gatewayRouteProbeController.test.ts frontend/tests/gatewayRouteProbeModel.test.ts`: 通过，24 个 route probe controller/model 测试全部通过，最终耗时 `257.792252ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，326 个网关相关测试全部通过，最终耗时 `6387.853639ms`。
- `node --test frontend/tests/*.test.ts`: 通过，384 个前端状态辅助测试全部通过，最终耗时 `2871.039112ms`。
- `npm run build`（在 `frontend/` 下执行）: 修正类型边界后通过，`3412` 个模块完成转换，构建耗时 `53.80s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteProbeController.ts`、`frontend/tests/gatewayRouteProbeController.test.ts`、`frontend/src/gatewayRouteProbeModel.ts` 与 `frontend/tests/gatewayRouteProbeModel.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 186 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 187: 网关余额探测副作用边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeController.ts`、`frontend/src/gatewayRouteBalanceProbeFlowController.ts`、`frontend/tests/gatewayRouteBalanceProbeController.test.ts`、`frontend/src/gatewayRouteBalanceProbeModel.ts`、`frontend/tests/gatewayRouteBalanceProbeModel.test.ts`。
- 改动: 新增 `gatewayRouteBalanceProbeFlowController.ts`，把通用余额探测循环、批量余额更新、单路由余额探测和手动余额探测的真实请求、结果合并、overview 刷新、概览变更通知、toast/plan notice、手动弹窗关闭/失败消息、loading 与 track/untrack 编排从 `GatewayView.vue` 迁入 flow controller；`GatewayView.vue` 只保留依赖注入、响应式状态赋值和现有 API 函数绑定。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeModel.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteBalanceProbeController.ts' does not provide an export named 'probeGatewayRouteBalances'`，确认新增 flow API 尚未存在。
- 类型边界修正: 首次本轮 `npm run build` 失败，暴露 `GatewayView.vue` 注入 controller 时误用不存在的 shorthand `applyBalanceResult` 和 `notifyOverviewChanged`，并导致 `notifyGatewayOverviewChanged` 未使用。已显式接到既有 `applyRouteBalanceResult` 与 `notifyGatewayOverviewChanged`。
- 职责拆分修正: 初始实现曾让 `gatewayRouteBalanceProbeController.ts` 增至 428 行；已将副作用流程迁入 `gatewayRouteBalanceProbeFlowController.ts`，让原 state/dialog controller 回到 163 行，新 flow controller 为 269 行。
- 文件长度检查: `GatewayView.vue` 当前为 1146 行，`gatewayRouteBalanceProbeController.ts` 为 163 行，`gatewayRouteBalanceProbeFlowController.ts` 为 269 行，`gatewayRouteBalanceProbeController.test.ts` 为 467 行，`gatewayRouteBalanceProbeModel.ts` 为 357 行，`gatewayRouteBalanceProbeModel.test.ts` 为 420 行。相比任务 186 结束时，`GatewayView.vue` 从 1229 行降至 1146 行。
- 行为锁定: 新测试覆盖通用余额探测循环按 `track -> request/apply -> overview refresh -> overview notify -> notice -> untrack` 执行，单条请求异常时计入失败并继续；批量余额更新按 `startBatch -> silent probe -> refresh summaries -> update notice -> finishBatch` 执行，空批次只显示 start plan；单路由余额失败会打开手动重试弹窗；手动余额探测会先归一化和校验 URL，成功时关闭弹窗，非法 URL 不触碰 loading 或 track 状态。
- 视图边界锁定: 源码测试确认 `GatewayView.handleUpdateAllBalances()`、`handleProbeRouteBalance(route)` 和 `submitManualRouteBalanceProbe()` 已分别委托 `updateAllGatewayRouteBalances(...)`、`probeSingleGatewayRouteBalance(...)` 和 `probeManualGatewayRouteBalance(...)`；页面不再内联余额批量开始计划、余额请求循环、单路由完成计划、手动 URL 校验计划或手动余额请求。
- 副作用边界: 本任务未改变真实 `probeGatewayRouteBalance` API、余额结果合并规则、overview 刷新和通知语义、批量进度、手动弹窗关闭规则、批量路由探测、同步静默余额探测、路由表组件或监控页组件绑定；只是把余额探测副作用编排从视图迁入 balance probe flow controller。
- `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 通过，32 个余额探测 controller/model 测试全部通过，最终耗时 `337.161504ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，331 个网关相关测试全部通过，最终耗时 `4480.459199ms`。
- `node --test frontend/tests/*.test.ts`: 通过，389 个前端状态辅助测试全部通过，最终耗时 `4532.712705ms`。
- `npm run build`（在 `frontend/` 下执行）: 修正类型边界并拆出 flow controller 后通过，`3413` 个模块完成转换，构建耗时 `15.46s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteBalanceProbeController.ts`、`frontend/src/gatewayRouteBalanceProbeFlowController.ts`、`frontend/tests/gatewayRouteBalanceProbeController.test.ts` 与 `frontend/tests/gatewayRouteBalanceProbeModel.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 187 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 188: 网关优先级副作用边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityController.ts`、`frontend/tests/gatewayPriorityController.test.ts`、`frontend/tests/gatewayPriorityModel.test.ts`。
- 改动: 在 `gatewayPriorityController.ts` 中新增 `applyGatewayPriorityReorderedRoutes(...)`，把优先级重排结果的归一化、启用过滤、优先级弹窗列表写入和主路由列表写入收口到 priority controller；`GatewayView.vue` 不再直接导入 `replaceReorderedGatewayRoutes`，只通过本地依赖注入 wrapper 连接响应式 state。
- 文件长度检查: `GatewayView.vue` 当前为 1153 行，`gatewayPriorityController.ts` 为 209 行，`gatewayPriorityController.test.ts` 为 439 行，`gatewayPriorityModel.ts` 为 117 行，`gatewayPriorityModel.test.ts` 为 153 行。相比任务 187 结束时，`GatewayView.vue` 从 1146 行增至 1153 行；本任务优先收口副作用边界，未以减少行数为唯一目标。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayPriorityModel.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayPriorityController.ts' does not provide an export named 'applyGatewayPriorityReorderedRoutes'`，确认重排应用 controller 边界尚未存在。
- 测试修正: 初始实现后目标测试曾失败于测试断言误以为 `normalizeGatewayRoute` 会回填 `site_name`；已按当前代码事实改为断言无效 `route_path` 被归一化为空字符串，保持测试覆盖真实归一化行为。
- 行为锁定: 新测试覆盖重排应用会保留完整 priority routes，按 `includeDisabled` 过滤主 routes，并复用现有 `replaceReorderedGatewayRoutes` 归一化规则；源码边界测试确认 `GatewayView.vue` 导入 `applyGatewayPriorityReorderedRoutes` 且不再直接引用 `replaceReorderedGatewayRoutes`。
- 副作用边界: 本任务未改变真实 `reorderGatewayRoutePriorities` API、移动/预设 payload、选中路由保持、成功/失败提示、优先级弹窗 state、批量探测、余额探测、路由表组件或监控页组件绑定；只是把优先级重排结果应用从视图侧收口到 priority controller。
- `node --test frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayPriorityModel.test.ts`: 通过，24 个 priority controller/model 测试全部通过，最终耗时 `957.45292ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，332 个网关相关测试全部通过，最终耗时 `2904.667218ms`。
- `node --test frontend/tests/*.test.ts`: 通过，390 个前端状态辅助测试全部通过，最终耗时 `4486.863585ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3413` 个模块完成转换，构建耗时 `44.67s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayPriorityController.ts` 与 `frontend/tests/gatewayPriorityController.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 188 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 189: 网关路由模型保存副作用边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteConfigController.ts`、`frontend/tests/gatewayRouteConfigController.test.ts`、`frontend/src/gatewayRouteConfigModel.ts`、`frontend/tests/gatewayRouteConfigModel.test.ts`。
- 改动: 在 `gatewayRouteConfigController.ts` 中新增 `saveGatewayRouteModels(...)`，把路由模型保存的 saving 状态、真实 `updateGatewayRouteType` 请求、payload 构造、主路由和优先级路由替换、成功关闭弹窗、成功/失败 plan 执行和 finally 清理从 `GatewayView.vue` 迁入 route config controller。
- 文件长度检查: `GatewayView.vue` 当前为 1146 行，`gatewayRouteConfigController.ts` 为 183 行，`gatewayRouteConfigController.test.ts` 为 434 行，`gatewayRouteConfigModel.ts` 为 140 行，`gatewayRouteConfigModel.test.ts` 为 207 行。相比任务 188 结束时，`GatewayView.vue` 从 1153 行降至 1146 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConfigController.test.ts frontend/tests/gatewayRouteConfigModel.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteConfigController.ts' does not provide an export named 'saveGatewayRouteModels'`，确认保存副作用 controller 边界尚未存在。
- 行为锁定: 新测试覆盖保存成功时按 `saving:true -> request -> routes replace -> priority routes replace -> close -> success notice -> saving:false` 执行，失败时不替换路由、不关闭弹窗并仍重置 saving，空 route 时不触发任何副作用。
- 视图边界锁定: 源码测试确认 `GatewayView.saveRouteModelsDialog()` 已委托 `saveGatewayRouteModels(...)`，并只传入弹窗 route、supported models、request URLs、两份路由列表 getter/setter、真实 `updateGatewayRouteType`、`routeModelsDialog.setSaving`、`routeModelsDialog.closeAfterSuccess` 和 `showPlanNotice`。
- 副作用边界: 本任务未改变真实 `updateGatewayRouteType` API、`buildGatewayRouteModelsPayload` 规则、请求 URL 与 supported models 归一化、成功后关闭弹窗、失败后保留弹窗、主路由和优先级列表替换规则、批量探测、余额探测、路由表组件或监控页组件绑定；只是把路由模型保存副作用编排从视图迁入 route config controller。
- `node --test frontend/tests/gatewayRouteConfigController.test.ts frontend/tests/gatewayRouteConfigModel.test.ts`: 通过，21 个 route config controller/model 测试全部通过，最终耗时 `4506.01132ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，335 个网关相关测试全部通过，最终耗时 `3638.378064ms`。
- `node --test frontend/tests/*.test.ts`: 通过，393 个前端状态辅助测试全部通过，最终耗时 `2978.116623ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3413` 个模块完成转换，构建耗时 `52.97s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteConfigController.ts`、`frontend/tests/gatewayRouteConfigController.test.ts` 与 `frontend/tests/gatewayRouteConfigModel.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 189 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 190: 网关上游添加副作用边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAddUpstreamController.ts`、`frontend/tests/gatewayAddUpstreamController.test.ts`、`frontend/src/gatewayAddUpstreamModel.ts`、`frontend/tests/gatewayAddUpstreamModel.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 在 `gatewayAddUpstreamController.ts` 中新增 `submitGatewayAddUpstream(...)`，把新增上游的 validation、loading、真实 `createSite` 请求、payload 构造、成功提示、成功关闭并重置弹窗、同步路由、重新加载数据、失败提示和 finally loading 清理从 `GatewayView.vue` 迁入 add upstream controller。
- 文件长度检查: `GatewayView.vue` 当前为 1128 行，`gatewayAddUpstreamController.ts` 为 97 行，`gatewayAddUpstreamController.test.ts` 为 215 行，`gatewayAddUpstreamModel.ts` 为 118 行，`gatewayAddUpstreamModel.test.ts` 为 151 行，`gatewayViewModel.test.ts` 为 332 行。相比任务 189 结束时，`GatewayView.vue` 从 1146 行降至 1128 行。
- TDD 红灯: `node --test frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewayAddUpstreamModel.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayAddUpstreamController.ts' does not provide an export named 'submitGatewayAddUpstream'`，确认新增上游提交副作用 controller 边界尚未存在。
- 行为锁定: 新测试覆盖保存成功时按 `loading:true -> create -> success notice -> close -> sync -> reload -> loading:false` 执行；校验失败时只提示 validation notice，不触碰 loading、请求、关闭、同步或重载；创建失败时不关闭、不同步、不重载并仍重置 loading。
- 视图边界锁定: 源码测试确认 `GatewayView.submitAddUpstream()` 已委托 `submitGatewayAddUpstream(...)`，并传入 `addUpstreamForm`、`addUpstreamGroupNames.value`、真实 `createSite`、`addUpstreamDialog.setLoading`、`addUpstreamDialog.closeAfterSuccess`、`handleSync`、`reloadGatewayDataAfterAction` 和 `showPlanNotice`。
- 测试契约修正: `gatewayViewModel.test.ts` 的动作后重载源码契约同步为 controller 注入模式，允许 `submitAddUpstream` 和其它已拆 controller 一样通过 `reloadGatewayData: reloadGatewayDataAfterAction` 注入重载 helper，而不是在视图 handler 内直接调用。
- 副作用边界: 本任务未改变真实 `createSite` API、`plugin_key: 'api-supplier'`、`buildAddUpstreamPayload` 规则、分组优先级、模型归一化、成功后同步路由和重载数据顺序、失败后保留弹窗、路由模型保存、优先级、余额探测、路由表组件或监控页组件绑定；只是把新增上游提交编排从视图迁入 add upstream controller。
- `node --test frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewayAddUpstreamModel.test.ts`: 通过，13 个 add upstream controller/model 测试全部通过，最终耗时 `248.270986ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，336 个网关相关测试全部通过，最终耗时 `2447.778103ms`。
- `node --test frontend/tests/*.test.ts`: 通过，394 个前端状态辅助测试全部通过，最终耗时 `2218.539569ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3413` 个模块完成转换，构建耗时 `44.63s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayAddUpstreamController.ts`、`frontend/tests/gatewayAddUpstreamController.test.ts`、`frontend/tests/gatewayAddUpstreamModel.test.ts` 与 `frontend/tests/gatewayViewModel.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 190 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 191: 网关手动刷新副作用边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayManualRefreshController.ts`、`frontend/tests/gatewayManualRefreshController.test.ts`。
- 改动: 新增 `refreshGatewayManually(...)`，把手动刷新中的 `loadData()`、静默余额探测和路由摘要刷新顺序从 `GatewayView.handleRefresh()` 迁入独立 manual refresh controller；`GatewayView.vue` 只传入当前路由列表、`loadData`、`probeRouteBalances` 和 `refreshRouteSummaries`。
- 文件长度检查: `GatewayView.vue` 当前为 1132 行，`gatewayManualRefreshController.ts` 为 23 行，`gatewayManualRefreshController.test.ts` 为 140 行。相比任务 190 结束时，`GatewayView.vue` 从 1128 行增至 1132 行；本任务优先收口副作用边界，新增 import 和依赖注入对象会带来少量行数增加。
- TDD 红灯: `node --test frontend/tests/gatewayManualRefreshController.test.ts` 首次失败于 `Error [ERR_MODULE_NOT_FOUND]: Cannot find module .../frontend/src/gatewayManualRefreshController.ts`，确认手动刷新 controller 边界尚未存在。
- 行为锁定: 新测试覆盖手动刷新成功时按 `load -> probe:true -> summaries` 执行，余额探测使用刷新前的 `routes` id 列表并强制 `{ silent: true }`；`loadGatewayData` 失败时不探测、不刷新摘要并传播错误；余额探测失败时不刷新摘要并传播错误。
- 视图边界锁定: 源码测试确认 `GatewayView.handleRefresh()` 已委托 `refreshGatewayManually(...)`，并不再直接调用 `await loadData()`、`routes.value.map((route) => route.id)` 或 `await refreshRouteSummaries()`。
- 副作用边界: 本任务未改变真实初始加载 `loadData`、余额探测 `probeRouteBalances`、路由摘要刷新 `refreshRouteSummaries`、自动刷新定时器、用量加载、活跃请求刷新、toast、路由同步、路由模型保存或新增上游流程；只是把手动刷新编排从视图迁入 manual refresh controller。
- `node --test frontend/tests/gatewayManualRefreshController.test.ts`: 通过，4 个 manual refresh controller 测试全部通过，最终耗时 `180.546831ms`。
- `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayRouteSummaryController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts`: 通过，53 个相邻 runtime/summary/balance 测试全部通过，最终耗时 `4038.161539ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，340 个网关相关测试全部通过，最终耗时 `4425.067931ms`。
- `node --test frontend/tests/*.test.ts`: 通过，398 个前端状态辅助测试全部通过，最终耗时 `4489.002789ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3414` 个模块完成转换，构建耗时 `41.82s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayManualRefreshController.ts` 与 `frontend/tests/gatewayManualRefreshController.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 191 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 192: 网关站点分组轻量刷新边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewaySiteGroupsController.ts`、`frontend/tests/gatewaySiteGroupsController.test.ts`。
- 改动: 新增 `refreshGatewaySiteGroups(...)`，把 header 分组变更后的轻量 `getSiteGroups()` 刷新和失败保持现有选项的行为从 `GatewayView.handleSiteGroupsChanged()` 迁入独立 site groups controller；`GatewayView.vue` 只传入真实 `getSiteGroups` 和 `siteGroups.value` setter。
- 文件长度检查: `GatewayView.vue` 当前为 1134 行，`gatewaySiteGroupsController.ts` 为 17 行，`gatewaySiteGroupsController.test.ts` 为 74 行。相比任务 191 结束时，`GatewayView.vue` 从 1132 行增至 1134 行；本任务优先收口副作用边界，新增 import 和依赖注入对象带来少量行数增加。
- TDD 红灯: `node --test frontend/tests/gatewaySiteGroupsController.test.ts` 首次失败于 `Error [ERR_MODULE_NOT_FOUND]: Cannot find module .../frontend/src/gatewaySiteGroupsController.ts`，确认站点分组刷新 controller 边界尚未存在。
- 行为锁定: 新测试覆盖分组刷新成功时请求最新分组并替换当前选项；请求失败时不调用 setter、不抛出错误，保留旧分组选项。
- 视图边界锁定: 源码测试确认 `GatewayView.handleSiteGroupsChanged()` 已委托 `refreshGatewaySiteGroups(...)`，传入 `requestSiteGroups: getSiteGroups` 和 `setSiteGroups`，并不再在视图 handler 内直接出现 `try`、`catch` 或 `await getSiteGroups()`。
- 副作用边界: 本任务未改变真实 `getSiteGroups` API、`site-groups:changed` 事件绑定、失败静默保持旧选项、全局 header 分组入口、站点页分组逻辑、手动刷新、自动刷新、路由同步或 toast 规则；只是把网关页分组变更后的轻量刷新从视图迁入 site groups controller。
- `node --test frontend/tests/gatewaySiteGroupsController.test.ts`: 通过，3 个 site groups controller 测试全部通过，最终耗时 `452.937003ms`。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，36 个 runtime controller 测试全部通过，最终耗时 `5959.733173ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，343 个网关相关测试全部通过，最终耗时 `4117.434346ms`。
- `node --test frontend/tests/*.test.ts`: 通过，401 个前端状态辅助测试全部通过，最终耗时 `4022.262346ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3415` 个模块完成转换，构建耗时 `40.81s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewaySiteGroupsController.ts` 与 `frontend/tests/gatewaySiteGroupsController.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 192 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 193: 网关可见性刷新边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 新增 `handleGatewayVisibilityRefresh(...)`，把 `GatewayView.handleVisibilityChange()` 中的 visibility plan 执行、实时刷新触发和活跃请求刷新触发迁入 runtime controller；`GatewayView.vue` 只传入当前可见性、监控态、`refreshRealtimeData` 和 `refreshActiveRequests`。
- 文件长度检查: `GatewayView.vue` 当前为 1130 行，`gatewayRuntimeController.ts` 为 273 行，`gatewayRuntimeController.test.ts` 为 1599 行。相比任务 192 结束时，`GatewayView.vue` 从 1134 行降至 1130 行；runtime controller 从 252 行增至 273 行，仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRuntimeController.ts' does not provide an export named 'handleGatewayVisibilityRefresh'`，确认可见性刷新执行 controller 边界尚未存在，最终失败耗时 `1797.362209ms`。
- 行为锁定: 新测试覆盖可见且处于 monitor 时按 `realtime -> active:true` 触发；可见但非 monitor 时只触发实时刷新；隐藏时不触发任何刷新。
- 视图边界锁定: 源码测试确认 `GatewayView.handleVisibilityChange()` 已委托 `gatewayRuntime.handleVisibilityRefresh(...)`，并传入 `document.visibilityState === 'visible'`、`isGatewayMonitor.value`、`refreshRealtimeData` 和 `refreshActiveRequests`；视图 handler 内不再直接调用 `gatewayRuntime.buildVisibilityRefreshPlan`、`void refreshRealtimeData()` 或 `void refreshActiveRequests(true)`。
- 副作用边界: 本任务未改变 `document.visibilityState === 'visible'` 判定、monitor 页才刷新活跃请求、fire-and-forget 触发方式、自动刷新定时器、手动刷新、站点分组刷新、用量加载、toast 或请求取消规则；只是把可见性变化后的执行编排从视图迁入 runtime controller。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，40 个 runtime controller 测试全部通过，最终耗时 `3840.913283ms`。
- `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayManualRefreshController.test.ts frontend/tests/gatewaySiteGroupsController.test.ts`: 通过，47 个相邻 runtime/manual/site groups 测试全部通过，最终耗时 `907.227942ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，347 个网关相关测试全部通过，最终耗时 `4923.72005ms`。
- `node --test frontend/tests/*.test.ts`: 通过，405 个前端状态辅助测试全部通过，最终耗时 `5036.423715ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3415` 个模块完成转换，构建耗时 `38.28s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRuntimeController.ts` 与 `frontend/tests/gatewayRuntimeController.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 193 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 194: 网关用量今日快捷查询边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayUsageRangeController.ts`、`frontend/tests/gatewayUsageRangeController.test.ts`。
- 改动: 新增 `loadGatewayUsageToday(...)`，把 `GatewayView.handleUsageToday()` 中的今日范围重置和随后用量加载顺序迁入 usage range controller；`GatewayView.vue` 只传入 `usageRangeState.resetToToday` 和 `loadGatewayUsage`。
- 文件长度检查: `GatewayView.vue` 当前为 1135 行，`gatewayUsageRangeController.ts` 为 49 行，`gatewayUsageRangeController.test.ts` 为 87 行。相比任务 193 结束时，`GatewayView.vue` 从 1130 行增至 1135 行；本任务优先收口副作用顺序边界，新增 import 和依赖注入对象带来少量行数增加。
- TDD 红灯: `node --test frontend/tests/gatewayUsageRangeController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayUsageRangeController.ts' does not provide an export named 'loadGatewayUsageToday'`，确认今日用量查询 controller 边界尚未存在，最终失败耗时 `383.712198ms`。
- 行为锁定: 新测试覆盖今日快捷查询按 `reset -> load` 顺序执行；`loadGatewayUsage` 失败时错误继续向外传播，且已先执行今日范围重置。
- 视图边界锁定: 源码测试确认 `GatewayView.handleUsageToday()` 已委托 `loadGatewayUsageToday(...)`，并传入 `resetToToday: usageRangeState.resetToToday` 与 `loadGatewayUsage`；视图 handler 内不再直接调用 `usageRangeState.resetToToday()` 或 `await loadGatewayUsage()`。
- 副作用边界: 本任务未改变今日范围计算、`loadGatewayUsage()` 默认非 silent 行为、monitor 非 monitor 判定、请求取消、用量错误提示、手动用量查询按钮、自动刷新、站点分组刷新或 toast 规则；只是把今日快捷查询顺序从视图迁入 usage range controller。
- `node --test frontend/tests/gatewayUsageRangeController.test.ts`: 通过，6 个 usage range controller 测试全部通过，最终耗时 `2728.064083ms`。
- `node --test frontend/tests/gatewayUsageRangeController.test.ts frontend/tests/gatewayRuntimeController.test.ts`: 通过，46 个相邻 usage/runtime 测试全部通过，最终耗时 `789.884027ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，350 个网关相关测试全部通过，最终耗时 `4403.722344ms`。
- `node --test frontend/tests/*.test.ts`: 通过，408 个前端状态辅助测试全部通过，最终耗时 `4432.386733ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3415` 个模块完成转换，构建耗时 `52.83s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayUsageRangeController.ts` 与 `frontend/tests/gatewayUsageRangeController.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 194 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 195: 网关自动刷新定时器边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAutoRefreshTimerController.ts`、`frontend/tests/gatewayAutoRefreshTimerController.test.ts`。
- 改动: 新增 `startGatewayAutoRefreshTimers(...)` 和 `stopGatewayAutoRefreshTimers(...)`，把 `GatewayView.startAutoRefresh()` / `stopAutoRefresh()` 中的 timer plan 应用、旧 timer 停止、controller slot abort 和定时器清理顺序迁入独立 auto refresh timer controller；`GatewayView.vue` 只保留 timer 状态对象、平台 timer helper 和依赖注入。
- 文件长度检查: `GatewayView.vue` 当前为 1139 行，`gatewayAutoRefreshTimerController.ts` 为 80 行，`gatewayAutoRefreshTimerController.test.ts` 为 141 行。相比任务 194 结束时，`GatewayView.vue` 从 1135 行增至 1139 行；本任务优先收口定时器副作用边界，新增 import、timer 状态对象和 helper 带来少量行数增加。
- TDD 红灯: `node --test frontend/tests/gatewayAutoRefreshTimerController.test.ts` 首次失败于 `Error [ERR_MODULE_NOT_FOUND]: Cannot find module .../frontend/src/gatewayAutoRefreshTimerController.ts`，确认自动刷新 timer controller 边界尚未存在，最终失败耗时 `161.115318ms`。
- 中间边界校验: 首次实现 controller 后目标测试仍失败于源码断言，指出 `GatewayView.startAutoRefresh()` / `stopAutoRefresh()` 内仍直接出现 `window.setInterval` 和 `window.clearInterval` 包装；已将平台 timer 包装移出 handler，handler 内只保留 controller 委托。
- 行为锁定: 新测试覆盖启动自动刷新前先按 `abort-auto -> abort-active -> clear old timers` 停止旧 timer；monitor 模式创建实时刷新和活跃请求两个 timer，活跃请求 timer 固定以 `true` silent 参数触发；非 monitor 模式只创建实时刷新 timer；停止时按 abort 两个 controller slot 后清理 timer 并置空。
- 视图边界锁定: 源码测试确认 `GatewayView.startAutoRefresh()` 已委托 `startGatewayAutoRefreshTimers(...)`，`stopAutoRefresh()` 已委托 `stopGatewayAutoRefreshTimers(...)`；handler 区域不再直接出现 `window.setInterval`、`window.clearInterval`、`gatewayRuntime.buildAutoRefreshTimerPlan`、`autoRefreshControllerSlot.abortAndClear()` 或 `activeRequestsControllerSlot.abortAndClear()`。
- 副作用边界: 本任务未改变路由页实时刷新间隔、monitor 页实时刷新间隔、monitor 页活跃请求刷新间隔、旧 timer 先停止再启动新 timer、停止时先 abort 当前请求再清理 timer、visibilitychange、手动刷新、今日用量查询、站点分组刷新或 toast 规则；只是把自动刷新 timer 编排从视图迁入 timer controller。
- `node --test frontend/tests/gatewayAutoRefreshTimerController.test.ts`: 通过，4 个 auto refresh timer controller 测试全部通过，最终耗时 `191.335408ms`。
- `node --test frontend/tests/gatewayAutoRefreshTimerController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts`: 通过，50 个相邻 timer/runtime/usage 测试全部通过，最终耗时 `1232.62381ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，354 个网关相关测试全部通过，最终耗时 `5195.427594ms`。
- `node --test frontend/tests/*.test.ts`: 通过，412 个前端状态辅助测试全部通过，最终耗时 `5473.35465ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3416` 个模块完成转换，构建耗时 `1m 24s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayAutoRefreshTimerController.ts` 与 `frontend/tests/gatewayAutoRefreshTimerController.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 195 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 196: 网关路由开关确认动作边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteActionController.ts`、`frontend/tests/gatewayRouteActionController.test.ts`、`frontend/tests/gatewayRouteToggleController.test.ts`、`frontend/tests/gatewayRouteDisableController.test.ts`、`frontend/tests/gatewayRouteEnableOnlyController.test.ts`、`frontend/tests/gatewayRouteCircuitController.test.ts`。
- 改动: 新增 `gatewayRouteActionController.ts`，把禁用全部路由和仅启用单条路由的确认文案、确认函数注入、路由标签解析，以及单路由切换、禁用全部、仅启用单条、重置熔断四个动作的真实请求、重载和通知依赖装配收口到 route action controller；`GatewayView.vue` 只保留页面事件入口和 `window.confirm` 平台适配。
- 文件长度检查: `GatewayView.vue` 当前为 1144 行，`gatewayRouteActionController.ts` 为 69 行，`gatewayRouteActionController.test.ts` 为 166 行。相比任务 195 结束时，`GatewayView.vue` 从 1139 行增至 1144 行；本任务优先收口动作确认和副作用装配边界，新增 action facade 与依赖注入带来少量行数增加。
- TDD 红灯: `node --test frontend/tests/gatewayRouteActionController.test.ts` 首次失败于 `Error [ERR_MODULE_NOT_FOUND]: Cannot find module .../frontend/src/gatewayRouteActionController.ts`，确认 route action controller 边界尚未存在，最终失败耗时 `154.820144ms`。
- 中间边界校验: 首次实现 route action controller 后，相邻路由 toggle/disable/enable-only/circuit controller 测试仍失败于旧源码断言，要求 `GatewayView.vue` 直接导入底层控制器；已将这些源码边界断言迁移到新的 route action controller 测试，原控制器测试只保留自身行为规格。
- 行为锁定: 新测试覆盖禁用全部路由确认文案保持 `确认禁用全部路由？禁用后网关将没有可用路由，直到重新启用。`；仅启用单条路由确认文案继续使用所选路由标签生成 `确认仅启用「...」，并禁用其他全部路由？`；单路由切换和重置熔断仍按 `request -> success notice -> reload` 顺序执行。
- 视图边界锁定: 源码测试确认 `GatewayView.handleToggle()`、`handleDisableAllRoutes()`、`handleEnableOnlyRoute()`、`handleResetCircuit()` 已统一委托 `toggleGatewayRouteAction(...)`、`disableAllGatewayRoutesAction(...)`、`enableOnlyGatewayRouteAction(...)`、`resetGatewayRouteCircuitAction(...)`；handler 区域不再直接出现底层 route toggle/disable/enable-only/circuit controller 调用，也不再直接拼接两条确认文案。
- 副作用边界: 本任务未改变禁用全部、仅启用单条、重置熔断和单路由切换的确认文案、真实 API、成功后重载、失败提示、路由标签展示、手动刷新、自动刷新、用量查询、站点分组刷新或 toast 规则；只是把路由动作确认和副作用装配从视图迁入 action controller。
- `node --test frontend/tests/gatewayRouteActionController.test.ts`: 通过，5 个 route action controller 测试全部通过，最终耗时 `666.93179ms`。
- `node --test frontend/tests/gatewayRouteActionController.test.ts frontend/tests/gatewayRouteToggleController.test.ts frontend/tests/gatewayRouteDisableController.test.ts frontend/tests/gatewayRouteEnableOnlyController.test.ts frontend/tests/gatewayRouteCircuitController.test.ts`: 通过，19 个相邻 route action/toggle/disable/enable-only/circuit 测试全部通过，最终耗时 `265.579179ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，355 个网关相关测试全部通过，最终耗时 `4497.668772ms`。
- `node --test frontend/tests/*.test.ts`: 通过，413 个前端状态辅助测试全部通过，最终耗时 `4782.711684ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3417` 个模块完成转换，构建耗时 `28.98s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null` 已覆盖 `frontend/src/gatewayRouteActionController.ts`、`frontend/tests/gatewayRouteActionController.test.ts`、`frontend/tests/gatewayRouteToggleController.test.ts`、`frontend/tests/gatewayRouteDisableController.test.ts`、`frontend/tests/gatewayRouteEnableOnlyController.test.ts`、`frontend/tests/gatewayRouteCircuitController.test.ts`，均无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 196 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 197: 网关路由类型与路径选择入口边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteConfigController.ts`、`frontend/tests/gatewayRouteConfigController.test.ts`。
- 改动: 新增 `selectGatewayRouteType(...)` 和 `selectGatewayRoutePath(...)`，把路由类型和请求格式选择器的 unknown 值校验、无效值忽略、有效值转发迁入 route config controller；`GatewayView.vue` 的 `handleRouteTypeSelect()` / `handleRoutePathSelect()` 只保留页面事件入口和 controller 委托。
- 文件长度检查: `GatewayView.vue` 当前为 1144 行，`gatewayRouteConfigController.ts` 为 219 行，`gatewayRouteConfigController.test.ts` 为 502 行。相比任务 196 结束时，`GatewayView.vue` 行数保持 1144 行；route config controller 从 183 行增至 219 行，仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConfigController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteConfigController.ts' does not provide an export named 'selectGatewayRoutePath'`，确认选择入口 controller 边界尚未存在，最终失败耗时 `512.99245ms`。
- 行为锁定: 新测试覆盖有效 route type 选择会把原 route 和 typed route type 转发给 `changeRouteType`，无效 route type 不触发副作用；有效 route path 选择会把原 route 和 typed route path 转发给 `changeRoutePath`，无效 route path 不触发副作用。
- 视图边界锁定: 源码测试确认 `GatewayView.handleRouteTypeSelect()` 已委托 `selectGatewayRouteType(...)` 并传入 `changeRouteType: handleRouteTypeChange`；`GatewayView.handleRoutePathSelect()` 已委托 `selectGatewayRoutePath(...)` 并传入 `changeRoutePath: handleRoutePathChange`；两个 handler 内不再直接调用 `isGatewayRouteType(...)` 或 `isGatewayRoutePath(...)`。
- 副作用边界: 本任务未改变路由类型、请求格式选择器的合法值定义、无效值忽略规则、乐观更新、失败回滚、成功通知、路由标签展示、手动刷新、自动刷新、用量查询、站点分组刷新或 toast 规则；只是把选择入口校验和转发从视图迁入 route config controller。
- `node --test frontend/tests/gatewayRouteConfigController.test.ts`: 通过，13 个 route config controller 测试全部通过，最终耗时 `1844.628797ms`。
- `node --test frontend/tests/gatewayRouteConfigController.test.ts frontend/tests/gatewayRouteConfigModel.test.ts frontend/tests/gatewayRouteConfigCellComponent.test.ts`: 通过，25 个相邻 route config controller/model/component 测试全部通过，最终耗时 `940.584331ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，357 个网关相关测试全部通过，最终耗时 `4220.513273ms`。
- `node --test frontend/tests/*.test.ts`: 通过，415 个前端状态辅助测试全部通过，最终耗时 `2492.911926ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3417` 个模块完成转换，构建耗时 `51.16s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 首次请求 npm registry 超时失败，错误为 `connect ETIMEDOUT 198.18.1.114:443`；立即重试通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null` 已覆盖 `frontend/src/gatewayRouteConfigController.ts` 与 `frontend/tests/gatewayRouteConfigController.test.ts`，均无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 197 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 198: 网关路由探测入口依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeController.ts`、`frontend/tests/gatewayRouteProbeController.test.ts`。
- 改动: 新增 `probeAllGatewayRoutesAction(...)` 和 `probeGatewayRouteAction(...)`，把 `GatewayView.handleProbeAll()` / `handleProbeRoute()` 中的 route probe state 方法装配迁入 route probe controller；`GatewayView.vue` 只保留 routes、真实探测请求、结果应用、当前成功数、当前时间和通知依赖。
- 文件长度检查: `GatewayView.vue` 当前为 1141 行，`gatewayRouteProbeController.ts` 为 251 行，`gatewayRouteProbeController.test.ts` 为 473 行。相比任务 197 结束时，`GatewayView.vue` 从 1144 行降至 1141 行；route probe controller 仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbeController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteProbeController.ts' does not provide an export named 'probeAllGatewayRoutesAction'`，确认路由探测入口 action 边界尚未存在，最终失败耗时 `1104.540828ms`。
- 行为锁定: 新测试覆盖 `probeAllGatewayRoutesAction(...)` 通过 `probeState.startBatch`、`finishBatchRoute`、`finishBatch` 装配批量探测依赖，并保持 `start -> request/apply/finish-route -> completion notice -> finish` 顺序；`probeGatewayRouteAction(...)` 通过 `probeState.trackRoute`、`untrackRoute` 装配单路由探测依赖，并保持 `track -> request -> apply -> notice -> untrack` 顺序。
- 视图边界锁定: 源码测试确认 `GatewayView.handleProbeAll()` 已委托 `probeAllGatewayRoutesAction(...)` 并传入 `probeState: routeProbeState`；`GatewayView.handleProbeRoute()` 已委托 `probeGatewayRouteAction(...)` 并传入 `probeState: routeProbeState`；两个 handler 内不再直接调用 `probeGatewayRouteBatch(...)`、`probeSingleGatewayRoute(...)` 或逐项装配 `routeProbeState` 的 batch/single 方法。
- 副作用边界: 本任务未改变批量探测进度、单路由探测 track/untrack、失败结果转换、成功通知、路由状态合并、余额探测、手动刷新、自动刷新、用量查询、站点分组刷新或 toast 规则；只是把路由探测入口的 state 方法装配从视图迁入 route probe controller。
- `node --test frontend/tests/gatewayRouteProbeController.test.ts`: 通过，13 个 route probe controller 测试全部通过，最终耗时 `2744.386009ms`。
- `node --test frontend/tests/gatewayRouteProbeController.test.ts frontend/tests/gatewayRouteProbeModel.test.ts frontend/tests/gatewayRouteManagementToolbarComponent.test.ts`: 通过，28 个相邻 route probe/controller/model/toolbar 测试全部通过，最终耗时 `1242.287126ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，359 个网关相关测试全部通过，最终耗时 `2616.26344ms`。
- `node --test frontend/tests/*.test.ts`: 通过，417 个前端状态辅助测试全部通过，最终耗时 `3262.03947ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3417` 个模块完成转换，构建耗时 `1m 3s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null` 已覆盖 `frontend/src/gatewayRouteProbeController.ts` 与 `frontend/tests/gatewayRouteProbeController.test.ts`，均无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 198 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 199: 网关余额探测入口依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeFlowController.ts`、`frontend/tests/gatewayRouteBalanceProbeController.test.ts`。
- 改动: 新增 `updateAllGatewayRouteBalancesAction(...)` 和 `probeGatewayRouteBalanceAction(...)`，把 `GatewayView.handleUpdateAllBalances()` / `handleProbeRouteBalance(route)` 中的 balance probe state 方法装配迁入 balance probe flow controller；`GatewayView.vue` 只保留 routes、真实余额请求、结果应用、概要刷新、手动重试弹窗入口和通知依赖。
- 文件长度检查: `GatewayView.vue` 当前为 1139 行，`gatewayRouteBalanceProbeFlowController.ts` 为 295 行，`gatewayRouteBalanceProbeController.test.ts` 为 567 行。相比任务 198 结束时，`GatewayView.vue` 从 1141 行降至 1139 行；balance probe flow controller 仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteBalanceProbeFlowController.ts' does not provide an export named 'probeGatewayRouteBalanceAction'`，确认余额探测入口 action 边界尚未存在，最终失败耗时 `185.544484ms`。
- 行为锁定: 新测试覆盖 `updateAllGatewayRouteBalancesAction(...)` 通过 `probeState.startBatch`、`finishBatch` 装配批量余额更新依赖，并保持 `start -> probe -> refresh-summaries -> notice -> finish` 顺序；`probeGatewayRouteBalanceAction(...)` 通过 `probeState.trackRoute`、`untrackRoute` 装配单路由余额探测依赖，并保持 `track -> request -> apply -> refresh-summaries -> notice -> manual-dialog -> untrack` 顺序。
- 视图边界锁定: 源码测试确认 `GatewayView.handleUpdateAllBalances()` 已委托 `updateAllGatewayRouteBalancesAction(...)` 并传入 `probeState: routeBalanceProbeState`；`GatewayView.handleProbeRouteBalance(route)` 已委托 `probeGatewayRouteBalanceAction(...)` 并传入 `probeState: routeBalanceProbeState`；两个 handler 内不再逐项装配 `routeBalanceProbeState` 的 batch/single 方法。
- 副作用边界: 本任务未改变余额批量探测进度、单路由余额探测 track/untrack、失败后手动重试弹窗、overview 刷新、路由状态合并、路由探测、手动刷新、自动刷新、用量查询、站点分组刷新或 toast 规则；只是把余额探测入口的 state 方法装配从视图迁入 balance probe flow controller。
- `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts`: 通过，15 个 balance probe controller/flow 测试全部通过，最终耗时 `1349.957656ms`。
- `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeModel.test.ts frontend/tests/gatewayRouteBalanceCellComponent.test.ts frontend/tests/gatewayRouteBalanceManualDialogComponent.test.ts frontend/tests/gatewayRouteBatchActionComponent.test.ts`: 通过，40 个相邻 balance probe/model/component 测试全部通过，最终耗时 `315.527654ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，361 个网关相关测试全部通过，最终耗时 `2501.035787ms`。
- `node --test frontend/tests/*.test.ts`: 通过，419 个前端状态辅助测试全部通过，最终耗时 `2595.584645ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3417` 个模块完成转换，构建耗时 `16.21s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null` 已覆盖 `frontend/src/gatewayRouteBalanceProbeFlowController.ts` 与 `frontend/tests/gatewayRouteBalanceProbeController.test.ts`，均无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 199 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 200: 网关余额探测运行时 helper 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeRuntimeController.ts`、`frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts`、`frontend/tests/gatewayRouteBalanceProbeController.test.ts`。
- 改动: 新增 `createProbeGatewayRouteBalancesAction(...)`，把 `GatewayView.vue` 本地 `probeRouteBalances(routeIds, options)` helper 中的真实余额请求、余额结果合并、overview 刷新、route balance state track/untrack 和通知依赖装配迁入 balance probe runtime controller；`GatewayView.vue` 改为创建可复用 action 并继续供手动刷新、同步后静默余额探测和批量余额更新复用。
- 文件长度检查: `GatewayView.vue` 当前为 1135 行，`gatewayRouteBalanceProbeRuntimeController.ts` 为 56 行，`gatewayRouteBalanceProbeFlowController.ts` 为 295 行，`gatewayRouteBalanceProbeController.test.ts` 为 568 行，`gatewayRouteBalanceProbeRuntimeController.test.ts` 为 94 行。相比任务 199 结束时，`GatewayView.vue` 从 1139 行降至 1135 行；新增 runtime controller 低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts` 首次失败于 `Error [ERR_MODULE_NOT_FOUND]: Cannot find module .../frontend/src/gatewayRouteBalanceProbeRuntimeController.ts`，并且旧源码边界断言确认 `GatewayView.vue` 仍直接从 flow controller 导入 `probeGatewayRouteBalances`，最终失败耗时 `1790.402797ms`。
- 构建修正: 首次 `npm run build` 失败于 `src/gatewayRouteBalanceProbeRuntimeController.ts(5,1): error TS6133: 'RouteBatchProgress' is declared but its value is never read.`；已删除无用 type import，重跑构建通过。
- 行为锁定: 新测试覆盖 runtime action 会按 `track -> request -> apply -> overview -> set-overview -> notify -> notice -> untrack` 顺序调用底层余额探测流程，保留 progress 写入和全成功文案；源码测试确认 `GatewayView.vue` 已通过 `createProbeGatewayRouteBalancesAction(...)` 创建 `probeRouteBalances`，不再定义 `async function probeRouteBalances`，也不再直接 `return probeGatewayRouteBalances({ ... })`。
- 副作用边界: 本任务未改变手动刷新、同步后静默余额探测、余额批量更新、单路由余额探测、失败后手动重试弹窗、overview 刷新、路由状态合并、路由探测、自动刷新、用量查询、站点分组刷新或 toast 规则；只是把余额探测运行时 helper 的依赖装配从视图迁入 runtime controller。
- `node --test frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts`: 通过，17 个 balance probe runtime/controller 测试全部通过，最终耗时 `242.97832ms`。
- `node --test frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeModel.test.ts frontend/tests/gatewayManualRefreshController.test.ts frontend/tests/gatewaySyncController.test.ts frontend/tests/gatewayRouteBalanceCellComponent.test.ts frontend/tests/gatewayRouteBalanceManualDialogComponent.test.ts frontend/tests/gatewayRouteBatchActionComponent.test.ts`: 通过，50 个相邻 balance/manual-refresh/sync/component 测试全部通过，最终耗时 `315.135993ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，363 个网关相关测试全部通过，最终耗时 `2076.766597ms`。
- `node --test frontend/tests/*.test.ts`: 通过，421 个前端状态辅助测试全部通过，最终耗时 `2632.669863ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，构建耗时 `15.20s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null` 已覆盖 `frontend/src/gatewayRouteBalanceProbeRuntimeController.ts`、`frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts` 与 `frontend/tests/gatewayRouteBalanceProbeController.test.ts`，均无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；确认 `.DS_Store` 不存在，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 200 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 201: 网关路由摘要刷新运行时 helper 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteSummaryController.ts`、`frontend/tests/gatewayRouteSummaryController.test.ts`。
- 改动: 新增 `createRefreshGatewayRouteSummariesAction(...)`，把 `GatewayView.vue` 本地 `refreshRouteSummaries()` 中的当前 routes 读取、站点摘要请求、routes 写回和错误通知依赖装配迁入 route summary controller；`GatewayView.vue` 改为创建可复用 action，并继续供手动刷新、实时刷新和初始化加载后的路由摘要刷新链路复用。
- 文件长度检查: `GatewayView.vue` 当前为 1133 行，`gatewayRouteSummaryController.ts` 为 49 行，`gatewayRouteSummaryController.test.ts` 为 197 行。相比任务 200 结束时，`GatewayView.vue` 从 1135 行降至 1133 行；新增 action 仍保持 route summary controller 低于 50 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteSummaryController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteSummaryController.ts' does not provide an export named 'createRefreshGatewayRouteSummariesAction'`，退出码为 1，耗时 `1235.787023ms`。
- 行为锁定: 新测试覆盖 runtime action 会在调用时读取最新 `routes.value`，请求唯一站点摘要并按原有 `applyGatewaySiteSummaries` 规则写回；源码测试确认 `GatewayView.vue` 已通过 `createRefreshGatewayRouteSummariesAction(...)` 创建 `refreshRouteSummaries`，不再定义 `async function refreshRouteSummaries`，也不再在视图 helper 内直接装配 `refreshGatewayRouteSummaries({ ... })`。
- 副作用边界: 本任务未改变站点摘要去重、摘要字段合并、错误通知、手动刷新、实时刷新、初始化加载、路由探测、余额探测、优先级编辑、自动刷新、用量查询或 toast 规则；只是把路由摘要刷新运行时 helper 的依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayRouteSummaryController.test.ts`: 通过，5 个 route summary controller 测试全部通过，最终耗时 `455.098872ms`。
- `node --test frontend/tests/gatewayRouteSummaryController.test.ts frontend/tests/gatewayManualRefreshController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRouteConfigController.test.ts frontend/tests/gatewaySyncController.test.ts frontend/tests/gatewayRouteStateModel.test.ts`: 通过，60 个 route summary/manual-refresh/balance/config/sync/state 相邻测试全部通过，最终耗时 `4773.698913ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，364 个网关相关测试全部通过，最终耗时 `3668.854737ms`。
- `node --test frontend/tests/*.test.ts`: 通过，422 个前端状态辅助测试全部通过，最终耗时 `2382.753986ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，构建耗时 `45.75s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- 新增文件空白检查: `rg -n "^(<<<<<<<|=======|>>>>>>>)|[ \t]+$" frontend/src/gatewayRouteSummaryController.ts frontend/tests/gatewayRouteSummaryController.test.ts` 无输出，未发现冲突标记或行尾空白；命令退出码 1 为无匹配的预期结果。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；`find . -name .DS_Store -print` 无输出，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 201 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 202: 网关优先级重排结果应用运行时 helper 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityController.ts`、`frontend/tests/gatewayPriorityController.test.ts`。
- 改动: 新增 `createApplyGatewayPriorityReorderedRoutesAction(...)`，把 `GatewayView.vue` 本地 `applyReorderedRoutes(routeData)` 中的 `includeDisabled.value` 读取、`priorityRoutes` 写回和 `routes` 写回依赖装配迁入 priority controller；`GatewayView.vue` 改为创建可复用 action，并继续供优先级移动和预设重排流程复用。
- 文件长度检查: `GatewayView.vue` 当前为 1130 行，`gatewayPriorityController.ts` 为 228 行，`gatewayPriorityController.test.ts` 为 493 行。相比任务 201 结束时，`GatewayView.vue` 从 1133 行降至 1130 行；priority controller 仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayPriorityController.ts' does not provide an export named 'createApplyGatewayPriorityReorderedRoutesAction'`，退出码为 1，耗时 `1973.38979ms`。
- 行为锁定: 新测试覆盖 runtime action 会在调用时读取最新 `includeDisabled`，继续按 `replaceReorderedGatewayRoutes(...)` 归一化路由，保留禁用路由是否进入主 routes 列表的原有规则；源码测试确认 `GatewayView.vue` 已通过 `createApplyGatewayPriorityReorderedRoutesAction(...)` 创建 `applyReorderedRoutes`，不再定义 `function applyReorderedRoutes`，也不再直接引用 `applyGatewayPriorityReorderedRoutes`。
- 副作用边界: 本任务未改变优先级列表加载、移动参数校验、移动请求 payload、预设重排 payload、成功/失败通知、选中路由刷新、插入下标清理、路由摘要刷新、余额探测、路由探测、自动刷新、用量查询或 toast 规则；只是把优先级重排结果应用 helper 的依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayPriorityController.test.ts`: 通过，16 个 priority controller 测试全部通过，最终耗时 `2300.385676ms`。
- `node --test frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayPriorityModel.test.ts frontend/tests/gatewayPriorityDialogComponent.test.ts frontend/tests/gatewayOverlayHostComponent.test.ts frontend/tests/gatewayRouteStateModel.test.ts`: 通过，47 个 priority/model/dialog/overlay/state 相邻测试全部通过，最终耗时 `272.619344ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，366 个网关相关测试全部通过，最终耗时 `2366.482693ms`。
- `node --test frontend/tests/*.test.ts`: 通过，424 个前端状态辅助测试全部通过，最终耗时 `2117.507904ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，构建耗时 `37.51s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayPriorityController.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- `git diff --no-index --check /dev/null frontend/tests/gatewayPriorityController.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；`find . -name .DS_Store -print` 无输出，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 202 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 203: 网关优先级移动运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityController.ts`、`frontend/tests/gatewayPriorityController.test.ts`。
- 改动: 新增 `createMoveGatewayPriorityRouteAction(...)`，把 `GatewayView.vue` 本地 `handlePriorityMove()` 中的 `priorityRoute.value`、`priorityInsertIndex.value`、重排请求、重排结果应用、loading、选中路由刷新和通知依赖装配迁入 priority controller；`GatewayView.vue` 改为创建可复用 action 并继续作为优先级弹窗移动事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1128 行，`gatewayPriorityController.ts` 为 246 行，`gatewayPriorityController.test.ts` 为 537 行。相比任务 202 结束时，`GatewayView.vue` 从 1130 行降至 1128 行；priority controller 仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayPriorityController.ts' does not provide an export named 'createMoveGatewayPriorityRouteAction'`，退出码为 1，失败测试耗时 `674.46015ms`。
- 行为锁定: 新测试覆盖 runtime action 会在调用时读取最新 route 和 target，继续复用 `moveGatewayPriorityRoute(...)` 的参数校验、请求 payload、loading 顺序、重排结果应用、选中路由刷新和成功通知；源码测试确认 `GatewayView.vue` 已通过 `createMoveGatewayPriorityRouteAction(...)` 创建 `handlePriorityMove`，不再定义 `async function handlePriorityMove`，也不再直接装配 `moveGatewayPriorityRoute({ ... })`。
- 副作用边界: 本任务未改变优先级移动 payload 规则、目标优先级校验、重排结果应用、失败通知、预设重排、优先级列表加载、路由摘要刷新、余额探测、路由探测、自动刷新、用量查询或 toast 规则；只是把优先级移动 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayPriorityController.test.ts`: 通过，17 个 priority controller 测试全部通过，最终耗时 `178.653193ms`。
- `node --test frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayPriorityModel.test.ts frontend/tests/gatewayPriorityDialogComponent.test.ts frontend/tests/gatewayOverlayHostComponent.test.ts frontend/tests/gatewayRouteStateModel.test.ts`: 通过，48 个 priority/model/dialog/overlay/state 相邻测试全部通过，最终耗时 `216.672546ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，367 个网关相关测试全部通过，最终耗时 `2024.023398ms`。
- `node --test frontend/tests/*.test.ts`: 通过，425 个前端状态辅助测试全部通过，最终耗时 `1694.504005ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，构建耗时 `25.20s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 首次因 registry 网络超时失败，错误为 `connect ETIMEDOUT 198.18.1.114:443`；重试通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayPriorityController.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- `git diff --no-index --check /dev/null frontend/tests/gatewayPriorityController.test.ts`: 无输出，未发现空白错误；命令退出码为 no-index 差异的预期非零。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；`find . -name .DS_Store -print` 无输出，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 203 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 204: 网关优先级预设重排运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityController.ts`、`frontend/tests/gatewayPriorityController.test.ts`。
- 改动: 新增 `createPresetGatewayPriorityRoutesAction(...)`，把 `GatewayView.vue` 本地 `handlePriorityPreset(mode)` 中的当前选中路由读取、重排请求、重排结果应用、loading、插入目标清理、选中路由刷新和通知依赖装配迁入 priority controller；`GatewayView.vue` 改为创建可复用 action 并继续作为优先级预设按钮事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1122 行，`gatewayPriorityController.ts` 为 262 行，`gatewayPriorityController.test.ts` 为 580 行。相比任务 203 结束时，`GatewayView.vue` 从 1128 行降至 1122 行；priority controller 仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayPriorityController.ts' does not provide an export named 'createPresetGatewayPriorityRoutesAction'`，退出码为 1，失败测试耗时 `232.162988ms`，整体耗时 `251.361428ms`。
- 中间边界校验: 首次实现 action 后目标测试仍失败于 2 个源码边界断言，旧正则仍要求 `GatewayView.vue` 直接导入 `presetGatewayPriorityRoutes`；已将断言更新为 `createPresetGatewayPriorityRoutesAction`，避免测试继续锁定旧视图装配方式。
- 构建修复: 首次 `npm run build` 暴露 `GatewayView.vue` 中 `GatewayPriorityPresetMode` 未使用，`vue-tsc` 报 `TS6133`；已移除视图内未使用类型导入，类型归属保留在 controller/model 边界。
- 行为锁定: 新测试覆盖 runtime action 会在调用时读取最新 `priorityRoute.value`，继续复用 `presetGatewayPriorityRoutes(...)` 的套餐/余额预设 payload、loading 顺序、重排结果应用、插入目标清理、选中路由刷新和成功通知；源码测试确认 `GatewayView.vue` 已通过 `createPresetGatewayPriorityRoutesAction(...)` 创建 `handlePriorityPreset`，不再定义 `async function handlePriorityPreset`，也不再直接装配 `presetGatewayPriorityRoutes({ ... })`。
- 副作用边界: 本任务未改变优先级预设 payload 规则、成功文案、重排结果应用、失败通知、优先级移动、优先级列表加载、路由摘要刷新、余额探测、路由探测、自动刷新、用量查询或 toast 规则；只是把优先级预设 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayPriorityController.test.ts`: 通过，18 个 priority controller 测试全部通过；最终补跑耗时 `654.673872ms`。
- `node --test frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayPriorityModel.test.ts frontend/tests/gatewayPriorityDialogComponent.test.ts frontend/tests/gatewayOverlayHostComponent.test.ts frontend/tests/gatewayRouteStateModel.test.ts`: 通过，49 个 priority/model/dialog/overlay/state 相邻测试全部通过，最终耗时 `313.251813ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，368 个网关相关测试全部通过，最终耗时 `2490.202221ms`。
- `node --test frontend/tests/*.test.ts`: 通过，426 个前端状态辅助测试全部通过，最终耗时 `2603.347512ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 修复未使用导入后通过，`3418` 个模块完成转换，构建耗时 `1m 10s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayPriorityController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayPriorityController.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；`find . -name .DS_Store -print` 无输出，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 204 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 205: 网关优先级列表加载运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityController.ts`、`frontend/tests/gatewayPriorityController.test.ts`。
- 改动: 新增 `createOpenGatewayPriorityDialogAction(...)`，把 `GatewayView.vue` 本地 `openPriorityDialog(route)` 中的当前 routes 读取、优先级列表请求、路由归一化、弹窗打开、loading、列表写入、选中路由刷新和通知依赖装配迁入 priority controller；`GatewayView.vue` 改为创建可复用 action 并继续作为路由表优先级入口事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1119 行，`gatewayPriorityController.ts` 为 278 行，`gatewayPriorityController.test.ts` 为 635 行。相比任务 204 结束时，`GatewayView.vue` 从 1122 行降至 1119 行；priority controller 仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayPriorityController.ts' does not provide an export named 'createOpenGatewayPriorityDialogAction'`，退出码为 1，失败测试耗时 `1089.610092ms`，整体耗时 `1102.408203ms`。
- 行为锁定: 新测试覆盖 runtime action 会在每次调用时读取最新 `routes.value`，继续复用 `loadGatewayPriorityRoutes(...)` 的弹窗打开、`includeDisabled: true` 请求、路由 normalize、loading 顺序、列表写入、选中路由刷新和失败通知；源码测试确认 `GatewayView.vue` 已通过 `createOpenGatewayPriorityDialogAction(...)` 创建 `openPriorityDialog`，不再定义 `async function openPriorityDialog`，也不再在视图内直接装配 `loadGatewayPriorityRoutes({ ... })`。
- 副作用边界: 本任务未改变优先级列表加载请求参数、弹窗打开时机、loading 复位、失败通知、优先级移动、预设重排、重排结果应用、路由摘要刷新、余额探测、路由探测、自动刷新、用量查询或 toast 规则；只是把优先级列表加载 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayPriorityController.test.ts`: 通过，19 个 priority controller 测试全部通过，最终耗时 `2334.600541ms`。
- `node --test frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayPriorityModel.test.ts frontend/tests/gatewayPriorityDialogComponent.test.ts frontend/tests/gatewayOverlayHostComponent.test.ts frontend/tests/gatewayRouteStateModel.test.ts`: 通过，50 个 priority/model/dialog/overlay/state 相邻测试全部通过，最终耗时 `395.839737ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，369 个网关相关测试全部通过，最终耗时 `2764.732077ms`。
- `node --test frontend/tests/*.test.ts`: 通过，427 个前端状态辅助测试全部通过，最终耗时 `2475.840361ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，构建耗时 `42.52s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayPriorityController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayPriorityController.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；`find . -name .DS_Store -print` 无输出，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 205 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 206: 网关路由诊断抽屉加载运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteDiagnosisController.ts`、`frontend/tests/gatewayRouteDiagnosisController.test.ts`。
- 改动: 新增 `createOpenGatewayRouteDiagnosisAction(...)`，把 `GatewayView.vue` 本地 `openRouteDiagnosis(route)` 中的真实诊断请求、抽屉打开、loading、诊断结果写入和通知依赖装配迁入 route diagnosis controller；`GatewayView.vue` 改为创建可复用 action 并继续作为路由表诊断入口事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1116 行，`gatewayRouteDiagnosisController.ts` 为 73 行，`gatewayRouteDiagnosisController.test.ts` 为 191 行。相比任务 205 结束时，`GatewayView.vue` 从 1119 行降至 1116 行；route diagnosis controller 仍保持轻量。
- TDD 红灯: `node --test frontend/tests/gatewayRouteDiagnosisController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteDiagnosisController.ts' does not provide an export named 'createOpenGatewayRouteDiagnosisAction'`，退出码为 1，失败测试耗时 `922.267532ms`，整体耗时 `933.212641ms`。
- 行为锁定: 新测试覆盖 runtime action 继续复用 `loadGatewayRouteDiagnosis(...)` 的抽屉打开、按 route id 请求诊断、loading 顺序、诊断结果写入和失败通知；源码测试确认 `GatewayView.vue` 已通过 `createOpenGatewayRouteDiagnosisAction(...)` 创建 `openRouteDiagnosis`，不再定义 `async function openRouteDiagnosis`，也不再在视图内直接装配 `loadGatewayRouteDiagnosis({ ... })`。
- 副作用边界: 本任务未改变路由诊断抽屉打开时机、loading 复位、失败通知、路由日志抽屉、优先级弹窗、路由探测、余额探测、自动刷新、用量查询或 toast 规则；只是把路由诊断 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayRouteDiagnosisController.test.ts`: 通过，6 个 route diagnosis controller 测试全部通过，最终耗时 `1809.223632ms`。
- `node --test frontend/tests/gatewayRouteDiagnosisController.test.ts frontend/tests/gatewayRouteDiagnosisDrawerComponent.test.ts frontend/tests/gatewayOverlayHostComponent.test.ts`: 通过，10 个 route diagnosis/overlay 相邻测试全部通过，最终耗时 `242.521694ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，370 个网关相关测试全部通过，最终耗时 `2639.239481ms`。
- `node --test frontend/tests/*.test.ts`: 通过，428 个前端状态辅助测试全部通过，最终耗时 `2568.956004ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，构建耗时 `15.86s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteDiagnosisController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayRouteDiagnosisController.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；`find . -name .DS_Store -print` 无输出，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 206 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 207: 网关路由日志抽屉加载运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteLogsController.ts`、`frontend/tests/gatewayRouteLogsController.test.ts`。
- 改动: 新增 `createOpenGatewayRouteLogsAction(...)`，把 `GatewayView.vue` 本地 `openRouteLogs(route)` 中的真实日志请求、抽屉打开、loading、日志结果写入、失败清空和通知依赖装配迁入 route logs controller；`GatewayView.vue` 改为创建可复用 action 并继续作为路由表日志入口事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1113 行，`gatewayRouteLogsController.ts` 为 88 行，`gatewayRouteLogsController.test.ts` 为 220 行。相比任务 206 结束时，`GatewayView.vue` 从 1116 行降至 1113 行；route logs controller 仍保持轻量。
- TDD 红灯: `node --test frontend/tests/gatewayRouteLogsController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteLogsController.ts' does not provide an export named 'createOpenGatewayRouteLogsAction'`，退出码为 1，失败测试耗时 `798.112473ms`，整体耗时 `806.526958ms`。
- 行为锁定: 新测试覆盖 runtime action 继续复用 `loadGatewayRouteLogs(...)` 的抽屉打开、按 route id 读取最近 120 条日志、loading 顺序、日志结果写入、失败通知和失败清空；源码测试确认 `GatewayView.vue` 已通过 `createOpenGatewayRouteLogsAction(...)` 创建 `openRouteLogs`，不再定义 `async function openRouteLogs`，也不再在视图内直接装配 `loadGatewayRouteLogs({ ... })`。
- 副作用边界: 本任务未改变路由日志抽屉打开时机、loading 复位、成功日志写入、失败清空、失败通知、路由诊断抽屉、优先级弹窗、路由探测、余额探测、自动刷新、用量查询或 toast 规则；只是把路由日志 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayRouteLogsController.test.ts`: 通过，6 个 route logs controller 测试全部通过，最终耗时 `1092.87703ms`。
- `node --test frontend/tests/gatewayRouteLogsController.test.ts frontend/tests/gatewayLogsController.test.ts frontend/tests/gatewayRouteLogsModel.test.ts frontend/tests/gatewayLogsDrawerComponent.test.ts frontend/tests/gatewayOverlayHostComponent.test.ts`: 通过，13 个 route logs/log drawer/overlay 相邻测试全部通过，最终耗时 `435.392336ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，371 个网关相关测试全部通过，最终耗时 `1911.529867ms`。
- `node --test frontend/tests/*.test.ts`: 通过，429 个前端状态辅助测试全部通过，最终耗时 `3228.868426ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，构建耗时 `14.70s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteLogsController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayRouteLogsController.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；`find . -name .DS_Store -print` 无输出，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 207 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 208: 网关访问复制运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAccessController.ts`、`frontend/tests/gatewayAccessController.test.ts`。
- 改动: 新增 `createCopyGatewayRequestUrlAction(...)` 和 `createCopyGatewayApiKeyAction(...)`，把 `GatewayView.vue` 本地 `copyGatewayRequestUrl()` / `copyGatewayApiKey()` 中的当前请求 URL 或 API Key 读取、真实剪贴板写入函数和通知依赖装配迁入 gateway access controller；`GatewayView.vue` 改为创建可复用 action，并继续作为网关访问栏和路由管理 toolbar 的复制事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1109 行，`gatewayAccessController.ts` 为 95 行，`gatewayAccessController.test.ts` 为 189 行。相比任务 207 结束时，`GatewayView.vue` 从 1113 行降至 1109 行；gateway access controller 仍保持轻量。
- TDD 红灯: `node --test frontend/tests/gatewayAccessController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayAccessController.ts' does not provide an export named 'createCopyGatewayApiKeyAction'`，退出码为 1，失败测试耗时 `206.229806ms`，整体耗时 `213.886994ms`。
- 行为锁定: 新测试覆盖 runtime action 会在每次调用时读取最新请求 URL 或 API Key，继续复用 `copyGatewayRequestUrlToClipboard(...)` 和 `copyGatewayApiKeyToClipboard(...)` 的复制成功提示、空 API Key 提示和剪贴板失败提示；源码测试确认 `GatewayView.vue` 已通过 `createCopyGatewayRequestUrlAction(...)` 和 `createCopyGatewayApiKeyAction(...)` 创建复制处理器，不再定义 `async function copyGatewayRequestUrl` / `async function copyGatewayApiKey`，也不再在视图内直接装配 `copyGatewayRequestUrlToClipboard({ ... })` 或 `copyGatewayApiKeyToClipboard({ ... })`。
- 副作用边界: 本任务未改变网关请求 URL 计算、Codex `/v1` 提示、API Key 掩码、设置弹窗、访问栏 UI、复制成功提示、空 API Key 提示、剪贴板失败提示、路由日志抽屉、路由诊断抽屉、优先级弹窗、路由探测、余额探测、自动刷新或用量查询规则；只是把访问复制 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayAccessController.test.ts`: 通过，9 个 gateway access controller 测试全部通过，最终耗时 `159.382989ms`。
- `node --test frontend/tests/gatewayAccessController.test.ts frontend/tests/gatewayAccessModel.test.ts frontend/tests/gatewayAccessBarComponent.test.ts frontend/tests/gatewayMonitorToolbarComponent.test.ts frontend/tests/gatewayRouteManagementToolbarComponent.test.ts`: 通过，25 个 access/model/toolbar 相邻测试全部通过，最终耗时 `270.658918ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，373 个网关相关测试全部通过，最终耗时 `5683.052162ms`。
- `node --test frontend/tests/*.test.ts`: 通过，431 个前端状态辅助测试全部通过，最终耗时 `2596.809411ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，构建耗时 `43.43s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayAccessController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayAccessController.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；`find . -name .DS_Store -print` 无输出，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 208 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 209: 网关活动 URL 复制运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayActivityController.ts`、`frontend/tests/gatewayActivityController.test.ts`。
- 改动: 新增 `createCopyGatewayActivityUrlAction(...)`，把 `GatewayView.vue` 本地 `copyGatewayActivityUrl(value)` 中的活动 URL 参数转发、真实剪贴板写入函数和通知依赖装配迁入 gateway activity controller；`GatewayView.vue` 改为创建可复用 action，并继续作为监控活动流复制事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1106 行，`gatewayActivityController.ts` 为 42 行，`gatewayActivityController.test.ts` 为 101 行。相比任务 208 结束时，`GatewayView.vue` 从 1109 行降至 1106 行；gateway activity controller 仍保持轻量。
- TDD 红灯: `node --test frontend/tests/gatewayActivityController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayActivityController.ts' does not provide an export named 'createCopyGatewayActivityUrlAction'`，退出码为 1，失败测试耗时 `465.887412ms`，整体耗时 `477.586797ms`。
- 行为锁定: 新测试覆盖 runtime action 会把传入活动 URL 转交给 `copyGatewayActivityUrlToClipboard(...)`，继续复用 trim 归一化、空值跳过、复制成功提示和剪贴板失败提示；源码测试确认 `GatewayView.vue` 已通过 `createCopyGatewayActivityUrlAction(...)` 创建 `copyGatewayActivityUrl`，不再定义 `async function copyGatewayActivityUrl`，也不再在视图内直接装配 `copyGatewayActivityUrlToClipboard({ ... })`。
- 副作用边界: 本任务未改变活动 URL 来源、trim 规则、空值跳过行为、真实 Clipboard API 调用、成功/失败提示文案、监控活动流组件绑定、日志展示、访问栏复制、toolbar 复制、路由日志抽屉、路由诊断抽屉、自动刷新或用量查询规则；只是把活动请求 URL 复制 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayActivityController.test.ts`: 通过，5 个 gateway activity controller 测试全部通过，最终耗时 `297.138731ms`。
- `node --test frontend/tests/gatewayActivityController.test.ts frontend/tests/gatewayActivityPanelComponent.test.ts frontend/tests/gatewayRouteDisplayModel.test.ts frontend/tests/gatewayMonitorDashboardComponent.test.ts`: 通过，16 个 activity/display/monitor 相邻测试全部通过，最终耗时 `583.886328ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，374 个网关相关测试全部通过，最终耗时 `12879.984025ms`。
- `node --test frontend/tests/*.test.ts`: 通过，432 个前端状态辅助测试全部通过，最终耗时 `3035.900895ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，构建耗时 `49.14s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayActivityController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayActivityController.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；`find . -name .DS_Store -print` 无输出，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 209 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 210: 网关手动刷新运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayManualRefreshController.ts`、`frontend/tests/gatewayManualRefreshController.test.ts`。
- 改动: 新增 `createRefreshGatewayManuallyAction(...)`，把 `GatewayView.vue` 本地 `handleRefresh()` 中的当前 routes 读取、手动刷新请求、静默余额探测和路由摘要刷新依赖装配迁入 gateway manual refresh controller；`GatewayView.vue` 改为创建可复用 action，并继续作为监控和路由管理 toolbar 的手动刷新事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1104 行，`gatewayManualRefreshController.ts` 为 42 行，`gatewayManualRefreshController.test.ts` 为 177 行。相比任务 209 结束时，`GatewayView.vue` 从 1106 行降至 1104 行；gateway manual refresh controller 仍保持轻量。
- TDD 红灯: `node --test frontend/tests/gatewayManualRefreshController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayManualRefreshController.ts' does not provide an export named 'createRefreshGatewayManuallyAction'`，退出码为 1，失败测试耗时 `260.571332ms`，整体耗时 `272.346921ms`。
- 行为锁定: 新测试覆盖 runtime action 会在每次调用时读取最新 routes，继续复用 `refreshGatewayManually(...)` 的 `loadGatewayData -> probeRouteBalances(..., { silent: true }) -> refreshRouteSummaries` 顺序、load 错误传播和余额探测错误传播；源码测试确认 `GatewayView.vue` 已通过 `createRefreshGatewayManuallyAction(...)` 创建 `handleRefresh`，不再定义 `async function handleRefresh`，也不再在视图内直接装配 `refreshGatewayManually({ ... })`。
- 副作用边界: 本任务未改变手动刷新成功或失败传播、静默余额探测、路由摘要刷新顺序、访问复制、活动 URL 复制、日志抽屉、路由诊断抽屉、自动刷新或用量查询规则；只是把手动刷新 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayManualRefreshController.test.ts`: 通过，5 个 gateway manual refresh controller 测试全部通过，最终耗时 `151.9973ms`。
- `node --test frontend/tests/gatewayManualRefreshController.test.ts frontend/tests/gatewayRouteSummaryController.test.ts frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayMonitorToolbarComponent.test.ts frontend/tests/gatewayRouteManagementToolbarComponent.test.ts`: 通过，31 个 manual refresh、summary、balance runtime 和 toolbar 相邻测试全部通过，最终耗时 `7753.225268ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，375 个网关相关测试全部通过，最终耗时 `2924.363758ms`。
- `node --test frontend/tests/*.test.ts`: 通过，433 个前端状态辅助测试全部通过，最终耗时 `2170.114448ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，构建耗时 `30.11s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayManualRefreshController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayManualRefreshController.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；`find . -name .DS_Store -print` 无输出，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 210 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 211: 网关同步运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewaySyncController.ts`、`frontend/tests/gatewaySyncController.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `createSyncGatewayRoutesWithBalancesAction(...)`，把 `GatewayView.vue` 本地 `handleSync()` 中的当前 routes 读取、同步请求、数据重载、静默余额探测、loading 和通知依赖装配迁入 gateway sync controller；`GatewayView.vue` 改为创建可复用 action，并继续作为路由管理 toolbar 的同步事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1102 行，`gatewaySyncController.ts` 为 74 行，`gatewaySyncController.test.ts` 为 212 行，`gatewayViewModel.test.ts` 为 336 行。相比任务 210 结束时，`GatewayView.vue` 从 1104 行降至 1102 行；gateway sync controller 仍保持轻量。
- TDD 红灯: `node --test frontend/tests/gatewaySyncController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewaySyncController.ts' does not provide an export named 'createSyncGatewayRoutesWithBalancesAction'`，退出码为 1，失败测试耗时 `204.153636ms`，整体耗时 `217.017826ms`。
- 行为锁定: 新测试覆盖 runtime action 会在每次调用时读取最新 routes，继续复用 `syncGatewayRoutesWithBalances(...)` 的 `setLoading(true) -> requestSync -> reloadGatewayData -> probeRouteBalances(..., { silent: true }) -> success notice -> setLoading(false)` 顺序、同步错误通知、reload 失败通知和余额探测错误传播；源码测试确认 `GatewayView.vue` 已通过 `createSyncGatewayRoutesWithBalancesAction(...)` 创建 `handleSync`，不再定义 `async function handleSync`，也不再在视图内直接装配 `syncGatewayRoutesWithBalances({ ... })`。
- 中间边界校验: 首轮网关域和全量前端测试失败于 `frontend/tests/gatewayViewModel.test.ts` 的旧源码断言仍查找 `async function handleSync()`；已按任务 211 的 action factory 目标结构更新该测试的切片边界，并用 `node --test frontend/tests/gatewayViewModel.test.ts` 复核 8 个测试全部通过，最终耗时 `230.302295ms`。
- 副作用边界: 本任务未改变同步成功提示、同步失败传播、reload 失败通知行为、余额探测错误传播、手动刷新、访问复制、活动 URL 复制、路由探测、路由摘要刷新、日志抽屉、路由诊断抽屉、自动刷新或用量查询规则；只是把同步 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewaySyncController.test.ts`: 通过，5 个 gateway sync controller 测试全部通过，最终耗时 `470.383172ms`。
- `node --test frontend/tests/gatewaySyncController.test.ts frontend/tests/gatewayRouteStateModel.test.ts frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayRouteManagementToolbarComponent.test.ts`: 通过，81 个 sync、route state、balance runtime、runtime 和 toolbar 相邻测试全部通过，最终耗时 `6585.168189ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，376 个网关相关测试全部通过，最终耗时 `4238.568185ms`。
- `node --test frontend/tests/*.test.ts`: 通过，434 个前端状态辅助测试全部通过，最终耗时 `4424.431993ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，构建耗时 `1m 32s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewaySyncController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewaySyncController.test.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayViewModel.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 211 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 212: 网关站点分组刷新运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewaySiteGroupsController.ts`、`frontend/tests/gatewaySiteGroupsController.test.ts`。
- 改动: 新增 `createRefreshGatewaySiteGroupsAction(...)`，把 `GatewayView.vue` 本地 `handleSiteGroupsChanged()` 中的站点分组请求和 `siteGroups` 写回依赖装配迁入 gateway site groups controller；`GatewayView.vue` 改为创建可复用 action，并继续作为全局 header 分组变化后的刷新事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1100 行，`gatewaySiteGroupsController.ts` 为 28 行，`gatewaySiteGroupsController.test.ts` 为 107 行。相比任务 211 结束时，`GatewayView.vue` 从 1102 行降至 1100 行；gateway site groups controller 仍保持轻量。
- TDD 红灯: `node --test frontend/tests/gatewaySiteGroupsController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewaySiteGroupsController.ts' does not provide an export named 'createRefreshGatewaySiteGroupsAction'`，退出码为 1，失败测试耗时 `170.327154ms`，整体耗时 `180.391446ms`。
- 行为锁定: 新测试覆盖 runtime action 会通过注入的 `requestSiteGroups` 和 `setSiteGroups` 刷新站点分组选项；源码测试确认 `GatewayView.vue` 已通过 `createRefreshGatewaySiteGroupsAction(...)` 创建 `handleSiteGroupsChanged`，不再定义 `async function handleSiteGroupsChanged`，也不再在视图内直接装配 `refreshGatewaySiteGroups({ ... })`。
- 副作用边界: 本任务未改变站点分组刷新失败时保留现有分组选项的静默行为，未改变新增上游、路由同步、手动刷新、自动刷新、访问复制、活动 URL 复制、路由探测、路由摘要刷新、日志抽屉、路由诊断抽屉或用量查询规则；只是把站点分组刷新 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewaySiteGroupsController.test.ts`: 通过，4 个 gateway site groups controller 测试全部通过，最终耗时 `178.949084ms`。
- `node --test frontend/tests/gatewaySiteGroupsController.test.ts frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewayRouteManagementToolbarComponent.test.ts frontend/tests/gatewaySyncController.test.ts`: 通过，17 个 site groups、add upstream、toolbar 和 sync 相邻测试全部通过，最终耗时 `3449.214194ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，377 个网关相关测试全部通过，最终耗时 `5181.141419ms`。
- `node --test frontend/tests/*.test.ts`: 通过，435 个前端状态辅助测试全部通过，最终耗时 `5115.304094ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，构建耗时 `30.71s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewaySiteGroupsController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewaySiteGroupsController.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；`find . -name .DS_Store -print` 无输出，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 212 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 213: 网关用量查询入口运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayUsageRangeController.ts`、`frontend/tests/gatewayUsageRangeController.test.ts`。
- 改动: 新增 `createLoadGatewayUsageAction(...)` 和 `createLoadGatewayUsageTodayAction(...)`，把 `GatewayView.vue` 本地 `handleUsageQuery()` / `handleUsageToday()` 的用量查询与今日快捷查询运行时依赖装配迁入 gateway usage range controller；`GatewayView.vue` 改为创建可复用 action，并继续作为 monitor 用量面板的查询事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1099 行，`gatewayUsageRangeController.ts` 为 70 行，`gatewayUsageRangeController.test.ts` 为 123 行。相比任务 212 结束时，`GatewayView.vue` 从 1100 行降至 1099 行；gateway usage range controller 仍保持轻量。
- TDD 红灯: `node --test frontend/tests/gatewayUsageRangeController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayUsageRangeController.ts' does not provide an export named 'createLoadGatewayUsageAction'`，退出码为 1，失败测试耗时 `132.039601ms`，整体耗时 `139.796327ms`。
- 行为锁定: 新测试覆盖普通用量查询 action 会通过注入的 `loadGatewayUsage` 加载，今日快捷查询 action 会保持 `resetToToday -> loadGatewayUsage` 顺序；源码测试确认 `GatewayView.vue` 已通过 `createLoadGatewayUsageAction(...)` 和 `createLoadGatewayUsageTodayAction(...)` 创建 `handleUsageQuery` / `handleUsageToday`，不再定义两个 async handler，也不再在视图 handler 内直接调用 `loadGatewayUsageToday({ ... })` 或 `await loadGatewayUsage()`。
- 副作用边界: 本任务未改变用量查询的错误传播、今日范围重置顺序、无效时间范围提示、monitor 之外清空用量数据、自动刷新、站点分组刷新、路由同步或 runtime loading 规则；只是把两个用量入口 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayUsageRangeController.test.ts`: 通过，8 个 gateway usage range controller 测试全部通过，最终耗时 `403.538907ms`。
- `node --test frontend/tests/gatewayUsageRangeController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsagePanelComponent.test.ts frontend/tests/gatewayMonitorDashboardComponent.test.ts`: 通过，52 个 usage range、runtime、usage panel 和 monitor dashboard 相邻测试全部通过，最终耗时 `263.306075ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，379 个网关相关测试全部通过，最终耗时 `3978.080552ms`。
- `node --test frontend/tests/*.test.ts`: 通过，437 个前端状态辅助测试全部通过，最终耗时 `3984.898268ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，构建耗时 `1.16s`。仍有既有大 chunk 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayUsageRangeController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayUsageRangeController.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；`find . -name .DS_Store -print` 无输出，保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 213 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 214: 网关路由开关入口运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteActionController.ts`、`frontend/tests/gatewayRouteActionController.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `createToggleGatewayRouteAction(...)`、`createDisableAllGatewayRoutesAction(...)`、`createEnableOnlyGatewayRouteAction(...)` 和 `createResetGatewayRouteCircuitAction(...)`，把 `GatewayView.vue` 本地 `handleToggle()`、`handleDisableAllRoutes()`、`handleEnableOnlyRoute()`、`handleResetCircuit()` 的路由开关、全禁用、仅启用和 circuit reset 运行时依赖装配迁入 gateway route action controller；`GatewayView.vue` 改为创建可复用 action，并继续作为路由管理表格和 toolbar 的动作事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1088 行，`gatewayRouteActionController.ts` 为 101 行，`gatewayRouteActionController.test.ts` 为 247 行，`gatewayViewModel.test.ts` 为 346 行。相比任务 213 结束时，`GatewayView.vue` 从 1099 行降至 1088 行；gateway route action controller 仍保持轻量。
- TDD 红灯: `node --test frontend/tests/gatewayRouteActionController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteActionController.ts' does not provide an export named 'createDisableAllGatewayRoutesAction'`，退出码为 1，失败测试耗时 `604.983057ms`，整体耗时 `612.775528ms`。
- 行为锁定: 新测试覆盖四个 runtime action 会通过注入的请求、确认、路由 label、reload 和通知依赖执行，并保持确认文案、确认取消分支、成功通知、失败传播和 reload 顺序；源码测试确认 `GatewayView.vue` 已通过四个 action factory 创建路由动作 handler，不再定义对应 async handler，也不再在视图内直接装配单次 route action 调用。
- 中间边界校验: 首次重跑网关域和全量前端辅助测试失败于 `frontend/tests/gatewayViewModel.test.ts` 的旧源码断言仍查找 `async function handleToggle(route: GatewayRoute)`；已按任务 214 的 action factory 目标结构更新该测试的 handler 切片边界，并用 `node --test frontend/tests/gatewayViewModel.test.ts` 复核 8 个测试全部通过，最终耗时 `153.557267ms`。
- 副作用边界: 本任务未改变路由开关、全禁用、仅启用或 circuit reset 的确认弹窗文案、确认取消行为、请求参数、成功后 reload、失败通知、路由 label 取值、同步路由、用量查询或自动刷新规则；只是把四个路由动作入口 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayRouteActionController.test.ts`: 通过，6 个 gateway route action controller 测试全部通过，最终耗时 `138.917164ms`。
- `node --test frontend/tests/gatewayRouteActionController.test.ts frontend/tests/gatewayRouteToggleController.test.ts frontend/tests/gatewayRouteDisableController.test.ts frontend/tests/gatewayRouteEnableOnlyController.test.ts frontend/tests/gatewayRouteCircuitController.test.ts frontend/tests/gatewayRouteActionsMenuComponent.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts`: 通过，24 个 route action、toggle、disable、enable-only、circuit 和 route table 相邻测试全部通过，最终耗时 `290.262927ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，380 个网关相关测试全部通过，最终耗时 `2706.778311ms`。
- `node --test frontend/tests/*.test.ts`: 通过，438 个前端状态辅助测试全部通过，最终耗时 `2748.08225ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，构建耗时 `42.14s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteActionController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayRouteActionController.test.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayViewModel.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 214 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 215: 网关路由配置入口运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteConfigController.ts`、`frontend/tests/gatewayRouteConfigController.test.ts`。
- 改动: 新增 `createChangeGatewayRouteTypeAction(...)`、`createSelectGatewayRouteTypeAction(...)`、`createChangeGatewayRoutePathAction(...)` 和 `createSelectGatewayRoutePathAction(...)`，把 `GatewayView.vue` 本地路由类型与请求格式切换入口的运行时依赖装配迁入 gateway route config controller；`GatewayView.vue` 改为创建可复用 action，并继续作为路由配置选择器事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1072 行，`gatewayRouteConfigController.ts` 为 282 行，`gatewayRouteConfigController.test.ts` 为 585 行。相比任务 214 结束时，`GatewayView.vue` 从 1088 行降至 1072 行；route config controller 仍低于 300 行目标，但已接近上限，后续不应承接无关网关域逻辑。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConfigController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteConfigController.ts' does not provide an export named 'createChangeGatewayRoutePathAction'`，退出码为 1，失败文件耗时 `919.771374ms`，整体耗时 `927.0628ms`。
- 行为锁定: 新测试覆盖四个 runtime action 会通过注入的 routes、priorityRoutes、`updateGatewayRouteType`、路由 label、类型/路径 label 和通知依赖执行，并继续复用既有 `changeGatewayRouteType(...)`、`selectGatewayRouteType(...)`、`changeGatewayRoutePath(...)`、`selectGatewayRoutePath(...)` 的乐观更新、失败回滚、无效选择跳过、请求 payload、priority route 同步和成功/失败通知规则；源码测试确认 `GatewayView.vue` 已通过四个 action factory 创建 handler，不再定义对应 async handler，也不再在视图 handler 内直接装配单次 route config 调用。
- 副作用边界: 本任务未改变路由类型或请求格式的取值校验、请求参数、乐观 draft、失败回滚、路由模型保存、同步路由、用量查询或自动刷新规则；只是把四个路由配置入口 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayRouteConfigController.test.ts`: 通过，14 个 route config controller 测试全部通过，最终耗时 `175.070074ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，381 个网关相关测试全部通过，最终耗时 `2686.96028ms`。
- `node --test frontend/tests/*.test.ts`: 通过，439 个前端状态辅助测试全部通过，最终耗时 `2710.40158ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `27.22s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteConfigController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayRouteConfigController.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 215 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 216: 网关路由模型弹窗保存入口运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteConfigController.ts`、`frontend/tests/gatewayRouteConfigController.test.ts`。
- 改动: 新增 `createOpenGatewayRouteModelsDialogAction(...)` 和 `createSaveGatewayRouteModelsAction(...)`，把 `GatewayView.vue` 本地路由模型弹窗打开与保存入口的运行时依赖装配迁入 gateway route config controller；`GatewayView.vue` 改为创建可复用 action，并继续作为路由管理表格配置模型和弹窗保存事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1071 行，`gatewayRouteConfigController.ts` 为 295 行，`gatewayRouteConfigController.test.ts` 为 670 行。相比任务 215 结束时，`GatewayView.vue` 从 1072 行降至 1071 行；route config controller 从 282 行增至 295 行，仍低于 300 行目标但已接近上限，后续不应继续承接无关网关域逻辑。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConfigController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteConfigController.ts' does not provide an export named 'createOpenGatewayRouteModelsDialogAction'`，退出码为 1，失败文件耗时 `385.104291ms`，整体耗时 `393.956034ms`。
- 行为锁定: 新测试覆盖路由模型弹窗打开 action 会继续复用 `useGatewayRouteModelsDialog()` 的 draft 归一化，保存 action 会在调用时读取最新 `routeModelsDialogRoute`、`routeModelsDialogValue`、`routeModelsDialogRequestURLs`、routes、priorityRoutes、`updateGatewayRouteType`、saving、成功关闭和通知依赖，并继续复用 `saveGatewayRouteModels(...)` 的 payload 构造、保存 loading、routes/priorityRoutes 替换、成功关闭、失败不关闭和提示计划；源码测试确认 `GatewayView.vue` 已通过两个 action factory 创建 `openRouteModelsDialog` / `saveRouteModelsDialog`，不再定义对应本地 function，也不再在视图内直接装配 `saveGatewayRouteModels({ ... })`。
- 副作用边界: 本任务未改变弹窗 draft 归一化、保存请求参数、成功关闭、失败保持弹窗、routes/priorityRoutes 替换、通知文案、路由同步、用量查询或自动刷新规则；只是把路由模型弹窗入口 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayRouteConfigController.test.ts`: 通过，15 个 route config controller 测试全部通过，最终耗时 `2991.045555ms`。
- `node --test frontend/tests/gatewayRouteConfigController.test.ts frontend/tests/gatewayRouteConfigModel.test.ts frontend/tests/gatewayRouteConfigCellComponent.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts frontend/tests/gatewayRouteModelsDialogComponent.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，39 个 route config 相邻测试全部通过，最终耗时 `2303.261105ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，382 个网关相关测试全部通过，最终耗时 `4603.992394ms`。
- `node --test frontend/tests/*.test.ts`: 通过，440 个前端状态辅助测试全部通过，最终耗时 `4626.547997ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `27.90s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteConfigController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayRouteConfigController.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 216 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 217: 网关路由批量探测入口运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeController.ts`、`frontend/tests/gatewayRouteProbeController.test.ts`。
- 改动: 新增 `createProbeAllGatewayRoutesAction(...)`，把 `GatewayView.vue` 本地 `handleProbeAll()` 的 routes 读取、真实探测请求、探测结果应用、probe state、成功计数、时间戳生成和通知依赖装配迁入 gateway route probe controller；`GatewayView.vue` 改为创建可复用 action，并继续作为路由管理 toolbar 的批量探测事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1069 行，`gatewayRouteProbeController.ts` 为 270 行，`gatewayRouteProbeController.test.ts` 为 529 行。相比任务 216 结束时，`GatewayView.vue` 从 1071 行降至 1069 行；route probe controller 从 251 行增至 270 行，仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbeController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteProbeController.ts' does not provide an export named 'createProbeAllGatewayRoutesAction'`，退出码为 1，失败文件耗时 `1223.473271ms`，整体耗时 `1233.177929ms`。
- 行为锁定: 新测试覆盖批量探测 action 会在调用时读取最新 routes 和成功计数，并继续复用 `probeAllGatewayRoutesAction(...)` 的批量开始、逐路由真实请求、结果应用、单路由进度推进、失败结果构造、完成通知和批次结束顺序；源码测试确认 `GatewayView.vue` 已通过 `createProbeAllGatewayRoutesAction(...)` 创建 `handleProbeAll`，不再定义本地 `async function handleProbeAll()`，也不再在视图内直接装配 `probeAllGatewayRoutesAction({ ... })`。
- 副作用边界: 本任务未改变批量探测 route 列表读取、真实 `probeGatewayRoute` 请求、探测结果应用、进度状态读取、时间戳生成、失败结果构造、通知文案、路由同步、用量查询或自动刷新规则；只是把批量探测入口 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayRouteProbeController.test.ts`: 通过，14 个 route probe controller 测试全部通过，最终耗时 `2031.253978ms`。
- `node --test frontend/tests/gatewayRouteProbeController.test.ts frontend/tests/gatewayRouteProbeModel.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts frontend/tests/gatewayRouteBatchActionComponent.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，39 个 route probe 相邻测试全部通过，最终耗时 `460.975743ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，383 个网关相关测试全部通过，最终耗时 `4917.822975ms`。
- `node --test frontend/tests/*.test.ts`: 通过，441 个前端状态辅助测试全部通过，最终耗时 `4958.205933ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `33.80s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteProbeController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayRouteProbeController.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 217 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 218: 网关单路由探测入口运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeController.ts`、`frontend/tests/gatewayRouteProbeController.test.ts`。
- 改动: 新增 `createProbeGatewayRouteAction(...)`，把 `GatewayView.vue` 本地 `handleProbeRoute(route)` 的 route 参数转发、真实探测请求、探测结果应用、probe state 和通知依赖装配迁入 gateway route probe controller；`GatewayView.vue` 改为创建可复用 action，并继续作为路由管理表格单路由探测事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1066 行，`gatewayRouteProbeController.ts` 为 274 行，`gatewayRouteProbeController.test.ts` 为 573 行。相比任务 217 结束时，`GatewayView.vue` 从 1069 行降至 1066 行；route probe controller 从 270 行增至 274 行，仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbeController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteProbeController.ts' does not provide an export named 'createProbeGatewayRouteAction'`，退出码为 1，失败文件耗时 `8121.879903ms`，整体耗时 `8130.822236ms`。
- 行为锁定: 新测试覆盖单路由探测 action 会把传入 route 转交给 `probeGatewayRouteAction(...)`，继续复用真实 `probeGatewayRoute` 请求、探测结果应用、route probing 状态跟踪、成功通知、失败通知和最终 untrack 顺序；源码测试确认 `GatewayView.vue` 已通过 `createProbeGatewayRouteAction(...)` 创建 `handleProbeRoute`，不再定义本地 `async function handleProbeRoute(route)`，也不再在视图内直接装配 `probeGatewayRouteAction({ ... })`。
- 副作用边界: 本任务未改变单路由 route 参数转发、真实 `probeGatewayRoute` 请求、探测结果应用、route probing 状态跟踪、成功通知、失败通知、路由同步、用量查询或自动刷新规则；只是把单路由探测入口 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayRouteProbeController.test.ts`: 通过，15 个 route probe controller 测试全部通过，最终耗时 `1638.130797ms`。
- `node --test frontend/tests/gatewayRouteProbeController.test.ts frontend/tests/gatewayRouteProbeModel.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts frontend/tests/gatewayRouteBatchActionComponent.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，40 个 route probe 相邻测试全部通过，最终耗时 `405.55626ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，384 个网关相关测试全部通过，最终耗时 `4477.191544ms`。
- `node --test frontend/tests/*.test.ts`: 通过，442 个前端状态辅助测试全部通过，最终耗时 `4526.110195ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `24.50s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteProbeController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayRouteProbeController.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 218 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 219: 网关路由余额探测入口运行时 action 依赖装配边界复核

日期: 2026-05-26

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeFlowController.ts`、`frontend/tests/gatewayRouteBalanceProbeController.test.ts`。
- 改动: 新增 `createProbeGatewayRouteBalanceAction(...)`，把 `GatewayView.vue` 本地 `handleProbeRouteBalance(route)` 的 route 参数转发、真实余额探测请求、余额结果应用、摘要刷新、概览通知、手动重试弹窗、balance probing state 和通知依赖装配迁入 gateway route balance probe flow controller；`GatewayView.vue` 改为创建可复用 action，并继续作为路由管理表格单路由余额探测事件处理器。
- 文件长度检查: `GatewayView.vue` 当前为 1063 行，`gatewayRouteBalanceProbeFlowController.ts` 为 299 行，`gatewayRouteBalanceProbeController.test.ts` 为 628 行。相比任务 218 结束时，`GatewayView.vue` 从 1066 行降至 1063 行；balance probe flow controller 从 295 行增至 299 行，仍低于 300 行目标但已贴近上限，后续不应继续承接无关网关域逻辑。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteBalanceProbeFlowController.ts' does not provide an export named 'createProbeGatewayRouteBalanceAction'`，退出码为 1，失败文件耗时 `2086.133234ms`，整体耗时 `2095.266912ms`。
- 行为锁定: 新测试覆盖单路由余额探测 action 会把传入 route 转交给 `probeGatewayRouteBalanceAction(...)`，继续复用真实余额探测请求、余额结果应用、路由摘要刷新、概览变更通知、成功通知、失败通知、手动重试弹窗和最终 untrack 顺序；源码测试确认 `GatewayView.vue` 已通过 `createProbeGatewayRouteBalanceAction(...)` 创建 `handleProbeRouteBalance`，不再定义本地 `async function handleProbeRouteBalance(route)`，也不再在视图内直接装配 `probeGatewayRouteBalanceAction({ ... })`。
- 副作用边界: 本任务未改变单路由 route 参数转发、真实 `probeGatewayRouteBalance` 请求、余额探测结果应用、balance probing 状态跟踪、成功通知、失败通知、手动重试弹窗、路由同步、用量查询或自动刷新规则；只是把单路由余额探测入口 action 的运行时依赖装配从视图迁入 controller。
- `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts`: 通过，16 个 route balance probe controller 测试全部通过，最终耗时 `186.707997ms`。
- `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeModel.test.ts frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRouteBalanceCellComponent.test.ts frontend/tests/gatewayRouteBalanceManualDialogComponent.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，51 个余额探测相邻测试全部通过，最终耗时 `541.259109ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，385 个网关相关测试全部通过，最终耗时 `3193.591946ms`。
- `node --test frontend/tests/*.test.ts`: 通过，443 个前端状态辅助测试全部通过，最终耗时 `3406.692707ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `35.49s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteBalanceProbeFlowController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayRouteBalanceProbeController.test.ts`: 无输出，未发现空白错误。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 219 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 220: 网关手动余额探测提交入口运行时 action 依赖装配边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeRuntimeController.ts`、`frontend/tests/gatewayRouteBalanceManualController.test.ts`、`frontend/tests/gatewayRouteBalanceProbeController.test.ts`。
- 改动: 新增 `createProbeManualGatewayRouteBalanceAction(...)`，把 `GatewayView.vue` 本地手动余额探测提交入口的运行时依赖装配迁入 gateway route balance probe runtime controller；action 在调用时读取当前弹窗 route 与手动 URL，并继续复用真实余额请求、余额结果应用、路由摘要刷新、概览通知、loading、成功关闭、失败消息、balance probing state 和通知依赖。
- 文件长度检查: `GatewayView.vue` 当前为 1061 行，`gatewayRouteBalanceProbeFlowController.ts` 为 299 行，`gatewayRouteBalanceProbeRuntimeController.ts` 为 77 行，`gatewayRouteBalanceManualController.test.ts` 为 157 行，`gatewayRouteBalanceProbeController.test.ts` 为 633 行。相比任务 219 结束时，`GatewayView.vue` 从 1063 行降至 1061 行；flow controller 保持 299 行，manual runtime action 进入 runtime controller，避免继续推高已贴近上限的 flow controller。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceManualController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteBalanceProbeRuntimeController.ts' does not provide an export named 'createProbeManualGatewayRouteBalanceAction'`，退出码为 1，失败文件耗时 `643.267439ms`，整体耗时 `658.086153ms`。
- 行为锁定: 新测试覆盖手动余额提交 action 会在每次调用时读取最新弹窗 route 与 URL，继续保留 URL trim、真实 `probeGatewayRouteBalance` 请求、余额结果应用、路由摘要刷新、概览变更通知、loading、成功关闭、失败消息、track/untrack 和通知顺序；源码测试确认 `GatewayView.vue` 已通过 `createProbeManualGatewayRouteBalanceAction(...)` 创建 `submitManualRouteBalanceProbe`，不再定义本地 `async function submitManualRouteBalanceProbe()`，也不再在视图内直接装配 `probeManualGatewayRouteBalance({ ... })`。
- 副作用边界: 本任务未改变手动 route 读取、手动 URL 读取、真实余额探测请求、余额结果应用、路由摘要刷新、概览通知、弹窗 loading、成功关闭、失败消息、balance probing 状态跟踪、通知文案、路由同步、用量查询或自动刷新规则；只是把手动余额提交入口 action 的运行时依赖装配从视图迁入 runtime controller。
- `node --test frontend/tests/gatewayRouteBalanceManualController.test.ts`: 通过，2 个手动余额提交 controller 测试全部通过，最终耗时 `197.871899ms`。
- `node --test frontend/tests/gatewayRouteBalanceManualController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRouteBalanceProbeModel.test.ts frontend/tests/gatewayRouteBalanceCellComponent.test.ts frontend/tests/gatewayRouteBalanceManualDialogComponent.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，53 个余额探测相邻测试全部通过，最终耗时 `3861.13539ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，387 个网关相关测试全部通过，最终耗时 `6183.201649ms`。
- `node --test frontend/tests/*.test.ts`: 通过，445 个前端状态辅助测试全部通过，最终耗时 `6360.65803ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `44.52s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteBalanceProbeRuntimeController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayRouteBalanceManualController.test.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayRouteBalanceProbeController.test.ts`: 无输出，未发现空白错误。
- 旧本地提交入口扫描: `rg -n "async function submitManualRouteBalanceProbe\(|probeManualGatewayRouteBalance\(\{" frontend/src/views/GatewayView.vue` 无命中。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 220 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 221: 网关全量余额更新入口运行时 action 依赖装配边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeRuntimeController.ts`、`frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts`、`frontend/tests/gatewayRouteBalanceProbeController.test.ts`。
- 改动: 新增 `createUpdateAllGatewayRouteBalancesAction(...)`，把 `GatewayView.vue` 本地全量余额更新入口的运行时依赖装配迁入 gateway route balance probe runtime controller；action 在调用时读取当前 routes 和路由探测 loading 状态，并继续复用既有 `updateAllGatewayRouteBalancesAction(...)` 的批量开始校验、静默余额探测、进度对象、路由摘要刷新、完成通知、失败通知和批次结束规则。
- 文件长度检查: `GatewayView.vue` 当前为 1057 行，`gatewayRouteBalanceProbeFlowController.ts` 为 299 行，`gatewayRouteBalanceProbeRuntimeController.ts` 为 98 行，`gatewayRouteBalanceProbeRuntimeController.test.ts` 为 199 行，`gatewayRouteBalanceProbeController.test.ts` 为 636 行。相比任务 220 结束时，`GatewayView.vue` 从 1061 行降至 1057 行；flow controller 保持 299 行，全量余额更新 action 进入 runtime controller，避免继续推高已贴近上限的 flow controller。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayRouteBalanceProbeRuntimeController.ts' does not provide an export named 'createUpdateAllGatewayRouteBalancesAction'`，退出码为 1，失败文件耗时 `390.538296ms`，整体耗时 `398.431336ms`。
- 行为锁定: 新测试覆盖全量余额更新 action 会在每次调用时读取最新 routes 与路由探测 loading 状态，继续保留 `silent: true`、同一个 progress ref、批量 start/finish、路由摘要刷新和完成通知；源码测试确认 `GatewayView.vue` 已通过 `createUpdateAllGatewayRouteBalancesAction(...)` 创建 `handleUpdateAllBalances`，不再定义本地 `async function handleUpdateAllBalances()`，也不再在视图内直接装配 `updateAllGatewayRouteBalancesAction({ ... })`。
- 副作用边界: 本任务未改变 routes 读取时机、当前探测中状态判断、批量余额探测请求、进度对象、路由摘要刷新、成功/失败通知、balance probing 状态跟踪、路由同步、用量查询或自动刷新规则；只是把全量余额更新入口 action 的运行时依赖装配从视图迁入 runtime controller。
- `node --test frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts`: 通过，3 个 route balance probe runtime controller 测试全部通过，最终耗时 `358.053198ms`。
- `node --test frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts`: 通过，19 个目标与相邻 controller 测试全部通过，最终耗时 `3705.799198ms`。
- `node --test frontend/tests/gatewayRouteBalanceManualController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRouteBalanceProbeModel.test.ts frontend/tests/gatewayRouteBalanceCellComponent.test.ts frontend/tests/gatewayRouteBalanceManualDialogComponent.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，54 个余额探测相邻测试全部通过，最终耗时 `345.465019ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，388 个网关相关测试全部通过，最终耗时 `2006.634854ms`。
- `node --test frontend/tests/*.test.ts`: 通过，446 个前端状态辅助测试全部通过，最终耗时 `1771.242836ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 首次因 registry TLS 连接中断失败，重跑通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `43.06s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewayRouteBalanceProbeRuntimeController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts`: 无输出，未发现空白错误。
- 旧本地全量余额更新入口扫描: `rg -n "async function handleUpdateAllBalances\(|updateAllGatewayRouteBalancesAction\(\{" frontend/src/views/GatewayView.vue` 无命中。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 221 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 222: 网关设置保存入口运行时 action 依赖装配边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewaySettingsController.ts`、`frontend/tests/gatewaySettingsController.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `createSaveGatewaySettingsAction(...)`，把 `GatewayView.vue` 本地设置保存入口的运行时依赖装配迁入 gateway settings controller；action 在调用时读取当前 settings 表单对象，并继续复用 `saveGatewaySettings(...)` 的真实保存请求、dialog loading、保存结果写回、成功关闭、保存成功通知、保存后重载数据和失败通知规则。
- 文件长度检查: `GatewayView.vue` 当前为 1055 行，`gatewaySettingsController.ts` 为 94 行，`gatewaySettingsController.test.ts` 为 257 行，`gatewayViewModel.test.ts` 为 347 行。相比任务 221 结束时，`GatewayView.vue` 从 1057 行降至 1055 行；settings controller 仍保持轻量。
- TDD 红灯: `node --test frontend/tests/gatewaySettingsController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewaySettingsController.ts' does not provide an export named 'createSaveGatewaySettingsAction'`，退出码为 1，失败文件耗时 `1594.877221ms`，整体耗时 `1602.961705ms`。
- 行为锁定: 新测试覆盖 settings 保存 action 会在每次调用时读取最新 settings 对象，继续保留保存请求、保存结果写回、dialog 成功关闭、成功通知、数据重载和 loading 复位顺序；源码测试确认 `GatewayView.vue` 已通过 `createSaveGatewaySettingsAction(...)` 创建 `saveSettings`，不再定义本地 `async function saveSettings()`，也不再在视图内直接装配 `saveGatewaySettings({ ... })`。
- 副作用边界: 本任务未改变 settings 表单对象、真实保存请求、settings dialog loading、保存结果写回、成功关闭、保存后重载数据、成功/失败通知、路由同步、用量查询或自动刷新规则；只是把设置保存入口 action 的运行时依赖装配从视图迁入 settings controller。
- `node --test frontend/tests/gatewaySettingsController.test.ts`: 通过，8 个 gateway settings controller 测试全部通过，最终耗时 `233.134806ms`。
- `node --test frontend/tests/gatewaySettingsController.test.ts frontend/tests/gatewaySettingsModel.test.ts frontend/tests/gatewaySettingsDialogComponent.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，24 个 settings 相邻测试全部通过，最终耗时 `376.221924ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，389 个网关相关测试全部通过，最终耗时 `5582.210541ms`。
- `node --test frontend/tests/*.test.ts`: 通过，447 个前端状态辅助测试全部通过，最终耗时 `5982.707292ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `56.13s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --no-index --check /dev/null frontend/src/gatewaySettingsController.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewaySettingsController.test.ts`: 无输出，未发现空白错误。
- `git diff --no-index --check /dev/null frontend/tests/gatewayViewModel.test.ts`: 无输出，未发现空白错误。
- 旧本地设置保存入口扫描: `rg -n "async function saveSettings\(|saveGatewaySettings\(\{" frontend/src/views/GatewayView.vue` 无命中。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 222 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 223: 网关新增上游提交入口运行时 action 依赖装配边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAddUpstreamController.ts`、`frontend/tests/gatewayAddUpstreamController.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `createSubmitGatewayAddUpstreamAction(...)`，把 `GatewayView.vue` 本地新增上游提交入口的运行时依赖装配迁入 gateway add upstream controller；action 在调用时读取当前新增上游表单和分组，并继续复用 `submitGatewayAddUpstream(...)` 的真实创建请求、loading、成功关闭、同步路由、保存后重载数据和失败通知规则。
- 文件长度检查: `GatewayView.vue` 当前为 1053 行，`gatewayAddUpstreamController.ts` 为 116 行，`gatewayAddUpstreamController.test.ts` 为 309 行，`gatewayViewModel.test.ts` 为 348 行。相比任务 222 结束时，`GatewayView.vue` 从 1055 行降至 1053 行；add upstream controller 仍保持轻量。
- TDD 红灯: `node --test frontend/tests/gatewayAddUpstreamController.test.ts` 首次失败于 `SyntaxError: The requested module '../src/gatewayAddUpstreamController.ts' does not provide an export named 'createSubmitGatewayAddUpstreamAction'`，退出码为 1，失败文件耗时 `3027.745614ms`，整体耗时 `3036.208484ms`。
- 构建暴露问题: 首次 `npm run build` 失败于 `GatewayView.vue(236,22): error TS2448: Block-scoped variable 'handleSync' used before its declaration.` 和 `TS2454: Variable 'handleSync' is used before being assigned.`；根因为 `submitAddUpstream` factory 先于 `handleSync` 创建。已补充源码顺序断言，并把 `submitAddUpstream` 创建移动到 `handleSync` 赋值之后。
- 行为锁定: 新测试覆盖新增上游提交 action 会在每次调用时读取最新表单和最新分组，继续保留 payload 构造、真实 `createSite` 请求、成功提示、成功关闭、同步路由、数据重载和 loading 复位顺序；源码测试确认 `GatewayView.vue` 已通过 `createSubmitGatewayAddUpstreamAction(...)` 创建 `submitAddUpstream`，不再定义本地 `async function submitAddUpstream()`，也不再在视图内直接装配 `submitGatewayAddUpstream({ ... })`。
- 副作用边界: 本任务未改变新增上游表单对象、分组读取、真实创建请求、loading、成功关闭、同步路由、保存后重载数据、成功/失败通知、余额探测、路由同步、用量查询或自动刷新规则；只是把新增上游提交入口 action 的运行时依赖装配从视图迁入 add upstream controller。
- `node --test frontend/tests/gatewayAddUpstreamController.test.ts`: 通过，7 个 gateway add upstream controller 测试全部通过，最终耗时 `238.260801ms`。
- `node --test frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewayAddUpstreamModel.test.ts frontend/tests/gatewayAddUpstreamDialogComponent.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，24 个 add upstream 相邻测试全部通过，最终耗时 `221.396044ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，390 个网关相关测试全部通过，最终耗时 `2888.148548ms`。
- `node --test frontend/tests/*.test.ts`: 通过，448 个前端状态辅助测试全部通过，最终耗时 `3071.138286ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `32.35s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --check -- frontend/src/gatewayAddUpstreamController.ts frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过。
- 旧本地新增上游提交入口扫描: `rg -n "async function submitAddUpstream\(|submitGatewayAddUpstream\(\{" frontend/src/views/GatewayView.vue` 无命中。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 223 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 224: 网关新增上游重置入口轻量 state handler 边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/tests/gatewayAddUpstreamController.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `resetAddUpstreamForm()` wrapper 替换为 `const resetAddUpstreamForm = addUpstreamDialog.reset`，让新增上游弹窗取消/reset 事件直接复用 add upstream dialog controller 暴露的 reset action；新增源码契约测试锁定页面不再定义本地 reset 函数。
- 文件长度检查: `GatewayView.vue` 当前为 1051 行，`gatewayAddUpstreamController.ts` 为 116 行，`gatewayAddUpstreamController.test.ts` 为 318 行，`gatewayViewModel.test.ts` 为 348 行。相比任务 223 结束时，`GatewayView.vue` 从 1053 行降至 1051 行；add upstream controller 行数不变。
- TDD 红灯: `node --test frontend/tests/gatewayAddUpstreamController.test.ts` 首次失败于 `AssertionError [ERR_ASSERTION]: resetAddUpstreamForm should reuse the dialog reset action`，退出码为 1，整体耗时 `219.725382ms`，确认页面仍存在本地 reset wrapper。
- 行为锁定: 新测试确认 `GatewayView.vue` 通过 `const resetAddUpstreamForm = addUpstreamDialog.reset` 复用 controller reset 引用，并继续把 `resetAddUpstreamForm` 绑定到 `@add-upstream-reset`；页面不再定义本地 `function resetAddUpstreamForm()`。
- 副作用边界: 本任务未改变新增上游弹窗取消、成功关闭、表单字段重置、分组数组清空、loading、提交、同步路由、保存后重载数据或通知规则；只是移除页面内一层轻量 reset wrapper。
- `node --test frontend/tests/gatewayAddUpstreamController.test.ts`: 通过，8 个 gateway add upstream controller 测试全部通过，最终耗时 `250.468396ms`。
- `node --test frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewayAddUpstreamModel.test.ts frontend/tests/gatewayAddUpstreamDialogComponent.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，25 个 add upstream 相邻测试全部通过，最终耗时 `267.206084ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，391 个网关相关测试全部通过，最终耗时 `4125.210104ms`。
- `node --test frontend/tests/*.test.ts`: 通过，449 个前端状态辅助测试全部通过，最终耗时 `4139.256953ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `29.25s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --check -- frontend/src/views/GatewayView.vue frontend/tests/gatewayAddUpstreamController.test.ts`: 通过。
- 旧本地新增上游重置入口扫描: `rg -n "function resetAddUpstreamForm\(" frontend/src/views/GatewayView.vue` 无命中。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 224 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 225: 网关手动余额弹窗打开入口轻量 state handler 边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/tests/gatewayRouteBalanceProbeController.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `openRouteBalanceProbeManualDialog(route, message)` wrapper 替换为 `const openRouteBalanceProbeManualDialog = balanceProbeManualDialog.openDialog`，让单路由余额探测失败后的手动弹窗打开入口直接复用 balance manual dialog controller 暴露的 open action；同时把声明顺序提前到 `handleProbeRouteBalance` 注入之前，避免 block-scoped 变量 TDZ。
- 文件长度检查: `GatewayView.vue` 当前为 1049 行，`gatewayRouteBalanceProbeController.ts` 为 163 行，`gatewayRouteBalanceProbeController.test.ts` 为 647 行，`gatewayViewModel.test.ts` 为 348 行。相比任务 224 结束时，`GatewayView.vue` 从 1051 行降至 1049 行；balance probe controller 行数不变。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts` 首次失败于 `AssertionError [ERR_ASSERTION]: openRouteBalanceProbeManualDialog should reuse the manual dialog open action`，退出码为 1，整体耗时 `246.066106ms`，确认页面仍存在本地手动弹窗打开 wrapper。
- 构建暴露问题: 首次实现后 `npm run build` 失败于 `src/views/GatewayView.vue(773,21): error TS2448: Block-scoped variable 'openRouteBalanceProbeManualDialog' used before its declaration.` 和 `TS2454: Variable 'openRouteBalanceProbeManualDialog' is used before being assigned.`，根因是 action 引用声明在 `handleProbeRouteBalance` 注入之后。
- 顺序红灯: 补充顺序断言后，`node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts` 失败于 `AssertionError [ERR_ASSERTION]: manual dialog open action should be created before it is injected`，退出码为 1，整体耗时 `234.955566ms`。
- 行为锁定: 新测试确认 `GatewayView.vue` 通过 `const openRouteBalanceProbeManualDialog = balanceProbeManualDialog.openDialog` 复用 controller open action，且该引用声明在 `createProbeGatewayRouteBalanceAction({ ... })` 之前；`openManualDialog: openRouteBalanceProbeManualDialog` 注入保持不变，页面不再定义本地 `function openRouteBalanceProbeManualDialog(route: GatewayRoute, message = '')`。
- 副作用边界: 本任务未改变单路由余额探测、失败后手动弹窗打开、失败消息展示、手动 URL draft、loading、手动提交、余额结果合并、路由摘要刷新、概览通知、toast 或自动刷新规则；只是移除页面内一层轻量 open wrapper。
- `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts`: 通过，16 个 gateway route balance probe controller 测试全部通过，最终耗时 `624.281832ms`。
- `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeModel.test.ts frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRouteBalanceCellComponent.test.ts frontend/tests/gatewayRouteBalanceManualDialogComponent.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，52 个余额探测相邻测试全部通过，最终耗时 `844.725705ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，391 个网关相关测试全部通过，最终耗时 `3504.102144ms`。
- `node --test frontend/tests/*.test.ts`: 通过，449 个前端状态辅助测试全部通过，最终耗时 `1918.591337ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `1.03s`。仍有既有大 chunk 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --check -- frontend/src/views/GatewayView.vue frontend/tests/gatewayRouteBalanceProbeController.test.ts`: 通过。
- 未跟踪测试文件 whitespace 检查: `git diff --no-index --check -- /dev/null frontend/tests/gatewayRouteBalanceProbeController.test.ts` 未报告 whitespace 问题。
- 旧本地手动余额弹窗打开入口扫描: `rg -n "function openRouteBalanceProbeManualDialog\(" frontend/src/views/GatewayView.vue` 无命中。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 225 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 226: 网关优先级路由行样式轻量展示 wrapper 边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityController.ts`、`frontend/tests/gatewayPriorityController.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `priorityRouteRowClassName(record)` 纯展示 wrapper 替换为 `const priorityRouteRowClassName = priorityDialog.rowClassName`，并由 `useGatewayPriorityDialog()` 暴露 `rowClassName(record)`，让优先级弹窗当前行样式计算随 dialog state 一起收口到 priority controller。
- 文件长度检查: `GatewayView.vue` 当前为 1045 行，`gatewayPriorityController.ts` 为 284 行，`gatewayPriorityController.test.ts` 为 654 行，`gatewayPriorityModel.ts` 为 133 行，`gatewayPriorityModel.test.ts` 为 187 行。相比任务 225 结束时，`GatewayView.vue` 从 1049 行降至 1045 行；priority controller 从 278 行增至 284 行，仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityController.test.ts` 首次失败于 `TypeError: dialog.rowClassName is not a function`，并同时失败于源码契约 `const priorityRouteRowClassName = priorityDialog.rowClassName` 未命中；退出码为 1，18 个通过、2 个失败，整体耗时 `1004.959745ms`，确认 controller 尚未暴露行样式 action 且页面仍保留本地 wrapper。
- 行为锁定: 新测试确认 `useGatewayPriorityDialog()` 的 `rowClassName(record)` 会读取当前 `route.value`，在 `selectRoute(...)` 后随最新选中路由切换；源码契约确认 `GatewayView.vue` 只通过 `priorityDialog.rowClassName` 注入 `priority-row-class-name`，不再直接导入 `gatewayPriorityRouteRowClassName`，也不再定义本地 `function priorityRouteRowClassName(record: GatewayRoute)`。
- 副作用边界: 本任务未改变优先级弹窗打开、选中路由、行 key、移动、预设重排、保存、loading、通知、路由列表替换或弹窗显示规则；只是把当前行样式展示适配从页面迁入 priority dialog controller。
- `node --test frontend/tests/gatewayPriorityController.test.ts`: 通过，20 个 gateway priority controller 测试全部通过，最终耗时 `206.565534ms`。
- `node --test frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayPriorityModel.test.ts frontend/tests/gatewayPriorityDialogComponent.test.ts frontend/tests/gatewayOverlayHostComponent.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，42 个优先级相邻测试全部通过，最终耗时 `496.440262ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，392 个网关相关测试全部通过，最终耗时 `2232.322458ms`。
- `node --test frontend/tests/*.test.ts`: 通过，450 个前端状态辅助测试全部通过，最终耗时 `2520.370528ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `17.87s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --check -- frontend/src/views/GatewayView.vue frontend/src/gatewayPriorityController.ts frontend/tests/gatewayPriorityController.test.ts`: 通过。
- 未跟踪文件 whitespace 检查: `git diff --no-index --check -- /dev/null frontend/src/gatewayPriorityController.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/gatewayPriorityController.test.ts` 均未报告 whitespace 问题。
- 旧本地优先级行样式 wrapper 扫描: `rg -n "function priorityRouteRowClassName\(|gatewayPriorityRouteRowClassName" frontend/src/views/GatewayView.vue` 无命中。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 226 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 227: 网关单路由探测结果应用入口轻量 state handler 边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbeController.ts`、`frontend/tests/gatewayRouteProbeController.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `applyProbeResult(result)` 状态更新 wrapper 替换为 `createApplyGatewayProbeResultAction({ ... })`，由 route probe controller 负责读取当前路由、调用 `mergeGatewayProbeResult` 并回写路由列表；页面只负责注入 `routes.value` 的 getter/setter。
- 文件长度检查: `GatewayView.vue` 当前为 1050 行，`gatewayRouteProbeController.ts` 为 290 行，`gatewayRouteProbeController.test.ts` 为 617 行，`gatewayRouteStateModel.ts` 为 207 行，`gatewayRouteStateModel.test.ts` 为 424 行。相比任务 226 结束时，`GatewayView.vue` 从 1045 行升至 1050 行；route probe controller 从 274 行增至 290 行，仍低于 300 行目标。
- TDD 红灯: 首次 `node --test frontend/tests/gatewayRouteProbeController.test.ts` 因静态导入缺失导出失败于 `SyntaxError: The requested module '../src/gatewayRouteProbeController.ts' does not provide an export named 'createApplyGatewayProbeResultAction'`；随后改为动态导出检查后，同一命令失败于 `AssertionError [ERR_ASSERTION]: createApplyGatewayProbeResultAction should be exported`，并且源码契约确认 `GatewayView.vue` 尚未导入和装配 `createApplyGatewayProbeResultAction`。最终红灯退出码为 1，13 个通过、3 个失败，整体耗时 `730.219558ms`。
- 构建暴露问题: 首次实现后 `npm run build` 失败于 `src/views/GatewayView.vue(166,88): error TS6196: 'GatewayRouteProbeResult' is declared but never used.`，根因是本地 `applyProbeResult(result: GatewayRouteProbeResult)` 被 action 常量替代后，该类型不再由页面直接引用；已删除未用类型导入后复跑构建通过。
- 行为锁定: 新测试确认 `createApplyGatewayProbeResultAction` 每次调用都会读取最新 `routes`，把原始 routes 和 probe result 交给注入的 `mergeProbeResult`，并通过注入的 `setRoutes` 回写结果；源码契约确认单路由和批量路由探测都继续注入同一个 `applyProbeResult`，页面不再定义本地 `function applyProbeResult(result: GatewayRouteProbeResult)`。
- 副作用边界: 本任务未改变单路由探测、批量探测、请求函数、成功/失败结果合并规则、路由列表更新、通知、loading、进度清理、自动刷新或余额探测规则；只是把探测结果应用的状态写入 handler 从页面迁入 route probe controller。
- `node --test frontend/tests/gatewayRouteProbeController.test.ts`: 通过，16 个 gateway route probe controller 测试全部通过，最终耗时 `207.753481ms`。
- `node --test frontend/tests/gatewayRouteProbeController.test.ts frontend/tests/gatewayRouteProbeModel.test.ts frontend/tests/gatewayRouteStateModel.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，56 个 route probe 相邻测试全部通过，最终耗时 `1085.075577ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，393 个网关相关测试全部通过，最终耗时 `2632.173102ms`。
- `node --test frontend/tests/*.test.ts`: 通过，451 个前端状态辅助测试全部通过，最终耗时 `1990.640263ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 首次失败暴露未用类型导入；清理后复跑通过，`3418` 个模块完成转换，Vite 构建耗时 `16.55s`。仍有既有大 chunk 和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- `git diff --check`: 通过。
- `git diff --check -- frontend/src/views/GatewayView.vue frontend/src/gatewayRouteProbeController.ts frontend/tests/gatewayRouteProbeController.test.ts`: 通过。
- 未跟踪文件 whitespace 检查: `git diff --no-index --check -- /dev/null frontend/src/gatewayRouteProbeController.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/gatewayRouteProbeController.test.ts` 均未报告 whitespace 问题。
- 旧本地探测结果应用 wrapper 扫描: `rg -n "function applyProbeResult\(|function priorityRouteRowClassName\(|gatewayPriorityRouteRowClassName" frontend/src/views/GatewayView.vue` 无命中。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 227 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 228: 网关余额探测结果应用入口轻量 state handler 边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteBalanceProbeController.ts`、`frontend/tests/gatewayRouteBalanceProbeController.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `applyRouteBalanceResult(result)` 状态更新 wrapper 替换为 `createApplyGatewayRouteBalanceResultAction({ ... })`，由 balance probe controller 负责读取当前路由、调用 `mergeGatewayRouteBalanceResult` 并回写路由列表；页面只负责注入 `routes.value` 的 getter/setter。
- 文件长度检查: `GatewayView.vue` 当前为 1055 行，`gatewayRouteBalanceProbeController.ts` 为 179 行，`gatewayRouteBalanceProbeController.test.ts` 为 684 行，`gatewayRouteBalanceProbeFlowController.ts` 为 299 行，`gatewayRouteBalanceProbeRuntimeController.ts` 为 98 行，`gatewayRouteStateModel.ts` 为 207 行，`gatewayRouteStateModel.test.ts` 为 424 行。相比任务 227 结束时，`GatewayView.vue` 从 1050 行升至 1055 行；balance probe controller 从 163 行增至 179 行，仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts` 失败于 `createApplyGatewayRouteBalanceResultAction should be exported`，并且源码契约确认 `GatewayView.vue` 尚未导入和装配 `createApplyGatewayRouteBalanceResultAction`。红灯退出码为 1，15 个通过、2 个失败，整体耗时 `208.946555ms`。
- 行为锁定: 新测试确认 `createApplyGatewayRouteBalanceResultAction` 每次调用都会读取最新 `routes`，把原始 routes 和 balance result 交给注入的 `mergeBalanceResult`，并通过注入的 `setRoutes` 回写结果；源码契约确认批量余额探测、单路由余额探测和手动余额探测都继续注入同一个 `applyRouteBalanceResult`，页面不再定义本地 `function applyRouteBalanceResult(result: BalanceProbeResult)`，也不再直接导入 `BalanceProbeResult`。
- 副作用边界: 本任务未改变单路由余额探测、批量余额探测、手动余额探测、真实余额请求、余额结果合并规则、路由摘要刷新、概览变更通知、成功/失败通知、loading、进度清理、手动重试弹窗、自动刷新或路由探测规则；只是把余额探测结果应用的状态写入 handler 从页面迁入 balance probe controller。
- `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts`: 通过，17 个 gateway route balance probe controller 测试全部通过，最终耗时 `215.661826ms`。
- `node --test frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRouteBalanceProbeModel.test.ts frontend/tests/gatewayRouteBalanceManualController.test.ts frontend/tests/gatewayRouteStateModel.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，68 个余额探测相邻测试全部通过，最终耗时 `1325.385682ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，394 个网关相关测试全部通过，最终耗时 `3851.820109ms`。
- `node --test frontend/tests/*.test.ts`: 通过，452 个前端状态辅助测试全部通过，最终耗时 `3877.406617ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `1.35s`。仍有既有大 chunk 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 228 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 229: 网关活动请求快照应用入口轻量 state handler 边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeController.ts`、`frontend/src/gatewayActiveRequestsLoadModel.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `applyActiveRequestSnapshot(items)` 状态更新 wrapper 替换为 `createApplyGatewayActiveRequestSnapshotAction({ ... })`，action 实现在 active requests load model，runtime controller 只 re-export 供页面维持现有 runtime 导入边界；页面只负责注入 routes、priority routes、overview 的 getter/setter 和 `mergeActiveRequestSnapshot`。
- 文件长度检查: `GatewayView.vue` 当前为 1059 行，`gatewayRuntimeController.ts` 为 275 行，`gatewayActiveRequestsLoadModel.ts` 为 96 行，`gatewayRuntimeController.test.ts` 为 1676 行，`gatewayRuntimeLoadController.ts` 为 263 行，`gatewayRouteStateModel.ts` 为 207 行，`gatewayRouteStateModel.test.ts` 为 424 行。相比任务 228 结束时，`GatewayView.vue` 从 1055 行升至 1059 行；runtime controller 保持在 300 行目标内。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 失败于 `createApplyGatewayActiveRequestSnapshotAction should be exported`，并且源码契约确认 `GatewayView.vue` 尚未通过 runtime controller 装配活动请求快照应用。红灯退出码为 1，39 个通过、2 个失败，整体耗时 `194.686824ms`。
- 调试记录: 初次将 action 直接实现到 `gatewayRuntimeController.ts` 后，文件增至 314 行，超过 300 行边界；拆回 `gatewayActiveRequestsLoadModel.ts` 并由 runtime controller re-export 时，首次重跑出现 `SyntaxError: Export 'createApplyGatewayActiveRequestSnapshotAction' is not defined in module`，根因是 re-export 列表引用了未本地导入的符号。补充本地导入后，同一目标测试通过。
- 行为锁定: 新测试确认 `createApplyGatewayActiveRequestSnapshotAction` 每次调用都会读取最新 routes、priority routes 和 overview，把这些值与 active request snapshot 交给注入的 `mergeSnapshot`，并通过注入 setter 回写 routes、priority routes 和 overview；源码契约确认 `loadActiveRequests` 和 `loadData` 仍注入同一个 `applyActiveRequestSnapshot`，页面不再定义本地 `function applyActiveRequestSnapshot(items: GatewayActiveRequest[])`。
- 副作用边界: 本任务未改变活动请求刷新、初始数据加载、实时刷新、活跃并发合并、priority routes 同步、overview active concurrency 更新、monitor 自动刷新、请求取消、静默错误处理或 toast 规则；只是把活动请求快照应用的状态写入 handler 从页面迁入 active request load model。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，41 个 gateway runtime controller 测试全部通过，最终耗时 `193.011839ms`。
- `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayActiveRequestsLoadModel.test.ts frontend/tests/gatewayInitialDataLoadModel.test.ts frontend/tests/gatewayRealtimeRefreshModel.test.ts frontend/tests/gatewayRouteStateModel.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，66 个 runtime 相邻测试全部通过，最终耗时 `420.951586ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，395 个网关相关测试全部通过，最终耗时 `2684.660904ms`。
- `node --test frontend/tests/*.test.ts`: 通过，453 个前端状态辅助测试全部通过，最终耗时 `2695.117162ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `1.01s`。仍有既有大 chunk 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 229 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 230: 网关可见性变化入口轻量 runtime action 边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `handleVisibilityChange()` wrapper 替换为 `createHandleGatewayVisibilityChangeAction({ ... })`，由 runtime controller 读取注入的页面可见性和 monitor 状态 getter，并继续调用现有 `gatewayRuntime.handleVisibilityRefresh`。页面只负责注入 `document.visibilityState`、`isGatewayMonitor.value`、`refreshRealtimeData` 和 `refreshActiveRequests`。
- 文件长度检查: `GatewayView.vue` 当前为 1062 行，`gatewayRuntimeController.ts` 为 297 行，`gatewayRuntimeController.test.ts` 为 1730 行，`gatewayRuntimeLoadController.ts` 为 263 行，`gatewayActiveRequestsLoadModel.ts` 为 96 行，`gatewayRouteStateModel.ts` 为 207 行，`gatewayRouteStateModel.test.ts` 为 424 行。相比任务 229 结束时，`GatewayView.vue` 从 1059 行升至 1062 行；runtime controller 从 275 行增至 297 行，仍低于 300 行目标但已经接近上限。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts` 失败于 `createHandleGatewayVisibilityChangeAction should be exported`，并且源码契约确认 `GatewayView.vue` 尚未通过 runtime controller 装配可见性变化 handler。红灯退出码为 1，40 个通过、2 个失败，整体耗时 `200.91047ms`。
- 行为锁定: 新测试确认 `createHandleGatewayVisibilityChangeAction` 每次调用都会读取最新 `visible` 和 `monitor` 状态，把原始 `refreshRealtimeData`、`refreshActiveRequests` 交给注入的 `handleVisibilityRefresh`，并保持 active request 静默刷新参数为 `true`；源码契约确认页面不再定义本地 `function handleVisibilityChange()`，也不直接调用 `gatewayRuntime.buildVisibilityRefreshPlan`、`void refreshRealtimeData()` 或 `void refreshActiveRequests(true)`。
- 副作用边界: 本任务未改变 `document.visibilityState` 判断、monitor 下活动请求刷新、实时刷新触发、自动刷新 timer、请求取消、静默错误处理或 toast 规则；只是把可见性变化入口 wrapper 从页面迁入 runtime controller。
- `node --test frontend/tests/gatewayRuntimeController.test.ts`: 通过，42 个 gateway runtime controller 测试全部通过，最终耗时 `195.668143ms`。
- `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayActiveRequestsLoadModel.test.ts frontend/tests/gatewayInitialDataLoadModel.test.ts frontend/tests/gatewayRealtimeRefreshModel.test.ts frontend/tests/gatewayRouteStateModel.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，67 个 runtime 相邻测试全部通过，最终耗时 `219.783329ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，396 个网关相关测试全部通过，最终耗时 `1519.641969ms`。
- `node --test frontend/tests/*.test.ts`: 通过，454 个前端状态辅助测试全部通过，最终耗时 `1766.278948ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `961ms`。仍有既有大 chunk 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 空白检查: `git diff --check` 通过；新增未跟踪文件口径的 `git diff --no-index --check -- /dev/null frontend/src/gatewayRuntimeController.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/gatewayRuntimeController.test.ts` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 230 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 231: 网关动作后数据重载入口轻量 action 边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeLoadController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `reloadGatewayDataAfterAction()` wrapper 替换为 `createReloadGatewayDataAfterAction({ loadData })`，action 实现在 runtime load controller，避免让已经 297 行的 runtime 聚合 controller 继续膨胀。页面继续向设置保存、同步路由、上游新增、路由开关、禁用、仅启用和 circuit reset 等 action 注入同一个 `reloadGatewayDataAfterAction`。
- 文件长度检查: `GatewayView.vue` 当前为 1063 行，`gatewayRuntimeController.ts` 为 297 行，`gatewayRuntimeLoadController.ts` 为 271 行，`gatewayRuntimeController.test.ts` 为 1765 行，`gatewayViewModel.test.ts` 为 350 行，`gatewayActiveRequestsLoadModel.ts` 为 96 行，`gatewayRouteStateModel.ts` 为 207 行，`gatewayRouteStateModel.test.ts` 为 424 行。相比任务 230 结束时，`GatewayView.vue` 从 1062 行升至 1063 行；runtime 聚合 controller 保持 297 行，runtime load controller 从 263 行增至 271 行，仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayViewModel.test.ts` 失败于 `createReloadGatewayDataAfterAction should be exported`，并且源码契约确认 `GatewayView.vue` 尚未从 `gatewayRuntimeLoadController` 导入和装配重载 action。红灯退出码为 1，49 个通过、3 个失败，整体耗时 `1670.688861ms`。
- 行为锁定: 新测试确认 `createReloadGatewayDataAfterAction` 每次调用都会委托注入的 `loadData`；源码契约确认页面不再定义本地 `async function reloadGatewayDataAfterAction()`，所有动作后重载入口继续注入同一个 `reloadGatewayDataAfterAction`，且具体 handler 内不直接调用 `await loadData()`。
- 副作用边界: 本任务未改变动作成功后的数据重载顺序、错误传播、toast 顺序、请求取消、静默错误处理、自动刷新或 Docker 运行态行为；只是把动作后重载入口 wrapper 从页面迁入 runtime load controller。
- `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，52 个目标测试全部通过，最终耗时 `195.0137ms`。
- `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayViewModel.test.ts frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewaySyncController.test.ts frontend/tests/gatewayRouteActionController.test.ts frontend/tests/gatewaySettingsController.test.ts`: 通过，79 个动作链路相邻测试全部通过，最终耗时 `453.567207ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，398 个网关相关测试全部通过，最终耗时 `1949.895247ms`。
- `node --test frontend/tests/*.test.ts`: 通过，456 个前端状态辅助测试全部通过，最终耗时 `1817.59545ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `26.80s`。仍有既有大 chunk 警告和 plugin timing 提醒。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 空白检查: `git diff --check` 通过；新增未跟踪文件口径的 `git diff --no-index --check -- /dev/null frontend/src/gatewayRuntimeLoadController.ts`、`git diff --no-index --check -- /dev/null frontend/tests/gatewayRuntimeController.test.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/gatewayViewModel.test.ts` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 231 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 232: 网关页面表格容器绑定入口轻量 DOM handler 边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/composables/useTableScrollHeights.ts`、`frontend/tests/tableScrollHeights.test.ts`、`frontend/tests/gatewayRouteManagementTableComponent.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `bindPageTableContainer(element)` wrapper 替换为 `createBindPageTableContainerAction({ setContainer })`，action 实现在 table scroll helper 中，页面只负责把过滤后的 HTMLElement 写回 `pageTableContainer.value`；`GatewayRouteManagementTable` 仍通过 `bind-table-container` 接收同一个 ref 绑定入口。
- 文件长度检查: `GatewayView.vue` 当前为 1065 行，`useTableScrollHeights.ts` 为 113 行，`tableScrollHeights.test.ts` 为 65 行，`gatewayRouteManagementTableComponent.test.ts` 为 52 行，`gatewayRuntimeController.ts` 为 297 行，`gatewayRuntimeLoadController.ts` 为 271 行。相比任务 231 结束时，`GatewayView.vue` 从 1063 行升至 1065 行；table scroll helper 从 102 行增至 113 行，仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/tableScrollHeights.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts` 首次因静态导入缺失导出触发模块语法错误；调整为 namespace 导入后同一命令失败于 `createBindPageTableContainerAction should be exported`，并且源码契约确认 `GatewayView.vue` 尚未从 `useTableScrollHeights` 导入和装配 DOM handler action。最终红灯退出码为 1，2 个通过、2 个失败，整体耗时 `204.351537ms`。
- 行为锁定: 新测试确认 `createBindPageTableContainerAction` 只接受 `HTMLElement`，对组件实例、非 HTMLElement 和 `null` 写入 `null`；源码契约确认页面不再定义本地 `function bindPageTableContainer(element: Element | ComponentPublicInstance | null)`，也不在页面 action 装配段直接判断 `instanceof HTMLElement`。
- 副作用边界: 本任务未改变 `useTableScrollHeights()` 的高度计算、ResizeObserver、watch、路由管理表格 ref 绑定、`GatewayRouteManagementTable` props 或移动端/桌面端布局；只是把 DOM ref 过滤逻辑从页面迁入 table scroll helper。
- `node --test frontend/tests/tableScrollHeights.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts`: 通过，4 个目标测试全部通过，最终耗时 `176.586525ms`。
- `node --test frontend/tests/tableScrollHeights.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts frontend/tests/gatewayViewModel.test.ts frontend/tests/gateway*.test.ts`: 通过，400 个网关相关和表格绑定测试全部通过，最终耗时 `3213.419535ms`。
- `node --test frontend/tests/*.test.ts`: 通过，458 个前端状态辅助测试全部通过，最终耗时 `3316.661989ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3418` 个模块完成转换，Vite 构建耗时 `1.24s`。仍有既有大 chunk 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 空白检查: `git diff --check` 通过；新增未跟踪文件口径的 `git diff --no-index --check -- /dev/null frontend/src/composables/useTableScrollHeights.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/tableScrollHeights.test.ts` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 232 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 233: 网关通知执行入口轻量 action 边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayNoticeController.ts`、`frontend/tests/gatewayNoticeController.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `showNotice()` 与 `showPlanNotice()` wrapper 替换为 `createGatewayNoticeActions({ toast })`，通知执行入口实现在 `gatewayNoticeController.ts`；页面继续向各 gateway controller 注入同名 `showNotice`、`showPlanNotice`，toast tone 到 Ant Design Vue message 方法的映射保持。
- 文件长度检查: `GatewayView.vue` 当前为 1052 行，`gatewayNoticeController.ts` 为 29 行，`gatewayNoticeController.test.ts` 为 36 行，`gatewayViewModel.test.ts` 为 356 行，`gatewayRuntimeController.ts` 为 297 行，`gatewayRuntimeLoadController.ts` 为 271 行。相比任务 232 结束时，`GatewayView.vue` 从 1065 行降至 1052 行；新增 notice controller 低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayNoticeController.test.ts frontend/tests/gatewayViewModel.test.ts` 失败于 `gateway notice controller should exist`，并且源码契约确认 `GatewayView.vue` 尚未从 `gatewayNoticeController` 导入和装配通知 action。红灯退出码为 1，7 个通过、2 个失败，整体耗时 `173.487298ms`。
- 行为锁定: 新测试确认 `createGatewayNoticeActions` 按 `success`、`error`、`info` tone 调用注入的 toast 方法，`showPlanNotice` 继续委托 `plan.notice`；源码契约确认页面不再定义本地 `type GatewayNoticePlan`、`function showNotice()` 或 `function showPlanNotice()`，也不在页面内直接执行 `toast[notice.tone](notice.message)`。
- 副作用边界: 本任务未改变任何通知文案、通知顺序、错误传播、controller 依赖注入形态、API 请求、自动刷新、请求取消、后端、Docker 或运行态行为；只是把通知执行 wrapper 从页面迁入独立 notice controller。
- `node --test frontend/tests/gatewayNoticeController.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，9 个目标测试全部通过，最终耗时 `171.501065ms`。
- `node --test frontend/tests/gatewayNoticeController.test.ts frontend/tests/gatewayViewModel.test.ts frontend/tests/gateway*.test.ts`: 通过，399 个网关相关和通知执行测试全部通过，最终耗时 `3125.319543ms`。
- `node --test frontend/tests/*.test.ts`: 通过，459 个前端状态辅助测试全部通过，最终耗时 `3244.840427ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3419` 个模块完成转换，Vite 构建耗时 `1.16s`。仍有既有大 chunk 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 空白检查: `git diff --check` 通过；新增未跟踪文件口径的 `git diff --no-index --check -- /dev/null frontend/src/gatewayNoticeController.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/gatewayNoticeController.test.ts` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 233 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 234: 网关用量加载副作用入口边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeLoadController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/tests/gatewayUsageRangeController.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `async function loadGatewayUsage(silent = false)` wrapper 替换为 `createLoadGatewayUsageRuntimeAction({ loadUsage, ...deps })`，依赖装配下沉到 runtime load controller；真实 `loadGatewayUsage` 执行函数、用量范围转换、AbortController slot、loading 状态、invalid range 通知、silent 错误抑制和 `gatewayUsage.value` 写入规则保持。
- 文件长度检查: `GatewayView.vue` 当前为 1050 行，`gatewayRuntimeLoadController.ts` 为 287 行，`gatewayRuntimeController.test.ts` 为 1850 行，`gatewayUsageRangeController.test.ts` 为 123 行，`gatewayRuntimeController.ts` 为 297 行。相比任务 233 结束时，`GatewayView.vue` 从 1052 行降至 1050 行；runtime load controller 从 271 行增至 287 行，仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts` 失败于 `createLoadGatewayUsageRuntimeAction should be exported`，并且源码契约确认 `GatewayView.vue` 尚未从 `gatewayRuntimeLoadController` 导入和装配 usage runtime action。红灯退出码为 1，49 个通过、4 个失败，整体耗时 `214.966782ms`。
- 行为锁定: 新测试确认 `createLoadGatewayUsageRuntimeAction` 每次调用都会读取最新 `isMonitor` 与 `requestRange`，并透传 `controllerSlot`、`requestUsage`、`setUsage`、`setUsageLoading`、`showNotice`、`showPlanNotice`、`isAbortError`；源码契约确认页面不再定义本地 `async function loadGatewayUsage(silent = false)`。
- 副作用边界: 本任务未改变 `buildGatewayUsageLoadPlan`、`buildGatewayUsageLoadResultPlan`、`buildGatewayUsageLoadErrorPlan` 的语义，未改变 `getGatewayUsage` 请求参数、AbortController slot、usage loading、silent 错误抑制、invalid range 通知、用量查询按钮、今日快捷查询、后端、Docker 或运行态行为。
- `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts`: 通过，53 个目标测试全部通过，最终耗时 `199.209495ms`。
- `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts frontend/tests/gateway*.test.ts`: 通过，400 个网关相关和用量加载测试全部通过，最终耗时 `2909.810468ms`。
- `node --test frontend/tests/*.test.ts`: 通过，460 个前端状态辅助测试全部通过，最终耗时 `2933.367839ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3419` 个模块完成转换，Vite 构建耗时 `1.10s`。仍有既有大 chunk 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 空白检查: `git diff --check` 通过；未跟踪变更文件口径的 `git diff --no-index --check -- /dev/null frontend/src/gatewayRuntimeLoadController.ts`、`git diff --no-index --check -- /dev/null frontend/tests/gatewayRuntimeController.test.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/gatewayUsageRangeController.test.ts` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 234 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 235: 网关实时请求加载副作用入口边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayActiveRequestsRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/tests/gatewayUsageRangeController.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `async function loadActiveRequests(silent = false)` wrapper 替换为 `createLoadGatewayActiveRequestsRuntimeAction({ loadActiveRequests, ...deps })`；新增轻量 `gatewayActiveRequestsRuntimeController.ts` 负责装配 silent、mounted、AbortController slot、请求函数、snapshot 写入、snapshot 应用和通知依赖，真实执行仍委托既有 `gatewayRuntime.loadActiveRequests`。
- 文件长度检查: `GatewayView.vue` 当前为 1049 行，`gatewayActiveRequestsRuntimeController.ts` 为 38 行，`gatewayRuntimeLoadController.ts` 为 287 行，`gatewayRuntimeController.ts` 为 297 行，`gatewayRuntimeController.test.ts` 为 1905 行，`gatewayUsageRangeController.test.ts` 为 123 行。相比任务 234 结束时，`GatewayView.vue` 从 1050 行降至 1049 行；新增 active requests runtime controller 低于 300 行目标，未继续膨胀 runtime load controller。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts` 失败于 `createLoadGatewayActiveRequestsRuntimeAction should be exported`，并且源码契约确认 `GatewayView.vue` 尚未从 `gatewayActiveRequestsRuntimeController` 导入和装配 active requests runtime action。红灯退出码为 1，52 个通过、2 个失败，整体耗时 `257.877332ms`。
- 行为锁定: 新测试确认 `createLoadGatewayActiveRequestsRuntimeAction` 默认以 `silent: false` 调用，显式静默调用透传 `silent: true`，并透传 `mounted`、`controllerSlot`、`requestActiveRequests`、`setActiveRequests`、`applyActiveRequestSnapshot`、`showPlanNotice`；源码契约确认页面不再定义本地 `async function loadActiveRequests(silent = false)`。
- 副作用边界: 本任务未改变 `buildGatewayActiveRequestsLoadResultPlan`、`buildGatewayActiveRequestsLoadErrorPlan`、`getGatewayActiveRequests` 请求、活动请求 AbortController slot、snapshot 应用、loading 状态、silent 错误处理、监控页刷新顺序、自动刷新联动、后端、Docker 或运行态行为。
- `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts`: 通过，54 个目标测试全部通过，最终耗时 `200.398523ms`。
- `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts frontend/tests/gateway*.test.ts`: 通过，401 个网关相关和实时请求加载测试全部通过，最终耗时 `1418.277841ms`。
- `node --test frontend/tests/*.test.ts`: 通过，461 个前端状态辅助测试全部通过，最终耗时 `1650.824876ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3420` 个模块完成转换，Vite 构建耗时 `1.55s`。仍有既有大 chunk 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 空白检查: `git diff --check` 通过；未跟踪变更文件口径的 `git diff --no-index --check -- /dev/null frontend/src/gatewayActiveRequestsRuntimeController.ts`、`git diff --no-index --check -- /dev/null frontend/tests/gatewayRuntimeController.test.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/gatewayUsageRangeController.test.ts` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 235 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 236: 网关实时请求刷新入口边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayActiveRequestsRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `async function refreshActiveRequests(silent = true)` wrapper 替换为 `createRefreshGatewayActiveRequestsRuntimeAction({ ... })`；active requests runtime controller 现在同时承接实时请求加载 action 和刷新入口 action，页面只注入 `buildActiveRequestsRefreshPlan`、`startActiveRequestsRefresh`、`finishActiveRequestsRefresh`、`loadActiveRequests`、`Date.now`、visibility 和 monitor state 读取器。
- 文件长度检查: `GatewayView.vue` 当前为 1042 行，`gatewayActiveRequestsRuntimeController.ts` 为 101 行，`gatewayRuntimeLoadController.ts` 为 287 行，`gatewayRuntimeController.ts` 为 297 行，`gatewayRuntimeController.test.ts` 为 2012 行，`gatewayUsageRangeController.test.ts` 为 123 行。相比任务 235 结束时，`GatewayView.vue` 从 1049 行降至 1042 行；active requests runtime controller 从 38 行增至 101 行，仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts` 失败于 `createRefreshGatewayActiveRequestsRuntimeAction should be exported`，并且源码契约确认 `GatewayView.vue` 尚未从 `gatewayActiveRequestsRuntimeController` 导入和装配 active requests refresh action。红灯退出码为 1，54 个通过、2 个失败，整体耗时 `7063.702005ms`。
- 行为锁定: 新测试确认 `createRefreshGatewayActiveRequestsRuntimeAction` 每次调用读取最新 now、visibility、monitor state 和 silent 参数；当计划不应启动或 runtime throttle 拒绝启动时不加载；当加载已启动时无论成功或抛错都会调用 `finishActiveRequestsRefresh`。源码契约确认页面不再定义本地 `async function refreshActiveRequests(silent = true)`。
- 副作用边界: 本任务未改变 `buildGatewayActiveRequestsRefreshPlan`、`startActiveRequestsRefresh`、`finishActiveRequestsRefresh`、`loadGatewayActiveRequests`、document visibility 判断、monitor 判断、活动请求静默刷新、自动刷新 timer 联动、后端、Docker 或运行态行为。
- `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts`: 通过，56 个目标测试全部通过，最终耗时 `241.100419ms`。
- `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts frontend/tests/gateway*.test.ts`: 通过，403 个网关相关和实时请求刷新测试全部通过，最终耗时 `2615.415948ms`。
- `node --test frontend/tests/*.test.ts`: 通过，463 个前端状态辅助测试全部通过，最终耗时 `2179.567794ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3420` 个模块完成转换，Vite 构建耗时 `32.57s`。仍有既有大 chunk 警告和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 空白检查: `git diff --check` 通过；未跟踪变更文件口径的 `git diff --no-index --check -- /dev/null frontend/src/gatewayActiveRequestsRuntimeController.ts`、`git diff --no-index --check -- /dev/null frontend/tests/gatewayRuntimeController.test.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/gatewayUsageRangeController.test.ts` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 236 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 237: 网关实时刷新数据入口边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRealtimeRefreshRuntimeController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `async function refreshRealtimeData()` wrapper 替换为 `createRefreshGatewayRealtimeDataRuntimeAction({ ... })`；新增轻量 realtime refresh runtime controller 负责每次调用时读取 `Date.now`、document visibility、monitor state、日志抽屉状态和 include disabled 状态，再委托既有 `gatewayRuntime.refreshRealtimeData` 执行真实刷新。
- 文件长度检查: `GatewayView.vue` 当前为 1042 行，`gatewayRealtimeRefreshRuntimeController.ts` 为 122 行，`gatewayActiveRequestsRuntimeController.ts` 为 101 行，`gatewayRuntimeLoadController.ts` 为 287 行，`gatewayRuntimeController.ts` 为 297 行，`gatewayRuntimeController.test.ts` 为 2151 行，`gatewayUsageRangeController.test.ts` 为 123 行。相比任务 236 结束时，`GatewayView.vue` 仍为 1042 行；新增 realtime refresh runtime controller 低于 300 行目标，未继续膨胀 runtime 聚合 controller 或 runtime load controller。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts` 失败于 `createRefreshGatewayRealtimeDataRuntimeAction should be exported`，并且源码契约确认 `GatewayView.vue` 尚未从 `gatewayRealtimeRefreshRuntimeController` 导入和装配 realtime refresh action。红灯退出码为 1，55 个通过、2 个失败，整体耗时 `212.902037ms`。
- 行为锁定: 新测试确认 `createRefreshGatewayRealtimeDataRuntimeAction` 每次调用读取最新 now、visibility、monitor、logs drawer、include disabled 和 priority dialog state，并完整透传 start/finish auto refresh、AbortController slot、overview/routes/logs 请求、当前日志、路由归一化、overview/routes/priority/logs 写入、active requests 静默刷新和 abort error 判断依赖。源码契约确认页面不再定义本地 `async function refreshRealtimeData()`。
- 副作用边界: 本任务未改变 `buildGatewayRealtimeRefreshPlan`、`buildGatewayRealtimeRefreshApplyPlan`、`refreshGatewayRealtimeData` 的 Promise.all 请求顺序、自动刷新 throttle、日志抽屉加载规则、priority dialog 保护、active requests 静默刷新联动、后端、Docker 或运行态行为。
- `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts`: 通过，57 个目标测试全部通过，最终耗时 `225.561242ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，404 个网关相关测试全部通过，最终耗时 `4996.113509ms`。
- `node --test frontend/tests/*.test.ts`: 通过，464 个前端状态辅助测试全部通过，最终耗时 `2466.731523ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3421` 个模块完成转换，Vite 构建耗时 `34.29s`。仍有既有大 chunk 警告和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 空白检查: `git diff --check` 通过；未跟踪变更文件口径的 `git diff --no-index --check -- /dev/null frontend/src/gatewayRealtimeRefreshRuntimeController.ts`、`git diff --no-index --check -- /dev/null frontend/src/gatewayActiveRequestsRuntimeController.ts`、`git diff --no-index --check -- /dev/null frontend/tests/gatewayRuntimeController.test.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/gatewayUsageRangeController.test.ts` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 237 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 238: 网关初始数据加载入口边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayInitialDataLoadController.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `async function loadData()` wrapper 替换为 `createLoadGatewayInitialDataRuntimeAction({ ... })`；初始数据加载 controller 现在同时承接真实 `loadGatewayData` 执行函数和页面运行时 action 装配，页面只注入 monitor state、usage snapshot 状态、include disabled、usage range、AbortController slot、请求函数、写入函数、活动请求快照应用和错误通知依赖。
- 文件长度检查: `GatewayView.vue` 当前为 1042 行，`gatewayInitialDataLoadController.ts` 为 290 行，`gatewayRealtimeRefreshRuntimeController.ts` 为 122 行，`gatewayActiveRequestsRuntimeController.ts` 为 101 行，`gatewayRuntimeLoadController.ts` 为 287 行，`gatewayRuntimeController.ts` 为 297 行，`gatewayRuntimeController.test.ts` 为 2305 行，`gatewayUsageRangeController.test.ts` 为 123 行。相比任务 237 结束时，`GatewayView.vue` 仍为 1042 行；initial data load controller 从 165 行增至 290 行，仍低于 300 行目标但已接近上限。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts` 失败于 `createLoadGatewayInitialDataRuntimeAction should be exported`，并且源码契约确认 `GatewayView.vue` 尚未从 `gatewayInitialDataLoadController` 导入和装配 initial data load action。红灯退出码为 1，56 个通过、2 个失败，整体耗时 `5526.483524ms`。
- 构建暴露问题: 首次实现后 `npm run build` 失败于 `src/views/GatewayView.vue(453,20): error TS2448: Block-scoped variable 'loadData' used before its declaration.` 和 `TS2454`。根因是本地函数声明被替换为 `const loadData` 后，前面的 `handleRefresh` 初始化提前读取了它；已将 `handleRefresh` 装配移动到 `loadData` 之后，复跑构建通过。
- 行为锁定: 新测试确认 `createLoadGatewayInitialDataRuntimeAction` 每次调用读取最新 monitor、usage snapshot、include disabled 和 request range，并完整透传 current usage、mounted、AbortController slot、loading setter、overview/settings/routes/logs/site groups/usage/active requests 请求、route normalization、各状态写入、active request snapshot 应用、错误通知和 abort error 判断依赖。源码契约确认页面不再定义本地 `async function loadData()`。
- 副作用边界: 本任务未改变 `loadGatewayData` 真实执行、`buildGatewayInitialDataLoadPlan`、`buildGatewayInitialDataApplyPlan`、初始数据 Promise.all 请求顺序、settings/routes/logs/site groups/usage/active requests 写入规则、AbortController 清理、loading 状态、include disabled、monitor state、usage range、错误通知、后端、Docker 或运行态行为。
- `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts`: 通过，58 个目标测试全部通过，最终耗时 `219.785568ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，405 个网关相关测试全部通过，最终耗时 `2758.008369ms`。
- `node --test frontend/tests/*.test.ts`: 通过，465 个前端状态辅助测试全部通过，最终耗时 `2109.139426ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3421` 个模块完成转换，Vite 构建耗时 `42.74s`。仍有既有大 chunk 警告和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 空白检查: `git diff --check` 通过；未跟踪变更文件口径的 `git diff --no-index --check -- /dev/null frontend/src/gatewayInitialDataLoadController.ts`、`git diff --no-index --check -- /dev/null frontend/src/gatewayRealtimeRefreshRuntimeController.ts`、`git diff --no-index --check -- /dev/null frontend/tests/gatewayRuntimeController.test.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/gatewayUsageRangeController.test.ts` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 238 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 239: 网关自动刷新启动/停止入口边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAutoRefreshTimerController.ts`、`frontend/tests/gatewayAutoRefreshTimerController.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/tests/gatewayUsageRangeController.test.ts`。
- 改动: 将 `GatewayView.vue` 本地 `function startAutoRefresh()` 与 `function stopAutoRefresh()` wrapper 替换为 `createStartGatewayAutoRefreshTimersAction({ ... })` 和 `createStopGatewayAutoRefreshTimersAction({ ... })`；自动刷新 timer controller 保留 `startGatewayAutoRefreshTimers`、`stopGatewayAutoRefreshTimers` 的核心执行函数，并新增运行时 action factory，页面只注入 timer 对象、monitor getter、刷新间隔常量、AbortController slot、set/clear interval adapter 和刷新函数。
- 文件长度检查: `GatewayView.vue` 当前为 1042 行，`gatewayAutoRefreshTimerController.ts` 为 135 行，`gatewayInitialDataLoadController.ts` 为 290 行，`gatewayRuntimeController.ts` 为 297 行，`gatewayAutoRefreshTimerController.test.ts` 为 239 行，`gatewayRuntimeController.test.ts` 为 2305 行，`gatewayUsageRangeController.test.ts` 为 123 行。相比任务 238 结束时，`GatewayView.vue` 仍为 1042 行；auto refresh timer controller 从 80 行增至 135 行，仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayAutoRefreshTimerController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts` 首次失败于缺少 `createStartGatewayAutoRefreshTimersAction` 导出，确认测试锁定 timer action factory 必须存在。红灯退出码为 1，58 个通过、1 个失败，整体耗时 `5034.044229ms`。
- 行为锁定: 新测试确认 start action 每次调用读取最新 monitor state，并完整透传 timer 对象、刷新间隔、AbortController slot、set/clear interval adapter、实时刷新函数和活动请求刷新函数；stop action 完整透传 stop 依赖。源码契约确认页面不再定义本地 `function startAutoRefresh()` 或 `function stopAutoRefresh()`，也没有在该 wrapper 范围内直接调用 `window.setInterval`、`window.clearInterval`、`buildAutoRefreshTimerPlan` 或 `abortAndClear`。
- 副作用边界: 本任务未改变 `startGatewayAutoRefreshTimers`、`stopGatewayAutoRefreshTimers`、自动刷新 timer plan、route/monitor/active request 刷新间隔、AbortController slot 清理顺序、可见性刷新联动、后端、Docker 或运行态行为。
- `node --test frontend/tests/gatewayAutoRefreshTimerController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts`: 通过，63 个目标测试全部通过，最终耗时 `985.121668ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，406 个网关相关测试全部通过，最终耗时 `1526.422233ms`。
- `node --test frontend/tests/*.test.ts`: 通过，466 个前端状态辅助测试全部通过，最终耗时 `1954.425162ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3421` 个模块完成转换，Vite 构建耗时 `34.19s`。仍有既有大 chunk 警告和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 空白检查: `git diff --check` 通过；未跟踪变更文件口径的 `git diff --no-index --check -- /dev/null frontend/src/gatewayAutoRefreshTimerController.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/gatewayAutoRefreshTimerController.test.ts` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 239 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 240: 网关浏览器确认入口轻量 action 边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteActionController.ts`、`frontend/tests/gatewayRouteActionController.test.ts`、`frontend/tests/gatewayAddUpstreamController.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `createConfirmGatewayRouteAction({ confirmWindow })`，把 `GatewayView.vue` 本地 `confirmGatewayRouteAction = (message) => window.confirm(message)` 替换为 route action controller 的轻量 action factory；页面仍只把该确认 action 注入禁用全部路由和仅启用单路由动作。
- 文件长度检查: `GatewayView.vue` 当前为 1045 行，`gatewayRouteActionController.ts` 为 114 行，`gatewayRouteActionController.test.ts` 为 299 行，`gatewayAddUpstreamController.test.ts` 为 318 行，`gatewayViewModel.test.ts` 为 356 行。相比任务 239 结束时，`GatewayView.vue` 因 factory 装配换行从 1042 行增至 1045 行，route action controller 从 101 行增至 114 行，仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayRouteActionController.test.ts frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewayViewModel.test.ts` 首次失败于缺少 `createConfirmGatewayRouteAction` 导出，确认测试锁定浏览器确认入口必须从 controller 提供。红灯退出码为 1，16 个通过、1 个失败，整体耗时 `202.733828ms`。
- 行为锁定: 新测试确认 `createConfirmGatewayRouteAction` 委托注入的 `confirmWindow.confirm(message)` 并返回其布尔结果；源码契约确认 `GatewayView.vue` 从 route action controller 导入该 factory，并且不再包含本地 `(message: string) => window.confirm(message)` wrapper，也不在路由 action handler 片段内直接调用 `window.confirm`。
- 副作用边界: 本任务未改变禁用全部路由和仅启用单路由的确认文案、确认取消行为、请求参数、成功后 reload、失败通知、toast 顺序、路由开关、circuit reset、后端、Docker 或运行态行为。
- `node --test frontend/tests/gatewayRouteActionController.test.ts frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，24 个目标测试全部通过，最终耗时 `266.69643ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，408 个网关相关测试全部通过，最终耗时 `1809.476504ms`。
- `node --test frontend/tests/*.test.ts`: 通过，468 个前端状态辅助测试全部通过，最终耗时 `1881.072126ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3421` 个模块完成转换，Vite 构建耗时 `38.71s`。仍有既有大 chunk 警告和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 空白检查: `git diff --check` 通过；未跟踪变更文件口径的 `git diff --no-index --check -- /dev/null frontend/src/gatewayRouteActionController.ts`、`git diff --no-index --check -- /dev/null frontend/tests/gatewayRouteActionController.test.ts`、`git diff --no-index --check -- /dev/null frontend/tests/gatewayAddUpstreamController.test.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/gatewayViewModel.test.ts` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 240 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 241: 网关请求地址来源入口边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAccessController.ts`、`frontend/tests/gatewayAccessController.test.ts`、`frontend/tests/tableScrollHeights.test.ts`、`frontend/tests/gatewayMonitorToolbarComponent.test.ts`。
- 改动: 新增 `createGatewayRequestUrlAction({ getApiBase, location })`，把 `GatewayView.vue` 中直接读取 `window.location.origin` 并调用 `buildGatewayRequestUrl(...)` 的 computed 逻辑迁入 gateway access controller；页面只注入 `VITE_API_BASE` getter 和 `window.location`，访问栏、复制入口和 Codex `/v1` 提示继续读取同一个 `gatewayRequestUrl` computed。
- 文件长度检查: `GatewayView.vue` 当前为 1047 行，`gatewayAccessController.ts` 为 112 行，`gatewayAccessController.test.ts` 为 212 行，`tableScrollHeights.test.ts` 为 65 行，`gatewayMonitorToolbarComponent.test.ts` 为 45 行。相比任务 240 结束时，`GatewayView.vue` 因 computed factory 装配换行从 1045 行增至 1047 行，access controller 从 95 行增至 112 行，仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayAccessController.test.ts frontend/tests/gatewayAccessModel.test.ts frontend/tests/tableScrollHeights.test.ts frontend/tests/gatewayMonitorToolbarComponent.test.ts` 首次失败于缺少 `createGatewayRequestUrlAction` 导出，确认测试锁定请求地址来源入口必须从 access controller 提供。红灯退出码为 1，14 个通过、1 个失败，整体耗时 `3633.254569ms`。
- 行为锁定: 新测试确认 `createGatewayRequestUrlAction` 每次调用读取最新 `getApiBase()` 和 `location.origin`，并继续委托既有 `buildGatewayRequestUrl` 规则；源码契约确认 `GatewayView.vue` 从 access controller 导入该 factory，不再直接出现 `window.location.origin` 或本地 `buildGatewayRequestUrl(String(import.meta.env.VITE_API_BASE || '/api'), window.location.origin)` 调用。
- 副作用边界: 本任务未改变网关请求 URL 计算规则、`VITE_API_BASE` 读取、Codex `/v1` 提示、访问栏 props、复制按钮、设置弹窗、剪贴板调用、后端、Docker 或运行态行为。
- `node --test frontend/tests/gatewayAccessController.test.ts frontend/tests/gatewayAccessModel.test.ts frontend/tests/tableScrollHeights.test.ts frontend/tests/gatewayMonitorToolbarComponent.test.ts`: 通过，24 个目标测试全部通过，最终耗时 `193.292591ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，409 个网关相关测试全部通过，最终耗时 `1877.995222ms`。
- `node --test frontend/tests/*.test.ts`: 通过，469 个前端状态辅助测试全部通过，最终耗时 `2032.336497ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3421` 个模块完成转换，Vite 构建耗时 `37.58s`。仍有既有大 chunk 警告和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 空白检查: `git diff --check` 通过；未跟踪变更文件口径的 `git diff --no-index --check -- /dev/null frontend/src/gatewayAccessController.ts`、`git diff --no-index --check -- /dev/null frontend/tests/gatewayAccessController.test.ts`、`git diff --no-index --check -- /dev/null frontend/tests/tableScrollHeights.test.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/gatewayMonitorToolbarComponent.test.ts` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 241 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 242: 网关自动刷新定时器平台入口边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAutoRefreshTimerController.ts`、`frontend/tests/gatewayAutoRefreshTimerController.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/tests/gatewayUsageRangeController.test.ts`。
- 改动: 新增 `createGatewayAutoRefreshTimerPlatform({ timerWindow })`，把 `GatewayView.vue` 本地 `scheduleGatewayInterval` / `clearGatewayInterval` wrapper 替换为 auto refresh timer controller 提供的平台 adapter；页面只注入 `window` 一次，并继续把 `platform.setInterval` / `platform.clearInterval` 传给既有 start/stop action factory。
- 文件长度检查: `GatewayView.vue` 当前为 1049 行，`gatewayAutoRefreshTimerController.ts` 为 153 行，`gatewayAutoRefreshTimerController.test.ts` 为 268 行，`gatewayRuntimeController.test.ts` 为 2305 行，`gatewayUsageRangeController.test.ts` 为 123 行。相比任务 241 结束时，`GatewayView.vue` 因平台 factory 装配从 1047 行增至 1049 行，auto refresh timer controller 从 135 行增至 153 行，仍低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayAutoRefreshTimerController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts` 首次失败于缺少 `createGatewayAutoRefreshTimerPlatform` 导出，确认测试锁定 timer 平台入口必须由 controller 提供。红灯退出码为 1，58 个通过、1 个失败，整体耗时 `242.955454ms`。
- 行为锁定: 新测试确认 `createGatewayAutoRefreshTimerPlatform` 将 scheduling 和 clearing 委托给注入的 `timerWindow`，并保留 handler 执行；源码契约确认 `GatewayView.vue` 从 auto refresh timer controller 导入该 factory，并且不再保留本地 `window.setInterval` / `window.clearInterval` wrapper。
- 副作用边界: 本任务未改变自动刷新 timer plan、route/monitor/active request 刷新间隔、start/stop action factory、AbortController slot 清理顺序、可见性刷新联动、刷新函数调用、后端、Docker 或运行态行为。
- `node --test frontend/tests/gatewayAutoRefreshTimerController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts`: 通过，64 个目标测试全部通过，最终耗时 `272.757854ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，410 个网关相关测试全部通过，最终耗时 `1858.203465ms`。
- `node --test frontend/tests/*.test.ts`: 通过，470 个前端状态辅助测试全部通过，最终耗时 `2196.404202ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3421` 个模块完成转换，Vite 构建耗时 `16.40s`。仍有既有大 chunk 警告和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 空白检查: `git diff --check` 通过；未跟踪变更文件口径的 `git diff --no-index --check -- /dev/null frontend/src/gatewayAutoRefreshTimerController.ts`、`git diff --no-index --check -- /dev/null frontend/tests/gatewayAutoRefreshTimerController.test.ts`、`git diff --no-index --check -- /dev/null frontend/tests/gatewayRuntimeController.test.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/gatewayUsageRangeController.test.ts` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 242 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 243: 网关可见性状态读取入口边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayVisibilityPlatformController.ts`、`frontend/tests/gatewayVisibilityPlatformController.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/tests/gatewayAutoRefreshTimerController.test.ts`。
- 改动: 新增 `createGatewayVisibilityPlatform({ visibilityDocument })`，把 `GatewayView.vue` 中注入给活动请求刷新、实时刷新和 visibilitychange handler 的三处 `document.visibilityState === 'visible'` getter 替换为同一个 `gatewayVisibilityPlatform.isVisible`；页面仍只把 `document` 作为平台依赖注入一次。
- 文件长度检查: `GatewayView.vue` 当前为 1053 行，`gatewayVisibilityPlatformController.ts` 为 15 行，`gatewayVisibilityPlatformController.test.ts` 为 50 行，`gatewayRuntimeController.test.ts` 为 2305 行，`gatewayAutoRefreshTimerController.test.ts` 为 268 行。相比任务 242 结束时，`GatewayView.vue` 因 visibility platform 装配从 1049 行增至 1053 行，新 controller 和测试均低于 300 行目标。
- TDD 红灯: `node --test frontend/tests/gatewayVisibilityPlatformController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayAutoRefreshTimerController.test.ts` 首次失败于 `Error [ERR_MODULE_NOT_FOUND]: Cannot find module .../frontend/src/gatewayVisibilityPlatformController.ts`，确认测试锁定可见性平台入口必须存在。红灯退出码为 1，56 个通过、1 个失败，整体耗时 `5671.136253ms`。
- 中间边界校验: 首次实现平台 controller 后目标测试仍失败于旧源码契约，指出 runtime controller 测试仍要求 `GatewayView.vue` 直接读取 `document.visibilityState`；已更新契约为 `gatewayVisibilityPlatform.isVisible`，保持行为不变。
- 行为锁定: 新测试确认 `createGatewayVisibilityPlatform` 每次读取注入 document 的最新 `visibilityState`，仅当值为 `visible` 时返回 true；源码契约确认活动请求刷新、实时刷新和 visibilitychange handler 均通过 `gatewayVisibilityPlatform.isVisible` 注入，不再保留直接 `document.visibilityState === 'visible'` getter。
- 副作用边界: 本任务未改变页面隐藏时跳过刷新、可见时刷新 monitor 数据、活动请求静默刷新、自动刷新 timer、请求取消、事件监听注册/移除、后端、Docker 或运行态行为。
- `node --test frontend/tests/gatewayVisibilityPlatformController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayAutoRefreshTimerController.test.ts`: 通过，58 个目标测试全部通过，最终耗时 `255.684183ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，412 个网关相关测试全部通过，最终耗时 `2782.988636ms`。
- `node --test frontend/tests/*.test.ts`: 通过，472 个前端状态辅助测试全部通过，最终耗时 `2604.029628ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`3422` 个模块完成转换，Vite 构建耗时 `45.39s`。仍有既有大 chunk 警告和 plugin timing 警告。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` 脚本，未配置单独 lint 脚本；本轮使用 `npm run build` 覆盖 `vue-tsc -b` 类型检查和 Vite production build。
- 缓存清理: 构建后已删除本轮可再生成产物和临时缓存 `frontend/dist`、`frontend/node_modules/.tmp`；保留 `frontend/node_modules` 依赖目录。
- 空白检查: `git diff --check` 通过；未跟踪变更文件口径的 `git diff --no-index --check -- /dev/null frontend/src/gatewayVisibilityPlatformController.ts`、`git diff --no-index --check -- /dev/null frontend/tests/gatewayVisibilityPlatformController.test.ts`、`git diff --no-index --check -- /dev/null frontend/tests/gatewayRuntimeController.test.ts` 和 `git diff --no-index --check -- /dev/null frontend/tests/gatewayAutoRefreshTimerController.test.ts` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证。
- 运行态说明: 任务 243 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 244: 网关页面生命周期事件监听边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayVisibilityPlatformController.ts`、`frontend/tests/gatewayVisibilityPlatformController.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/tests/gatewayAutoRefreshTimerController.test.ts`。
- 改动: 新增 `createGatewayPageLifecycleEventPlatform({ lifecycleWindow, lifecycleDocument })`，把 `GatewayView.vue` 中 `site-groups:changed` 和 `visibilitychange` 的注册/移除事件边界统一交给平台对象；页面仍保留 mounted 初始化顺序、`loadData` 后启动自动刷新、route summary refresh 调度、卸载时 stop/abort/dispose 顺序。
- 文件长度检查: `GatewayView.vue` 为 1064 行，`gatewayVisibilityPlatformController.ts` 为 59 行，`gatewayVisibilityPlatformController.test.ts` 为 114 行。
- TDD 红灯: `node --test frontend/tests/gatewayVisibilityPlatformController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayAutoRefreshTimerController.test.ts` 首次失败于 `createGatewayPageLifecycleEventPlatform` 未从 `gatewayVisibilityPlatformController.ts` 导出，确认新增测试锁定生命周期事件平台入口。
- 中间边界校验: 首次实现后目标测试因旧源码契约仍要求单独导入 `createGatewayVisibilityPlatform` 失败；已将断言放宽为同模块具名导入，行为契约仍要求所有 visibility 读取经由 `gatewayVisibilityPlatform.isVisible`。
- 行为锁定: 新测试确认 page lifecycle platform 按原事件名注册和移除 `site-groups:changed` 与 `visibilitychange` handler；源码契约确认 `GatewayView.vue` 不再直接调用对应 `window.addEventListener`、`document.addEventListener`、`window.removeEventListener`、`document.removeEventListener`。
- `node --test frontend/tests/gatewayVisibilityPlatformController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayAutoRefreshTimerController.test.ts`: 通过，60 个目标测试全部通过，最终耗时 `230.617593ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，3422 个模块完成转换，Vite 构建耗时 `24.29s`。仍有既有大 chunk 警告和 plugin timing 警告。
- 空白检查: `git diff --check` 通过。
- 本任务未改后端代码，未重复执行 Go 验证、npm audit 或 Docker 重建。
- 运行态说明: 任务 244 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 245: 网关路由管理页主体组件拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayRouteManagementPage.vue`、`frontend/tests/gatewayRouteManagementPageComponent.test.ts`、`frontend/tests/gatewayRouteManagementTableComponent.test.ts`、`frontend/tests/gatewayRouteManagementToolbarComponent.test.ts`、`frontend/tests/gatewayAccessBarComponent.test.ts`。
- 改动: 新增 `GatewayRouteManagementPage.vue`，把路由管理模式下的 `GatewayRouteManagementToolbar` 与 `GatewayRouteManagementTable` 组合边界移入独立 page 组件；`GatewayView.vue` 只保留路由管理页所需 props、v-model 和事件接线，不再直接导入或渲染路由管理 toolbar/table。
- 文件长度检查: `GatewayView.vue` 为 1058 行，`GatewayRouteManagementPage.vue` 为 170 行，`GatewayRouteManagementTable.vue` 为 209 行，`GatewayRouteManagementToolbar.vue` 为 98 行，`gatewayRouteManagementPageComponent.test.ts` 为 50 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteManagementPageComponent.test.ts` 首次失败于缺少 `GatewayRouteManagementPage.vue`，且 `GatewayView.vue` 尚未委托到该组件，确认测试锁定本轮组件边界。
- 中间边界校验: 新组件实现后，旧的 toolbar/table/access bar 源码契约仍从 `GatewayView.vue` 查找直接父级；已更新为检查 `GatewayRouteManagementPage.vue` 承接路由管理 toolbar/table 组合，`GatewayView.vue` 仅承接 page 组件。
- 行为锁定: 新 page 组件只转发原有 props、v-model 和事件，不改变刷新、同步、批量探测、更新余额、禁用全部、添加上游、筛选、表格行操作、诊断和历史抽屉等副作用入口。
- `node --test frontend/tests/gatewayRouteManagementPageComponent.test.ts frontend/tests/gatewayRouteManagementToolbarComponent.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts`: 通过，6 个目标组件契约测试全部通过，最终耗时 `124.634301ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，416 个网关相关测试全部通过，最终耗时 `1543.365762ms`。
- `node --test frontend/tests/*.test.ts`: 通过，476 个前端状态辅助测试全部通过，最终耗时 `1924.441761ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，3424 个模块完成转换，Vite 构建耗时 `35.77s`。仍有既有大 chunk 警告和 plugin timing 警告。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- 空白检查: `git diff --check` 通过；`frontend/src/components/gateway/GatewayRouteManagementPage.vue`、`frontend/tests/gatewayRouteManagementPageComponent.test.ts`、`frontend/tests/gatewayAccessBarComponent.test.ts`、`frontend/tests/gatewayRouteManagementTableComponent.test.ts`、`frontend/tests/gatewayRouteManagementToolbarComponent.test.ts` 的 `git diff --no-index --check /dev/null <file>` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 245 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 246: 网关监控页主体组件拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayMonitorPage.vue`、`frontend/tests/gatewayMonitorPageComponent.test.ts`、`frontend/tests/gatewayMonitorToolbarComponent.test.ts`、`frontend/tests/gatewayMonitorDashboardComponent.test.ts`、`frontend/tests/gatewayAccessBarComponent.test.ts`。
- 改动: 新增 `GatewayMonitorPage.vue`，把监控模式下的 `GatewayMonitorToolbar` 与 `GatewayMonitorDashboard` 组合边界移入独立 page 组件；`GatewayView.vue` 只保留监控页所需 props 和事件接线，不再直接导入或渲染监控 toolbar/dashboard。
- 文件长度检查: `GatewayView.vue` 为 1053 行，`GatewayMonitorPage.vue` 为 136 行，`GatewayMonitorDashboard.vue` 为 133 行，`GatewayMonitorToolbar.vue` 为 50 行，`gatewayMonitorPageComponent.test.ts` 为 44 行。
- TDD 红灯: `node --test frontend/tests/gatewayMonitorPageComponent.test.ts` 首次失败于缺少 `GatewayMonitorPage.vue`，且 `GatewayView.vue` 尚未委托到该组件，确认测试锁定本轮组件边界。
- 中间边界校验: 新组件实现后，旧的 monitor toolbar/dashboard/access bar 源码契约仍从 `GatewayView.vue` 查找直接父级；已更新为检查 `GatewayMonitorPage.vue` 承接监控 toolbar/dashboard 组合，`GatewayView.vue` 仅承接 page 组件。
- 行为锁定: 新 page 组件只转发原有 props 和事件，不改变手动刷新、设置弹窗、最近请求抽屉、用量范围查询、今日快捷查询、活动请求复制、监控指标、活动流、路由池状态或策略面板展示行为。
- `node --test frontend/tests/gatewayMonitorPageComponent.test.ts frontend/tests/gatewayMonitorToolbarComponent.test.ts frontend/tests/gatewayMonitorDashboardComponent.test.ts frontend/tests/gatewayAccessBarComponent.test.ts`: 通过，8 个目标组件契约测试全部通过，最终耗时 `140.88875ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，418 个网关相关测试全部通过，最终耗时 `6699.457895ms`。
- `node --test frontend/tests/*.test.ts`: 通过，478 个前端状态辅助测试全部通过，最终耗时 `6651.870783ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，3426 个模块完成转换，Vite 构建耗时 `37.44s`。仍有既有大 chunk 警告和 plugin timing 警告。
- `npm audit --audit-level=high --fetch-retries=3 --fetch-timeout=60000`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- 空白检查: `git diff --check` 通过；`frontend/src/components/gateway/GatewayMonitorPage.vue`、`frontend/tests/gatewayMonitorPageComponent.test.ts`、`frontend/tests/gatewayAccessBarComponent.test.ts`、`frontend/tests/gatewayMonitorDashboardComponent.test.ts`、`frontend/tests/gatewayMonitorToolbarComponent.test.ts` 的 `git diff --no-index --check /dev/null <file>` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 246 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 247: 网关 OverlayHost page host 接线边界复核

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayOverlayPageHost.vue`、`frontend/src/components/gateway/GatewayOverlayHost.vue`、`frontend/tests/gatewayOverlayPageHostComponent.test.ts`、`frontend/tests/gatewayOverlayHostComponent.test.ts`、`frontend/tests/gatewayPriorityController.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/src/components.d.ts`。
- 改动: 新增 `GatewayOverlayPageHost.vue`，把 `GatewayView.vue` 中连接 `GatewayOverlayHost` 的大段 dialog/drawer props、named v-model、route logs 标题和 overlay events 下沉到 page host；`GatewayView.vue` 只保留 page host 的对象级 props 和业务事件处理函数。
- 行为锁定: `GatewayOverlayHost.vue` 仍是优先级弹窗、手动余额探测、设置、新增上游、路由模型、日志、路由日志和诊断抽屉的底层渲染宿主；`GatewayOverlayPageHost.vue` 只桥接已有 dialog/drawer state，不新增请求、副作用、mock 成功路径、隐藏回退或静默降级。
- 文件长度检查: `GatewayView.vue` 当前为 1010 行，`GatewayOverlayPageHost.vue` 为 246 行，`GatewayOverlayHost.vue` 为 192 行，`gatewayOverlayPageHostComponent.test.ts` 为 47 行，`gatewayOverlayHostComponent.test.ts` 为 107 行，`gatewayRuntimeController.test.ts` 为 2305 行，`gatewayPriorityController.test.ts` 为 660 行。
- TDD 红灯: `node --test frontend/tests/gatewayOverlayPageHostComponent.test.ts` 首次失败于缺少 `frontend/src/components/gateway/GatewayOverlayPageHost.vue`，且 `GatewayView.vue` 尚未委托到该 page host，确认测试锁定本轮接线边界。
- 中间边界校验: 新 page host 实现后，旧 `gatewayOverlayHostComponent.test.ts` 仍要求 `GatewayView.vue` 直接导入 `GatewayOverlayHost`；已更新为检查 `GatewayOverlayPageHost.vue` 承接底层 overlay host，`GatewayView.vue` 仅承接 page host。
- 构建修复: 首次 `npm run build` 暴露 `GatewayView.vue` 中旧模板接线残留的 `balanceProbeManualOpen`、`balanceProbeManualLoading`、`balanceProbeManualMessage` 未使用，以及 runtime helper 仍引用旧 `logsDrawerOpen`、`priorityDialogOpen` 局部别名；已删除无用别名，并让实时刷新 helper 直接读取 `logsDrawer.open.value` 与 `priorityDialog.open.value`，行为来源不变。
- 组件注册: `npm run build` 生成的 `frontend/src/components.d.ts` 已包含 `GatewayOverlayPageHost` 和 `GatewayOverlayHost` 全局组件声明。
- `node --test frontend/tests/gatewayOverlayPageHostComponent.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `187.937277ms`。
- `node --test frontend/tests/gatewayOverlayHostComponent.test.ts frontend/tests/gatewayOverlayPageHostComponent.test.ts frontend/tests/gatewayPriorityDialogComponent.test.ts frontend/tests/gatewayRouteBalanceManualDialogComponent.test.ts frontend/tests/gatewaySettingsDialogComponent.test.ts frontend/tests/gatewayAddUpstreamDialogComponent.test.ts frontend/tests/gatewayRouteModelsDialogComponent.test.ts frontend/tests/gatewayLogsDrawerComponent.test.ts frontend/tests/gatewayRouteDiagnosisDrawerComponent.test.ts`: 通过，19 个 overlay/dialog/drawer 相关测试全部通过，最终耗时 `296.341074ms`。
- `node --test frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayOverlayPageHostComponent.test.ts frontend/tests/gatewayOverlayHostComponent.test.ts`: 通过，55 个 runtime/overlay 相邻测试全部通过，最终耗时 `216.597848ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，421 个网关相关测试全部通过，最终耗时 `1539.820048ms`。
- `node --test frontend/tests/*.test.ts`: 通过，481 个前端状态辅助测试全部通过，最终耗时 `1714.637618ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，3428 个模块完成转换，Vite 构建耗时 `39.55s`。仍有既有大 chunk 警告和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/components/gateway/GatewayOverlayPageHost.vue` 和 `frontend/tests/gatewayOverlayPageHostComponent.test.ts` 的 `git diff --no-index --check /dev/null <file>` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 247 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 248: 网关页面挂载生命周期 action 拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPageLifecycleController.ts`、`frontend/tests/gatewayPageLifecycleController.test.ts`、`frontend/tests/gatewayVisibilityPlatformController.test.ts`。
- 改动: 新增 `mountGatewayPageLifecycle` 和 `unmountGatewayPageLifecycle`，把 `GatewayView.vue` 中 `onMounted` / `onBeforeUnmount` 的 mounted 标记、page listener 注册/移除、用量日期重置、初始加载、自动刷新启动、路由摘要刷新调度、加载 abort、用量 abort、路由探测 dispose 和余额探测 dispose 顺序下沉到 lifecycle controller；页面仅注入现有 action、slot、state setter 和 handler。
- 行为锁定: 挂载时仍保持 `mounted = true`、注册 `site-groups:changed` / `visibilitychange`、重置今日用量范围、等待 `loadData`、若仍 mounted 再启动自动刷新并调度路由摘要刷新；卸载时仍保持先标记未挂载，再停止自动刷新、abort 初始加载和用量加载、dispose 探测状态，最后移除 page listeners。
- 文件长度检查: `GatewayView.vue` 当前为 1018 行，`gatewayPageLifecycleController.ts` 为 74 行，`gatewayPageLifecycleController.test.ts` 为 137 行，`gatewayVisibilityPlatformController.test.ts` 为 118 行。相比任务 247 结束时，`GatewayView.vue` 因 lifecycle action 依赖注入从 1010 行增至 1018 行，但挂载/卸载顺序已从页面主体迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayPageLifecycleController.test.ts` 首次失败于缺少 `frontend/src/gatewayPageLifecycleController.ts`，确认新增测试锁定本轮 lifecycle controller 边界。
- 中间边界校验: 新 lifecycle controller 实现后，旧 `gatewayVisibilityPlatformController.test.ts` 仍要求 `GatewayView.vue` 直接调用 `gatewayPageLifecycleEventPlatform.addPageListeners` / `removePageListeners`；已更新为检查页面把平台 add/remove 函数注入 lifecycle controller，事件平台职责不变。
- `node --test frontend/tests/gatewayPageLifecycleController.test.ts`: 通过，4 个目标测试全部通过，最终耗时 `117.755201ms`。
- `node --test frontend/tests/gatewayPageLifecycleController.test.ts frontend/tests/gatewayVisibilityPlatformController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayAutoRefreshTimerController.test.ts`: 通过，64 个 lifecycle/visibility/runtime/timer 相邻测试全部通过，最终耗时 `224.213069ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，425 个网关相关测试全部通过，最终耗时 `2982.340951ms`。
- `node --test frontend/tests/*.test.ts`: 通过，485 个前端状态辅助测试全部通过，最终耗时 `3140.721296ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，3429 个模块完成转换，Vite 构建耗时 `1.04s`。仍有既有大 chunk 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayPageLifecycleController.ts` 和 `frontend/tests/gatewayPageLifecycleController.test.ts` 的 `git diff --no-index --check /dev/null <file>` 均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 248 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 249: 网关页面状态构造 controller 拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPageStateController.ts`、`frontend/tests/gatewayPageStateController.test.ts`，以及原先直接断言 `GatewayView.vue` 创建 state composable 的相邻网关 controller 测试。
- 改动: 新增 `useGatewayPageState`，把 `GatewayView.vue` 顶部的 runtime state、探测 state、弹窗/抽屉 state、用量范围 state、路由过滤 state、页面自有 refs、自动刷新 timer 引用和常量默认值下沉到 page state controller；`GatewayView.vue` 继续保留真实 API action、computed 展示模型、平台注入、生命周期和模板接线。
- 行为锁定: `loading`、`usageLoading`、`probeLoading`、`priorityRoutes`、`logs`、`routeLogs`、`usageRange`、`routeSearch`、`logSearch`、`routeLogSearch`、`balanceProbeManualDialog` 等别名仍指向原 controller 或 ref 实例；默认 `overview`、`routes`、`activeRequests`、`gatewayUsage`、`siteGroups`、`includeDisabled`、自动刷新 timer 和 20/180000/30000/1000 常量保持不变。
- 文件长度检查: `GatewayView.vue` 当前为 1006 行，`gatewayPageStateController.ts` 为 94 行，`gatewayPageStateController.test.ts` 为 71 行。相比任务 248 结束时，页面从 1018 行降至 1006 行，状态构造入口已从页面主体迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayPageStateController.test.ts` 首次失败于缺少 `frontend/src/gatewayPageStateController.ts`，确认新增测试锁定本轮 page state controller 边界。
- 中间边界校验: 新 state controller 实现后，相邻测试仍要求 `GatewayView.vue` 直接导入 `useGatewayRuntimeController`、`useGatewayRouteProbeState`、`useGatewayRouteBalanceProbeState`、`useGatewaySettingsDialog`、`useGatewayRouteFilters`、`useGatewayPriorityDialog`、`useGatewayRouteModelsDialog` 等旧 state composable；已更新为检查 `GatewayView.vue` 使用 `useGatewayPageState()`，业务 action 仍由原 controller 装配。
- `node --test frontend/tests/gatewayPageStateController.test.ts`: 通过，3 个目标测试全部通过，最终耗时 `5896.44718ms`。
- `node --test frontend/tests/gatewayPageStateController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayPageLifecycleController.test.ts frontend/tests/gatewayRouteProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts frontend/tests/gatewayRouteFilterController.test.ts frontend/tests/gatewayLogsController.test.ts frontend/tests/gatewayRouteLogsController.test.ts frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewaySettingsController.test.ts frontend/tests/gatewayRouteDiagnosisController.test.ts frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewayRouteConfigController.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，174 个相邻测试全部通过，最终耗时 `452.466958ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，428 个网关相关测试全部通过，最终耗时 `2030.155597ms`。
- `node --test frontend/tests/*.test.ts`: 通过，488 个前端状态辅助测试全部通过，最终耗时 `2346.014475ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，3430 个模块完成转换，Vite 构建耗时 `39.48s`。仍有既有大 chunk 警告和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayPageStateController.ts` 和 `frontend/tests/gatewayPageStateController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 249 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 250: 网关页面展示派生状态 controller 拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayDerivedStateController.ts`、`frontend/tests/gatewayDerivedStateController.test.ts`。
- 改动: 新增 `useGatewayDerivedState`，把 `GatewayView.vue` 中无副作用的总余额摘要、指标卡、路由池状态、路由池预览、策略卡、用量摘要、分组选项、路由/用量/日志列、活动流、路由过滤结果和日志过滤结果下沉到 derived state controller；页面继续注入现有纯函数、refs、filter state 和 settings form，真实 API action 与用户操作事件路径不变。
- 行为锁定: `routeTotalBalanceSummary`、`metricCards`、`routePoolStatusCards`、`routePoolPreviewRoutes`、`gatewayStrategyCards`、`usageColumns`、`usageSummaryCards`、`routeConcurrencyLimitLabel`、`groupOptions`、`routeColumns`、`logColumns`、`routeActivityFeed`、`filteredRoutes`、`filteredLogs`、`filteredRouteLogs` 的来源保持原有纯函数和当前 ref；新 controller 使用泛型保留注入函数真实返回类型，避免组件 props 类型被放宽。
- 文件长度检查: `GatewayView.vue` 当前为 1019 行，`gatewayDerivedStateController.ts` 为 158 行，`gatewayDerivedStateController.test.ts` 为 241 行。相比任务 249 结束时，页面从 1006 行增至 1019 行，原因是 derived state action factory 依赖注入列表较长；无副作用展示派生逻辑已从页面主体迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayDerivedStateController.test.ts` 首次失败于缺少 `frontend/src/gatewayDerivedStateController.ts`，确认新增测试锁定本轮 derived state controller 边界。
- 中间边界校验: 首次 `npm run build` 在正确 `frontend/` 目录下暴露新 controller 的返回类型使用 `unknown` 和本地近似类型会破坏组件 props 类型推导；已改为泛型透传注入函数真实返回类型。另有一次误在仓库根目录执行 `npm run build`，失败原因为根目录无 `package.json`，不作为构建结果。
- `node --test frontend/tests/gatewayDerivedStateController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `559.439283ms`。
- `node --test frontend/tests/gatewayDerivedStateController.test.ts frontend/tests/gatewayViewModel.test.ts frontend/tests/gatewayRouteManagementPageComponent.test.ts frontend/tests/gatewayMonitorPageComponent.test.ts frontend/tests/gatewayOverlayPageHostComponent.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayRouteFilterController.test.ts frontend/tests/gatewayLogsController.test.ts frontend/tests/gatewayRouteLogsController.test.ts`: 通过，77 个相邻测试全部通过，最终耗时 `277.953163ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，430 个网关相关测试全部通过，最终耗时 `1839.547261ms`。
- `node --test frontend/tests/*.test.ts`: 通过，490 个前端状态辅助测试全部通过，最终耗时 `1874.26844ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，3431 个模块完成转换，Vite 构建耗时 `35.89s`。仍有既有大 chunk 警告和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayDerivedStateController.ts` 和 `frontend/tests/gatewayDerivedStateController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 250 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 251: 网关访问页面装配 controller 拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAccessPageController.ts`、`frontend/tests/gatewayAccessPageController.test.ts`、`frontend/tests/gatewayAccessController.test.ts`、`frontend/tests/gatewayActivityController.test.ts`。
- 改动: 新增 `useGatewayAccessPageState`，把网关请求 URL、Codex Base URL、Codex tooltip、API Key mask、网关请求 URL 复制、API Key 复制和活动 URL 复制的页面级装配从 `GatewayView.vue` 下沉；页面只注入 `settingsForm`、`VITE_API_BASE` 读取函数、`window.location`、剪贴板写入函数和 `showPlanNotice`，真实低层复制行为仍复用既有 access/activity controller。
- 行为锁定: `gatewayRequestUrl` 仍通过 `createGatewayRequestUrlAction` 与 `buildGatewayRequestUrl` 计算，`codexGatewayTooltip` 仍基于 `buildCodexGatewayRequestUrl` 和 `buildCodexGatewayTooltip`，`maskedGatewayApiKey` 仍来自 `maskGatewayApiKey`，三类复制动作仍保留原成功、失败和空 API Key 提示语义。
- 文件长度检查: `GatewayView.vue` 当前为 1001 行，`gatewayAccessPageController.ts` 为 77 行，`gatewayAccessPageController.test.ts` 为 84 行。相比任务 250 结束时，页面从 1019 行降至 1001 行，访问入口和剪贴板平台装配已从页面主体迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayAccessPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayAccessPageController.ts`，确认新增测试锁定本轮 access page controller 边界。
- 中间边界校验: 首次目标测试实现后发现测试用普通局部变量模拟会变化的 `apiBase`，不会触发 Vue computed 重新求值；已改为 reactive 注入源。相邻 access/activity controller 测试最初仍要求 `GatewayView.vue` 直接导入低层 controller，已更新为检查 page controller 继续复用低层 controller，页面不再直接接触低层复制 action。首次构建还暴露 `codexGatewayRequestUrl` 被页面解构但未使用；已移除页面未使用解构并保留 controller 对 Codex URL 的独立派生。
- `node --test frontend/tests/gatewayAccessPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `164.798473ms`。
- `node --test frontend/tests/gatewayAccessPageController.test.ts frontend/tests/gatewayAccessController.test.ts frontend/tests/gatewayActivityController.test.ts`: 通过，17 个目标/相邻测试全部通过，最终耗时 `556.740612ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，432 个网关相关测试全部通过，最终耗时 `3024.950834ms`。
- `node --test frontend/tests/*.test.ts`: 通过，492 个前端状态辅助测试全部通过，最终耗时 `3147.948939ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，3432 个模块完成转换，Vite 构建耗时 `29.78s`。仍有既有大 chunk 警告和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayAccessPageController.ts` 和 `frontend/tests/gatewayAccessPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 251 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 252: 网关路由 mutation actions 页面装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteMutationActionsController.ts`、`frontend/tests/gatewayRouteMutationActionsController.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/tests/gatewayRouteProbeController.test.ts`、`frontend/tests/gatewayRouteBalanceProbeController.test.ts`、`frontend/tests/gatewayPriorityController.test.ts`。
- 改动: 新增 `useGatewayRouteMutationActions`，把活跃请求快照应用、路由探测结果应用、路由余额结果应用和优先级重排结果应用的页面级装配从 `GatewayView.vue` 下沉；页面只注入 `routes`、`priorityRoutes`、`overview` 和 `includeDisabled` refs，真实 merge 行为继续复用既有 route state model 和低层 controller action factory。
- 行为锁定: `applyActiveRequestSnapshot` 仍通过 `mergeActiveRequestSnapshot` 同步 `routes`、`priorityRoutes` 和 `overview.active_concurrency`；`applyProbeResult` 仍通过 `mergeGatewayProbeResult` 更新探测字段；`applyRouteBalanceResult` 仍通过 `mergeGatewayRouteBalanceResult` 更新余额字段；`applyReorderedRoutes` 仍通过 `createApplyGatewayPriorityReorderedRoutesAction` 和 `includeDisabled` 决定主列表是否包含禁用路由。
- 文件长度检查: `GatewayView.vue` 当前为 961 行，`gatewayRouteMutationActionsController.ts` 为 68 行，`gatewayRouteMutationActionsController.test.ts` 为 205 行。相比任务 251 结束时，页面从 1001 行降至 961 行，四类路由状态 mutation action 的页面级 get/set/merge 装配已迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayRouteMutationActionsController.test.ts` 首次失败于缺少 `frontend/src/gatewayRouteMutationActionsController.ts`，确认新增测试锁定本轮 route mutation actions controller 边界。
- 中间边界校验: 新 controller 实现后，相邻 runtime/probe/balance/priority controller 测试仍要求 `GatewayView.vue` 直接创建低层 apply action；已更新为检查低层 factory 和 merge 函数由 `gatewayRouteMutationActionsController.ts` 持有，页面仅使用 `useGatewayRouteMutationActions` 返回的 action 并继续传给既有运行时 controller。
- `node --test frontend/tests/gatewayRouteMutationActionsController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `8922.56589ms`。
- `node --test frontend/tests/gatewayRouteMutationActionsController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayRouteProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayPriorityController.test.ts`: 通过，105 个目标/相邻测试全部通过，最终耗时 `250.004286ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，434 个网关相关测试全部通过，最终耗时 `3039.020202ms`。
- `node --test frontend/tests/*.test.ts`: 通过，494 个前端状态辅助测试全部通过，最终耗时 `3265.408817ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，3433 个模块完成转换，Vite 构建耗时 `30.85s`。仍有既有大 chunk 警告和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayRouteMutationActionsController.ts` 和 `frontend/tests/gatewayRouteMutationActionsController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 252 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 253: 网关路由配置页面 action 装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteConfigPageController.ts`、`frontend/src/gatewayRouteConfigController.ts`、`frontend/tests/gatewayRouteConfigPageController.test.ts`、`frontend/tests/gatewayRouteConfigController.test.ts`。
- 改动: 新增 `useGatewayRouteConfigPageActions`，把路由类型选择、请求格式选择、路由模型弹窗打开和路由模型保存的页面级 action 装配从 `GatewayView.vue` 下沉；页面只注入 `routes`、`priorityRoutes`、弹窗 refs、真实 `updateGatewayRouteType` API action、标签函数和通知入口。
- 行为锁定: 路由类型和请求格式仍通过既有 `createGatewayRouteTypeChangeAction`、`createGatewayRouteTypeSelectAction`、`createGatewayRoutePathChangeAction`、`createGatewayRoutePathSelectAction` 执行校验、payload 构造、乐观更新和失败回滚；路由模型弹窗仍通过既有 `createOpenGatewayRouteModelsDialogAction` 和 `createSaveGatewayRouteModelsDialogAction` 处理 draft、保存 payload、saving 状态和成功关闭。
- 文件长度检查: `GatewayView.vue` 当前为 915 行，`gatewayRouteConfigPageController.ts` 为 108 行，`gatewayRouteConfigPageController.test.ts` 为 173 行，`gatewayRouteConfigController.ts` 为 295 行。相比任务 252 结束时，页面从 961 行降至 915 行，路由配置页面级 action 装配已迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayRouteConfigPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayRouteConfigPageController.ts`，确认新增测试锁定本轮 route config page controller 边界。
- 中间边界校验: 新 controller 实现后，相邻 route config controller 测试仍要求 `GatewayView.vue` 直接创建低层 route type/path/model dialog action；已更新为检查低层 factory 由 `gatewayRouteConfigPageController.ts` 持有，页面仅使用 `useGatewayRouteConfigPageActions` 并注入真实 API action、refs 和提示入口。
- `node --test frontend/tests/gatewayRouteConfigPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `278.797889ms`。
- `node --test frontend/tests/gatewayRouteConfigPageController.test.ts frontend/tests/gatewayRouteConfigController.test.ts`: 通过，17 个目标/相邻测试全部通过，最终耗时 `192.452075ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，436 个网关相关测试全部通过，最终耗时 `3997.045912ms`。
- `node --test frontend/tests/*.test.ts`: 通过，496 个前端状态辅助测试全部通过，最终耗时 `3986.164208ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，3434 个模块完成转换，Vite 构建耗时 `49.57s`。仍有既有大 chunk 警告和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayRouteConfigPageController.ts` 和 `frontend/tests/gatewayRouteConfigPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 253 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 254: 网关优先级页面 action 装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPriorityPageController.ts`、`frontend/src/gatewayPriorityController.ts`、`frontend/tests/gatewayPriorityPageController.test.ts`、`frontend/tests/gatewayPriorityController.test.ts`。
- 改动: 新增 `useGatewayPriorityPageActions`，把优先级弹窗打开、优先级移动和预设重排的页面级 action 装配从 `GatewayView.vue` 下沉；页面只注入 `routes`、`priorityRoute`、`priorityInsertIndex`、真实路由列表/重排 API、归一化函数、dialog 方法、重排结果应用 action 和通知入口。
- 行为锁定: 优先级列表加载仍通过既有 `createOpenGatewayPriorityDialogAction` 使用 `includeDisabled: true`、路由归一化、dialog loading 和当前行选择；优先级移动仍通过既有 `createMoveGatewayPriorityRouteAction` 构造 move payload、执行重排、应用结果和保留 validation notice；预设重排仍通过既有 `createPresetGatewayPriorityRoutesAction` 构造 package/balance payload、清理 insert index、重选当前路由并提示结果。
- 文件长度检查: `GatewayView.vue` 当前为 900 行，`gatewayPriorityPageController.ts` 为 96 行，`gatewayPriorityPageController.test.ts` 为 162 行，`gatewayPriorityController.ts` 为 284 行。相比任务 253 结束时，页面从 915 行降至 900 行，优先级页面级 action 装配已迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayPriorityPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayPriorityPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，确认新增测试锁定本轮 priority page controller 边界。
- 中间边界校验: 新 controller 实现后，相邻 priority controller 测试仍要求 `GatewayView.vue` 直接创建低层 open/move/preset action；已更新为检查低层 factory 由 `gatewayPriorityPageController.ts` 持有，页面仅使用 `useGatewayPriorityPageActions` 并注入真实 API action、refs、dialog 方法和提示入口。
- `node --test frontend/tests/gatewayPriorityPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `180.252693ms`。
- `node --test frontend/tests/gatewayPriorityController.test.ts`: 通过，20 个相邻测试全部通过，最终耗时 `188.075862ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，438 个网关相关测试全部通过，最终耗时 `1796.028882ms`。
- `node --test frontend/tests/*.test.ts`: 通过，498 个前端状态辅助测试全部通过，最终耗时 `1946.995821ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3435 个模块完成转换，Vite 构建耗时 `1.17s`。仍有既有大 chunk 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayPriorityPageController.ts` 和 `frontend/tests/gatewayPriorityPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 254 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 255: 网关路由操作页面 action 装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteActionPageController.ts`、`frontend/src/gatewayRouteActionController.ts`、`frontend/tests/gatewayRouteActionPageController.test.ts`、`frontend/tests/gatewayRouteActionController.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `useGatewayRouteActionPageActions`，把路由启停、禁用全部、仅启用当前路由、重置熔断和浏览器确认入口的页面级 action 装配从 `GatewayView.vue` 下沉；页面只注入 `window`、真实路由操作 API、`reloadGatewayDataAfterAction`、`loadRouteLabel` 和通知入口。
- 行为锁定: 路由启停仍通过既有 `createToggleGatewayRouteAction` 执行请求、通知和 reload；禁用全部仍通过既有 `createDisableAllGatewayRoutesAction` 使用原确认文案；仅启用当前路由仍通过既有 `createEnableOnlyGatewayRouteAction` 使用路由标签构造确认文案；重置熔断仍通过既有 `createResetGatewayRouteCircuitAction` 执行请求、通知和 reload。
- 文件长度检查: `GatewayView.vue` 当前为 879 行，`gatewayRouteActionPageController.ts` 为 98 行，`gatewayRouteActionPageController.test.ts` 为 147 行，`gatewayRouteActionController.ts` 为 114 行。相比任务 254 结束时，页面从 900 行降至 879 行，路由操作页面级 action 装配已迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayRouteActionPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayRouteActionPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，确认新增测试锁定本轮 route action page controller 边界。
- 中间边界校验: 新 controller 实现后，相邻 route action controller 测试仍要求 `GatewayView.vue` 直接创建低层 confirm/toggle/disable/enable/reset action；已更新为检查低层 factory 由 `gatewayRouteActionPageController.ts` 持有，页面仅使用 `useGatewayRouteActionPageActions` 并注入真实 API action、reload helper、window 和提示入口。
- 失败修正: 首次 `node --test frontend/tests/gateway*.test.ts` 与 `node --test frontend/tests/*.test.ts` 均失败于 `gatewayViewModel.test.ts` 仍按旧 `createToggleGatewayRouteAction` 切片查找页面 handler；根因是相邻源码契约未同步到 page controller 边界。已更新该测试为检查 `GatewayView.vue` 向 `useGatewayRouteActionPageActions` 注入 `reloadGatewayDataAfterAction`，并检查 page controller 内四个低层 route action factory 继续注入同一个 reload helper。
- `node --test frontend/tests/gatewayRouteActionPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `136.371499ms`。
- `node --test frontend/tests/gatewayRouteActionController.test.ts`: 通过，8 个相邻测试全部通过，最终耗时 `139.710209ms`。
- `node --test frontend/tests/gatewayViewModel.test.ts frontend/tests/gatewayRouteActionPageController.test.ts frontend/tests/gatewayRouteActionController.test.ts`: 通过，18 个失败回归/目标/相邻测试全部通过，最终耗时 `165.531536ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，440 个网关相关测试全部通过，最终耗时 `3376.959416ms`。
- `node --test frontend/tests/*.test.ts`: 通过，500 个前端状态辅助测试全部通过，最终耗时 `3502.372991ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3436 个模块完成转换，Vite 构建耗时 `1.07s`。仍有既有大 chunk 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayRouteActionPageController.ts` 和 `frontend/tests/gatewayRouteActionPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 255 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 256: 网关路由探测页面 action 装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteProbePageController.ts`、`frontend/tests/gatewayRouteProbePageController.test.ts`、`frontend/tests/gatewayRouteProbeController.test.ts`、`frontend/tests/gatewayRouteBalanceProbeController.test.ts`、`frontend/tests/gatewayRouteBalanceManualController.test.ts`、`frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts`。
- 改动: 新增 `useGatewayRouteProbePageActions`，把批量路由探测、全量余额更新、单路由探测、单路由余额探测、手动余额探测提交和 `probeRouteBalances` 运行时 helper 的页面级 action 装配从 `GatewayView.vue` 下沉；页面只注入真实探测 API、refs、探测 state、刷新摘要、概览变更通知和提示入口。
- 行为锁定: 批量路由探测继续委托 `createProbeAllGatewayRoutesAction`；单路由探测继续委托 `createProbeGatewayRouteAction`；全量余额更新继续委托 `createUpdateAllGatewayRouteBalancesAction`；单路由余额探测继续委托 `createProbeGatewayRouteBalanceAction`；手动余额提交继续委托 `createProbeManualGatewayRouteBalanceAction`；`handleRefresh` 和 `handleSync` 继续复用同一个静默余额探测 helper。
- 文件长度检查: `GatewayView.vue` 当前为 834 行，`gatewayRouteProbePageController.ts` 为 171 行，`gatewayRouteProbePageController.test.ts` 为 278 行，`gatewayRouteProbeController.ts` 为 290 行，`gatewayRouteBalanceProbeController.ts` 为 179 行，`gatewayRouteBalanceProbeFlowController.ts` 为 299 行，`gatewayRouteBalanceProbeRuntimeController.ts` 为 98 行。相比任务 255 结束时，页面从 879 行降至 834 行，路由探测和余额探测页面级 action 装配已迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayRouteProbePageController.test.ts` 首次失败于缺少 `frontend/src/gatewayRouteProbePageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，确认新增测试锁定本轮 probe page controller 边界。
- 中间边界校验: 新 controller 实现后，相邻 route probe、balance runtime、balance manual 和 balance probe controller 测试仍要求 `GatewayView.vue` 直接创建低层探测/余额 action；已更新为检查低层 factory 由 `gatewayRouteProbePageController.ts` 持有，页面仅使用 `useGatewayRouteProbePageActions` 并注入真实 API action、refs、state 和提示入口。
- 失败修正: 首次目标测试期望把批量路由探测完成记录为 `showNotice` 且期望余额格式为 `$12.50`；实际既有行为为 `showPlanNotice` 和 `formatBalance` 输出 `$12.5`，已按现有模型口径修正测试。首次 `npm run build` 失败于 `probeRouteBalances` 在 `handleRefresh`/`handleSync` 装配前使用，以及页面注入 `applyBalanceResult` 时未显式别名到 `applyRouteBalanceResult`；已将 probe page actions 提前到 `refreshRouteSummaries` 后，并改为 `applyBalanceResult: applyRouteBalanceResult`。
- `node --test frontend/tests/gatewayRouteProbePageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `235.274947ms`。
- `node --test frontend/tests/gatewayRouteProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts`: 通过，19 个相邻测试全部通过，最终耗时 `196.93347ms`。
- `node --test frontend/tests/gatewayRouteBalanceManualController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayRouteProbePageController.test.ts`: 通过，21 个相邻/目标测试全部通过，最终耗时 `316.661125ms`。
- `node --test frontend/tests/gatewayRouteProbePageController.test.ts frontend/tests/gatewayRouteProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRouteBalanceManualController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts`: 通过，40 个目标/相邻/失败回归测试全部通过，最终耗时 `326.717713ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，442 个网关相关测试全部通过，最终耗时 `5179.404126ms`。
- `node --test frontend/tests/*.test.ts`: 通过，502 个前端状态辅助测试全部通过，最终耗时 `5407.071485ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3437 个模块完成转换，Vite 构建耗时 `1m 13s`。仍有既有大 chunk 和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayRouteProbePageController.ts` 和 `frontend/tests/gatewayRouteProbePageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 本任务结束时尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 257: 网关路由检查页面 action 装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteInspectionPageController.ts`、`frontend/tests/gatewayRouteInspectionPageController.test.ts`、`frontend/tests/gatewayRouteDiagnosisController.test.ts`、`frontend/tests/gatewayRouteLogsController.test.ts`。
- 改动: 新增 `useGatewayRouteInspectionPageActions`，把路由诊断抽屉打开、诊断加载、路由日志抽屉打开和日志加载的页面级 action 装配从 `GatewayView.vue` 下沉；页面只注入真实诊断 API、日志 API、抽屉 state 方法和提示入口。
- 行为锁定: 路由诊断继续委托 `createOpenGatewayRouteDiagnosisAction`；路由日志继续委托 `createOpenGatewayRouteLogsAction`；路由日志请求仍使用既有 `limit: 120`；诊断和日志的 loading、set、clear、notice 行为来源不变。
- 文件长度检查: `GatewayView.vue` 当前为 832 行，`gatewayRouteInspectionPageController.ts` 为 57 行，`gatewayRouteInspectionPageController.test.ts` 为 169 行，`gatewayRouteDiagnosisController.test.ts` 为 208 行，`gatewayRouteLogsController.test.ts` 为 235 行，`gatewayRouteDiagnosisController.ts` 为 73 行，`gatewayRouteLogsController.ts` 为 88 行。相比任务 256 结束时，页面从 834 行降至 832 行，路由诊断和路由日志页面级 action 装配已迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayRouteInspectionPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayRouteInspectionPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，确认新增测试锁定本轮 route inspection page controller 边界。
- 中间边界校验: 新 controller 实现后，相邻 diagnosis/logs controller 测试仍要求 `GatewayView.vue` 直接创建低层诊断和日志 action；已更新为检查低层 factory 由 `gatewayRouteInspectionPageController.ts` 持有，页面仅使用 `useGatewayRouteInspectionPageActions` 并注入真实 API action、drawer 方法和提示入口。
- `node --test frontend/tests/gatewayRouteInspectionPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `192.639506ms`。
- `node --test frontend/tests/gatewayRouteDiagnosisController.test.ts frontend/tests/gatewayRouteLogsController.test.ts`: 通过，12 个相邻测试全部通过，最终耗时 `202.907475ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，444 个网关相关测试全部通过，最终耗时 `4562.087279ms`。
- `node --test frontend/tests/*.test.ts`: 通过，504 个前端状态辅助测试全部通过，最终耗时 `4565.597931ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3438 个模块完成转换，Vite 构建耗时 `41.15s`。仍有既有大 chunk 和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayRouteInspectionPageController.ts` 和 `frontend/tests/gatewayRouteInspectionPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 本任务结束时尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 258: 网关用量页面 action 装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayUsagePageController.ts`、`frontend/tests/gatewayUsagePageController.test.ts`、`frontend/tests/gatewayUsageRangeController.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 新增 `useGatewayUsagePageActions`，把用量 runtime 加载、普通用量查询和今日快捷查询的页面级 action 装配从 `GatewayView.vue` 下沉；页面只注入真实用量 API、usage ref、monitor 状态、请求范围、mounted 状态、abort slot、loading setter 和通知入口。
- 行为锁定: 用量加载继续委托 `createLoadGatewayUsageRuntimeAction`；普通查询继续委托 `createLoadGatewayUsageAction`；今日查询继续委托 `createLoadGatewayUsageTodayAction`；无效时间范围、加载错误、abort、非 monitor 清空 usage 和 loading 复位仍由既有 runtime/range controller 口径处理。
- 文件长度检查: `GatewayView.vue` 当前为 822 行，`gatewayUsagePageController.ts` 为 93 行，`gatewayUsagePageController.test.ts` 为 126 行，`gatewayUsageRangeController.test.ts` 为 124 行，`gatewayRuntimeController.test.ts` 为 2310 行，`gatewayRuntimeLoadController.ts` 为 287 行，`gatewayUsageRangeController.ts` 为 70 行。相比任务 257 结束时，页面从 832 行降至 822 行，用量页面级 action 装配已迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayUsagePageController.test.ts` 首次失败于缺少 `frontend/src/gatewayUsagePageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，确认新增测试锁定本轮 usage page controller 边界。
- 中间边界校验: 新 controller 实现后，相邻 usage range/runtime controller 测试仍要求 `GatewayView.vue` 直接创建低层 usage runtime/range action；已更新为检查低层 factory 由 `gatewayUsagePageController.ts` 持有，页面仅使用 `useGatewayUsagePageActions` 并注入真实 API、refs、state、slot 和提示入口。
- 构建修正: 首次 `npm run build` 失败于 `src/views/GatewayView.vue(388,3): error TS6133: 'loadGatewayUsage' is declared but its value is never read.`；页面实际只需要模板事件使用的 `handleUsageQuery` 和 `handleUsageToday`，已移除未使用解构并同步收紧目标测试。
- `node --test frontend/tests/gatewayUsagePageController.test.ts`: 通过，2 个目标测试全部通过；首次实现后耗时 `19217.894625ms`，修正构建问题后通过目标/相邻组合回归。
- `node --test frontend/tests/gatewayUsagePageController.test.ts frontend/tests/gatewayUsageRangeController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsagePanelComponent.test.ts`: 通过，62 个目标/相邻测试全部通过，最终耗时 `544.020674ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，446 个网关相关测试全部通过，最终耗时 `2744.260365ms`。
- `node --test frontend/tests/*.test.ts`: 通过，506 个前端状态辅助测试全部通过，最终耗时 `2495.976617ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3439 个模块完成转换，Vite 构建耗时 `39.95s`。仍有既有大 chunk 和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayUsagePageController.ts` 和 `frontend/tests/gatewayUsagePageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 本任务结束时尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 259: 网关上游与同步页面 action 装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayUpstreamPageController.ts`、`frontend/tests/gatewayUpstreamPageController.test.ts`、`frontend/tests/gatewayAddUpstreamController.test.ts`、`frontend/tests/gatewaySyncController.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `useGatewayUpstreamPageActions`，把同步网关路由和新增上游提交的页面级 action 装配从 `GatewayView.vue` 下沉；页面只注入 routes、add upstream 表单、分组 refs、真实同步 API、创建站点 API、重载 helper、余额探测 helper、loading setter 和通知入口。
- 行为锁定: 网关同步继续委托 `createSyncGatewayRoutesWithBalancesAction`；新增上游提交继续委托 `createSubmitGatewayAddUpstreamAction`；新增上游成功后仍先调用 `handleSync` 再调用 `reloadGatewayDataAfterAction`，保持既有双重刷新顺序；同步成功后仍静默探测当前 routes 的余额。
- 文件长度检查: `GatewayView.vue` 当前为 818 行，`gatewayUpstreamPageController.ts` 为 73 行，`gatewayUpstreamPageController.test.ts` 为 152 行，`gatewayAddUpstreamController.test.ts` 为 321 行，`gatewaySyncController.test.ts` 为 212 行，`gatewayViewModel.test.ts` 为 359 行，`gatewayAddUpstreamController.ts` 为 116 行，`gatewaySyncController.ts` 为 74 行。相比任务 258 结束时，页面从 822 行降至 818 行，同步和新增上游页面级 action 装配已迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayUpstreamPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayUpstreamPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，确认新增测试锁定本轮 upstream page controller 边界。
- 中间边界校验: 新 controller 实现后，相邻 add-upstream/sync controller 测试仍要求 `GatewayView.vue` 直接创建低层新增上游和同步 action；已更新为检查低层 factory 由 `gatewayUpstreamPageController.ts` 持有，页面仅使用 `useGatewayUpstreamPageActions` 并注入真实 API、refs、loading、reload、余额探测和提示入口。
- 失败修正: 首次网关全量失败于 `gatewayViewModel.test.ts` 仍按旧 `submitAddUpstream` 页面 handler 查找 reload 注入；已更新为检查页面向 `useGatewayUpstreamPageActions` 注入 `reloadGatewayDataAfterAction`，并检查 upstream page controller 内 sync 和 add-upstream factory 均继续注入 reload helper。
- `node --test frontend/tests/gatewayUpstreamPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `173.671914ms`。
- `node --test frontend/tests/gatewayUpstreamPageController.test.ts frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewaySyncController.test.ts`: 通过，15 个目标/相邻测试全部通过，最终耗时 `303.499882ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，448 个网关相关测试全部通过，最终耗时 `3951.352767ms`。
- `node --test frontend/tests/*.test.ts`: 通过，508 个前端状态辅助测试全部通过，最终耗时 `4085.496297ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3440 个模块完成转换，Vite 构建耗时 `36.54s`。仍有既有大 chunk 和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayUpstreamPageController.ts` 和 `frontend/tests/gatewayUpstreamPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 259 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 260: 网关设置保存页面 action 装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewaySettingsPageController.ts`、`frontend/tests/gatewaySettingsPageController.test.ts`、`frontend/tests/gatewaySettingsController.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `useGatewaySettingsPageActions`，把设置保存的页面级 action 装配从 `GatewayView.vue` 下沉；页面只注入 settings form、真实保存 API、settings dialog 方法、动作后重载 helper 和通知入口。
- 行为锁定: 设置保存继续委托 `createSaveGatewaySettingsAction`；成功路径仍按保存请求、写回 settings、关闭弹窗、成功提示、动作后重载、loading 复位的顺序执行；保存失败仍保持弹窗打开并显式提示错误；reload helper 继续由 `createReloadGatewayDataAfterAction` 注入。
- 文件长度检查: `GatewayView.vue` 当前为 818 行，`gatewaySettingsPageController.ts` 为 43 行，`gatewaySettingsPageController.test.ts` 为 87 行，`gatewaySettingsController.test.ts` 为 259 行，`gatewayViewModel.test.ts` 为 358 行，`gatewaySettingsController.ts` 为 94 行。相比任务 259 结束时，页面行数保持 818 行，但设置保存页面级 action 装配已迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewaySettingsPageController.test.ts` 首次失败于缺少 `frontend/src/gatewaySettingsPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，最终耗时 `108.03411ms`，确认新增测试锁定本轮 settings page controller 边界。
- 中间边界校验: 新 controller 实现后，相邻 settings controller 测试仍要求 `GatewayView.vue` 直接创建低层设置保存 action；已更新为检查低层 factory 由 `gatewaySettingsPageController.ts` 持有，页面仅使用 `useGatewaySettingsPageActions` 并注入真实 API、dialog 方法、reload helper 和提示入口。
- 失败修正: 首次网关全量失败于 `gatewayViewModel.test.ts` 仍按旧 `createSaveGatewaySettingsAction` 页面 handler 查找 reload 注入，报错为 `AssertionError [ERR_ASSERTION]: saveSettings handler should exist`；已更新为检查页面向 `useGatewaySettingsPageActions` 注入 `reloadGatewayDataAfterAction`，并检查 settings page controller 内低层 settings factory 继续注入 reload helper。
- `node --test frontend/tests/gatewayViewModel.test.ts frontend/tests/gatewaySettingsPageController.test.ts frontend/tests/gatewaySettingsController.test.ts`: 通过，18 个目标/相邻测试全部通过，最终耗时 `314.941451ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，450 个网关相关测试全部通过，最终耗时 `1941.920852ms`。
- `node --test frontend/tests/*.test.ts`: 通过，510 个前端状态辅助测试全部通过，最终耗时 `2428.372988ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3441 个模块完成转换，Vite 构建耗时 `34.87s`。仍有既有大 chunk 和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewaySettingsPageController.ts` 和 `frontend/tests/gatewaySettingsPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 260 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 261: 网关刷新页面 action 装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRefreshPageController.ts`、`frontend/tests/gatewayRefreshPageController.test.ts`、`frontend/tests/gatewayRouteSummaryController.test.ts`、`frontend/tests/gatewayManualRefreshController.test.ts`。
- 改动: 新增 `useGatewayRouteSummaryPageActions` 和 `useGatewayManualRefreshPageActions`，把路由摘要刷新、路由摘要防抖调度和手动刷新页面级 action 装配从 `GatewayView.vue` 下沉；页面只注入 routes、真实摘要 API、真实 `loadData`、余额探测 helper、摘要刷新 action 和通知入口。
- 行为锁定: 路由摘要刷新继续委托 `createRefreshGatewayRouteSummariesAction`，手动刷新继续委托 `createRefreshGatewayManuallyAction`；手动刷新仍按 `loadData`、静默余额探测、刷新摘要的顺序执行；摘要刷新仍通过 `useDebouncedTask` 创建 `scheduleRouteSummaryRefresh`，页面生命周期只消费调度函数。
- 文件长度检查: `GatewayView.vue` 当前为 820 行，`gatewayRefreshPageController.ts` 为 67 行，`gatewayRefreshPageController.test.ts` 为 164 行，`gatewayRouteSummaryController.test.ts` 为 202 行，`gatewayManualRefreshController.test.ts` 为 182 行，`gatewayRouteSummaryController.ts` 为 49 行，`gatewayManualRefreshController.ts` 为 42 行。相比任务 260 结束时，页面因多行导入/解构从 818 行变为 820 行，但刷新页面级 action 装配已迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayRefreshPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayRefreshPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，失败文件耗时 `96.624043ms`，整体耗时 `103.628121ms`，确认新增测试锁定本轮 refresh page controller 边界。
- 中间边界校验: 新 controller 实现后，相邻 route summary/manual refresh controller 测试仍要求 `GatewayView.vue` 直接创建低层 summary/manual refresh action；已更新为检查低层 factory 由 `gatewayRefreshPageController.ts` 持有，页面仅使用 `useGatewayRouteSummaryPageActions` 和 `useGatewayManualRefreshPageActions` 注入真实 API、routes、helper 和通知入口。
- 测试噪声修正: 直接在 node 测试里调用 `useGatewayRouteSummaryPageActions` 时，默认 `useDebouncedTask` 会触发 Vue setup 外 lifecycle warning；已为 page controller 增加可注入 `createScheduledTask`，页面默认仍使用真实 `useDebouncedTask`，测试注入同步调度器以避免噪声。
- 构建修正: 首次 `npm run build` 失败于 `gatewayRefreshPageController.ts` 将 `types.ts` 的单路由 `BalanceProbeResult` 当作批量余额探测计数使用；已将手动刷新依赖类型收紧为 `Promise<{ success: number }>`，匹配 `createRefreshGatewayManuallyAction` 的实际需求和既有批量 helper 返回值。
- `node --test frontend/tests/gatewayRefreshPageController.test.ts frontend/tests/gatewayRouteSummaryController.test.ts frontend/tests/gatewayManualRefreshController.test.ts`: 通过，13 个目标/相邻测试全部通过，最终耗时 `200.237886ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，453 个网关相关测试全部通过，最终耗时 `3887.256696ms`。
- `node --test frontend/tests/*.test.ts`: 通过，513 个前端状态辅助测试全部通过，最终耗时 `3978.131892ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3442 个模块完成转换，Vite 构建耗时 `1.03s`。仍有既有大 chunk 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayRefreshPageController.ts` 和 `frontend/tests/gatewayRefreshPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 261 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 262: 网关实时刷新页面 action 装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRealtimePageController.ts`、`frontend/tests/gatewayRealtimePageController.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/tests/gatewayVisibilityPlatformController.test.ts`。
- 改动: 新增 `useGatewayRealtimePageActions`，把活动请求加载、活动请求刷新、实时刷新和可见性刷新处理的页面级 action 装配从 `GatewayView.vue` 下沉；页面只注入 active request、overview、routes、priorityRoutes、logs、drawer/dialog refs、真实网关 runtime action、controller slots、API 请求函数、归一化函数、可见性平台和通知入口。
- 行为锁定: 活动请求加载继续委托 `createLoadGatewayActiveRequestsRuntimeAction` 和 `gatewayRuntime.loadActiveRequests`；活动请求刷新继续委托 `createRefreshGatewayActiveRequestsRuntimeAction`；实时刷新继续委托 `createRefreshGatewayRealtimeDataRuntimeAction` 和 `gatewayRuntime.refreshRealtimeData`；可见性变化继续委托 `createHandleGatewayVisibilityChangeAction` 和 `gatewayRuntime.handleVisibilityRefresh`。`applyActiveRequestSnapshot`、日志抽屉写入、路由/优先级列表写入、自动刷新 throttle、abort slot 和可见性状态读取来源保持不变。
- 文件长度检查: `GatewayView.vue` 当前为 789 行，`gatewayRealtimePageController.ts` 为 201 行，`gatewayRealtimePageController.test.ts` 为 193 行，`gatewayRuntimeController.test.ts` 为 2328 行，`gatewayVisibilityPlatformController.test.ts` 为 113 行。相比任务 261 结束时，页面从 820 行降至 789 行，实时刷新和可见性刷新页面级 action 装配已迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayRealtimePageController.test.ts` 首次失败于缺少 `frontend/src/gatewayRealtimePageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，失败文件耗时 `230.152073ms`，整体耗时 `248.199267ms`，确认新增测试锁定本轮 realtime page controller 边界。
- 中间边界校验: 新 controller 实现后，相邻 runtime/visibility controller 测试仍要求 `GatewayView.vue` 直接创建低层活动请求、实时刷新和可见性 action；已更新为检查低层 factory 由 `gatewayRealtimePageController.ts` 持有，页面仅使用 `useGatewayRealtimePageActions` 并注入真实 runtime action、refs、slots、平台读取和提示入口。
- 测试修正: 首次目标测试低估了 `handleVisibilityRefresh` 中 fire-and-forget 的两个异步刷新分支；已在测试中等待异步刷新落地，并显式锁定可见后实时刷新和活动请求静默刷新都会执行。
- 构建修正: 首次 `npm run build` 失败于 `GatewayView.vue` 解构 `loadActiveRequests` 后未直接使用；页面实际只需要模板和 timer 使用的 `refreshActiveRequests`、`refreshRealtimeData`、`handleVisibilityChange`，已移除未使用解构，controller 内仍保留 `loadActiveRequests` 供刷新 action 间接调用。
- `node --test frontend/tests/gatewayRealtimePageController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayVisibilityPlatformController.test.ts frontend/tests/gatewayAutoRefreshTimerController.test.ts frontend/tests/gatewayPageLifecycleController.test.ts`: 通过，66 个目标/相邻测试全部通过，最终耗时 `289.848736ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，455 个网关相关测试全部通过，最终耗时 `2279.14695ms`。
- `node --test frontend/tests/*.test.ts`: 通过，515 个前端状态辅助测试全部通过，最终耗时 `2281.184061ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3443 个模块完成转换，Vite 构建耗时 `33.34s`。仍有既有大 chunk 和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayRealtimePageController.ts` 和 `frontend/tests/gatewayRealtimePageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 262 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 263: 网关初始数据页面 action 装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayInitialDataPageController.ts`、`frontend/tests/gatewayInitialDataPageController.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `useGatewayInitialDataPageActions`，把初始数据加载和动作后重载的页面级 action 装配从 `GatewayView.vue` 下沉；页面只注入 overview、routes、priorityRoutes、logs、activeRequests、gatewayUsage、siteGroups、includeDisabled、settings/logs drawer、`gatewayRuntime.loadData`、`loadDataControllerSlot`、真实请求函数、`normalizeGatewayRoute`、`applyActiveRequestSnapshot`、提示入口和 abort 判断。
- 行为锁定: 初始加载继续委托 `createLoadGatewayInitialDataRuntimeAction` 和 `gatewayRuntime.loadData`；动作后重载继续委托 `createReloadGatewayDataAfterAction`；settings、logs、siteGroups、usage、routes、priorityRoutes、activeRequests 的 setter 行为不变；`applyActiveRequestSnapshot`、请求区间读取、monitor 状态读取、`includeDisabled` 读取和 mounted 状态读取来源不变。
- 文件长度检查: `GatewayView.vue` 当前为 775 行，`gatewayInitialDataPageController.ts` 为 189 行，`gatewayInitialDataPageController.test.ts` 为 157 行，`gatewayRuntimeController.test.ts` 为 2337 行，`gatewayViewModel.test.ts` 为 362 行。相比任务 262 结束时，页面从 789 行降至 775 行，初始数据加载和动作后重载页面级 action 装配已迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayInitialDataPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayInitialDataPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，失败文件耗时 `105.040339ms`，整体耗时 `113.605347ms`，确认新增测试锁定本轮 initial data page controller 边界。
- 中间边界校验: 新 controller 实现后，相邻 runtime/view model 测试仍要求 `GatewayView.vue` 直接创建低层初始数据加载和动作后重载 action；已更新为检查低层 factory 由 `gatewayInitialDataPageController.ts` 持有，页面仅使用 `useGatewayInitialDataPageActions` 并注入真实 API、refs、runtime load、drawer 方法和提示入口。
- 构建修正: 首次 `npm run build` 失败于 `gatewayInitialDataPageController.ts` 使用不存在的 `GatewaySettings`、错误的站点分组类型以及过宽的错误提示计划类型；第二次失败于 `GatewayRouteGroup` 与真实 `SiteGroup` 不匹配。已改为 `GatewaySettingsData`、`SiteGroup`，并用 `Extract<ReturnType<typeof buildGatewayInitialDataLoadErrorPlan>, { showError: true }>` 锁定可显示错误计划。
- `node --test frontend/tests/gatewayInitialDataPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `168.868376ms`。
- `node --test frontend/tests/gatewayInitialDataPageController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayViewModel.test.ts frontend/tests/gatewayUsagePageController.test.ts frontend/tests/gatewayUpstreamPageController.test.ts frontend/tests/gatewayRouteActionPageController.test.ts frontend/tests/gatewaySettingsPageController.test.ts`: 通过，68 个目标/相邻测试全部通过，最终耗时 `449.510086ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，457 个网关相关测试全部通过，最终耗时 `3063.681542ms`。
- `node --test frontend/tests/*.test.ts`: 通过，517 个前端状态辅助测试全部通过，最终耗时 `3619.160308ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3444 个模块完成转换，Vite 构建耗时 `1m 55s`。仍有既有大 chunk 和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayInitialDataPageController.ts` 和 `frontend/tests/gatewayInitialDataPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 263 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 264: 网关自动刷新 timer 页面 action 装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAutoRefreshPageController.ts`、`frontend/tests/gatewayAutoRefreshPageController.test.ts`、`frontend/tests/gatewayAutoRefreshTimerController.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/tests/gatewayVisibilityPlatformController.test.ts`。
- 改动: 新增 `useGatewayAutoRefreshPageActions`，把自动刷新 timer platform、start action 和 stop action 的页面级装配从 `GatewayView.vue` 下沉；页面只注入 `window`、auto refresh timers、monitor 状态、路由/监控/活动请求刷新间隔、auto/active controller slots、`refreshRealtimeData` 和 `refreshActiveRequests`。
- 行为锁定: timer platform 继续委托 `createGatewayAutoRefreshTimerPlatform`；启动逻辑继续委托 `createStartGatewayAutoRefreshTimersAction` 和 `startGatewayAutoRefreshTimers`；停止逻辑继续委托 `createStopGatewayAutoRefreshTimersAction` 和 `stopGatewayAutoRefreshTimers`；monitor 状态读取、timer 间隔、slot abort/clear 顺序、realtime refresh 和 active requests refresh 行为不变。
- 文件长度检查: `GatewayView.vue` 当前为 759 行，`gatewayAutoRefreshPageController.ts` 为 77 行，`gatewayAutoRefreshPageController.test.ts` 为 109 行，`gatewayAutoRefreshTimerController.test.ts` 为 273 行，`gatewayRuntimeController.test.ts` 为 2337 行，`gatewayVisibilityPlatformController.test.ts` 为 113 行。相比任务 263 结束时，页面从 775 行降至 759 行，自动刷新 timer 页面级 action 装配已迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewayAutoRefreshPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayAutoRefreshPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，失败文件耗时 `210.773768ms`，整体耗时 `221.006853ms`，确认新增测试锁定本轮 auto refresh page controller 边界。
- 中间边界校验: 新 controller 实现后，相邻 auto refresh timer/visibility/runtime 测试仍按旧结构从 `GatewayView.vue` 读取低层 timer factory 装配；已更新为检查低层 factory 由 `gatewayAutoRefreshPageController.ts` 持有，页面仅使用 `useGatewayAutoRefreshPageActions` 并注入 timer window、timers、slots、间隔和刷新 action。
- 测试修正: 首次目标测试的页面委托断言要求单行 import，实际实现为单符号多行 import；已按项目风格收敛为单行 import 后目标测试通过。
- `node --test frontend/tests/gatewayAutoRefreshPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `389.403169ms`。
- `node --test frontend/tests/gatewayAutoRefreshPageController.test.ts frontend/tests/gatewayAutoRefreshTimerController.test.ts frontend/tests/gatewayVisibilityPlatformController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayPageLifecycleController.test.ts`: 通过，66 个目标/相邻测试全部通过，最终耗时 `5425.806472ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，459 个网关相关测试全部通过，最终耗时 `4490.7387ms`。
- `node --test frontend/tests/*.test.ts`: 通过，519 个前端状态辅助测试全部通过，最终耗时 `4239.599129ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3445 个模块完成转换，Vite 构建耗时 `1m 13s`。仍有既有大 chunk 和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayAutoRefreshPageController.ts` 和 `frontend/tests/gatewayAutoRefreshPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 264 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 265: 网关站点分组页面 action 装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewaySiteGroupsPageController.ts`、`frontend/tests/gatewaySiteGroupsPageController.test.ts`、`frontend/tests/gatewaySiteGroupsController.test.ts`。
- 改动: 新增 `useGatewaySiteGroupsPageActions`，把站点分组刷新 action 的页面级 ref 写回装配从 `GatewayView.vue` 下沉；页面只注入 `siteGroups` ref 和真实 `getSiteGroups` 请求函数，低层请求与失败保持旧选项行为继续委托 `createRefreshGatewaySiteGroupsAction`。
- 行为锁定: `site-groups:changed` 事件处理器名称和绑定位置不变；分组刷新仍调用真实 `getSiteGroups`；刷新成功仍替换 `siteGroups.value`；刷新失败仍由 `refreshGatewaySiteGroups` 保持现有选项且不打扰用户；新增上游分组选项、全局 header 分组入口、站点页分组逻辑、手动刷新、自动刷新、路由同步和 toast 规则均未改动。
- 文件长度检查: `GatewayView.vue` 当前为 757 行，`gatewaySiteGroupsPageController.ts` 为 25 行，`gatewaySiteGroupsPageController.test.ts` 为 61 行，`gatewaySiteGroupsController.test.ts` 为 116 行。相比任务 264 结束时，页面从 759 行降至 757 行，站点分组页面级 action 装配已迁出并可独立测试。
- TDD 红灯: `node --test frontend/tests/gatewaySiteGroupsPageController.test.ts` 首次失败于缺少 `frontend/src/gatewaySiteGroupsPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，失败文件耗时 `271.744253ms`，整体耗时 `304.786265ms`，确认新增测试锁定本轮 site groups page controller 边界。
- 中间边界校验: 新 controller 实现后，相邻 site groups controller 测试仍按旧结构要求 `GatewayView.vue` 直接创建低层 `createRefreshGatewaySiteGroupsAction`；已更新为检查低层 factory 由 `gatewaySiteGroupsPageController.ts` 持有，页面仅使用 `useGatewaySiteGroupsPageActions` 并注入 `siteGroups` 与 `getSiteGroups`。
- `node --test frontend/tests/gatewaySiteGroupsPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `731.672688ms`。
- `node --test frontend/tests/gatewaySiteGroupsPageController.test.ts frontend/tests/gatewaySiteGroupsController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayPageLifecycleController.test.ts frontend/tests/gatewayVisibilityPlatformController.test.ts`: 通过，64 个目标/相邻测试全部通过，最终耗时 `395.785807ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，461 个网关相关测试全部通过，最终耗时 `3893.02027ms`。
- `node --test frontend/tests/*.test.ts`: 通过，521 个前端状态辅助测试全部通过，最终耗时 `4055.391361ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3446 个模块完成转换，Vite 构建耗时 `45.35s`。仍有既有大 chunk 和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewaySiteGroupsPageController.ts` 和 `frontend/tests/gatewaySiteGroupsPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 265 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 266: 网关监控页 bindings 页面装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayMonitorPageController.ts`、`frontend/tests/gatewayMonitorPageController.test.ts`、`frontend/tests/gatewayMonitorPageComponent.test.ts`。
- 改动: 新增 `useGatewayMonitorPageBindings`，把 `GatewayMonitorPage` 的 page-level props/events 映射从 `GatewayView.vue` 模板下沉到 monitor page controller；页面只保留 `v-bind="monitorPageProps"` 和 `v-on="monitorPageHandlers"`，并继续注入现有 refs、格式化函数、刷新/复制/设置/日志/用量 action。
- 行为锁定: 监控页仍使用同一个 `GatewayMonitorPage` 组件；网关请求地址、Codex tooltip、API Key mask、指标卡、用量范围、用量表格、活动流、路由池状态、策略卡片、复制、刷新、设置、最近请求、今日用量、用量查询和活动 URL 复制的来源不变；本任务未改变真实 API 请求、runtime controller、drawer/dialog state、用量 range state、toast 规则或监控页组件展示契约。
- 文件长度检查: `GatewayView.vue` 当前为 764 行，`gatewayMonitorPageController.ts` 为 163 行，`gatewayMonitorPageController.test.ts` 为 155 行，`gatewayMonitorPageComponent.test.ts` 为 59 行。相比任务 265 结束时，页面从 757 行增至 764 行；本任务是接线职责下沉而非行数压缩，新增 controller 调用注入列表抵消了模板绑定删除。
- TDD 红灯: `node --test frontend/tests/gatewayMonitorPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayMonitorPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，失败文件耗时 `976.889408ms`，整体耗时 `985.488614ms`，确认新增测试锁定本轮 monitor page bindings 边界。
- 中间边界校验: 新 controller 实现后，相邻 monitor page component 测试仍按旧结构要求 `GatewayView.vue` 直接传递 `:metric-cards`、`@refresh`、`@open-logs` 等 props/events；已更新为检查页面通过 `v-bind`/`v-on` 接入 monitor page controller，并确认 controller 内继续持有原 props/events 映射。
- `node --test frontend/tests/gatewayMonitorPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `7905.28363ms`。
- `node --test frontend/tests/gatewayMonitorPageController.test.ts frontend/tests/gatewayMonitorPageComponent.test.ts frontend/tests/gatewayMonitorDashboardComponent.test.ts frontend/tests/gatewayMonitorToolbarComponent.test.ts frontend/tests/gatewayAccessBarComponent.test.ts frontend/tests/gatewayDerivedStateController.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，20 个目标/相邻测试全部通过，最终耗时 `283.886331ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，463 个网关相关测试全部通过，最终耗时 `2317.334709ms`。
- `node --test frontend/tests/*.test.ts`: 通过，523 个前端状态辅助测试全部通过，最终耗时 `3496.563815ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3447 个模块完成转换，Vite 构建耗时 `33.27s`。仍有既有大 chunk 和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayMonitorPageController.ts` 和 `frontend/tests/gatewayMonitorPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 266 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 267: 路由管理页 bindings 页面装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteManagementPageController.ts`、`frontend/tests/gatewayRouteManagementPageController.test.ts`、`frontend/tests/gatewayRouteManagementPageComponent.test.ts`。
- 改动: 新增 `useGatewayRouteManagementPageBindings`，把 `GatewayRouteManagementPage` 的 page-level props、v-model update handlers 和事件映射从 `GatewayView.vue` 模板下沉到 route management page controller；页面只保留 `v-bind="routeManagementPageProps"` 和 `v-on="routeManagementPageHandlers"`，继续注入现有 refs、派生状态、表格 helper、复制、刷新、同步、探测、筛选、配置、优先级、诊断和日志 action。
- 行为锁定: 路由管理页仍使用同一个 `GatewayRouteManagementPage` 组件；路由搜索、分组筛选、问题筛选、禁用路由开关、filtered route 计数、请求 URL、Codex tooltip、API Key mask、表格列、批量探测进度、余额探测进度、路由行 helper 和所有路由操作事件来源不变。本任务未改变真实 API 请求、runtime controller、route filter state、dialog/drawer state、toast 规则或路由管理页组件展示契约。
- 文件长度检查: `GatewayView.vue` 当前为 772 行，`gatewayRouteManagementPageController.ts` 为 252 行，`gatewayRouteManagementPageController.test.ts` 为 288 行，`gatewayRouteManagementPageComponent.test.ts` 为 58 行。相比任务 266 结束时，页面从 764 行增至 772 行；本任务是接线职责下沉而非行数压缩，新增 controller 调用注入列表抵消了模板绑定删除。
- TDD 红灯: `node --test frontend/tests/gatewayRouteManagementPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayRouteManagementPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，失败文件耗时 `1075.04712ms`，整体耗时 `1085.334934ms`，确认新增测试锁定本轮 route management page bindings 边界。
- 中间边界校验: 新 controller 实现后，相邻 route management page component 测试仍按旧结构要求 `GatewayView.vue` 直接传递 `v-model:route-search`、`:routes`、`@sync`、`@probe-all`、`@type-change` 和 `@history`；已更新为检查页面通过 `v-bind`/`v-on` 接入 route management page controller，并确认路由管理 page 组件自身仍承接 toolbar/table 组合。
- `node --test frontend/tests/gatewayRouteManagementPageController.test.ts`: 通过，2 个目标测试全部通过，首次绿灯耗时 `3985.210298ms`。
- `node --test frontend/tests/gatewayRouteManagementPageController.test.ts frontend/tests/gatewayRouteManagementPageComponent.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts frontend/tests/gatewayRouteManagementToolbarComponent.test.ts frontend/tests/gatewayAccessBarComponent.test.ts`: 通过，10 个目标/相邻测试全部通过，最终耗时 `12265.00046ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，465 个网关相关测试全部通过，最终耗时 `27891.224101ms`。
- `node --test frontend/tests/*.test.ts`: 通过，525 个前端状态辅助测试全部通过，最终耗时 `6819.032002ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3448 个模块完成转换，Vite 构建耗时 `56.75s`。仍有既有大 chunk 和 plugin timing 警告。构建通过后只压缩了测试 fixture，生产代码未再改动。
- 空白检查: `git diff --check -- frontend/src/views/GatewayView.vue frontend/src/gatewayRouteManagementPageController.ts frontend/tests/gatewayRouteManagementPageController.test.ts frontend/tests/gatewayRouteManagementPageComponent.test.ts` 通过；`frontend/src/gatewayRouteManagementPageController.ts` 和 `frontend/tests/gatewayRouteManagementPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 267 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 268: overlay page bindings 页面装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayOverlayPageController.ts`、`frontend/tests/gatewayOverlayPageController.test.ts`、`frontend/tests/gatewayOverlayPageHostComponent.test.ts`、`frontend/tests/gatewayOverlayHostComponent.test.ts`、`frontend/tests/gatewayAddUpstreamController.test.ts`。
- 改动: 新增 `useGatewayOverlayPageBindings`，把 `GatewayOverlayPageHost` 的 page-level props 和事件映射从 `GatewayView.vue` 模板下沉到 overlay page controller；页面只保留 `v-bind="overlayPageProps"` 和 `v-on="overlayPageHandlers"`，继续注入既有 dialog/drawer state、表格列、日志 helper、格式化函数和业务 action。
- 行为锁定: `GatewayOverlayPageHost.vue` 仍承接优先级、手动余额探测、设置、新增上游、路由模型、日志、路由日志和诊断抽屉的 page-level 桥接；`GatewayOverlayHost.vue` 仍是底层弹窗/抽屉渲染宿主。本任务未改变真实 API 请求、弹窗/抽屉 state、日志过滤结果、toast 规则、路由诊断/日志内容、手动余额探测、新增上游提交或路由模型保存行为。
- 文件长度检查: `GatewayView.vue` 当前为 781 行，`gatewayOverlayPageController.ts` 为 149 行，`gatewayOverlayPageController.test.ts` 为 205 行，`gatewayOverlayPageHostComponent.test.ts` 为 51 行，`gatewayOverlayHostComponent.test.ts` 为 115 行，`gatewayAddUpstreamController.test.ts` 为 329 行，`GatewayOverlayPageHost.vue` 为 246 行。`gatewayAddUpstreamController.test.ts` 为既有超 300 行测试文件，本任务只更新旧 overlay 事件断言。
- TDD 红灯: `node --test frontend/tests/gatewayOverlayPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayOverlayPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，确认新增测试锁定本轮 overlay page bindings 边界。
- 中间边界校验: 新 controller 实现后，相邻 `gatewayOverlayPageHostComponent.test.ts` 和 `gatewayOverlayHostComponent.test.ts` 仍按旧结构要求 `GatewayView.vue` 直接传递 `:priority-dialog`、`:logs-drawer`、`@priority-move` 和 `@route-models-save` 等 props/events；`gatewayAddUpstreamController.test.ts` 仍要求页面直接写 `@add-upstream-reset`。已更新为检查页面通过 `v-bind`/`v-on` 接入 overlay page controller，并确认 controller 内继续持有原 props/events 映射。
- `node --test frontend/tests/gatewayOverlayPageController.test.ts`: 通过，2 个目标测试全部通过，首次绿灯耗时 `7373.221492ms`。
- `node --test frontend/tests/gatewayOverlayPageController.test.ts frontend/tests/gatewayOverlayPageHostComponent.test.ts frontend/tests/gatewayOverlayHostComponent.test.ts`: 通过，7 个目标/相邻测试全部通过，最终耗时 `4624.224977ms`。
- `node --test frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewayOverlayPageController.test.ts frontend/tests/gatewayOverlayPageHostComponent.test.ts frontend/tests/gatewayOverlayHostComponent.test.ts`: 通过，15 个 overlay/add-upstream 相邻测试全部通过，最终耗时 `325.798817ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，467 个网关相关测试全部通过，最终耗时 `4371.351371ms`。
- `node --test frontend/tests/*.test.ts`: 通过，527 个前端状态辅助测试全部通过，最终耗时 `3853.396015ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3449 个模块完成转换，Vite 构建耗时 `53.70s`。仍有既有大 chunk 和 plugin timing 警告。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 268 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 269: route operations 页面装配聚合

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteOperationsPageController.ts`、`frontend/tests/gatewayRouteOperationsPageController.test.ts`、`frontend/tests/gatewayPriorityPageController.test.ts`、`frontend/tests/gatewayRouteActionPageController.test.ts`、`frontend/tests/gatewayRouteConfigPageController.test.ts`、`frontend/tests/gatewayRouteInspectionPageController.test.ts`、`frontend/tests/gatewayPriorityController.test.ts`、`frontend/tests/gatewayRouteActionController.test.ts`、`frontend/tests/gatewayRouteConfigController.test.ts`、`frontend/tests/gatewayRouteDiagnosisController.test.ts`、`frontend/tests/gatewayRouteLogsController.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `useGatewayRouteOperationsPageActions`，把优先级、路由启停/熔断、路由类型/路径/模型配置、路由诊断/日志四组 page action 装配聚合到 route operations page controller；`GatewayView.vue` 只调用该聚合 controller，旧四个 page controller 由新 controller 组合。
- 行为锁定: 优先级弹窗打开、优先级移动、预设重排、路由启停、禁用全部、仅启用当前路由、重置熔断、路由类型选择、请求格式选择、路由模型弹窗打开/保存、路由诊断打开/加载和路由日志打开/加载仍委托原 controller 与原 API 副作用链路。本任务未改变真实请求、toast、浏览器确认、route mutation 写回、drawer/dialog state、reload helper 或自动刷新行为。
- 文件长度检查: `GatewayView.vue` 当前为 761 行，`gatewayRouteOperationsPageController.ts` 为 24 行，`gatewayRouteOperationsPageController.test.ts` 为 230 行，`gatewayPriorityPageController.test.ts` 为 167 行，`gatewayRouteActionPageController.test.ts` 为 152 行，`gatewayRouteConfigPageController.test.ts` 为 178 行，`gatewayRouteInspectionPageController.test.ts` 为 174 行。`gatewayPriorityController.test.ts` 为 724 行、`gatewayRouteActionController.test.ts` 为 335 行、`gatewayRouteConfigController.test.ts` 为 703 行、`gatewayViewModel.test.ts` 为 362 行，均为既有大型测试文件，本任务只迁移其中旧的页面接线断言。
- TDD 红灯: `node --test frontend/tests/gatewayRouteOperationsPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayRouteOperationsPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，确认新增测试锁定本轮 route operations 聚合边界。
- 中间边界校验: 新 controller 实现后，旧文本契约测试仍要求 `GatewayView.vue` 直接调用 `useGatewayPriorityPageActions`、`useGatewayRouteActionPageActions`、`useGatewayRouteConfigPageActions` 或 `useGatewayRouteInspectionPageActions`；已更新为检查页面只接入 `useGatewayRouteOperationsPageActions`，并确认 route operations controller 内继续导入和调用原四组 page controller。
- `node --test frontend/tests/gatewayRouteOperationsPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `324.104321ms`。
- `node --test frontend/tests/gatewayPriorityPageController.test.ts frontend/tests/gatewayRouteActionPageController.test.ts frontend/tests/gatewayRouteConfigPageController.test.ts frontend/tests/gatewayRouteInspectionPageController.test.ts`: 通过，8 个相邻 page controller 测试全部通过，最终耗时 `261.160008ms`。
- `node --test frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayRouteActionController.test.ts frontend/tests/gatewayRouteConfigController.test.ts frontend/tests/gatewayRouteDiagnosisController.test.ts frontend/tests/gatewayRouteLogsController.test.ts frontend/tests/gatewayViewModel.test.ts frontend/tests/gatewayRouteOperationsPageController.test.ts frontend/tests/gatewayPriorityPageController.test.ts frontend/tests/gatewayRouteActionPageController.test.ts frontend/tests/gatewayRouteConfigPageController.test.ts frontend/tests/gatewayRouteInspectionPageController.test.ts`: 通过，73 个目标/相邻测试全部通过，最终耗时 `6724.510138ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，469 个网关相关测试全部通过，最终耗时 `4087.510747ms`。
- `node --test frontend/tests/*.test.ts`: 通过，529 个前端状态辅助测试全部通过，最终耗时 `4478.008954ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3450 个模块完成转换，Vite 构建耗时 `2m 10s`。仍有既有大 chunk 和 plugin timing 警告。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 269 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 270: admin operations 页面装配聚合

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayAdminOperationsPageController.ts`、`frontend/tests/gatewayAdminOperationsPageController.test.ts`、`frontend/tests/gatewayUpstreamPageController.test.ts`、`frontend/tests/gatewaySettingsPageController.test.ts`、`frontend/tests/gatewaySyncController.test.ts`、`frontend/tests/gatewaySettingsController.test.ts`、`frontend/tests/gatewayAddUpstreamController.test.ts`、`frontend/tests/gatewayViewModel.test.ts`。
- 改动: 新增 `useGatewayAdminOperationsPageActions`，把上游同步/新增上游和网关设置保存两组 page action 装配聚合到 admin operations page controller；`GatewayView.vue` 只调用该聚合 controller，旧 upstream/settings page controller 由新 controller 组合。
- 行为锁定: 同步网关路由、新增上游、保存网关设置仍委托原 controller 与原 API 副作用链路。本任务未改变真实请求、toast、reload helper、余额静默探测、新增上游弹窗 state、设置弹窗 state 或自动刷新行为。
- 文件长度检查: `GatewayView.vue` 当前为 756 行，`gatewayAdminOperationsPageController.ts` 为 30 行，`gatewayAdminOperationsPageController.test.ts` 为 190 行，`gatewayUpstreamPageController.test.ts` 为 158 行，`gatewaySettingsPageController.test.ts` 为 94 行，`gatewaySyncController.test.ts` 为 217 行，`gatewaySettingsController.test.ts` 为 265 行，`gatewayAddUpstreamController.test.ts` 为 334 行，`gatewayViewModel.test.ts` 为 360 行。`gatewayAddUpstreamController.test.ts` 为既有超 300 行测试文件，本任务只迁移其中旧的页面接线断言。
- TDD 红灯: `node --test frontend/tests/gatewayAdminOperationsPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayAdminOperationsPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，确认新增测试锁定本轮 admin operations 聚合边界。
- 中间边界校验: 新 controller 实现后，相邻 upstream/settings/sync/add-upstream/view-model 测试仍要求 `GatewayView.vue` 直接调用 `useGatewayUpstreamPageActions` 或 `useGatewaySettingsPageActions`；已更新为检查页面只接入 `useGatewayAdminOperationsPageActions`，并确认 admin operations controller 内继续导入和调用原两组 page controller。
- `node --test frontend/tests/gatewayAdminOperationsPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `1920.871781ms`。
- `node --test frontend/tests/gatewayAdminOperationsPageController.test.ts frontend/tests/gatewayUpstreamPageController.test.ts frontend/tests/gatewaySettingsPageController.test.ts frontend/tests/gatewaySyncController.test.ts frontend/tests/gatewaySettingsController.test.ts frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，35 个目标/相邻测试全部通过，最终耗时 `1053.721524ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，471 个网关相关测试全部通过，最终耗时 `5291.396976ms`。
- `node --test frontend/tests/*.test.ts`: 通过，531 个前端状态辅助测试全部通过，最终耗时 `4816.818999ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3451 个模块完成转换，Vite 构建耗时 `33.30s`。仍有既有大 chunk 和 plugin timing 警告。
- 空白检查: `git diff --check -- frontend/src/views/GatewayView.vue frontend/src/gatewayAdminOperationsPageController.ts frontend/tests/gatewayAdminOperationsPageController.test.ts frontend/tests/gatewayUpstreamPageController.test.ts frontend/tests/gatewaySettingsPageController.test.ts frontend/tests/gatewaySyncController.test.ts frontend/tests/gatewaySettingsController.test.ts frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewayViewModel.test.ts` 通过；`frontend/src/gatewayAdminOperationsPageController.ts` 和 `frontend/tests/gatewayAdminOperationsPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 270 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 271: realtime operations 页面装配聚合

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRealtimeOperationsPageController.ts`、`frontend/src/gatewayRealtimePageController.ts`、`frontend/src/gatewayAutoRefreshPageController.ts`、`frontend/tests/gatewayRealtimeOperationsPageController.test.ts`、`frontend/tests/gatewayRealtimePageController.test.ts`、`frontend/tests/gatewayAutoRefreshPageController.test.ts`、`frontend/tests/gatewayAutoRefreshTimerController.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/tests/gatewayVisibilityPlatformController.test.ts`。
- 改动: 新增 `useGatewayRealtimeOperationsPageActions`，把实时刷新、活动请求刷新、可见性刷新和自动刷新 timer 启停两组 page action 装配聚合到 realtime operations page controller；`GatewayView.vue` 只调用该聚合 controller，旧 realtime/auto-refresh page controller 由新 controller 组合。
- 行为锁定: 活动请求加载、活动请求静默刷新、实时数据刷新、可见性变化处理、自动刷新启动和自动刷新停止仍委托原 controller 与原 runtime/timer 副作用链路。本任务未改变真实请求、toast、请求取消 slot、document visibility 读取、timer 调度、timer 清理或生命周期挂载行为。
- 文件长度检查: `GatewayView.vue` 当前为 744 行，`gatewayRealtimeOperationsPageController.ts` 为 39 行，`gatewayRealtimeOperationsPageController.test.ts` 为 202 行，`gatewayRealtimePageController.ts` 为 201 行，`gatewayAutoRefreshPageController.ts` 为 77 行。
- TDD 红灯: `node --test frontend/tests/gatewayRealtimeOperationsPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayRealtimeOperationsPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，失败耗时 `195.839543ms`，确认新增测试锁定本轮 realtime operations 聚合边界。
- 中间边界校验: 新 controller 实现后，相邻 realtime/auto-refresh/runtime/visibility 测试仍要求 `GatewayView.vue` 直接调用 `useGatewayRealtimePageActions` 或 `useGatewayAutoRefreshPageActions`；已更新为检查页面只接入 `useGatewayRealtimeOperationsPageActions`，并确认 realtime operations controller 内继续导入和调用原两组 page controller。
- 构建修正: 首次 `npm run build` 失败于 `GatewayView.vue` 解构了不再直接使用的 `refreshActiveRequests`/`refreshRealtimeData`，以及聚合 controller 使用 `Parameters<typeof genericFunction>` 后丢失 `AbortController` 默认泛型、导致 `AbortSignal` 被退化为 `{ aborted: boolean }`。已改为导出并复用底层 page controller options 类型，页面只解构生命周期实际使用的 `handleVisibilityChange`、`startAutoRefresh`、`stopAutoRefresh`。
- `node --test frontend/tests/gatewayRealtimeOperationsPageController.test.ts frontend/tests/gatewayRealtimePageController.test.ts frontend/tests/gatewayAutoRefreshPageController.test.ts frontend/tests/gatewayAutoRefreshTimerController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayVisibilityPlatformController.test.ts frontend/tests/gatewayPageLifecycleController.test.ts`: 通过，70 个目标/相邻测试全部通过，最终耗时 `870.010011ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，473 个网关相关测试全部通过，最终耗时 `3832.783184ms`。
- `node --test frontend/tests/*.test.ts`: 通过，533 个前端状态辅助测试全部通过，最终耗时 `6106.872447ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3452 个模块完成转换，Vite 构建耗时 `38.33s`。仍有既有大 chunk 和 plugin timing 警告。
- 空白检查: `git diff --check -- frontend/src/views/GatewayView.vue frontend/src/gatewayRealtimeOperationsPageController.ts frontend/src/gatewayRealtimePageController.ts frontend/src/gatewayAutoRefreshPageController.ts frontend/tests/gatewayRealtimeOperationsPageController.test.ts frontend/tests/gatewayRealtimePageController.test.ts frontend/tests/gatewayAutoRefreshPageController.test.ts frontend/tests/gatewayAutoRefreshTimerController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayVisibilityPlatformController.test.ts` 通过；`frontend/src/gatewayRealtimeOperationsPageController.ts` 和 `frontend/tests/gatewayRealtimeOperationsPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 271 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 272: data operations 页面装配聚合

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayDataOperationsPageController.ts`、`frontend/src/gatewayInitialDataPageController.ts`、`frontend/src/gatewayUsagePageController.ts`、`frontend/tests/gatewayDataOperationsPageController.test.ts`、`frontend/tests/gatewayInitialDataPageController.test.ts`、`frontend/tests/gatewayUsagePageController.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/tests/gatewayUsageRangeController.test.ts`、`frontend/tests/gatewayViewModel.test.ts`、`frontend/tests/gatewayRouteOperationsPageController.test.ts`。
- 改动: 新增 `useGatewayDataOperationsPageActions`，把初始数据加载/动作后重载和用量查询/今日快捷查询两组 page action 装配聚合到 data operations page controller；`GatewayView.vue` 只调用该聚合 controller，旧 initial data/usage page controller 由新 controller 组合。
- 行为锁定: 初始数据加载、动作后重载、用量 runtime 加载、普通用量查询和今日快捷查询仍委托原 controller 与原 runtime/range 副作用链路。本任务未改变真实请求、toast、请求取消 slot、loading setter、用量范围转换、今日范围重置或挂载状态判断。
- 文件长度检查: `GatewayView.vue` 当前为 732 行，`gatewayDataOperationsPageController.ts` 为 40 行，`gatewayDataOperationsPageController.test.ts` 为 162 行，`gatewayInitialDataPageController.ts` 为 189 行，`gatewayUsagePageController.ts` 为 93 行。
- TDD 红灯: `node --test frontend/tests/gatewayDataOperationsPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayDataOperationsPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，整体耗时 `197.803619ms`，失败测试耗时 `185.194769ms`，确认新增测试锁定本轮 data operations 聚合边界。
- 中间边界校验: 新 controller 实现后，相邻 initial-data/usage/runtime/usage-range/view-model/route-operations 测试仍要求 `GatewayView.vue` 直接调用 `useGatewayInitialDataPageActions` 或 `useGatewayUsagePageActions`；已更新为检查页面只接入 `useGatewayDataOperationsPageActions`，并确认 data operations controller 内继续导入和调用原两组 page controller。
- `node --test frontend/tests/gatewayDataOperationsPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `2337.548633ms`。
- `node --test frontend/tests/gatewayDataOperationsPageController.test.ts frontend/tests/gatewayInitialDataPageController.test.ts frontend/tests/gatewayUsagePageController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayUsageRangeController.test.ts frontend/tests/gatewayViewModel.test.ts frontend/tests/gatewayRouteOperationsPageController.test.ts`: 通过，74 个目标/相邻测试全部通过，最终耗时 `2384.908755ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，475 个网关相关测试全部通过，最终耗时 `5127.24479ms`。
- `node --test frontend/tests/*.test.ts`: 通过，535 个前端状态辅助测试全部通过，最终耗时 `3933.054133ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3453 个模块完成转换，Vite 构建耗时 `1m 19s`。仍有既有大 chunk 和 plugin timing 警告。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayDataOperationsPageController.ts` 和 `frontend/tests/gatewayDataOperationsPageController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 272 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 273: page bindings 页面装配聚合

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPageBindingsController.ts`、`frontend/src/gatewayMonitorPageController.ts`、`frontend/src/gatewayRouteManagementPageController.ts`、`frontend/src/gatewayOverlayPageController.ts`、`frontend/tests/gatewayPageBindingsController.test.ts`、`frontend/tests/gatewayMonitorPageController.test.ts`、`frontend/tests/gatewayRouteManagementPageController.test.ts`、`frontend/tests/gatewayOverlayPageController.test.ts`、`frontend/tests/gatewayMonitorPageComponent.test.ts`、`frontend/tests/gatewayRouteManagementPageComponent.test.ts`、`frontend/tests/gatewayOverlayPageHostComponent.test.ts`、`frontend/tests/gatewayOverlayHostComponent.test.ts`、`frontend/tests/gatewayAddUpstreamController.test.ts`。
- 改动: 新增 `useGatewayPageBindings`，把监控页、路由管理页和 overlay page 三组 page-level props/events bindings 聚合到 page bindings controller；`GatewayView.vue` 只调用该聚合 controller，旧 monitor/route-management/overlay page controller 由新 controller 组合。
- 行为锁定: `GatewayMonitorPage`、`GatewayRouteManagementPage` 和 `GatewayOverlayPageHost` 仍通过原 `v-bind`/`v-on` 接收对象级 props 与事件；刷新、复制、用量、日志、设置、同步、探测、筛选、路由配置、优先级、诊断、新增上游和路由模型保存的业务 action 来源不变。
- 文件长度检查: `GatewayView.vue` 当前为 707 行，`gatewayPageBindingsController.ts` 为 78 行，`gatewayPageBindingsController.test.ts` 为 177 行，`gatewayMonitorPageController.ts` 为 163 行，`gatewayRouteManagementPageController.ts` 为 252 行，`gatewayOverlayPageController.ts` 为 149 行。
- TDD 红灯: `node --test frontend/tests/gatewayPageBindingsController.test.ts` 首次失败于缺少 `frontend/src/gatewayPageBindingsController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，整体耗时 `1234.886493ms`，失败测试文件耗时 `1224.089037ms`，确认新增测试锁定本轮 page bindings 聚合边界。
- 中间边界校验: 新 controller 实现后，相邻 monitor/route-management/overlay page controller 与 page component 测试仍要求 `GatewayView.vue` 直接调用 `useGatewayMonitorPageBindings`、`useGatewayRouteManagementPageBindings` 或 `useGatewayOverlayPageBindings`；已更新为检查页面只接入 `useGatewayPageBindings`，并确认 page bindings controller 内继续导入和调用原三组 page bindings controller。
- 构建修正: 首次 `npm run build` 失败于聚合 controller 使用 `Parameters<typeof genericFunction>` 后把泛型 props 退化为 `unknown`，并且 `GatewayView.vue` 聚合调用对象中重复传入共享 key。已改为从三组底层 page controller 显式导出 options 类型，在 `gatewayPageBindingsController.ts` 中组合真实泛型类型，并删除页面聚合调用中的重复 key。
- `node --test frontend/tests/gatewayPageBindingsController.test.ts`: 通过，2 个目标测试全部通过，首次绿灯耗时 `5969.777313ms`。
- `node --test frontend/tests/gatewayPageBindingsController.test.ts frontend/tests/gatewayMonitorPageController.test.ts frontend/tests/gatewayRouteManagementPageController.test.ts frontend/tests/gatewayOverlayPageController.test.ts frontend/tests/gatewayMonitorPageComponent.test.ts frontend/tests/gatewayRouteManagementPageComponent.test.ts frontend/tests/gatewayOverlayPageHostComponent.test.ts frontend/tests/gatewayOverlayHostComponent.test.ts frontend/tests/gatewayAddUpstreamController.test.ts`: 通过，25 个目标/相邻测试全部通过，最终耗时 `428.03757ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，477 个网关相关测试全部通过，最终耗时 `3388.969355ms`。
- `node --test frontend/tests/*.test.ts`: 通过，537 个前端状态辅助测试全部通过，最终耗时 `3853.089117ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3454 个模块完成转换，Vite 构建耗时 `50.46s`。仍有既有大 chunk 和 plugin timing 警告。
- 旧页面直连扫描: `rg -n "import \{ useGatewayMonitorPageBindings \} from '../gatewayMonitorPageController'|import \{ useGatewayRouteManagementPageBindings \} from '../gatewayRouteManagementPageController'|import \{ useGatewayOverlayPageBindings \} from '../gatewayOverlayPageController'|useGatewayMonitorPageBindings\(\{|useGatewayRouteManagementPageBindings\(\{|useGatewayOverlayPageBindings\(\{" frontend/src/views/GatewayView.vue frontend/tests frontend/src/gatewayPageBindingsController.ts` 仅命中三组低层 controller 的单元测试调用，未命中 `GatewayView.vue`。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayPageBindingsController.ts` 和 `frontend/tests/gatewayPageBindingsController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 273 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 274: browser page platform 页面装配拆分

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPagePlatformController.ts`、`frontend/src/gatewayVisibilityPlatformController.ts`、`frontend/src/gatewayAccessPageController.ts`、`frontend/src/gatewayRealtimeOperationsPageController.ts`、`frontend/src/gatewayRouteOperationsPageController.ts`、`frontend/tests/gatewayPagePlatformController.test.ts`、`frontend/tests/gatewayVisibilityPlatformController.test.ts`、`frontend/tests/gatewayAccessPageController.test.ts`、`frontend/tests/gatewayRouteActionPageController.test.ts`、`frontend/tests/gatewayRouteActionController.test.ts`、`frontend/tests/gatewayAutoRefreshPageController.test.ts`、`frontend/tests/gatewayAutoRefreshTimerController.test.ts`、`frontend/tests/gatewayPageLifecycleController.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`。
- 改动: 新增 `createGatewayPagePlatform`，把 `window.location`、`navigator.clipboard.writeText`、浏览器确认窗口、timer window、document visibility 平台和页面 lifecycle event 平台统一聚合到 browser page platform controller；`GatewayView.vue` 只在一个构造点注入 `window`、`document` 和 `navigator`，其余页面 controller 读取 `gatewayPagePlatform`。
- 行为锁定: 可见性读取、生命周期事件注册/移除、剪贴板写入、浏览器确认和自动刷新 timer 行为仍委托现有 platform/controller 与真实浏览器 API；本任务不改变任何请求、后端 API、路由、认证、SQLite 数据或用户操作路径。
- 文件长度检查: `GatewayView.vue` 当前为 702 行，`gatewayPagePlatformController.ts` 为 53 行，`gatewayPagePlatformController.test.ts` 为 113 行，`gatewayRuntimeController.test.ts` 为 2372 行，`types.ts` 为 864 行，`api.ts` 为 796 行。
- TDD 红灯: `node --test frontend/tests/gatewayPagePlatformController.test.ts` 首次失败于缺少 `frontend/src/gatewayPagePlatformController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，整体耗时 `158.969648ms`，失败测试文件耗时 `148.860744ms`，确认新增测试锁定 browser page platform 聚合边界。
- 中间边界校验: 新 controller 实现后，相邻 access、route action、auto refresh、page lifecycle、visibility 和 runtime 测试仍要求 `GatewayView.vue` 直接装配 `gatewayVisibilityPlatform`、`gatewayPageLifecycleEventPlatform`、`window.location`、`navigator.clipboard.writeText`、`confirmWindow: window` 或 `timerWindow: window`；已更新为检查页面只接入 `gatewayPagePlatform`，并确认 page platform controller 内继续组合原低层 platform/controller。
- `node --test frontend/tests/gatewayPagePlatformController.test.ts`: 通过，2 个目标测试全部通过，首次绿灯耗时 `199.674895ms`。
- `node --test frontend/tests/gatewayPagePlatformController.test.ts frontend/tests/gatewayVisibilityPlatformController.test.ts frontend/tests/gatewayAccessPageController.test.ts frontend/tests/gatewayRouteActionPageController.test.ts frontend/tests/gatewayRouteActionController.test.ts frontend/tests/gatewayAutoRefreshPageController.test.ts frontend/tests/gatewayAutoRefreshTimerController.test.ts`: 通过，26 个目标/相邻测试全部通过，最终耗时 `4081.187965ms`。
- 首次 `node --test frontend/tests/gateway*.test.ts` 发现 4 个旧结构文本断言仍要求直接使用 `gatewayPageLifecycleEventPlatform` 或 `gatewayVisibilityPlatform`；已更新为检查 `gatewayPagePlatform.lifecycle` 和 `gatewayPagePlatform.visibility`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，479 个网关相关测试全部通过，最终耗时 `4608.877261ms`。
- `node --test frontend/tests/*.test.ts`: 通过，539 个前端状态辅助测试全部通过，最终耗时 `4360.98986ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3455 个模块完成转换，Vite 构建耗时 `1m 14s`。仍有既有大 chunk 和 plugin timing 警告。
- 旧页面直连扫描: `rg -n "createGatewayVisibilityPlatform\(\{|createGatewayPageLifecycleEventPlatform\(\{|visibilityDocument: document|lifecycleWindow: window|lifecycleDocument: document|location: window\.location|navigator\.clipboard\.writeText|confirmWindow: window|timerWindow: window|gatewayVisibilityPlatform|gatewayPageLifecycleEventPlatform" frontend/src/views/GatewayView.vue frontend/tests` 仅命中低层 platform 单元测试和 negative assertion，未命中 `GatewayView.vue` 的旧直连注入。
- 空白检查: `git diff --check` 通过；`frontend/src/gatewayPagePlatformController.ts` 和 `frontend/tests/gatewayPagePlatformController.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 274 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 275: gateway page shell 模板收口

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/components/gateway/GatewayPageShell.vue`、`frontend/tests/gatewayPageShellComponent.test.ts`、`frontend/tests/gatewayMonitorPageComponent.test.ts`、`frontend/tests/gatewayRouteManagementPageComponent.test.ts`、`frontend/tests/gatewayOverlayPageHostComponent.test.ts`、`frontend/tests/gatewayOverlayHostComponent.test.ts`、`frontend/tests/gatewayAccessBarComponent.test.ts`、`frontend/tests/gatewayAddUpstreamController.test.ts`、`frontend/tests/gatewayMonitorPageController.test.ts`、`frontend/tests/gatewayOverlayPageController.test.ts`、`frontend/tests/gatewayRouteManagementPageController.test.ts`。
- 改动: 新增 `GatewayPageShell.vue`，承接最终 `ShellLayout`、监控页、路由管理页和 overlay page host 的模板组合；`GatewayView.vue` 只向 shell 传入 `isRouteManagement`、`isGatewayMonitor`、三组 page props 和三组 page handlers。
- 行为锁定: `GatewayMonitorPage`、`GatewayRouteManagementPage` 和 `GatewayOverlayPageHost` 继续接收原 page bindings controller 生成的同名 props/handlers；本任务不改变任何 API action、页面 state、后端 API、路由、认证、SQLite 数据或用户操作路径。
- 文件长度检查: `GatewayView.vue` 当前为 686 行，`GatewayPageShell.vue` 为 48 行，`gatewayPageShellComponent.test.ts` 为 65 行，`gatewayAddUpstreamController.test.ts` 为 337 行，`gatewayRouteManagementPageController.test.ts` 为 295 行。
- TDD 红灯: `node --test frontend/tests/gatewayPageShellComponent.test.ts` 首次失败 2 个测试，分别确认缺少 `GatewayPageShell.vue` 以及 `GatewayView.vue` 仍直接导入或渲染 `ShellLayout`、`GatewayMonitorPage`、`GatewayRouteManagementPage`、`GatewayOverlayPageHost`，最终红灯耗时 `167.170533ms`。
- 中间边界校验: 新 shell 实现后，目标加相邻测试首次仍有 4 个旧结构断言要求从 `GatewayView.vue` 直接读取 page 组件渲染；首次 `node --test frontend/tests/gateway*.test.ts` 另有 5 个旧断言要求页面直接持有 monitor、route management 或 overlay block。已更新为检查 `GatewayPageShell.vue` 承接最终模板组合，`GatewayView.vue` 只传递 shell props/handlers。
- `node --test frontend/tests/gatewayPageShellComponent.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `147.689451ms`。
- `node --test frontend/tests/gatewayPageShellComponent.test.ts frontend/tests/gatewayPageBindingsController.test.ts frontend/tests/gatewayMonitorPageComponent.test.ts frontend/tests/gatewayRouteManagementPageComponent.test.ts frontend/tests/gatewayOverlayPageHostComponent.test.ts frontend/tests/gatewayOverlayHostComponent.test.ts`: 通过，13 个目标/相邻测试全部通过，最终耗时 `4593.585451ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，481 个网关相关测试全部通过，最终耗时 `7161.223628ms`。
- `node --test frontend/tests/*.test.ts`: 通过，541 个前端状态辅助测试全部通过，最终耗时 `4282.147244ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3457 个模块完成转换，Vite 构建耗时 `57.55s`。仍有既有大 chunk 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 首次失败于网络 TLS 连接中断，错误为 `Client network socket disconnected before secure TLS connection was established`；重试通过，`found 0 vulnerabilities`。
- 旧页面直连扫描: `rg -n "<ShellLayout>|<GatewayMonitorPage|<GatewayRouteManagementPage|<GatewayOverlayPageHost|import ShellLayout|import GatewayMonitorPage|import GatewayRouteManagementPage|import GatewayOverlayPageHost" frontend/src/views/GatewayView.vue frontend/src/components/gateway/GatewayPageShell.vue frontend/tests/gateway*.test.ts` 仅命中 `GatewayPageShell.vue` 和测试中的预期断言，未命中 `GatewayView.vue` 的旧直连模板或导入。
- 空白检查: `git diff --check` 通过；`GatewayPageShell.vue` 和 `gatewayPageShellComponent.test.ts` 的 no-index whitespace 包装检查均未报告 whitespace 问题。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 275 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 276: gateway page requests 页面请求依赖收口

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPageRequestsController.ts`、`frontend/tests/gatewayPageRequestsController.test.ts`、`frontend/tests/gatewayInitialDataPageController.test.ts`、`frontend/tests/gatewayRealtimePageController.test.ts`、`frontend/tests/gatewayRouteProbePageController.test.ts`、`frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`，以及全量 `frontend/tests/gateway*.test.ts` 中旧请求直连断言。
- 改动: 新增 `createGatewayPageRequests()`，把 `GatewayView.vue` 直接从 `../api` 导入的网关页请求函数收口到 `gatewayPageRequests` adapter；页面不再直接导入 `../api`，各 page controller 仍接收同名真实请求函数引用。
- 行为锁定: 本任务不拆分 `frontend/src/api.ts`，不改变请求函数实现、请求路径、参数、错误处理、鉴权、后端 API、路由、SQLite 数据或用户操作路径；只是把页面级请求依赖入口从直接导入改为 adapter 注入。
- 文件长度检查: `GatewayView.vue` 当前为 664 行，`gatewayPageRequestsController.ts` 为 53 行，`gatewayPageRequestsController.test.ts` 为 85 行，`gatewayRuntimeController.test.ts` 仍为 2372 行。
- TDD 红灯: `node --test frontend/tests/gatewayPageRequestsController.test.ts` 首次失败 2 个测试，分别确认缺少 `gatewayPageRequestsController.ts`，以及 `GatewayView.vue` 仍直接从 `../api` 导入请求函数；红灯总耗时 `258.4957ms`。
- 中间边界校验: 新 adapter 实现后，首次目标测试因 Node 原生 ESM 无法解析 `./api` 与 `api.ts` 内部 extensionless 导入而失败；未为了测试改动共享 `api.ts`，改为源码契约检查。相邻请求依赖测试首次有 8 个旧断言仍要求页面直接传 `getGateway...`、`probeGateway...` 或 `refreshSiteSummaries`，已更新为检查 `gatewayPageRequests.*` 注入。
- `node --test frontend/tests/gatewayPageRequestsController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `180.907116ms`。
- `node --test frontend/tests/gatewayPageRequestsController.test.ts frontend/tests/gatewayInitialDataPageController.test.ts frontend/tests/gatewayRealtimePageController.test.ts frontend/tests/gatewayRouteProbePageController.test.ts frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRuntimeController.test.ts`: 通过，61 个目标/相邻测试全部通过，最终耗时 `394.279492ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，483 个网关相关测试全部通过，最终耗时 `3374.231673ms`。
- `node --test frontend/tests/*.test.ts`: 通过，543 个前端状态辅助测试全部通过，最终耗时 `3816.50774ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3458 个模块完成转换，Vite 构建耗时 `58.41s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- 旧请求直连扫描: `rg -n "from '../api'|requestOverview: getGatewayOverview|requestActiveRequests: getGatewayActiveRequests|requestSummaries: refreshSiteSummaries|requestSync: syncGatewayRoutes|requestCreateSite: createSite|requestSaveSettings: updateGatewaySettings" frontend/src/views/GatewayView.vue frontend/tests/gateway*.test.ts` 无命中。
- 新 adapter 注入扫描: `rg -n "createGatewayPageRequests|gatewayPageRequests\\." frontend/src/views/GatewayView.vue frontend/src/gatewayPageRequestsController.ts frontend/tests/gatewayPageRequestsController.test.ts` 命中 adapter、页面构造点和各请求注入点。
- 空白检查: `perl -ne 'if(/[ \\t]+$/){print "$ARGV:$.: trailing whitespace\\n"; $bad=1} END{exit($bad ? 1 : 0)}' frontend/src/gatewayPageRequestsController.ts frontend/tests/gatewayPageRequestsController.test.ts` 通过；本轮曾启动的 `git diff --check` / `git diff --no-index --check` 进程一度卡在本机不可中断状态，后续未再作为本任务完成证据。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 276 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 277: gateway display page state 页面展示装配收口

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayDisplayPageController.ts`、`frontend/tests/gatewayDerivedStateController.test.ts`，以及 page bindings、monitor、route management、overlay 等相邻网关 controller 测试。
- 改动: 新增 `useGatewayDisplayPageState()`，把 `GatewayView.vue` 中展示派生状态的页面装配、`buildGatewayRouteFilters` 转换、`gatewayViewModel` 纯函数注入、`gatewayViewConfig` 列配置注入、`priorityDialogColumns` 和 `formatGatewayTime` 统一收口到 display page controller。`GatewayView.vue` 不再直接导入 `gatewayViewModel`、`gatewayViewConfig` 或调用 `useGatewayDerivedState()`。
- 行为锁定: 本任务不改变后端 API、请求函数、路由、SQLite 数据、网关入口、列定义内容、过滤语义、时间格式化函数或用户操作路径；只移动展示装配边界。
- 文件长度检查: `GatewayView.vue` 从任务 276 的 664 行降至 623 行，`gatewayDisplayPageController.ts` 为 129 行，`gatewayDerivedStateController.test.ts` 为 262 行，`gatewayDerivedStateController.ts` 仍为 158 行。
- TDD 红灯: `node --test frontend/tests/gatewayDerivedStateController.test.ts` 首次失败 2 个测试，分别确认缺少 `gatewayDisplayPageController.ts`，以及 `GatewayView.vue` 仍直接接入 `useGatewayDerivedState()`、`gatewayViewModel` 和 `gatewayViewConfig`；红灯总耗时 `6422.666283ms`。
- `node --test frontend/tests/gatewayDerivedStateController.test.ts`: 通过，3 个目标测试全部通过，最终耗时 `4256.509726ms`。
- `node --test frontend/tests/gatewayPageBindingsController.test.ts frontend/tests/gatewayMonitorPageController.test.ts frontend/tests/gatewayRouteManagementPageController.test.ts frontend/tests/gatewayOverlayPageController.test.ts frontend/tests/gatewayDerivedStateController.test.ts`: 通过，11 个目标/相邻测试全部通过，最终耗时 `3653.408476ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，484 个网关相关测试全部通过，最终耗时 `4648.655022ms`。
- `node --test frontend/tests/*.test.ts`: 通过，544 个前端状态辅助测试全部通过，最终耗时 `5072.150516ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3459 个模块完成转换，Vite 构建耗时 `1m 46s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过，无输出。
- 旧页面展示装配直连扫描: `rg -n "gatewayViewModel|gatewayViewConfig|useGatewayDerivedState|buildGatewayRouteFilters|createRouteColumns|createUsageColumns|createLogColumns|routeLastUpdateTime" frontend/src/views/GatewayView.vue frontend/src/gatewayDisplayPageController.ts frontend/tests/gatewayDerivedStateController.test.ts` 未命中 `GatewayView.vue`；命中集中在新 display page controller 和测试断言中。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 277 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 278: gateway page display helpers 页面展示 helper 依赖收口

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPageDisplayHelpersController.ts`、`frontend/tests/gatewayPageDisplayHelpersController.test.ts`，以及 route action、priority、page bindings、monitor、route management、overlay 等相邻网关 controller 测试。
- 改动: 新增 `createGatewayPageDisplayHelpers()`，把 `GatewayView.vue` 中静态 route/log/format/view 展示 helper 依赖收口到 page display helpers controller。`GatewayView.vue` 不再直接导入 `gatewayRouteDisplayModel.ts`、`gatewayActivityDisplayModel.ts`、`format.ts` 或 `viewUtils.ts`，页面通过 `gatewayPageDisplayHelpers` 注入 `useGatewayPageBindings()`、路由 action 和优先级 action。
- 行为锁定: 本任务不改变后端 API、请求函数、路由、认证、SQLite 数据、网关入口、展示格式、日志字段、路由过滤语义或用户操作路径；只移动静态展示 helper 注入边界。
- 文件长度检查: `GatewayView.vue` 从任务 277 的 623 行降至 561 行，`gatewayPageDisplayHelpersController.ts` 为 75 行，`gatewayPageDisplayHelpersController.test.ts` 为 62 行，`gatewayDisplayPageController.ts` 仍为 129 行。
- TDD 红灯: 首次静态 import 红灯确认缺少 `gatewayPageDisplayHelpersController.ts`，报错为 `ERR_MODULE_NOT_FOUND`，耗时 `295ms`；随后修正测试为动态导入与源码契约检查，精确红灯为 3 个失败测试、0 个通过，整体耗时 `159.323589ms`。
- `node --test frontend/tests/gatewayPageDisplayHelpersController.test.ts`: 通过，3 个目标测试全部通过，最终耗时 `830.111268ms`。
- `node --test frontend/tests/gatewayPageDisplayHelpersController.test.ts frontend/tests/gatewayPageBindingsController.test.ts frontend/tests/gatewayRouteManagementPageController.test.ts frontend/tests/gatewayOverlayPageController.test.ts frontend/tests/gatewayMonitorPageController.test.ts frontend/tests/gatewayRouteActionPageController.test.ts frontend/tests/gatewayRouteActionController.test.ts frontend/tests/gatewayPriorityPageController.test.ts frontend/tests/gatewayPriorityController.test.ts`: 通过，43 个目标/相邻测试全部通过，最终耗时 `1832.977899ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，487 个网关相关测试全部通过，最终耗时 `4382.423655ms`。
- `node --test frontend/tests/*.test.ts`: 通过，547 个前端状态辅助测试全部通过，最终耗时 `4235.57821ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3460 个模块完成转换，Vite 构建耗时 `43.38s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPageDisplayHelpersController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPageDisplayHelpersController.test.ts` 均通过。
- 旧静态展示 helper 直连扫描: `rg -n "from '../gatewayActivityDisplayModel'|from '../gatewayRouteDisplayModel'|from '../format'|from '../viewUtils'|normalizeRoute: normalizeGatewayRoute|routeLabel: loadRouteLabel|routeTypeLabel,|routePathLabel," frontend/src/views/GatewayView.vue frontend/tests/gateway*.test.ts` 未命中 `GatewayView.vue` 的旧直接导入或旧注入写法；仅保留 `gatewayPageDisplayHelpers.routeTypeLabel`、`gatewayPageDisplayHelpers.routePathLabel` 等新 helper 对象引用和 route display model 测试引用。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 278 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 279: gateway page table layout 表格布局装配收口

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPageTableLayoutController.ts`、`frontend/tests/gatewayPageTableLayoutController.test.ts`、`frontend/tests/tableScrollHeights.test.ts`，以及 page bindings、route management、overlay 等相邻网关 controller/component 测试。
- 改动: 新增 `useGatewayPageTableLayout()`，把 `GatewayView.vue` 中 `useTableScrollHeights()`、`createBindPageTableContainerAction()` 和 `pageTableContainer.value` 写回逻辑收口到 gateway page table layout controller。`GatewayView.vue` 不再直接导入 `../composables/useTableScrollHeights`，页面只解构 `pageTableY`、`drawerTableY` 和 `bindPageTableContainer`。
- 行为锁定: 本任务不改变后端 API、请求函数、路由、认证、SQLite 数据、网关入口、表格高度计算公式、ResizeObserver/watch 行为、Ant Design Vue 表格参数或用户操作路径；只移动表格布局装配边界。
- 文件长度检查: `GatewayView.vue` 从任务 278 的 561 行降至 555 行，`gatewayPageTableLayoutController.ts` 为 30 行，`gatewayPageTableLayoutController.test.ts` 为 36 行，`tableScrollHeights.test.ts` 为 78 行。
- TDD 红灯: `node --test frontend/tests/gatewayPageTableLayoutController.test.ts` 首次失败 2 个测试，分别确认 `GatewayView.vue` 仍直连 table scroll helper，且缺少 `frontend/src/gatewayPageTableLayoutController.ts`，0 个通过，整体耗时 `5508.551834ms`。
- 中间边界校验: 新 controller 实现后，首次目标测试暴露 Node 原生 ESM 无法解析 controller 内部 extensionless 源码导入；未为了测试改动生产导入风格，改为源码契约检查。旧 `tableScrollHeights.test.ts` 原先要求 `GatewayView.vue` 直接持有 table scroll helper，已更新为检查新 controller 持有低层 helper，页面只接入 `useGatewayPageTableLayout()`。
- `node --test frontend/tests/gatewayPageTableLayoutController.test.ts frontend/tests/tableScrollHeights.test.ts`: 通过，5 个目标/相邻测试全部通过，最终耗时 `2940.358735ms`。
- `node --test frontend/tests/gatewayPageTableLayoutController.test.ts frontend/tests/tableScrollHeights.test.ts frontend/tests/gatewayPageBindingsController.test.ts frontend/tests/gatewayRouteManagementPageController.test.ts frontend/tests/gatewayOverlayPageController.test.ts frontend/tests/gatewayRouteManagementPageComponent.test.ts frontend/tests/gatewayRouteManagementTableComponent.test.ts`: 通过，15 个目标/相邻测试全部通过，最终耗时 `2187.418807ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，489 个网关相关测试全部通过，最终耗时 `4180.092949ms`。
- `node --test frontend/tests/*.test.ts`: 通过，550 个前端状态辅助测试全部通过，最终耗时 `3954.642091ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3461 个模块完成转换，Vite 构建耗时 `51.57s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPageTableLayoutController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPageTableLayoutController.test.ts` 均通过。
- 旧表格布局直连扫描: `rg -n "from '../composables/useTableScrollHeights'|const \\{ pageTableY, pageTableContainer, drawerTableY \\} = useTableScrollHeights\\(\\)|createBindPageTableContainerAction\\(\\{" frontend/src/views/GatewayView.vue frontend/src/gatewayPageTableLayoutController.ts frontend/tests/gateway*.test.ts frontend/tests/tableScrollHeights.test.ts` 未命中 `GatewayView.vue`；仅命中 table scroll helper 自身测试中的直接 helper 单元测试。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 279 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 280: gateway page section state 页面 section 状态收口

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPageSectionController.ts`、`frontend/tests/gatewayPageSectionController.test.ts`，以及 page shell、auto refresh、usage、runtime、auto refresh timer 等相邻网关 controller/component 测试。
- 改动: 新增 `useGatewayPageSectionState()`，把 `GatewayView.vue` 中 `section` prop 对应的 route/monitor 模式 computed 收口到 page section controller。`GatewayView.vue` 不再导入 `computed`，也不再直接比较 `props.section`，页面继续使用原 `isRouteManagement` 和 `isGatewayMonitor` 名称接线。
- 行为锁定: 本任务不改变后端 API、请求函数、路由、认证、SQLite 数据、网关入口、路由管理模式、监控模式、自动刷新判断或用户操作路径；只移动页面 section 状态派生边界。
- 文件长度检查: `GatewayView.vue` 仍为 555 行，`gatewayPageSectionController.ts` 为 15 行，`gatewayPageSectionController.test.ts` 为 27 行。
- TDD 红灯: `node --test frontend/tests/gatewayPageSectionController.test.ts` 首次失败 2 个测试，分别确认 `GatewayView.vue` 仍直接持有 section computed，且缺少 `frontend/src/gatewayPageSectionController.ts`，0 个通过，整体耗时 `397.155644ms`。
- `node --test frontend/tests/gatewayPageSectionController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `456.99131ms`。
- `node --test frontend/tests/gatewayPageSectionController.test.ts frontend/tests/gatewayPageShellComponent.test.ts frontend/tests/gatewayAutoRefreshPageController.test.ts frontend/tests/gatewayUsagePageController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayAutoRefreshTimerController.test.ts`: 通过，64 个目标/相邻测试全部通过，最终耗时 `7743.710976ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，491 个网关相关测试全部通过，最终耗时 `12460.591043ms`。
- `node --test frontend/tests/*.test.ts`: 通过，552 个前端状态辅助测试全部通过，最终耗时 `7286.375715ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3462 个模块完成转换，Vite 构建耗时 `44.64s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPageSectionController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPageSectionController.test.ts` 均通过。
- 旧 section 状态直连扫描: `rg -n "import \\{ computed|computed\\(\\(\\) => props\\.section|section === 'routes'|section === 'monitor'" frontend/src/views/GatewayView.vue frontend/src/gatewayPageSectionController.ts frontend/tests/gateway*.test.ts` 未命中 `GatewayView.vue`；只命中新 section controller、section controller 测试，以及相邻 derived state 测试中的无关 `computed/ref` 导入。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 280 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 281: gateway catalog refresh 页面目录刷新装配收口

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayCatalogRefreshPageController.ts`、`frontend/tests/gatewayCatalogRefreshPageController.test.ts`，以及 refresh、site groups、manual refresh、route summary、page lifecycle、runtime、auto refresh、visibility 等相邻网关 controller 测试。
- 改动: 新增 `useGatewayCatalogRefreshPageActions()`，把 `GatewayView.vue` 中路由摘要刷新和站点分组刷新两组 catalog refresh 装配聚合到 catalog refresh page controller。`GatewayView.vue` 不再直接接入 `useGatewayRouteSummaryPageActions()` 或 `useGatewaySiteGroupsPageActions()`，仍保留手动刷新 action 独立接入，低层摘要刷新、debounce 调度和站点分组失败静默行为继续委托原 controller。
- 行为锁定: 本任务不改变后端 API、请求函数、路由、认证、SQLite 数据、网关入口、路由摘要刷新请求、站点分组刷新请求、自动刷新、手动刷新或用户操作路径；只移动 catalog refresh 页面装配边界。
- 文件长度检查: `GatewayView.vue` 从任务 280 的 555 行降至 550 行，`gatewayCatalogRefreshPageController.ts` 为 16 行，`gatewayCatalogRefreshPageController.test.ts` 为 132 行。
- TDD 红灯: `node --test frontend/tests/gatewayCatalogRefreshPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayCatalogRefreshPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，0 个通过，整体耗时 `3680.271148ms`。
- 中间边界校验: 新 controller 实现后，目标测试首次暴露测试断言使用了 `GatewayRoute` 不存在的 `last_status` 字段；已改为断言现有摘要合并真实更新的 `package_remaining` 字段。相邻 refresh、site groups、runtime、auto refresh 和 visibility 测试仍按旧结构查找页面直连底层 controller，已更新为检查页面只接入 catalog refresh controller，底层行为仍留在原 controller。
- `node --test frontend/tests/gatewayCatalogRefreshPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `3798.43644ms`。
- `node --test frontend/tests/gatewayCatalogRefreshPageController.test.ts frontend/tests/gatewayRefreshPageController.test.ts frontend/tests/gatewaySiteGroupsPageController.test.ts frontend/tests/gatewayManualRefreshController.test.ts frontend/tests/gatewayRouteSummaryController.test.ts frontend/tests/gatewayPageLifecycleController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayAutoRefreshPageController.test.ts frontend/tests/gatewayAutoRefreshTimerController.test.ts frontend/tests/gatewayVisibilityPlatformController.test.ts`: 通过，83 个目标/相邻测试全部通过，最终耗时 `6023.206625ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，493 个网关相关测试全部通过，最终耗时 `7163.643379ms`。
- `node --test frontend/tests/*.test.ts`: 通过，554 个前端状态辅助测试全部通过，最终耗时 `7328.890419ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3463 个模块完成转换，Vite 构建耗时 `43.59s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayCatalogRefreshPageController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayCatalogRefreshPageController.test.ts` 均通过。
- 旧 catalog refresh 直连扫描: `rg -n "from '../gatewaySiteGroupsPageController'|useGatewaySiteGroupsPageActions\\(\\{|useGatewayRouteSummaryPageActions\\(\\{|import \\{[\\s\\S]*useGatewayRouteSummaryPageActions[\\s\\S]*\\} from '../gatewayRefreshPageController'|const \\{ handleSiteGroupsChanged \\} = useGatewaySiteGroupsPageActions" frontend/src/views/GatewayView.vue frontend/src/gatewayCatalogRefreshPageController.ts frontend/tests/gateway*.test.ts` 未命中 `GatewayView.vue`；仅命中底层 refresh/site-groups controller 自身单元测试中的直接调用。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 281 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 282: gateway refresh operations 刷新操作聚合收口

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRefreshOperationsPageController.ts`、`frontend/tests/gatewayRefreshOperationsPageController.test.ts`，以及 catalog refresh、manual refresh、route summary、site groups、page lifecycle、runtime 等相邻网关 controller 测试。
- 改动: 新增 `useGatewayRefreshOperationsPageActions()`，把 catalog refresh 与 manual refresh 两组刷新页面装配聚合到 refresh operations controller。`GatewayView.vue` 不再直接接入 `useGatewayCatalogRefreshPageActions()` 或 `useGatewayManualRefreshPageActions()`，只注入真实摘要请求、站点分组请求、`loadData` 和余额探测 helper；低层摘要刷新、分组刷新、手动刷新和错误暴露行为继续委托既有 controller。
- 行为锁定: 本任务不改变后端 API、请求函数、路由、认证、SQLite 数据、网关入口、路由摘要刷新请求、站点分组刷新请求、手动刷新、余额探测或用户操作路径；只移动 refresh operations 页面装配边界。
- 文件长度检查: `GatewayView.vue` 从任务 281 的 550 行降至 545 行，`gatewayRefreshOperationsPageController.ts` 为 19 行，`gatewayRefreshOperationsPageController.test.ts` 为 144 行。
- TDD 红灯: `node --test frontend/tests/gatewayRefreshOperationsPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayRefreshOperationsPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，0 个通过，整体耗时 `1568.635894ms`。
- 中间边界校验: 新 controller 实现后，相邻 catalog refresh、manual refresh、route summary 和 site groups 测试仍按旧结构要求 `GatewayView.vue` 直接调用底层 controller；已更新为检查页面只接入 refresh operations controller，refresh operations controller 继续聚合 catalog/manual 两组 controller。`gatewayRuntimeController.test.ts` 中两个旧手动刷新切片锚点也已收紧到当前 data operations 真实边界。
- `node --test frontend/tests/gatewayRefreshOperationsPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `1983.762422ms`。
- `node --test frontend/tests/gatewayRefreshOperationsPageController.test.ts frontend/tests/gatewayCatalogRefreshPageController.test.ts frontend/tests/gatewayRefreshPageController.test.ts frontend/tests/gatewayManualRefreshController.test.ts frontend/tests/gatewayRouteSummaryController.test.ts frontend/tests/gatewaySiteGroupsPageController.test.ts frontend/tests/gatewaySiteGroupsController.test.ts frontend/tests/gatewayPageLifecycleController.test.ts frontend/tests/gatewayRuntimeController.test.ts`: 通过，77 个目标/相邻测试全部通过，最终耗时 `3931.907228ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，495 个网关相关测试全部通过，最终耗时 `3868.270362ms`。
- `node --test frontend/tests/*.test.ts`: 通过，556 个前端状态辅助测试全部通过，最终耗时 `4239.77941ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3464 个模块完成转换，Vite 构建耗时 `40.41s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRefreshOperationsPageController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRefreshOperationsPageController.test.ts` 均无输出；`git diff --no-index` 因文件不同返回 1，未发现空白错误。
- 旧刷新直连扫描: `rg -n "useGatewayCatalogRefreshPageActions\\(|useGatewayManualRefreshPageActions\\(|from '../gatewayCatalogRefreshPageController'|from '../gatewayRefreshPageController'" frontend/src/views/GatewayView.vue frontend/src/gatewayRefreshOperationsPageController.ts frontend/tests/gateway*.test.ts` 未命中 `GatewayView.vue`；仅命中新 refresh operations controller 和底层 controller 自身单元测试中的直接调用。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 282 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 283: gateway route management operations 聚合收口

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRouteManagementOperationsPageController.ts`、`frontend/tests/gatewayRouteManagementOperationsPageController.test.ts`，以及 route probe、route operations、priority、route action、route config、route diagnosis、route logs、route balance 和 `gatewayViewModel.test.ts` 相邻网关测试。
- 改动: 新增 `useGatewayRouteManagementOperationsPageActions()`，把 route probe 与 route operations 两组页面装配聚合到 route management operations controller。`GatewayView.vue` 不再直接导入或调用 `useGatewayRouteProbePageActions()`、`useGatewayRouteOperationsPageActions()`，只向新的聚合 controller 注入原真实 API、state、dialog、drawer、reload、展示 helper 和通知入口；低层探测、余额、优先级、路由启停、配置、诊断和日志行为继续委托既有 page controller。
- 行为锁定: 本任务不改变后端 API、请求路径、路由、认证、SQLite 数据、Docker 端口、网关入口、探测/余额/优先级/路由操作/诊断/日志用户路径或错误暴露行为；只移动 route management operations 页面装配边界。
- 文件长度检查: `GatewayView.vue` 从任务 282 的 545 行降至 537 行，`gatewayRouteManagementOperationsPageController.ts` 为 18 行，`gatewayRouteManagementOperationsPageController.test.ts` 为 212 行。
- TDD 红灯: `node --test frontend/tests/gatewayRouteManagementOperationsPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayRouteManagementOperationsPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，0 个通过，1 个失败，整体耗时 `1941.826577ms`。
- 中间边界校验: 新 controller 实现后，首次相邻测试仍有 21 个旧结构断言要求 `GatewayView.vue` 直接导入或调用 route probe / route operations page controller；已更新为检查页面只接入 route management operations controller，并确认新聚合 controller 继续导入和调用原两组 page controller。`gatewayViewModel.test.ts` 的动作后重载注入切片也已更新到当前聚合边界。
- `node --test frontend/tests/gatewayRouteManagementOperationsPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `231.595786ms`。
- `node --test frontend/tests/gatewayRouteManagementOperationsPageController.test.ts frontend/tests/gatewayRouteProbePageController.test.ts frontend/tests/gatewayRouteOperationsPageController.test.ts frontend/tests/gatewayRouteProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRouteBalanceManualController.test.ts frontend/tests/gatewayRouteActionPageController.test.ts frontend/tests/gatewayRouteActionController.test.ts frontend/tests/gatewayRouteConfigPageController.test.ts frontend/tests/gatewayRouteConfigController.test.ts frontend/tests/gatewayPriorityPageController.test.ts frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayRouteInspectionPageController.test.ts frontend/tests/gatewayRouteDiagnosisController.test.ts frontend/tests/gatewayRouteLogsController.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，115 个目标/相邻测试全部通过，最终耗时 `7493.866379ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，497 个网关相关测试全部通过，最终耗时 `11949.2744ms`。
- `node --test frontend/tests/*.test.ts`: 通过，558 个前端状态辅助测试全部通过，最终耗时 `12226.264612ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3465 个模块完成转换，Vite 构建耗时 `1m 33s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRouteManagementOperationsPageController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRouteManagementOperationsPageController.test.ts` 均无输出；`git diff --no-index` 因文件不同返回 1，未发现空白错误。
- 旧 route probe / route operations 页面直连扫描: `rg -n "useGatewayRouteProbePageActions\\(|useGatewayRouteOperationsPageActions\\(|from '../gatewayRouteProbePageController'|from '../gatewayRouteOperationsPageController'" frontend/src/views/GatewayView.vue frontend/src/gatewayRouteManagementOperationsPageController.ts frontend/tests/gateway*.test.ts` 未命中 `GatewayView.vue`；仅命中新聚合 controller 和低层 page controller 自身单元测试中的直接调用。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 283 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 284: gateway runtime operations 聚合收口

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayRuntimeOperationsPageController.ts`、`frontend/src/gatewayDataOperationsPageController.ts`、`frontend/src/gatewayRealtimeOperationsPageController.ts`、`frontend/tests/gatewayRuntimeOperationsPageController.test.ts`，以及 data、realtime、initial data、usage、auto refresh、visibility、runtime、route operations 和 `gatewayViewModel.test.ts` 相邻网关测试。
- 改动: 新增 `useGatewayRuntimeOperationsPageActions()`，把 data operations 与 realtime operations 两组页面装配聚合到 runtime operations controller。`GatewayView.vue` 不再直接导入或调用 `useGatewayDataOperationsPageActions()`、`useGatewayRealtimeOperationsPageActions()`，只向新的聚合 controller 注入原真实 API、runtime state、controller slot、usage range、visibility platform、timer platform、展示 helper 和通知入口；低层初始加载、用量查询、活动请求加载、实时刷新、可见性刷新和自动刷新 timer 行为继续委托既有 page controller。
- 类型修正: 首次 `npm run build` 在 `vue-tsc -b` 阶段失败，原因是新聚合 controller 通过 `Parameters<typeof genericFunction>[0]` 组合泛型函数参数时把真实 `AbortController` 弱化为 `AbortControllerLike`，导致真实 API 的 `AbortSignal` 类型不匹配并报 `TS2322`。已改为导出 `GatewayDataOperationsPageOptions`、`GatewayRealtimeOperationsPageOptions`，并让 `useGatewayRuntimeOperationsPageActions<TController>()` 显式保留 `AbortController` 泛型。
- 行为锁定: 本任务不改变后端 API、请求路径、路由、认证、SQLite 数据、Docker 端口、网关入口、初始加载、用量查询、活动请求刷新、实时刷新、可见性刷新、自动刷新 timer 或错误暴露行为；只移动 runtime operations 页面装配边界。
- 文件长度检查: `GatewayView.vue` 从任务 283 的 537 行降至 515 行，`gatewayRuntimeOperationsPageController.ts` 为 29 行，`gatewayRuntimeOperationsPageController.test.ts` 为 200 行，`gatewayDataOperationsPageController.ts` 为 40 行，`gatewayRealtimeOperationsPageController.ts` 为 39 行。
- TDD 红灯: `node --test frontend/tests/gatewayRuntimeOperationsPageController.test.ts` 首次失败于缺少 `frontend/src/gatewayRuntimeOperationsPageController.ts`，错误为 `ERR_MODULE_NOT_FOUND`，0 个通过，1 个失败，整体耗时 `127.987015ms`。
- 中间边界校验: 新 controller 实现后，目标测试先通过；相邻静态测试仍有旧结构断言要求 `GatewayView.vue` 直接导入或调用 data / realtime operations page controller。已更新为检查页面只接入 runtime operations controller，并确认新聚合 controller 继续导入和调用原两组 page controller。
- `node --test frontend/tests/gatewayRuntimeOperationsPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `185.782627ms`。
- `node --test frontend/tests/gatewayRuntimeOperationsPageController.test.ts frontend/tests/gatewayDataOperationsPageController.test.ts frontend/tests/gatewayRealtimeOperationsPageController.test.ts frontend/tests/gatewayInitialDataPageController.test.ts frontend/tests/gatewayUsagePageController.test.ts frontend/tests/gatewayUsageRangeController.test.ts frontend/tests/gatewayAutoRefreshPageController.test.ts frontend/tests/gatewayAutoRefreshTimerController.test.ts frontend/tests/gatewayRealtimePageController.test.ts frontend/tests/gatewayVisibilityPlatformController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayViewModel.test.ts frontend/tests/gatewayRouteOperationsPageController.test.ts frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayRouteDiagnosisController.test.ts frontend/tests/gatewayRouteLogsController.test.ts frontend/tests/gatewayRouteConfigController.test.ts frontend/tests/gatewayRouteActionController.test.ts`: 通过，147 个目标/相邻测试全部通过，最终耗时 `1011.040567ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，499 个网关相关测试全部通过，最终耗时 `7385.855326ms`。
- `node --test frontend/tests/*.test.ts`: 通过，560 个前端状态辅助测试全部通过，最终耗时 `2878.678442ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3466 个模块完成转换，Vite 构建耗时 `44.16s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayRuntimeOperationsPageController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayRuntimeOperationsPageController.test.ts` 均无输出；`git diff --no-index` 因文件不同返回 1，未发现空白错误。
- 旧 data / realtime operations 页面直连扫描: `rg -n "useGatewayDataOperationsPageActions\\(|useGatewayRealtimeOperationsPageActions\\(|from '../gatewayDataOperationsPageController'|from '../gatewayRealtimeOperationsPageController'" frontend/src/views/GatewayView.vue frontend/src/gatewayRuntimeOperationsPageController.ts frontend/tests/gateway*.test.ts` 未命中 `GatewayView.vue`；仅命中新聚合 controller 和低层 page controller 自身单元测试中的直接调用。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 284 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 285: gateway page controller 页面总编排收口

日期: 2026-05-27

- 范围: `frontend/src/views/GatewayView.vue`、`frontend/src/gatewayPageController.ts`、`frontend/tests/gatewayPageController.test.ts`，以及 priority、route action、route config、route inspection、table layout 等相邻静态边界测试。
- 改动: 新增 `useGatewayPageController()`，把 `GatewayView.vue` 中剩余页面级 controller 编排收口到 gateway page controller。`GatewayView.vue` 只保留 props 默认值、toast/API base/time/browser platform 注入、`mount()` / `unmount()` 生命周期调用和 `GatewayPageShell` 渲染；请求、平台、state、展示派生、表格布局、access、route mutation、refresh/runtime/route/admin operations、page bindings 和 lifecycle 顺序均由 controller 统一装配。
- 初始化顺序修正: 新 controller 实现后，主动将 `runtimeActions` 初始化提前到 refresh actions 之前，避免阅读上形成 runtime actions 后置闭包依赖；route actions 与 refresh actions 的相互依赖仍只通过延迟执行的手动刷新闭包连接，构建和测试均已覆盖。
- 行为锁定: 本任务不改变后端 API、请求路径、路由、认证、SQLite 数据、Docker 端口、网关入口、自动刷新、请求取消、toast 顺序、弹窗/抽屉状态或用户操作路径；只移动 page-level 总编排边界。
- 文件长度检查: `GatewayView.vue` 从任务 284 的 515 行降至 63 行，`gatewayPageController.ts` 为 379 行，`gatewayPageController.test.ts` 为 49 行。`gatewayPageController.ts` 是页面总编排聚合边界，已超过 300 行软目标，后续不应继续承接新增业务逻辑，应按业务域继续拆分该 controller 内的 option/wiring 组装。
- TDD 红灯: `node --test frontend/tests/gatewayPageController.test.ts` 首次失败于 `GatewayView.vue` 尚未接入 `useGatewayPageController()` 且缺少 `frontend/src/gatewayPageController.ts`，0 个通过，2 个失败，整体耗时 `331.127503ms`。
- 中间边界校验: 新 controller 实现后，相邻静态测试仍有旧结构断言要求 `GatewayView.vue` 直接调用 route operations、priority、route config、route inspection 或 table layout 低层装配；已更新为检查页面只接入 page controller，page controller 继续持有现有聚合 controller 调用。
- `node --test frontend/tests/gatewayPageController.test.ts`: 通过，2 个目标测试全部通过，最终耗时 `432.81359ms`。
- `node --test frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayRouteInspectionPageController.test.ts frontend/tests/gatewayRouteConfigPageController.test.ts frontend/tests/gatewayRouteActionPageController.test.ts frontend/tests/gatewayPriorityPageController.test.ts`: 通过，10 个目标/相邻测试全部通过，最终耗时 `2871.756991ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，501 个网关相关测试全部通过，最终耗时 `9270.586642ms`。
- `node --test frontend/tests/*.test.ts`: 通过，562 个前端状态辅助测试全部通过，最终耗时 `4443.054766ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3467 个模块完成转换，Vite 构建耗时 `50.09s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPageController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPageController.test.ts` 均无输出；`git diff --no-index` 因文件不同返回 1，未发现空白错误。
- 旧页面总编排直连扫描: `rg -n "from '../(api|types|format|viewUtils|gateway|composables)|from '../gateway|useGateway[A-Za-z]+\\(|createGateway[A-Za-z]+\\(|mountGateway|unmountGateway|notifyGatewayOverviewChanged" frontend/src/views/GatewayView.vue` 仅命中 `gatewayPageController` 导入和 `useGatewayPageController()` 调用。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 285 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 286: gateway page shell bindings 页面装配收口

日期: 2026-05-27

- 范围: `frontend/src/gatewayPageController.ts`、`frontend/src/gatewayPageShellBindingsController.ts`、`frontend/tests/gatewayPageShellBindingsController.test.ts`、`frontend/tests/gatewayPageController.test.ts`、`frontend/tests/gatewayPageBindingsController.test.ts`，以及 monitor、route management、overlay、priority、route action、route config、route probe、usage、table layout 等相邻静态边界测试。
- 改动: 新增 `useGatewayPageShellBindings()`，把 `gatewayPageController.ts` 中原先直接传给 `useGatewayPageBindings()` 的 shell props/handlers option 映射下沉到独立 controller。`gatewayPageController.ts` 只保留 state、requests、platform、display state、display helpers、table layout、access、route mutation、refresh/runtime/route/admin operations、lifecycle 和 shell bindings controller 调用。
- 行为锁定: 本任务不改变后端 API、请求路径、路由、认证、SQLite 数据、Docker 端口、网关入口、自动刷新、请求取消、toast 顺序、弹窗/抽屉状态或用户操作路径；只移动 page shell props/handlers 映射边界。
- 文件长度检查: `GatewayView.vue` 保持 63 行，`gatewayPageController.ts` 从任务 285 的 379 行降至 295 行，`gatewayPageShellBindingsController.ts` 为 121 行，`gatewayPageShellBindingsController.test.ts` 为 29 行，`gatewayPageController.test.ts` 为 49 行，`gatewayPageBindingsController.test.ts` 为 176 行。
- TDD 红灯: `node --test frontend/tests/gatewayPageShellBindingsController.test.ts` 首次失败于缺少 `frontend/src/gatewayPageShellBindingsController.ts`，0 个通过，1 个失败，整体耗时 `671.682111ms`。
- 中间边界校验: 新 controller 实现后，完整网关测试首次仍有旧静态断言要求 `gatewayPageController.ts` 直接持有 `useGatewayPageBindings()`、`tableLayout.pageTableY`、`refreshActions.handleRefresh`、`routeActions.handleProbeAll`、`handleToggle`、`handlePriorityMove`、`handlePriorityPreset` 等 shell 映射。已更新为检查 `gatewayPageController.ts` 只接入 `useGatewayPageShellBindings()`，新 shell bindings controller 继续持有原映射。
- `node --test frontend/tests/gatewayPageShellBindingsController.test.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayPageBindingsController.test.ts`: 通过，5 个目标测试全部通过，最终耗时 `235.500599ms`。
- `node --test frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewayPriorityController.test.ts`: 通过，28 个目标/相邻测试全部通过，最终耗时 `666.805136ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，502 个网关相关测试全部通过，最终耗时 `4505.19972ms`。
- `node --test frontend/tests/*.test.ts`: 通过，563 个前端状态辅助测试全部通过，最终耗时 `6288.29609ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3468 个模块完成转换，Vite 构建耗时 `40.78s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPageShellBindingsController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPageShellBindingsController.test.ts` 均无输出；`git diff --no-index` 因文件不同返回 1，未发现空白错误。
- 旧 shell bindings 直连扫描: `rg -n "from './gatewayPageBindingsController'|useGatewayPageBindings\\(|useGatewayPageShellBindings\\(" frontend/src/gatewayPageController.ts frontend/src/gatewayPageShellBindingsController.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayPageBindingsController.test.ts frontend/tests/gatewayPageShellBindingsController.test.ts` 确认 `gatewayPageController.ts` 只调用 `useGatewayPageShellBindings()`，原 `useGatewayPageBindings()` 调用只保留在新 shell bindings controller 和底层单元测试。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 286 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 287: gateway page runtime actions 页面装配收口

日期: 2026-05-27

- 范围: `frontend/src/gatewayPageController.ts`、`frontend/src/gatewayPageRuntimeActionsController.ts`、`frontend/src/gatewayRuntimeOperationsPageController.ts`、`frontend/src/gatewayNoticeController.ts`、`frontend/src/gatewayPagePlatformController.ts`、`frontend/src/gatewayRouteMutationActionsController.ts`、`frontend/tests/gatewayPageRuntimeActionsController.test.ts`、`frontend/tests/gatewayPageController.test.ts`、`frontend/tests/gatewayRuntimeOperationsPageController.test.ts`，以及 runtime、data operations、realtime operations、auto refresh、usage、requests、visibility、route mutation 等相邻静态边界测试。
- 改动: 新增 `useGatewayPageRuntimeActions()`，把 `gatewayPageController.ts` 中原先直接传给 `useGatewayRuntimeOperationsPageActions()` 的 runtime operations option 映射下沉到独立 controller。`gatewayPageController.ts` 只保留 state、requests、display helpers、platform、route mutation actions、monitor mode、mounted、clock 和 notice action 的组合注入；底层 runtime 行为继续委托 `gatewayRuntimeOperationsPageController.ts`、`gatewayDataOperationsPageController.ts` 与 `gatewayRealtimeOperationsPageController.ts`。
- 类型边界: 为跨 controller 复用类型新增 `GatewayNoticeActions`、`GatewayPagePlatform`、`GatewayRouteMutationActions`，并导出 `GatewayRuntimeOperationsPageOptions`；未改变运行时代码路径或 action 返回结构。
- 行为锁定: 本任务不改变后端 API、请求路径、路由、认证、SQLite 数据、Docker 端口、网关入口、自动刷新、请求取消、toast 顺序、弹窗/抽屉状态或用户操作路径；只移动 runtime operations 页面装配配置。
- 文件长度检查: `GatewayView.vue` 保持 63 行，`gatewayPageController.ts` 从任务 286 的 295 行降至 254 行，新增 `gatewayPageRuntimeActionsController.ts` 为 89 行，`gatewayRuntimeOperationsPageController.ts` 为 29 行，`gatewayNoticeController.ts` 为 31 行，`gatewayPagePlatformController.ts` 为 55 行，`gatewayRouteMutationActionsController.ts` 为 70 行，`gatewayPageRuntimeActionsController.test.ts` 为 33 行。
- TDD 红灯: `node --test frontend/tests/gatewayPageRuntimeActionsController.test.ts` 首次失败于缺少 `frontend/src/gatewayPageRuntimeActionsController.ts`，0 个通过，1 个失败，整体耗时 `179.933853ms`。
- 中间边界校验: 新 controller 实现后，目标测试首先暴露旧断言仍要求 `gatewayPageController.ts` 直接持有 `useGatewayRuntimeOperationsPageActions()`；完整网关测试随后暴露 auto refresh、data operations、initial data、realtime、usage、requests、visibility、route mutation 等相邻静态测试仍在 page controller 中查找具体 runtime option。已统一改为检查 `gatewayPageController.ts` 只接入 `useGatewayPageRuntimeActions()`，新 runtime actions controller 继续持有原 runtime option 映射。
- `node --test frontend/tests/gatewayPageRuntimeActionsController.test.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayRuntimeOperationsPageController.test.ts`: 通过，5 个目标测试全部通过，最终耗时 `3573.511325ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，503 个网关相关测试全部通过，最终耗时 `4701.942742ms`。
- `node --test frontend/tests/*.test.ts`: 通过，564 个前端状态辅助测试全部通过，最终耗时 `5276.940975ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3469 个模块完成转换，Vite 构建耗时 `25.25s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPageRuntimeActionsController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPageRuntimeActionsController.test.ts` 均无输出；`git diff --no-index` 因文件不同返回 1，未发现空白错误。
- runtime 直连扫描: `rg -n "useGatewayRuntimeOperationsPageActions\\(|useGatewayPageRuntimeActions\\(|gatewayPageRuntimeActionsController|requestUsage: gatewayPageRequests|getGatewayOverview|startAutoRefreshRuntime|handleVisibilityRefresh" frontend/src/gatewayPageController.ts frontend/src/gatewayPageRuntimeActionsController.ts frontend/tests/gatewayPageRuntimeActionsController.test.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayRuntimeOperationsPageController.test.ts frontend/tests/gatewayRuntimeController.test.ts` 确认 `gatewayPageController.ts` 只调用 `useGatewayPageRuntimeActions()`，原 `useGatewayRuntimeOperationsPageActions()` 调用只保留在新 runtime actions controller 和底层 runtime operations 单元测试。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 287 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 288: gateway page admin actions 页面装配收口

日期: 2026-05-27

- 范围: `frontend/src/gatewayPageController.ts`、`frontend/src/gatewayPageAdminActionsController.ts`、`frontend/tests/gatewayPageAdminActionsController.test.ts`、`frontend/tests/gatewayPageController.test.ts`、`frontend/tests/gatewayAdminOperationsPageController.test.ts`，以及 add upstream、settings、settings page、sync、upstream page 等相邻静态边界测试。
- 改动: 新增 `useGatewayPageAdminActions()`，把 `gatewayPageController.ts` 中原先直接传给 `useGatewayAdminOperationsPageActions()` 的 admin operations option 映射下沉到独立 controller。`gatewayPageController.ts` 只保留 state、requests、route actions、runtime actions 和 notice action 的组合注入；底层同步路由、新增上游和设置保存行为继续委托 `gatewayAdminOperationsPageController.ts`、`gatewayUpstreamPageController.ts` 与 `gatewaySettingsPageController.ts`。
- 行为锁定: 本任务不改变后端 API、请求路径、路由、认证、SQLite 数据、Docker 端口、网关入口、同步路由、新增上游、设置保存、toast 顺序、弹窗/抽屉状态或用户操作路径；只移动 admin operations 页面装配配置。
- 文件长度检查: `GatewayView.vue` 保持 63 行，`gatewayPageController.ts` 从任务 287 的 254 行降至 243 行，新增 `gatewayPageAdminActionsController.ts` 为 41 行，`gatewayAdminOperationsPageController.ts` 为 30 行，`gatewayUpstreamPageController.ts` 为 73 行，`gatewaySettingsPageController.ts` 为 43 行，`gatewayPageAdminActionsController.test.ts` 为 34 行。
- TDD 红灯: `node --test frontend/tests/gatewayPageAdminActionsController.test.ts` 首次失败于缺少 `frontend/src/gatewayPageAdminActionsController.ts`，0 个通过，1 个失败，整体耗时 `123.210022ms`。
- 中间边界校验: 新 controller 实现后，完整网关测试首先暴露 add upstream、settings、settings page、sync、upstream page 等旧静态断言仍要求 `gatewayPageController.ts` 直接持有 `useGatewayAdminOperationsPageActions()` 与具体 admin option。已统一改为检查 `gatewayPageController.ts` 只接入 `useGatewayPageAdminActions()`，新 admin actions controller 继续持有原 admin option 映射。
- `node --test frontend/tests/gatewayPageAdminActionsController.test.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayAdminOperationsPageController.test.ts`: 通过，5 个目标测试全部通过，最终耗时 `770.413594ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，504 个网关相关测试全部通过，最终耗时 `4817.203619ms`。
- `node --test frontend/tests/*.test.ts`: 通过，565 个前端状态辅助测试全部通过，最终耗时 `5895.708637ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3470 个模块完成转换，Vite 构建耗时 `29.27s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPageAdminActionsController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPageAdminActionsController.test.ts` 均无输出；`git diff --no-index` 因文件不同返回 1，未发现空白错误。
- admin 直连扫描: `rg -n "useGatewayAdminOperationsPageActions\\(|useGatewayPageAdminActions\\(|gatewayPageAdminActionsController|requestCreateSite: gatewayPageRequests|requestSaveSettings: gatewayPageRequests|requestSync: gatewayPageRequests" frontend/src/gatewayPageController.ts frontend/src/gatewayPageAdminActionsController.ts frontend/tests/gatewayPageAdminActionsController.test.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayAdminOperationsPageController.test.ts frontend/tests/gatewayAddUpstreamController.test.ts frontend/tests/gatewaySettingsController.test.ts frontend/tests/gatewaySettingsPageController.test.ts frontend/tests/gatewaySyncController.test.ts frontend/tests/gatewayUpstreamPageController.test.ts` 确认 `gatewayPageController.ts` 只调用 `useGatewayPageAdminActions()`，原 `useGatewayAdminOperationsPageActions()` 调用只保留在新 admin actions controller 和底层 admin operations 单元测试。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 288 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 289: gateway page access state 页面装配收口

日期: 2026-05-27

- 范围: `frontend/src/gatewayPageController.ts`、`frontend/src/gatewayPageAccessStateController.ts`、`frontend/tests/gatewayPageAccessStateController.test.ts`、`frontend/tests/gatewayPageController.test.ts`、`frontend/tests/gatewayAccessPageController.test.ts`、`frontend/tests/gatewayAccessController.test.ts`、`frontend/tests/gatewayActivityController.test.ts`，以及 access/activity 相邻静态边界测试。
- 改动: 新增 `useGatewayPageAccessState()`，把 `gatewayPageController.ts` 中原先直接传给 `useGatewayAccessPageState()` 的 access page state option 映射下沉到独立 controller。`gatewayPageController.ts` 只保留 state、API base、page platform 和 notice action 的组合注入；底层网关 URL、Codex URL、API Key mask 和复制行为继续委托 `gatewayAccessPageController.ts`、`gatewayAccessController.ts` 与 `gatewayActivityController.ts`。
- 行为锁定: 本任务不改变后端 API、请求路径、路由、认证、SQLite 数据、Docker 端口、网关入口、网关地址展示、API Key 复制、请求 URL 复制、活动 URL 复制、toast 顺序或用户操作路径；只移动 access page state 页面装配配置。
- 文件长度检查: `GatewayView.vue` 保持 63 行，`gatewayPageController.ts` 从任务 288 的 243 行降至 242 行，新增 `gatewayPageAccessStateController.ts` 为 26 行，`gatewayAccessPageController.ts` 为 58 行，`gatewayPageAccessStateController.test.ts` 为 19 行。
- TDD 红灯: `node --test frontend/tests/gatewayPageAccessStateController.test.ts` 首次失败于缺少 `frontend/src/gatewayPageAccessStateController.ts`，0 个通过，1 个失败，整体耗时 `121.530897ms`。
- 中间边界校验: 新 controller 实现后，access、activity 和 page controller 静态断言仍需要从 `gatewayPageController.ts` 直连 `useGatewayAccessPageState()` 迁移为检查 `gatewayPageController.ts` 只接入 `useGatewayPageAccessState()`，新 access state controller 继续持有原 settings/platform/notice option 映射。
- `node --test frontend/tests/gatewayPageAccessStateController.test.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayAccessPageController.test.ts frontend/tests/gatewayAccessController.test.ts frontend/tests/gatewayActivityController.test.ts`: 通过，20 个目标/相邻测试全部通过，最终耗时 `13778.384718ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，505 个网关相关测试全部通过，最终耗时 `4430.288532ms`。
- `node --test frontend/tests/*.test.ts`: 通过，566 个前端状态辅助测试全部通过，最终耗时 `4351.076451ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3471 个模块完成转换，Vite 构建耗时 `44.47s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPageAccessStateController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPageAccessStateController.test.ts` 均无输出；`git diff --no-index` 因文件不同返回 1，未发现空白错误。
- access 直连扫描: `rg -n "useGatewayAccessPageState\\(|useGatewayPageAccessState\\(|gatewayPageAccessStateController|settingsForm: state\\.settingsDialog\\.form|location: gatewayPagePlatform\\.location|writeText: gatewayPagePlatform\\.writeText" frontend/src/gatewayPageController.ts frontend/src/gatewayPageAccessStateController.ts frontend/tests/gatewayPageAccessStateController.test.ts frontend/tests/gatewayAccessPageController.test.ts frontend/tests/gatewayAccessController.test.ts frontend/tests/gatewayActivityController.test.ts frontend/tests/gatewayPageController.test.ts` 确认 `gatewayPageController.ts` 只调用 `useGatewayPageAccessState()`，原 `useGatewayAccessPageState()` 调用只保留在新 access state controller 和底层 access page 单元测试。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 289 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 290: gateway page refresh actions 页面装配收口

日期: 2026-05-27

- 范围: `frontend/src/gatewayPageController.ts`、`frontend/src/gatewayPageRefreshActionsController.ts`、`frontend/tests/gatewayPageRefreshActionsController.test.ts`、`frontend/tests/gatewayPageController.test.ts`、`frontend/tests/gatewayRefreshOperationsPageController.test.ts`、`frontend/tests/gatewayCatalogRefreshPageController.test.ts`、`frontend/tests/gatewayRefreshPageController.test.ts`、`frontend/tests/gatewayManualRefreshController.test.ts`、`frontend/tests/gatewaySiteGroupsController.test.ts`、`frontend/tests/gatewaySiteGroupsPageController.test.ts`、`frontend/tests/gatewayRouteSummaryController.test.ts`、`frontend/tests/gatewayRouteProbePageController.test.ts`，以及 refresh/site-groups/route-summary/manual-refresh/route-probe 相邻静态边界测试。
- 改动: 新增 `useGatewayPageRefreshActions()`，把 `gatewayPageController.ts` 中原先直接传给 `useGatewayRefreshOperationsPageActions()` 的 refresh operations option 映射下沉到独立 controller。`gatewayPageController.ts` 只保留 state、requests、runtime actions、延迟读取 route actions 和 notice action 的组合注入；底层路由摘要刷新、站点分组刷新、手动刷新和静默余额探测继续委托 `gatewayRefreshOperationsPageController.ts`、`gatewayCatalogRefreshPageController.ts` 与 `gatewayRefreshPageController.ts`。
- 循环依赖边界: `refreshActions` 与 `routeActions` 仍存在互相引用，新增 wrapper 使用 `getRouteActions: () => routeActions` 保持原先同作用域 `let routeActions` 的延迟读取语义，避免在 `routeActions` 初始化前固化未定义值。
- 行为锁定: 本任务不改变后端 API、请求路径、路由、认证、SQLite 数据、Docker 端口、网关入口、手动刷新、站点分组刷新、路由摘要刷新、余额探测、toast 顺序或用户操作路径；只移动 refresh operations 页面装配配置。
- 文件长度检查: `GatewayView.vue` 保持 63 行，`gatewayPageController.ts` 从任务 289 的 242 行降至 237 行，新增 `gatewayPageRefreshActionsController.ts` 为 35 行，`gatewayRefreshOperationsPageController.ts` 为 19 行，`gatewayPageRefreshActionsController.test.ts` 为 21 行。
- TDD 红灯: `node --test frontend/tests/gatewayPageRefreshActionsController.test.ts` 首次失败于缺少 `frontend/src/gatewayPageRefreshActionsController.ts`，0 个通过，1 个失败，整体耗时 `359.790773ms`。
- 中间边界校验: 新 controller 实现后，refresh、catalog refresh、manual refresh、site groups、route summary 和 route probe 静态断言仍需要从 `gatewayPageController.ts` 直连 `useGatewayRefreshOperationsPageActions()` 迁移为检查 `gatewayPageController.ts` 只接入 `useGatewayPageRefreshActions()`，新 refresh actions controller 继续持有原 request/site-groups/load/probe option 映射。
- `node --test frontend/tests/gatewayPageRefreshActionsController.test.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayRefreshOperationsPageController.test.ts frontend/tests/gatewayCatalogRefreshPageController.test.ts frontend/tests/gatewayRefreshPageController.test.ts frontend/tests/gatewayManualRefreshController.test.ts frontend/tests/gatewaySiteGroupsController.test.ts frontend/tests/gatewaySiteGroupsPageController.test.ts frontend/tests/gatewayRouteSummaryController.test.ts frontend/tests/gatewayRouteProbePageController.test.ts`: 通过，28 个目标/相邻测试全部通过，最终耗时 `424.870925ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，506 个网关相关测试全部通过，最终耗时 `3932.957333ms`。
- `node --test frontend/tests/*.test.ts`: 通过，567 个前端状态辅助测试全部通过，最终耗时 `4246.760512ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3472 个模块完成转换，Vite 构建耗时 `38.53s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPageRefreshActionsController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPageRefreshActionsController.test.ts` 均无输出；`git diff --no-index` 因文件不同返回 1，未发现空白错误。
- refresh 直连扫描: `rg -n "useGatewayRefreshOperationsPageActions\\(|useGatewayPageRefreshActions\\(|gatewayPageRefreshActionsController|requestSummaries: gatewayPageRequests\\.refreshSiteSummaries|requestSiteGroups: gatewayPageRequests\\.getSiteGroups|loadGatewayData: \\(\\) => runtimeActions\\.loadData\\(\\)|getRouteActions: \\(\\) => routeActions|probeRouteBalances: \\(routeIds, options\\) => getRouteActions\\(\\)\\.probeRouteBalances" frontend/src/gatewayPageController.ts frontend/src/gatewayPageRefreshActionsController.ts frontend/tests/gatewayPageRefreshActionsController.test.ts frontend/tests/gatewayRefreshOperationsPageController.test.ts frontend/tests/gatewayCatalogRefreshPageController.test.ts frontend/tests/gatewayRefreshPageController.test.ts frontend/tests/gatewayManualRefreshController.test.ts frontend/tests/gatewaySiteGroupsController.test.ts frontend/tests/gatewaySiteGroupsPageController.test.ts frontend/tests/gatewayRouteSummaryController.test.ts frontend/tests/gatewayRouteProbePageController.test.ts` 确认 `gatewayPageController.ts` 只调用 `useGatewayPageRefreshActions()`，原 `useGatewayRefreshOperationsPageActions()` 调用只保留在新 refresh actions controller 和底层 refresh operations 单元测试。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 290 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 291: gateway page route actions 页面装配收口

日期: 2026-05-28

- 范围: `frontend/src/gatewayPageController.ts`、`frontend/src/gatewayPageRouteActionsController.ts`、`frontend/tests/gatewayPageRouteActionsController.test.ts`、`frontend/tests/gatewayPageController.test.ts`、`frontend/tests/gatewayPriorityPageController.test.ts`、`frontend/tests/gatewayRouteActionPageController.test.ts`、`frontend/tests/gatewayRouteInspectionPageController.test.ts`、`frontend/tests/gatewayRouteConfigPageController.test.ts`、`frontend/tests/gatewayRuntimeController.test.ts`、`frontend/tests/gatewayViewModel.test.ts`，以及 priority、route action、route config、route inspection、route probe、route balance、route logs、route management operations 等相邻静态边界测试。
- 改动: 新增 `useGatewayPageRouteActions()`，把 `gatewayPageController.ts` 中原先直接传给 `useGatewayRouteManagementOperationsPageActions()` 的 route management operations option 映射下沉到独立 controller。`gatewayPageController.ts` 只保留 state、requests、display helpers、platform、route mutation actions、refresh actions、runtime actions、clock 和 notice action 的组合注入；底层路由探测、余额探测、优先级、路由启停、路由配置、诊断和日志行为继续委托 `gatewayRouteManagementOperationsPageController.ts`、`gatewayRouteProbePageController.ts` 与 `gatewayRouteOperationsPageController.ts`。
- 循环依赖边界: `refreshActions` 仍通过 `getRouteActions: () => routeActions` 延迟读取 route actions；route actions wrapper 接收已构造的 `refreshActions`，保持原先同作用域 `let routeActions` 的初始化顺序语义。
- 行为锁定: 本任务不改变后端 API、请求路径、路由、认证、SQLite 数据、Docker 端口、网关入口、探测、余额、优先级、路由启停、诊断、日志、toast 顺序或用户操作路径；只移动 route operations 页面装配配置。
- 文件长度检查: `GatewayView.vue` 保持 63 行，`gatewayPageController.ts` 从任务 290 的 237 行降至 184 行，新增 `gatewayPageRouteActionsController.ts` 为 101 行，`gatewayPageRouteActionsController.test.ts` 为 38 行。
- TDD 红灯: `node --test frontend/tests/gatewayPageRouteActionsController.test.ts` 首次失败于缺少 `frontend/src/gatewayPageRouteActionsController.ts`，0 个通过，1 个失败，整体耗时 `149.495703ms`。
- 中间边界校验: 新 controller 实现后，priority、route action、route config、route inspection、route probe、route balance、route logs、route management operations、runtime 和 view model 等旧静态断言仍要求 `gatewayPageController.ts` 直接持有 `useGatewayRouteManagementOperationsPageActions()` 或具体 route option。已统一改为检查 `gatewayPageController.ts` 只接入 `useGatewayPageRouteActions()`，新 route actions controller 继续持有原 route operations option 映射。
- `node --test frontend/tests/gatewayPageRouteActionsController.test.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayPriorityPageController.test.ts frontend/tests/gatewayRouteActionPageController.test.ts frontend/tests/gatewayRouteInspectionPageController.test.ts frontend/tests/gatewayRouteConfigPageController.test.ts frontend/tests/gatewayPriorityController.test.ts frontend/tests/gatewayRouteActionController.test.ts frontend/tests/gatewayRouteDiagnosisController.test.ts frontend/tests/gatewayRouteLogsController.test.ts frontend/tests/gatewayRouteBalanceManualController.test.ts frontend/tests/gatewayRouteProbeController.test.ts frontend/tests/gatewayRouteConfigController.test.ts frontend/tests/gatewayRouteBalanceProbeController.test.ts frontend/tests/gatewayRouteBalanceProbeRuntimeController.test.ts frontend/tests/gatewayRouteOperationsPageController.test.ts frontend/tests/gatewayRouteProbePageController.test.ts frontend/tests/gatewayRouteManagementOperationsPageController.test.ts`: 通过，110 个目标/相邻测试全部通过，最终耗时 `3398.894668ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，507 个网关相关测试全部通过，最终耗时 `2546.554395ms`。
- `node --test frontend/tests/*.test.ts`: 通过，568 个前端状态辅助测试全部通过，最终耗时 `2847.721066ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3473 个模块完成转换，Vite 构建耗时 `39.34s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPageRouteActionsController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPageRouteActionsController.test.ts` 均无输出；`git diff --no-index` 因文件不同返回 1，未发现空白错误。
- route actions 直连扫描: `rg -n "useGatewayRouteManagementOperationsPageActions\\(|useGatewayPageRouteActions\\(|gatewayPageRouteActionsController|requestProbe: gatewayPageRequests\\.probeGatewayRoute|requestBalance: gatewayPageRequests\\.probeGatewayRouteBalance|confirmWindow: gatewayPagePlatform\\.confirmWindow|requestDiagnosis: gatewayPageRequests\\.diagnoseGatewayRoute|requestLogs: gatewayPageRequests\\.getGatewayRouteLogs|reloadGatewayData: runtimeActions\\.reloadGatewayDataAfterAction" frontend/src/gatewayPageController.ts frontend/src/gatewayPageRouteActionsController.ts frontend/tests/gatewayPageRouteActionsController.test.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayRouteActionPageController.test.ts frontend/tests/gatewayPriorityPageController.test.ts frontend/tests/gatewayRouteInspectionPageController.test.ts frontend/tests/gatewayRouteConfigPageController.test.ts frontend/tests/gatewayRuntimeController.test.ts frontend/tests/gatewayViewModel.test.ts` 确认 `gatewayPageController.ts` 只调用 `useGatewayPageRouteActions()`，原 `useGatewayRouteManagementOperationsPageActions()` 调用只保留在新 route actions controller 和底层 route management operations 单元测试。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 291 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 292: gateway page lifecycle actions 页面装配收口

日期: 2026-05-28

- 范围: `frontend/src/gatewayPageController.ts`、`frontend/src/gatewayPageLifecycleActionsController.ts`、`frontend/tests/gatewayPageLifecycleActionsController.test.ts`、`frontend/tests/gatewayPageController.test.ts`、`frontend/tests/gatewayPageLifecycleController.test.ts`、`frontend/tests/gatewayVisibilityPlatformController.test.ts`。
- 改动: 新增 `useGatewayPageLifecycleActions()`，把 `gatewayPageController.ts` 中原先直接传给 `mountGatewayPageLifecycle()` 和 `unmountGatewayPageLifecycle()` 的 lifecycle option 映射下沉到独立 controller。`gatewayPageController.ts` 只保留 mounted flag 闭包和生命周期 action 聚合调用；底层挂载顺序、页面事件监听、初始加载、自动刷新、路由摘要刷新、请求 abort、探测 state dispose 和事件移除继续委托 `gatewayPageLifecycleController.ts` 与 `gatewayVisibilityPlatformController.ts`。
- 行为锁定: 本任务不改变后端 API、请求路径、路由、认证、SQLite 数据、Docker 端口、网关入口、挂载顺序、卸载清理顺序、请求取消、自动刷新、站点分组刷新、可见性刷新或用户操作路径；只移动 lifecycle 页面装配配置。
- 文件长度检查: `GatewayView.vue` 保持 63 行，`gatewayPageController.ts` 从任务 291 的 184 行降至 162 行，新增 `gatewayPageLifecycleActionsController.ts` 为 56 行，`gatewayPageLifecycleActionsController.test.ts` 为 43 行。
- TDD 红灯: `node --test frontend/tests/gatewayPageLifecycleActionsController.test.ts` 首次失败于缺少 `frontend/src/gatewayPageLifecycleActionsController.ts`，0 个通过，1 个失败，整体耗时 `210.60106ms`。
- 中间边界校验: 新 controller 实现后，page controller、lifecycle controller 和 visibility platform 相关静态断言从检查 `gatewayPageController.ts` 直连 `mountGatewayPageLifecycle()`、`unmountGatewayPageLifecycle()` 和 `gatewayPagePlatform.lifecycle.addPageListeners`，统一迁移为检查 `gatewayPageController.ts` 只接入 `useGatewayPageLifecycleActions()`，新 lifecycle actions controller 继续持有原 lifecycle option 映射。
- `node --test frontend/tests/gatewayPageLifecycleActionsController.test.ts`: 通过，1 个目标测试通过，最终耗时 `174.737082ms`。
- `node --test frontend/tests/gatewayPageLifecycleActionsController.test.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayPageLifecycleController.test.ts frontend/tests/gatewayVisibilityPlatformController.test.ts`: 通过，11 个目标/相邻测试全部通过，最终耗时 `315.691524ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，508 个网关相关测试全部通过，最终耗时 `7896.084171ms`。
- `node --test frontend/tests/*.test.ts`: 通过，569 个前端状态辅助测试全部通过，最终耗时 `3475.555511ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3474 个模块完成转换，Vite 构建耗时 `40.92s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPageLifecycleActionsController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPageLifecycleActionsController.test.ts` 均无输出；`git diff --no-index` 因文件不同返回 1，未发现空白错误。
- lifecycle actions 直连扫描: `rg -n "mountGatewayPageLifecycle\\(|unmountGatewayPageLifecycle\\(|useGatewayPageLifecycleActions\\(|gatewayPageLifecycleActionsController|addPageListeners: gatewayPagePlatform\\.lifecycle\\.addPageListeners|removePageListeners: gatewayPagePlatform\\.lifecycle\\.removePageListeners|abortLoadData: state\\.gatewayRuntime\\.loadDataControllerSlot\\.abortAndClear|disposeRouteProbeState: state\\.routeProbeState\\.dispose" frontend/src/gatewayPageController.ts frontend/src/gatewayPageLifecycleActionsController.ts frontend/tests/gatewayPageLifecycleActionsController.test.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayPageLifecycleController.test.ts frontend/tests/gatewayVisibilityPlatformController.test.ts` 确认 `gatewayPageController.ts` 只调用 `useGatewayPageLifecycleActions()`，原 lifecycle mount/unmount 调用和平台监听/清理 option 只保留在新 lifecycle actions controller、底层 lifecycle controller 单元测试和相邻静态断言中。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 292 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 293: gateway page foundation 页面基础装配收口

日期: 2026-05-28

- 范围: `frontend/src/gatewayPageController.ts`、`frontend/src/gatewayPageFoundationController.ts`、`frontend/tests/gatewayPageFoundationController.test.ts`、`frontend/tests/gatewayPageController.test.ts`、`frontend/tests/gatewayPageSectionController.test.ts`、`frontend/tests/gatewayPageStateController.test.ts`、`frontend/tests/gatewayPagePlatformController.test.ts`、`frontend/tests/gatewayPageRequestsController.test.ts`、`frontend/tests/gatewayPageDisplayHelpersController.test.ts`、`frontend/tests/gatewayPageTableLayoutController.test.ts`、`frontend/tests/gatewayVisibilityPlatformController.test.ts`、`frontend/tests/tableScrollHeights.test.ts`，以及 add upstream、route config、view model 等相邻静态边界测试。
- 改动: 新增 `useGatewayPageFoundation()`，把 `gatewayPageController.ts` 中基础 page wiring 下沉到独立 controller，包括 section state、notice actions、requests adapter fallback、display helpers、browser platform、page state、table layout 和 mounted 读写器。`gatewayPageController.ts` 只保留业务域 controller 的组合顺序；底层 section、notice、requests、platform、state 和 table layout 行为继续委托原 controller。
- 行为锁定: 本任务不改变后端 API、请求路径、路由、认证、SQLite 数据、Docker 端口、网关入口、页面 section 判定、toast 执行、请求适配、浏览器平台注入、页面 state 默认值、表格高度计算、mounted 状态语义或用户操作路径；只移动基础装配配置。
- 文件长度检查: `GatewayView.vue` 保持 63 行，`gatewayPageController.ts` 从任务 292 的 162 行降至 160 行，新增 `gatewayPageFoundationController.ts` 为 55 行，`gatewayPageFoundationController.test.ts` 为 42 行。
- TDD 红灯: `node --test frontend/tests/gatewayPageFoundationController.test.ts` 首次失败于缺少 `frontend/src/gatewayPageFoundationController.ts`，0 个通过，1 个失败，整体耗时 `130.0546ms`。
- 中间边界校验: 新 controller 实现后，page controller、section、state、platform、requests、display helpers、table layout、visibility、add upstream、route config 和 view model 等旧静态断言仍要求 `gatewayPageController.ts` 直接持有 `useGatewayPageState()`、`createGatewayPagePlatform()`、`createGatewayPageRequests()`、`createGatewayPageDisplayHelpers()`、`useGatewayPageTableLayout()` 或 `createGatewayNoticeActions()`。已统一改为检查 `gatewayPageController.ts` 只接入 `useGatewayPageFoundation()`，新 foundation controller 继续持有原基础装配映射。
- `node --test frontend/tests/gatewayPageFoundationController.test.ts`: 通过，1 个目标测试通过，最终耗时 `141.275173ms`。
- `node --test frontend/tests/gatewayPageFoundationController.test.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayPageSectionController.test.ts frontend/tests/gatewayPageStateController.test.ts frontend/tests/gatewayViewModel.test.ts`: 通过，16 个目标/相邻测试全部通过，最终耗时 `6665.326439ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，509 个网关相关测试全部通过，最终耗时 `3080.910518ms`。
- `node --test frontend/tests/*.test.ts`: 通过，570 个前端状态辅助测试全部通过，最终耗时 `2826.410879ms`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3475 个模块完成转换，Vite 构建耗时 `39.41s`。仍有既有大 chunk 和 plugin timing 警告。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPageFoundationController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPageFoundationController.test.ts` 均无输出；`git diff --no-index` 因文件不同返回 1，未发现空白错误。
- foundation 直连扫描: `rg -n "useGatewayPageFoundation\\(|gatewayPageFoundationController|useGatewayPageSectionState\\(props\\)|createGatewayNoticeActions\\(\\{ toast \\}\\)|requests \\?\\? createGatewayPageRequests\\(\\)|createGatewayPageDisplayHelpers\\(\\)|createGatewayPagePlatform\\(\\{|useGatewayPageState\\(\\)|useGatewayPageTableLayout\\(\\)|setMounted: \\(nextMounted|isMounted: \\(\\) => mounted" frontend/src/gatewayPageController.ts frontend/src/gatewayPageFoundationController.ts frontend/tests/gatewayPageFoundationController.test.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayPageSectionController.test.ts frontend/tests/gatewayPageStateController.test.ts frontend/tests/gatewayPagePlatformController.test.ts frontend/tests/gatewayPageRequestsController.test.ts frontend/tests/gatewayPageDisplayHelpersController.test.ts frontend/tests/gatewayPageTableLayoutController.test.ts frontend/tests/gatewayVisibilityPlatformController.test.ts frontend/tests/tableScrollHeights.test.ts` 确认 `gatewayPageController.ts` 只调用 `useGatewayPageFoundation()`，原基础装配调用只保留在新 foundation controller、低层 controller 自身单元测试和相邻静态断言中。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 293 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 294: gateway page operations 操作装配收口

日期: 2026-05-28

- 范围: `frontend/src/gatewayPageController.ts`、`frontend/src/gatewayPageOperationsController.ts`、`frontend/tests/gatewayPageOperationsController.test.ts`、`frontend/tests/gatewayPageController.test.ts`、`frontend/tests/gatewayPageRuntimeActionsController.test.ts`、`frontend/tests/gatewayPageRefreshActionsController.test.ts`、`frontend/tests/gatewayPageRouteActionsController.test.ts`、`frontend/tests/gatewayPageAdminActionsController.test.ts`，以及 runtime、refresh、route、admin 四组下游相邻静态边界测试。
- 改动: 新增 `useGatewayPageOperations()`，把 `gatewayPageController.ts` 中 runtime actions、refresh actions、route actions、admin actions 四组页面操作装配下沉到独立 controller。`gatewayPageController.ts` 继续负责 foundation、access state、route mutation、display state、operations、shell bindings 和 lifecycle 的顶层组合；refresh 与 route actions 的延迟读取关系继续由 `getRouteActions: () => routeActions` 保持。
- 行为锁定: 本任务不改变后端 API、请求路径、路由、认证、SQLite 数据、Docker 端口、网关入口、请求取消、自动刷新、路由探测、余额探测、优先级、设置保存、新增上游、toast 顺序或用户操作路径；只移动四组操作 action 的 option/wiring。
- 文件长度检查: `GatewayView.vue` 保持 63 行，`gatewayPageController.ts` 从任务 293 的 160 行降至 136 行，新增 `gatewayPageOperationsController.ts` 为 87 行，`gatewayPageOperationsController.test.ts` 为 38 行。
- TDD 红灯: `node --test frontend/tests/gatewayPageOperationsController.test.ts` 首次失败于缺少 `frontend/src/gatewayPageOperationsController.ts`，0 个通过，1 个失败，整体耗时 `157.486279ms`。
- 中间边界校验: 新 controller 实现后，完整网关测试首次暴露 runtime、refresh、route、admin 及其下游相邻静态断言仍要求 `gatewayPageController.ts` 直接持有 `useGatewayPageRuntimeActions()`、`useGatewayPageRefreshActions()`、`useGatewayPageRouteActions()` 或 `useGatewayPageAdminActions()`。已统一改为检查 page controller 只接入 `useGatewayPageOperations()`，新 operations controller 继续持有四组 action wiring。
- `node --test frontend/tests/gatewayPageOperationsController.test.ts`: 通过，1 个目标测试通过，最终耗时 `193.016952ms`。
- `node --test frontend/tests/gatewayPageOperationsController.test.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayPageRuntimeActionsController.test.ts frontend/tests/gatewayPageRefreshActionsController.test.ts frontend/tests/gatewayPageRouteActionsController.test.ts frontend/tests/gatewayPageAdminActionsController.test.ts frontend/tests/gatewayPageShellBindingsController.test.ts frontend/tests/gatewayPageLifecycleActionsController.test.ts`: 通过，9 个目标/相邻测试全部通过，最终耗时 `253.992407ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，510 个网关相关测试全部通过，最终耗时 `2888.667412ms`。
- `node --test frontend/tests/*.test.ts`: 通过，571 个前端状态辅助测试全部通过，最终耗时 `3835.826827ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3476 个模块完成转换，Vite 构建耗时 `54.59s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPageOperationsController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPageOperationsController.test.ts` 均无输出；`git diff --no-index` 因文件不同返回 1，未发现空白错误。
- operations 直连扫描: `rg -n "useGatewayPageRuntimeActions\\(\\{|useGatewayPageRefreshActions\\(\\{|useGatewayPageRouteActions\\(\\{|useGatewayPageAdminActions\\(\\{|from './gatewayPage(Runtime|Refresh|Route|Admin)ActionsController\\.ts'" frontend/src/gatewayPageController.ts frontend/src/gatewayPageOperationsController.ts frontend/tests/gatewayPageOperationsController.test.ts frontend/tests/gatewayPageController.test.ts` 确认 `gatewayPageController.ts` 不再直接调用四组 action controller，四组操作装配只保留在 `gatewayPageOperationsController.ts` 和对应测试中。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 294 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 295: gateway page view state 页面视图状态装配收口

日期: 2026-05-28

- 范围: `frontend/src/gatewayPageController.ts`、`frontend/src/gatewayPageViewStateController.ts`、`frontend/tests/gatewayPageViewStateController.test.ts`、`frontend/tests/gatewayPageController.test.ts`、`frontend/tests/gatewayPageAccessStateController.test.ts`、`frontend/tests/gatewayAccessPageController.test.ts`、`frontend/tests/gatewayAccessController.test.ts`、`frontend/tests/gatewayActivityController.test.ts`、`frontend/tests/gatewayDerivedStateController.test.ts`、`frontend/tests/gatewayRouteMutationActionsController.test.ts`、`frontend/tests/gatewayPriorityController.test.ts`。
- 改动: 新增 `useGatewayPageViewState()`，把 `gatewayPageController.ts` 中 access state、route mutation actions、display page state 三组页面视图状态装配下沉到独立 controller。`gatewayPageController.ts` 继续负责 foundation、view state、operations、shell bindings 和 lifecycle 的顶层组合。
- 行为锁定: 本任务不改变后端 API、请求路径、路由、认证、SQLite 数据、Docker 端口、网关入口、网关地址展示、API Key 复制、请求 URL 复制、活动 URL 复制、路由 mutation、展示派生状态、toast 顺序或用户操作路径；只移动三组视图状态 option/wiring。
- 文件长度检查: `GatewayView.vue` 保持 63 行，`gatewayPageController.ts` 从任务 294 的 136 行降至 117 行，新增 `gatewayPageViewStateController.ts` 为 54 行，`gatewayPageViewStateController.test.ts` 为 40 行。
- TDD 红灯: `node --test frontend/tests/gatewayPageViewStateController.test.ts` 首次失败于缺少 `frontend/src/gatewayPageViewStateController.ts`，0 个通过，1 个失败，整体耗时 `138.828156ms`。
- 中间边界校验: 新 controller 实现后，相邻 access、activity、display、route mutation、priority 和 page controller 静态测试仍要求 `gatewayPageController.ts` 直接 import 或调用 `useGatewayPageAccessState()`、`useGatewayRouteMutationActions()` 或 `useGatewayDisplayPageState()`。已统一改为检查 page controller 只接入 `useGatewayPageViewState()`，新 view state controller 继续持有三组视图状态 wiring。
- `node --test frontend/tests/gatewayPageViewStateController.test.ts`: 通过，1 个目标测试通过，最终耗时 `131.086991ms`。
- `node --test frontend/tests/gatewayPageViewStateController.test.ts frontend/tests/gatewayPageController.test.ts frontend/tests/gatewayPageAccessStateController.test.ts frontend/tests/gatewayActivityController.test.ts frontend/tests/gatewayAccessController.test.ts frontend/tests/gatewayAccessPageController.test.ts frontend/tests/gatewayRouteMutationActionsController.test.ts frontend/tests/gatewayDerivedStateController.test.ts frontend/tests/gatewayPriorityController.test.ts`: 通过，46 个目标/相邻测试全部通过，最终耗时 `309.792835ms`。
- `node --test frontend/tests/gateway*.test.ts`: 通过，511 个网关相关测试全部通过，最终耗时 `3108.563491ms`。
- `node --test frontend/tests/*.test.ts`: 通过，572 个前端状态辅助测试全部通过，最终耗时 `3436.006413ms`。
- `npm audit --audit-level=high`（在 `frontend/` 下执行）: 通过，`found 0 vulnerabilities`。
- `npm run build`（在 `frontend/` 下执行）: 通过，`vue-tsc -b` 通过，3477 个模块完成转换，Vite 构建耗时 `26.04s`。仍有既有大 chunk 和 plugin timing 警告。
- `git diff --check`: 通过，无输出。
- 新文件空白检查: `git diff --no-index --check /dev/null frontend/src/gatewayPageViewStateController.ts` 和 `git diff --no-index --check /dev/null frontend/tests/gatewayPageViewStateController.test.ts` 均无输出；`git diff --no-index` 因文件不同返回 1，未发现空白错误。
- view state 直连扫描: `rg -n "useGatewayPageAccessState\\(\\{|useGatewayRouteMutationActions\\(\\{|useGatewayDisplayPageState\\(\\{|from './gateway(PageAccessState|RouteMutationActions|DisplayPage)Controller\\.ts'" frontend/src/gatewayPageController.ts frontend/src/gatewayPageViewStateController.ts frontend/tests/gatewayPageViewStateController.test.ts frontend/tests/gatewayPageController.test.ts` 确认 `gatewayPageController.ts` 不再直接调用三组视图状态 controller，三组装配只保留在 `gatewayPageViewStateController.ts` 和对应测试中。
- 本任务未改后端代码，未重复执行 Go 验证或 Docker 重建。
- 运行态说明: 任务 295 后尚未重新执行 Docker build，运行中容器仍不能代表已加载最新未提交前端产物。

## 下一阶段任务 296: 当前 UI 重构范围审查与运行态收口

日期: 2026-05-28

- 范围: 当前 UI 设计语言重构工作区、前端全量状态测试、前端 production build、后端 Go 验证、Docker 重建、主要页面浏览器运行态加载验证。
- 工作区范围审查: `git diff --name-only` 当前只包含两份阶段文档、`frontend/src/components.d.ts`、`ShellLayout.vue`、`useTableScrollHeights.ts`、`sitesViewConfig.ts`、两份 surface CSS 和六个视图入口；`git ls-files --others --exclude-standard` 口径下未跟踪文件集中在 `frontend/src` 的组件、controller、model、style 和 `frontend/tests`。
- 工作区计数: `git status --short --untracked-files=all` 为 361 个条目，`git ls-files --others --exclude-standard` 为 347 个未跟踪文件；本轮未 staging、未 commit。
- 前端验证承接任务 295: `node --test frontend/tests/gateway*.test.ts` 通过，511 个网关相关测试全部通过，最终耗时 `3108.563491ms`；`node --test frontend/tests/*.test.ts` 通过，572 个前端状态辅助测试全部通过，最终耗时 `3436.006413ms`；`npm audit --audit-level=high` 通过，`found 0 vulnerabilities`；`npm run build` 通过，3477 个模块完成转换，Vite 构建耗时 `26.04s`，仍有既有大 chunk 和 plugin timing 警告。
- 后端验证: `go test ./...` 通过，现有后端测试全部通过；`go build ./...` 退出码 0 且无输出；`go vet ./...` 退出码 0 且无输出。
- Docker 重建: `docker compose up -d --build` 通过，镜像内重新执行前端 production build，3477 个模块完成转换，容器 `ai-sign-in-gateway` 已重新创建并启动。
- `docker compose ps`: `ai-sign-in-gateway` 状态为 `Up`，端口映射为 `0.0.0.0:8972->8972/tcp` 和 `[::]:8972->8972/tcp`。
- `curl -fsS http://127.0.0.1:8972/api/health`: HTTP 200，响应 `status` 为 `ok`，`frontend_url` 为 `http://127.0.0.1:8972`，`gateway_url` 为 `http://127.0.0.1:8972/api/gateway`，数据库路径为 `/app/data/ai-sign-in-gateway.db`。
- 运行态浏览器验证: 使用 headless Chrome/CDP 加载 `/login`，页面标题为 `爱签网关`，`/api/public/invites` 为 HTTP 200，无 4xx/5xx、失败请求或 console error/warn。
- 运行态浏览器验证: 登录 token 写入 localStorage 后依次加载 `/desktop`、`/sites`、`/gateway/routes`、`/gateway/monitor`、`/chat-test`、`/settings`，各页面标题均为 `爱签网关`，关键 API 均为 HTTP 200，无 4xx/5xx、失败请求或 console error/warn。
- 主要 API 覆盖: `/api/auth/me`、`/api/settings`、`/api/overview`、`/api/gateway-admin/overview`、`/api/sites`、`/api/sites/groups`、`/api/plugins`、`/api/checkins/sites`、`/api/checkins/runs`、`/api/gateway-admin/routes`、`/api/gateway-admin/settings`、`/api/gateway-admin/active-requests`、`/api/gateway-admin/logs`、`/api/gateway-admin/usage`、`/api/tools/chat-sessions` 均在对应页面加载中返回 HTTP 200。

## 下一阶段任务 297: UI 设计语言规划逐项复核与缺口补齐

日期: 2026-05-28

- 范围: 重新对照本文件规划项，覆盖后台视觉语言、主要页面响应式运行态、文件长度边界、共享 token/style 约束、路由/API/认证/数据流等价性、Docker 运行态与主线验证。
- 复核结论: 任务开始时并非全部满足。发现 `gatewayRouteBalanceProbeModel.ts`、`gatewayViewModel.ts` 等模型文件超过 300 行软边界；`SitesView.vue` 与 `GatewayView.vue` 的 scoped style import 使子组件和 Ant 内部选择器未按预期生效；移动端 `/sites` 工具栏、`/gateway/routes` 工具栏和桌面 `/gateway/routes` 的 `清空筛选` 按钮存在可见布局缺口；`/chat-test` 输入框存在文本高度溢出。
- 结构修复: 新增 `frontend/tests/gatewayModelBoundary.test.ts` 锁定网关模型拆分边界；新增 `frontend/src/gatewayUsageRangeModel.ts` 承接用量日期范围纯函数；新增 `frontend/src/gatewayManualRouteBalanceProbeModel.ts` 承接手动余额探测弹窗、URL 校验和通知计划；`gatewayRouteBalanceProbeModel.ts` 回到 235 行，`gatewayRouteBalanceProbeFlowController.ts` 为 296 行，`gatewayViewModel.ts` 为 289 行，新增模型文件均低于 300 行。
- 样式修复: 将 `SitesView.vue` 与 `GatewayView.vue` 的 style import 改为全局样式入口，并清理对应 `sites-view*.css`、`gateway-view*.css` 中不再适用的 `:deep()` 写法；补齐站点页 grid/min-width 约束、移动端工具栏换行、路由页工具栏移动端约束、`清空筛选` 按钮最小宽度、网关 access code 宽度、chat textarea 高度、focus outline 和主要表面圆角约束。
- Web 指南补齐: 按最新 `vercel-labs/web-interface-guidelines` 复扫后，统一 UI/反馈文案中的省略号写法，并为对话页站点/模型选择器和路由筛选选择器补充显式 `aria-label`。
- 运行态浏览器审计: 使用 headless Chrome/CDP 分别在 1440、1280、900、390 宽度加载 `/login`、`/overview`、`/desktop`、`/sites`、`/gateway/routes`、`/gateway/monitor`、`/chat-test`、`/settings` 共 32 个页面状态，结果 32/32 通过。断言项包括文档级横向溢出为 0、非表格可见溢出为 0、主要表面圆角不超过 8px、控件文本无溢出、可见按钮有名称、表单/选择控件有可访问名称、图片有 alt、无 console warn/error、无 runtime exception、无本地 4xx/5xx 或加载失败请求。Ant 表格内部横向滚动仍按规划中的“表格 overflow 限定”处理。
- 验证: `node --test frontend/tests/*.test.ts` 通过，575 个前端测试全部通过，最终耗时 `17684.830455ms`；`npm run build` 通过，3481 个模块完成转换，最终 Vite 构建耗时 `54.18s`，仍有既有大 chunk 和 plugin timing 警告；`npm audit --audit-level=high` 通过，`found 0 vulnerabilities`。
- 后端与运行态验证: `go test ./...`、`go build ./...`、`go vet ./...` 均通过；`DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose up -d --build` 通过，镜像内重新执行前端 production build，容器 `ai-sign-in-gateway` 已重新创建并启动；`curl -fsS http://127.0.0.1:8972/api/health` 返回 HTTP 200 且 `status` 为 `ok`。
- 空白与文件边界检查: `git diff --check` 通过；新增 `frontend/src/gatewayUsageRangeModel.ts`、`frontend/src/gatewayManualRouteBalanceProbeModel.ts`、`frontend/tests/gatewayModelBoundary.test.ts` 均通过 `git diff --no-index --check /dev/null <file>` 检查。
- 当前剩余边界: `frontend/src/types.ts` 为 864 行，`frontend/src/api.ts` 为 796 行，仍属于共享契约和接口层，不在本轮 UI 设计语言复核范围内拆分。该边界需要按后端 API 域单独设计，避免影响全仓导入路径。
- 工作区状态: 任务 297 后续复核已完成 staging；当前 `git diff --name-only` 为 0，`git diff --cached --name-only` 为 415 个文件，`git diff --cached --shortstat` 为 `415 files changed, 54001 insertions(+), 12616 deletions(-)`。本轮未 commit。

## 任务 297 再次复核补充: 规划偏离与完善项收口

日期: 2026-05-28

- 范围: 在任务 297 基础上继续复核 UI 设计语言规划、最新 Web Interface Guidelines、CodeRabbit scoped review、运行态 Docker 页面矩阵和可访问性/响应式细节；不改变后端 API、认证、SQLite 数据、网关入口或业务流程。
- CodeRabbit 复核: `coderabbit review --agent -t uncommitted --dir frontend/src/styles` 完成 scoped review；全量 `coderabbit review --prompt-only -t uncommitted` 因变更文件数 381 超过 150 文件上限未执行。有效发现已处理: chat 图片尺寸控件中宽度溢出、history CSS stray brace、settings tabs/header summary 隐藏滚动条、login story 中断点固定最小宽度溢出。`chat-test-composer.css` stray brace 反馈经对照当前工作树未复现。
- 设计语言补齐: 清理残余玻璃/渐变/装饰性伪元素、死选择器和活跃 blur/mask；将残余 viewport 字体、`clamp()` 字体和非零字距收敛为固定字号与 `letter-spacing: 0`；统一 sticky action 背景、指标卡阴影、登录/网关/站点/对话/设置页细节到白底后台语言。
- 可访问性补齐: 为对话输入、站点搜索、路由搜索、路由更多操作、站点更多操作、站点开关、设置开关、批量注册开关和图片操作按钮补齐 `aria-label`；路由筛选开关显示文案缩短为 `含` / `启`，完整语义保留在 `aria-label="包含停用路由"`。
- 响应式补齐: 修复 `/gateway/routes` 中宽度筛选栏在 1280/900/390 下溢出，设置嵌入页 tabs/开关文本溢出，登录页品牌徽标垂直溢出，网关监控短高度卡片内容溢出，header title 在中宽度下的轻微文本溢出；Ant 表格横向滚动仍限定在表格容器内。
- 静态扫描: 自定义脚本扫描 `frontend/src` 后未发现 `font-size: clamp(...)`、字体 `vw`、非零/负 `letter-spacing`、`transition: all`、`outline: none`、禁用缩放、活跃 `backdrop-filter`、blur filter、mask image 或 gradient；结构化扫描确认可见 `a-switch` 均有可访问名称。
- 验证: `git diff --check && git diff --cached --check` 通过；`node --test frontend/tests/*.test.ts` 通过，575 个前端测试全部通过；`npm run build` 通过，3481 个模块完成转换，仍有既有大 chunk 和 plugin timing 警告；`go test ./... && go build ./... && go vet ./...` 通过；`npm audit --audit-level=high` 通过，`found 0 vulnerabilities`。
- Docker 运行态验证: `DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose up -d --build` 通过，镜像内重新执行前端 production build 并重建容器；`docker compose ps` 显示 `ai-sign-in-gateway` 为 `Up`，端口 `0.0.0.0:8972->8972/tcp`；`curl -fsS http://127.0.0.1:8972/api/health` 返回 HTTP 200，`status` 为 `ok`，数据库路径为 `/app/data/ai-sign-in-gateway.db`。
- 浏览器运行态验证: headless Chrome/CDP 在 1440、1280、900、390 宽度覆盖 `/login`、`/overview`、`/desktop`、`/sites`、`/gateway/routes`、`/gateway/monitor`、`/chat-test`、`/settings` 共 32 个页面状态，最终 32/32 通过；检查项包括文档级横向溢出、非表格可见溢出、直接文本溢出、缺少可访问名称控件、空白页面、console error 和本地 4xx/5xx。
- 当前剩余边界: `frontend/src/types.ts` 为 864 行，`frontend/src/api.ts` 为 796 行；二者属于共享契约和接口层，不应混入本轮 UI 设计语言复核，应按后端 API 域另起任务拆分。

## 任务 297 再次复核补充: 设置页与桌面页可访问性收口

日期: 2026-05-28

- 范围: 继续对照 UI 设计语言规划、最新 Web Interface Guidelines、CodeRabbit scoped review 和运行态浏览器矩阵，只处理当前前端样式和可访问性缺口，不改后端 API、认证、SQLite 数据、网关入口或业务流程。
- 样式边界收口: 将 `frontend/src/styles/workspace-surfaces.css`、`frontend/src/styles/settings-view.css` 和 `frontend/src/styles/management-surfaces.css` 的职责继续下沉到 `login-workspace-surfaces.css`、`settings-runtime.css` 和 `management-responsive-surfaces.css`，避免再出现超过 300 行的样式文件。
- 可访问性补齐: 为桌面运行状况页、设置页调度/运行/配置/数据库/账号/价格表单补齐直接 `aria-label`，覆盖运行态浏览器矩阵里暴露的可见输入控件缺口。
- 浏览器复验: 修正后 headless Chrome/CDP 再跑 `/login`、`/overview`、`/desktop`、`/sites`、`/gateway/routes`、`/gateway/monitor`、`/chat-test`、`/settings` 的 1440、1280、900、390 宽度矩阵，最终 32/32 通过；`/desktop` 和 `/settings` 的未命名输入问题已清零。
- 静态与构建验证: `git diff --check && git diff --cached --check` 通过；`node --test frontend/tests/*.test.ts` 575/575 通过；`npm run build` 通过，3481 个模块完成转换，构建耗时 `54.18s`，保留既有大 chunk 和 plugin timing 警告。
- Docker 运行态验证: `DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose up -d --build` 通过；`docker compose ps` 显示 `ai-sign-in-gateway` 为 `Up`；`curl -fsS http://127.0.0.1:8972/api/health` 返回 HTTP 200 且 `status` 为 `ok`。
- 当前剩余边界: 经过本轮收口后，`frontend/src/types.ts` 和 `frontend/src/api.ts` 仍是唯一保留在 300 行以上的前端共享层文件，属于接口契约域，不纳入本轮 UI 设计语言复核。

## 任务 297 再次复核补充: 凭据记录与弹窗可访问性收口

日期: 2026-05-28

- 范围: 继续复核 `UI-DESIGN-LANGUAGE-REFACTOR-2026-05-21.md` 与任务 297 实际改动是否偏离规划，重点检查审计文档安全记录、弹窗/抽屉控件可访问名称和本轮补丁后的运行态验证；不改后端 API、认证逻辑、SQLite 数据、网关入口或业务流程。
- 安全文档修复: 发现审计文档历史验证记录中写入了本机管理员凭据细节，已改为“本机已知管理员凭据返回 HTTP 200，旧默认凭据返回 HTTP 401；文档不记录明文口令”。复扫管理员口令描述、明文口令片段和 token 字段暴露模式后无命中。
- 弹窗与抽屉可访问性补齐: 在 `GroupManagerButton.vue`、`ChatTestPageContent.vue`、gateway overlay 组件、sites dialog/drawer/editor 组件中为 `a-input`、`a-input-password`、`a-input-number`、`a-select`、`a-textarea`、`a-switch`、`a-radio-group` 补充直接 `aria-label` 或等价命名，覆盖主页面矩阵未完全展开到的弹窗、抽屉和动态表单字段。
- CodeRabbit 复核: 在修正文档凭据记录后执行 `coderabbit review --agent -t uncommitted --dir docs`，返回 `review_completed`，`findings: 0`。本次未对 385 个文件做全量 CodeRabbit review，因为此前全量 prompt-only 已触发 150 文件上限。
- 静态扫描: 改进 Vue 控件扫描脚本，按标签状态机忽略属性值中的 `>` 符号，扫描 `frontend/src` 后 `missing_direct_names=0`；敏感文档扫描无命中。
- 验证: `node --test frontend/tests/*.test.ts` 通过，575/575，耗时 `21859.22853ms`；`npm run build` 通过，3481 个模块完成转换，构建耗时 `54.69s`，保留既有大 chunk 和 plugin timing 警告；`DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose up -d --build` 通过，镜像内 production build 完成并重建容器；`docker compose ps` 显示 `ai-sign-in-gateway` 为 `Up`；`curl -fsS http://127.0.0.1:8972/api/health` 返回 HTTP 200 且 `status` 为 `ok`。
- 当前剩余边界: `frontend/src/types.ts` 和 `frontend/src/api.ts` 仍是唯一保留在 300 行以上的前端共享层文件，属于接口契约域，不纳入本轮 UI 设计语言复核；未发现新的规划偏离或阻塞项。

## 任务 297 再次复核补充: CodeRabbit 分片复核与构建体积优化

日期: 2026-05-28

- 范围: 继续对照 `UI-DESIGN-LANGUAGE-REFACTOR-2026-05-21.md`、CodeRabbit 分片复核结果、构建产物体积、测试文件边界、安全扫描和 Docker 运行态；仍不改后端 API、认证、SQLite schema、网关入口或业务流程。
- CodeRabbit 分片复核: `docs`、`frontend/src/views`、`frontend/src/composables`、`frontend/src/components` 均完成 scoped review。`frontend/src/composables` 初轮 4 条有效发现已修复并复跑为 `findings: 0`；`frontend/src/components` 多轮有效发现已修复，最终复跑为 `findings: 0`。`frontend/src/styles` 与 `frontend/tests` 曾触发 free CLI rate limit，使用本地静态扫描、完整测试和构建兜底；全量 prompt-only 仍受 150 文件上限限制。CodeRabbit 提出的 `GatewayLogLatencyCell.vue` i18n 建议经核实不适用，当前前端没有 i18n/locale 机制，未为单个 fallback 引入新体系。
- 有效修复: 补齐网关复制按钮禁用态可访问名称；为 `_blank` 链接补 `noopener`；将 `GatewayPageShell.vue` 从双布尔切换改为单一 `section` 判别式；将网关设置、签到设置和新增上游弹窗改为本地草稿，保存时显式提交 payload，避免取消弹窗污染父级状态；修复站点 API Key 弹窗 `visibilityToggle` prop；补齐账号页新密码确认前端校验；修复日志延迟 `0 ms` 显示、路由成功率空值显示、日志抽屉本地过滤、activity meta key 唯一性和 TOTP textarea autocomplete 统一。
- 构建体积优化: 调整 Ant Design manual chunks，将 overlay、navigation、display、data、forms、feedback、shell 拆分；`npm run build` 后最大 JS chunk 为 `antd-data-Cmcsz1xg.js` 422.46 kB，`antd-core-B4N7Blvn.js` 为 278.06 kB，`large_js_chunks=0`，不再出现 500 kB chunk warning。仍保留 Rolldown `PLUGIN_TIMINGS` 诊断，这是构建插件耗时提示，不是产物体积或运行错误。
- 测试文件边界与安全清理: 将 9 个超过 300 行的大型测试文件拆分为 34 个 `*.part*.test.ts`，完整测试数量稳定为 585；保留在 300 行以上的前端文件只有 `frontend/src/types.ts` 864 行与 `frontend/src/api.ts` 796 行，属于共享契约/API 层边界。测试 fixture 中的假 `sk-...` 已改为非密钥占位，强特征密钥扫描无命中。
- 验证: `coderabbit review --agent -t uncommitted --dir frontend/src/components` 最终返回 `review_completed`，`findings: 0`；`node --test frontend/tests/*.test.ts` 通过，585/585，耗时 `9421.522452ms`；`go test ./... && go build ./... && go vet ./...` 通过；`npm run build` 通过，3481 个模块完成转换，构建耗时 `32.18s`；`DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose up -d --build` 通过并重建容器；`docker compose ps` 显示 `ai-sign-in-gateway` 为 `Up`；`curl -fsS http://127.0.0.1:8972/api/health` 返回 HTTP 200 且 `status` 为 `ok`。
- 静态扫描: CodeRabbit 有效项回归扫描无命中；UI 设计语言 CSS/Vue 约束扫描无命中；`large_js_chunks=0`；高置信密钥扫描无命中；`git diff --check && git diff --cached --check` 通过。

## 剩余拆分边界

日期: 2026-05-28

- `frontend/src/views/GatewayView.vue` 当前为 63 行，不再直接持有网关业务 controller 编排；页面只注入 props、toast、API base、时间函数和浏览器 platform，调用 `useGatewayPageController()`，在 Vue lifecycle 中调用 `mount()` / `unmount()`，并渲染 `GatewayPageShell.vue`。
- `frontend/src/gatewayPageController.ts` 当前为 117 行；它是 gateway page 总编排边界，聚合 foundation、view state、operations、shell bindings 和 lifecycle actions。该文件已低于 300 行软目标，后续仍不应承接新增业务逻辑，应继续按业务域拆分其内部 option/wiring 组装。
- `frontend/src/gatewayPageViewStateController.ts` 当前为 54 行；access state、route mutation actions 和 display page state 三组视图状态装配已从 page controller 下沉，底层访问展示、路由 mutation 和展示派生状态继续委托各自 controller。
- `frontend/src/gatewayPageOperationsController.ts` 当前为 87 行；runtime、refresh、route 和 admin 四组页面操作装配已从 page controller 下沉，底层运行态、刷新、路由管理和管理操作行为继续委托各自 page action controller。
- `frontend/src/gatewayPageFoundationController.ts` 当前为 55 行；基础 page wiring 已从 page controller 下沉，包括 section state、notice actions、requests adapter fallback、display helpers、browser platform、page state、table layout 和 mounted 读写器。
- `frontend/src/gatewayPageLifecycleActionsController.ts` 当前为 56 行；lifecycle mount/unmount 的页面级 option 映射已从 page controller 下沉，底层挂载顺序和卸载清理继续委托 `gatewayPageLifecycleController.ts` 与 `gatewayVisibilityPlatformController.ts`。
- `frontend/src/gatewayPageRouteActionsController.ts` 当前为 101 行；route management operations 的页面级 option 映射已从 page controller 下沉，低层路由探测、余额探测、优先级、路由启停、路由配置、诊断和日志继续委托 `gatewayRouteManagementOperationsPageController.ts`、`gatewayRouteProbePageController.ts` 与 `gatewayRouteOperationsPageController.ts`。
- `frontend/src/gatewayPageRefreshActionsController.ts` 当前为 35 行；refresh operations 的页面级 option 映射已从 page controller 下沉，低层路由摘要刷新、站点分组刷新、手动刷新和静默余额探测继续委托 `gatewayRefreshOperationsPageController.ts`、`gatewayCatalogRefreshPageController.ts` 与 `gatewayRefreshPageController.ts`。
- `frontend/src/gatewayPageAccessStateController.ts` 当前为 26 行；access page state 的页面级 option 映射已从 page controller 下沉，低层网关地址、Codex URL、API Key mask 和复制行为继续委托 `gatewayAccessPageController.ts`、`gatewayAccessController.ts` 与 `gatewayActivityController.ts`。
- `frontend/src/gatewayPageAdminActionsController.ts` 当前为 41 行；admin operations 的页面级 option 映射已从 page controller 下沉，低层同步路由、新增上游和设置保存行为继续委托 `gatewayAdminOperationsPageController.ts`、`gatewayUpstreamPageController.ts` 与 `gatewaySettingsPageController.ts`。
- `frontend/src/gatewayPageRuntimeActionsController.ts` 当前为 89 行；runtime operations 的页面级 option 映射已从 page controller 下沉，低层运行态行为继续委托 `gatewayRuntimeOperationsPageController.ts`、`gatewayDataOperationsPageController.ts` 与 `gatewayRealtimeOperationsPageController.ts`。
- `frontend/src/gatewayPageShellBindingsController.ts` 当前为 121 行；监控页、路由管理页和 overlay page 的 shell props/handlers option 映射已从 page controller 下沉，低层绑定组合继续委托 `gatewayPageBindingsController.ts`。
- `frontend/src/gatewayRuntimeOperationsPageController.ts` 当前为 29 行；网关页 data operations 与 realtime operations 两组 runtime 页面装配已从 `GatewayView.vue` 下沉，低层行为继续委托 `gatewayDataOperationsPageController.ts` 与 `gatewayRealtimeOperationsPageController.ts`。
- `frontend/src/gatewayRouteManagementOperationsPageController.ts` 当前为 18 行；网关页 route probe 与 route operations 两组路由管理操作页面装配已从 `GatewayView.vue` 下沉，低层行为继续委托 `gatewayRouteProbePageController.ts` 与 `gatewayRouteOperationsPageController.ts`。
- `frontend/src/gatewayRefreshOperationsPageController.ts` 当前为 19 行；网关页 catalog refresh 和 manual refresh 两组刷新操作页面装配已从 `GatewayView.vue` 下沉，低层行为继续委托 `gatewayCatalogRefreshPageController.ts` 与 `gatewayRefreshPageController.ts`。
- `frontend/src/gatewayCatalogRefreshPageController.ts` 当前为 16 行；网关页路由摘要刷新和站点分组刷新两组 catalog refresh 页面装配已从 `GatewayView.vue` 下沉，低层行为继续委托 `gatewayRefreshPageController.ts` 与 `gatewaySiteGroupsPageController.ts`。
- `frontend/src/gatewayPageSectionController.ts` 当前为 15 行；网关页 `section` prop 对应的路由管理/监控模式 computed 已从 `GatewayView.vue` 下沉，页面继续使用 `isRouteManagement` 和 `isGatewayMonitor` 作为 shell 与运行时判断入口。
- `frontend/src/gatewayPageTableLayoutController.ts` 当前为 30 行；网关页 `pageTableY`、`drawerTableY` 和 `bindPageTableContainer` 的页面级装配已从 `GatewayView.vue` 下沉，低层高度计算继续委托 `useTableScrollHeights.ts`。
- `frontend/src/gatewayPageDisplayHelpersController.ts` 当前为 75 行；网关页使用到的 route/log/format/view 静态展示 helper 已从 `GatewayView.vue` 直连导入收口到 page display helpers controller，低层行为继续委托展示模型和格式化工具。
- `frontend/src/gatewayDisplayPageController.ts` 当前为 129 行；网关页展示派生状态的页面级函数注入、列配置、优先级弹窗列和时间格式化入口已从 `GatewayView.vue` 下沉，低层计算继续委托 `gatewayDerivedStateController.ts`、`gatewayViewModel.ts`、`gatewayViewConfig.ts` 和展示模型。
- `frontend/src/gatewayPageRequestsController.ts` 当前为 53 行；网关页使用到的真实 API 请求函数已从 `GatewayView.vue` 直连导入收口到 page requests adapter，低层行为继续委托 `frontend/src/api.ts`。
- `frontend/src/gatewayPagePlatformController.ts` 当前为 55 行；浏览器 location、clipboard、confirm window、timer window、visibility platform 和 lifecycle event platform 已聚合，低层行为继续委托 `gatewayVisibilityPlatformController.ts` 与真实浏览器 API。
- `frontend/src/gatewayPageBindingsController.ts` 当前为 78 行；监控页、路由管理页和 overlay page 三组 page-level props/events bindings 已聚合，低层行为继续委托 monitor、route management 和 overlay page controller。
- `frontend/src/gatewayDataOperationsPageController.ts` 当前为 40 行；初始数据加载/动作后重载和用量查询/今日快捷查询两组 page action 装配已聚合，低层行为继续委托 initial data 和 usage page controller。
- `frontend/src/gatewayRealtimeOperationsPageController.ts` 当前为 39 行；实时刷新、活动请求刷新、可见性刷新和自动刷新 timer 启停两组 page action 装配已聚合，低层行为继续委托 realtime 和 auto refresh page controller。
- `frontend/src/gatewayAdminOperationsPageController.ts` 当前为 30 行；上游同步/新增上游和网关设置保存两组 page action 装配已聚合，低层行为继续委托 upstream 和 settings page controller。
- `frontend/src/gatewayRouteOperationsPageController.ts` 当前为 24 行；优先级、路由启停/熔断、路由类型/路径/模型配置、路由诊断/日志四组 page action 装配已聚合，低层行为继续委托 priority、route action、route config 和 route inspection page controller。
- `frontend/src/gatewayOverlayPageController.ts` 当前为 149 行；`GatewayOverlayPageHost` 的 page-level props 和 events bindings 已从 `GatewayView.vue` 下沉，低层弹窗/抽屉渲染仍委托 `GatewayOverlayPageHost.vue` 和 `GatewayOverlayHost.vue`，业务动作仍委托既有 priority、balance、settings、add-upstream、route-model controller。
- `frontend/src/gatewayRouteManagementPageController.ts` 当前为 252 行；路由管理页 `GatewayRouteManagementPage` 的 page-level props、v-model update handlers 和 events bindings 已从 `GatewayView.vue` 下沉，低层刷新、复制、同步、探测、筛选、配置、优先级、诊断和日志动作仍委托既有 page/runtime/access controller。
- `frontend/src/gatewayMonitorPageController.ts` 当前为 163 行；监控页 `GatewayMonitorPage` 的 page-level props/events bindings 已从 `GatewayView.vue` 下沉，低层刷新、复制、用量、日志和设置动作仍委托既有 page/runtime/access controller。
- `frontend/src/gatewaySiteGroupsPageController.ts` 当前为 25 行；站点分组刷新 action 的页面级 ref 写回装配已从 `GatewayView.vue` 下沉，低层行为继续委托既有 gateway site groups controller。
- `frontend/src/gatewayAutoRefreshPageController.ts` 当前为 77 行；自动刷新 timer platform、start action 和 stop action 的页面级装配已从 `GatewayView.vue` 下沉，低层行为继续委托既有 auto refresh timer controller。
- `frontend/src/gatewayInitialDataPageController.ts` 当前为 189 行；初始数据加载和动作后重载页面级 action 装配已从 `GatewayView.vue` 下沉，低层行为继续委托既有 initial data load controller 和 runtime load controller。
- `frontend/src/gatewayRealtimePageController.ts` 当前为 201 行；活动请求加载、活动请求刷新、实时刷新和可见性刷新处理的页面级 action 装配已从 `GatewayView.vue` 下沉，低层行为继续委托既有 active requests runtime、realtime refresh runtime 和 visibility runtime controller。
- `frontend/src/gatewayRefreshPageController.ts` 当前为 67 行；路由摘要刷新、摘要刷新防抖调度和手动刷新页面级 action 装配已从 `GatewayView.vue` 下沉，低层行为继续委托既有 route summary 和 manual refresh controller。
- `frontend/src/gatewaySettingsPageController.ts` 当前为 43 行；设置保存页面级 action 装配已从 `GatewayView.vue` 下沉，低层行为继续委托既有 settings controller。
- `frontend/src/gatewayUpstreamPageController.ts` 当前为 73 行；同步网关路由和新增上游提交的页面级 action 装配已从 `GatewayView.vue` 下沉，低层行为继续委托既有 sync 和 add upstream controller。
- `frontend/src/gatewayUsagePageController.ts` 当前为 93 行；用量 runtime 加载、普通用量查询和今日快捷查询的页面级 action 装配已从 `GatewayView.vue` 下沉，低层行为继续委托既有 runtime load 和 usage range controller。
- `frontend/src/gatewayRouteInspectionPageController.ts` 当前为 57 行；路由诊断打开/加载和路由日志打开/加载的页面级 action 装配已从 `GatewayView.vue` 下沉，低层行为继续委托既有 route diagnosis 和 route logs controller。
- `frontend/src/gatewayRouteProbePageController.ts` 当前为 171 行；批量路由探测、全量余额更新、单路由探测、单路由余额探测、手动余额探测提交和 `probeRouteBalances` helper 的页面级 action 装配已从 `GatewayView.vue` 下沉，低层行为继续委托既有 route probe、balance flow 和 balance runtime controller。
- `frontend/src/gatewayRouteActionPageController.ts` 当前为 98 行；路由启停、禁用全部、仅启用当前路由、重置熔断和浏览器确认入口的页面级 action 装配已从 `GatewayView.vue` 下沉，低层行为继续委托既有 route action controller 与 toggle/disable/enable/reset controller。
- `frontend/src/gatewayPriorityPageController.ts` 当前为 96 行；优先级弹窗打开、优先级移动和预设重排的页面级 action 装配已从 `GatewayView.vue` 下沉，低层行为继续委托既有 priority controller 与 priority model。
- `frontend/src/gatewayRouteConfigPageController.ts` 当前为 108 行；路由类型选择、请求格式选择、路由模型弹窗打开和保存的页面级 action 装配已从 `GatewayView.vue` 下沉，低层行为继续委托既有 route config controller 与 route config model。
- `frontend/src/gatewayRouteMutationActionsController.ts` 当前为 70 行；活跃请求快照、路由探测结果、路由余额结果和优先级重排结果的页面级 mutation action 装配已从 `GatewayView.vue` 下沉，低层行为继续委托既有 route state model 与 runtime/probe/balance/priority controller。
- `frontend/src/gatewayAccessPageController.ts` 当前为 77 行；网关请求 URL、Codex URL/tooltip、API Key mask、网关请求 URL 复制、API Key 复制和活动 URL 复制的页面级装配已从 `GatewayView.vue` 下沉，低层行为继续委托 `gatewayAccessController.ts` 和 `gatewayActivityController.ts`。
- `frontend/src/gatewayDerivedStateController.ts` 当前为 158 行；网关页指标卡、路由池卡片、用量摘要、列配置、活动流、分组选项和过滤结果等展示派生状态继续由泛型 derived state controller 计算，页面级真实依赖注入已改由 `gatewayDisplayPageController.ts` 持有。
- `frontend/src/gatewayPageStateController.ts` 当前为 94 行；网关页 runtime/dialog/drawer/filter/ref/timer/default 常量等页面状态构造已从 `GatewayView.vue` 下沉，页面只解构 `useGatewayPageState()` 返回的既有 state 与别名。
- `frontend/src/gatewayPageLifecycleController.ts` 当前为 74 行；网关页 mounted/unmounted 顺序已经从 `GatewayView.vue` 下沉到独立 lifecycle controller，页面只注入现有 action、slot、state setter 和 handler。
- `frontend/src/components/gateway/GatewayOverlayPageHost.vue` 当前为 246 行；优先级、手动余额探测、设置、新增上游、路由模型、日志、路由日志和诊断抽屉的 page-level props/v-model/events 接线已从 `GatewayView.vue` 下沉，底层弹窗/抽屉渲染仍委托 `GatewayOverlayHost.vue`。
- `frontend/src/components/gateway/GatewayPageShell.vue` 当前为 48 行；最终 `ShellLayout`、监控页、路由管理页和 overlay page host 模板组合已从 `GatewayView.vue` 下沉，页面只传递 shell props 和 handlers。
- `frontend/src/components/gateway/GatewayMonitorPage.vue` 当前为 136 行；监控模式下的 toolbar/dashboard 页面组合已移入独立 page 组件，并由 `GatewayPageShell.vue` 按 `isGatewayMonitor` 选择渲染。
- `frontend/src/components/gateway/GatewayRouteManagementPage.vue` 当前为 170 行；路由管理模式下的 toolbar/table 页面组合已移入独立 page 组件，并由 `GatewayPageShell.vue` 接收 route management props/handlers 后渲染。
- `frontend/src/gatewayNoticeController.ts` 当前为 31 行；网关通知执行入口已经从 `GatewayView.vue` 下沉到独立 controller，页面只注入 `toast`。
- `frontend/src/composables/useTableScrollHeights.ts` 当前为 113 行；页面表格滚动高度计算、ResizeObserver、watch 和 DOM 容器绑定入口已统一留在 table scroll helper 中。
- `frontend/src/gatewayActiveRequestsRuntimeController.ts` 当前为 101 行；活动请求加载入口 action 和刷新入口 action 已从 `GatewayView.vue` 下沉到独立 runtime controller，真实请求执行仍委托 `gatewayRuntime.loadActiveRequests`。
- `frontend/src/gatewayRealtimeRefreshRuntimeController.ts` 当前为 122 行；实时刷新入口 action 已从 `GatewayView.vue` 下沉到独立 runtime controller，真实刷新执行仍委托 `gatewayRuntime.refreshRealtimeData`。
- `frontend/src/gatewayRuntimeController.ts` 当前为 297 行，`frontend/src/gatewayRuntimeLoadController.ts` 为 287 行，`frontend/src/gatewayInitialDataLoadController.ts` 为 290 行，`frontend/src/gatewayActiveRequestsLoadModel.ts` 为 96 行；runtime 聚合 controller、runtime load controller 和 initial data load controller 均已接近 300 行上限，活动请求快照应用 action 已下沉到 active request load model，动作后数据重载 action 和用量加载 runtime action 已下沉到 runtime load controller，初始数据加载 runtime action 已下沉到 initial data load controller，后续迁移副作用时需要避免让任一 runtime controller 继续膨胀。
- `frontend/src/gatewayAutoRefreshTimerController.ts` 当前为 153 行；自动刷新 timer 平台 adapter、timer plan 应用、旧 timer 停止、controller slot abort、timer 清理顺序以及 start/stop 运行时 action factory 已经收口到独立 controller。
- `frontend/src/gatewayVisibilityPlatformController.ts` 当前为 59 行；document visibilityState 平台读取和 page lifecycle event 注册/移除平台入口已经收口到独立 controller，并由 page platform controller 组合。
- `frontend/src/gatewayRouteActionController.ts` 当前为 114 行；浏览器确认入口 action、路由开关确认文案、toggle/disable/enable-only/reset circuit 动作副作用装配和运行时 action 依赖装配已经收口到轻量 action controller。
- `frontend/src/gatewayRouteProbeController.ts` 当前为 290 行；批量路由探测、批量探测运行时 action、单路由探测、单路由探测运行时 action、探测结果应用 action 和探测入口 state 方法装配已经收口到 controller。该文件已接近 300 行上限，后续不应继续承接无关逻辑。
- `frontend/src/gatewayRouteBalanceProbeController.ts` 当前为 179 行，`frontend/src/gatewayRouteBalanceProbeFlowController.ts` 为 299 行，`frontend/src/gatewayRouteBalanceProbeRuntimeController.ts` 为 98 行；余额探测 state/dialog、副作用流程、全量更新 action、手动提交 action、手动弹窗打开 action 引用、余额结果应用 action、运行时 helper 依赖装配和探测入口 state 方法装配已分离，flow controller 已贴近 300 行上限，后续继续迁移时应保持 controller 单文件职责边界。
- `frontend/src/gatewayRouteSummaryController.ts` 当前为 49 行；路由摘要刷新结果应用、错误通知和运行时 helper 依赖装配已经收口到 controller。
- `frontend/src/gatewayPriorityController.ts` 当前为 284 行；优先级列表加载、列表加载运行时 action、移动、移动运行时 action、预设重排、预设运行时 action、重排结果应用、当前行样式 action 和运行时 helper 依赖装配已经收口到 controller，后续不应把更多无关网关副作用塞回该文件。
- `frontend/src/gatewayRouteDiagnosisController.ts` 当前为 73 行；路由诊断抽屉 state、诊断加载和运行时 action 依赖装配已经收口到 controller。
- `frontend/src/gatewayRouteLogsController.ts` 当前为 88 行；路由日志抽屉 state、日志加载和运行时 action 依赖装配已经收口到 controller。
- `frontend/src/gatewayAccessController.ts` 当前为 112 行；网关请求 URL 来源读取、网关请求 URL 和管理端 API Key 复制的剪贴板副作用、提示计划执行和运行时 action 依赖装配已经收口到 controller。
- `frontend/src/gatewayActivityController.ts` 当前为 42 行；监控活动流请求 URL 复制的剪贴板副作用、提示计划执行和运行时 action 依赖装配已经收口到 controller。
- `frontend/src/gatewayRouteConfigController.ts` 当前为 295 行；路由类型、请求格式、选择入口校验转发、路由模型弹窗打开/保存运行时 action 依赖装配和路由模型保存副作用已经收口到 controller，后续继续迁移时需要避免让该配置 controller 承接无关网关域逻辑。
- `frontend/src/gatewaySettingsController.ts` 当前为 94 行；网关设置弹窗 state、设置保存副作用流程和设置保存运行时 action 依赖装配已经收口到 controller。
- `frontend/src/gatewayAddUpstreamController.ts` 当前为 116 行；新增上游弹窗 state、提交副作用和运行时 action 依赖装配已经收口到 controller，后续应继续保持 `createSite` payload 规则由 add upstream 模型层定义。
- `frontend/src/gatewayManualRefreshController.ts` 当前为 42 行；手动刷新副作用顺序和运行时 action 依赖装配已经收口到 controller，后续可继续处理其它仍留在视图内的轻量刷新边界。
- `frontend/src/gatewaySyncController.ts` 当前为 74 行；同步路由、数据重载、静默余额探测、loading 和通知的运行时 action 依赖装配已经收口到 controller。
- `frontend/src/gatewaySiteGroupsController.ts` 当前为 28 行；站点分组轻量刷新和运行时 action 依赖装配已经收口到 controller，后续应继续保持失败时不打扰用户的现有静默行为。
- `frontend/src/gatewayUsageRangeController.ts` 当前为 70 行；用量范围 state、请求范围转换、普通查询 action、今日快捷查询 action 和今日快捷查询顺序已经收口到 controller，后续不应把用量加载错误处理塞回该文件。
- `frontend/src/types.ts` 为 864 行，`frontend/src/api.ts` 为 796 行，属于共享契约和接口层；拆分需要按后端 API 域同步命名，避免影响全仓导入路径。
- 最近一次 `DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose up -d --build`: 通过。镜像内重新执行前端 production build，3481 个模块完成转换，容器 `ai-sign-in-gateway` 已重新创建并启动；任务 297 已完成重新 Docker build。使用 classic builder 是因为 BuildKit 拉取 `docker/dockerfile:1` 时曾出现外部 OAuth token 超时。
- `docker compose ps`: `ai-sign-in-gateway` 状态为 `Up`，端口映射为 `0.0.0.0:8972->8972/tcp` 和 `[::]:8972->8972/tcp`。
- `curl http://127.0.0.1:8972/api/health`: HTTP 200，响应 `status` 为 `ok`。
- 运行态浏览器验证: headless Chrome/CDP 在 1440、1280、900、390 宽度覆盖 `/login`、`/overview`、`/desktop`、`/sites`、`/gateway/routes`、`/gateway/monitor`、`/chat-test`、`/settings` 共 32 个页面状态，32/32 通过；文档级横向溢出为 0、非表格可见溢出为 0、主要表面圆角不超过 8px、控件文本无溢出、可见按钮有名称、表单/选择控件有可访问名称、图片有 alt、无 console warn/error、无 runtime exception、无本地 4xx/5xx 或加载失败请求。

## 当前总 Goal 与收口标准

日期: 2026-05-28

目标: 在 `codex/ui-design-language-refactor` 分支上完成 UI 设计语言重构与大型前端视图结构收口，保持现有后端 API、路由、认证、SQLite 数据、Docker 端口 `8972`、网关入口 `/api/gateway`、管理端功能和用户操作路径行为等价。

- 文档口径: 以本文件为当前阶段事实源，同步维护 `docs/开发进度与下一步.md`；长期约束仍以 `AGENTS.md` 为准。
- 执行方式: 每次只处理一个原子任务，先补特征测试或最小回归测试，再做最小实现，最后记录验证。
- 行为边界: 不新增 mock 成功路径、隐藏回退、静默降级或不可追踪兼容分支；不回滚既有未提交改动。
- 结构边界: 保持已完成的 `LoginView`、`DesktopServiceView`、`ShellLayout`、`SitesView`、`SettingsView`、`ChatTestView` 拆分结果稳定，继续收口 `GatewayView.vue`。
- 网关页目标: `GatewayView.vue` 已收口到 63 行页面入口，`gatewayPageController.ts` 已降至 117 行；任务 297 已完成规划逐项复核与运行态缺口补齐，后续重点转为提交前范围收口和共享层拆分设计。
- 共享层目标: `frontend/src/types.ts` 和 `frontend/src/api.ts` 仅在网关页收口后按后端 API 域拆分，避免过早改动全仓导入路径。
- 验证基线: 每个原子任务至少运行目标测试和 `git diff --check`；需要时运行 `node --test frontend/tests/*.test.ts`、`npm run build`、`go test ./...`、`go build ./...`、`go vet ./...`、`npm audit --audit-level=high`。
- 新文件检查: 对新增文件使用 `git diff --cached --check` 覆盖 staged 内容；未 staged 的新增文件无需再用 no-index 口径补查。
- 最终收口: 当前已整理并 staging 415 个文件，`git diff --name-only` 为 0，`git diff --cached --name-only` 为 415，确认新增 model、controller、component、style、test 文件都属于当前 UI 设计语言重构目标并纳入 git。当前 staged shortstat 为 `415 files changed, 54001 insertions(+), 12616 deletions(-)`。
- 运行态交付: 已执行 `DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose up -d --build`、`docker compose ps`、`curl http://127.0.0.1:8972/api/health`，并用 headless Chrome/CDP 在 1440、1280、900、390 宽度覆盖 `/login`、`/overview`、`/desktop`、`/sites`、`/gateway/routes`、`/gateway/monitor`、`/chat-test`、`/settings` 共 32 个页面状态，全部通过。

## 下一阶段任务 2: 对话页纯模型工具拆分

日期: 2026-05-23

- 范围: `frontend/src/views/ChatTestView.vue`、`frontend/src/chatTestModel.ts`。
- 改动: 将对话页消息类型、图片比例预设、模型标签与默认模型选择、时间与延迟格式化、图片结果转换、活动步骤、模型列表错误文案等无副作用工具移入 `chatTestModel.ts`；保留站点加载、模型加载、会话恢复、发送请求、图片上传和滚动行为。
- 文件长度检查: `ChatTestView.vue` 从 1694 行降至 1563 行，`chatTestModel.ts` 为 147 行。
- `git diff --check`: 通过。
- `node --test frontend/tests/*.test.ts`: 通过，14 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过，后端现有测试全部通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `docker compose up -d --build`: 通过。镜像内重新执行前端 production build，容器 `ai-sign-in-gateway` 已重新创建并启动。
- `docker compose ps`: `ai-sign-in-gateway` 状态为 `Up`，端口映射为 `0.0.0.0:8972->8972/tcp`。
- `curl http://127.0.0.1:8972/api/health`: HTTP 200，响应 `status` 为 `ok`。
- 运行态浏览器验证: `/chat-test` 正常加载，`/api/auth/me`、`/api/sites`、`/api/tools/chat-sessions?limit=80`、`/api/gateway-admin/overview` 均为 HTTP 200，DevTools console 无 error/warn。

## 下一阶段任务 3: 设置页纯模型工具拆分

日期: 2026-05-24

- 范围: `frontend/src/views/SettingsView.vue`、`frontend/src/settingsViewModel.ts`。
- 改动: 将设置页默认表单、价格 provider 选项、价格方案克隆、价格行构造、价格行 key、旧端口停止结果标签颜色、备份时间和文件大小格式化移入 `settingsViewModel.ts`；保留设置加载、保存、立即执行、旧端口停止、配置目录、数据库导入、备份下载、配置包下载和账号更新流程。
- 文件长度检查: `SettingsView.vue` 从 1347 行降至 1274 行，`settingsViewModel.ts` 为 89 行。
- `git diff --check`: 通过。
- `node --test frontend/tests/*.test.ts`: 通过，14 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过，后端现有测试全部通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `docker compose up -d --build`: 通过。镜像内重新执行前端 production build，容器 `ai-sign-in-gateway` 已重新创建并启动。
- `docker compose ps`: `ai-sign-in-gateway` 状态为 `Up`，端口映射为 `0.0.0.0:8972->8972/tcp`。
- `curl http://127.0.0.1:8972/api/health`: HTTP 200，响应 `status` 为 `ok`。
- 运行态浏览器验证: `/settings` 正常加载，`/api/auth/me`、`/api/settings`、`/api/gateway-admin/overview`、`/api/settings/runtime/database/backups` 均为 HTTP 200，DevTools console 无 error/warn。

## 下一阶段任务 4: 对话页会话 payload 构造拆分

日期: 2026-05-24

- 范围: `frontend/src/views/ChatTestView.vue`、`frontend/src/chatTestModel.ts`。
- 改动: 将对话页用户消息初始对象、助手消息初始对象、请求消息数组映射和会话 create/update payload 构造移入 `chatTestModel.ts`；保留发送请求、会话创建、会话更新、消息持久化、活动状态和错误处理流程。
- 文件长度检查: `ChatTestView.vue` 从 1563 行降至 1537 行，`chatTestModel.ts` 为 212 行。
- `git diff --check`: 通过。
- `node --test frontend/tests/*.test.ts`: 通过，14 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过，后端现有测试全部通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
- `docker compose up -d --build`: 通过。镜像内重新执行前端 production build，容器 `ai-sign-in-gateway` 已重新创建并启动。
- `docker compose ps`: `ai-sign-in-gateway` 状态为 `Up`，端口映射为 `0.0.0.0:8972->8972/tcp`。
- `curl http://127.0.0.1:8972/api/health`: HTTP 200，响应 `status` 为 `ok`。
- 运行态浏览器验证: `/chat-test` 正常加载，`/api/auth/me`、`/api/sites`、`/api/tools/chat-sessions?limit=80`、`/api/gateway-admin/overview` 均为 HTTP 200，DevTools console 无 error/warn。

## 下一阶段任务 5: 站点页纯模型工具拆分

日期: 2026-05-24

- 范围: `frontend/src/views/SitesView.vue`、`frontend/src/sitesViewModel.ts`、`frontend/src/sitesViewConfig.ts`、`frontend/tests/sitesViewModel.test.ts`。
- 改动: 将站点页 cc-switch JSON/预览解析、localStorage JSON 候选判断、站点展示归一化、分组展示、推荐插件识别、签到时间格式化、API Key 路由默认值和 cc-switch 导出文件名构造移入 `sitesViewModel.ts`；保留站点加载、保存、导入导出、同步路由、API Key 更新、签到和批量任务流程。
- 文件长度检查: `SitesView.vue` 从 4292 行降至 4130 行，`sitesViewModel.ts` 为 187 行，`sitesViewConfig.ts` 为 121 行，`sitesViewModel.test.ts` 为 102 行。
- `git diff --check`: 通过。
- `node --test frontend/tests/*.test.ts`: 通过，19 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过，后端现有测试全部通过。

## 下一阶段任务 6: 站点页 API Key 展示模型拆分

日期: 2026-05-24

- 范围: `frontend/src/views/SitesView.vue`、`frontend/src/sitesApiKeyModel.ts`、`frontend/src/sitesViewModel.ts`、`frontend/tests/sitesViewModel.test.ts`。
- 改动: 将站点页 API Key 展示项映射、legacy `api_key` 兜底、草稿 key、Key 数量标签、请求 URL 文案、默认 endpoint hint、路由类型/路径标签和来源标签移入 `sitesApiKeyModel.ts`；保留弹窗草稿状态、API Key 新增/删除、保存、同步路由和凭证写入流程。
- 文件长度检查: `SitesView.vue` 从 4130 行降至 3981 行，`sitesApiKeyModel.ts` 为 229 行，`sitesViewModel.ts` 为 151 行，`sitesViewModel.test.ts` 为 242 行。
- `git diff --check`: 通过。
- `node --test frontend/tests/*.test.ts`: 通过，23 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 警告。
- `go test ./...`: 通过，后端现有测试全部通过。

## 下一阶段任务 7: 站点页浏览器存储模型拆分

日期: 2026-05-24

- 范围: `frontend/src/views/SitesView.vue`、`frontend/src/sitesStorageModel.ts`、`frontend/tests/sitesStorageModel.test.ts`、`frontend/tests/sitesViewModel.test.ts`。
- 改动: 将站点页浏览器存储导入相关的控制台采集脚本、插件配置值格式化、凭证字段 autocomplete/name、默认凭证 key、凭证建议合并、存储摘要和批量注册邮箱规则校验移入 `sitesStorageModel.ts`；保留 localStorage 分析 API 调用、插件切换、凭证回填、反馈展示、保存和批量注册流程。
- 文件长度检查: `SitesView.vue` 从 3981 行降至 3834 行，`sitesStorageModel.ts` 为 172 行，`sitesStorageModel.test.ts` 为 87 行，`sitesViewModel.test.ts` 为 242 行。
- `git diff --check`: 通过。
- `node --test frontend/tests/*.test.ts`: 通过，27 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 警告。
- `go test ./...`: 通过，后端现有测试全部通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。

## 下一阶段任务 8: 站点页结果合并模型拆分

日期: 2026-05-24

- 范围: `frontend/src/views/SitesView.vue`、`frontend/src/sitesResultModel.ts`、`frontend/tests/sitesResultModel.test.ts`。
- 改动: 将站点摘要、余额探测、邀请刷新、API Key 刷新、站点健康检查、编辑器健康回填和签到结果的合并规则移入 `sitesResultModel.ts`；`SitesView.vue` 使用 `Object.assign(target, merge...)` 保留 Vue 响应式对象引用。
- 行为修正: 邀请刷新结果现在会同步合并 `updated_credentials`，避免前端列表拿到新凭证但本地站点对象仍保留旧凭证。
- 文件长度检查: `SitesView.vue` 降至 3507 行，`sitesResultModel.ts` 为 252 行，`sitesResultModel.test.ts` 为 274 行。
- TDD 红灯: `node --test frontend/tests/sitesResultModel.test.ts` 首次失败于缺少 `mergeSiteHealthEditorPayload` 导出，确认测试覆盖新增合并口径。
- `git diff --check -- frontend/src/sitesResultModel.ts frontend/tests/sitesResultModel.test.ts frontend/src/views/SitesView.vue`: 通过。
- `node --test frontend/tests/sitesResultModel.test.ts`: 通过，7 个结果合并测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，54 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。

## 下一阶段任务 9: 站点页编辑器小工具拆分

日期: 2026-05-24

- 范围: `frontend/src/views/SitesView.vue`、`frontend/src/sitesEditorModel.ts`、`frontend/tests/sitesEditorModel.test.ts`。
- 改动: 将支持模型列表归一化、relay-only 判断、邀请入口可见性、缓存邀请信息读取和可编辑凭证 key 构造移入 `sitesEditorModel.ts`；`SitesView.vue` 仅保留依赖响应式 `plugins`、`editor` 的薄包装。
- 文件长度检查: `SitesView.vue` 降至 3490 行，`sitesEditorModel.ts` 为 145 行，`sitesEditorModel.test.ts` 为 160 行。
- TDD 红灯: `node --test frontend/tests/sitesEditorModel.test.ts` 首次失败于缺少 `editableCredentialKeysForPlugin` 导出，确认测试覆盖新增工具。
- `git diff --check -- frontend/src/sitesEditorModel.ts frontend/tests/sitesEditorModel.test.ts frontend/src/views/SitesView.vue`: 通过。
- `node --test frontend/tests/sitesEditorModel.test.ts`: 通过，8 个编辑器模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，57 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。

## 下一阶段任务 10: 站点页编辑器草稿构造拆分

日期: 2026-05-24

- 范围: `frontend/src/views/SitesView.vue`、`frontend/src/sitesEditorModel.ts`、`frontend/tests/sitesEditorModel.test.ts`。
- 改动: 将站点记录到编辑器草稿 payload 的构造、fallback 插件选择、支持模型归一化和编辑器分组名解析移入 `buildEditorAssignment`；`SitesView.vue` 的 `assignEditor` 只保留响应式赋值、默认配置应用和 mismatch 状态重置。
- 文件长度检查: `SitesView.vue` 降至 3485 行，`sitesEditorModel.ts` 为 175 行，`sitesEditorModel.test.ts` 为 203 行。
- TDD 红灯: `node --test frontend/tests/sitesEditorModel.test.ts` 首次失败于缺少 `buildEditorAssignment` 导出，确认测试覆盖新增草稿构造口径。
- `git diff --check -- frontend/src/sitesEditorModel.ts frontend/tests/sitesEditorModel.test.ts frontend/src/views/SitesView.vue`: 通过。
- `node --test frontend/tests/sitesEditorModel.test.ts`: 通过，9 个编辑器模型测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，58 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。

## 下一阶段任务 11: 站点页 API Key 草稿状态拆分

日期: 2026-05-24

- 范围: `frontend/src/views/SitesView.vue`、`frontend/src/sitesApiKeyDraftModel.ts`、`frontend/tests/sitesApiKeyDraftModel.test.ts`、`frontend/src/sitesApiKeyModel.ts`、`frontend/tests/sitesViewModel.test.ts`。
- 改动: 将 API Key 弹窗请求 URL、路由路径、图片生成路径和图片编辑路径的 draft map 初始化、读取、更新和删除规则移入 `sitesApiKeyDraftModel.ts`；`SitesView.vue` 保留响应式 draft state 与凭证写入流程。
- 文件长度检查: `SitesView.vue` 降至 3472 行，`sitesApiKeyModel.ts` 为 229 行，`sitesApiKeyDraftModel.ts` 为 78 行，`sitesViewModel.test.ts` 为 242 行，`sitesApiKeyDraftModel.test.ts` 为 73 行。
- TDD 红灯: `node --test frontend/tests/sitesViewModel.test.ts` 首次失败于缺少 `readApiKeyImageEditPathDraft` 导出，确认测试覆盖新增草稿状态口径。
- `git diff --check -- frontend/src/sitesApiKeyDraftModel.ts frontend/src/sitesApiKeyModel.ts frontend/tests/sitesApiKeyDraftModel.test.ts frontend/tests/sitesViewModel.test.ts frontend/src/views/SitesView.vue`: 通过。
- `node --test frontend/tests/sitesApiKeyDraftModel.test.ts frontend/tests/sitesViewModel.test.ts`: 通过，10 个相关测试全部通过。
- `node --test frontend/tests/*.test.ts`: 通过，59 个前端状态辅助测试全部通过。
- `npm run build`: 通过。仍有既有大 chunk 和 plugin timing 警告。
- `go test ./...`: 通过，后端现有测试全部通过。
- `go build ./...`: 通过。
- `go vet ./...`: 通过。
- `npm audit --audit-level=high`: 通过，0 个漏洞。
