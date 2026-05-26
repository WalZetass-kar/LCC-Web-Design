import { Router } from 'express';
import { db } from '../db';
import { authMiddleware, AuthedRequest } from '../middleware/auth';
import { loadActiveSubscription, loadPopup } from '../middleware/subscriptionGuard';
import { getFeatureMap } from '../middleware/featureGuard';

const router = Router();

router.get('/features', authMiddleware, (req: AuthedRequest, res) => {
  // Admin: kembalikan semua fitur enabled, tidak terikat plan
  if (['admin', 'super_admin'].includes(req.user!.role)) {
    const all = db.prepare(`SELECT code FROM features WHERE is_active = 1`).all() as { code: string }[];
    const features: Record<string, { enabled: boolean; limit: number | null }> = {};
    all.forEach((f) => (features[f.code] = { enabled: true, limit: null }));
    return res.json({
      success: true,
      data: {
        plan: { code: 'ADMIN', name: 'Administrator', expired_at: null },
        features,
      },
    });
  }

  const sub = loadActiveSubscription(req.user!.id);
  if (!sub) {
    return res.json({
      success: true,
      data: {
        plan: null,
        features: {},
        popup: loadPopup('EXPIRED'),
      },
    });
  }
  const features = getFeatureMap(req.user!.id, sub.plan_id);
  res.json({
    success: true,
    data: {
      plan: {
        code: sub.plan_code,
        name: sub.plan_name,
        status: sub.status,
        expired_at: sub.expired_at,
      },
      features,
      popup: sub.status !== 'active' ? loadPopup('EXPIRED') : null,
    },
  });
});

router.get('/account/status', authMiddleware, (req: AuthedRequest, res) => {
  if (['admin', 'super_admin'].includes(req.user!.role)) {
    return res.json({
      success: true,
      data: { plan: null, status: 'admin', expired_at: null, days_left: null },
    });
  }

  const sub = loadActiveSubscription(req.user!.id);
  if (!sub) {
    return res.json({
      success: true,
      data: {
        plan: null,
        status: 'no_subscription',
        expired_at: null,
        days_left: 0,
        popup: loadPopup('EXPIRED'),
      },
    });
  }
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(sub.expired_at).getTime() - Date.now()) / 86400000),
  );
  res.json({
    success: true,
    data: {
      plan: { code: sub.plan_code, name: sub.plan_name },
      status: sub.status,
      expired_at: sub.expired_at,
      days_left: daysLeft,
      popup: sub.status === 'expired' ? loadPopup('EXPIRED') : null,
    },
  });
});

router.get('/popup/:code', authMiddleware, (req, res) => {
  const popup = loadPopup(req.params.code);
  if (!popup) return res.status(404).json({ success: false, message: 'Popup tidak ditemukan' });
  res.json({ success: true, data: popup });
});

router.post('/usage/increment', authMiddleware, (req: AuthedRequest, res) => {
  const { feature_code, amount = 1, device_id } = req.body ?? {};
  if (!feature_code) return res.status(400).json({ success: false, message: 'feature_code wajib' });
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(
    `INSERT INTO usage_logs (user_id, device_id, feature_code, amount, period_bucket)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(req.user!.id, device_id ?? null, feature_code, Number(amount) || 1, today);
  res.json({ success: true });
});

export default router;
