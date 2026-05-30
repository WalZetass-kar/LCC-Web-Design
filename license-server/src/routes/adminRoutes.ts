import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { hashPassword } from '../auth';
import { authMiddleware, AuthedRequest, requireAdmin } from '../middleware/auth';

const router = Router();
router.use(authMiddleware, requireAdmin);

// =====================================================================
// USERS
// =====================================================================
router.get('/users', (req, res) => {
  const search = (req.query.search as string) ?? '';
  const status = (req.query.status as string) ?? '';
  const filters: string[] = [];
  const params: unknown[] = [];

  if (search) {
    filters.push(`(u.name LIKE ? OR u.email LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    filters.push(`u.status = ?`);
    params.push(status);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.created_at,
              (SELECT us.id FROM user_subscriptions us
                 WHERE us.user_id = u.id ORDER BY us.created_at DESC LIMIT 1) AS subscription_id,
              (SELECT p.code FROM user_subscriptions us
                 JOIN plans p ON p.id = us.plan_id
                 WHERE us.user_id = u.id ORDER BY us.created_at DESC LIMIT 1) AS plan_code,
              (SELECT us.status FROM user_subscriptions us
                 WHERE us.user_id = u.id ORDER BY us.created_at DESC LIMIT 1) AS sub_status,
              (SELECT us.expired_at FROM user_subscriptions us
                 WHERE us.user_id = u.id ORDER BY us.created_at DESC LIMIT 1) AS expired_at,
              (SELECT COUNT(*) FROM device_tokens dt
                 WHERE dt.user_id = u.id AND dt.is_revoked = 0) AS active_devices
       FROM users u
       ${where}
       ORDER BY u.created_at DESC
       LIMIT 200`,
    )
    .all(...params);

  res.json({ success: true, data: rows });
});

router.get('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = db.prepare(`SELECT id, name, email, phone, role, status, created_at FROM users WHERE id = ?`).get(id);
  if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
  const subs = db
    .prepare(
      `SELECT us.id, us.status, us.started_at, us.expired_at, us.notes,
              p.code AS plan_code, p.name AS plan_name
         FROM user_subscriptions us
         JOIN plans p ON p.id = us.plan_id
        WHERE us.user_id = ? ORDER BY us.created_at DESC`,
    )
    .all(id);
  const devices = db
    .prepare(
      `SELECT id, device_id, device_name, platform, last_seen_at, last_ip, is_revoked
         FROM device_tokens WHERE user_id = ? ORDER BY last_seen_at DESC`,
    )
    .all(id);
  const overrides = db
    .prepare(
      `SELECT o.id, f.code, f.name, o.is_enabled, o.limit_value
         FROM user_feature_overrides o JOIN features f ON f.id = o.feature_id
        WHERE o.user_id = ?`,
    )
    .all(id);
  res.json({ success: true, data: { user, subscriptions: subs, devices, overrides } });
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  plan_code: z.string().min(1),
  duration_days: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

router.post('/users', async (req: AuthedRequest, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Input tidak valid', errors: parsed.error.format() });
  }
  const { name, email, password, phone, plan_code, duration_days, notes } = parsed.data;

  const exists = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
  if (exists) return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });

  const plan = db.prepare(`SELECT id, duration_days FROM plans WHERE code = ?`).get(plan_code) as
    | { id: number; duration_days: number }
    | undefined;
  if (!plan) return res.status(400).json({ success: false, message: 'Plan tidak ditemukan' });

  const hash = await hashPassword(password);
  const result = db
    .prepare(
      `INSERT INTO users (name, email, phone, password_hash, role, status, must_change_pwd)
       VALUES (?, ?, ?, ?, 'user', 'active', 1)`,
    )
    .run(name, email, phone ?? null, hash);
  const userId = result.lastInsertRowid as number;

  const days = duration_days ?? plan.duration_days;
  const expired = new Date(Date.now() + days * 86400000).toISOString();
  db.prepare(
    `INSERT INTO user_subscriptions (user_id, plan_id, status, expired_at, notes, created_by)
     VALUES (?, ?, 'active', ?, ?, ?)`,
  ).run(userId, plan.id, expired, notes ?? null, req.user!.id);

  res.json({ success: true, data: { id: userId } });
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
});

