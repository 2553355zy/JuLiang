import type { RuntimeConfigStatus } from '../services/runtimeConfig'

declare global {
  interface Window {
    juliang?: {
      getRuntimeInfo: () => Promise<{
        appVersion: string
        platform: string
        mode: 'development' | 'production'
      }>
      getRuntimeConfigStatus: () => Promise<RuntimeConfigStatus>
    }
  }
}

export {}
