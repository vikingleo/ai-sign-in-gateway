import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

type FrontendRequest = {
  file: string
  line: number
  method: string
  path: string
  rawPath: string
}

type BackendRoute = {
  file: string
  line: number
  method: string
  path: string
}

const backendModuleRoutes = [
  { file: 'internal/handlers/auth.go', prefix: '/auth/admin-users' },
  { file: 'internal/handlers/sites.go', prefix: '/sites' },
  { file: 'internal/handlers/checkins.go', prefix: '/checkins' },
  { file: 'internal/handlers/settings.go', prefix: '/settings' },
  { file: 'internal/handlers/tools.go', prefix: '/tools' },
  { file: 'internal/handlers/gateway_admin.go', prefix: '/gateway-admin' },
]

const allowedBackendOnlyRoutes = new Set([
  'GET /health',
  'GET /features',
  'ANY /gateway/v1/*',
  'ANY /gateway/v1',
  'ANY /gateway/*',
  'ANY /gateway',
  'ANY /v1/*',
  'ANY /v1',
  'ANY /responses/*',
  'ANY /responses',
])

function repoPath(path: string): string {
  return join(repoRoot, path)
}

function frontendApiFiles(): string[] {
  const srcDir = repoPath('frontend/src')
  return readdirSync(srcDir)
    .filter((entry) => entry.startsWith('api') && entry.endsWith('.ts') && entry !== 'apiCore.ts')
    .map((entry) => `frontend/src/${entry}`)
    .sort()
}

function lineNumber(source: string, index: number): number {
  return source.slice(0, index).split('\n').length
}

function skipWhitespace(source: string, index: number): number {
  let current = index
  while (current < source.length && /\s/.test(source[current])) {
    current += 1
  }
  return current
}

function readStringLiteral(source: string, index: number): string | null {
  const start = skipWhitespace(source, index)
  const quote = source[start]
  if (quote !== '"' && quote !== "'" && quote !== '`') {
    return null
  }
  let value = ''
  for (let current = start + 1; current < source.length; current += 1) {
    const char = source[current]
    if (char === '\\') {
      value += char + source[current + 1]
      current += 1
      continue
    }
    if (char === quote) {
      return value
    }
    value += char
  }
  return null
}

function matchingParenIndex(source: string, openIndex: number): number {
  let depth = 0
  let quote = ''
  for (let current = openIndex; current < source.length; current += 1) {
    const char = source[current]
    if (quote) {
      if (char === '\\') {
        current += 1
        continue
      }
      if (char === quote) {
        quote = ''
      }
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '(') {
      depth += 1
      continue
    }
    if (char === ')') {
      depth -= 1
      if (depth === 0) {
        return current
      }
    }
  }
  return -1
}

function frontendMethod(fnName: string, callBody: string): string {
  const method = callBody.match(/method:\s*['"]([A-Z]+)['"]/)?.[1]
  if (method) {
    return method
  }
  if (fnName === 'requestForm') {
    return 'POST'
  }
  return 'GET'
}

function normalizeFrontendPath(rawPath: string): string {
  let path = rawPath.replace(/\$\{(?:suffix|query)\}/g, '')
  const queryStart = path.indexOf('?')
  if (queryStart >= 0) {
    path = path.slice(0, queryStart)
  }
  path = path.replace(/\$\{[^}]+\}/g, ':param')
  return trimTrailingSlash(path)
}

function trimTrailingSlash(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1)
  }
  return path
}

function normalizeBackendPath(path: string): string {
  const withoutAPI = path.startsWith('/api') ? path.slice('/api'.length) || '/' : path
  return trimTrailingSlash(withoutAPI.replace(/\{[^}]+\}/g, ':param'))
}

function combinePaths(prefix: string, child: string): string {
  if (child === '/') {
    return prefix
  }
  return `${prefix}${child.startsWith('/') ? child : `/${child}`}`
}

async function frontendRequests(): Promise<FrontendRequest[]> {
  const requests: FrontendRequest[] = []
  const callPattern = /\b(request(?:Form|Download)?)(?:<[^>]+>)?\s*\(/g
  for (const file of frontendApiFiles()) {
    const source = await readFile(repoPath(file), 'utf8')
    let match: RegExpExecArray | null
    while ((match = callPattern.exec(source))) {
      const openIndex = callPattern.lastIndex - 1
      const rawPath = readStringLiteral(source, openIndex + 1)
      if (!rawPath) {
        continue
      }
      const closeIndex = matchingParenIndex(source, openIndex)
      assert.notEqual(closeIndex, -1, `无法解析 ${file}:${lineNumber(source, match.index)} 的 request 调用`)
      const callBody = source.slice(openIndex, closeIndex + 1)
      requests.push({
        file,
        line: lineNumber(source, match.index),
        method: frontendMethod(match[1], callBody),
        path: normalizeFrontendPath(rawPath),
        rawPath,
      })
    }
  }
  return requests
}

function routeKey(route: Pick<BackendRoute, 'method' | 'path'>): string {
  return `${route.method} ${route.path}`
}

async function rootBackendRoutes(): Promise<BackendRoute[]> {
  const file = 'internal/handlers/router.go'
  const source = await readFile(repoPath(file), 'utf8')
  const routes: BackendRoute[] = []
  const routePattern = /\b(?:r|protected)\.(Get|Post|Put|Patch|Delete|HandleFunc)\("([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = routePattern.exec(source))) {
    routes.push({
      file,
      line: lineNumber(source, match.index),
      method: match[1] === 'HandleFunc' ? 'ANY' : match[1].toUpperCase(),
      path: normalizeBackendPath(match[2]),
    })
  }
  return routes
}

async function moduleBackendRoutes(): Promise<BackendRoute[]> {
  const routes: BackendRoute[] = []
  const routePattern = /\br\.(Get|Post|Put|Patch|Delete)\("([^"]+)"/g
  for (const module of backendModuleRoutes) {
    const source = await readFile(repoPath(module.file), 'utf8')
    let match: RegExpExecArray | null
    while ((match = routePattern.exec(source))) {
      routes.push({
        file: module.file,
        line: lineNumber(source, match.index),
        method: match[1].toUpperCase(),
        path: normalizeBackendPath(combinePaths(module.prefix, match[2])),
      })
    }
  }
  return routes
}

