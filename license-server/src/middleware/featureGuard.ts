import { Response, NextFunction } from 'express';
import { db } from '../db';
import { AuthedRequest } from './auth';
import { loadActiveSubscription, loadPopup } from './subscriptionGuard';

interface ResolvedFeature {
  enabled: boolean;
  limit: number | null;
}

/**
 * Resolve fitur berdasarkan urutan prioritas:
 * 1. user_feature_overrides
 * 2. plan_features
 */
export function resolveFeature(userId: number, planId: number, featureCode: string): ResolvedFeature {
  const ov = db
    .prepare(
      `SELECT o.is_enabled, o.limit_value
         FROM user_feature_overrides o
         JOIN features f ON f.id = o.feature_id
        WHERE o.user_id = ? AND f.code = ?`,
    )
    .get(userId, featureCode) as { is_enabled: number; limit_value: number | null } | undefined;
  if (ov) return { enabled: !!ov.is_enabled, limit: ov.limit_value ?? null };

  const pf = db
    .prepare(
      `SELECT pf.is_enabled, pf.limit_value
         FROM plan_features pf
         JOIN features f ON f.id = pf.feature_id
        WHERE pf.plan_id = ? AND f.code = ?`,
    )
    .get(planId, featureCode) as { is_enabled: number; limit_value: number | null } | undefined;
  if (pf) return { enabled: !!pf.is_enabled, limit: pf.limit_value ?? null };

  return { enabled: false, limit: null };
}

export function getFeatureMap(userId: number, planId: number): Record<string, ResolvedFeature> {
  const features = db.prepare(`SELECT code FROM features WHERE is_active = 1`).all() as { code: string }[];
  const result: Record<string, ResolvedFeature> = {};
  for (const f of features) {
    result[f.code] = resolveFeature(userId, planId, f.code);
  }
  return result;
}

/**
 * Middleware untuk endpoint tertentu yang membutuhkan fitur aktif.
 * Pemakaian: router.post('/transactions', authMiddleware, featureGuard('transactions'), ...)
 */
export function featureGuard(featureCode: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (['admin', 'super_admin'].includes(req.user.role)) return next();

    const sub = req.subscription ?? loadActiveSubscription(req.user.id);
    if (!sub || sub.status !== 'active') {
      return res.status(402).json({
        success: false,
        error_code: sub?.status === 'expired' ? 'EXPIRED' : 'NO_SUBSCRIPTION',
        message: 'Tidak ada paket aktif',
        feature: featureCode,
        popup: loadPopup('EXPIRED'),
      });
    }

    const f = resolveFeature(req.user.id, sub.plan_id, featureCode);
    if (!f.enabled) {
      return res.status(403).json({
        success: false,
        error_code: 'FEATURE_LOCKED',
        message: 'Fitur ini tidak tersedia di paket Anda.',
        feature: featureCode,
        popup: loadPopup('FEATURE_LOCKED'),
      });
    }

    // (opsional) cek limit harian
    if (f.limit !== null) {
      const today = new Date().toISOString().slice(0, 10);
      const usage = db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS used
             FROM usage_logs
            WHERE user_id = ? AND feature_code = ? AND period_bucket = ?`,
        )
        .get(req.user.id, featureCode, today) as { used: number };

      if (usage.used >= f.limit) {
        return res.status(429).json({
          success: false,
          error_code: 'LIMIT_REACHED',
          message: `Limit harian fitur ${featureCode} tercapai (${usage.used}/${f.limit}).`,
          feature: featureCode,
          limit: f.limit,
          used: usage.used,
          popup: loadPopup('DEMO_LIMIT'),
        });
      }
    }

    (req as any).feature = f;
    next();
  };
}
