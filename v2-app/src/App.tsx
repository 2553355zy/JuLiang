import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  CircleDollarSign,
  ClipboardCheck,
  Database,
  Gauge,
  LineChart,
  Megaphone,
  PlayCircle,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { buildMaterialSignalNotification } from './domain/feishu'
import type { FundBalanceSummary } from './domain/fundSync'
import type { NotificationDeliverySummary } from './domain/notificationDelivery'
import type { LiveOperationResult } from './domain/operationExecution'
import { evaluateAccount, evaluatePortfolioDiagnostics, formatMoney } from './domain/roiEngine'
import {
  accounts as fallbackAccounts,
  materialSignals as fallbackMaterialSignals,
  ownerRoutes,
} from './data/mockDashboard'
import type { AuthorizedAdvertiserRecord, AuthorizedAdvertiserSummary } from './domain/advertiserSync'
import type { OceanEngineAuthStatus } from './domain/oceanEngine'
import type { OperationAuditSummary } from './domain/operationAudit'
import type { ReportSyncSummary } from './domain/reportSync'
import type {
  SoftwareCenterRun,
  SoftwareCenterRunSummary,
  SoftwareCenterRunTrigger,
} from './domain/softwareCenter'
import { buildNotificationQueue } from './services/notificationRouter'
import { createLocalStorageAdvertiserRepository } from './services/advertiserRepository'
import { createAdvertiserSyncService } from './services/advertiserSyncService'
import { createElectronOceanEngineClient, createMockOceanEngineClient } from './services/oceanEngineClient'
import { resolveOwnerRoutes } from './services/ownerRoutingService'
import { buildOperationQueue } from './services/operationPlanner'
import { createElectronOperationAdapter } from './services/operationAdapter'
import { createOperationAuditRepository } from './services/operationAuditRepository'
import { confirmationKeyword, createOperationExecutionService } from './services/operationExecutionService'
import { attributeMaterials } from './services/materialAttributionService'
import { createLocalStorageFundRepository } from './services/fundRepository'
import { createFundSyncService } from './services/fundSyncService'
import { createLocalStorageMetricRepository } from './services/metricRepository'
import { createNotificationDeliveryService } from './services/notificationDeliveryService'
import { createLocalStorageNotificationDeliveryRepository } from './services/notificationDeliveryRepository'
import { buildPortfolioProjection } from './services/portfolioProjectionService'
import { createReportSyncService } from './services/reportSyncService'
import { createLocalStorageSoftwareCenterRepository } from './services/softwareCenterRepository'
import {
  createElectronOperationStateClient,
  createFallbackOperationStateReader,
  createOceanEngineOperationStateReader,
  createProjectionOperationStateReader,
} from './services/operationStateReader'
import {
  getBrowserRuntimeConfigStatus,
  loadRuntimeConfigStatus,
  type RuntimeConfigStatus,
} from './services/runtimeConfig'

const electronOceanEngineClient = createElectronOceanEngineClient()
const oceanEngineClient = electronOceanEngineClient ?? createMockOceanEngineClient()
const oceanEngineDataSource = electronOceanEngineClient ? 'electron-readonly' : 'mock-browser'
const advertiserSource = electronOceanEngineClient ? 'oceanengine' : 'mock'
const advertiserRepository = createLocalStorageAdvertiserRepository(advertiserSource)
const advertiserSyncService = createAdvertiserSyncService(
  oceanEngineClient,
  advertiserRepository,
  advertiserSource,
)
const metricRepository = createLocalStorageMetricRepository()
const reportSyncService = createReportSyncService(oceanEngineClient, metricRepository)
const fundRepository = createLocalStorageFundRepository(advertiserSource)
const fundSyncService = createFundSyncService(oceanEngineClient, fundRepository, advertiserSource)
const operationAuditRepository = createOperationAuditRepository()
const operationStateReader = createFallbackOperationStateReader([
  createOceanEngineOperationStateReader(createElectronOperationStateClient() ?? undefined),
  createProjectionOperationStateReader(),
])
const operationExecutionService = createOperationExecutionService(
  operationAuditRepository,
  createElectronOperationAdapter() ?? undefined,
  operationStateReader,
)
const notificationDeliveryRepository = createLocalStorageNotificationDeliveryRepository()
const notificationDeliveryService = createNotificationDeliveryService(notificationDeliveryRepository)
const softwareCenterRepository = createLocalStorageSoftwareCenterRepository()