router.patch('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Input tidak valid' });

  const fields: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`);
      params.push(v);
    }
  }
  if (!fields.length) return res.json({ success: true });
  params.push(id);
  db.prepare(`UPDATE users SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...params);

  // jika di-suspend, revoke semua device
  if (parsed.data.status === 'suspended' || parsed.data.status === 'banned') {
    db.prepare(`UPDATE device_tokens SET is_revoked = 1 WHERE user_id = ?`).run(id);
  }
  res.json({ success: true });
});

router.post('/users/:id/reset-password', async (req, res) => {
  const id = Number(req.params.id);
  const newPwd = (req.body?.new_password as string) || generateRandomPassword();
  const hash = await hashPassword(newPwd);
  db.prepare(`UPDATE users SET password_hash = ?, must_change_pwd = 1 WHERE id = ?`).run(hash, id);
  db.prepare(`UPDATE device_tokens SET is_revoked = 1 WHERE user_id = ?`).run(id);
  res.json({ success: true, data: { new_password: newPwd } });
});

router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
  res.json({ success: true });
});

// =====================================================================
// SUBSCRIPTIONS
// =====================================================================
router.put('/users/:id/plan', (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    plan_code: z.string(),
    duration_days: z.number().int().positive().optional(),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Input tidak valid' });

  const plan = db.prepare(`SELECT id, duration_days FROM plans WHERE code = ?`).get(parsed.data.plan_code) as
    | { id: number; duration_days: number }
    | undefined;
  if (!plan) return res.status(400).json({ success: false, message: 'Plan tidak ditemukan' });

  // expired existing
  db.prepare(`UPDATE user_subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'`).run(id);

  const days = parsed.data.duration_days ?? plan.duration_days;
  const expired = new Date(Date.now() + days * 86400000).toISOString();
  db.prepare(
    `INSERT INTO user_subscriptions (user_id, plan_id, status, expired_at, notes, created_by)
     VALUES (?, ?, 'active', ?, ?, ?)`,
  ).run(id, plan.id, expired, parsed.data.notes ?? null, req.user!.id);
  res.json({ success: true, data: { expired_at: expired } });
});

