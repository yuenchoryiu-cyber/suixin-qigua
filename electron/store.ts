import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type { AppSettings, HistoryEntry } from '../src/shared/types'
import { scrubSecrets } from '../src/shared/scrub'

export interface PersistData {
  settings: AppSettings
  history: HistoryEntry[]
}

export const defaultSettings: AppSettings = {
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  mode: 'local',
  cooldownMinutes: 120,
  alwaysOnTop: true,
  highPrecisionDefault: false,
  hideWelcomeTip: false,
  fontScale: 'md',
  highContrast: false,
  storeQuestions: true,
}

const defaults: PersistData = {
  settings: { ...defaultSettings },
  history: [],
}

function filePath() {
  return path.join(app.getPath('userData'), 'suixin-store.json')
}

export function errorLogPath() {
  return path.join(app.getPath('userData'), 'suixin-error.log')
}

export function loadStore(): PersistData {
  try {
    const raw = fs.readFileSync(filePath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<PersistData>
    return {
      settings: { ...defaults.settings, ...parsed.settings },
      history: Array.isArray(parsed.history) ? parsed.history : [],
    }
  } catch {
    return structuredClone(defaults)
  }
}

export function saveStore(data: PersistData) {
  fs.mkdirSync(path.dirname(filePath()), { recursive: true })
  fs.writeFileSync(filePath(), JSON.stringify(data, null, 2), 'utf8')
}

export function clearStore(keepSettings: boolean): PersistData {
  if (keepSettings) {
    const cur = loadStore()
    const next: PersistData = { settings: cur.settings, history: [] }
    saveStore(next)
    return next
  }
  const next = structuredClone(defaults)
  saveStore(next)
  return next
}

export function appendErrorLog(message: string) {
  const scrubbed = scrubSecrets(message, 800)
  const line = `${new Date().toISOString()} ${scrubbed}\n`
  fs.mkdirSync(path.dirname(errorLogPath()), { recursive: true })
  fs.appendFileSync(errorLogPath(), line, 'utf8')
}