function App() {
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfigStatus>(getBrowserRuntimeConfigStatus)
  const [authStatus, setAuthStatus] = useState<OceanEngineAuthStatus | null>(null)
  const [apiProbe, setApiProbe] = useState({ advertiserCount: 0, reportRows: 0, fundRows: 0 })
  const [advertiserSummary, setAdvertiserSummary] = useState<AuthorizedAdvertiserSummary | null>(null)
  const [portfolioProjection, setPortfolioProjection] = useState(() =>
    buildPortfolioProjection([], [], [], fallbackAccounts, fallbackMaterialSignals),
  )
  const [reportSyncSummary, setReportSyncSummary] = useState<ReportSyncSummary | null>(null)
  const [fundSummary, setFundSummary] = useState<FundBalanceSummary | null>(null)
  const [operationAuditSummary, setOperationAuditSummary] = useState<OperationAuditSummary | null>(null)
  const [notificationDeliverySummary, setNotificationDeliverySummary] =
    useState<NotificationDeliverySummary | null>(null)
  const [softwareRunStatus, setSoftwareRunStatus] = useState<SoftwareRunStatus>('idle')
  const [softwareRunSummary, setSoftwareRunSummary] = useState<SoftwareCenterRunSummary | null>(null)
  const [softwareRuns, setSoftwareRuns] = useState<SoftwareCenterRun[]>([])
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null)
  const [operationConfirmationText, setOperationConfirmationText] = useState('')
  const [liveOperationResult, setLiveOperationResult] = useState<LiveOperationResult | null>(null)

  const displayAccounts = portfolioProjection.accounts
  const displaySignals = portfolioProjection.materialSignals
  const topAccounts = useMemo(
    () => [...displayAccounts].sort((a, b) => b.metrics.roi - a.metrics.roi),
    [displayAccounts],
  )
  const recommendations = useMemo(
    () => displayAccounts.flatMap((account) => evaluateAccount(account)),
    [displayAccounts],
  )
  const notificationDraft = buildMaterialSignalNotification(displaySignals[0] ?? fallbackMaterialSignals[0])
  const notificationQueue = buildNotificationQueue(displaySignals, ownerRoutes)
  const operationQueue = useMemo(
    () =>
      buildOperationQueue(recommendations, {
        executionMode: runtimeConfig.executionMode,
        allowlistedAccountIds: runtimeConfig.operationAllowlistedAccountIds,
      }),
    [recommendations, runtimeConfig.executionMode, runtimeConfig.operationAllowlistedAccountIds],
  )
  const activeOperationPlan =
    operationQueue.plans.find((plan) => plan.id === selectedOperationId) ?? operationQueue.plans[0]
  const activeOperationGate = activeOperationPlan
    ? operationQueue.gates.find((gate) => gate.planId === activeOperationPlan.id)
    : undefined
  const activeConfirmationKeyword = activeOperationPlan ? confirmationKeyword(activeOperationPlan) : ''
  const portfolioDiagnostics = evaluatePortfolioDiagnostics(displayAccounts, displaySignals)
  const ownerRoutingResults = resolveOwnerRoutes(displaySignals, ownerRoutes)
  const materialAttributionSummary = attributeMaterials(
    displaySignals.map((signal) => ({
      id: signal.id,
      accountId: signal.accountId,
      materialName: signal.materialName,
      metrics: signal.metrics,
      ownerName: signal.owner.name,
    })),
  )
  const totalSpend = displayAccounts.reduce((sum, account) => sum + account.metrics.spend, 0)
  const totalRevenue = displayAccounts.reduce((sum, account) => sum + account.metrics.revenue, 0)
  const blendedRoi = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const projectionSourceLabel = portfolioProjection.source === 'metric-facts' ? '本地事实库' : '演示数据'
  const softwareModules: SoftwareModule[] = [
    {
      id: 'config',
      title: '授权与配置',
      description: runtimeConfig.hasOceanEngineAccessToken ? '巨量只读接口已具备运行条件' : '等待配置巨量 access token',
      status: runtimeConfig.hasOceanEngineAccessToken ? 'ready' : 'setup',
      evidence: `${runtimeConfig.source} / ${runtimeConfig.executionMode}`,
      href: '#accounts',
      icon: <Settings size={18} />,
    },
    {
      id: 'sync',
      title: '数据同步中心',
      description: '授权账号、报表事实、资金余额分仓同步',
      status: reportSyncSummary?.lastRun?.status === 'success' ? 'ready' : 'setup',
      evidence: `账号 ${apiProbe.advertiserCount} / 报表 ${apiProbe.reportRows} / 余额 ${apiProbe.fundRows}`,
      href: '#dashboard',
      icon: <Database size={18} />,
    },
    {
      id: 'roi',
      title: 'ROI 诊断中心',
      description: '从本地事实库生成扩量、控量、低余额和回传诊断',
      status: portfolioDiagnostics.diagnostics.length ? 'ready' : 'setup',
      evidence: `诊断 ${portfolioDiagnostics.diagnostics.length} / P0 ${portfolioDiagnostics.p0Count}`,
      href: '#accounts',
      icon: <LineChart size={18} />,
    },
    {
      id: 'materials',
      title: '素材小说名中心',
      description: '从高表现素材名提取小说名并保留负责人线索',
      status: materialAttributionSummary.resolvedCount ? 'ready' : 'setup',
      evidence: `识别 ${materialAttributionSummary.resolvedCount} / 待归类 ${materialAttributionSummary.reviewCount}`,
      href: '#materials',
      icon: <BookOpen size={18} />,
    },
    {
      id: 'routing',
      title: '负责人路由中心',
      description: '按素材、小说名、账号路由飞书接收人',
      status: ownerRoutingResults.length ? 'ready' : 'setup',
      evidence: `路由 ${ownerRoutingResults.length} / 通知 ${notificationQueue.drafts.length}`,
      href: '#feishu',
      icon: <Route size={18} />,
    },
    {
      id: 'notifications',
      title: '通知与去重中心',
      description: '飞书卡片预览、去重键、投递日志已形成闭环',
      status: notificationDeliverySummary?.lastLog ? 'ready' : 'setup',
      evidence: `${runtimeConfig.notificationMode} / ${notificationDeliverySummary?.lastLog?.status ?? 'idle'}`,
      href: '#feishu',
      icon: <Bell size={18} />,
    },
    {
      id: 'operations',
      title: '操作安全中心',
      description: '预算和状态操作先过模式、白名单、确认词和审计',
      status: operationQueue.liveCandidateCount ? 'ready' : 'setup',
      evidence: `候选 ${operationQueue.liveCandidateCount} / 阻断 ${operationQueue.blockedLiveCount}`,
      href: '#operations',
      icon: <ShieldCheck size={18} />,
    },
    {
      id: 'extensions',
      title: '扩展集成中心',
      description: '飞书应用授权、更多平台和自动化策略作为后续扩展',
      status: 'later',
      evidence: '不阻塞当前骨架',
      href: '#software',
      icon: <Sparkles size={18} />,
    },
  ]

  useEffect(() => {
    let mounted = true

    async function loadRuntimeState() {
      await runLoggedWorkspaceRefresh('startup', () => mounted)
    }

    loadRuntimeState()

    return () => {
      mounted = false
    }
  }, [])

  async function refreshWorkspaceState(): Promise<WorkspaceRefreshResult> {
    const [config, auth, advertiserSync] = await Promise.all([
      loadRuntimeConfigStatus(),
      safeRead(oceanEngineClient.getAuthStatus(), {
        hasAccessToken: false,
        hasRefreshToken: false,
        authorizedAdvertiserCount: 0,
      }),
      advertiserSyncService.runOnce(),
    ])
    const advertiserIds = resolveSyncAdvertiserIds(advertiserSync.advertisers)
    const [syncSummary, nextFundSummary] = await Promise.all([
      runReportSync(advertiserIds),
      fundSyncService.runOnce(advertiserIds),
    ])
    const facts = await metricRepository.listFacts()
    const nextProjection = buildPortfolioProjection(
      facts,
      advertiserSync.advertisers,
      nextFundSummary.balances,
      fallbackAccounts,
      fallbackMaterialSignals,
    )
    const nextRecommendations = nextProjection.accounts.flatMap((account) => evaluateAccount(account))
    const nextOperationQueue = buildOperationQueue(nextRecommendations)
    const auditSummary = await operationExecutionService.previewPlans(nextOperationQueue.plans)
    const deliverySummary = await notificationDeliveryRepository.getSummary()

    return {
      config,
      auth,
      advertiserSync,
      syncSummary,
      fundSummary: nextFundSummary,
      projection: nextProjection,
      auditSummary,
      deliverySummary,
    }
  }

  function applyWorkspaceRefresh(result: WorkspaceRefreshResult): void {
    setRuntimeConfig(result.config)
    setAuthStatus({
      ...result.auth,
      authorizedAdvertiserCount: Math.max(
        result.auth.authorizedAdvertiserCount,
        result.advertiserSync.storedAdvertiserCount,
      ),
    })
    setAdvertiserSummary(result.advertiserSync)
    setPortfolioProjection(result.projection)
    setFundSummary(result.fundSummary)
    setApiProbe({
      advertiserCount: result.advertiserSync.storedAdvertiserCount,
      reportRows: result.syncSummary.lastRun?.rowCount ?? 0,
      fundRows: result.fundSummary.storedBalanceCount,
    })
    setReportSyncSummary(result.syncSummary)
    setOperationAuditSummary(result.auditSummary)
    setNotificationDeliverySummary(result.deliverySummary)
  }

  async function runReportSync(advertiserIds = resolveSyncAdvertiserIds(advertiserSummary?.advertisers)) {
    return reportSyncService.runOnce({
      advertiserIds,
      startDate: todayIsoDate(),
      endDate: todayIsoDate(),
      dimensions: ['advertiser', 'material'],
      metrics: ['cost', 'show', 'click', 'convert', 'income', 'roi'],
    })
  }

  async function handleSyncReports() {
    const summary = await runReportSync()
    const facts = await metricRepository.listFacts()
    const balances = await fundRepository.listBalances()
    setPortfolioProjection(
      buildPortfolioProjection(
        facts,
        advertiserSummary?.advertisers ?? [],
        balances,
        fallbackAccounts,
        fallbackMaterialSignals,
      ),
    )
    setReportSyncSummary(summary)
    setApiProbe((current) => ({
      ...current,
      reportRows: summary.lastRun?.rowCount ?? current.reportRows,
    }))
  }

  async function handleSyncAdvertisers() {
    const summary = await advertiserSyncService.runOnce()
    const facts = await metricRepository.listFacts()
    const balances = await fundRepository.listBalances()
    setAdvertiserSummary(summary)
    setPortfolioProjection(
      buildPortfolioProjection(facts, summary.advertisers, balances, fallbackAccounts, fallbackMaterialSignals),
    )
    setAuthStatus((current) =>
      current
        ? {
            ...current,
            authorizedAdvertiserCount: Math.max(current.authorizedAdvertiserCount, summary.storedAdvertiserCount),
          }
        : current,
    )
    setApiProbe((current) => ({
      ...current,
      advertiserCount: summary.storedAdvertiserCount,
    }))
  }

  async function handleSyncFunds() {
    const advertiserIds = resolveSyncAdvertiserIds(advertiserSummary?.advertisers)
    const summary = await fundSyncService.runOnce(advertiserIds)
    const facts = await metricRepository.listFacts()
    setFundSummary(summary)
    setPortfolioProjection(
      buildPortfolioProjection(
        facts,
        advertiserSummary?.advertisers ?? [],
        summary.balances,
        fallbackAccounts,
        fallbackMaterialSignals,
      ),
    )
    setApiProbe((current) => ({
      ...current,
      fundRows: summary.storedBalanceCount,
    }))
  }

  async function handleDeliverNotification() {
    const summary = await notificationDeliveryService.deliver(notificationDraft)
    setNotificationDeliverySummary(summary)
  }

  async function handleConfirmOperationPlan() {
    if (!activeOperationPlan) return

    const summary = await operationExecutionService.confirmPlan(
      activeOperationPlan,
      operationConfirmationText,
    )
    setOperationAuditSummary(summary)
    setLiveOperationResult(null)
    setOperationConfirmationText('')
  }

  async function handleBlockOperationPlan() {
    if (!activeOperationPlan) return

    const summary = await operationExecutionService.blockLiveExecution(
      activeOperationPlan,
      '用户在操作安全中心标记暂不执行，保留审计记录。',
    )
    setOperationAuditSummary(summary)
    setLiveOperationResult(null)
    setOperationConfirmationText('')
  }

  async function handleRequestLiveExecution() {
    if (!activeOperationPlan) return

    const { result, auditSummary } = await operationExecutionService.requestLiveExecution(
      activeOperationPlan,
      activeOperationGate,
      operationConfirmationText,
    )
    setLiveOperationResult(result)
    setOperationAuditSummary(auditSummary)
  }

  async function handleRefreshWorkspace() {
    await runLoggedWorkspaceRefresh('manual')
  }

  async function runLoggedWorkspaceRefresh(
    trigger: SoftwareCenterRunTrigger,
    shouldApply: () => boolean = () => true,
  ) {
    const startedAt = new Date().toISOString()
    setSoftwareRunStatus('running')

    try {
      const result = await refreshWorkspaceState()
      if (!shouldApply()) return

      applyWorkspaceRefresh(result)
      await softwareCenterRepository.saveRun(buildSoftwareCenterRun(trigger, 'success', startedAt, result))
      await loadSoftwareRunHistory()
      setSoftwareRunStatus('success')
    } catch (error) {
      await softwareCenterRepository.saveRun(
        buildSoftwareCenterRun(trigger, 'failed', startedAt, undefined, error),
      )
      await loadSoftwareRunHistory()
      setSoftwareRunStatus('failed')
    }
  }

  async function loadSoftwareRunHistory() {
    const [summary, runs] = await Promise.all([
      softwareCenterRepository.getSummary(),
      softwareCenterRepository.listRuns(),
    ])
    setSoftwareRunSummary(summary)
    setSoftwareRuns(runs.slice(0, 5))
  }

  const authorizedAdvertisers = advertiserSummary?.advertisers ?? []

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
          <a href="#software">
            <Settings size={18} /> 软件中心
          </a>
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
            <button className="ghost-button" type="button" onClick={handleSyncFunds}>
              <Wallet size={16} />
              同步余额
            </button>
            <button className="primary-button" type="button">
              <PlayCircle size={16} />
              生成建议
            </button>
          </div>
        </header>

        <section className="metric-grid" id="dashboard">
          <MetricCard label="今日消耗" value={formatMoney(totalSpend)} delta={projectionSourceLabel} tone="neutral" />
          <MetricCard label="今日收入" value={formatMoney(totalRevenue)} delta={projectionSourceLabel} tone="good" />
          <MetricCard label="综合 ROI" value={blendedRoi.toFixed(2)} delta="目标 1.25" tone="good" />
          <MetricCard label="诊断事项" value={`${portfolioDiagnostics.diagnostics.length}`} delta={`P0 ${portfolioDiagnostics.p0Count}`} tone="neutral" />
        </section>

        <section className="panel software-center" id="software">
          <PanelTitle icon={<Settings size={18} />} title="软件中心" subtitle="主体能力先闭环，延伸集成后续单独推进" />
          <div className="software-toolbar">
            <div>
              <strong>全链路刷新：{formatSoftwareRunStatus(softwareRunStatus)}</strong>
              <span>
                最近 {softwareRunSummary?.lastRun?.status ?? 'none'} / 耗时 {formatDuration(softwareRunSummary?.lastRun?.durationMs)}
                {' '} / 失败 {softwareRunSummary?.failed ?? 0}
              </span>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={handleRefreshWorkspace}
              disabled={softwareRunStatus === 'running'}
            >
              <Activity size={16} />
              刷新全部
            </button>
          </div>
          <div className="software-grid">
            {softwareModules.map((module) => (
              <a className={`software-module ${module.status}`} href={module.href} key={module.id}>
                <div className="software-module-icon">{module.icon}</div>
                <div>
                  <div className="software-module-head">
                    <strong>{module.title}</strong>
                    <span>{formatModuleStatus(module.status)}</span>
                  </div>
                  <p>{module.description}</p>
                  <em>{module.evidence}</em>
                </div>
              </a>
            ))}
          </div>
          <div className="software-run-list" aria-label="软件中心最近运行">
            <div className="software-run-list-head">
              <strong>最近运行</strong>
              <span>{softwareRuns.length ? `${softwareRuns.length} 条` : '暂无记录'}</span>
            </div>
            {softwareRuns.length ? (
              softwareRuns.map((run) => (
                <div className={`software-run-row ${run.status}`} key={run.id}>
                  <span>{formatRunTrigger(run.trigger)}</span>
                  <strong>{run.status}</strong>
                  <span>{formatDuration(run.durationMs)}</span>
                  <span>账号 {run.counts.advertisers}</span>
                  <span>报表 {run.counts.reportRows}</span>
                  <span>诊断 {run.counts.diagnostics}</span>
                </div>
              ))
            ) : (
              <div className="software-run-empty">刷新全部后会生成运行记录。</div>
            )}
          </div>
        </section>

        <section className="split-layout">
          <div className="panel account-panel" id="accounts">
            <PanelTitle icon={<LineChart size={18} />} title="账号 ROI 排行" subtitle="用于快速判断扩量、控量与回传排查" />
            <div className="authorized-toolbar">
              <div>
                <strong>授权账号库 {advertiserSummary?.storedAdvertiserCount ?? 0} 个</strong>
                <span>最近同步：{advertiserSummary?.lastRun?.status ?? 'idle'}</span>
              </div>
              <button className="ghost-button compact" type="button" onClick={handleSyncAdvertisers}>
                <Activity size={15} />
                同步授权
              </button>
            </div>
            <AuthorizedAdvertiserList advertisers={authorizedAdvertisers} />
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
              {displaySignals.map((signal) => (
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
              <div className="feishu-actions">
                <span>模式：{runtimeConfig.notificationMode}</span>
                <span>最近：{notificationDeliverySummary?.lastLog?.status ?? 'idle'}</span>
                <button className="ghost-button compact" type="button" onClick={handleDeliverNotification}>
                  <Bell size={15} />
                  发送预览
                </button>
              </div>
            </div>
            <div className="operation-preview" id="operations">
              <h3>操作安全中心 · {operationQueue.plans.length} 条 · 高风险 {operationQueue.highRiskCount} 条</h3>
              <div className="operation-workbench">
                <div className="operation-plan-list">
                  {operationQueue.plans.map((plan) => (
                    <button
                      className={`operation-row ${activeOperationPlan?.id === plan.id ? 'active' : ''}`}
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        setSelectedOperationId(plan.id)
                        setOperationConfirmationText('')
                        setLiveOperationResult(null)
                      }}
                    >
                      <CircleDollarSign size={16} />
                      <span>{plan.targetName}</span>
                      <strong>{plan.action}</strong>
                      <em>{plan.risk}</em>
                      <small className={`gate-chip ${operationQueue.gates.find((gate) => gate.planId === plan.id)?.status ?? 'blocked'}`}>
                        {formatGateStatus(operationQueue.gates.find((gate) => gate.planId === plan.id)?.status)}
                      </small>
                    </button>
                  ))}
                  {!operationQueue.plans.length ? (
                    <div className="operation-empty">当前没有需要进入操作预览的账号任务。</div>
                  ) : null}
                </div>
                {activeOperationPlan ? (
                  <div className="operation-detail">
                    <div>
                      <span>目标</span>
                      <strong>{activeOperationPlan.targetName}</strong>
                    </div>
                    <div>
                      <span>建议动作</span>
                      <strong>{activeOperationPlan.action}</strong>
                    </div>
                    <div className={`operation-gate ${activeOperationGate?.status ?? 'blocked'}`}>
                      <span>真实操作门禁</span>
                      <strong>{formatGateStatus(activeOperationGate?.status)}</strong>
                      <p>{activeOperationGate?.reason ?? '未生成门禁结果。'}</p>
                    </div>
                    <p>{activeOperationPlan.reason}</p>
                    <label>
                      <span>确认词：{activeConfirmationKeyword}</span>
                      <input
                        value={operationConfirmationText}
                        onChange={(event) => setOperationConfirmationText(event.target.value)}
                        placeholder="输入确认词后写入审计"
                      />
                    </label>
                    <div className="operation-detail-actions">
                      <button className="ghost-button compact" type="button" onClick={handleBlockOperationPlan}>
                        标记暂不执行
                      </button>
                      <button className="primary-button compact" type="button" onClick={handleConfirmOperationPlan}>
                        确认预案
                      </button>
                      <button className="ghost-button compact" type="button" onClick={handleRequestLiveExecution}>
                        真实执行检查
                      </button>
                    </div>
                    {liveOperationResult?.planId === activeOperationPlan.id ? (
                      <div className={`live-result ${liveOperationResult.status}`}>
                        <span>执行器结果：{formatLiveOperationStatus(liveOperationResult.status)}</span>
                        <span>操作类型：{formatLiveOperationType(liveOperationResult.operationType)}</span>
                        <strong>{liveOperationResult.message}</strong>
                        <p>{formatOperationSnapshot(liveOperationResult)}</p>
                        <p>验证字段：{liveOperationResult.verification.verifyFields.join(', ') || '无'}</p>
                        <p>幂等键：{liveOperationResult.idempotencyKey}</p>
                      </div>
                    ) : null}
                    <small>
                      确认预案只写入审计；真实执行还需要 live 模式、账号白名单、确认词、审计和后续执行器共同通过。
                    </small>
                  </div>
                ) : null}
              </div>
              <p className="queue-note">
                需要确认 {operationQueue.confirmationRequiredCount} 条；最近审计：
                {operationAuditSummary?.lastLog?.status ?? 'idle'}；live 候选：
                {operationQueue.liveCandidateCount} 条。
              </p>
            </div>
          </div>
        </section>
        <section className="footer-status">
          <span>飞书通知草稿 {notificationQueue.drafts.length} 条</span>
          <span>需立即跟进 {notificationQueue.actionCount} 条</span>
          <span>{runtimeConfig.hasFeishuWebhook ? '飞书 Webhook 已配置' : '飞书 Webhook 待配置'}</span>
          <span>飞书模式：{runtimeConfig.notificationMode}</span>
          <span>通知投递：{notificationDeliverySummary?.lastLog?.status ?? 'idle'} / sent {notificationDeliverySummary?.sent ?? 0}</span>
          <span>配置来源：{runtimeConfig.source}</span>
          <span>执行模式：{runtimeConfig.executionMode}</span>
          <span>操作白名单：{runtimeConfig.operationAllowlistedAccountIds.length} 个账号</span>
          <span>数据源：{oceanEngineDataSource}</span>
          <span>指标来源：{projectionSourceLabel}</span>
          <span>软件运行：{softwareRunSummary?.total ?? 0} 次 / 失败 {softwareRunSummary?.failed ?? 0}</span>
          <span>授权账号：{authStatus?.authorizedAdvertiserCount ?? apiProbe.advertiserCount}</span>
          <span>账号库同步：{advertiserSummary?.lastRun?.status ?? 'idle'}</span>
          <span>余额同步：{fundSummary?.lastRun?.status ?? 'idle'}</span>
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

function resolveSyncAdvertiserIds(advertisers: AuthorizedAdvertiserRecord[] = []): string[] {
  const advertiserIds = advertisers.map((advertiser) => advertiser.advertiserId).filter(Boolean)
  return advertiserIds.length ? advertiserIds : fallbackAccounts.map((account) => account.id)
}

function todayIsoDate(): string {
  const now = new Date()
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 10)
}

