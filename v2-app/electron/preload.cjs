const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('juliang', {
  getRuntimeInfo: () => ipcRenderer.invoke('runtime:getInfo'),
  getRuntimeConfigStatus: () => ipcRenderer.invoke('runtime:getConfigStatus'),
})
