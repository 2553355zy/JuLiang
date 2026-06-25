import { parseMaterialName } from '../domain/materialNameParser'
import { evaluateAccount } from '../domain/roiEngine'
import type { AccountOwner, DeliveryAccount, MaterialSignal } from '../domain/types'

const owners: AccountOwner[] = [
  { id: 'owner-01', name: '林岚', role: 'operator', feishuUserId: 'ou_operator_lan' },
  { id: 'owner-02', name: '周扬', role: 'creative', feishuUserId: 'ou_creative_zhou' },
  { id: 'owner-03', name: '陈默', role: 'manager', feishuUserId: 'ou_manager_chen' },
]

export const accounts: DeliveryAccount[] = [
  {
    id: '178928884001',
    name: '短剧-女频-风禾',
    balance: 4280,
    dailyBudget: 9200,
    owner: owners[0],
    status: 'healthy',
    trackingHealth: 'normal',
    updatedAt: '11:20',
    metrics: {
      spend: 12840,
      revenue: 19736,
      conversions: 286,
      clicks: 18402,
      impressions: 920188,
      ctr: 2,
      cpc: 0.7,
      conversionCost: 44.9,
      roi: 1.54,
      profit: 6896,
    },
  },
  {
    id: '178928884002',
    name: '短剧-男频-四海',
    balance: 680,
    dailyBudget: 6000,
    owner: owners[2],
    status: 'attention',
    trackingHealth: 'normal',
    updatedAt: '11:18',
    metrics: {
      spend: 7340,
      revenue: 6280,
      conversions: 96,
      clicks: 10260,
      impressions: 581000,
      ctr: 1.77,
      cpc: 0.72,
      conversionCost: 76.5,
      roi: 0.86,
      profit: -1060,
    },
  },
  {
    id: '178928884003',
    name: '短剧-测试-新素材',
    balance: 12050,
    dailyBudget: 5000,
    owner: owners[0],
    status: 'critical',
    trackingHealth: 'delayed',
    updatedAt: '11:16',
    metrics: {
      spend: 3120,
      revenue: 1840,
      conversions: 18,
      clicks: 3910,
      impressions: 230400,
      ctr: 1.7,
      cpc: 0.8,
      conversionCost: 173.3,
      roi: 0.59,
      profit: -1280,
    },
  },
]

export const materialSignals: MaterialSignal[] = [
  buildSignal('mat-01', '178928884001', '玄门医妃_EP18_打脸钩子_v3_周扬', owners[1], 1.86, 336),
  buildSignal('mat-02', '178928884001', '离婚后我成了首富_第36集_逆袭_剪2', owners[1], 1.42, 188),
  buildSignal('mat-03', '178928884002', '重生八零甜宠_12_复仇_v1', owners[2], 1.18, 92),
]

export const recommendations = accounts.flatMap((account) => evaluateAccount(account))

function buildSignal(
  id: string,
  accountId: string,
  materialName: string,
  owner: AccountOwner,
  roi: number,
  conversions: number,
): MaterialSignal {
  const tags = parseMaterialName(materialName)
  const spend = Math.round(conversions * 42)
  const revenue = Math.round(spend * roi)

  return {
    id,
    accountId,
    materialName,
    novelName: tags.novelName,
    hookType: tags.hookType ?? '待归类钩子',
    owner,
    confidence: tags.confidence,
    firstSeenAt: '10:40',
    metrics: {
      spend,
      revenue,
      conversions,
      clicks: conversions * 64,
      impressions: conversions * 3120,
      ctr: 2.05,
      cpc: 0.66,
      conversionCost: spend / conversions,
      roi,
      profit: revenue - spend,
    },
  }
}
