import React from 'react';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getElectronAPI } from '../utils/mockAPI';

const SettingsPage = () => {
  const electronAPI = getElectronAPI();
  const { theme, themes, changeTheme, currentTheme } = useTheme();

  const themeOptions = [
    { id: 'blue', name: 'Professional Blue', color: 'from-blue-500 to-blue-600' },
    { id: 'purple', name: 'Elegant Purple', color: 'from-purple-500 to-purple-600' },
    { id: 'green', name: 'Modern Green', color: 'from-emerald-500 to-emerald-600' },
    { id: 'slate', name: 'Classic Slate', color: 'from-slate-600 to-slate-700' },
    { id: 'indigo', name: 'Corporate Indigo', color: 'from-indigo-500 to-indigo-600' },
    { id: 'teal', name: 'Business Teal', color: 'from-teal-500 to-teal-600' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">
          Pengaturan
        </h1>
        <p className="text-slate-400">Konfigurasi aplikasi</p>
      </div>

      {/* Theme Settings */}
      <Card 
        title="Tema Warna" 
        subtitle="Pilih tema warna aplikasi sesuai preferensi Anda"
        className="relative overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative">
          {themeOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => changeTheme(option.id)}
              className={`
                relative p-6 rounded-xl transition-all duration-300
                bg-gradient-to-br ${option.color}
                ${theme === option.id 
                  ? 'ring-4 ring-white/50 scale-105 shadow-glow-lg' 
                  : 'hover:scale-105 opacity-80 hover:opacity-100'
                }
                group
              `}
            >
              <div className="text-center relative z-10">
                <p className="text-white font-semibold text-lg mb-1">{option.name}</p>
                <p className="text-white/70 text-sm">{themes[option.id]?.name}</p>
                {theme === option.id && (
                  <div className="absolute -top-2 -right-2">
                    <div className="bg-white rounded-full p-1">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
            </button>
          ))}
        </div>
      </Card>

      {/* App Info */}
      <Card title="Informasi Aplikasi" className="relative overflow-hidden">
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>
        <div className="space-y-3 relative">
          <div className="flex justify-between py-3 border-b border-white/10 hover:bg-white/5 px-4 rounded-lg transition-colors">
            <span className="text-slate-400">Nama Aplikasi</span>
            <span className="text-white font-medium">MediaSoft POS WalDevelop</span>
          </div>
          <div className="flex justify-between py-3 border-b border-white/10 hover:bg-white/5 px-4 rounded-lg transition-colors">
            <span className="text-slate-400">Versi</span>
            <span className={`${currentTheme.text} font-medium`}>1.0.0</span>
          </div>
          <div className="flex justify-between py-3 border-b border-white/10 hover:bg-white/5 px-4 rounded-lg transition-colors">
            <span className="text-slate-400">Platform</span>
            <span className="text-white font-medium">Electron + React</span>
          </div>
          <div className="flex justify-between py-3 border-b border-white/10 hover:bg-white/5 px-4 rounded-lg transition-colors">
            <span className="text-slate-400">Database</span>
            <span className="text-white font-medium">SQLite + Drizzle ORM</span>
          </div>
          <div className="flex justify-between py-3 hover:bg-white/5 px-4 rounded-lg transition-colors">
            <span className="text-slate-400">Developer</span>
            <span className="text-white font-medium">WalDevelop</span>
          </div>
        </div>
      </Card>

      {/* Database Actions */}
      <Card 
        title="Database" 
        subtitle="Informasi database aktif"
        className="relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-full blur-3xl"></div>
        <div className="flex gap-3 relative flex-col items-start">
          <p className="text-slate-300 max-w-2xl">
            Aplikasi sekarang membaca data real dari tabel `mediasoft_*` di `sistem_pos.db`.
            Tombol reset/seed demo dinonaktifkan agar data asli tidak tertimpa.
          </p>
          <Button
            variant="warning"
            onClick={async () => {
              const result = await electronAPI.seedDatabase();
              alert(result.message);
            }}
            className="flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Info Seed Demo
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