type SoftwareModuleStatus = 'ready' | 'setup' | 'later'
type SoftwareRunStatus = 'idle' | 'running' | 'success' | 'failed'

interface WorkspaceRefreshResult {
  config: RuntimeConfigStatus
  auth: OceanEngineAuthStatus
  advertiserSync: AuthorizedAdvertiserSummary
  syncSummary: ReportSyncSummary
  fundSummary: FundBalanceSummary
  projection: ReturnType<typeof buildPortfolioProjection>
  auditSummary: OperationAuditSummary
  deliverySummary: NotificationDeliverySummary
}

interface SoftwareModule {
  id: string
  title: string
  description: string
  status: SoftwareModuleStatus
  evidence: string
  href: string
  icon: React.ReactNode
}

function formatModuleStatus(status: SoftwareModuleStatus): string {
  const labels: Record<SoftwareModuleStatus, string> = {
    ready: '已接入',
    setup: '待配置',
    later: '后续扩展',
  }

  return labels[status]
}

function formatGateStatus(status?: string): string {
  if (status === 'live_candidate') return 'live 候选'
  if (status === 'preview_only') return '仅预览'
  return '已阻断'
}

function formatLiveOperationStatus(status: LiveOperationResult['status']): string {
  const labels: Record<LiveOperationResult['status'], string> = {
    blocked: '门禁阻断',
    rejected: '确认拒绝',
    not_implemented: '执行器未接入',
    executed: '已执行',
  }

  return labels[status]
}

