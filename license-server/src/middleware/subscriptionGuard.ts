import { Response, NextFunction } from 'express';
import { db } from '../db';
import { AuthedRequest } from './auth';

export interface SubscriptionInfo {
  id: number;
  user_id: number;
  plan_id: number;
  plan_code: string;
  plan_name: string;
  status: string;
  expired_at: string;
}

export function loadActiveSubscription(userId: number): SubscriptionInfo | null {
  const row = db
    .prepare(
      `SELECT us.id, us.user_id, us.plan_id, us.status, us.expired_at,
              p.code AS plan_code, p.name AS plan_name
         FROM user_subscriptions us
         JOIN plans p ON p.id = us.plan_id
        WHERE us.user_id = ?
        ORDER BY us.created_at DESC
        LIMIT 1`,
    )
    .get(userId) as SubscriptionInfo | undefined;
  if (!row) return null;

  // auto-expire jika lewat tanggal
  if (new Date(row.expired_at) < new Date() && row.status === 'active') {
    db.prepare(`UPDATE user_subscriptions SET status = 'expired' WHERE id = ?`).run(row.id);
    row.status = 'expired';
  }
  return row;
}

export function loadPopup(code: string) {
  return db
    .prepare(`SELECT * FROM popup_settings WHERE code = ? AND is_active = 1`)
    .get(code) as Record<string, unknown> | undefined;
}

/**
 * Pastikan user punya subscription aktif. Admin selalu lolos.
 */
export function subscriptionGuard(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (['admin', 'super_admin'].includes(req.user.role)) return next();

  const sub = loadActiveSubscription(req.user.id);
  if (!sub) {
    return res.status(402).json({
      success: false,
      error_code: 'NO_SUBSCRIPTION',
      message: 'Akun belum memiliki paket aktif',
      popup: loadPopup('EXPIRED'),
    });
  }

  if (sub.status === 'suspended' || sub.status === 'cancelled') {
    return res.status(403).json({
      success: false,
      error_code: 'ACCOUNT_SUSPENDED',
      message: 'Langganan Anda ditangguhkan. Hubungi admin.',
      popup: loadPopup('EXPIRED'),
    });
  }

  if (sub.status === 'expired') {
    return res.status(402).json({
      success: false,
      error_code: 'EXPIRED',
      message: 'Langganan Anda sudah habis. Silakan perpanjang.',
      popup: loadPopup('EXPIRED'),
    });
  }

  req.subscription = sub;
  next();
}
