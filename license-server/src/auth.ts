import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from './config';

export interface AccessPayload {
  sub: number;       // user id
  role: string;
  email: string;
  type: 'access';
}

export interface RefreshPayload {
  sub: number;
  device_id: string;
  type: 'refresh';
  jti: string;
}

export function signAccess(payload: Omit<AccessPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_TTL,
  } as jwt.SignOptions);
}

export function signRefresh(payload: Omit<RefreshPayload, 'type' | 'jti'>): { token: string; jti: string } {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ ...payload, type: 'refresh', jti }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_TTL,
  } as jwt.SignOptions);
  return { token, jti };
}

export function verifyAccess(token: string): AccessPayload {
  const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as unknown as AccessPayload;
  if (decoded.type !== 'access') throw new Error('Invalid token type');
  return decoded;
}

export function verifyRefresh(token: string): RefreshPayload {
  const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as unknown as RefreshPayload;
  if (decoded.type !== 'refresh') throw new Error('Invalid token type');
  return decoded;
}

export function hashRefresh(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
