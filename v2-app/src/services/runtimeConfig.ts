export interface RuntimeConfigStatus {
  oceanEngineBaseUrl: string
  hasOceanEngineClient: boolean
  hasOceanEngineAccessToken: boolean
  hasOceanEngineRefreshToken: boolean
  hasOceanEngineWriteExecutor: boolean
  hasFeishuWebhook: boolean
  operationAllowlistedAccountIds: string[]
  executionMode: 'readonly' | 'preview' | 'live'
  notificationMode: 'preview' | 'live'
  source: 'browser-fallback' | 'electron-main'
}

export function getBrowserRuntimeConfigStatus(): RuntimeConfigStatus {
  return {
    oceanEngineBaseUrl: 'https://api.oceanengine.com',
    hasOceanEngineClient: false,
    hasOceanEngineAccessToken: false,
    hasOceanEngineRefreshToken: false,
    hasOceanEngineWriteExecutor: false,
    hasFeishuWebhook: false,
    operationAllowlistedAccountIds: [],
    executionMode: 'readonly',
    notificationMode: 'preview',
    source: 'browser-fallback',
  }
}

export async function loadRuntimeConfigStatus(): Promise<RuntimeConfigStatus> {
  if (typeof window !== 'undefined' && window.juliang?.getRuntimeConfigStatus) {
    return window.juliang.getRuntimeConfigStatus()
  }

  return getBrowserRuntimeConfigStatus()
}
