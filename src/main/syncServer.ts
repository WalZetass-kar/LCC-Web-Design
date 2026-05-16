import { app } from 'electron'
import crypto from 'crypto'
import http, { type IncomingMessage, type ServerResponse } from 'http'
import os from 'os'
import fs from 'fs'
import path from 'path'

interface SyncServerConfig {
  enabled: boolean
  port: number
  token: string
}

interface SyncServerStatus {
  enabled: boolean
  running: boolean
  port: number
  token: string
  urls: string[]
  error: string | null
  requestCount: number
  lastRequestAt: string | null
  lastChannel: string | null
}

const DEFAULT_PORT = 38573
const MAX_BODY_BYTES = 5 * 1024 * 1024

let invokeChannel: (channel: string, args: unknown[]) => Promise<unknown> = async (channel) => ({
  success: false,
  message: `Dispatcher sinkronisasi belum siap: ${channel}`,
})

export function setSyncChannelInvoker(invoker: (channel: string, args: unknown[]) => Promise<unknown>) {
  invokeChannel = invoker
}

function randomToken() {
  return crypto.randomBytes(24).toString('hex')
}

function getConfigPath() {
  return path.join(app.getPath('userData'), 'sync-server.json')
}

function defaultConfig(): SyncServerConfig {
  return {
    enabled: true,
    port: DEFAULT_PORT,
    token: randomToken(),
  }
}

function normalizeConfig(value: Partial<SyncServerConfig> | null): SyncServerConfig {
  const base = defaultConfig()
  const port = Number(value?.port)
  return {
    enabled: value?.enabled ?? base.enabled,
    port: Number.isInteger(port) && port > 0 && port < 65536 ? port : base.port,
    token: typeof value?.token === 'string' && value.token.length >= 16 ? value.token : base.token,
  }
}

function localUrls(port: number) {
  const urls = [`http://127.0.0.1:${port}`]
  const interfaces = os.networkInterfaces()

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        urls.push(`http://${entry.address}:${port}`)
      }
    }
  }

  return [...new Set(urls)]
}

function readJsonBody(req: IncomingMessage) {
  return new Promise<any>((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
      if (body.length > MAX_BODY_BYTES) {
        reject(new Error('Payload terlalu besar'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('Payload JSON tidak valid'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(data))
}

class SyncServer {
  private config: SyncServerConfig | null = null
  private server: http.Server | null = null
  private lastError: string | null = null
  private requestCount = 0
  private lastRequestAt: string | null = null
  private lastChannel: string | null = null

  init() {
    this.config = this.loadConfig()
    if (this.config.enabled) {
      void this.start()
    }
  }

  getStatus(): SyncServerStatus {
    const config = this.ensureConfig()
    return {
      enabled: config.enabled,
      running: Boolean(this.server?.listening),
      port: config.port,
      token: config.token,
      urls: localUrls(config.port),
      error: this.lastError,
      requestCount: this.requestCount,
      lastRequestAt: this.lastRequestAt,
      lastChannel: this.lastChannel,
    }
  }

  saveConfig(input: Partial<SyncServerConfig>) {
    const current = this.ensureConfig()
    const next = normalizeConfig({
      ...current,
      ...input,
      token: input.token || current.token,
    })

    this.config = next
    this.persistConfig(next)

    if (next.enabled) {
      void this.restart()
    } else {
      void this.stop()
    }

    return this.getStatus()
  }

  rotateToken() {
    return this.saveConfig({ token: randomToken() })
  }

  async start() {
    const config = this.ensureConfig()
    if (this.server?.listening) return

    this.lastError = null
    this.server = http.createServer((req, res) => {
      void this.handleRequest(req, res)
    })

    await new Promise<void>((resolve) => {
      this.server!.once('error', error => {
        this.lastError = error instanceof Error ? error.message : String(error)
        console.error('❌ Sync server failed:', this.lastError)
        resolve()
      })
      this.server!.listen(config.port, '0.0.0.0', () => {
        console.log(`🔄 Sync server running at ${localUrls(config.port).join(', ')}`)
        resolve()
      })
    })
  }

  async restart() {
    await this.stop()
    await this.start()
  }

  async stop() {
    const server = this.server
    this.server = null
    if (!server?.listening) return

    await new Promise<void>(resolve => {
      server.close(() => resolve())
    })
  }

  private ensureConfig() {
    if (!this.config) this.config = this.loadConfig()
    return this.config
  }

  private loadConfig() {
    const file = getConfigPath()
    try {
      if (!fs.existsSync(file)) {
        const config = defaultConfig()
        this.persistConfig(config)
        return config
      }
      return normalizeConfig(JSON.parse(fs.readFileSync(file, 'utf8')))
    } catch {
      const config = defaultConfig()
      this.persistConfig(config)
      return config
    }
  }

  private persistConfig(config: SyncServerConfig) {
    const file = getConfigPath()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(config, null, 2))
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse) {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {})
      return
    }

    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, {
        success: true,
        data: {
          app: 'MediaSoft POS Zetass v2.0',
          serverTime: new Date().toISOString(),
          tokenRequired: true,
        },
      })
      return
    }

    if (req.method !== 'POST' || req.url !== '/api/invoke') {
      sendJson(res, 404, { success: false, message: 'Endpoint tidak ditemukan' })
      return
    }

    try {
      const body = await readJsonBody(req)
      const token = String(body.token ?? '')
      const config = this.ensureConfig()

      const tokenBuffer = Buffer.from(token)
      const expectedBuffer = Buffer.from(config.token)
      if (tokenBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(tokenBuffer, expectedBuffer)) {
        sendJson(res, 401, { success: false, message: 'Token sinkronisasi tidak valid' })
        return
      }

      const channel = String(body.channel ?? '')
      const args = Array.isArray(body.args) ? body.args : []
      this.requestCount += 1
      this.lastRequestAt = new Date().toISOString()
      this.lastChannel = channel
      const result = await invokeChannel(channel, args)
      sendJson(res, 200, result)
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

export const SyncServerService = new SyncServer()
