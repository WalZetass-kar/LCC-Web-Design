export interface IElectronAPI {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
}

export interface IElectronSecureStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => boolean
  removeItem: (key: string) => boolean
}

declare global {
  interface Window {
    api?: IElectronAPI
    secureStorage?: IElectronSecureStorage
  }
}
