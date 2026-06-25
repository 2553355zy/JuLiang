function execute(request) {
  const writeEnabled = process.env.JULIANG_ENABLE_OCEANENGINE_WRITE === 'true'

  if (!writeEnabled) {
    return buildResult(
      request,
      'not_implemented',
      'OceanEngine write executor is disabled. Keep JULIANG_ENABLE_OCEANENGINE_WRITE unset until the live write adapter is implemented and approved.',
    )
  }

  return buildResult(
    request,
    'not_implemented',
    'OceanEngine write executor boundary is ready, but no live write endpoint has been implemented.',
  )
}

function buildResult(request, status, message) {
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
