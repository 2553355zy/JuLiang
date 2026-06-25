const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('juliang', {
  getRuntimeInfo: () => ipcRenderer.invoke('runtime:getInfo'),
  getRuntimeConfigStatus: () => ipcRenderer.invoke('runtime:getConfigStatus'),
  oceanEngine: {
    getAuthStatus: () => ipcRenderer.invoke('oceanengine:getAuthStatus'),
    listAuthorizedAdvertisers: () => ipcRenderer.invoke('oceanengine:listAuthorizedAdvertisers'),
    queryReport: (query) => ipcRenderer.invoke('oceanengine:queryReport', query),
    getFundBalances: (advertiserIds) => ipcRenderer.invoke('oceanengine:getFundBalances', advertiserIds),
  },
  feishu: {
    sendNotification: (draft) => ipcRenderer.invoke('feishu:sendNotification', draft),
  },
  operationAudit: {
    saveLogs: (logs) => ipcRenderer.invoke('operationAudit:saveLogs', logs),
    listLogs: () => ipcRenderer.invoke('operationAudit:listLogs'),
    getSummary: () => ipcRenderer.invoke('operationAudit:getSummary'),
  },
})
