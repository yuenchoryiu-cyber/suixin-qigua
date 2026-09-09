import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  screen,
  dialog,
  clipboard,
  session,
  shell,
} from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  appendErrorLog,
  clearStore,
  defaultSettings,
  loadStore,
  saveStore,
  type PersistData,
} from './store'
import type { AppSettings, HistoryEntry } from '../src/shared/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let data: PersistData = {
  settings: { ...defaultSettings },
  history: [],
}
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let quitting = false

function createWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const winW = 420
  const winH = 640

  mainWindow = new BrowserWindow({
    width: winW,
    height: winH,
    x: Math.round(sw - winW - 24),
    y: Math.round(sh - winH - 24),
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: data.settings.alwaysOnTop,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('close', (e) => {
    if (!quitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
}

function trayIcon() {
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1
      const cross = x === 7 || x === 8 || y === 7 || y === 8
      if (edge || cross) {
        buf[i] = 57
        buf[i + 1] = 255
        buf[i + 2] = 20
        buf[i + 3] = 255
      } else {
        buf[i] = 8
        buf[i + 1] = 24
        buf[i + 2] = 8
        buf[i + 3] = 255
      }
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size })
}

function createTray() {
  tray = new Tray(trayIcon())
  tray.setToolTip('随心起卦')
  tray.on('click', () => toggleWindow())
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示 / 隐藏', click: () => toggleWindow() },
      {
        label: '设置',
        click: () => {
          showWindow()
          mainWindow?.webContents.send('navigate', 'settings')
        },
      },
      {
        label: '创建桌面捷径',
        click: () => {
          const ok = recreateWinDesktopShortcut()
          tray?.displayBalloon({
            title: '随心起卦',
            content: ok ? '桌面捷径已创建 / 更新' : '捷径创建失败，请查看日志',
          })
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          quitting = true
          app.quit()
        },
      },
    ]),
  )
  if (process.platform === 'win32') {
    tray.displayBalloon({
      title: '随心起卦',
      content: randomMingliLine(),
    })
  }
}

/** 启动托盘气泡：随机一句命理短句 */
function randomMingliLine(): string {
  const lines = [
    '一念起处，卦象自现。',
    '吉凶由心，趋避在行。',
    '时来天地皆同力，运去英雄不自由。',
    '静观其变，顺势而行。',
    '今日一卦，只问此刻心意。',
    '体用分明，得失自知。',
    '动爻有信，应期不远。',
    '心诚则灵，勿泥于辞。',
    '先问所求，再观卦象。',
    '阳生阴长，循环往复。',
    '事有转机，且看下一爻。',
    '天机不可尽窥，人事仍在一念。',
    '宜缓则缓，宜进则进。',
    '卦为风向，路在脚下。',
    '少安毋躁，静待花开。',
    '世应相生，事半功倍。',
    '水火既济，刚柔得位。',
    '山泽通气，彼此相应。',
    '雷风相薄，变动不居。',
    '乾坤定位，万物化生。',
  ]
  return lines[Math.floor(Math.random() * lines.length)]
}

function showWindow() {
  if (!mainWindow) return
  mainWindow.setAlwaysOnTop(data.settings.alwaysOnTop)
  mainWindow.show()
  mainWindow.focus()
}

function toggleWindow() {
  if (!mainWindow) return
  if (mainWindow.isVisible()) mainWindow.hide()
  else showWindow()
}

/** 安装 / 解压后：确保桌面有捷径（指向 GUI 程序，不经 cmd） */
function ensureWinDesktopShortcut() {
  if (process.platform !== 'win32' || !app.isPackaged) return
  try {
    app.setAppUserModelId('com.suixin.qigua')
    const linkPath = path.join(app.getPath('desktop'), '随心起卦.lnk')
    if (fs.existsSync(linkPath)) return
    const ok = shell.writeShortcutLink(linkPath, 'create', {
      target: process.execPath,
      cwd: path.dirname(process.execPath),
      args: '',
      description: '随心起卦',
      icon: process.execPath,
      iconIndex: 0,
      appUserModelId: 'com.suixin.qigua',
    })
    if (!ok) appendErrorLog('desktop shortcut: writeShortcutLink returned false')
  } catch (e) {
    appendErrorLog(`desktop shortcut: ${e instanceof Error ? e.message : String(e)}`)
  }
}

