async function getAccountState(accountId) {
  const normalizedAccountId = normalizeAccountId(accountId)
  if (!normalizedAccountId) {
    return {
      source: 'unavailable',
      capturedAt: new Date().toISOString(),
      error: 'accountId is required',
    }
  }

  return {
    source: 'not_configured',
    capturedAt: new Date().toISOString(),
    accountId: normalizedAccountId,
    error: 'OceanEngine account state reader is not configured',
  }
}

function normalizeAccountId(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim().slice(0, 64)
}

module.exports = {
  getAccountState,
}
