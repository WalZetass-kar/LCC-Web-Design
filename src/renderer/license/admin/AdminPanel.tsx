import React, { useState } from 'react';
import {
  LayoutDashboard, Users, CreditCard, Puzzle, MessageSquare, DollarSign,
  ChevronLeft, ChevronRight, LogOut, ArrowLeft, ShieldCheck,
} from 'lucide-react';
import { useLicense } from '../FeatureContext';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { PlansPage } from './pages/PlansPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { PopupsPage } from './pages/PopupsPage';
import { PaymentsPage } from './pages/PaymentsPage';

type AdminTab = 'dashboard' | 'users' | 'plans' | 'features' | 'popups' | 'payments';

const NAV: Array<{ code: AdminTab; label: string; icon: React.ElementType; badge?: string }> = [
  { code: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { code: 'users', label: 'Users', icon: Users },
  { code: 'plans', label: 'Plans', icon: CreditCard },
  { code: 'features', label: 'Fitur', icon: Puzzle },
  { code: 'popups', label: 'Popup', icon: MessageSquare },
  { code: 'payments', label: 'Pembayaran', icon: DollarSign },
];

export const AdminPanel: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
  const { user, logout } = useLicense();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={`
          flex flex-col shrink-0 transition-all duration-300
          ${collapsed ? 'w-[68px]' : 'w-60'}
          bg-white dark:bg-slate-900
          border-r border-slate-200 dark:border-slate-800
        `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-100 dark:border-slate-800 ${collapsed ? 'justify-center px-2' : ''}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center shadow-lg shadow-primary-500/30 shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight truncate">License Center</p>
              <p className="text-[11px] text-slate-400 truncate">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-3 space-y-0.5 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
          {NAV.map(({ code, label, icon: Icon }) => {
            const active = tab === code;
            return (
              <button
                key={code}
                onClick={() => setTab(code)}
                title={collapsed ? label : undefined}
                className={`
                  w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150
                  ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'}
                  ${active
                    ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary-600 dark:hover:text-primary-400'
                  }
                `}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`border-t border-slate-100 dark:border-slate-800 py-3 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
            className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${collapsed ? 'justify-center px-0' : ''}`}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Tutup</span></>}
          </button>

          {!collapsed && (
            <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[11px] text-slate-400 mb-0.5">Login sebagai</p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
                {user?.role}
              </span>
            </div>
          )}

          {onExit && (
            <button
              onClick={onExit}
              title={collapsed ? 'Kembali ke POS' : undefined}
              className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Kembali ke POS</span>}
            </button>
          )}

          <button
            onClick={() => { if (confirm('Keluar dari License Center?')) void logout(); }}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {tab === 'dashboard' && <DashboardPage />}
          {tab === 'users' && <UsersPage />}
          {tab === 'plans' && <PlansPage />}
          {tab === 'features' && <FeaturesPage />}
          {tab === 'popups' && <PopupsPage />}
          {tab === 'payments' && <PaymentsPage />}
        </div>
      </main>
    </div>
  );
};
