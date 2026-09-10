import { app, BrowserWindow, shell } from 'electron'
import electronUpdater from 'electron-updater'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { appendErrorLog } from './store'
import type { UpdateStatus } from '../src/shared/updateTypes'

export type { UpdatePhase, UpdateStatus } from '../src/shared/updateTypes'

const { autoUpdater } = electronUpdater

let status: UpdateStatus = { phase: 'idle' }
let getMainWindow: () => BrowserWindow | null = () => null
let markQuitting: () => void = () => undefined
/** 安装前清理托盘等，确保进程能真正退出 */
let prepareQuitForUpdate: () => void = () => undefined
let wired = false
/** electron-updater 缓存中的安装包路径（唯一下载落点，不再复制到「下载」） */
let cachedInstallerPath: string | null = null

function emit(next: UpdateStatus) {
  status = {
    ...next,
    packagePath: next.packagePath ?? cachedInstallerPath ?? undefined,
  }
  getMainWindow()?.webContents.send('update:status', status)
}

function isPortable(): boolean {
  return Boolean(process.env.PORTABLE_EXECUTABLE_DIR)
}

/** 仅安装版（非便携、非开发）启用自动更新 */
export function updaterEnabled(): boolean {
  return app.isPackaged && !isPortable()
}

export function getUpdateStatus(): UpdateStatus {
  return status
}

/**
 * 简单 semver：remote > local（支持跨多个小版本直达最新）。
 */
export function isVersionNewer(remote: string, local: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split(/[.+-]/)
      .map((x) => {
        const n = Number.parseInt(x, 10)
        return Number.isFinite(n) ? n : 0
      })
  const a = parse(remote)
  const b = parse(local)
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x > y) return true
    if (x < y) return false
  }
  return false
}

function resolveInstallerPath(): string | null {
  const helper = (
    autoUpdater as unknown as { downloadedUpdateHelper?: { file?: string | null } }
  ).downloadedUpdateHelper
  const fromHelper = helper?.file
  if (fromHelper && fs.existsSync(fromHelper)) return fromHelper
  if (cachedInstallerPath && fs.existsSync(cachedInstallerPath)) {
    return cachedInstallerPath
  }
  return null
}

/**
 * 静默更新：--updated（覆盖安装）+/S（无向导）+--force-run（装完拉起）。
 * 先起安装器再退出，并销毁托盘，避免「退出了却没装 / 装完不重开」。
 */
