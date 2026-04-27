export interface IElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>
}

declare global {
  interface Window {
    api: IElectronAPI
  }
}
