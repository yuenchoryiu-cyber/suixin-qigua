import { APP_VERSION } from './yijingQuotes'

const REPO = 'yuenchoryiu-cyber/suixin-qigua'
const CHECK_MS = 4500

export type AppPlatform = 'win32' | 'darwin' | 'linux' | string

export type UpdateInfo = {
  version: string
  downloadUrl: string
  releaseUrl: string
  assetName: string
}

/** 简单 semver 比较：remote > local 则 true */
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

function pickAsset(
  assets: { name: string; browser_download_url: string }[],
  platform: AppPlatform,
): { name: string; url: string } | null {
  const names = assets.map((a) => ({ name: a.name, url: a.browser_download_url }))
  if (platform === 'darwin') {
    return (
      names.find((a) => /mac.*\.dmg$/i.test(a.name) || /-mac-.*\.dmg$/i.test(a.name)) ||
      names.find((a) => /\.dmg$/i.test(a.name)) ||
      null
    )
  }
  if (platform === 'win32') {
    return (
      names.find((a) => /win-x64\.exe$/i.test(a.name)) ||
      names.find((a) => /win.*\.exe$/i.test(a.name) && !/portable/i.test(a.name)) ||
      names.find((a) => /\.exe$/i.test(a.name)) ||
      null
    )
  }
  return names.find((a) => /\.(AppImage|deb|rpm)$/i.test(a.name)) || null
}

/**
 * 快速探测 GitHub Release 是否有更新。
 * 超时 / 失败返回 null（静默，不影响启动）。
 */
export async function checkForUpdate(
  platform: AppPlatform,
  localVersion: string = APP_VERSION,
): Promise<UpdateInfo | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CHECK_MS)
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/releases/latest`,
      {
        signal: ctrl.signal,
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': `suixin-qigua/${localVersion}`,
        },
      },
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      tag_name?: string
      html_url?: string
      assets?: { name: string; browser_download_url: string }[]
    }
    const tag = (data.tag_name || '').trim()
    if (!tag || !isVersionNewer(tag, localVersion)) return null
    const asset = pickAsset(data.assets || [], platform)
    const releaseUrl =
      data.html_url || `https://github.com/${REPO}/releases/tag/${tag}`
    return {
      version: tag.replace(/^v/i, ''),
      downloadUrl: asset?.url || releaseUrl,
      releaseUrl,
      assetName: asset?.name || '',
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
