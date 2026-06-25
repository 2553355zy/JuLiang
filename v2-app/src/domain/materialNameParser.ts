export interface MaterialNameTags {
  rawName: string
  novelName: string
  episode?: string
  hookType?: string
  version?: string
  operator?: string
  confidence: number
  unresolvedParts: string[]
}

const separators = /[_\-｜|#\s]+/
const genericWords = new Set(['素材', '投放', '剪辑', '巨量', '测试', '新版', '竖版'])

export function parseMaterialName(rawName: string): MaterialNameTags {
  const parts = rawName
    .split(separators)
    .map((part) => part.trim())
    .filter(Boolean)

  const novelName = pickNovelName(parts)
  const episode = parts.find((part) => /^(ep|e|第)?\d{1,4}(集|话)?$/i.test(part))
  const hookType = parts.find((part) => /(复仇|逆袭|重生|甜宠|虐恋|打脸|悬疑|医术|豪门)/.test(part))
  const version = parts.find((part) => /^v\d+|版本\d+|剪\d+$/i.test(part))
  const operator = parts.find((part) => /^(op|投手|剪辑|编导)/i.test(part))

  const used = new Set([novelName, episode, hookType, version, operator].filter(Boolean))
  const unresolvedParts = parts.filter((part) => !used.has(part))

  return {
    rawName,
    novelName,
    episode,
    hookType,
    version,
    operator,
    confidence: scoreConfidence(novelName, parts, unresolvedParts),
    unresolvedParts,
  }
}

function pickNovelName(parts: string[]): string {
  const candidate = parts.find((part) => {
    if (genericWords.has(part)) return false
    if (/^(ep|e|第)?\d{1,4}(集|话)?$/i.test(part)) return false
    if (/^v\d+|版本\d+|剪\d+$/i.test(part)) return false
    if (/^(op|投手|剪辑|编导)/i.test(part)) return false
    return /[\u4e00-\u9fa5]/.test(part) && part.length >= 2
  })

  return candidate ?? '待识别小说'
}

function scoreConfidence(novelName: string, parts: string[], unresolvedParts: string[]): number {
  if (novelName === '待识别小说') return 0.32
  const structureBonus = Math.min(0.28, parts.length * 0.04)
  const unresolvedPenalty = Math.min(0.18, unresolvedParts.length * 0.03)
  return Number((0.62 + structureBonus - unresolvedPenalty).toFixed(2))
}

