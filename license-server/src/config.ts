import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const config = {
  PORT: Number(process.env.PORT ?? 4000),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  DB_PATH: process.env.DB_PATH ?? './data/license.db',

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL ?? '15m',
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL ?? '30d',

  ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? 'admin@mediasoft.local',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? 'Admin#12345',
  ADMIN_NAME: process.env.ADMIN_NAME ?? 'Super Admin',

  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim()),

  APP_BILLING_URL: process.env.APP_BILLING_URL ?? 'https://wa.me/628123456789',
  APP_WHATSAPP: process.env.APP_WHATSAPP ?? '628123456789',
};
