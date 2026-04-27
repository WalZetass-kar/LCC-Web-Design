import crypto from 'crypto'

/** Encrypt password using SHA1 (sesuai dengan database MediaSoft yang ada) */
export function encryptPassword(plain: string): string {
  return crypto.createHash('sha1').update(plain).digest('hex')
}
