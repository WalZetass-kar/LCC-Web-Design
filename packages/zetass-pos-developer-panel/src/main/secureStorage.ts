import { app, safeStorage, type IpcMain, type IpcMainEvent } from 'electron'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

interface StoredSecureValue {
  alg: 'electron-safe-storage' | 'aes-256-gcm'
  value: string
  iv?: string
  tag?: string
}

type SecureStoreFile = Record<string, StoredSecureValue>

const KEY_PATTERN = /^[a-zA-Z0-9_.:-]{1,128}$/

function storageFilePath(): string {
  return path.join(app.getPath('userData'), 'secure-storage.json')
}

function fallbackKey(): Buffer {
  return crypto.scryptSync(`${app.getPath('userData')}:${app.getName()}`, 'zetass-pos-secure-storage', 32)
}

function validateKey(key: string): string {
  if (!KEY_PATTERN.test(key)) {
    throw new Error('Secure storage key tidak valid')
  }
  return key
}

class ElectronSecureStorage {
  private readStore(): SecureStoreFile {
    const file = storageFilePath()
    try {
      if (!fs.existsSync(file)) return {}
      return JSON.parse(fs.readFileSync(file, 'utf8')) as SecureStoreFile
    } catch {
      return {}
    }
  }

  private writeStore(store: SecureStoreFile): void {
    const file = storageFilePath()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(store), { mode: 0o600 })
  }

  private encrypt(value: string): StoredSecureValue {
    if (safeStorage.isEncryptionAvailable()) {
      return {
        alg: 'electron-safe-storage',
        value: safeStorage.encryptString(value).toString('base64'),
      }
    }

    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', fallbackKey(), iv)
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    return {
      alg: 'aes-256-gcm',
      value: data.toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
    }
  }

  private decrypt(value: StoredSecureValue): string {
    if (value.alg === 'electron-safe-storage') {
      return safeStorage.decryptString(Buffer.from(value.value, 'base64'))
    }

    if (!value.iv || !value.tag) {
      throw new Error('Secure storage payload tidak valid')
    }
    const decipher = crypto.createDecipheriv('aes-256-gcm', fallbackKey(), Buffer.from(value.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(value.tag, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(value.value, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  }

  getItem(key: string): string | null {
    const store = this.readStore()
    const item = store[validateKey(key)]
    if (!item) return null
    try {
      return this.decrypt(item)
    } catch {
      return null
    }
  }

  setItem(key: string, value: string): void {
    const safeKey = validateKey(key)
    const store = this.readStore()
    store[safeKey] = this.encrypt(value)
    this.writeStore(store)
  }

  removeItem(key: string): void {
    const store = this.readStore()
    delete store[validateKey(key)]
    this.writeStore(store)
  }
}

const storage = new ElectronSecureStorage()

function reply(event: IpcMainEvent, callback: () => unknown) {
  try {
    event.returnValue = { success: true, data: callback() }
  } catch (error) {
    event.returnValue = {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

export function registerSecureStorageHandlers(ipcMain: IpcMain): void {
  ipcMain.on('secureStorage:getItem', (event, key: string) => {
    reply(event, () => storage.getItem(String(key ?? '')))
  })

  ipcMain.on('secureStorage:setItem', (event, key: string, value: string) => {
    reply(event, () => {
      storage.setItem(String(key ?? ''), String(value ?? ''))
      return true
    })
  })

  ipcMain.on('secureStorage:removeItem', (event, key: string) => {
    reply(event, () => {
      storage.removeItem(String(key ?? ''))
      return true
    })
  })
}