function formatLiveOperationType(operationType: LiveOperationResult['operationType']): string {
  const labels: Record<LiveOperationResult['operationType'], string> = {
    adjust_budget: '预算调整',
    pause: '暂停',
    resume: '恢复',
    close: '关闭',
    unknown: '未知操作',
  }

  return labels[operationType]
}

function formatOperationSnapshot(result: LiveOperationResult): string {
  const before = result.verification.before
  const changes = result.verification.expectedChanges
    .map((change) => {
      if (change.field === 'budget') return `预算 ${change.from ?? '--'} -> ${change.to ?? '--'}`
      if (change.field === 'status') return `状态 ${change.from ?? before.status ?? '--'} -> ${change.to ?? '--'}`
      return change.description
    })
    .join('；')

  return `操作前快照：${before.source}${before.budget !== undefined ? ` / 预算 ${before.budget}` : ''}${before.status ? ` / 状态 ${before.status}` : ''}${changes ? `；期望 ${changes}` : ''}`
}

function formatSoftwareRunStatus(status: SoftwareRunStatus): string {
  const labels: Record<SoftwareRunStatus, string> = {
    idle: '待运行',
    running: '运行中',
    success: '已完成',
    failed: '失败',
  }

  return labels[status]
}

function formatRunTrigger(trigger: SoftwareCenterRunTrigger): string {
  const labels: Record<SoftwareCenterRunTrigger, string> = {
    startup: '启动',
    manual: '手动',
  }

  return labels[trigger]
}

