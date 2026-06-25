const DEFAULT_BASE_URL = 'https://api.oceanengine.com'

async function execute(request) {
  const writeEnabled = process.env.JULIANG_ENABLE_OCEANENGINE_WRITE === 'true'
  const liveMode = process.env.JULIANG_EXECUTION_MODE === 'live'
  const dryRun = buildDryRun(request)

  if (!liveMode || !writeEnabled) {
    return buildResult(
      request,
      'not_implemented',
      'OceanEngine write executor is disabled. Require JULIANG_EXECUTION_MODE=live and JULIANG_ENABLE_OCEANENGINE_WRITE=true before any POST can run.',
      dryRun,
    )
  }

  if (dryRun.blockedReason) {
    return buildResult(request, 'not_implemented', `OceanEngine write blocked: ${dryRun.blockedReason}`, dryRun)
  }

  if (!isConfirmedEndpoint(dryRun.endpoint)) {
    return buildResult(
      request,
      'not_implemented',
      `OceanEngine write blocked: endpoint ${dryRun.endpoint} is not in JULIANG_CONFIRMED_OCEANENGINE_WRITE_ENDPOINTS.`,
      dryRun,
    )
  }

  if (!hasAccessToken()) {
    return buildResult(
      request,
      'not_implemented',
      'OceanEngine write blocked: OCEANENGINE_ACCESS_TOKEN is not configured.',
      dryRun,
    )
  }

  try {
    const response = await oceanEnginePost(dryRun.endpoint, dryRun.requestBody)
    return buildResult(request, 'executed', `OceanEngine write POST completed: ${formatApiResult(response)}`, dryRun)
  } catch (error) {
    return buildResult(
      request,
      'rejected',
      error instanceof Error ? error.message : 'OceanEngine write POST failed.',
      dryRun,
    )
  }
}

function buildDryRun(request) {
  const targetId = stringFrom(request?.target?.id)

  if (request?.operationType === 'adjust_budget') {
    const nextBudget = resolveExpectedBudget(request)
    if (!Number.isFinite(nextBudget)) {
      return {
        method: 'POST',
        endpoint: '/open_api/2/advertiser/update/budget/',
        requestBody: {
          advertiser_id: targetId,
        },
        source: 'electron-dry-run',
        blockedReason: 'Budget update requires a finite expected budget from the pre-operation verification plan.',
        requiresEndpointConfirmation: true,
      }
    }

    return {
      method: 'POST',
      endpoint: '/open_api/2/advertiser/update/budget/',
      requestBody: {
        advertiser_id: targetId,
        budget: nextBudget,
      },
      source: 'electron-dry-run',
      requiresEndpointConfirmation: true,
    }
  }

  if (['pause', 'resume', 'close'].includes(request?.operationType)) {
    return {
      method: 'POST',
      endpoint: 'unmapped:account-status',
      requestBody: {
        advertiser_id: targetId,
        desired_status: mapDesiredStatus(request.operationType),
      },
      source: 'electron-dry-run',
      blockedReason: 'Account-level status operation has no verified OceanEngine endpoint mapping yet.',
      requiresEndpointConfirmation: true,
    }
  }

  return {
    method: 'POST',
    endpoint: 'unmapped:unknown-operation',
    requestBody: {
      advertiser_id: targetId,
    },
    source: 'electron-dry-run',
    blockedReason: 'Unknown operation type cannot be mapped to an OceanEngine write request.',
    requiresEndpointConfirmation: true,
  }
}

function resolveExpectedBudget(request) {
  const budgetChange = (request?.verification?.expectedChanges || []).find((change) => change?.field === 'budget')
  const parsed = Number(budgetChange?.to)
  return Number.isFinite(parsed) ? parsed : undefined
}

function mapDesiredStatus(operationType) {
  if (operationType === 'pause') return 'paused'
  if (operationType === 'resume') return 'running'
  if (operationType === 'close') return 'closed'
  return 'unknown'
}

function buildResult(request, status, message, dryRun) {
  return {
    planId: stringFrom(request?.planId),
    targetId: stringFrom(request?.target?.id),
    targetName: stringFrom(request?.target?.name),
    action: stringFrom(request?.rawAction),
    operationType: request?.operationType || 'unknown',
    status,
    idempotencyKey: stringFrom(request?.idempotencyKey),
    verification: request?.verification || {
      before: {
        capturedAt: new Date().toISOString(),
        source: 'unavailable',
      },
      expectedChanges: [],
      verifyFields: [],
    },
    dryRun,
    message,
    checkedAt: new Date().toISOString(),
  }
}

async function oceanEnginePost(endpoint, body) {
  const response = await fetch(buildUrl(endpoint), {
    method: 'POST',
    headers: {
      'Access-Token': process.env.OCEANENGINE_ACCESS_TOKEN || '',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || isApiFailure(payload)) {
    throw new Error(buildSafeApiError(endpoint, response.status, payload))
  }

  return payload
}

function buildUrl(endpoint) {
  const baseUrl = String(process.env.OCEANENGINE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '')
  return new URL(endpoint, `${baseUrl}/`).toString()
}

function hasAccessToken() {
  return Boolean(process.env.OCEANENGINE_ACCESS_TOKEN)
}

function isConfirmedEndpoint(endpoint) {
  return parseCsv(process.env.JULIANG_CONFIRMED_OCEANENGINE_WRITE_ENDPOINTS).includes(endpoint)
}

function parseCsv(value) {
  if (!value) return []
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function isApiFailure(payload) {
  const code = payload?.code
  if (code === undefined || code === null) return false
  return Number(code) !== 0
}

function buildSafeApiError(endpoint, status, payload) {
  const code = payload?.code === undefined ? 'UNKNOWN' : String(payload.code)
  const message = stringFrom(payload?.message, payload?.msg, payload?.error) || 'OceanEngine request failed'
  return `OceanEngine ${endpoint} failed: HTTP ${status}, code ${code}, ${message}`
}

function formatApiResult(payload) {
  const code = payload?.code === undefined ? 'OK' : String(payload.code)
  const requestId = stringFrom(payload?.request_id, payload?.requestId, payload?.log_id)
  return requestId ? `code ${code}, request ${requestId}` : `code ${code}`
}

function stringFrom(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return String(value)
  }
  return ''
}

module.exports = {
  execute,
}