function recreateWinDesktopShortcut() {
  if (process.platform !== 'win32' || !app.isPackaged) return false
  try {
    app.setAppUserModelId('com.suixin.qigua')
    const linkPath = path.join(app.getPath('desktop'), '随心起卦.lnk')
    const opts = {
      target: process.execPath,
      cwd: path.dirname(process.execPath),
      args: '',
      description: '随心起卦',
      icon: process.execPath,
      iconIndex: 0,
      appUserModelId: 'com.suixin.qigua',
    }
    const op = fs.existsSync(linkPath) ? 'replace' : 'create'
    return shell.writeShortcutLink(linkPath, op, opts)
  } catch (e) {
    appendErrorLog(`desktop shortcut recreate: ${e instanceof Error ? e.message : String(e)}`)
    return false
  }
}

function registerIpc() {
  ipcMain.handle('settings:get', () => data.settings)
  ipcMain.handle('settings:set', (_e, partial: Partial<AppSettings>) => {
    data = {
      ...data,
      settings: { ...data.settings, ...partial },
    }
    saveStore(data)
    if (partial.alwaysOnTop !== undefined && mainWindow) {
      mainWindow.setAlwaysOnTop(partial.alwaysOnTop)
    }
    return data.settings
  })

  ipcMain.handle('history:list', () => data.history)
  ipcMain.handle('history:add', (_e, entry: HistoryEntry) => {
    data = {
      ...data,
      history: [entry, ...data.history].slice(0, 200),
    }
    saveStore(data)
    return true
  })

  ipcMain.handle('window:hide', () => {
    mainWindow?.hide()
  })

  ipcMain.handle('window:quit', () => {
    quitting = true
    app.quit()
  })

  ipcMain.handle(
    'share:save',
    async (_e, payload: { dataUrl: string; suggestedName: string }) => {
      const result = await dialog.showSaveDialog({
        title: '保存分享卡片',
        defaultPath: payload.suggestedName,
        filters: [{ name: 'PNG', extensions: ['png'] }],
      })
      if (result.canceled || !result.filePath) return { ok: false as const }
      const base64 = payload.dataUrl.replace(/^data:image\/png;base64,/, '')
      fs.writeFileSync(result.filePath, Buffer.from(base64, 'base64'))
      return { ok: true as const, path: result.filePath }
    },
  )

  ipcMain.handle('share:clipboard', (_e, dataUrl: string) => {
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
    const img = nativeImage.createFromBuffer(Buffer.from(base64, 'base64'))
    clipboard.writeImage(img)
    return { ok: true as const }
  })

  ipcMain.handle('log:error', (_e, message: string) => {
    appendErrorLog(message)
    return true
  })

  ipcMain.handle('store:clear', (_e, resetSettings: boolean) => {
    // resetSettings=true → 全量重置；false → 只清历史
    data = clearStore(!resetSettings)
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(data.settings.alwaysOnTop)
    }
    return data
  })

  ipcMain.handle('config:export', async () => {
    const { apiKey: _omit, ...rest } = data.settings
    const payload = {
      ...rest,
      apiKey: '',
      exportedAt: new Date().toISOString(),
      note: '此文件不含 API Key；导入时不会覆盖本机 Key。',
    }
    const result = await dialog.showSaveDialog({
      title: '导出配置（不含 API Key）',
      defaultPath: `suixin-settings-${Date.now()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return { ok: false as const }
    fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2), 'utf8')
    return { ok: true as const, path: result.filePath }
  })

  ipcMain.handle('config:import', async () => {
    const result = await dialog.showOpenDialog({
      title: '导入配置',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return { ok: false as const }
    try {
      const raw = fs.readFileSync(result.filePaths[0], 'utf8')
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      const { apiKey: _ignore, ...safe } = parsed
      const merged: AppSettings = {
        ...data.settings,
        ...safe,
        apiKey: data.settings.apiKey,
      }
      data = { ...data, settings: merged }
      saveStore(data)
      if (mainWindow) {
        mainWindow.setAlwaysOnTop(merged.alwaysOnTop)
      }
      return { ok: true as const, settings: merged }
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : String(e),
      }
    }
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    showWindow()
  })

  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
      if (permission === 'geolocation') callback(true)
      else callback(false)
    })
    // Windows / Chromium 还会先 check；不放行时常见 POSITION_UNAVAILABLE（拿不到信号）
    session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
      return permission === 'geolocation'
    })
    data = loadStore()
    ensureWinDesktopShortcut()
    createWindow()
    createTray()
    registerIpc()
    // 从桌面捷径启动时直接弹出面板
    showWindow()
  })

  app.on('before-quit', () => {
    quitting = true
  })
}