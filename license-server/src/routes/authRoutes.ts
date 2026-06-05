import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import {
  signAccess,
  signRefresh,
  verifyRefresh,
  hashRefresh,
  hashPassword,
  verifyPassword,
} from '../auth';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();

function expiresAtFromDuration(days: number): string | null {
  return days <= 0 ? null : new Date(Date.now() + days * 86400000).toISOString();
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  device_id: z.string().min(4),
  device_name: z.string().optional(),
  platform: z.string().optional(),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Input tidak valid', errors: parsed.error.format() });
  }
  const { email, password, device_id, device_name, platform } = parsed.data;

  const user = db
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(email) as
    | { id: number; email: string; role: string; status: string; password_hash: string; must_change_pwd: number; name: string }
    | undefined;
  if (!user) return res.status(401).json({ success: false, message: 'Email atau password salah' });
  if (user.status !== 'active') {
    return res.status(403).json({ success: false, message: 'Akun tidak aktif' });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ success: false, message: 'Email atau password salah' });

  const access = signAccess({ sub: user.id, role: user.role, email: user.email });
  const { token: refresh, jti } = signRefresh({ sub: user.id, device_id });

  // simpan device + refresh hash
  db.prepare(
    `INSERT INTO device_tokens (user_id, device_id, device_name, platform, refresh_hash, last_seen_at, last_ip)
     VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
     ON CONFLICT(user_id, device_id)
     DO UPDATE SET device_name = excluded.device_name,
                   platform    = excluded.platform,
                   refresh_hash= excluded.refresh_hash,
                   last_seen_at= datetime('now'),
                   last_ip     = excluded.last_ip,
                   is_revoked  = 0`,
  ).run(user.id, device_id, device_name ?? null, platform ?? null, hashRefresh(refresh), req.ip ?? null);

  db.prepare(
    `INSERT INTO activity_logs (user_id, action, metadata, ip_address) VALUES (?, 'login', ?, ?)`,
  ).run(user.id, JSON.stringify({ device_id, platform }), req.ip ?? null);

  res.json({
    success: true,
    data: {
      access_token: access,
      refresh_token: refresh,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        must_change_pwd: !!user.must_change_pwd,
      },
    },
  });
});

const registerDemoSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  device_id: z.string().min(4),
  device_name: z.string().optional(),
  platform: z.string().optional(),
});

router.post('/register-demo', async (req, res) => {
  const parsed = registerDemoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Input tidak valid', errors: parsed.error.format() });
  }
  const { name, email, password, phone, device_id, device_name, platform } = parsed.data;

  const exists = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
  if (exists) return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });

  const hash = await hashPassword(password);
  const result = db
    .prepare(
      `INSERT INTO users (name, email, phone, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'user', 'active')`,
    )
    .run(name, email, phone ?? null, hash);

  const userId = result.lastInsertRowid as number;
  const plan = db.prepare(`SELECT id, duration_days FROM plans WHERE code = 'DEMO'`).get() as
    | { id: number; duration_days: number }
    | undefined;
  if (!plan) return res.status(500).json({ success: false, message: 'Plan DEMO belum ada di server' });

  const expired = expiresAtFromDuration(plan.duration_days);
  db.prepare(
    `INSERT INTO user_subscriptions (user_id, plan_id, status, expired_at) VALUES (?, ?, 'active', ?)`,
  ).run(userId, plan.id, expired);

  const access = signAccess({ sub: userId, role: 'user', email });
  const { token: refresh } = signRefresh({ sub: userId, device_id });

  db.prepare(
    `INSERT INTO device_tokens (user_id, device_id, device_name, platform, refresh_hash, last_seen_at, last_ip)
     VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`,
  ).run(userId, device_id, device_name ?? null, platform ?? null, hashRefresh(refresh), req.ip ?? null);

  res.json({
    success: true,
    data: {
      access_token: access,
      refresh_token: refresh,
      user: { id: userId, name, email, role: 'user' },
    },
  });
});

const refreshSchema = z.object({
  refresh_token: z.string().min(10),
  device_id: z.string().min(4),
});

router.post('/refresh', (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Input tidak valid' });
  }
  const { refresh_token, device_id } = parsed.data;
  let decoded;
  try {
    decoded = verifyRefresh(refresh_token);
  } catch {
    return res.status(401).json({ success: false, message: 'Refresh token tidak valid' });
  }

  const stored = db
    .prepare(`SELECT * FROM device_tokens WHERE user_id = ? AND device_id = ? AND is_revoked = 0`)
    .get(decoded.sub, device_id) as { refresh_hash: string } | undefined;
  if (!stored) return res.status(401).json({ success: false, message: 'Device tidak terdaftar' });
  if (stored.refresh_hash !== hashRefresh(refresh_token)) {
    // kemungkinan token reuse → revoke semua
    db.prepare(`UPDATE device_tokens SET is_revoked = 1 WHERE user_id = ?`).run(decoded.sub);
    return res.status(401).json({ success: false, message: 'Token reuse terdeteksi' });
  }

  const user = db.prepare(`SELECT id, role, email, status FROM users WHERE id = ?`).get(decoded.sub) as
    | { id: number; role: string; email: string; status: string }
    | undefined;
  if (!user || user.status !== 'active') {
    return res.status(403).json({ success: false, message: 'Akun tidak aktif' });
  }

  const access = signAccess({ sub: user.id, role: user.role, email: user.email });
  const { token: newRefresh } = signRefresh({ sub: user.id, device_id });
  db.prepare(`UPDATE device_tokens SET refresh_hash = ?, last_seen_at = datetime('now') WHERE user_id = ? AND device_id = ?`)
    .run(hashRefresh(newRefresh), user.id, device_id);

  res.json({ success: true, data: { access_token: access, refresh_token: newRefresh } });
});

router.post('/logout', authMiddleware, (req: AuthedRequest, res) => {
  const deviceId = (req.body?.device_id as string) || (req.headers['x-device-id'] as string);
  if (deviceId) {
    db.prepare(`UPDATE device_tokens SET is_revoked = 1 WHERE user_id = ? AND device_id = ?`)
      .run(req.user!.id, deviceId);
  }
  res.json({ success: true });
});

router.post('/change-password', authMiddleware, async (req: AuthedRequest, res) => {
  const schema = z.object({ old_password: z.string(), new_password: z.string().min(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Input tidak valid' });

  const user = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(req.user!.id) as
    | { password_hash: string }
    | undefined;
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const ok = await verifyPassword(parsed.data.old_password, user.password_hash);
  if (!ok) return res.status(401).json({ success: false, message: 'Password lama salah' });

  const hash = await hashPassword(parsed.data.new_password);
  db.prepare(`UPDATE users SET password_hash = ?, must_change_pwd = 0, updated_at = datetime('now') WHERE id = ?`)
    .run(hash, req.user!.id);
  res.json({ success: true });
});

export default router;
