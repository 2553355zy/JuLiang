import type {
  OceanEngineAdvertiser,
  OceanEngineAuthStatus,
  OceanEngineClient,
  OceanEngineFundBalance,
  OceanEngineReportQuery,
  OceanEngineReportRow,
} from '../domain/oceanEngine'

export interface OceanEngineTransport {
  request: <T>(endpoint: string, body?: unknown) => Promise<T>
}

export function createOceanEngineClient(transport: OceanEngineTransport): OceanEngineClient {
  return {
    getAuthStatus: () => transport.request<OceanEngineAuthStatus>('/auth/status'),
    listAuthorizedAdvertisers: () =>
      transport.request<OceanEngineAdvertiser[]>('/open_api/oauth2/advertiser/get/'),
    queryReport: (query: OceanEngineReportQuery) =>
      transport.request<OceanEngineReportRow[]>('/open_api/v3.0/report/custom/get/', query),
    getFundBalances: (advertiserIds: string[]) =>
      transport.request<OceanEngineFundBalance[]>('/open_api/v3.0/account/fund/get/', { advertiserIds }),
  }
}

export function createElectronOceanEngineClient(): OceanEngineClient | null {
  if (typeof window === 'undefined' || !window.juliang?.oceanEngine) {
    return null
  }

  const { oceanEngine } = window.juliang
  return {
    getAuthStatus: oceanEngine.getAuthStatus,
    listAuthorizedAdvertisers: oceanEngine.listAuthorizedAdvertisers,
    queryReport: oceanEngine.queryReport,
    getFundBalances: oceanEngine.getFundBalances,
  }
}

export function createMockOceanEngineClient(): OceanEngineClient {
  return createOceanEngineClient({
    async request<T>(endpoint: string, body?: unknown): Promise<T> {
      switch (endpoint) {
        case '/auth/status':
          return {
            hasAccessToken: false,
            hasRefreshToken: false,
            authorizedAdvertiserCount: 3,
          } satisfies OceanEngineAuthStatus as T
        case '/open_api/oauth2/advertiser/get/':
          return mockAdvertisers as T
        case '/open_api/v3.0/report/custom/get/':
          return buildMockReportRows(body as OceanEngineReportQuery) as T
        case '/open_api/v3.0/account/fund/get/':
          return buildMockFundBalances((body as { advertiserIds?: string[] })?.advertiserIds ?? []) as T
        default:
          throw new Error(`Mock OceanEngine endpoint is not implemented: ${endpoint}`)
      }
    },
  })
}

const mockAdvertisers: OceanEngineAdvertiser[] = [
  { advertiserId: '178928884001', name: '短剧-女频-风禾', ownerName: '林岚', accountRole: 'AD' },
  { advertiserId: '178928884002', name: '短剧-男频-四海', ownerName: '陈默', accountRole: 'AD' },
  { advertiserId: '178928884003', name: '短剧-测试-新素材', ownerName: '林岚', accountRole: 'AD' },
]

function buildMockReportRows(query: OceanEngineReportQuery): OceanEngineReportRow[] {
  const advertiserIds = query.advertiserIds.length
    ? query.advertiserIds
    : mockAdvertisers.map((advertiser) => advertiser.advertiserId)

  return advertiserIds.map((advertiserId, index) => {
    const profile = mockReportProfiles[advertiserId] ?? {
      cost: 2800 + index * 1600,
      incomeRate: 1.05,
      convert: 58 + index * 12,
      materialName: '待命名素材',
    }
    const cost = profile.cost
    const income = Math.round(cost * profile.incomeRate)
    const advertiser = mockAdvertisers.find((item) => item.advertiserId === advertiserId)

    return {
      advertiserId,
      advertiserName: advertiser?.name ?? advertiserId,
      materialId: `mat-${advertiserId.slice(-3)}`,
      materialName: profile.materialName,
      cost,
      show: profile.show,
      click: profile.click,
      convert: profile.convert,
      income,
      roi: Number((income / cost).toFixed(2)),
    }
  })
}

const mockReportProfiles: Record<
  string,
  {
    cost: number
    incomeRate: number
    convert: number
    show: number
    click: number
    materialName: string
  }
> = {
  '178928884001': {
    cost: 12840,
    incomeRate: 1.54,
    convert: 286,
    show: 920188,
    click: 18402,
    materialName: '玄门医妃_EP18_打脸钩子_v3_周扬',
  },
  '178928884002': {
    cost: 7340,
    incomeRate: 0.79,
    convert: 96,
    show: 581000,
    click: 10260,
    materialName: '重生八零甜宠_12_复仇_v1',
  },
  '178928884003': {
    cost: 3120,
    incomeRate: 0.59,
    convert: 18,
    show: 230400,
    click: 3910,
    materialName: '离婚后我成了首富_第36集_逆袭_剪2',
  },
}

function buildMockFundBalances(advertiserIds: string[]): OceanEngineFundBalance[] {
  return advertiserIds.map((advertiserId, index) => ({
    advertiserId,
    validBalance: 1200 + index * 3600,
    cashBalance: 900 + index * 2800,
    grantBalance: 300 + index * 800,
  }))
}
