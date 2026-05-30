/**
 * ═══════════════════════════════════════════════════════════════════════
 * MAIN PROCESS — Electron Entry Point with DEMO MODE Hardening
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Security hardening applied:
 * 1. contextIsolation: true (already set)
 * 2. nodeIntegration: false (already set)
 * 3. DevTools disabled for demo users
 * 4. IPC handlers wrapped with demo guard
 * 5. Server-side session management
 */

import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { registerIpcHandlers } from './ipcHandlers.js'
import { SchedulerService } from '../backend/services/scheduler.js'
import { demoSession } from '../backend/services/demoSessionManager.js'
import { initDatabase } from '../backend/utils/dbInit.js'
import { SyncServerService } from './syncServer.js'
import { SyncClientService } from './syncClient.js'
import { registerSecureStorageHandlers } from './secureStorage.js'
import {
  attachWindowSecurity,
  configureElectronSecurity,
  flushPendingDeepLink,
  loadDesktopEnv,
  registerDesktopDeepLinks,
} from './platformSecurity.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null

loadDesktopEnv()
registerDesktopDeepLinks(isDev)

function getAppIconPath() {
  return isDev
    ? path.join(process.cwd(), 'build', 'icon.png')
    : path.join(process.resourcesPath, 'app-icon.png')
}

function createWindow() {
  // Preload script path - use .cjs file (CommonJS) because package.json has "type": "module"
  const preloadPath = isDev 
    ? path.join(process.cwd(), 'src', 'main', 'preload.cjs')
    : path.join(app.getAppPath(), 'dist-electron', 'main', 'preload.cjs')

  console.log('🔍 Preload path:', preloadPath)
  console.log('🔍 Preload exists:', existsSync(preloadPath))
  const iconPath = getAppIconPath()

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,      // SECURITY: Isolate renderer from Node.js
      nodeIntegration: false,       // SECURITY: No Node.js in renderer
      sandbox: false,
      webSecurity: true,                   // SECURITY: Always enforce web security
      devTools: isDev,
    },
    titleBarStyle: 'default',
    show: false,
    backgroundColor: '#f8fafc',
    icon: existsSync(iconPath) ? iconPath : undefined,
  })

  mainWindow = win
  attachWindowSecurity(win, isDev)

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    const rendererIndexPath = path.join(app.getAppPath(), 'dist', 'index.html')
    console.log('🔍 Renderer index path:', rendererIndexPath)
    console.log('🔍 Renderer index exists:', existsSync(rendererIndexPath))
    win.loadFile(rendererIndexPath)
  }

  // Log when preload script fails
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Failed to load:', errorCode, errorDescription)
  })

  // Check if preload was loaded
  win.webContents.on('did-finish-load', () => {
    console.log('✅ Page loaded')
    // Check if window.api is available
    win.webContents.executeJavaScript('typeof window.api !== "undefined"')
      .then(hasApi => {
        console.log('🎯 window.api available:', hasApi)
        if (!hasApi) {
          console.error('❌ window.api is NOT available! Preload failed!')
        }
      })
    flushPendingDeepLink(win)
  })

  // ═══════════════════════════════════════════════════════════════════
  // DEMO MODE HARDENING: Disable DevTools for demo users
  // ═══════════════════════════════════════════════════════════════════
  win.webContents.on('devtools-opened', () => {
    if (!isDev || demoSession.isDemoMode()) {
      console.warn('🚫 DevTools blocked')
      win.webContents.closeDevTools()
    }
  })

  // Block keyboard shortcut for DevTools in packaged builds and demo mode.
  win.webContents.on('before-input-event', (event, input) => {
    if (!isDev || demoSession.isDemoMode()) {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (
        input.key === 'F12' ||
        (input.control && input.shift && ['I', 'i', 'J', 'j', 'C', 'c'].includes(input.key))
      ) {
        event.preventDefault()
        console.warn('🚫 DevTools shortcut blocked')
      }
    }
  })

  win.once('ready-to-show', () => win.show())
}

app.whenReady().then(() => {
  configureElectronSecurity(isDev)

  // Initialize database tables first
  initDatabase()
  
  registerSecureStorageHandlers(ipcMain)
  registerIpcHandlers(ipcMain)
  SyncClientService.init()
  SyncServerService.init()
  
  // Start scheduler service
  SchedulerService.start()
  
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Stop scheduler before quit
  SchedulerService.stop()
  void SyncServerService.stop()
  
  // Clear demo session
  demoSession.clearSession()
  
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  // Stop scheduler before quit
  SchedulerService.stop()
  void SyncServerService.stop()
  
  // Clear demo session
  demoSession.clearSession()
})
