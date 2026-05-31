import React, { useState } from 'react';
import { useLicense } from './FeatureContext';
import appLogo from '../assets/app-logo.png';

/**
 * Halaman login + register demo untuk client app.
 * Pakai komponen ini sebagai gate sebelum aplikasi POS utama dirender.
 *
 * Contoh:
 *  const { user, ready } = useLicense();
 *  if (!ready) return <Splash />;
 *  if (!user) return <LoginScreen />;
 *  return <App />;
 */
export const LoginScreen: React.FC = () => {
  const { login, register } = useLicense();
  const [mode, setMode] = useState<'login' | 'demo'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (form.password.length < 8) throw new Error('Password minimal 8 karakter');
        await register(form.name, form.email, form.password, form.phone);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Gagal masuk';
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-8">
        <div className="text-center mb-6">
          <img src={appLogo} alt="MediaSoft POS Zetass" className="mx-auto mb-2 h-14 w-14 rounded-2xl object-cover shadow" />
          <h1 className="text-2xl font-bold">MediaSoft POS</h1>
          <p className="text-sm text-gray-500">Masuk untuk mulai berjualan</p>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1 mb-4 text-sm">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 rounded-md ${
              mode === 'login' ? 'bg-white shadow font-medium' : 'text-gray-500'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('demo')}
            className={`flex-1 py-1.5 rounded-md ${
              mode === 'demo' ? 'bg-white shadow font-medium' : 'text-gray-500'
            }`}
          >
            Daftar Demo
          </button>
        </div>

        {err && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-3">{err}</div>}

        <form onSubmit={submit} className="space-y-3">
          {mode === 'demo' && (
            <>
              <Field label="Nama / Toko">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </Field>
              <Field label="No. WhatsApp (opsional)">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </Field>
            </>
          )}
          <Field label="Email">
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium"
          >
            {loading ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar Demo (14 hari)'}
          </button>
        </form>

        <p className="mt-4 text-xs text-center text-gray-400">
          {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
          <button
            onClick={() => setMode(mode === 'login' ? 'demo' : 'login')}
            className="text-indigo-600 hover:underline"
          >
            {mode === 'login' ? 'Daftar demo gratis' : 'Login di sini'}
          </button>
        </p>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    {children}
  </div>
);
