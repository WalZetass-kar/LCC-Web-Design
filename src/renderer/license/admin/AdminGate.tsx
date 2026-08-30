import { ShieldAlert, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Gunakan useAuth (POS auth) bukan useLicense untuk cek role developer
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return !!user && user.hak_akses === 'developer';
}

interface AdminGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Gate yang hanya mengizinkan akun developer POS masuk.
 * Tidak bergantung pada LicenseProvider — aman dipasang di mana saja.
 */
export const AdminGate: React.FC<AdminGateProps> = ({ children, fallback }) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500 text-sm">
        Anda harus login terlebih dahulu.
      </div>
    );
  }

  if (user.hak_akses !== 'developer') {
    return (
      <>
        {fallback ?? (
          <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 max-w-sm text-center border border-slate-200 dark:border-slate-800">
              <div className="flex justify-center mb-3 text-red-500">
                <ShieldAlert size={40} />
              </div>
              <h2 className="text-lg font-bold mb-1">Akses Ditolak</h2>
              <p className="text-sm text-slate-500">Halaman ini hanya untuk akun developer.</p>
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
};

export const AdminLink: React.FC<{
  onOpen: () => void;
  className?: string;
  label?: string;
}> = ({ onOpen, className = '', label = 'Panel Developer' }) => {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;
  return (
    <button
      onClick={onOpen}
      className={`inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-2 ${className}`}
    >
      {label}
    </button>
  );
};
