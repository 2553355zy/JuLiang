const defaultNotificationMode = 'preview'

async function sendNotification(draft) {
  const normalizedDraft = normalizeDraft(draft)
  const notificationMode = normalizeNotificationMode(process.env.JULIANG_NOTIFICATION_MODE)
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL || ''

  if (!webhookUrl) {
    return buildResult('skipped', normalizedDraft, 'FEISHU_WEBHOOK_URL is not configured')
  }

  if (notificationMode !== 'live') {
    return buildResult('previewed', normalizedDraft, `notification mode is ${notificationMode}`)
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildCardPayload(normalizedDraft)),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok || isFeishuFailure(payload)) {
      return buildResult('failed', normalizedDraft, buildSafeError(response.status, payload))
    }

    return buildResult('sent', normalizedDraft)
  } catch (error) {
    return buildResult('failed', normalizedDraft, error instanceof Error ? error.message : String(error))
  }
}

function buildCardPayload(draft) {
  return {
    msg_type: 'interactive',
    card: {
      config: {
        wide_screen_mode: true,
      },
      header: {
        template: draft.severity === 'action' ? 'red' : 'blue',
        title: {
          tag: 'plain_text',
          content: draft.title,
        },
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: draft.summary,
          },
        },
        {
          tag: 'hr',
        },
        {
          tag: 'note',
          elements: [
            {
              tag: 'plain_text',
              content: `receiver: ${draft.receiver} | dedupe: ${draft.dedupeKey}`,
            },
          ],
        },
      ],
    },
  }
}

function normalizeDraft(draft) {
  return {
    title: safeString(draft?.title, 'JuLiang notification').slice(0, 120),
    summary: safeString(draft?.summary, '').slice(0, 2000),
    receiver: safeString(draft?.receiver, 'unknown').slice(0, 120),
    severity: draft?.severity === 'action' ? 'action' : 'info',
    dedupeKey: safeString(draft?.dedupeKey, '').slice(0, 240),
  }
}

function normalizeNotificationMode(value) {
  return ['preview', 'live'].includes(value) ? value : defaultNotificationMode
}

function isFeishuFailure(payload) {
  const code = payload?.code ?? payload?.StatusCode
  if (code === undefined || code === null) return false
  return Number(code) !== 0
}

function buildSafeError(status, payload) {
  const code = payload?.code ?? payload?.StatusCode ?? 'UNKNOWN'
  const message = payload?.msg ?? payload?.message ?? payload?.StatusMessage ?? 'Feishu webhook request failed'
  return `HTTP ${status}, code ${code}, ${message}`
}

function buildResult(status, draft, error) {
  return {
    status,
    dedupeKey: draft.dedupeKey,
    receiver: draft.receiver,
    sentAt: new Date().toISOString(),
    error,
  }
}

function safeString(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  return String(value)
}

module.exports = {
  buildCardPayload,
  sendNotification,
}
