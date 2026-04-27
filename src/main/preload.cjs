const { contextBridge, ipcRenderer } = require('electron')

// Log to verify preload is running
console.log('🔧 Preload script is running...')

// Expose safe IPC bridge to renderer via window.api
contextBridge.exposeInMainWorld('api', {
  invoke: (channel, ...args) => {
    console.log('📡 IPC invoke:', channel, args)
    return ipcRenderer.invoke(channel, ...args)
  },
})

console.log('✅ window.api exposed successfully')