function spawnSilentUpdateAndExit(installerPath: string): void {
  markQuitting()
  prepareQuitForUpdate()
  const args = ['--updated', '/S', '--force-run']
  appendErrorLog(`update:install spawn ${installerPath} ${args.join(' ')}`)
  try {
    const child = spawn(installerPath, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    child.unref()
  } catch (e) {
    appendErrorLog(
      `update:install spawn failed: ${e instanceof Error ? e.message : String(e)}`,
    )
    emit({
      phase: 'error',
      message: '无法启动更新安装，请重试或手动下载安装包',
      version: status.version,
    })
    return
  }
  // 稍等安装器起来再强退，避免托盘把进程挂住
  setTimeout(() => {
    try {
      app.exit(0)
    } catch {
      process.exit(0)
    }
  }, 400)
}

export function setupAutoUpdater(opts: {
  getWindow: () => BrowserWindow | null
  onQuitForUpdate: () => void
  prepareQuitForUpdate?: () => void
}) {
  getMainWindow = opts.getWindow
  markQuitting = opts.onQuitForUpdate
  prepareQuitForUpdate = opts.prepareQuitForUpdate ?? (() => undefined)
  if (wired) return
  wired = true

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.allowDowngrade = false
  autoUpdater.channel = 'latest'
  autoUpdater.disableWebInstaller = true
  if (process.platform === 'win32') {
    const nsis = autoUpdater as unknown as {
      verifyUpdateCodeSignature?: (
        publisherName: string[],
        path: string,
      ) => Promise<string | null>
    }
    nsis.verifyUpdateCodeSignature = async () => null
  }

  autoUpdater.on('checking-for-update', () => {
    emit({ phase: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    const local = app.getVersion()
    const remote = info.version
    if (!isVersionNewer(remote, local)) {
      appendErrorLog(
        `autoUpdater: ignore non-newer remote=${remote} local=${local}`,
      )
      emit({ phase: 'not-available', version: local })
      return
    }
    emit({
      phase: 'available',
      version: remote,
      differential: true,
      message: `发现 V${remote}（当前 V${local}）。下载后点「安装并重启」即可，不会再复制整包到下载文件夹。`,
    })
  })

  autoUpdater.on('update-not-available', () => {
    emit({ phase: 'not-available', version: app.getVersion() })
  })

  autoUpdater.on('download-progress', (p) => {
    emit({
      phase: 'downloading',
      version: status.version,
      percent: p.percent,
      bytesPerSecond: p.bytesPerSecond,
      transferred: p.transferred,
      total: p.total,
      differential: status.differential,
      message: status.message,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    const file = (info as { downloadedFile?: string }).downloadedFile || ''
    if (file) cachedInstallerPath = file
    const resolved = resolveInstallerPath()
    if (resolved) cachedInstallerPath = resolved
    emit({
      phase: 'downloaded',
      version: info.version,
      percent: 100,
      differential: status.differential,
      packagePath: cachedInstallerPath || undefined,
      message:
        '更新已就绪。点「安装并重启」将静默覆盖安装并自动打开，无需另下整包、也不进 Setup 向导。',
    })
  })

  autoUpdater.on('error', (err) => {
    const message = err instanceof Error ? err.message : String(err)
    appendErrorLog(`autoUpdater: ${message}`)
    if (status.phase === 'downloaded') return
    emit({ phase: 'error', message, version: status.version })
  })
}

export async function checkForAppUpdate(): Promise<UpdateStatus> {
  if (!updaterEnabled()) {
    emit({
      phase: 'error',
      message: '便携版 / 开发模式不支持应用内更新，请下载完整安装包',
    })
    return status
  }
  try {
    emit({ phase: 'checking' })
    const result = await autoUpdater.checkForUpdates()
    const remote = result?.updateInfo?.version
    const local = app.getVersion()
    if (remote && isVersionNewer(remote, local)) {
      if (status.phase !== 'available') {
        emit({
          phase: 'available',
          version: remote,
          differential: true,
          message: `发现 V${remote}（当前 V${local}）。下载后安装并重启即可。`,
        })
      }
    } else {
      if (remote && !isVersionNewer(remote, local)) {
        appendErrorLog(
          `checkForUpdates: remote not newer remote=${remote} local=${local}`,
        )
      }
      emit({ phase: 'not-available', version: local })
    }
    return status
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    appendErrorLog(`checkForUpdates: ${message}`)
    emit({ phase: 'error', message })
    return status
  }
}

/**
 * 先尝试差量；失败则整包。只下载到 updater 缓存，不往「下载」再拷一份。
 */
export async function downloadAppUpdate(): Promise<UpdateStatus> {
  if (!updaterEnabled()) {
    emit({
      phase: 'error',
      message: '当前运行方式不支持应用内更新',
    })
    return status
  }

  const runDownload = async (full: boolean) => {
    autoUpdater.disableDifferentialDownload = full
    emit({
      phase: 'downloading',
      version: status.version,
      percent: 0,
      differential: !full,
      message: full
        ? '差量不可用，正在下载更新…'
        : '正在下载更新（优先差量）…',
    })
    await autoUpdater.downloadUpdate()
  }

  try {
    await runDownload(false)
    return status
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    appendErrorLog(`downloadUpdate(diff): ${message}`)
    try {
      await runDownload(true)
      return status
    } catch (e2) {
      const message2 = e2 instanceof Error ? e2.message : String(e2)
      appendErrorLog(`downloadUpdate(full): ${message2}`)
      emit({ phase: 'error', message: message2, version: status.version })
      return status
    } finally {
      autoUpdater.disableDifferentialDownload = false
    }
  } finally {
    autoUpdater.disableDifferentialDownload = false
  }
}

/** 安装并重启：静默覆盖，装完自动打开 */
export function quitAndInstallUpdate(): void {
  const installer = resolveInstallerPath()
  if (!installer) {
    emit({
      phase: 'error',
      message: '未找到已下载的更新，请重新下载',
      version: status.version,
    })
    return
  }
  spawnSilentUpdateAndExit(installer)
}

/** 兼容旧 preload：在资源管理器中定位缓存里的安装包（调试用） */
export function revealUpdatePackage(): string | null {
  const p = resolveInstallerPath()
  if (!p) return null
  shell.showItemInFolder(p)
  return p
}
