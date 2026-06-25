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
import './App.css'
import { buildMaterialSignalNotification } from './domain/feishu'
import { formatMoney } from './domain/roiEngine'
import { accounts, materialSignals, recommendations } from './data/mockDashboard'
import { buildNotificationQueue } from './services/notificationRouter'
import { buildOperationQueue } from './services/operationPlanner'
import { getRuntimeConfigStatus } from './services/runtimeConfig'

const topAccounts = [...accounts].sort((a, b) => b.metrics.roi - a.metrics.roi)
const heroSignal = materialSignals[0]
const notificationDraft = buildMaterialSignalNotification(heroSignal)
const notificationQueue = buildNotificationQueue(materialSignals)
const operationQueue = buildOperationQueue(recommendations)
const runtimeConfig = getRuntimeConfigStatus()
const totalSpend = accounts.reduce((sum, account) => sum + account.metrics.spend, 0)
const totalRevenue = accounts.reduce((sum, account) => sum + account.metrics.revenue, 0)
const totalProfit = totalRevenue - totalSpend
const blendedRoi = totalRevenue / totalSpend

function App() {
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
            <button className="ghost-button" type="button">
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
          <MetricCard label="预估利润" value={formatMoney(totalProfit)} delta="+36.2%" tone="good" />
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
        </section>
      </main>
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
