import type { IpcResponse } from '../../shared/types'

/** Typed wrapper around window.api.invoke */
export async function api<T>(channel: string, ...args: unknown[]): Promise<IpcResponse<T>> {
  return window.api.invoke(channel, ...args) as Promise<IpcResponse<T>>
}
