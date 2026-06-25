const DEFAULT_BASE_URL = 'https://api.oceanengine.com'

function getRuntimeConfig() {
  return {
    baseUrl: normalizeBaseUrl(process.env.OCEANENGINE_BASE_URL || DEFAULT_BASE_URL),
    accessToken: process.env.OCEANENGINE_ACCESS_TOKEN || '',
    refreshToken: process.env.OCEANENGINE_REFRESH_TOKEN || '',
  }
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '')
}

function hasAccessToken() {
  return Boolean(getRuntimeConfig().accessToken)
}

function getAuthStatus() {
  return {
    hasAccessToken: hasAccessToken(),
    hasRefreshToken: Boolean(getRuntimeConfig().refreshToken),
    authorizedAdvertiserCount: 0,
  }
}

async function listAuthorizedAdvertisers() {
  if (!hasAccessToken()) return []

  const response = await oceanEngineGet('/open_api/oauth2/advertiser/get/', {
    access_token: getRuntimeConfig().accessToken,
  })
  const items = arrayFrom(response.data?.list, response.data?.advertiser_list, response.data?.advertisers, response.data)

  return items.map((item) => ({
    advertiserId: stringFrom(item.advertiser_id, item.advertiserId, item.id),
    name: stringFrom(item.name, item.advertiser_name, item.advertiserName) || stringFrom(item.advertiser_id, item.id),
    ownerName: stringFrom(item.owner_name, item.ownerName),
    accountRole: normalizeAccountRole(item.account_role || item.role),
  })).filter((item) => item.advertiserId)
}

async function queryReport(query) {
  if (!hasAccessToken()) return []

  const advertiserIds = Array.isArray(query?.advertiserIds) ? query.advertiserIds : []
  const targets = advertiserIds.length ? advertiserIds : ['']
  const rows = []

  for (const advertiserId of targets) {
    const response = await oceanEngineGet('/open_api/v3.0/report/custom/get/', {
      advertiser_id: advertiserId || undefined,
      start_date: query?.startDate,
      end_date: query?.endDate,
      dimensions: JSON.stringify(query?.dimensions || []),
      metrics: JSON.stringify(query?.metrics || []),
      page: 1,
      page_size: 100,
    })
    const items = arrayFrom(
      response.data?.rows,
      response.data?.list,
      response.data?.stat_data,
      response.data?.data,
      response.data,
    )
    rows.push(...items.map((item) => normalizeReportRow(item, advertiserId)))
  }

  return rows
}

async function getFundBalances(advertiserIds) {
  if (!hasAccessToken()) return []

  const ids = Array.isArray(advertiserIds) ? advertiserIds.filter(Boolean) : []
  const response = await oceanEngineGet('/open_api/v3.0/account/fund/get/', {
    advertiser_ids: JSON.stringify(ids),
  })
  const items = arrayFrom(response.data?.list, response.data?.fund_info, response.data?.fund_list, response.data)

  return items.map((item) => ({
    advertiserId: stringFrom(item.advertiser_id, item.advertiserId, item.id),
    validBalance: numberFrom(item.valid_balance, item.balance, item.validBalance),
    cashBalance: optionalNumberFrom(item.cash_balance, item.cashBalance),
    grantBalance: optionalNumberFrom(item.grant_balance, item.grantBalance),
  })).filter((item) => item.advertiserId)
}

async function getAdvertiserBudget(advertiserId) {
  if (!hasAccessToken() || !advertiserId) return null

  const response = await oceanEngineGet('/open_api/2/advertiser/budget/get/', {
    advertiser_id: advertiserId,
    fields: JSON.stringify(['budget']),
  })
  const data = response.data || {}
  const items = arrayFrom(data.list, data.advertiser_budget_list, data.budget_list, data)
  const item = items.find((candidate) =>
    stringFrom(candidate.advertiser_id, candidate.advertiserId, candidate.id) === advertiserId,
  ) || items[0] || data
  const budget = optionalBudgetNumberFrom(
    item.budget,
    item.daily_budget,
    item.day_budget,
    item.budget_value,
    item.advertiser_budget,
  )

  return {
    advertiserId,
    budget,
  }
}

async function oceanEngineGet(endpoint, params) {
  const config = getRuntimeConfig()
  const url = new URL(endpoint, `${config.baseUrl}/`)

  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Access-Token': config.accessToken,
      Accept: 'application/json',
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || isApiFailure(payload)) {
    throw new Error(buildSafeApiError(endpoint, response.status, payload))
  }

  return payload
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

function normalizeReportRow(item, fallbackAdvertiserId) {
  const metrics = item.metrics || item.stat || item
  const dimensions = item.dimensions || item.dimension || item

  const cost = numberFrom(metrics.cost, metrics.stat_cost, metrics.total_cost)
  const income = numberFrom(metrics.income, metrics.revenue, metrics.total_revenue)
  const roi = optionalNumberFrom(metrics.roi, metrics.pay_roi) ?? (cost > 0 ? Number((income / cost).toFixed(2)) : 0)

  return {
    advertiserId: stringFrom(dimensions.advertiser_id, item.advertiser_id, fallbackAdvertiserId),
    advertiserName: stringFrom(dimensions.advertiser_name, item.advertiser_name) || stringFrom(fallbackAdvertiserId),
    projectId: optionalStringFrom(dimensions.project_id, item.project_id),
    promotionId: optionalStringFrom(dimensions.promotion_id, item.promotion_id),
    materialId: optionalStringFrom(dimensions.material_id, item.material_id, dimensions.creative_material_id),
    materialName: optionalStringFrom(dimensions.material_name, item.material_name, dimensions.creative_material_name),
    cost,
    show: numberFrom(metrics.show, metrics.stat_show, metrics.impression),
    click: numberFrom(metrics.click, metrics.stat_click),
    convert: numberFrom(metrics.convert, metrics.conversion),
    income,
    roi,
  }
}

function arrayFrom(...candidates) {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

function normalizeAccountRole(value) {
  if (value === 'AD' || value === 'BP') return value
  return 'UNKNOWN'
}

function stringFrom(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return String(value)
  }
  return ''
}

function optionalStringFrom(...values) {
  const value = stringFrom(...values)
  return value || undefined
}

function numberFrom(...values) {
  for (const value of values) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function optionalNumberFrom(...values) {
  for (const value of values) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function optionalBudgetNumberFrom(...values) {
  for (const value of values) {
    if (value && typeof value === 'object') {
      const nested = optionalNumberFrom(value.value, value.amount, value.daily_budget, value.day_budget)
      if (nested !== undefined) return nested
    }

    const parsed = optionalNumberFrom(value)
    if (parsed !== undefined) return parsed
  }
  return undefined
}

module.exports = {
  getAuthStatus,
  getAdvertiserBudget,
  getFundBalances,
  hasAccessToken,
  listAuthorizedAdvertisers,
  queryReport,
}
