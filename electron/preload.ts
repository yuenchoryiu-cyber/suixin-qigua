import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings, HistoryEntry } from '../src/shared/types'

const api = {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  setSettings: (partial: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:set', partial),
  listHistory: (): Promise<HistoryEntry[]> => ipcRenderer.invoke('history:list'),
  addHistory: (entry: HistoryEntry): Promise<boolean> =>
    ipcRenderer.invoke('history:add', entry),
  hideWindow: (): Promise<void> => ipcRenderer.invoke('window:hide'),
  saveShareImage: (dataUrl: string, suggestedName: string) =>
    ipcRenderer.invoke('share:save', { dataUrl, suggestedName }),
  copyShareImage: (dataUrl: string) => ipcRenderer.invoke('share:clipboard', dataUrl),
  logError: (message: string): Promise<boolean> =>
    ipcRenderer.invoke('log:error', message),
  clearStore: (
    resetSettings?: boolean,
  ): Promise<{ settings: AppSettings; history: HistoryEntry[] }> =>
    ipcRenderer.invoke('store:clear', !!resetSettings),
  exportConfig: (): Promise<{ ok: boolean; path?: string }> =>
    ipcRenderer.invoke('config:export'),
  importConfig: (): Promise<{
    ok: boolean
    settings?: AppSettings
    error?: string
  }> => ipcRenderer.invoke('config:import'),
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
