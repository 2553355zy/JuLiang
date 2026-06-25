const path = require('node:path')
const { app, BrowserWindow, ipcMain, shell } = require('electron')
const feishuNotifier = require('./feishuNotifier.cjs')
const oceanEngineReadOnly = require('./oceanEngineReadOnly.cjs')
const operationAuditStore = require('./operationAuditStore.cjs')

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)
const executionMode = process.env.JULIANG_EXECUTION_MODE || 'readonly'
const notificationMode = process.env.JULIANG_NOTIFICATION_MODE || 'preview'

app.setName('JuLiang V2')

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    title: 'JuLiang V2 ROI Ops Console',
    backgroundColor: '#f4f6f8',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

ipcMain.handle('runtime:getInfo', () => ({
  appVersion: app.getVersion(),
  platform: process.platform,
  mode: isDev ? 'development' : 'production',
}))

ipcMain.handle('runtime:getConfigStatus', () => ({
  oceanEngineBaseUrl: process.env.OCEANENGINE_BASE_URL || 'https://api.oceanengine.com',
  hasOceanEngineClient: Boolean(process.env.OCEANENGINE_CLIENT_ID && process.env.OCEANENGINE_CLIENT_SECRET),
  hasOceanEngineAccessToken: Boolean(process.env.OCEANENGINE_ACCESS_TOKEN),
  hasOceanEngineRefreshToken: Boolean(process.env.OCEANENGINE_REFRESH_TOKEN),
  hasFeishuWebhook: Boolean(process.env.FEISHU_WEBHOOK_URL),
  operationAllowlistedAccountIds: parseCsv(process.env.JULIANG_OPERATION_ALLOWLIST),
  executionMode: ['readonly', 'preview', 'live'].includes(executionMode) ? executionMode : 'readonly',
  notificationMode: ['preview', 'live'].includes(notificationMode) ? notificationMode : 'preview',
  source: 'electron-main',
}))

ipcMain.handle('oceanengine:getAuthStatus', oceanEngineReadOnly.getAuthStatus)
ipcMain.handle('oceanengine:listAuthorizedAdvertisers', oceanEngineReadOnly.listAuthorizedAdvertisers)
ipcMain.handle('oceanengine:queryReport', (_event, query) => oceanEngineReadOnly.queryReport(query))
ipcMain.handle('oceanengine:getFundBalances', (_event, advertiserIds) =>
  oceanEngineReadOnly.getFundBalances(advertiserIds),
)
ipcMain.handle('feishu:sendNotification', (_event, draft) => feishuNotifier.sendNotification(draft))
ipcMain.handle('operationAudit:saveLogs', (_event, logs) => operationAuditStore.saveLogs(logs))
ipcMain.handle('operationAudit:listLogs', () => operationAuditStore.listLogs())
ipcMain.handle('operationAudit:getSummary', () => operationAuditStore.getSummary())

app.whenReady().then(() => {
  operationAuditStore.configure(app.getPath('userData'))
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function parseCsv(value) {
  if (!value) return []
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 200)
}
