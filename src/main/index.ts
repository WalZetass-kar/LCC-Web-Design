import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { registerIpcHandlers } from './ipcHandlers.js'
import { SchedulerService } from '../backend/services/scheduler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  // Preload script path - use .cjs file (CommonJS) because package.json has "type": "module"
  const preloadPath = isDev 
    ? path.join(process.cwd(), 'src', 'main', 'preload.cjs')
    : path.join(__dirname, 'preload.cjs')

  console.log('🔍 Preload path:', preloadPath)
  console.log('🔍 Preload exists:', existsSync(preloadPath))

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: isDev ? false : true, // Disable web security in dev mode
    },
    titleBarStyle: 'default',
    show: false,
    backgroundColor: '#f8fafc',
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
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
  })

  win.once('ready-to-show', () => win.show())
}

app.whenReady().then(() => {
  registerIpcHandlers(ipcMain)
  
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
  
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  // Stop scheduler before quit
  SchedulerService.stop()
})
