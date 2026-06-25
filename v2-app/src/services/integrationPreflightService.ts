import type { FeishuNotificationDraft } from '../domain/feishu'
import type { IntegrationPreflightCheck, IntegrationPreflightSummary } from '../domain/integrationPreflight'
import type { OceanEngineClient } from '../domain/oceanEngine'
import type { OperationPlan } from '../domain/types'
import type { OperationStateReader } from './operationStateReader'
import type { RuntimeConfigStatus } from './runtimeConfig'

export interface IntegrationPreflightService {
  run: () => Promise<IntegrationPreflightSummary>
}

export interface IntegrationPreflightServiceOptions {
  getRuntimeConfig: () => Promise<RuntimeConfigStatus>
  oceanEngineClient: OceanEngineClient
  operationStateReader: OperationStateReader
  notificationDraft: FeishuNotificationDraft
}

export function createIntegrationPreflightService(
  options: IntegrationPreflightServiceOptions,
): IntegrationPreflightService {
  return {
    async run() {
      const config = await safeRead(options.getRuntimeConfig(), null)
      const auth = config
        ? await safeRead(options.oceanEngineClient.getAuthStatus(), null)
        : null
      const advertisers = await safeRead(options.oceanEngineClient.listAuthorizedAdvertisers(), [])
      const advertiserIds = advertisers.map((advertiser) => advertiser.advertiserId).filter(Boolean)
      const sampleAdvertiserId = advertiserIds[0]
      const reportRows = sampleAdvertiserId
        ? await safeRead(options.oceanEngineClient.queryReport({
            advertiserIds: [sampleAdvertiserId],
            startDate: todayIsoDate(),
            endDate: todayIsoDate(),
            dimensions: ['advertiser', 'material'],
            metrics: ['cost', 'show', 'click', 'convert', 'income', 'roi'],
          }), null)
        : null
      const balances = sampleAdvertiserId
        ? await safeRead(options.oceanEngineClient.getFundBalances([sampleAdvertiserId]), null)
        : null
      const accountState = sampleAdvertiserId
        ? await safeRead(options.operationStateReader.readBeforeState(buildPreflightPlan(sampleAdvertiserId)), null)
        : null

      const checks: IntegrationPreflightCheck[] = [
        buildRuntimeConfigCheck(config),
        buildTokenCheck(config, auth),
        buildAdvertiserCheck(advertisers),
        buildReportCheck(reportRows, sampleAdvertiserId),
        buildFundCheck(balances, sampleAdvertiserId),
        buildAccountStateCheck(accountState, sampleAdvertiserId),
        buildFeishuCheck(config, options.notificationDraft),
        buildWriteExecutorCheck(config),
        buildWriteEndpointCheck(config),
      ]

      return summarizePreflight(checks)
    },
  }
}

function buildRuntimeConfigCheck(config: RuntimeConfigStatus | null): IntegrationPreflightCheck {
  if (!config) {
    return fail('runtime-config', 'Runtime config bridge', 'Runtime config is unavailable.')
  }

  return {
    id: 'runtime-config',
    title: 'Runtime config bridge',
    status: config.source === 'electron-main' ? 'pass' : 'warn',
    evidence: `${config.source} / ${config.oceanEngineBaseUrl}`,
    detail: config.source === 'electron-main'
      ? 'Electron main process config is available.'
      : 'Browser fallback is active; real OceanEngine integration requires the desktop shell.',
  }
}

function buildTokenCheck(
  config: RuntimeConfigStatus | null,
  auth: Awaited<ReturnType<OceanEngineClient['getAuthStatus']>> | null,
): IntegrationPreflightCheck {
  if (!config?.hasOceanEngineAccessToken && !auth?.hasAccessToken) {
    return fail('oceanengine-token', 'OceanEngine token', 'Access token is not configured.')
  }

  return {
    id: 'oceanengine-token',
    title: 'OceanEngine token',
    status: 'pass',
    evidence: `access ${Boolean(config?.hasOceanEngineAccessToken || auth?.hasAccessToken)} / refresh ${Boolean(config?.hasOceanEngineRefreshToken || auth?.hasRefreshToken)}`,
    detail: 'Read-only OceanEngine calls can authenticate.',
  }
}

function buildAdvertiserCheck(
  advertisers: Awaited<ReturnType<OceanEngineClient['listAuthorizedAdvertisers']>>,
): IntegrationPreflightCheck {
  if (!advertisers.length) {
    return fail('authorized-advertisers', 'Authorized advertisers', 'No authorized advertiser was returned.')
  }

  return pass('authorized-advertisers', 'Authorized advertisers', `${advertisers.length} advertisers`, advertisers[0].name)
}

function buildReportCheck(
  rows: Awaited<ReturnType<OceanEngineClient['queryReport']>> | null,
  advertiserId?: string,
): IntegrationPreflightCheck {
  if (!advertiserId) return fail('report-api', 'Report API', 'No advertiser is available for report probing.')
  if (!rows) return fail('report-api', 'Report API', 'Report request failed.')

  return {
    id: 'report-api',
    title: 'Report API',
    status: rows.length ? 'pass' : 'warn',
    evidence: `${rows.length} rows for ${advertiserId}`,
    detail: rows.length ? 'Report endpoint returned rows.' : 'Report endpoint responded but returned no rows for today.',
  }
}

