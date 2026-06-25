function execute(request) {
  const writeEnabled = process.env.JULIANG_ENABLE_OCEANENGINE_WRITE === 'true'
  const dryRun = buildDryRun(request)

  if (!writeEnabled) {
    return buildResult(
      request,
      'not_implemented',
      'OceanEngine write executor is disabled. Keep JULIANG_ENABLE_OCEANENGINE_WRITE unset until the live write adapter is implemented and approved.',
      dryRun,
    )
  }

  return buildResult(
    request,
    'not_implemented',
    dryRun.blockedReason
      ? `OceanEngine write executor is still dry-run only: ${dryRun.blockedReason}`
      : 'OceanEngine write executor is still dry-run only. Review the mapped request before implementing live POST.',
    dryRun,
  )
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

function stringFrom(value) {
  if (value === undefined || value === null) return ''
  return String(value)
}

module.exports = {
  execute,
}
