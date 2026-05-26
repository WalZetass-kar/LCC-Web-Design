import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { migrate, seed } from './migrations';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();

migrate();
seed();

app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: config.CORS_ORIGINS.includes('*') ? true : config.CORS_ORIGINS,
    credentials: true,
  }),
);

// Rate limit untuk auth endpoint
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
app.use('/api/auth', authLimiter);

app.get('/api/health', (_req, res) => res.json({ success: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Root info — admin panel TIDAK lagi disajikan di sini.
// Semua manajemen dilakukan dari aplikasi POS oleh akun developer/super_admin.
app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
    <html><body style="font-family:sans-serif;padding:32px;line-height:1.6">
      <h2>🛡️ MediaSoft License Server</h2>
      <p>Backend berjalan. Tidak ada admin dashboard di server ini.</p>
      <p>Semua manajemen lisensi, user, paket, dan popup dilakukan dari
      <b>aplikasi POS</b> oleh akun bertipe <code>super_admin</code> /
      <code>admin</code>.</p>
      <p>API base: <code>${'/api'}</code> · Health:
      <a href="/api/health">/api/health</a></p>
    </body></html>`);
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err);
  res.status(500).json({ success: false, message: err.message ?? 'Server error' });
});

app.listen(config.PORT, () => {
  console.log(`\n🛡️  License Server listening on http://localhost:${config.PORT}`);
  console.log(`🔌 API base: http://localhost:${config.PORT}/api`);
  console.log(`👤 Manajemen dilakukan dari aplikasi POS (login sebagai super_admin/admin).`);
});
