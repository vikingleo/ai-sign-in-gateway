## v1.0.6

### Downloads

- ai-sign-in-gateway
- ai-sign-in-gateway-server-linux-amd64
- ai-sign-in-gateway-windows-amd64.exe
- ai-sign-in-gateway-x86_64.AppImage
- ai-sign-in-gateway-v1.0.6-SHA256SUMS.txt

### Defaults

- 服务版默认监听 `0.0.0.0:8972`
- 桌面端默认入口 `127.0.0.1:3721`，后端/API/网关 `127.0.0.1:8972`
- 端口占用时沿用自动偏移策略

### Commits since last release

2fa598e 加强前端轮询请求回收
aa2aed5 降低网关统计查询内存占用
ccf61c2 同步公开版网关功能更新
b2d0074 Sync gateway routing and monitoring updates
6a42c24 Pass through gateway wire API mode
47bfd30 Ignore client wire API for routed upstreams
f1c78df Distinguish GPT chat and Codex responses routes
33a9a0c Sync gateway routing and chat updates
