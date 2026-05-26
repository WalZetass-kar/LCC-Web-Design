import { Request, Response, NextFunction } from 'express';
import { verifyAccess, AccessPayload } from '../auth';
import { db } from '../db';

export interface AuthedRequest extends Request {
  user?: AccessPayload & { id: number };
  subscription?: any;
}

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Missing access token' });

  try {
    const decoded = verifyAccess(token);
    // pastikan user masih aktif
    const user = db.prepare(`SELECT id, role, email, status FROM users WHERE id = ?`).get(decoded.sub) as
      | { id: number; role: string; email: string; status: string }
      | undefined;
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error_code: 'ACCOUNT_SUSPENDED',
        message: 'Akun Anda tidak aktif. Hubungi admin.',
      });
    }
    req.user = { ...decoded, id: user.id, role: user.role, email: user.email };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  next();
}

export function requireSuperAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Super admin only' });
  }
  next();
}
