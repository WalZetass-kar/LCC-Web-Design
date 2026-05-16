export interface IElectronAPI {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
}

declare global {
  interface Window {
    api?: IElectronAPI
  }
}