router.patch('/subscriptions/:id', (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    status: z.enum(['active', 'expired', 'suspended', 'cancelled']).optional(),
    expired_at: z.string().optional(),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Input tidak valid' });

  const fields: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`);
      params.push(v);
    }
  }
  if (!fields.length) return res.json({ success: true });
  params.push(id);
  db.prepare(`UPDATE user_subscriptions SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

// =====================================================================
// PLANS
// =====================================================================
router.get('/plans', (_req, res) => {
  const plans = db.prepare(`SELECT * FROM plans ORDER BY sort_order, id`).all();
  res.json({ success: true, data: plans });
});

router.post('/plans', (req, res) => {
  const schema = z.object({
    code: z.string().min(1).toUpperCase(),
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().nonnegative().optional(),
    currency: z.string().optional(),
    duration_days: z.number().int().positive().optional(),
    sort_order: z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Input tidak valid' });
  const { code, name, description, price, currency, duration_days, sort_order } = parsed.data;
  try {
    const r = db
      .prepare(
        `INSERT INTO plans (code, name, description, price, currency, duration_days, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(code, name, description ?? null, price ?? 0, currency ?? 'IDR', duration_days ?? 30, sort_order ?? 0);
    res.json({ success: true, data: { id: r.lastInsertRowid } });
  } catch (e: any) {
    res.status(409).json({ success: false, message: e.message });
  }
});

router.patch('/plans/:id', (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    price: z.number().optional(),
    currency: z.string().optional(),
    duration_days: z.number().int().positive().optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Input tidak valid' });

  const fields: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`);
      params.push(typeof v === 'boolean' ? (v ? 1 : 0) : v);
    }
  }
  if (!fields.length) return res.json({ success: true });
  params.push(id);
  db.prepare(`UPDATE plans SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

router.delete('/plans/:id', (req, res) => {
  const id = Number(req.params.id);
  const plan = db.prepare(`SELECT id, code FROM plans WHERE id = ?`).get(id) as { id: number; code: string } | undefined;
  if (!plan) return res.status(404).json({ success: false, message: 'Paket tidak ditemukan' });

  const subscription = db.prepare(`SELECT id FROM user_subscriptions WHERE plan_id = ? LIMIT 1`).get(id);
  const payment = db.prepare(`SELECT id FROM payments WHERE plan_id = ? LIMIT 1`).get(id);
  if (subscription || payment) {
    return res.status(409).json({
      success: false,
      message: 'Paket sudah dipakai pembeli atau pembayaran. Nonaktifkan paket kalau tidak ingin dijual lagi.',
      data: { has_subscriptions: Boolean(subscription), has_payments: Boolean(payment) },
    });
  }

  db.prepare(`DELETE FROM plans WHERE id = ?`).run(id);
  res.json({ success: true, data: { id }, message: 'Paket berhasil dihapus' });
});

router.get('/plans/:id/features', (req, res) => {
  const planId = Number(req.params.id);
  const rows = db
    .prepare(
      `SELECT f.id, f.code, f.name, f.category, f.sort_order,
              COALESCE(pf.is_enabled, 0) AS is_enabled,
              pf.limit_value
         FROM features f
    LEFT JOIN plan_features pf ON pf.feature_id = f.id AND pf.plan_id = ?
        WHERE f.is_active = 1
        ORDER BY f.sort_order, f.id`,
    )
    .all(planId);
  res.json({ success: true, data: rows });
});

router.put('/plans/:id/features', (req, res) => {
  const planId = Number(req.params.id);
  const schema = z.object({
    features: z.array(
      z.object({
        code: z.string(),
        enabled: z.boolean(),
        limit: z.number().int().nullable().optional(),
      }),
    ),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Input tidak valid' });

  const upsert = db.prepare(`
    INSERT INTO plan_features (plan_id, feature_id, is_enabled, limit_value)
    VALUES (?, (SELECT id FROM features WHERE code = ?), ?, ?)
    ON CONFLICT(plan_id, feature_id)
    DO UPDATE SET is_enabled = excluded.is_enabled, limit_value = excluded.limit_value
  `);

  const tx = db.transaction((items: { code: string; enabled: boolean; limit?: number | null }[]) => {
    for (const f of items) upsert.run(planId, f.code, f.enabled ? 1 : 0, f.limit ?? null);
  });
  tx(parsed.data.features);

  res.json({ success: true });
});

// =====================================================================
// FEATURES (master)
// =====================================================================
router.get('/features', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM features ORDER BY sort_order, id`).all();
  res.json({ success: true, data: rows });
});

router.post('/features', (req, res) => {
  const schema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    category: z.string().optional(),
    sort_order: z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Input tidak valid' });
  try {
    const r = db
      .prepare(
        `INSERT INTO features (code, name, description, category, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        parsed.data.code,
        parsed.data.name,
        parsed.data.description ?? null,
        parsed.data.category ?? null,
        parsed.data.sort_order ?? 0,
      );
    res.json({ success: true, data: { id: r.lastInsertRowid } });
  } catch (e: any) {
    res.status(409).json({ success: false, message: e.message });
  }
});

router.patch('/features/:id', (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    sort_order: z.number().int().optional(),
    is_active: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Input tidak valid' });

  const fields: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`);
      params.push(typeof v === 'boolean' ? (v ? 1 : 0) : v);
    }
  }
  if (!fields.length) return res.json({ success: true });
  params.push(id);
  db.prepare(`UPDATE features SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

// =====================================================================
// USER FEATURE OVERRIDES
// =====================================================================
router.put('/users/:id/features/:code', (req, res) => {
  const userId = Number(req.params.id);
  const code = req.params.code;
  const schema = z.object({
    enabled: z.boolean(),
    limit: z.number().int().nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Input tidak valid' });
  const feature = db.prepare(`SELECT id FROM features WHERE code = ?`).get(code) as { id: number } | undefined;
  if (!feature) return res.status(404).json({ success: false, message: 'Feature tidak ditemukan' });
  db.prepare(
    `INSERT INTO user_feature_overrides (user_id, feature_id, is_enabled, limit_value)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, feature_id) DO UPDATE
     SET is_enabled = excluded.is_enabled, limit_value = excluded.limit_value`,
  ).run(userId, feature.id, parsed.data.enabled ? 1 : 0, parsed.data.limit ?? null);
  res.json({ success: true });
});

router.delete('/users/:id/features/:code', (req, res) => {
  const userId = Number(req.params.id);
  const code = req.params.code;
  db.prepare(
    `DELETE FROM user_feature_overrides
      WHERE user_id = ? AND feature_id = (SELECT id FROM features WHERE code = ?)`,
  ).run(userId, code);
  res.json({ success: true });
});

// =====================================================================
// POPUPS
// =====================================================================
router.get('/popups', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM popup_settings ORDER BY id`).all();
  res.json({ success: true, data: rows });
});

router.patch('/popups/:id', (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    cta_text: z.string().optional(),
    cta_url: z.string().optional(),
    whatsapp_number: z.string().optional(),
    image_url: z.string().optional(),
    pricing_html: z.string().optional(),
    is_active: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Input tidak valid' });
  const fields: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`);
      params.push(typeof v === 'boolean' ? (v ? 1 : 0) : v);
    }
  }
  if (!fields.length) return res.json({ success: true });
  fields.push(`updated_at = datetime('now')`);
  params.push(id);
  db.prepare(`UPDATE popup_settings SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

// =====================================================================
// PAYMENTS
// =====================================================================
router.get('/payments', (req, res) => {
  const rows = db
    .prepare(
      `SELECT pay.*, u.name AS user_name, u.email AS user_email, p.code AS plan_code
         FROM payments pay
         LEFT JOIN users u ON u.id = pay.user_id
         LEFT JOIN plans p ON p.id = pay.plan_id
         ORDER BY pay.created_at DESC LIMIT 200`,
    )
    .all();
  res.json({ success: true, data: rows });
});

router.post('/payments', (req: AuthedRequest, res) => {
  const schema = z.object({
    user_id: z.number().int(),
    plan_code: z.string().optional(),
    amount: z.number().nonnegative(),
    method: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['pending', 'success']).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Input tidak valid' });

  const planRow = parsed.data.plan_code
    ? (db.prepare(`SELECT id FROM plans WHERE code = ?`).get(parsed.data.plan_code) as { id: number } | undefined)
    : null;

  const r = db
    .prepare(
      `INSERT INTO payments (user_id, plan_id, amount, method, status, notes, paid_at, approved_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      parsed.data.user_id,
      planRow?.id ?? null,
      parsed.data.amount,
      parsed.data.method ?? 'manual',
      parsed.data.status ?? 'success',
      parsed.data.notes ?? null,
      parsed.data.status === 'success' ? new Date().toISOString() : null,
      req.user!.id,
    );

  res.json({ success: true, data: { id: r.lastInsertRowid } });
});

router.post('/payments/:id/approve', (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const payment = db.prepare(`SELECT * FROM payments WHERE id = ?`).get(id) as any;
  if (!payment) return res.status(404).json({ success: false, message: 'Pembayaran tidak ditemukan' });

  db.prepare(
    `UPDATE payments SET status = 'success', paid_at = datetime('now'), approved_by = ? WHERE id = ?`,
  ).run(req.user!.id, id);

  // perpanjang subscription jika ada plan_id
  if (payment.plan_id) {
    const plan = db.prepare(`SELECT duration_days FROM plans WHERE id = ?`).get(payment.plan_id) as { duration_days: number };
    db.prepare(`UPDATE user_subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'`)
      .run(payment.user_id);
    const expired = new Date(Date.now() + plan.duration_days * 86400000).toISOString();
    db.prepare(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, expired_at, notes, created_by)
       VALUES (?, ?, 'active', ?, ?, ?)`,
    ).run(payment.user_id, payment.plan_id, expired, `Auto from payment #${id}`, req.user!.id);
  }
  res.json({ success: true });
});

router.delete('/payments/:id', (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const payment = db.prepare(`SELECT id, user_id, plan_id, status FROM payments WHERE id = ?`).get(id) as any;
  if (!payment) return res.status(404).json({ success: false, message: 'Pembayaran tidak ditemukan' });

  db.prepare(
    `INSERT INTO activity_logs (user_id, action, metadata)
     VALUES (?, 'PAYMENT_DELETED', ?)`,
  ).run(req.user!.id, JSON.stringify({ payment_id: id, status: payment.status, plan_id: payment.plan_id }));
  db.prepare(`DELETE FROM payments WHERE id = ?`).run(id);
  res.json({ success: true, data: { id }, message: 'Pembayaran berhasil dihapus' });
});

// =====================================================================
// DEVICES
// =====================================================================
router.post('/devices/:id/revoke', (req, res) => {
  db.prepare(`UPDATE device_tokens SET is_revoked = 1 WHERE id = ?`).run(Number(req.params.id));
  res.json({ success: true });
});

// =====================================================================
// HELPERS
// =====================================================================
function generateRandomPassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s + '!1';
}

export default router;
