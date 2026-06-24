# UI 设计语言重构计划

## 目标

在不迁移前端框架、不改变业务接口的前提下，把管理端重构为参考站截图同类的白底蓝色运营后台设计语言。

## 任务

- [x] 任务 1: 收敛全局 token 和 Ant Design Vue theme，统一颜色、圆角、边框、阴影、字体密度。验证: `npm run build`、`npm audit --audit-level=high`、`git diff --check` 已通过。
- [x] 任务 2: 重构 `ShellLayout.vue` 的侧边导航和顶部栏。验证: `npm run build`、`npm audit --audit-level=high`、`git diff --check`、1440px/390px 浏览器几何检查已通过。
- [x] 任务 3: 重构 `OverviewView.vue` 为参考站式总览页。验证: `npm run build`、`npm audit --audit-level=high`、`git diff --check`、真实空数据 1440px/1024px/390px、临时 visual fixture 有数据 1440px/390px 浏览器几何检查已通过。
- [x] 任务 4: 统一 `GatewayView.vue` 和 `SitesView.vue` 的表格、筛选区、弹窗、抽屉视觉。验证: `npm run build`、`npm audit --audit-level=high`、`git diff --check`、装饰符号/tab 扫描、路由管理/网关监控/站点中心 1440px/1024px/390px 浏览器几何检查已通过。
- [x] 任务 5: 统一 `ChatTestView.vue`、`SettingsView.vue`、`DesktopServiceView.vue` 与登录页的面板语言。验证: `npm run build`、`npm audit --audit-level=high`、`git diff --check`、装饰符号/tab 扫描、对话页/设置页/桌面服务页/登录页 1440px/1024px/390px 浏览器几何检查和登录跳转检查已通过。
- [x] 任务 6: 做响应式和可访问性检查。验证: `npm run build`、`npm audit --audit-level=high`、`git diff --check`、装饰符号/tab 扫描、8 个主要路由在 1440px/1024px/390px 下浏览器响应式和基础可访问性检查已通过。
- [x] 任务 7: 执行构建和运行态验证。验证: `npm run build`、`docker compose up -d --build`、`curl /api/health`、登录接口和 8972 运行态浏览器主要页面检查已通过。

## 完成标准

- [x] 所有核心页面共享同一套设计 token。
- [x] 参考站的白底、蓝色导航、紧凑卡片、浅灰背景和运营后台密度已经落地。
- [x] 未引入 React、shadcn/ui 或 Tailwind 迁移风险。
- [x] 构建、浏览器检查和必要 Docker 验证有明确记录。