async function backendRoutes(): Promise<BackendRoute[]> {
  const routes = [...await rootBackendRoutes(), ...await moduleBackendRoutes()]
  const unique = new Map<string, BackendRoute>()
  for (const route of routes) {
    unique.set(routeKey(route), route)
  }
  return [...unique.values()]
}

function pathMatches(frontendPath: string, backendPath: string): boolean {
  if (backendPath.endsWith('/*')) {
    return frontendPath.startsWith(backendPath.slice(0, -1))
  }
  const frontendParts = frontendPath.split('/').filter(Boolean)
  const backendParts = backendPath.split('/').filter(Boolean)
  if (frontendParts.length !== backendParts.length) {
    return false
  }
  return backendParts.every((part, index) => part === ':param' || part === frontendParts[index])
}

function routeMatches(request: FrontendRequest, route: BackendRoute): boolean {
  return (route.method === 'ANY' || route.method === request.method) && pathMatches(request.path, route.path)
}

function requestLabel(request: FrontendRequest): string {
  return `${request.method} ${request.path} (${request.file}:${request.line})`
}

test('frontend API adapter calls are backed by registered Go routes', async () => {
  const requests = await frontendRequests()
  const routes = await backendRoutes()
  const missing = requests.filter((request) => !routes.some((route) => routeMatches(request, route)))

  assert.deepEqual(missing.map(requestLabel), [])
})

test('backend-only API routes are explicitly classified', async () => {
  const requests = await frontendRequests()
  const routes = await backendRoutes()
  const backendOnly = routes.filter(
    (route) =>
      !requests.some((request) => routeMatches(request, route)) &&
      !allowedBackendOnlyRoutes.has(routeKey(route)),
  )

  assert.deepEqual(backendOnly.map((route) => `${routeKey(route)} (${route.file}:${route.line})`), [])
})

function walkFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const target = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(target))
    } else if (['.ts', '.vue'].includes(extname(entry.name))) {
      files.push(target)
    }
  }
  return files
}

test('frontend network calls stay behind the API adapter boundary', async () => {
  const files = walkFiles(repoPath('frontend/src'))
  const allowedDirectFiles = new Set(['frontend/src/apiCore.ts'])
  const directPattern = /\b(fetch|XMLHttpRequest|EventSource|WebSocket)\s*\(/g
  const checks = files.map(async (filePath) => {
    const file = relative(repoRoot, filePath)
    if (allowedDirectFiles.has(file) || !existsSync(filePath)) {
      return []
    }
    const source = await readFile(filePath, 'utf8')
    const offenders: string[] = []
    let match: RegExpExecArray | null
    while ((match = directPattern.exec(source))) {
      offenders.push(`${file}:${lineNumber(source, match.index)} ${match[1]}`)
    }
    return offenders
  })
  const offenders = (await Promise.all(checks)).flat()

  assert.deepEqual(offenders, [])
})

test('route group update keeps existing API key unless the caller changes it', async () => {
  const source = await readFile(repoPath('frontend/src/apiGateway.ts'), 'utf8')
  const updateSource = source.slice(source.indexOf('export function updateGatewayRouteGroup'))

  assert.doesNotMatch(updateSource, /api_key:\s*payload\.api_key\s*\?\?\s*''/)
  assert.match(updateSource, /\.\.\.\(payload\.api_key !== undefined \? \{ api_key: payload\.api_key \} : \{\}\)/)
  assert.match(updateSource, /\.\.\.\(payload\.clear_api_key \? \{ clear_api_key: true \} : \{\}\)/)
})

test('route group create omits blank API key payloads', async () => {
  const source = await readFile(repoPath('frontend/src/apiGateway.ts'), 'utf8')
  const createSource = source.slice(
    source.indexOf('export function createGatewayRouteGroup'),
    source.indexOf('export function updateGatewayRouteGroup'),
  )

  assert.match(createSource, /const apiKey = payload\.api_key\?\.trim\(\)/)
  assert.doesNotMatch(createSource, /api_key:\s*payload\.api_key\s*\?\?\s*''/)
  assert.match(createSource, /\.\.\.\(apiKey \? \{ api_key: apiKey \} : \{\}\)/)
})

test('priority reorder payload type requires move index', async () => {
  const source = await readFile(repoPath('frontend/src/apiGateway.ts'), 'utf8')

  assert.match(source, /export type GatewayRoutePriorityReorderPayload\s*=/)
  assert.match(source, /\|\s*\{\s*route_id:\s*number;\s*mode:\s*'move';\s*index:\s*number\s*\}/)
  assert.match(source, /\|\s*\{\s*mode:\s*'package'\s*\|\s*'balance';\s*route_id\?:\s*number;\s*index\?:\s*never\s*\}/)
  assert.doesNotMatch(source, /mode:\s*'move'\s*\|\s*'package'\s*\|\s*'balance'[\s\S]{0,80}index\?:\s*number/)
})
