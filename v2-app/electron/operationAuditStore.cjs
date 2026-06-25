const fs = require('node:fs/promises')
const path = require('node:path')

const maxStoredLogs = 1000
let auditFilePath = ''

function configure(userDataPath) {
  auditFilePath = path.join(userDataPath, 'operation-audit-logs.json')
}

async function saveLogs(logs) {
  ensureConfigured()
  const existing = await readLogs()
  const byId = new Map(existing.map((log) => [log.id, log]))

  normalizeLogs(logs).forEach((log) => byId.set(log.id, log))
  await writeLogs([...byId.values()].sort(sortNewestFirst).slice(0, maxStoredLogs))
}

async function listLogs() {
  ensureConfigured()
  return readLogs()
}

async function getSummary() {
  ensureConfigured()
  return summarize(await readLogs())
}

async function readLogs() {
  try {
    const raw = await fs.readFile(auditFilePath, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? normalizeLogs(parsed).sort(sortNewestFirst) : []
  } catch (error) {
    if (error && error.code === 'ENOENT') return []
    throw error
  }
}

async function writeLogs(logs) {
  await fs.mkdir(path.dirname(auditFilePath), { recursive: true })
  await fs.writeFile(auditFilePath, `${JSON.stringify(logs, null, 2)}\n`, 'utf8')
}

function summarize(logs) {
  return {
    total: logs.length,
    previewed: logs.filter((log) => log.status === 'previewed').length,
    confirmed: logs.filter((log) => log.status === 'confirmed').length,
    blocked: logs.filter((log) => log.status === 'blocked').length,
    executed: logs.filter((log) => log.status === 'executed').length,
    verificationFailed: logs.filter((log) => log.status === 'verification_failed').length,
    lastLog: logs[0],
  }
}

function normalizeLogs(logs) {
  if (!Array.isArray(logs)) return []

  return logs
    .map((log) => ({
      id: safeString(log && log.id, ''),
      planId: safeString(log && log.planId, ''),
      status: normalizeStatus(log && log.status),
      targetName: safeString(log && log.targetName, '').slice(0, 160),
      action: safeString(log && log.action, '').slice(0, 160),
      risk: normalizeRisk(log && log.risk),
      message: safeString(log && log.message, '').slice(0, 1000),
      createdAt: normalizeDate(log && log.createdAt),
    }))
    .filter((log) => log.id && log.planId && log.targetName && log.action)
}

function normalizeStatus(status) {
  return ['previewed', 'confirmed', 'blocked', 'executed', 'verification_failed'].includes(status)
    ? status
    : 'blocked'
}

function normalizeRisk(risk) {
  return ['low', 'medium', 'high'].includes(risk) ? risk : 'high'
}

function normalizeDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function safeString(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  return String(value)
}

function sortNewestFirst(a, b) {
  return b.createdAt.localeCompare(a.createdAt)
}

function ensureConfigured() {
  if (!auditFilePath) {
    throw new Error('operation audit store is not configured')
  }
}

module.exports = {
  configure,
  getSummary,
  listLogs,
  saveLogs,
}
