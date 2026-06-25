export interface RuntimeConfigStatus {
  oceanEngineBaseUrl: string
  hasOceanEngineClient: boolean
  hasOceanEngineAccessToken: boolean
  hasOceanEngineRefreshToken: boolean
  hasFeishuWebhook: boolean
  executionMode: 'readonly' | 'preview' | 'live'
  source: 'browser-fallback' | 'electron-main'
}

export function getBrowserRuntimeConfigStatus(): RuntimeConfigStatus {
  return {
    oceanEngineBaseUrl: 'https://api.oceanengine.com',
    hasOceanEngineClient: false,
    hasOceanEngineAccessToken: false,
    hasOceanEngineRefreshToken: false,
    hasFeishuWebhook: false,
    executionMode: 'readonly',
    source: 'browser-fallback',
  }
}

export async function loadRuntimeConfigStatus(): Promise<RuntimeConfigStatus> {
  if (typeof window !== 'undefined' && window.juliang?.getRuntimeConfigStatus) {
    return window.juliang.getRuntimeConfigStatus()
  }

  return getBrowserRuntimeConfigStatus()
}

