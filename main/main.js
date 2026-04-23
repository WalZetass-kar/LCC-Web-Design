import path from 'path';
import { fileURLToPath } from 'url';
import AuthHandler from './ipc/AuthHandler.js';
import ProductHandler from './ipc/ProductHandler.js';
import CategoryHandler from './ipc/CategoryHandler.js';
import TransactionHandler from './ipc/TransactionHandler.js';
import DatabaseHandler from './ipc/DatabaseHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const devServerUrl = 'http://localhost:5173';
const productionEntry = path.join(__dirname, '../dist/index.html');
const isLinux = process.platform === 'linux';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(...args) {
  console.log('[Electron]', ...args);
}

function logError(...args) {
  console.error('[Electron]', ...args);
}

function warnIfRunningAsRoot() {
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    logError('Root user detected on Linux. Electron will continue with no-sandbox flags, but using a non-root user is strongly recommended.');
  }
}

function registerProcessDiagnostics(app) {
  process.on('uncaughtException', (error) => {
    logError('Uncaught exception in main process:', error);
  });

  process.on('unhandledRejection', (reason) => {
    logError('Unhandled rejection in main process:', reason);
  });

  app.on('child-process-gone', (event, details) => {
    logError('Child process exited unexpectedly:', details);
  });

  app.on('render-process-gone', (event, webContents, details) => {
    logError('Renderer process exited unexpectedly:', details);
  });
}

function createFallbackHtml({ title, message, target, detailLines = [] }) {
  const detailsHtml = detailLines
    .filter(Boolean)
    .map((line) => `<li>${line}</li>`)
    .join('');

  const retryButton = target
    ? `<button id="retry-button" style="cursor:pointer;padding:10px 16px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-weight:600;">Retry</button>`
    : '';

  const safeTarget = JSON.stringify(target ?? '');

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
      <style>
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          font-family: Arial, sans-serif;
          background: #0f172a;
          color: #e2e8f0;
        }
        .panel {
          width: min(640px, calc(100vw - 48px));
          padding: 32px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.92);
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.45);
          border: 1px solid rgba(148, 163, 184, 0.18);
        }
        h1 {
          margin: 0 0 12px;
          font-size: 24px;
        }
        p {
          margin: 0 0 16px;
          line-height: 1.6;
          color: #cbd5e1;
        }
        ul {
          margin: 0 0 20px;
          padding-left: 20px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <main class="panel">
        <h1>${title}</h1>
        <p>${message}</p>
        ${detailsHtml ? `<ul>${detailsHtml}</ul>` : ''}
        ${retryButton}
      </main>
      <script>
        const target = ${safeTarget};
        const retryButton = document.getElementById('retry-button');
        if (retryButton && target) {
          retryButton.addEventListener('click', () => {
            window.location.href = target;
          });
        }
      </script>
    </body>
  </html>`;
}

export default function startElectronApp({ app, BrowserWindow, ipcMain }) {
  const isDev = !app.isPackaged;
  const shouldOpenDevTools = process.env.ELECTRON_OPEN_DEVTOOLS === 'true';
  const loadRetryLimit = 5;
  let mainWindow = null;

  if (isLinux) {
    warnIfRunningAsRoot();
  }
  registerProcessDiagnostics(app);

  async function showFallbackPage(window, title, message, detailLines = []) {
    if (window.isDestroyed()) {
      return;
    }

    const target = isDev ? devServerUrl : undefined;
    const fallbackHtml = createFallbackHtml({
      title,
      message,
      target,
      detailLines
    });

    await window.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(fallbackHtml)}`);
  }

  function attachWindowDiagnostics(window) {
    window.webContents.on('did-finish-load', () => {
      log(`Renderer loaded: ${window.webContents.getURL()}`);
    });

    window.webContents.on('did-fail-load', async (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame || errorCode === -3) {
        return;
      }

      logError('Renderer failed to load:', {
        errorCode,
        errorDescription,
        validatedURL
      });
    });

    window.webContents.on('render-process-gone', async (event, details) => {
      logError('Window renderer process exited unexpectedly:', details);

      try {
        await showFallbackPage(
          window,
          'Renderer crashed',
          'The Electron renderer process exited unexpectedly.',
          [
            `Reason: ${details.reason}`,
            `Exit code: ${details.exitCode}`
          ]
        );
      } catch (error) {
        logError('Failed to render fallback crash page:', error);
      }
    });

    window.webContents.on('unresponsive', () => {
      logError('Renderer became unresponsive.');
    });

    window.webContents.on('responsive', () => {
      log('Renderer responsive again.');
    });
  }

  async function loadRenderer(window, attempt = 1) {
    try {
      if (isDev) {
        log(`Loading development URL (attempt ${attempt}/${loadRetryLimit}): ${devServerUrl}`);
        await window.loadURL(devServerUrl);

        if (shouldOpenDevTools) {
          window.webContents.openDevTools({ mode: 'detach' });
        }
        return;
      }

      log(`Loading production file: ${productionEntry}`);
      await window.loadFile(productionEntry);
    } catch (error) {
      logError(`Failed to load renderer on attempt ${attempt}:`, error);

      if (isDev && attempt < loadRetryLimit) {
        await delay(1000);
        return loadRenderer(window, attempt + 1);
      }

      await showFallbackPage(
        window,
        'Failed to start renderer',
        'Electron opened, but the React renderer could not be loaded.',
        [
          `Target: ${isDev ? devServerUrl : productionEntry}`,
          `Error: ${error.message}`
        ]
      );
    }
  }

  async function createWindow() {
    const window = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1024,
      minHeight: 640,
      show: false,
      backgroundColor: '#0f172a',
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    window.once('ready-to-show', () => {
      window.show();
    });

    window.on('closed', () => {
      if (mainWindow === window) {
        mainWindow = null;
      }
    });

    attachWindowDiagnostics(window);
    await loadRenderer(window);
    mainWindow = window;

    return window;
  }

  function registerIpcHandlers() {
    AuthHandler.register(ipcMain);
    ProductHandler.register(ipcMain);
    CategoryHandler.register(ipcMain);
    TransactionHandler.register(ipcMain);
    DatabaseHandler.register(ipcMain);
  }

  app.whenReady().then(async () => {
    log(`App ready on ${process.platform}. Packaged=${app.isPackaged}`);

    DatabaseHandler.initialize().catch((error) => {
      logError('Database initialization failed:', error);
    });

    registerIpcHandlers();
    await createWindow();

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    DatabaseHandler.close();
  });
}
