export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export type UpdateStatus = {
  phase: UpdatePhase
  version?: string
  percent?: number
  bytesPerSecond?: number
  transferred?: number
  total?: number
  message?: string
  /** 是否可能走差量（由 updater 决定；供 UI 提示） */
  differential?: boolean
  /** 已下载的更新包路径（下载文件夹） */
  packagePath?: string
  /** 双击仅静默更新的 .cmd 启动器 */
  launcherPath?: string
}
