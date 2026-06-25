import {
  Activity,
  AlertTriangle,
  Bell,
  CircleDollarSign,
  ClipboardCheck,
  Gauge,
  LineChart,
  Megaphone,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import './App.css'
import { buildMaterialSignalNotification } from './domain/feishu'
import { evaluatePortfolioDiagnostics, formatMoney } from './domain/roiEngine'
import { accounts, materialSignals, ownerRoutes, recommendations } from './data/mockDashboard'
import type { OceanEngineAuthStatus } from './domain/oceanEngine'
import type { OperationAuditSummary } from './domain/operationAudit'
import type { ReportSyncSummary } from './domain/reportSync'
import { buildNotificationQueue } from './services/notificationRouter'
import { createElectronOceanEngineClient, createMockOceanEngineClient } from './services/oceanEngineClient'
import { resolveOwnerRoutes } from './services/ownerRoutingService'
import { buildOperationQueue } from './services/operationPlanner'
import { createLocalStorageOperationAuditRepository } from './services/operationAuditRepository'
import { createOperationExecutionService } from './services/operationExecutionService'
import { attributeMaterials } from './services/materialAttributionService'
import { createLocalStorageMetricRepository } from './services/metricRepository'
import { createReportSyncService } from './services/reportSyncService'
import {
  getBrowserRuntimeConfigStatus,
  loadRuntimeConfigStatus,
  type RuntimeConfigStatus,
} from './services/runtimeConfig'

const topAccounts = [...accounts].sort((a, b) => b.metrics.roi - a.metrics.roi)
const heroSignal = materialSignals[0]
const notificationDraft = buildMaterialSignalNotification(heroSignal)
const notificationQueue = buildNotificationQueue(materialSignals, ownerRoutes)
const operationQueue = buildOperationQueue(recommendations)
const portfolioDiagnostics = evaluatePortfolioDiagnostics(accounts, materialSignals)
const ownerRoutingResults = resolveOwnerRoutes(materialSignals, ownerRoutes)
const materialAttributionSummary = attributeMaterials(
  materialSignals.map((signal) => ({
    id: signal.id,
    accountId: signal.accountId,
    materialName: signal.materialName,
    metrics: signal.metrics,
    ownerName: signal.owner.name,
  })),
)
const electronOceanEngineClient = createElectronOceanEngineClient()
const oceanEngineClient = electronOceanEngineClient ?? createMockOceanEngineClient()
const oceanEngineDataSource = electronOceanEngineClient ? 'electron-readonly' : 'mock-browser'
const metricRepository = createLocalStorageMetricRepository()
const reportSyncService = createReportSyncService(oceanEngineClient, metricRepository)
const operationAuditRepository = createLocalStorageOperationAuditRepository()
const operationExecutionService = createOperationExecutionService(operationAuditRepository)
const totalSpend = accounts.reduce((sum, account) => sum + account.metrics.spend, 0)
const totalRevenue = accounts.reduce((sum, account) => sum + account.metrics.revenue, 0)
const blendedRoi = totalRevenue / totalSpend

function App() {
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfigStatus>(getBrowserRuntimeConfigStatus)
  const [authStatus, setAuthStatus] = useState<OceanEngineAuthStatus | null>(null)
  const [apiProbe, setApiProbe] = useState({ advertiserCount: 0, reportRows: 0, fundRows: 0 })
  const [reportSyncSummary, setReportSyncSummary] = useState<ReportSyncSummary | null>(null)
  const [operationAuditSummary, setOperationAuditSummary] = useState<OperationAuditSummary | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadRuntimeState() {
      const [config, auth, advertisers, syncSummary, fundRows, auditSummary] = await Promise.all([
        loadRuntimeConfigStatus(),
        safeRead(oceanEngineClient.getAuthStatus(), {
          hasAccessToken: false,
          hasRefreshToken: false,
          authorizedAdvertiserCount: 0,
        }),
        safeRead(oceanEngineClient.listAuthorizedAdvertisers(), []),
        runReportSync(),
        safeRead(oceanEngineClient.getFundBalances(accounts.map((account) => account.id)), []),
        operationExecutionService.previewPlans(operationQueue.plans),
      ])

      if (!mounted) return

      const normalizedAuth = {
        ...auth,
        authorizedAdvertiserCount: Math.max(auth.authorizedAdvertiserCount, advertisers.length),
      }

      setRuntimeConfig(config)
      setAuthStatus(normalizedAuth)
      setApiProbe({
        advertiserCount: advertisers.length,
        reportRows: syncSummary.lastRun?.rowCount ?? 0,
        fundRows: fundRows.length,
      })
      setReportSyncSummary(syncSummary)
      setOperationAuditSummary(auditSummary)
    }

    loadRuntimeState()

    return () => {
      mounted = false
    }
  }, [])

  async function runReportSync() {
    return reportSyncService.runOnce({
      advertiserIds: accounts.map((account) => account.id),
      startDate: '2026-06-25',
      endDate: '2026-06-25',
      dimensions: ['advertiser', 'material'],
      metrics: ['cost', 'show', 'click', 'convert', 'income', 'roi'],
    })
  }

  async function handleSyncReports() {
    const summary = await runReportSync()
    setReportSyncSummary(summary)
    setApiProbe((current) => ({
      ...current,
      reportRows: summary.lastRun?.rowCount ?? current.reportRows,
    }))
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">JL</div>
          <div>
            <strong>JuLiang V2</strong>
            <span>ROI Ops Console</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="主导航">
          <a className="active" href="#dashboard">
            <Gauge size={18} /> 总控台
          </a>
          <a href="#accounts">
            <Wallet size={18} /> 账号分析
          </a>
          <a href="#materials">
            <Sparkles size={18} /> 素材信号
          </a>
          <a href="#operations">
            <ClipboardCheck size={18} /> 操作计划
          </a>
          <a href="#feishu">
            <Bell size={18} /> 飞书通知
          </a>
        </nav>
        <div className="sidebar-panel">
          <ShieldCheck size={18} />
          <div>
            <strong>安全模式</strong>
            <span>当前 {runtimeConfig.executionMode}，真实执行前强制预览、确认和审计。</span>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">二代骨架 / 操作界面 UI 设计</p>
            <h1>巨量账号增长总控台</h1>
          </div>
          <div className="topbar-actions">
            <span className="runtime-pill">
              {runtimeConfig.hasOceanEngineClient ? 'API 已配置' : 'API 待配置'}
            </span>
            <label className="search">
              <Search size={16} />
              <input placeholder="搜索账号、素材、小说名" />
            </label>
            <button className="ghost-button" type="button" onClick={handleSyncReports}>
              <Activity size={16} />
              同步报表
            </button>
            <button className="primary-button" type="button">
              <PlayCircle size={16} />
              生成建议
            </button>
          </div>
        </header>

        <section className="metric-grid" id="dashboard">
          <MetricCard label="今日消耗" value={formatMoney(totalSpend)} delta="+12.4%" tone="neutral" />
          <MetricCard label="今日收入" value={formatMoney(totalRevenue)} delta="+21.8%" tone="good" />
          <MetricCard label="综合 ROI" value={blendedRoi.toFixed(2)} delta="目标 1.25" tone="good" />
          <MetricCard label="诊断事项" value={`${portfolioDiagnostics.diagnostics.length}`} delta={`P0 ${portfolioDiagnostics.p0Count}`} tone="neutral" />
        </section>

        <section className="split-layout">
          <div className="panel account-panel" id="accounts">
            <PanelTitle icon={<LineChart size={18} />} title="账号 ROI 排行" subtitle="用于快速判断扩量、控量与回传排查" />
            <div className="account-table">
              <div className="table-row table-head">
                <span>账号</span>
                <span>ROI</span>
                <span>利润</span>
                <span>余额</span>
                <span>负责人</span>
              </div>
              {topAccounts.map((account) => (
                <div className="table-row" key={account.id}>
                  <span>
                    <strong>{account.name}</strong>
                    <small>{account.id} · {account.updatedAt}</small>
                  </span>
                  <span className={account.metrics.roi >= 1.2 ? 'positive' : 'negative'}>
                    {account.metrics.roi.toFixed(2)}
                  </span>
                  <span>{formatMoney(account.metrics.profit)}</span>
                  <span>{formatMoney(account.balance)}</span>
                  <span>{account.owner.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel recommendation-panel">
            <PanelTitle icon={<AlertTriangle size={18} />} title="建议队列" subtitle="先只读建议，再进入操作预览" />
            <div className="recommendation-list">
              {recommendations.map((item) => (
                <article className={`recommendation ${item.priority}`} key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.evidence}</p>
                  </div>
                  <span>{item.priority.toUpperCase()}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="split-layout lower">
          <div className="panel" id="materials">
            <PanelTitle icon={<Sparkles size={18} />} title="素材小说名信号" subtitle="从表现好的素材名中提取小说名并路由负责人" />
            <div className="signal-grid">
              {materialSignals.map((signal) => (
                <article className="signal-card" key={signal.id}>
                  <div className="signal-top">
                    <span>{signal.hookType}</span>
                    <strong>ROI {signal.metrics.roi.toFixed(2)}</strong>
                  </div>
                  <h3>{signal.novelName}</h3>
                  <p>{signal.materialName}</p>
                  <div className="signal-meta">
                    <span>转化 {signal.metrics.conversions}</span>
                    <span>置信度 {Math.round(signal.confidence * 100)}%</span>
                    <span>{signal.owner.name}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="panel" id="feishu">
            <PanelTitle icon={<Megaphone size={18} />} title="飞书通知预览" subtitle="后续接 webhook / 应用机器人 / 卡片回调" />
            <div className="feishu-card">
              <div className="feishu-header">
                <Bell size={18} />
                <strong>{notificationDraft.title}</strong>
              </div>
              <p>{notificationDraft.summary}</p>
              <div className="feishu-footer">
                <span>接收人：{notificationDraft.receiver}</span>
                <span>去重键：{notificationDraft.dedupeKey}</span>
              </div>
            </div>
            <div className="operation-preview" id="operations">
              <h3>待预览操作 · {operationQueue.plans.length} 条 · 高风险 {operationQueue.highRiskCount} 条</h3>
              {operationQueue.plans.map((plan) => (
                  <div className="operation-row" key={plan.id}>
                    <CircleDollarSign size={16} />
                    <span>{plan.targetName}</span>
                    <strong>{plan.action}</strong>
                    <em>{plan.risk}</em>
                  </div>
                ))}
              <p className="queue-note">
                需要确认 {operationQueue.confirmationRequiredCount} 条；实时执行默认关闭。
              </p>
            </div>
          </div>
        </section>
        <section className="footer-status">
          <span>飞书通知草稿 {notificationQueue.drafts.length} 条</span>
          <span>需立即跟进 {notificationQueue.actionCount} 条</span>
          <span>{runtimeConfig.hasFeishuWebhook ? '飞书 Webhook 已配置' : '飞书 Webhook 待配置'}</span>
          <span>配置来源：{runtimeConfig.source}</span>
          <span>数据源：{oceanEngineDataSource}</span>
          <span>授权账号：{authStatus?.authorizedAdvertiserCount ?? apiProbe.advertiserCount}</span>
          <span>报表探针：{apiProbe.reportRows} 行 / 余额 {apiProbe.fundRows} 行</span>
          <span>本地事实：{reportSyncSummary?.storedFactCount ?? 0} 条</span>
          <span>最近同步：{reportSyncSummary?.lastRun?.status ?? 'idle'}</span>
          <span>操作审计：{operationAuditSummary?.total ?? 0} 条 / 阻断 {operationAuditSummary?.blocked ?? 0}</span>
          <span>扩量候选：{portfolioDiagnostics.scaleCandidateCount}</span>
          <span>素材信号：{portfolioDiagnostics.materialSignalCount}</span>
          <span>回传异常：{portfolioDiagnostics.trackingIssueCount}</span>
          <span>小说归因：{materialAttributionSummary.resolvedCount} 已识别 / {materialAttributionSummary.reviewCount} 待归类</span>
          <span>负责人路由：{ownerRoutingResults.length} 条</span>
        </section>
      </main>
    </div>
  )
}

async function safeRead<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise
  } catch {
    return fallback
  }
}

interface MetricCardProps {
  label: string
  value: string
  delta: string
  tone: 'good' | 'neutral'
}

function MetricCard({ label, value, delta, tone }: MetricCardProps) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <em className={tone}>{delta}</em>
    </article>
  )
}

interface PanelTitleProps {
  icon: React.ReactNode
  title: string
  subtitle: string
}

function PanelTitle({ icon, title, subtitle }: PanelTitleProps) {
  return (
    <div className="panel-title">
      <div className="panel-icon">{icon}</div>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  )
}

export default App
