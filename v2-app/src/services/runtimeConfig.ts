export interface RuntimeConfigStatus {
  oceanEngineBaseUrl: string
  hasOceanEngineClient: boolean
  hasFeishuWebhook: boolean
  executionMode: 'readonly' | 'preview' | 'live'
}

export function getRuntimeConfigStatus(): RuntimeConfigStatus {
  return {
    oceanEngineBaseUrl: import.meta.env.OCEANENGINE_BASE_URL || 'https://api.oceanengine.com',
    hasOceanEngineClient: Boolean(import.meta.env.OCEANENGINE_CLIENT_ID),
    hasFeishuWebhook: Boolean(import.meta.env.FEISHU_WEBHOOK_URL),
    executionMode: 'readonly',
  }
}

