export interface OceanEngineAuthStatus {
  hasAccessToken: boolean
  hasRefreshToken: boolean
  expiresAt?: string
  authorizedAdvertiserCount: number
}

export interface OceanEngineAdvertiser {
  advertiserId: string
  name: string
  ownerName?: string
  accountRole: 'AD' | 'BP' | 'UNKNOWN'
}

export interface OceanEngineReportQuery {
  advertiserIds: string[]
  startDate: string
  endDate: string
  dimensions: Array<'advertiser' | 'project' | 'promotion' | 'material' | 'keyword'>
  metrics: Array<'cost' | 'show' | 'click' | 'convert' | 'income' | 'roi'>
}

export interface OceanEngineReportRow {
  advertiserId: string
  advertiserName: string
  projectId?: string
  promotionId?: string
  materialId?: string
  materialName?: string
  cost: number
  show: number
  click: number
  convert: number
  income: number
  roi: number
}

export interface OceanEngineFundBalance {
  advertiserId: string
  validBalance: number
  cashBalance?: number
  grantBalance?: number
}

export interface OceanEngineClient {
  getAuthStatus: () => Promise<OceanEngineAuthStatus>
  listAuthorizedAdvertisers: () => Promise<OceanEngineAdvertiser[]>
  queryReport: (query: OceanEngineReportQuery) => Promise<OceanEngineReportRow[]>
  getFundBalances: (advertiserIds: string[]) => Promise<OceanEngineFundBalance[]>
}

