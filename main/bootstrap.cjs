const { app, BrowserWindow, ipcMain } = require('electron');
const isLinux = process.platform === 'linux';

if (isLinux) {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-setuid-sandbox');
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
  app.disableHardwareAcceleration();
}

import('./main.js')
  .then(({ default: startElectronApp }) => {
    startElectronApp({ app, BrowserWindow, ipcMain });
  })
  .catch((error) => {
    console.error('[ERROR] Failed to bootstrap Electron:', error);
    app.quit();
  });
