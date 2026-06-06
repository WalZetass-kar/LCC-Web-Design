import React from 'react';
import { X } from 'lucide-react';

export const Modal: React.FC<{
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}> = ({ title, onClose, wide, children }) => (
  <div
    role="dialog"
    aria-modal="true"
    onClick={onClose}
    className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full border border-slate-200 dark:border-slate-700 ${wide ? 'max-w-3xl' : 'max-w-md'}`}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-semibold text-slate-800 dark:text-white">{title}</h3>
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

export const Field: React.FC<{ label: string; full?: boolean; children: React.ReactNode }> = ({
  label, full, children,
}) => (
  <div className={full ? 'col-span-2' : ''}>
    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputCls =
  'w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...rest }, ref) => (
    <input ref={ref} {...rest} className={`${inputCls} ${className}`} />
  ),
);
Input.displayName = 'Input';

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className = '', children, ...rest
}) => (
  <select {...rest} className={`${inputCls} ${className}`}>{children}</select>
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className = '', ...rest
}) => <textarea {...rest} className={`${inputCls} ${className}`} />;

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger'; size?: 'sm' | 'md' }
> = ({ variant = 'primary', size = 'md', className = '', children, ...rest }) => {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm' };
  const styles = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-500/20',
    secondary: 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };
  return (
    <button {...rest} className={`${base} ${sizes[size]} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
};

export const Badge: React.FC<{
  children: React.ReactNode;
  color?: 'green' | 'orange' | 'red' | 'gray' | 'indigo' | 'yellow' | 'blue';
}> = ({ children, color = 'gray' }) => {
  const map: Record<string, string> = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    gray: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[color]}`}>{children}</span>;
};

export const Alert: React.FC<{ kind?: 'error' | 'success' | 'info'; children: React.ReactNode }> = ({
  kind = 'error', children,
}) => {
  const map = {
    error: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  };
  return <div className={`text-sm border rounded-xl p-3 ${map[kind]}`}>{children}</div>;
};

/** Tabel wrapper dengan style konsisten */
export const Table: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  </div>
);

export const Th: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <th className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50 ${className}`}>
    {children}
  </th>
);

export const Td: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-4 py-3 text-slate-700 dark:text-slate-300 ${className}`}>{children}</td>
);

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between mb-6 gap-4">
    <div>
      <h1 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon?: React.ElementType;
  color?: string;
  loading?: boolean;
}> = ({ label, value, icon: Icon, color = 'text-slate-800 dark:text-white', loading }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      {Icon && <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Icon className="w-4 h-4 text-slate-500" /></div>}
    </div>
    <p className={`text-3xl font-bold ${color}`}>{loading ? <span className="text-slate-300 dark:text-slate-700">—</span> : value}</p>
  </div>
);
