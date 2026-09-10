import { app, BrowserWindow, shell } from 'electron'
import electronUpdater from 'electron-updater'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { appendErrorLog } from './store'
import type { UpdateStatus } from '../src/shared/updateTypes'

export type { UpdatePhase, UpdateStatus } from '../src/shared/updateTypes'

const { autoUpdater } = electronUpdater

let status: UpdateStatus = { phase: 'idle' }
let getMainWindow: () => BrowserWindow | null = () => null
let markQuitting: () => void = () => undefined
let wired = false
/** 已下载的安装包路径（缓存或复制到「下载」） */
let downloadedInstallerPath: string | null = null
/** 用户可双击的「仅更新」启动器（.cmd） */
let updateLauncherPath: string | null = null

function emit(next: UpdateStatus) {
  status = {
    ...next,
    packagePath: next.packagePath ?? downloadedInstallerPath ?? undefined,
    launcherPath: next.launcherPath ?? updateLauncherPath ?? undefined,
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

export function getDownloadedInstallerPath(): string | null {
  return downloadedInstallerPath
}

export function getUpdateLauncherPath(): string | null {
  return updateLauncherPath
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

/** 复制更新包到「下载」，并写 .cmd：双击只静默更新，不进完整向导 */
function publishUserUpdatePackage(srcInstaller: string, version: string): {
  packagePath: string
  launcherPath: string
} | null {
  try {
    if (!srcInstaller || !fs.existsSync(srcInstaller)) return null
    const downloads = app.getPath('downloads')
    fs.mkdirSync(downloads, { recursive: true })
    const ver = version.replace(/^v/i, '')
    const packagePath = path.join(downloads, `随心起卦-更新-${ver}.exe`)
    const launcherPath = path.join(downloads, `随心起卦-打开更新-${ver}.cmd`)
    fs.copyFileSync(srcInstaller, packagePath)
    // /S = 静默；先结束旧进程再装（与 installer.nsh 互补）
    const exeName = '随心起卦.exe'
    // 直接调用 exe /S（勿用 start，以免参数被吞）；仅静默更新，不进向导
    const cmd = [
      '@echo off',
      'chcp 65001 >nul',
      `title 随心起卦 更新 V${ver}`,
      'echo 正在关闭旧版本并安装更新（不会打开完整安装向导）...',
      `taskkill /F /IM "${exeName}" /T >nul 2>&1`,
      'timeout /t 1 /nobreak >nul',
      `"${packagePath}" /S`,
      'if errorlevel 1 (',
      '  echo 更新失败，请重试或从官网下载安装包。',
      '  pause',
      '  exit /b 1',
      ')',
      'echo 更新完成。',
      '',
    ].join('\r\n')
    fs.writeFileSync(launcherPath, cmd, 'utf8')
    downloadedInstallerPath = packagePath
    updateLauncherPath = launcherPath
    return { packagePath, launcherPath }
  } catch (e) {
    appendErrorLog(
      `publishUserUpdatePackage: ${e instanceof Error ? e.message : String(e)}`,
    )
    return null
  }
}

export function setupAutoUpdater(opts: {
  getWindow: () => BrowserWindow | null
  onQuitForUpdate: () => void
}) {
  getMainWindow = opts.getWindow
  markQuitting = opts.onQuitForUpdate
  if (wired) return
  wired = true

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false
  autoUpdater.channel = 'latest'
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
    // 防止 latest.yml 被旧版覆盖、或字符串误比（如 2.2.4 > 2.2.12）导致「降级更新」弹窗
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
      message: `可直达最新 V${remote}（当前 V${local}，中间版本可跳过）。将下载更新包，打开后仅更新程序。`,
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
    const file =
      (info as { downloadedFile?: string }).downloadedFile ||
      downloadedInstallerPath ||
      ''
    if (file) downloadedInstallerPath = file
    const published = publishUserUpdatePackage(
      downloadedInstallerPath || file,
      info.version,
    )
    emit({
      phase: 'downloaded',
      version: info.version,
      percent: 100,
      differential: status.differential,
      packagePath: published?.packagePath || downloadedInstallerPath || undefined,
      launcherPath: published?.launcherPath || undefined,
      message: published
        ? `更新包已就绪。点「打开更新包」仅静默更新程序；也可运行下载文件夹中的「随心起卦-打开更新-${info.version.replace(/^v/i, '')}.cmd」。`
        : '更新包已就绪。点「打开更新包」将静默更新程序（不进完整安装向导）。',
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
      message: '便携版 / 开发模式不支持应用内更新包，请下载完整安装包',
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
          message: `可直达最新 V${remote}（当前 V${local}）。下载更新包后打开，仅更新程序。`,
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
 * 先尝试差量；失败则整包。下载的是更新包，安装时静默仅更新程序。
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
        ? '差量不可用，正在下载完整更新包…'
        : '正在下载更新包（优先差量）…',
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

/**
 * 打开更新包：退出本程序并以静默方式安装（仅更新，不进完整 Setup 向导）。
 */
export function quitAndInstallUpdate(): void {
  markQuitting()
  // isSilent=true → 仅程序更新；isForceRunAfter=true → 装完自动打开
  try {
    autoUpdater.quitAndInstall(true, true)
    return
  } catch (e) {
    appendErrorLog(
      `quitAndInstall: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
  // 兜底：直接跑用户目录里的更新包 /S
  const installer = downloadedInstallerPath
  if (installer && fs.existsSync(installer)) {
    runSilentInstaller(installer)
    return
  }
  emit({
    phase: 'error',
    message: '未找到更新包，请重新下载',
    version: status.version,
  })
}

/** 退出应用后静默运行安装包（/S） */
export function runSilentInstaller(installerPath: string): void {
  markQuitting()
  const exe = path.resolve(installerPath)
  if (!fs.existsSync(exe)) {
    emit({ phase: 'error', message: '更新包不存在', version: status.version })
    return
  }
  try {
    const child = spawn(exe, ['/S'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    child.unref()
  } catch (e) {
    appendErrorLog(
      `runSilentInstaller: ${e instanceof Error ? e.message : String(e)}`,
    )
    emit({
      phase: 'error',
      message: e instanceof Error ? e.message : String(e),
      version: status.version,
    })
    return
  }
  app.quit()
}

/** 在资源管理器中显示更新启动器 / 更新包 */
export function revealUpdatePackage(): string | null {
  const target = updateLauncherPath || downloadedInstallerPath
  if (!target || !fs.existsSync(target)) return null
  shell.showItemInFolder(target)
  return target
}