function buildSoftwareCenterRun(
  trigger: SoftwareCenterRunTrigger,
  status: SoftwareCenterRun['status'],
  startedAt: string,
  result?: WorkspaceRefreshResult,
  error?: unknown,
): SoftwareCenterRun {
  const finishedAt = new Date().toISOString()
  const diagnostics = result ? evaluatePortfolioDiagnostics(result.projection.accounts, result.projection.materialSignals) : null
  const recommendations = result ? result.projection.accounts.flatMap((account) => evaluateAccount(account)) : []
  const operationQueue = buildOperationQueue(recommendations, {
    executionMode: result?.config.executionMode ?? 'readonly',
    allowlistedAccountIds: result?.config.operationAllowlistedAccountIds ?? [],
  })

  return {
    id: `software-run-${startedAt}-${trigger}`,
    trigger,
    status,
    startedAt,
    finishedAt,
    durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
    dataSource: oceanEngineDataSource,
    metricSource: result?.projection.source ?? 'mock',
    counts: {
      advertisers: result?.advertiserSync.storedAdvertiserCount ?? 0,
      reportRows: result?.syncSummary.lastRun?.rowCount ?? 0,
      fundRows: result?.fundSummary.storedBalanceCount ?? 0,
      diagnostics: diagnostics?.diagnostics.length ?? 0,
      materialSignals: result?.projection.materialSignals.length ?? 0,
      notificationDrafts: result
        ? buildNotificationQueue(result.projection.materialSignals, ownerRoutes).drafts.length
        : 0,
      operationPlans: operationQueue.plans.length,
    },
    error: error instanceof Error ? error.message : error ? String(error) : undefined,
  }
}

function formatDuration(ms?: number): string {
  if (ms === undefined) return '--'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

interface AuthorizedAdvertiserListProps {
  advertisers: AuthorizedAdvertiserRecord[]
}

function AuthorizedAdvertiserList({ advertisers }: AuthorizedAdvertiserListProps) {
  if (!advertisers.length) {
    return (
      <div className="authorized-empty">
        桌面端配置 OceanEngine token 后，这里会显示已授权账号。
      </div>
    )
  }

  return (
    <div className="authorized-list" aria-label="已授权巨量账号">
      {advertisers.slice(0, 4).map((advertiser) => (
        <article className="authorized-item" key={advertiser.advertiserId}>
          <div>
            <strong>{advertiser.name}</strong>
            <span>{advertiser.advertiserId}</span>
          </div>
          <em>{advertiser.ownerName || advertiser.accountRole}</em>
        </article>
      ))}
    </div>
  )
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
