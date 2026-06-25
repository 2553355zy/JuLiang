const oceanEngineReadOnly = require('./oceanEngineReadOnly.cjs')

async function getAccountState(accountId) {
  const normalizedAccountId = normalizeAccountId(accountId)
  if (!normalizedAccountId) {
    return {
      source: 'unavailable',
      capturedAt: new Date().toISOString(),
      error: 'accountId is required',
    }
  }

  if (!oceanEngineReadOnly.hasAccessToken()) {
    return {
      source: 'not_configured',
      capturedAt: new Date().toISOString(),
      accountId: normalizedAccountId,
      error: 'OCEANENGINE_ACCESS_TOKEN is not configured',
    }
  }

  try {
    const budgetState = await oceanEngineReadOnly.getAdvertiserBudget(normalizedAccountId)
    if (budgetState?.budget === undefined) {
      return {
        source: 'unavailable',
        capturedAt: new Date().toISOString(),
        accountId: normalizedAccountId,
        error: 'OceanEngine budget response did not include a usable budget',
      }
    }

    return {
      source: 'oceanengine',
      capturedAt: new Date().toISOString(),
      accountId: normalizedAccountId,
      budget: budgetState.budget,
      status: 'unknown',
    }
  } catch (error) {
    return {
      source: 'unavailable',
      capturedAt: new Date().toISOString(),
      accountId: normalizedAccountId,
      error: error instanceof Error ? error.message : 'OceanEngine account state request failed',
    }
  }
}

function normalizeAccountId(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim().slice(0, 64)
}

module.exports = {
  getAccountState,
}
