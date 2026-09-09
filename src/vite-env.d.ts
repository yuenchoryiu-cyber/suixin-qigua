/// <reference types="vite/client" />

import type { SuixinApi } from '../electron/preload'

declare global {
  interface Window {
    suixin: SuixinApi
  }
}

export {}