function buildFundCheck(
  balances: Awaited<ReturnType<OceanEngineClient['getFundBalances']>> | null,
  advertiserId?: string,
): IntegrationPreflightCheck {
  if (!advertiserId) return fail('fund-api', 'Fund API', 'No advertiser is available for fund probing.')
  if (!balances) return fail('fund-api', 'Fund API', 'Fund request failed.')

  return {
    id: 'fund-api',
    title: 'Fund API',
    status: balances.length ? 'pass' : 'warn',
    evidence: `${balances.length} balances for ${advertiserId}`,
    detail: balances.length ? 'Fund endpoint returned account balance data.' : 'Fund endpoint responded with no balance rows.',
  }
}

function buildAccountStateCheck(
  state: Awaited<ReturnType<OperationStateReader['readBeforeState']>> | null,
  advertiserId?: string,
): IntegrationPreflightCheck {
  if (!advertiserId) return fail('account-state', 'Account budget state', 'No advertiser is available for state probing.')
  if (!state) return fail('account-state', 'Account budget state', 'Account state request failed.')
  if (state.source === 'not_configured' || state.source === 'unavailable') {
    return fail('account-state', 'Account budget state', `State reader returned ${state.source}.`)
  }

  return {
    id: 'account-state',
    title: 'Account budget state',
    status: state.budget === undefined ? 'warn' : 'pass',
    evidence: `source ${state.source}${state.budget !== undefined ? ` / budget ${state.budget}` : ''}`,
    detail: state.budget === undefined ? 'State reader responded but no budget was available.' : 'Budget state is readable.',
  }
}

function buildFeishuCheck(
  config: RuntimeConfigStatus | null,
  draft: FeishuNotificationDraft,
): IntegrationPreflightCheck {
  if (!config) return fail('feishu-config', 'Feishu notification config', 'Runtime config is unavailable.')
  if (config.notificationMode === 'preview') {
    return {
      id: 'feishu-config',
      title: 'Feishu notification config',
      status: 'warn',
      evidence: `preview / ${draft.receiver}`,
      detail: 'Notification preview is available; live webhook is not required for preflight.',
    }
  }

  return {
    id: 'feishu-config',
    title: 'Feishu notification config',
    status: config.hasFeishuWebhook ? 'pass' : 'fail',
    evidence: `live / webhook ${config.hasFeishuWebhook ? 'configured' : 'missing'}`,
    detail: config.hasFeishuWebhook ? 'Live Feishu delivery can be attempted.' : 'Live notification mode requires FEISHU_WEBHOOK_URL.',
  }
}

function buildWriteExecutorCheck(config: RuntimeConfigStatus | null): IntegrationPreflightCheck {
  if (!config) return fail('write-executor', 'Write executor safety', 'Runtime config is unavailable.')
  if (config.hasOceanEngineWriteExecutor) {
    return {
      id: 'write-executor',
      title: 'Write executor safety',
      status: 'fail',
      evidence: 'enabled',
      detail: 'Keep JULIANG_ENABLE_OCEANENGINE_WRITE=false during real read-only integration preflight.',
    }
  }

  return pass('write-executor', 'Write executor safety', 'disabled', 'Write executor is closed for preflight.')
}

function buildWriteEndpointCheck(config: RuntimeConfigStatus | null): IntegrationPreflightCheck {
  if (!config) return fail('write-endpoints', 'Confirmed write endpoints', 'Runtime config is unavailable.')
  if (config.confirmedOceanEngineWriteEndpoints.length) {
    return {
      id: 'write-endpoints',
      title: 'Confirmed write endpoints',
      status: 'warn',
      evidence: `${config.confirmedOceanEngineWriteEndpoints.length} endpoint(s)`,
      detail: 'Endpoint confirmation should remain empty until the first controlled live write test.',
    }
  }

  return pass('write-endpoints', 'Confirmed write endpoints', 'empty', 'No write endpoint is confirmed for preflight.')
}

function summarizePreflight(checks: IntegrationPreflightCheck[]): IntegrationPreflightSummary {
  return {
    checkedAt: new Date().toISOString(),
    passed: checks.filter((check) => check.status === 'pass').length,
    warnings: checks.filter((check) => check.status === 'warn').length,
    failed: checks.filter((check) => check.status === 'fail').length,
    checks,
  }
}

function buildPreflightPlan(advertiserId: string): OperationPlan {
  return {
    id: `preflight:${advertiserId}`,
    targetType: 'account',
    targetId: advertiserId,
    targetName: advertiserId,
    action: 'preflight budget state read',
    reason: 'Verify account budget state before live operations.',
    risk: 'low',
    requiresConfirmation: false,
  }
}

function pass(id: string, title: string, evidence: string, detail?: string): IntegrationPreflightCheck {
  return {
    id,
    title,
    status: 'pass',
    evidence,
    detail,
  }
}

function fail(id: string, title: string, detail: string): IntegrationPreflightCheck {
  return {
    id,
    title,
    status: 'fail',
    evidence: 'not ready',
    detail,
  }
}

async function safeRead<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise
  } catch {
    return fallback
  }
}

function todayIsoDate(): string {
  const now = new Date()
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 10)
}
