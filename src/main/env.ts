import { loadDesktopEnv } from './platformSecurity.js'
import WebSocket from 'ws'

if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket
}

loadDesktopEnv()
