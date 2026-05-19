import crypto from 'crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { db } from '../../database/connection.js'
import { authSessions } from '../../database/schema.js'

export interface AuthDeviceInfo {
  ipAddress?: string | null
  deviceId?: string | null
  deviceName?: string | null
  userAgent?: string | null
}

export interface CreatedAuthSession {
  token: string
  expires_at: string
}

const SESSION_TTL_MS = 8 * 60 * 60 * 1000

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function randomSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export class AuthSessionModel {
  static create(username: string, device: AuthDeviceInfo = {}): CreatedAuthSession {
    const issuedAt = new Date()
    const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_MS)
    const token = randomSessionToken()

    db.insert(authSessions).values({
      username,
      token_hash: hashToken(token),
      issued_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      last_seen_at: issuedAt.toISOString(),
      ip_address: device.ipAddress ?? null,
      device_id: device.deviceId ?? null,
      device_name: device.deviceName ?? null,
      user_agent: device.userAgent ?? null,
    }).run()

    return {
      token,
      expires_at: expiresAt.toISOString(),
    }
  }

  static validate(token: string, username?: string | null) {
    if (!token) return null

    const conditions = [
      eq(authSessions.token_hash, hashToken(token)),
      isNull(authSessions.revoked_at),
      gt(authSessions.expires_at, new Date().toISOString()),
    ]

    if (username) {
      conditions.push(eq(authSessions.username, username))
    }

    const session = db
      .select()
      .from(authSessions)
      .where(and(...conditions))
      .get()

    if (!session) return null

    db.update(authSessions)
      .set({ last_seen_at: new Date().toISOString() })
      .where(eq(authSessions.id, session.id))
      .run()

    return session
  }

  static revoke(token: string): void {
    if (!token) return
    db.update(authSessions)
      .set({ revoked_at: new Date().toISOString() })
      .where(eq(authSessions.token_hash, hashToken(token)))
      .run()
  }

  static revokeAllForUser(username: string): void {
    db.update(authSessions)
      .set({ revoked_at: new Date().toISOString() })
      .where(and(eq(authSessions.username, username), isNull(authSessions.revoked_at)))
      .run()
  }
}
