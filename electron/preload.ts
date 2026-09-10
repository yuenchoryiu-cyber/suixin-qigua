import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings, HistoryEntry } from '../src/shared/types'
import type { UpdateStatus } from '../src/shared/updateTypes'

const api = {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  setSettings: (partial: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:set', partial),
  listHistory: (): Promise<HistoryEntry[]> => ipcRenderer.invoke('history:list'),
  addHistory: (entry: HistoryEntry): Promise<boolean> =>
    ipcRenderer.invoke('history:add', entry),
  hideWindow: (): Promise<void> => ipcRenderer.invoke('window:hide'),
  quitApp: (): Promise<void> => ipcRenderer.invoke('window:quit'),
  saveShareImage: (dataUrl: string, suggestedName: string) =>
    ipcRenderer.invoke('share:save', { dataUrl, suggestedName }),
  copyShareImage: (dataUrl: string) => ipcRenderer.invoke('share:clipboard', dataUrl),
  logError: (message: string): Promise<boolean> =>
    ipcRenderer.invoke('log:error', message),
  getPlatform: (): Promise<string> => ipcRenderer.invoke('app:platform'),
  openExternal: (url: string): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke('shell:openExternal', url),
  updateEnabled: (): Promise<boolean> => ipcRenderer.invoke('update:enabled'),
  getUpdateStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke('update:status'),
  checkUpdate: (): Promise<UpdateStatus> => ipcRenderer.invoke('update:check'),
  downloadUpdate: (): Promise<UpdateStatus> => ipcRenderer.invoke('update:download'),
  installUpdate: (): Promise<boolean> => ipcRenderer.invoke('update:install'),
  revealUpdate: (): Promise<{ ok: true; path: string } | { ok: false }> =>
    ipcRenderer.invoke('update:reveal'),
  onUpdateStatus: (cb: (status: UpdateStatus) => void) => {
    const listener = (_: unknown, status: UpdateStatus) => cb(status)
    ipcRenderer.on('update:status', listener)
    return () => {
      ipcRenderer.removeListener('update:status', listener)
    }
  },
  clearStore: (
    resetSettings?: boolean,
  ): Promise<{ settings: AppSettings; history: HistoryEntry[] }> =>
    ipcRenderer.invoke('store:clear', !!resetSettings),
  onNavigate: (cb: (page: string) => void) => {
    const listener = (_: unknown, page: string) => cb(page)
    ipcRenderer.on('navigate', listener)
    return () => {
      ipcRenderer.removeListener('navigate', listener)
    }
  },
}

contextBridge.exposeInMainWorld('suixin', api)

export type SuixinApi = typeof api
