import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

function extractQuotedChannels(source: string): string[] {
  return [...source.matchAll(/'([a-zA-Z][\w-]*:[a-zA-Z][\w-]*)'/g)].map(match => match[1])
}

describe('IPC channel registry', () => {
  it('whitelists every registered main-process IPC channel', () => {
    const root = process.cwd()
    const preload = readFileSync(join(root, 'src/main/preload.cjs'), 'utf8')
    const ipcHandlers = readFileSync(join(root, 'src/main/ipcHandlers.ts'), 'utf8')

    const whitelistBody = preload.match(/const ALLOWED_CHANNELS = new Set\(\[([\s\S]*?)\]\)/)?.[1]
    expect(whitelistBody).toBeTruthy()

    const allowed = new Set(extractQuotedChannels(whitelistBody ?? ''))
    const registered = [
      ...ipcHandlers.matchAll(/(?:handle\(ipcMain,|ipcMain\.handle\()\s*'([a-zA-Z][\w-]*:[a-zA-Z][\w-]*)'/g),
    ].map(match => match[1])

    const missing = registered.filter(channel => !allowed.has(channel)).sort()
    const stale = [...allowed].filter(channel => !registered.includes(channel)).sort()

    expect(missing).toEqual([])
    expect(stale).toEqual([])
  })
})
